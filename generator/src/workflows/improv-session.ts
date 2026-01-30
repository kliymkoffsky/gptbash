import { createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { ImprovSessionOutputSchema } from "../types/index.js";
import { selectPersonasStep, formatQuoteStep, rankQuotesStep } from "../steps/rank-quotes.js";
import { runConversationStep } from "../steps/run-conversation.js";
import { collectVotesStep } from "../steps/collect-votes.js";
import { approveQuoteStep, checkMemoryStep, checkRateLimitStep } from "../steps/approve-quote.js";
import { ApprovalDecisionSchema } from "../storage/types.js";
import { config } from "../config.js";

// Extended output schema with approval decision
const ImprovSessionWithApprovalOutputSchema = ImprovSessionOutputSchema.extend({
  decision: ApprovalDecisionSchema,
  approved: z.boolean(),
  starred: z.boolean(),
});

/**
 * Improv Session Workflow (Mode 2)
 *
 * Orchestrates AI agents having funny conversations and judges voting on them.
 * Includes memory guardrails, rate limiting, and approval routing.
 *
 * Pipeline:
 * 1. checkMemoryStep - Verify memory is under limit
 * 2. checkRateLimitStep - Verify rate limit not exceeded
 * 3. selectPersonasStep - Pick 2-5 random personas
 * 4. runConversationStep - Agents chat in ping-pong fashion
 * 5. formatQuoteStep - Convert to bash.org.pl quote format
 * 6. collectVotesStep - All judges vote in parallel
 * 7. rankQuotesStep - Aggregate scores
 * 8. approveQuoteStep - Route to approved/rejected storage
 */
export const improvSessionWorkflow = createWorkflow({
  id: "improv-session",
  description: "AI agents engage in funny conversations while judges vote on quality",
  inputSchema: z.object({
    topic: z.string().describe("Conversation starter or topic"),
    numPersonas: z.number().min(2).max(5).default(3).describe("Number of personas to include"),
    numRounds: z.number().min(2).max(10).default(5).describe("Number of conversation rounds"),
  }),
  outputSchema: ImprovSessionWithApprovalOutputSchema,
})
  .then(checkMemoryStep)
  .then(checkRateLimitStep)
  .then(selectPersonasStep)
  .then(runConversationStep)
  .then(formatQuoteStep)
  .then(collectVotesStep)
  .then(rankQuotesStep)
  .then(approveQuoteStep)
  .commit();

/**
 * Simple Improv Workflow (without guardrails)
 *
 * For testing or when Redis is not available.
 */
export const simpleImprovWorkflow = createWorkflow({
  id: "simple-improv-session",
  description: "Simple improv session without storage/guardrails",
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
 * Runs multiple improv sessions with concurrency limits.
 * Returns ranked results by approval status and score.
 */
export async function runBatchImprov(
  workflow: typeof improvSessionWorkflow | typeof simpleImprovWorkflow,
  topics: string[],
  options: { numPersonas?: number; numRounds?: number; maxConcurrent?: number } = {}
) {
  const {
    numPersonas = 3,
    numRounds = 5,
    maxConcurrent = config.process.maxConcurrentSessions,
  } = options;

  console.log(`\n🎭 Running batch improv with ${topics.length} topics (max ${maxConcurrent} concurrent)...\n`);

  const results: Array<{ topic: string; result: any; error?: any }> = [];

  // Process in batches to respect concurrency limit
  for (let i = 0; i < topics.length; i += maxConcurrent) {
    const batch = topics.slice(i, i + maxConcurrent);

    const batchResults = await Promise.all(
      batch.map(async (topic) => {
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

    results.push(...batchResults);
  }

  // Filter and categorize results
  const successful = results.filter((r) => r.result?.status === "success");

  const approved = successful
    .filter((r) => r.result!.result.decision?.approved)
    .map((r) => ({
      topic: r.topic,
      ...r.result!.result,
    }))
    .sort((a, b) => b.totalScore - a.totalScore);

  const rejected = successful
    .filter((r) => !r.result!.result.decision?.approved)
    .map((r) => ({
      topic: r.topic,
      ...r.result!.result,
    }))
    .sort((a, b) => b.totalScore - a.totalScore);

  console.log(`\n🏆 Batch Results:`);
  console.log(`================================`);
  console.log(`✅ Approved: ${approved.length}`);
  approved.forEach((r, i) => {
    const star = r.decision?.starred ? "⭐" : "";
    console.log(`  ${i + 1}. ${star}Score: ${r.totalScore} - "${r.topic}"`);
  });
  console.log(`\n❌ Rejected: ${rejected.length}`);
  rejected.slice(0, 5).forEach((r, i) => {
    console.log(`  ${i + 1}. Score: ${r.totalScore} - "${r.topic}"`);
  });
  if (rejected.length > 5) {
    console.log(`  ... and ${rejected.length - 5} more`);
  }
  console.log(`================================\n`);

  return { approved, rejected, total: successful.length };
}
