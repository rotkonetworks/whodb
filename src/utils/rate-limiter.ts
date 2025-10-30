/**
 * Client-side rate limiter for UX optimization
 *
 * WARNING: This is NOT a security measure. Client-side limits can be bypassed.
 * Real rate limiting MUST be done:
 * 1. Server-side (API endpoint limits)
 * 2. Blockchain level (nonce, gas limits)
 * 3. Registrar validation
 *
 * This limiter serves UX purposes:
 * - Prevents accidental double-submissions
 * - Provides instant feedback
 * - Reduces unnecessary blockchain calls
 * - Improves user experience
 */
export class RateLimiter {
  private timestamps: Map<string, number[]> = new Map()

  /**
   * Check if action is allowed based on rate limit
   * @param key - Unique identifier for the action (e.g., wallet address)
   * @param maxAttempts - Maximum number of attempts allowed
   * @param windowMs - Time window in milliseconds
   * @returns true if allowed, false if rate limited
   */
  isAllowed(key: string, maxAttempts: number, windowMs: number): boolean {
    const now = Date.now()
    const attempts = this.timestamps.get(key) || []

    // Remove timestamps outside the window
    const recentAttempts = attempts.filter(timestamp => now - timestamp < windowMs)

    // Check if limit exceeded
    if (recentAttempts.length >= maxAttempts) {
      return false
    }

    // Record this attempt
    recentAttempts.push(now)
    this.timestamps.set(key, recentAttempts)

    return true
  }

  /**
   * Get remaining time until next attempt is allowed
   * @param key - Unique identifier for the action
   * @param maxAttempts - Maximum number of attempts allowed
   * @param windowMs - Time window in milliseconds
   * @returns milliseconds until next attempt, or 0 if allowed now
   */
  getTimeUntilAllowed(key: string, maxAttempts: number, windowMs: number): number {
    const now = Date.now()
    const attempts = this.timestamps.get(key) || []
    const recentAttempts = attempts.filter(timestamp => now - timestamp < windowMs)

    if (recentAttempts.length < maxAttempts) {
      return 0
    }

    // Time until oldest attempt expires
    const oldestAttempt = Math.min(...recentAttempts)
    return windowMs - (now - oldestAttempt)
  }

  /**
   * Clear rate limit for a specific key
   */
  reset(key: string): void {
    this.timestamps.delete(key)
  }

  /**
   * Clear all rate limits
   */
  resetAll(): void {
    this.timestamps.clear()
  }
}

// Global instance for registration transactions
export const registrationRateLimiter = new RateLimiter()

// Constants for rate limiting
export const RATE_LIMITS = {
  REGISTRATION: {
    MAX_ATTEMPTS: 5,
    WINDOW_MS: 60000, // 1 minute
  },
  VERIFICATION: {
    MAX_ATTEMPTS: 10,
    WINDOW_MS: 300000, // 5 minutes
  },
} as const
