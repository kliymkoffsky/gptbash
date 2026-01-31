import { Mastra } from "@mastra/core/mastra";
import { quoteGeneratorWorkflow } from "./workflows/quote-generator.js";
import { improvSessionWorkflow, simpleImprovWorkflow, runBatchImprov } from "./workflows/improv-session.js";
import { quoteStylistAgent } from "./agents/quote-stylist.js";
import { creativeAgents } from "./agents/creative-agents.js";
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
    ...creativeAgents,
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
  format?: "micro" | "short" | "medium" | "standard",
  useStorage = true
) {
  log.workflow.start("Improv Session", topic);

  // Choose workflow based on storage availability
  const workflowId = useStorage ? "improv-session" : "simple-improv-session";
  const workflow = mastra.getWorkflow(workflowId);
  const run = await workflow.createRun();

  const result = await run.start({
    inputData: { topic, format },
  });

  if (result.status === "success") {
    const { quote, votes, totalScore, judgeComments, iterations, format: usedFormat } = result.result;

    // Display quote
    log.quote.display(quote);

    // Show final result
    const avgScore = votes.length > 0 ? totalScore / votes.length : 0;
    const approved = avgScore >= 7 && totalScore >= 21;

    log.info(`Format: ${usedFormat?.name || "unknown"} | Iterations: ${iterations || 1}`);

    if (approved) {
      log.approval.approved(`Score: ${totalScore}, avg: ${avgScore.toFixed(1)}`);
    } else {
      log.approval.rejected(`Score: ${totalScore}, avg: ${avgScore.toFixed(1)}`);
    }

    // Show judge comments if any
    if (judgeComments && judgeComments.length > 0) {
      console.log();
      judgeComments.forEach((c: string) => log.info(`💬 ${c}`));
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
 * Quick session - one shot, no iterations
 */
async function runQuickSession(
  topic: string,
  format?: "micro" | "short" | "medium" | "standard"
) {
  log.workflow.start("Quick", topic);
  
  const { oneShotStep } = await import("./steps/one-shot.js");
  const { FORMATS, getRandomFormat } = await import("./prompts/formats.js");
  
  const selectedFormat = format ? FORMATS[format] : getRandomFormat();
  
  // Direct agent call, no workflow overhead
  const agent = mastra.getAgent("conversation-writer");
  const { oneShotPrompt } = await import("./prompts/one-shot.js");
  
  try {
    const prompt = oneShotPrompt(topic, selectedFormat);
    const result = await agent.generate(prompt);
    const text = result.text || "";
    
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      let messages = JSON.parse(jsonMatch[0]);
      messages = messages.slice(0, selectedFormat.messages);
      
      const quoteId = Math.random().toString(36).substring(2, 10);
      const quote = {
        id: quoteId,
        lines: messages.map((m: any) => ({ nickname: m.author, text: m.content })),
      };
      
      log.quote.display(quote);
      log.info(`Format: ${selectedFormat.name}`);
      log.success("Done");
    }
  } catch (e) {
    log.workflow.error("Failed", e as Error);
  }
}

/**
 * Raw session - simplest possible, text output
 */
async function runRawSession(topic: string) {
  log.workflow.start("Raw", topic);
  
  const agent = mastra.getAgent("conversation-writer");
  const { rawShotPrompt } = await import("./prompts/raw-shot.js");
  
  try {
    const prompt = rawShotPrompt(topic);
    const result = await agent.generate(prompt);
    const text = result.text || "";
    
    // Parse <nick> message format
    const lines = text.split("\n").filter((l) => l.trim().startsWith("<"));
    
    if (lines.length > 0) {
      console.log();
      console.log("━".repeat(50));
      lines.forEach((line) => {
        console.log(line.trim());
      });
      console.log("━".repeat(50));
      log.success("Done");
    } else {
      // Fallback - just show raw output
      console.log();
      console.log(text);
    }
  } catch (e) {
    log.workflow.error("Failed", e as Error);
  }
}

/**
 * Generate topics for a category and run conversations
 */
async function runCategoryBatch(
  category: string,
  count: number = 3,
  format?: "micro" | "short" | "medium" | "standard"
) {
  log.workflow.start("Category Batch", category);
  log.info(`Generating ${count} topics...`);

  // Generate topics using LLM
  const agent = mastra.getAgent("creative-director");
  let topics: string[] = [];

  try {
    const { topicsPrompt } = await import("./prompts/index.js");
    const prompt = topicsPrompt(category, count);
    const result = await agent.generate(prompt);
    const text = result.text || "";
    
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      topics = JSON.parse(jsonMatch[0]);
    }
  } catch (_e) {
    log.warning("Topic generation failed, using fallback");
    topics = [`${category} problem 1`, `${category} problem 2`, `${category} problem 3`];
  }

  log.info(`Topics: ${topics.join(", ")}`);
  console.log();

  // Run each topic
  for (let i = 0; i < topics.length; i++) {
    log.divider();
    log.info(`[${i + 1}/${topics.length}] ${topics[i]}`);
    await runImprovSession(topics[i], format, false);
    console.log();
  }

  log.success(`Completed ${topics.length} conversations`);
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
      const formatArg = args.find((a) => a.startsWith("--format="))?.split("=")[1] as
        | "micro" | "short" | "medium" | "standard" | undefined;
      await runImprovSession(topic, formatArg, storageAvailable);
      break;

    case "quick":
      const qFormatArg = args.find((a) => a.startsWith("--format="))?.split("=")[1] as
        | "micro" | "short" | "medium" | "standard" | undefined;
      await runQuickSession(topic, qFormatArg);
      break;

    case "raw":
      await runRawSession(topic);
      break;

    case "improv-batch":
      await runBatchImprovMode(count);
      break;

    case "category":
      const categoryArg = args.find((a) => a.startsWith("--category="))?.split("=")[1] || "tech";
      const catFormatArg = args.find((a) => a.startsWith("--format="))?.split("=")[1] as
        | "micro" | "short" | "medium" | "standard" | undefined;
      await runCategoryBatch(categoryArg, count, catFormatArg);
      break;

    case "stats":
      await showStorageStats();
      break;

    default:
      console.log(`
Usage:
  npx tsx src/index.ts --mode=<mode> [options]

Modes:
  --mode=raw            Simplest - text output, no JSON
  --mode=quick          One-shot JSON generation
  --mode=improv         Full pipeline with iterations
  --mode=category       Generate topics + batch run

Options:
  --topic="..."         Topic for improv mode
  --category="..."      Category for batch generation (tech, gaming, work, etc)
  --format=X            Format: micro (2), short (3), medium (4), standard (5)
  --count=N             Number of conversations (default: 3)
  --no-storage          Skip Redis storage

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
