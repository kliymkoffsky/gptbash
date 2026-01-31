import { createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { BashQuoteSchema, VoteSchema } from "../types/index.js";
import { generateEverythingStep } from "../steps/generate-everything.js";
import { runAndJudgeStep } from "../steps/run-and-judge.js";
import { checkMemoryStep, checkRateLimitStep } from "../steps/approve-quote.js";
import { config } from "../config.js";

const FormatSchema = z.object({
  name: z.string(),
  messages: z.number(),
  personas: z.number(),
  description: z.string(),
});

// Output schema
const ImprovOutputSchema = z.object({
  quote: BashQuoteSchema,
  votes: z.array(VoteSchema),
  totalScore: z.number(),
  judgeComments: z.array(z.string()),
  iterations: z.number(),
  format: FormatSchema,
});

/**
 * Improv Session Workflow
 *
 * Fully generative pipeline:
 * 1. checkMemoryStep - Verify memory is under limit
 * 2. checkRateLimitStep - Verify rate limit not exceeded
 * 3. generateEverythingStep - LLM generates scene (personas, situations, rules, flavor)
 * 4. runAndJudgeStep - Writes conversation + random judges evaluate + optional rewrite
 */
export const improvSessionWorkflow = createWorkflow({
  id: "improv-session",
  description: "Fully generative improv - everything is LLM created",
  inputSchema: z.object({
    topic: z.string().describe("Conversation starter or topic"),
    format: z.enum(["micro", "short", "medium", "standard"]).optional().describe("Conversation format"),
  }),
  outputSchema: ImprovOutputSchema,
})
  .then(checkMemoryStep)
  .then(checkRateLimitStep)
  .then(generateEverythingStep)
  .then(runAndJudgeStep)
  .commit();

/**
 * Simple Improv Workflow (without guardrails)
 */
export const simpleImprovWorkflow = createWorkflow({
  id: "simple-improv-session",
  description: "Simple improv session without storage/guardrails",
  inputSchema: z.object({
    topic: z.string().describe("Conversation starter or topic"),
    format: z.enum(["micro", "short", "medium", "standard"]).optional().describe("Conversation format"),
  }),
  outputSchema: ImprovOutputSchema,
})
  .then(generateEverythingStep)
  .then(runAndJudgeStep)
  .commit();

/**
 * Batch Improv Runner
 */
export async function runBatchImprov(
  workflow: typeof improvSessionWorkflow | typeof simpleImprovWorkflow,
  topics: string[],
  options: { maxConcurrent?: number } = {}
) {
  const { maxConcurrent = config.process.maxConcurrentSessions } = options;

  console.log(`\n🎭 Running batch improv with ${topics.length} topics...\n`);

  const results: Array<{ topic: string; result: any; error?: any }> = [];

  for (let i = 0; i < topics.length; i += maxConcurrent) {
    const batch = topics.slice(i, i + maxConcurrent);

    const batchResults = await Promise.all(
      batch.map(async (topic) => {
        try {
          const run = await workflow.createRun();
          const result = await run.start({ inputData: { topic } });
          return { topic, result };
        } catch (error) {
          console.error(`Error for "${topic}":`, error);
          return { topic, result: null, error };
        }
      })
    );

    results.push(...batchResults);
  }

  const successful = results.filter((r) => r.result?.status === "success");
  const avgScore = successful.length > 0
    ? successful.reduce((sum, r) => sum + (r.result?.result?.totalScore || 0), 0) / successful.length
    : 0;

  console.log(`\n🏆 Batch Results: ${successful.length}/${results.length} successful, avg score: ${avgScore.toFixed(1)}\n`);

  return { results: successful, avgScore };
}
