import { Timer } from '@matrixai/timer';
import * as rateLimiterErrors from './errors';

/**
 * Internal data structure used to track a buckets' information.
 * Internal use only so explicitly not exported.
 */
type TokenBucket = {
  creationTimestamp: number;
  tokens: number;
  lastRefillTimestamp: number;
  capacity: number;
  refillRatePerSecond: number;
};

class RateLimiter {
  protected tokenBuckets: Map<string, TokenBucket>;
  protected expirationTimers: Map<string, Timer>;
  protected refillTimer: Timer | undefined;

  constructor(
    protected defaultTTL: number = 60000,
    protected defaultCapacity: number = 100,
    protected defaultRate: number = 100,
    protected defaultConsume: number = 1,
  ) {
    // Default TTL 1 minute
    this.tokenBuckets = new Map();
    this.expirationTimers = new Map();
  }

  /**
   * Starts the Refill interval timer
   */
  public startRefillInterval(): void {
    if (this.refillTimer != null) return;
    const handler = () => {
      this.refill();
      this.refillTimer = new Timer({
        handler,
        delay: 1000,
      });
    };
    this.refillTimer = new Timer({
      handler,
      delay: 1000,
    });
  }

  /**
   * Stops the Refill interval timer
   */
  public stopRefillInterval(): void {
    if (this.refillTimer != null) {
      this.refillTimer.cancel();
      delete this.refillTimer;
    }
  }

  /**
   * Refills a second worth of tokens defined by the `refillRatePerSecond`.
   */
  public refill(): void {
    for (const [, bucket] of this.tokenBuckets) {
      bucket.tokens += bucket.refillRatePerSecond;
      if (bucket.tokens > bucket.capacity) bucket.tokens = bucket.capacity;
      bucket.lastRefillTimestamp = performance.now();
    }
  }

  /**
   * Consumes an amount of tokens for a given bucket. Will return true if the tokens were available to be consumed.
   * Otherwise, returns false if there were insufficient tokens.
   * @param key - Key for the given bucket.
   * @param tokensToConsume - Number of tokens to consume.
   * @returns True if there were sufficient tokens that were consumed. False otherwise with no tokens consumed.
   */
  public consume(
    key: string,
    tokensToConsume: number = this.defaultConsume,
  ): boolean {
    // Scaled default value for example
    const bucket = this.getBucket(key);
    if (tokensToConsume <= 0) {
      throw new rateLimiterErrors.ErrorRateLimiterInvalidTokens();
    }
    // Refreshing TTL
    this.expirationTimers.get(key)?.refresh();
    if (bucket.tokens < tokensToConsume) return false;
    bucket.tokens -= tokensToConsume;
    return true;
  }

  /**
   * Gets the available tokens for a given bucket.
   * @param key - Key for the given bucket.
   */
  public tokens(key: string): number {
    return this.getBucket(key).tokens;
  }

  /**
   * Clears all existing `TokenBuckets` .
   */
  public clearBuckets(): void {
    // Clear timers
    for (const [, expirationTimer] of this.expirationTimers) {
      expirationTimer.cancel();
    }
    this.expirationTimers.clear();
    // Clear buckets
    this.tokenBuckets.clear();
  }

  /**
   * Stops refreshing and clears all existing `TokenBucket`s
   */
  public stop(): void {
    this.stopRefillInterval();
    this.clearBuckets();
  }

  protected scheduleExpiration(key: string, ttl: number): void {
    const timer = new Timer({
      handler: () => {
        this.tokenBuckets.delete(key);
        this.expirationTimers.delete(key);
      },
      delay: ttl,
    });
    this.expirationTimers.set(key, timer);
  }

  protected getBucket(key: string, ttl?: number): TokenBucket {
    let bucket = this.tokenBuckets.get(key);
    if (!bucket) {
      bucket = {
        capacity: this.defaultCapacity,
        creationTimestamp: performance.now(),
        lastRefillTimestamp: performance.now(),
        refillRatePerSecond: this.defaultRate,
        tokens: this.defaultCapacity,
      };
      this.tokenBuckets.set(key, bucket);
      this.scheduleExpiration(key, ttl || this.defaultTTL);
    }
    return bucket;
  }
}

export default RateLimiter;
