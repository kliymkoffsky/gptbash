import { createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { BashQuoteSchema, VoteSchema, JUDGES } from "../types/index.js";
import { log } from "../utils/logger.js";
import { hasApiKey } from "../utils/api-check.js";

/**
 * Collect Votes Step (Improv Mode)
 *
 * Runs all judge agents in parallel to vote on a generated quote.
 * Each judge evaluates based on their specific criteria.
 * Passes through topic and personas for storage.
 */
export const collectVotesStep = createStep({
  id: "collect-votes",
  inputSchema: z.object({
    quote: BashQuoteSchema,
    topic: z.string().optional(),
    personas: z.array(z.string()).optional(),
  }),
  outputSchema: z.object({
    quote: BashQuoteSchema,
    votes: z.array(VoteSchema),
    topic: z.string().optional(),
    personas: z.array(z.string()).optional(),
  }),
  execute: async ({ inputData, mastra }) => {
    const { quote, topic, personas } = inputData;

    // Format quote for judging
    const quoteText = formatQuoteForJudging(quote);

    log.judge.voting();

    // Run all judges in parallel
    const votePromises = JUDGES.map(async (judgeConfig) => {
      const agent = mastra?.getAgent?.(judgeConfig.id);

      // Skip agent call if no API key - use fallback immediately
      if (!agent || !hasApiKey()) {
        return generateFallbackVote(judgeConfig, quoteText);
      }

      try {
        const prompt = buildJudgingPrompt(judgeConfig, quoteText);

        const result = await agent.generate(prompt);

        return parseJudgeResponse(judgeConfig, result.text || "");
      } catch (error) {
        log.agent.error(judgeConfig.id, error);
        return generateFallbackVote(judgeConfig, quoteText);
      }
    });

    const votes = await Promise.all(votePromises);

    return { quote, votes, topic, personas };
  },
});

/**
 * Format a quote for display to judges
 */
function formatQuoteForJudging(quote: {
  id: string;
  lines: { nickname: string; text: string }[];
}): string {
  const lines = quote.lines.map((line) => `<${line.nickname}> ${line.text}`);
  return lines.join("\n");
}

/**
 * Build a prompt for a judge agent
 */
function buildJudgingPrompt(
  judgeConfig: { id: string; criteria: string; description: string },
  quoteText: string
): string {
  return `You are judging an IRC-style quote for ${judgeConfig.criteria}.

${judgeConfig.description}

Here is the quote to judge:

${quoteText}

Rate this quote from 1 to 10, where:
1-3 = Not funny at all
4-5 = Slightly amusing
6-7 = Funny
8-9 = Very funny
10 = Legendary, bash.org.pl top material

Respond in this EXACT format:
SCORE: [number 1-10]
REASONING: [1-2 sentences explaining your rating]`;
}

/**
 * Parse a judge's response into a structured vote
 */
function parseJudgeResponse(
  judgeConfig: { id: string; criteria: string },
  responseText: string
): { judgeId: string; score: number; criteria: string; reasoning: string } {
  // Try to extract score
  const scoreMatch = responseText.match(/SCORE:\s*(\d+)/i);
  let score = scoreMatch ? parseInt(scoreMatch[1], 10) : 5;

  // Clamp score to valid range
  score = Math.max(1, Math.min(10, score));

  // Try to extract reasoning
  const reasoningMatch = responseText.match(/REASONING:\s*(.+)/is);
  let reasoning = reasoningMatch
    ? reasoningMatch[1].trim()
    : "No reasoning provided.";

  // Clean up reasoning
  reasoning = reasoning.split("\n")[0].slice(0, 200);

  return {
    judgeId: judgeConfig.id,
    score,
    criteria: judgeConfig.criteria,
    reasoning,
  };
}

/**
 * Generate a fallback vote when agent is not available
 */
function generateFallbackVote(
  judgeConfig: { id: string; criteria: string },
  _quoteText: string
): { judgeId: string; score: number; criteria: string; reasoning: string } {
  // Generate a reasonable random score (slightly weighted toward middle)
  const score = Math.floor(Math.random() * 4) + 4; // 4-7 range

  return {
    judgeId: judgeConfig.id,
    score,
    criteria: judgeConfig.criteria,
    reasoning: `[Fallback] Random score generated (agent unavailable)`,
  };
}
