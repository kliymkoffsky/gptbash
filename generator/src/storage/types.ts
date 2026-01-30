import { z } from "zod";
import { BashQuoteSchema, VoteSchema } from "../types/index.js";

/**
 * Storage Types
 *
 * Defines data structures for Redis storage.
 */

// ============================================
// Quote Status
// ============================================

export const QuoteStatusSchema = z.enum([
  "pending",   // Awaiting judgment
  "approved",  // Passed judge threshold
  "rejected",  // Failed judge threshold
  "starred",   // High-scoring approved quote
]);

export type QuoteStatus = z.infer<typeof QuoteStatusSchema>;

// ============================================
// Stored Quote (with metadata)
// ============================================

export const StoredQuoteSchema = z.object({
  /** The quote content */
  quote: BashQuoteSchema,

  /** Current status */
  status: QuoteStatusSchema,

  /** All votes from judges */
  votes: z.array(VoteSchema),

  /** Total score from all judges */
  totalScore: z.number(),

  /** Average score */
  averageScore: z.number(),

  /** Topic/prompt that generated this quote */
  topic: z.string(),

  /** Personas that participated */
  personas: z.array(z.string()),

  /** When the quote was created */
  createdAt: z.string().datetime(),

  /** When the quote was last accessed */
  lastAccessedAt: z.string().datetime(),

  /** Number of times accessed */
  accessCount: z.number().default(0),

  /** Current TTL in seconds (for rejected quotes) */
  ttlSeconds: z.number().optional(),

  /** Approximate size in bytes (for memory tracking) */
  sizeBytes: z.number().optional(),
});

export type StoredQuote = z.infer<typeof StoredQuoteSchema>;

// ============================================
// Session Context
// ============================================

export const SessionContextSchema = z.object({
  /** Session ID */
  sessionId: z.string(),

  /** Current topic */
  topic: z.string(),

  /** Selected personas */
  personas: z.array(z.string()),

  /** Conversation history */
  messages: z.array(z.object({
    author: z.string(),
    content: z.string(),
    timestamp: z.string().datetime(),
  })),

  /** Session start time */
  startedAt: z.string().datetime(),

  /** Current round */
  currentRound: z.number(),

  /** Total rounds planned */
  totalRounds: z.number(),
});

export type SessionContext = z.infer<typeof SessionContextSchema>;

// ============================================
// Storage Stats
// ============================================

export const StorageStatsSchema = z.object({
  /** Total memory usage in bytes */
  memoryUsedBytes: z.number(),

  /** Memory usage as percentage of limit */
  memoryUsedPercent: z.number(),

  /** Count of approved quotes */
  approvedCount: z.number(),

  /** Count of rejected quotes */
  rejectedCount: z.number(),

  /** Count of pending quotes */
  pendingCount: z.number(),

  /** Count of active sessions */
  activeSessionCount: z.number(),

  /** Total quotes generated all time */
  totalQuotesGenerated: z.number(),

  /** Total quotes approved all time */
  totalQuotesApproved: z.number(),

  /** Approval rate (percentage) */
  approvalRate: z.number(),

  /** Last cleanup timestamp */
  lastCleanupAt: z.string().datetime().optional(),

  /** Quotes cleaned up in last cleanup */
  lastCleanupCount: z.number().optional(),
});

export type StorageStats = z.infer<typeof StorageStatsSchema>;

// ============================================
// Rate Limit Entry
// ============================================

export const RateLimitEntrySchema = z.object({
  /** Number of requests in current window */
  count: z.number(),

  /** Window start timestamp */
  windowStart: z.string().datetime(),

  /** Window end timestamp */
  windowEnd: z.string().datetime(),
});

export type RateLimitEntry = z.infer<typeof RateLimitEntrySchema>;

// ============================================
// Approval Decision
// ============================================

export const ApprovalDecisionSchema = z.object({
  /** Whether the quote is approved */
  approved: z.boolean(),

  /** Whether the quote is starred (high-scoring) */
  starred: z.boolean(),

  /** Reason for the decision */
  reason: z.string(),

  /** The deciding factors */
  factors: z.object({
    averageScore: z.number(),
    totalScore: z.number(),
    minJudgeScore: z.number(),
    maxJudgeScore: z.number(),
  }),
});

export type ApprovalDecision = z.infer<typeof ApprovalDecisionSchema>;

// ============================================
// Helper to calculate size of stored quote
// ============================================

export function calculateQuoteSize(quote: StoredQuote): number {
  // Approximate JSON size in bytes
  return Buffer.byteLength(JSON.stringify(quote), "utf8");
}

// ============================================
// Helper to create a stored quote
// ============================================

export function createStoredQuote(
  quote: z.infer<typeof BashQuoteSchema>,
  votes: z.infer<typeof VoteSchema>[],
  topic: string,
  personas: string[],
  status: QuoteStatus = "pending"
): StoredQuote {
  const now = new Date().toISOString();
  const totalScore = votes.reduce((sum, v) => sum + v.score, 0);
  const averageScore = votes.length > 0 ? totalScore / votes.length : 0;

  const stored: StoredQuote = {
    quote,
    status,
    votes,
    totalScore,
    averageScore,
    topic,
    personas,
    createdAt: now,
    lastAccessedAt: now,
    accessCount: 0,
  };

  stored.sizeBytes = calculateQuoteSize(stored);

  return stored;
}
