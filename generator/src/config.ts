/**
 * Configuration for the quote generator system
 *
 * Defines limits, TTLs, and guardrails for resource management.
 */

export const config = {
  // ============================================
  // Memory Limits
  // ============================================
  memory: {
    /** Maximum memory usage in bytes (250MB) */
    maxBytes: 250 * 1024 * 1024, // 250MB

    /** Warning threshold as percentage of max (80%) */
    warningThreshold: 0.8,

    /** Critical threshold - triggers aggressive cleanup (95%) */
    criticalThreshold: 0.95,

    /** Target memory after cleanup (70% of max) */
    cleanupTarget: 0.7,
  },

  // ============================================
  // Process Limits
  // ============================================
  process: {
    /** Maximum concurrent improv sessions */
    maxConcurrentSessions: 5,

    /** Maximum conversation rounds per session */
    maxRoundsPerSession: 10,

    /** Maximum personas per conversation */
    maxPersonasPerConversation: 5,

    /** Rate limit: max sessions per minute */
    maxSessionsPerMinute: 20,

    /** Timeout for a single session (ms) */
    sessionTimeoutMs: 60_000, // 60 seconds
  },

  // ============================================
  // Storage TTL (Time To Live)
  // ============================================
  ttl: {
    /** Approved quotes - kept indefinitely (0 = no expiry) */
    approvedQuotes: 0,

    /** Rejected quotes - initial TTL in seconds (24 hours) */
    rejectedQuotesInitial: 24 * 60 * 60, // 24 hours

    /** Rejected quotes - minimum TTL before deletion (1 hour) */
    rejectedQuotesMinimum: 60 * 60, // 1 hour

    /** TTL decay factor for rejected quotes on each access */
    rejectedDecayFactor: 0.8, // Reduce TTL by 20% each time

    /** Pending quotes awaiting judgment (1 hour) */
    pendingQuotes: 60 * 60, // 1 hour

    /** Session context data (30 minutes) */
    sessionContext: 30 * 60, // 30 minutes

    /** Rate limit windows (1 minute) */
    rateLimitWindow: 60, // 1 minute
  },

  // ============================================
  // Approval Thresholds
  // ============================================
  approval: {
    /** Minimum average score for auto-approval (out of 10) */
    minAverageScore: 6.0,

    /** Minimum total score for auto-approval */
    minTotalScore: 18, // 3 judges * 6 average

    /** Any single judge score below this = auto-reject */
    minSingleJudgeScore: 3,

    /** Score above which quote is "starred" / highlighted */
    starredThreshold: 8.0,
  },

  // ============================================
  // Redis Configuration
  // ============================================
  redis: {
    /** Redis connection URL (from env or default) */
    url: process.env.REDIS_URL || "redis://localhost:6379",

    /** Key prefix for all storage */
    keyPrefix: "gptbash:",

    /** Key prefixes for different data types */
    keys: {
      approved: "approved:",
      rejected: "rejected:",
      pending: "pending:",
      session: "session:",
      stats: "stats:",
      rateLimit: "ratelimit:",
    },

    /** Connection retry settings */
    retryStrategy: {
      maxRetries: 3,
      retryDelayMs: 1000,
    },
  },

  // ============================================
  // Cleanup Settings
  // ============================================
  cleanup: {
    /** How often to run cleanup (ms) */
    intervalMs: 5 * 60 * 1000, // 5 minutes

    /** Batch size for cleanup operations */
    batchSize: 100,

    /** Maximum rejected quotes to keep */
    maxRejectedQuotes: 1000,

    /** When over memory limit, remove oldest rejected first */
    priorityOrder: ["rejected", "pending", "session"] as const,
  },
};

// Type exports
export type Config = typeof config;
export type MemoryConfig = typeof config.memory;
export type ProcessConfig = typeof config.process;
export type TTLConfig = typeof config.ttl;
export type ApprovalConfig = typeof config.approval;
export type RedisConfig = typeof config.redis;
export type CleanupConfig = typeof config.cleanup;
