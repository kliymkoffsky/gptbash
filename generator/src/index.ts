import { Mastra } from "@mastra/core/mastra";
import { quoteGeneratorWorkflow } from "./workflows/quote-generator.js";
import { improvSessionWorkflow, runBatchImprov } from "./workflows/improv-session.js";
import { quoteStylistAgent } from "./agents/quote-stylist.js";
import { personaAgents } from "./agents/personas/index.js";
import { judgeAgents } from "./agents/judges/index.js";
import { getRandomPrompt, getRandomPrompts } from "./data/conversation-prompts.js";

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
  },
});

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
  console.log(`\n📝 Running Quote Generator (source: ${source})...\n`);

  const workflow = mastra.getWorkflow("quote-generator");
  const run = await workflow.createRun();

  const result = await run.start({
    inputData: { source, query },
  });

  if (result.status === "success") {
    console.log(formatQuoteForDisplay(result.result.quote));
    return result.result.quote;
  } else {
    console.error("Workflow failed:", result);
    return null;
  }
}

/**
 * Run improv session (Mode 2)
 */
async function runImprovSession(
  topic: string,
  numPersonas = 3,
  numRounds = 5
) {
  console.log(`\n🎭 Running Improv Session...\n`);
  console.log(`Topic: "${topic}"`);
  console.log(`Personas: ${numPersonas}, Rounds: ${numRounds}\n`);

  const workflow = mastra.getWorkflow("improv-session");
  const run = await workflow.createRun();

  const result = await run.start({
    inputData: { topic, numPersonas, numRounds },
  });

  if (result.status === "success") {
    const { quote, votes, totalScore } = result.result;

    console.log(formatQuoteForDisplay(quote));
    console.log(`\n📊 Voting Results:`);
    votes.forEach((vote) => {
      console.log(`  ${vote.criteria}: ${vote.score}/10 - ${vote.reasoning}`);
    });
    console.log(`\n🏆 Total Score: ${totalScore}/${votes.length * 10}`);

    return result.result;
  } else {
    console.error("Workflow failed:", result);
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

  console.log(`
╔════════════════════════════════════════════════════════╗
║          GPTBASH - Quote Generator                     ║
║          bash.org.pl style with Mastra AI              ║
╚════════════════════════════════════════════════════════╝
  `);

  switch (mode) {
    case "mock":
    case "wykop":
    case "twitter":
      await runQuoteGenerator(mode as "wykop" | "twitter" | "mock", query);
      break;

    case "improv":
      await runImprovSession(topic);
      break;

    case "improv-batch":
      await runBatchImprovMode(count);
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

Options:
  --topic="..."         Topic for improv mode
  --count=N             Number of sessions for improv-batch
  --query="..."         Search query for wykop/twitter modes

Examples:
  npx tsx src/index.ts --mode=mock
  npx tsx src/index.ts --mode=improv --topic="The intern pushed to prod"
  npx tsx src/index.ts --mode=improv-batch --count=10
      `);
  }
}

// Run if executed directly
main().catch(console.error);

// Export for use as a module
export {
  quoteGeneratorWorkflow,
  improvSessionWorkflow,
  runQuoteGenerator,
  runImprovSession,
  runBatchImprovMode,
};
