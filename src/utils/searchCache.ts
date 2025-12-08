/**
 * High-performance search cache with LRU eviction and request deduplication
 * Designed for Google-like instant search experience
 */

import { FullProfile } from '@/types/profile'

interface CacheEntry {
  results: FullProfile[]
  timestamp: number
  query: string
}

interface PendingRequest {
  promise: Promise<FullProfile[]>
  timestamp: number
}

const MAX_CACHE_SIZE = 200
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes for search results
const PENDING_TIMEOUT_MS = 30 * 1000 // 30 seconds for pending requests

class SearchCache {
  private cache = new Map<string, CacheEntry>()
  private pendingRequests = new Map<string, PendingRequest>()
  private accessOrder: string[] = []

  /**
   * Normalize query for consistent cache keys
   */
  private normalizeKey(query: string | object): string {
    if (typeof query === 'string') {
      return query.toLowerCase().trim()
    }
    // For object queries, stringify deterministically
    return JSON.stringify(query)
  }

  /**
   * Get cached results if available and not expired
   */
  get(query: string | object): FullProfile[] | null {
    const key = this.normalizeKey(query)
    const entry = this.cache.get(key)

    if (!entry) return null

    // Check if expired
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      this.cache.delete(key)
      this.removeFromAccessOrder(key)
      return null
    }

    // Update access order for LRU
    this.updateAccessOrder(key)

    return entry.results
  }

  /**
   * Store search results in cache
   */
  set(query: string | object, results: FullProfile[]): void {
    const key = this.normalizeKey(query)

    // Evict oldest entries if cache is full
    while (this.cache.size >= MAX_CACHE_SIZE) {
      const oldest = this.accessOrder.shift()
      if (oldest) {
        this.cache.delete(oldest)
      }
    }

    this.cache.set(key, {
      results,
      timestamp: Date.now(),
      query: key
    })

    this.updateAccessOrder(key)
  }

  /**
   * Check if a request is already in-flight for this query
   */
  getPendingRequest(query: string | object): Promise<FullProfile[]> | null {
    const key = this.normalizeKey(query)
    const pending = this.pendingRequests.get(key)

    if (!pending) return null

    // Check if pending request has timed out
    if (Date.now() - pending.timestamp > PENDING_TIMEOUT_MS) {
      this.pendingRequests.delete(key)
      return null
    }

    return pending.promise
  }

  /**
   * Register a pending request to prevent duplicate calls
   */
  setPendingRequest(query: string | object, promise: Promise<FullProfile[]>): void {
    const key = this.normalizeKey(query)
    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now()
    })

    // Clean up when request completes
    promise.finally(() => {
      this.pendingRequests.delete(key)
    })
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.cache.clear()
    this.pendingRequests.clear()
    this.accessOrder = []
  }

  /**
   * Get cache statistics for debugging
   */
  getStats(): { cacheSize: number; pendingRequests: number; oldestEntry: number | null } {
    let oldestTimestamp: number | null = null
    for (const entry of this.cache.values()) {
      if (!oldestTimestamp || entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp
      }
    }

    return {
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      oldestEntry: oldestTimestamp ? Date.now() - oldestTimestamp : null
    }
  }

  private updateAccessOrder(key: string): void {
    this.removeFromAccessOrder(key)
    this.accessOrder.push(key)
  }

  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key)
    if (index > -1) {
      this.accessOrder.splice(index, 1)
    }
  }
}

// Singleton instance for app-wide caching
export const searchCache = new SearchCache()

/**
 * Wrapper function for cached search
 * Use this instead of direct search calls for automatic caching
 */
export async function cachedSearch(
  query: string | object,
  searchFn: () => Promise<FullProfile[]>
): Promise<FullProfile[]> {
  // 1. Check cache first (instant return)
  const cached = searchCache.get(query)
  if (cached) {
    return cached
  }

  // 2. Check if request already in-flight (deduplication)
  const pending = searchCache.getPendingRequest(query)
  if (pending) {
    return pending
  }

  // 3. Make new request
  const promise = searchFn().then(results => {
    // Cache successful results
    searchCache.set(query, results)
    return results
  })

  // Register as pending to prevent duplicates
  searchCache.setPendingRequest(query, promise)

  return promise
}
