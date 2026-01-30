import { Mastra } from "@mastra/core/mastra";
import { quoteGeneratorWorkflow } from "./workflows/quote-generator.js";
import { improvSessionWorkflow, simpleImprovWorkflow, runBatchImprov } from "./workflows/improv-session.js";
import { quoteStylistAgent } from "./agents/quote-stylist.js";
import { personaAgents } from "./agents/personas/index.js";
import { judgeAgents } from "./agents/judges/index.js";
import { getRandomPrompt, getRandomPrompts } from "./data/conversation-prompts.js";
import { initStorage, getStorage } from "./storage/index.js";
import { config } from "./config.js";
import { log } from "./utils/logger.js";

/**
 * Mastra Instance
 *
 * Registers all agents and workflows for the quote generator.
 */
export const mastra = new Mastra({
  agents: {
    "quote-stylist": quoteStylistAgent,
    ...personaAgents,
    ...judgeAgents,
  },
  workflows: {
    "quote-generator": quoteGeneratorWorkflow,
    "improv-session": improvSessionWorkflow,
    "simple-improv-session": simpleImprovWorkflow,
  },
});

/**
 * Initialize storage (optional - gracefully handles Redis unavailability)
 */
async function tryInitStorage(): Promise<boolean> {
  try {
    await initStorage();
    log.redis.connected();
    return true;
  } catch (error) {
    log.redis.notAvailable();
    return false;
  }
}

/**
 * Format a quote for display
 */
function formatQuoteForDisplay(quote: {
  id: string;
  lines: { nickname: string; text: string }[];
  metadata: { source: string; sourceUrl?: string; generatedAt: Date };
}): string {
  const lines = quote.lines.map((line) => `<${line.nickname}> ${line.text}`);
  const header = `#${quote.id} | ${quote.metadata.source}`;
  const sourceLink = quote.metadata.sourceUrl
    ? `\nSource: ${quote.metadata.sourceUrl}`
    : "";

  return `\n${"=".repeat(50)}\n${header}\n${"=".repeat(50)}\n${lines.join("\n")}${sourceLink}\n${"=".repeat(50)}\n`;
}

/**
 * Run quote generator (Mode 1)
 */
async function runQuoteGenerator(source: "wykop" | "twitter" | "mock", query?: string) {
  log.workflow.start("Quote Generator", `source: ${source}`);

  const workflow = mastra.getWorkflow("quote-generator");
  const run = await workflow.createRun();

  const result = await run.start({
    inputData: { source, query },
  });

  if (result.status === "success") {
    log.quote.display(result.result.quote);
    log.workflow.success("Quote generated successfully");
    return result.result.quote;
  } else {
    log.workflow.error("Workflow failed", new Error(JSON.stringify(result)));
    return null;
  }
}

/**
 * Run improv session (Mode 2)
 */
async function runImprovSession(
  topic: string,
  numPersonas = 3,
  numRounds = 5,
  useStorage = true
) {
  log.workflow.start("Improv Session", topic);
  log.info(`Personas: ${numPersonas}, Rounds: ${numRounds}`);

  // Choose workflow based on storage availability
  const workflowId = useStorage ? "improv-session" : "simple-improv-session";
  const workflow = mastra.getWorkflow(workflowId);
  const run = await workflow.createRun();

  const result = await run.start({
    inputData: { topic, numPersonas, numRounds },
  });

  if (result.status === "success") {
    const { quote, votes, totalScore, decision } = result.result;

    // Display quote
    log.quote.display(quote);

    // Display votes
    log.divider();
    log.judge.voting();
    votes.forEach((vote: { judgeId: string; criteria: string; score: number; reasoning: string }) => {
      log.judge.vote(vote.judgeId || vote.criteria, vote.score);
    });
    log.judge.total(totalScore, votes.length * 10);

    // Show approval decision if available
    if (decision) {
      if (decision.starred) {
        log.approval.starred(decision.reason);
      } else if (decision.approved) {
        log.approval.approved(decision.reason);
      } else {
        log.approval.rejected(decision.reason);
      }
    }

    return result.result;
  } else {
    log.workflow.error("Workflow failed", new Error(JSON.stringify(result)));
    return null;
  }
}

/**
 * Run batch improv sessions (Mode 2 - batch)
 */
async function runBatchImprovMode(count: number) {
  const topics = getRandomPrompts(count);
  const workflow = mastra.getWorkflow("improv-session");
  return runBatchImprov(workflow, topics);
}

/**
 * CLI Entry Point
 */
async function main() {
  const args = process.argv.slice(2);
  const mode = args.find((a) => a.startsWith("--mode="))?.split("=")[1] || "mock";
  const topic =
    args.find((a) => a.startsWith("--topic="))?.split("=")[1] || getRandomPrompt();
  const count = parseInt(
    args.find((a) => a.startsWith("--count="))?.split("=")[1] || "5",
    10
  );
  const query = args.find((a) => a.startsWith("--query="))?.split("=")[1];
  const noStorage = args.includes("--no-storage");

  log.header("GPTBASH - Quote Generator");

  // Check for API key
  if (!process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY) {
    log.agent.noApiKey();
  }

  // Try to initialize storage (optional)
  let storageAvailable = false;
  if (!noStorage && (mode === "improv" || mode === "improv-batch")) {
    storageAvailable = await tryInitStorage();
  }

  switch (mode) {
    case "mock":
    case "wykop":
    case "twitter":
      await runQuoteGenerator(mode as "wykop" | "twitter" | "mock", query);
      break;

    case "improv":
      await runImprovSession(topic, 3, 5, storageAvailable);
      break;

    case "improv-batch":
      await runBatchImprovMode(count);
      break;

    case "stats":
      await showStorageStats();
      break;

    default:
      console.log(`
Usage:
  npx tsx src/index.ts --mode=<mode> [options]

Modes:
  --mode=mock           Generate quote from mock data (default)
  --mode=wykop          Fetch from wykop.pl (stub)
  --mode=twitter        Fetch from Twitter/X (stub)
  --mode=improv         Run improv session with AI agents
  --mode=improv-batch   Run multiple improv sessions and rank
  --mode=stats          Show storage statistics

Options:
  --topic="..."         Topic for improv mode
  --count=N             Number of sessions for improv-batch
  --query="..."         Search query for wykop/twitter modes
  --no-storage          Skip Redis storage (no persistence)

Storage CLI:
  npm run storage:stats     Show storage statistics
  npm run storage:cleanup   Force cleanup to free memory

Examples:
  npx tsx src/index.ts --mode=mock
  npx tsx src/index.ts --mode=improv --topic="The intern pushed to prod"
  npx tsx src/index.ts --mode=improv-batch --count=10
  npx tsx src/index.ts --mode=improv --no-storage
      `);
  }

  // Cleanup storage connection
  if (storageAvailable) {
    try {
      await getStorage().disconnect();
    } catch {
      // Ignore disconnect errors
    }
  }
}

/**
 * Show storage statistics
 */
async function showStorageStats() {
  const connected = await tryInitStorage();
  if (!connected) {
    console.error("Cannot show stats - Redis not available");
    return;
  }

  const storage = getStorage();
  const stats = await storage.getStats();

  console.log(`
📊 Storage Statistics:
   Memory: ${(stats.memoryUsedBytes / 1024 / 1024).toFixed(1)}MB / ${config.memory.maxBytes / 1024 / 1024}MB (${stats.memoryUsedPercent.toFixed(1)}%)
   Approved: ${stats.approvedCount}
   Rejected: ${stats.rejectedCount}
   Pending: ${stats.pendingCount}
   Total Generated: ${stats.totalQuotesGenerated}
   Approval Rate: ${stats.approvalRate.toFixed(1)}%
  `);
}

// Run if executed directly
main().catch(console.error);

// Export for use as a module
export {
  quoteGeneratorWorkflow,
  improvSessionWorkflow,
  simpleImprovWorkflow,
  runQuoteGenerator,
  runImprovSession,
  runBatchImprovMode,
};

// Re-export storage and config
export { config } from "./config.js";
export { getStorage, initStorage } from "./storage/index.js";
