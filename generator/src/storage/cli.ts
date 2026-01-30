#!/usr/bin/env tsx
/**
 * Storage CLI
 *
 * Commands for managing the Redis storage.
 */

import { initStorage, getStorage } from "./redis-adapter.js";
import { config } from "../config.js";

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    printUsage();
    process.exit(1);
  }

  try {
    await initStorage();
    const storage = getStorage();

    switch (command) {
      case "stats":
        await showStats(storage);
        break;

      case "cleanup":
        await runCleanup(storage);
        break;

      case "list":
        await listQuotes(storage, args[1] as any);
        break;

      case "top":
        await showTopQuotes(storage, parseInt(args[1] || "10", 10));
        break;

      case "memory":
        await showMemoryDetails(storage);
        break;

      default:
        console.error(`Unknown command: ${command}`);
        printUsage();
        process.exit(1);
    }

    await storage.disconnect();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

function printUsage() {
  console.log(`
Storage CLI - Manage Redis quote storage

Usage:
  npx tsx src/storage/cli.ts <command> [options]

Commands:
  stats           Show storage statistics
  cleanup         Force run cleanup to free memory
  list <status>   List quotes by status (approved, rejected, pending)
  top [n]         Show top N approved quotes (default: 10)
  memory          Show detailed memory information

Examples:
  npx tsx src/storage/cli.ts stats
  npx tsx src/storage/cli.ts cleanup
  npx tsx src/storage/cli.ts list approved
  npx tsx src/storage/cli.ts top 20
`);
}

async function showStats(storage: ReturnType<typeof getStorage>) {
  const stats = await storage.getStats();

  console.log(`
╔════════════════════════════════════════════════════════╗
║                    Storage Statistics                   ║
╚════════════════════════════════════════════════════════╝

📊 Memory Usage:
   Used: ${formatBytes(stats.memoryUsedBytes)} / ${formatBytes(config.memory.maxBytes)}
   Percent: ${stats.memoryUsedPercent.toFixed(1)}%
   Status: ${getMemoryStatus(stats.memoryUsedPercent)}

📝 Quote Counts:
   ✅ Approved: ${stats.approvedCount}
   ❌ Rejected: ${stats.rejectedCount}
   ⏳ Pending: ${stats.pendingCount}
   🎭 Active Sessions: ${stats.activeSessionCount}

📈 All-Time Stats:
   Total Generated: ${stats.totalQuotesGenerated}
   Total Approved: ${stats.totalQuotesApproved}
   Approval Rate: ${stats.approvalRate.toFixed(1)}%

🧹 Last Cleanup:
   Time: ${stats.lastCleanupAt || "Never"}
   Items Cleaned: ${stats.lastCleanupCount ?? "N/A"}
`);
}

async function runCleanup(storage: ReturnType<typeof getStorage>) {
  console.log("🧹 Running cleanup...\n");

  const before = await storage.getMemoryUsage();
  console.log(`Before: ${formatBytes(before.bytes)} (${before.percent.toFixed(1)}%)`);

  const cleaned = await storage.enforceMemoryLimit();

  const after = await storage.getMemoryUsage();
  console.log(`After: ${formatBytes(after.bytes)} (${after.percent.toFixed(1)}%)`);
  console.log(`\nCleaned ${cleaned} items`);
  console.log(`Freed ${formatBytes(before.bytes - after.bytes)}`);
}

async function listQuotes(
  storage: ReturnType<typeof getStorage>,
  status: "approved" | "rejected" | "pending" | "starred"
) {
  if (!status || !["approved", "rejected", "pending", "starred"].includes(status)) {
    console.error("Please specify a valid status: approved, rejected, pending, starred");
    process.exit(1);
  }

  const quotes = await storage.getQuotesByStatus(status, 20);

  console.log(`\n📋 ${status.toUpperCase()} Quotes (${quotes.length}):\n`);

  quotes.forEach((q, i) => {
    console.log(`${i + 1}. [${q.quote.id}] Score: ${q.totalScore} - "${q.topic}"`);
    console.log(`   Created: ${q.createdAt}`);
    if (q.ttlSeconds) {
      console.log(`   TTL: ${formatDuration(q.ttlSeconds)}`);
    }
    console.log();
  });
}

async function showTopQuotes(storage: ReturnType<typeof getStorage>, limit: number) {
  const quotes = await storage.getTopQuotes(limit);

  console.log(`\n🏆 Top ${limit} Quotes:\n`);

  quotes.forEach((q, i) => {
    const star = q.status === "starred" ? "⭐ " : "";
    console.log(`${i + 1}. ${star}[${q.quote.id}] Score: ${q.totalScore}`);
    console.log(`   Topic: "${q.topic}"`);
    console.log(`   Lines:`);
    q.quote.lines.slice(0, 3).forEach((line) => {
      console.log(`     <${line.nickname}> ${line.text.slice(0, 60)}...`);
    });
    console.log();
  });
}

async function showMemoryDetails(storage: ReturnType<typeof getStorage>) {
  const { bytes, percent } = await storage.getMemoryUsage();
  const stats = await storage.getStats();

  console.log(`
╔════════════════════════════════════════════════════════╗
║                    Memory Details                       ║
╚════════════════════════════════════════════════════════╝

Current Usage:
  ${formatBytes(bytes)} / ${formatBytes(config.memory.maxBytes)} (${percent.toFixed(1)}%)

Thresholds:
  Warning:  ${(config.memory.warningThreshold * 100).toFixed(0)}% (${formatBytes(config.memory.maxBytes * config.memory.warningThreshold)})
  Critical: ${(config.memory.criticalThreshold * 100).toFixed(0)}% (${formatBytes(config.memory.maxBytes * config.memory.criticalThreshold)})
  Target:   ${(config.memory.cleanupTarget * 100).toFixed(0)}% (${formatBytes(config.memory.maxBytes * config.memory.cleanupTarget)})

Status: ${getMemoryStatus(percent)}

Cleanup Priority Order:
  1. Rejected quotes (TTL: ${formatDuration(config.ttl.rejectedQuotesInitial)})
  2. Pending quotes (TTL: ${formatDuration(config.ttl.pendingQuotes)})
  3. Session contexts (TTL: ${formatDuration(config.ttl.sessionContext)})

Estimated Capacity:
  ~${estimateCapacity(bytes, stats.approvedCount + stats.rejectedCount + stats.pendingCount)} more quotes at current average size
`);
}

// ============================================
// Helpers
// ============================================

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

function getMemoryStatus(percent: number): string {
  if (percent >= config.memory.criticalThreshold * 100) {
    return "🔴 CRITICAL - Aggressive cleanup needed";
  }
  if (percent >= config.memory.warningThreshold * 100) {
    return "🟡 WARNING - Approaching limit";
  }
  if (percent >= 50) {
    return "🟢 OK - Moderate usage";
  }
  return "🟢 OK - Low usage";
}

function estimateCapacity(usedBytes: number, quoteCount: number): number {
  if (quoteCount === 0) return 1000; // Rough estimate
  const avgQuoteSize = usedBytes / quoteCount;
  const remainingBytes = config.memory.maxBytes - usedBytes;
  return Math.floor(remainingBytes / avgQuoteSize);
}

main().catch(console.error);
