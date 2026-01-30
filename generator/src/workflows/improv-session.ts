import { createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { ImprovSessionOutputSchema } from "../types/index.js";
import { selectPersonasStep, formatQuoteStep, rankQuotesStep } from "../steps/rank-quotes.js";
import { runConversationStep } from "../steps/run-conversation.js";
import { collectVotesStep } from "../steps/collect-votes.js";

/**
 * Improv Session Workflow (Mode 2)
 *
 * Orchestrates AI agents having funny conversations and judges voting on them.
 *
 * Pipeline:
 * 1. selectPersonasStep - Pick 2-5 random personas
 * 2. runConversationStep - Agents chat in ping-pong fashion
 * 3. formatQuoteStep - Convert to bash.org.pl quote format
 * 4. collectVotesStep - All judges vote in parallel
 * 5. rankQuotesStep - Aggregate scores and output results
 */
export const improvSessionWorkflow = createWorkflow({
  id: "improv-session",
  description: "AI agents engage in funny conversations while judges vote on quality",
  inputSchema: z.object({
    topic: z.string().describe("Conversation starter or topic"),
    numPersonas: z.number().min(2).max(5).default(3).describe("Number of personas to include"),
    numRounds: z.number().min(2).max(10).default(5).describe("Number of conversation rounds"),
  }),
  outputSchema: ImprovSessionOutputSchema,
})
  .then(selectPersonasStep)
  .then(runConversationStep)
  .then(formatQuoteStep)
  .then(collectVotesStep)
  .then(rankQuotesStep)
  .commit();

/**
 * Batch Improv Runner
 *
 * Runs multiple improv sessions and returns ranked results.
 */
export async function runBatchImprov(
  workflow: typeof improvSessionWorkflow,
  topics: string[],
  options: { numPersonas?: number; numRounds?: number } = {}
) {
  const { numPersonas = 3, numRounds = 5 } = options;

  console.log(`\n🎭 Running batch improv with ${topics.length} topics...\n`);

  // Run all sessions in parallel
  const results = await Promise.all(
    topics.map(async (topic) => {
      try {
        const run = await workflow.createRun();
        const result = await run.start({
          inputData: { topic, numPersonas, numRounds },
        });
        return { topic, result };
      } catch (error) {
        console.error(`Error running improv for topic "${topic}":`, error);
        return { topic, result: null, error };
      }
    })
  );

  // Filter successful results and rank by total score
  const successful = results
    .filter((r) => r.result?.status === "success")
    .map((r) => ({
      topic: r.topic,
      ...r.result!.result,
    }))
    .sort((a, b) => b.totalScore - a.totalScore);

  console.log(`\n🏆 Batch Results (ranked by score):`);
  console.log(`================================`);
  successful.forEach((r, i) => {
    console.log(`${i + 1}. Score: ${r.totalScore} - "${r.topic}"`);
  });
  console.log(`================================\n`);

  return successful;
}
