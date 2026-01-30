import Redis from "ioredis";
import { config } from "../config.js";
import {
  StoredQuote,
  StoredQuoteSchema,
  SessionContext,
  SessionContextSchema,
  StorageStats,
  QuoteStatus,
  calculateQuoteSize,
} from "./types.js";
import { log } from "../utils/logger.js";

/**
 * Redis Storage Adapter
 *
 * Manages storage of quotes with memory limits and TTL management.
 */
export class RedisStorageAdapter {
  private redis: Redis;
  private readonly prefix: string;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(redisUrl?: string) {
    this.redis = new Redis(redisUrl || config.redis.url, {
      maxRetriesPerRequest: config.redis.retryStrategy.maxRetries,
      retryStrategy: (times) => {
        if (times > config.redis.retryStrategy.maxRetries) {
          return null;
        }
        return config.redis.retryStrategy.retryDelayMs;
      },
      lazyConnect: true,
    });

    this.prefix = config.redis.keyPrefix;

    // Handle connection errors
    this.redis.on("error", (err) => {
      log.redis.error(err.message);
    });
  }

  // ============================================
  // Connection Management
  // ============================================

  async connect(): Promise<void> {
    await this.redis.connect();
    log.redis.connected();

    // Start cleanup timer
    this.startCleanupTimer();
  }

  async disconnect(): Promise<void> {
    this.stopCleanupTimer();
    await this.redis.quit();
    log.redis.disconnected();
  }

  // ============================================
  // Key Helpers
  // ============================================

  private key(type: keyof typeof config.redis.keys, id: string): string {
    return `${this.prefix}${config.redis.keys[type]}${id}`;
  }

  private keysPattern(type: keyof typeof config.redis.keys): string {
    return `${this.prefix}${config.redis.keys[type]}*`;
  }

  // ============================================
  // Quote Storage
  // ============================================

  /**
   * Save a quote with appropriate TTL based on status
   */
  async saveQuote(quote: StoredQuote): Promise<void> {
    // Check memory before saving
    await this.enforceMemoryLimit();

    const key = this.key(quote.status as keyof typeof config.redis.keys, quote.quote.id);
    const data = JSON.stringify(quote);

    // Set TTL based on status
    let ttl: number | undefined;
    if (quote.status === "rejected") {
      ttl = quote.ttlSeconds || config.ttl.rejectedQuotesInitial;
    } else if (quote.status === "pending") {
      ttl = config.ttl.pendingQuotes;
    }

    if (ttl && ttl > 0) {
      await this.redis.setex(key, ttl, data);
    } else {
      await this.redis.set(key, data);
    }

    // Update stats
    await this.incrementStat("totalQuotesGenerated");
    if (quote.status === "approved" || quote.status === "starred") {
      await this.incrementStat("totalQuotesApproved");
    }
  }

  /**
   * Get a quote by ID and status
   */
  async getQuote(id: string, status: QuoteStatus): Promise<StoredQuote | null> {
    const key = this.key(status as keyof typeof config.redis.keys, id);
    const data = await this.redis.get(key);

    if (!data) return null;

    const quote = StoredQuoteSchema.parse(JSON.parse(data));

    // Update access metadata
    quote.lastAccessedAt = new Date().toISOString();
    quote.accessCount += 1;

    // For rejected quotes, decay the TTL
    if (status === "rejected" && quote.ttlSeconds) {
      quote.ttlSeconds = Math.max(
        config.ttl.rejectedQuotesMinimum,
        Math.floor(quote.ttlSeconds * config.ttl.rejectedDecayFactor)
      );
      // Update with new TTL
      await this.redis.setex(key, quote.ttlSeconds, JSON.stringify(quote));
    } else {
      await this.redis.set(key, JSON.stringify(quote));
    }

    return quote;
  }

  /**
   * Move a quote from one status to another
   */
  async moveQuote(
    id: string,
    fromStatus: QuoteStatus,
    toStatus: QuoteStatus,
    updates?: Partial<StoredQuote>
  ): Promise<StoredQuote | null> {
    const oldKey = this.key(fromStatus as keyof typeof config.redis.keys, id);
    const data = await this.redis.get(oldKey);

    if (!data) return null;

    const quote = StoredQuoteSchema.parse(JSON.parse(data));

    // Apply updates
    const updatedQuote: StoredQuote = {
      ...quote,
      ...updates,
      status: toStatus,
      lastAccessedAt: new Date().toISOString(),
    };

    // Set TTL for rejected quotes
    if (toStatus === "rejected") {
      updatedQuote.ttlSeconds = config.ttl.rejectedQuotesInitial;
    }

    // Update size
    updatedQuote.sizeBytes = calculateQuoteSize(updatedQuote);

    // Delete old key and save with new status
    await this.redis.del(oldKey);
    await this.saveQuote(updatedQuote);

    return updatedQuote;
  }

  /**
   * Get all quotes of a given status
   */
  async getQuotesByStatus(
    status: QuoteStatus,
    limit = 100,
    offset = 0
  ): Promise<StoredQuote[]> {
    const pattern = this.keysPattern(status as keyof typeof config.redis.keys);
    const keys = await this.redis.keys(pattern);

    const sortedKeys = keys.slice(offset, offset + limit);
    if (sortedKeys.length === 0) return [];

    const values = await this.redis.mget(...sortedKeys);
    return values
      .filter((v): v is string => v !== null)
      .map((v) => StoredQuoteSchema.parse(JSON.parse(v)));
  }

  /**
   * Get top approved quotes by score
   */
  async getTopQuotes(limit = 10): Promise<StoredQuote[]> {
    const approved = await this.getQuotesByStatus("approved", 1000);
    const starred = await this.getQuotesByStatus("starred", 1000);

    const all = [...starred, ...approved];
    return all
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, limit);
  }

  // ============================================
  // Session Context Storage
  // ============================================

  async saveSession(session: SessionContext): Promise<void> {
    const key = this.key("session", session.sessionId);
    await this.redis.setex(
      key,
      config.ttl.sessionContext,
      JSON.stringify(session)
    );
  }

  async getSession(sessionId: string): Promise<SessionContext | null> {
    const key = this.key("session", sessionId);
    const data = await this.redis.get(key);
    if (!data) return null;
    return SessionContextSchema.parse(JSON.parse(data));
  }

  async deleteSession(sessionId: string): Promise<void> {
    const key = this.key("session", sessionId);
    await this.redis.del(key);
  }

  // ============================================
  // Stats Management
  // ============================================

  private async incrementStat(stat: string, by = 1): Promise<void> {
    const key = this.key("stats", stat);
    await this.redis.incrby(key, by);
  }

  private async getStat(stat: string): Promise<number> {
    const key = this.key("stats", stat);
    const value = await this.redis.get(key);
    return value ? parseInt(value, 10) : 0;
  }

  async getStats(): Promise<StorageStats> {
    // Get counts for each status
    const approvedKeys = await this.redis.keys(this.keysPattern("approved"));
    const rejectedKeys = await this.redis.keys(this.keysPattern("rejected"));
    const pendingKeys = await this.redis.keys(this.keysPattern("pending"));
    const sessionKeys = await this.redis.keys(this.keysPattern("session"));

    // Calculate memory usage
    const memoryInfo = await this.redis.info("memory");
    const memoryMatch = memoryInfo.match(/used_memory:(\d+)/);
    const memoryUsedBytes = memoryMatch ? parseInt(memoryMatch[1], 10) : 0;

    // Get cumulative stats
    const totalQuotesGenerated = await this.getStat("totalQuotesGenerated");
    const totalQuotesApproved = await this.getStat("totalQuotesApproved");

    // Get last cleanup info
    const lastCleanupAt = await this.redis.get(this.key("stats", "lastCleanupAt"));
    const lastCleanupCountStr = await this.redis.get(this.key("stats", "lastCleanupCount"));

    return {
      memoryUsedBytes,
      memoryUsedPercent: (memoryUsedBytes / config.memory.maxBytes) * 100,
      approvedCount: approvedKeys.length,
      rejectedCount: rejectedKeys.length,
      pendingCount: pendingKeys.length,
      activeSessionCount: sessionKeys.length,
      totalQuotesGenerated,
      totalQuotesApproved,
      approvalRate:
        totalQuotesGenerated > 0
          ? (totalQuotesApproved / totalQuotesGenerated) * 100
          : 0,
      lastCleanupAt: lastCleanupAt || undefined,
      lastCleanupCount: lastCleanupCountStr
        ? parseInt(lastCleanupCountStr, 10)
        : undefined,
    };
  }

  // ============================================
  // Memory Management
  // ============================================

  /**
   * Get current memory usage
   */
  async getMemoryUsage(): Promise<{ bytes: number; percent: number }> {
    const info = await this.redis.info("memory");
    const match = info.match(/used_memory:(\d+)/);
    const bytes = match ? parseInt(match[1], 10) : 0;
    return {
      bytes,
      percent: (bytes / config.memory.maxBytes) * 100,
    };
  }

  /**
   * Check if memory is over limit
   */
  async isOverMemoryLimit(): Promise<boolean> {
    const { percent } = await this.getMemoryUsage();
    return percent >= config.memory.criticalThreshold * 100;
  }

  /**
   * Check if memory is in warning zone
   */
  async isMemoryWarning(): Promise<boolean> {
    const { percent } = await this.getMemoryUsage();
    return percent >= config.memory.warningThreshold * 100;
  }

  /**
   * Enforce memory limit by cleaning up old data
   */
  async enforceMemoryLimit(): Promise<number> {
    const { percent } = await this.getMemoryUsage();

    if (percent < config.memory.warningThreshold * 100) {
      return 0; // No cleanup needed
    }

    log.memory.warning(`Memory at ${percent.toFixed(1)}%, starting cleanup...`);

    let cleanedCount = 0;
    const targetPercent = config.memory.cleanupTarget * 100;

    // Cleanup in priority order: rejected, pending, session
    for (const type of config.cleanup.priorityOrder) {
      const { percent: currentPercent } = await this.getMemoryUsage();
      if (currentPercent <= targetPercent) break;

      const cleaned = await this.cleanupByType(
        type as keyof typeof config.redis.keys,
        config.cleanup.batchSize
      );
      cleanedCount += cleaned;
    }

    // Update cleanup stats
    await this.redis.set(
      this.key("stats", "lastCleanupAt"),
      new Date().toISOString()
    );
    await this.redis.set(
      this.key("stats", "lastCleanupCount"),
      cleanedCount.toString()
    );

    const { bytes: afterBytes } = await this.getMemoryUsage();
    const freedMB = (afterBytes - (await this.getMemoryUsage()).bytes) / 1024 / 1024;
    log.memory.cleanup(cleanedCount, Math.abs(freedMB));
    return cleanedCount;
  }

  /**
   * Cleanup items of a specific type (oldest first)
   */
  private async cleanupByType(
    type: keyof typeof config.redis.keys,
    limit: number
  ): Promise<number> {
    const pattern = this.keysPattern(type);
    const keys = await this.redis.keys(pattern);

    if (keys.length === 0) return 0;

    // Get all items with their timestamps
    const items: { key: string; timestamp: number }[] = [];
    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        try {
          const parsed = JSON.parse(data);
          const timestamp = new Date(
            parsed.lastAccessedAt || parsed.createdAt || 0
          ).getTime();
          items.push({ key, timestamp });
        } catch {
          // Invalid data, mark for deletion
          items.push({ key, timestamp: 0 });
        }
      }
    }

    // Sort by timestamp (oldest first) and take limit
    items.sort((a, b) => a.timestamp - b.timestamp);
    const toDelete = items.slice(0, limit).map((i) => i.key);

    if (toDelete.length > 0) {
      await this.redis.del(...toDelete);
    }

    return toDelete.length;
  }

  // ============================================
  // Cleanup Timer
  // ============================================

  private startCleanupTimer(): void {
    if (this.cleanupTimer) return;

    this.cleanupTimer = setInterval(async () => {
      try {
        await this.enforceMemoryLimit();
      } catch (error) {
        log.redis.error(`Cleanup error: ${error}`);
      }
    }, config.cleanup.intervalMs);

    log.debug(`Cleanup timer started (every ${config.cleanup.intervalMs / 1000}s)`);
  }

  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
      log.debug("Cleanup timer stopped");
    }
  }

  // ============================================
  // Rate Limiting
  // ============================================

  async checkRateLimit(identifier: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetInSeconds: number;
  }> {
    const key = this.key("rateLimit", identifier);
    const now = Date.now();
    const windowMs = config.ttl.rateLimitWindow * 1000;
    const maxRequests = config.process.maxSessionsPerMinute;

    // Get current count
    const current = await this.redis.get(key);
    let count = current ? parseInt(current, 10) : 0;

    // Get TTL to determine reset time
    const ttl = await this.redis.ttl(key);
    const resetInSeconds = ttl > 0 ? ttl : config.ttl.rateLimitWindow;

    if (count >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetInSeconds,
      };
    }

    // Increment counter
    if (count === 0) {
      await this.redis.setex(key, config.ttl.rateLimitWindow, "1");
    } else {
      await this.redis.incr(key);
    }

    return {
      allowed: true,
      remaining: maxRequests - count - 1,
      resetInSeconds,
    };
  }
}

// Singleton instance
let storageInstance: RedisStorageAdapter | null = null;

export function getStorage(): RedisStorageAdapter {
  if (!storageInstance) {
    storageInstance = new RedisStorageAdapter();
  }
  return storageInstance;
}

export async function initStorage(): Promise<RedisStorageAdapter> {
  const storage = getStorage();
  await storage.connect();
  return storage;
}
