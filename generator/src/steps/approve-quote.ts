import { createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { BashQuoteSchema, VoteSchema } from "../types/index.js";
import { config } from "../config.js";
import {
  ApprovalDecision,
  ApprovalDecisionSchema,
  StoredQuote,
  createStoredQuote,
} from "../storage/types.js";
import { getStorage } from "../storage/redis-adapter.js";
import { log } from "../utils/logger.js";

/**
 * Approval Decision Step
 *
 * Evaluates votes and decides whether to approve or reject a quote.
 * Routes to appropriate storage with TTL for rejected quotes.
 */
export const approveQuoteStep = createStep({
  id: "approve-quote",
  inputSchema: z.object({
    quote: BashQuoteSchema,
    votes: z.array(VoteSchema),
    totalScore: z.number(),
    topic: z.string().optional(),
    personas: z.array(z.string()).optional(),
  }),
  outputSchema: z.object({
    quote: BashQuoteSchema,
    votes: z.array(VoteSchema),
    totalScore: z.number(),
    decision: ApprovalDecisionSchema,
    storedQuote: z.custom<StoredQuote>().optional(),
  }),
  execute: async ({ inputData }) => {
    const { quote, votes, totalScore, topic = "unknown", personas = [] } = inputData;

    // Calculate decision factors
    const averageScore = votes.length > 0 ? totalScore / votes.length : 0;
    const scores = votes.map((v) => v.score);
    const minJudgeScore = Math.min(...scores);
    const maxJudgeScore = Math.max(...scores);

    // Make approval decision
    const decision = makeApprovalDecision({
      averageScore,
      totalScore,
      minJudgeScore,
      maxJudgeScore,
    });

    // Decision logging now handled by parent workflow

    // Store the quote with appropriate status
    let storedQuote: StoredQuote | undefined;

    try {
      const storage = getStorage();

      // Determine status
      const status = decision.starred
        ? "starred"
        : decision.approved
          ? "approved"
          : "rejected";

      storedQuote = createStoredQuote(quote, votes, topic, personas, status);

      // Set TTL for rejected quotes
      if (status === "rejected") {
        storedQuote.ttlSeconds = config.ttl.rejectedQuotesInitial;
      }

      await storage.saveQuote(storedQuote);
      log.storage.saved(quote.id, status);
    } catch (error) {
      log.warning("Storage unavailable, continuing without persistence");
    }

    return {
      quote,
      votes,
      totalScore,
      decision,
      storedQuote,
    };
  },
});

/**
 * Make approval decision based on scores
 */
function makeApprovalDecision(factors: {
  averageScore: number;
  totalScore: number;
  minJudgeScore: number;
  maxJudgeScore: number;
}): ApprovalDecision {
  const { averageScore, totalScore, minJudgeScore, maxJudgeScore } = factors;

  // Check for auto-reject (any judge scored too low)
  if (minJudgeScore < config.approval.minSingleJudgeScore) {
    return {
      approved: false,
      starred: false,
      reason: `One or more judges scored below minimum threshold (${minJudgeScore} < ${config.approval.minSingleJudgeScore})`,
      factors,
    };
  }

  // Check for starred status (exceptional quote)
  if (averageScore >= config.approval.starredThreshold) {
    return {
      approved: true,
      starred: true,
      reason: `Exceptional quality - average score ${averageScore.toFixed(1)} exceeds starred threshold`,
      factors,
    };
  }

  // Check for approval
  if (
    averageScore >= config.approval.minAverageScore &&
    totalScore >= config.approval.minTotalScore
  ) {
    return {
      approved: true,
      starred: false,
      reason: `Passed approval thresholds (avg: ${averageScore.toFixed(1)}, total: ${totalScore})`,
      factors,
    };
  }

  // Default: rejected
  return {
    approved: false,
    starred: false,
    reason: `Below approval thresholds (avg: ${averageScore.toFixed(1)} < ${config.approval.minAverageScore} or total: ${totalScore} < ${config.approval.minTotalScore})`,
    factors,
  };
}

/**
 * Memory Check Step
 *
 * Checks memory before starting a new session.
 * Fails if memory is critical and cleanup couldn't free enough space.
 */
export const checkMemoryStep = createStep({
  id: "check-memory",
  inputSchema: z.object({
    topic: z.string(),
    numPersonas: z.number(),
    numRounds: z.number(),
  }),
  outputSchema: z.object({
    topic: z.string(),
    numPersonas: z.number(),
    numRounds: z.number(),
    memoryStatus: z.object({
      usedPercent: z.number(),
      allowed: z.boolean(),
    }),
  }),
  execute: async ({ inputData }) => {
    const { topic, numPersonas, numRounds } = inputData;

    try {
      const storage = getStorage();

      // Check and enforce memory limits
      const { percent } = await storage.getMemoryUsage();

      if (percent >= config.memory.criticalThreshold * 100) {
        // Try to cleanup
        const cleaned = await storage.enforceMemoryLimit();

        // Check again
        const { percent: newPercent } = await storage.getMemoryUsage();

        if (newPercent >= config.memory.criticalThreshold * 100) {
          log.memory.warning(`Critical: ${newPercent.toFixed(1)}% used after cleanup`);
          throw new Error(
            `Memory limit exceeded: ${newPercent.toFixed(1)}% used. Please wait for cleanup or reduce usage.`
          );
        }
      }

      return {
        topic,
        numPersonas,
        numRounds,
        memoryStatus: {
          usedPercent: percent,
          allowed: true,
        },
      };
    } catch (error) {
      // If Redis is not available, continue without memory checks
      if ((error as Error).message?.includes("ECONNREFUSED")) {
        log.redis.notAvailable();
        return {
          topic,
          numPersonas,
          numRounds,
          memoryStatus: {
            usedPercent: 0,
            allowed: true,
          },
        };
      }
      throw error;
    }
  },
});

/**
 * Rate Limit Check Step
 *
 * Checks if the request is within rate limits.
 */
export const checkRateLimitStep = createStep({
  id: "check-rate-limit",
  inputSchema: z.object({
    topic: z.string(),
    numPersonas: z.number(),
    numRounds: z.number(),
    memoryStatus: z.object({
      usedPercent: z.number(),
      allowed: z.boolean(),
    }),
  }),
  outputSchema: z.object({
    topic: z.string(),
    numPersonas: z.number(),
    numRounds: z.number(),
  }),
  execute: async ({ inputData }) => {
    const { topic, numPersonas, numRounds } = inputData;

    try {
      const storage = getStorage();
      const rateLimit = await storage.checkRateLimit("global");

      if (!rateLimit.allowed) {
        throw new Error(
          `Rate limit exceeded. Retry in ${rateLimit.resetInSeconds} seconds.`
        );
      }

      log.rate.status(rateLimit.remaining, config.process.maxSessionsPerMinute);
    } catch (error) {
      // If Redis is not available, continue without rate limiting
      if ((error as Error).message?.includes("ECONNREFUSED")) {
        // Already logged by memory step
      } else if ((error as Error).message?.includes("Rate limit")) {
        log.rate.exceeded(60);
        throw error;
      }
    }

    return { topic, numPersonas, numRounds };
  },
});
