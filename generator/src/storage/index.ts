/**
 * Storage Module Index
 *
 * Exports storage types, adapter, and utilities.
 */

// Types (values)
export {
  QuoteStatusSchema,
  StoredQuoteSchema,
  SessionContextSchema,
  StorageStatsSchema,
  RateLimitEntrySchema,
  ApprovalDecisionSchema,
  calculateQuoteSize,
  createStoredQuote,
} from "./types.js";

// Types (type aliases)
export type {
  QuoteStatus,
  StoredQuote,
  SessionContext,
  StorageStats,
  RateLimitEntry,
  ApprovalDecision,
} from "./types.js";

// Redis Adapter
export {
  RedisStorageAdapter,
  getStorage,
  initStorage,
} from "./redis-adapter.js";
