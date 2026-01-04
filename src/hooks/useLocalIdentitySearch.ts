import { useState, useCallback, useEffect, useRef } from 'react';
import {
  searchLocalIdentities,
  fetchAndCacheIdentity,
  syncAllIdentities,
  getCacheStats,
  clearCache,
  CachedIdentity,
  getCachedIdentity,
  ScoredIdentity,
} from '@/lib/identity-cache';
import { SS58String } from 'polkadot-api';
import { FullProfile } from '@/types/profile';
import { getChainKeyFromNetwork } from '@/polkadot-api/chain-config';

export interface HybridSearchResult extends CachedIdentity {
  score: number;
  source: 'local' | 'websocket' | 'chain';
  isVerifiedFromChain: boolean;
  isVerifying: boolean;
}

interface UseLocalIdentitySearchResult {
  // Local search with scoring
  search: (query: string, network?: string, limit?: number) => Promise<ScoredIdentity[]>;
  results: ScoredIdentity[];
  isSearching: boolean;

  // Hybrid search: Local first (instant), merge with WebSocket, verify from chain
  hybridSearch: (
    query: string,
    wsSearchFn: (query: string, limit?: number) => Promise<FullProfile[]>,
    options?: { network?: string; limit?: number; verifyFromChain?: boolean }
  ) => Promise<HybridSearchResult[]>;
  hybridResults: HybridSearchResult[];

  // Single identity fetch (verifies from chain)
  fetchIdentity: (address: SS58String, chainId: string) => Promise<CachedIdentity | null>;

  // Sync all identities from chain
  syncNetwork: (chainId: string) => Promise<number>;
  isSyncing: boolean;
  syncProgress: { current: number; total: number } | null;

  // Cache info
  cacheStats: { count: number; networks: string[] } | null;
  refreshStats: () => Promise<void>;
  clearAllCache: () => Promise<void>;
}

export function useLocalIdentitySearch(): UseLocalIdentitySearchResult {
  const [results, setResults] = useState<ScoredIdentity[]>([]);
  const [hybridResults, setHybridResults] = useState<HybridSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number } | null>(null);
  const [cacheStats, setCacheStats] = useState<{ count: number; networks: string[] } | null>(null);
  const verifyingRef = useRef<Set<string>>(new Set());

  const refreshStats = useCallback(async () => {
    try {
      const stats = await getCacheStats();
      setCacheStats(stats);
    } catch (err) {
      console.error('Failed to get cache stats:', err);
    }
  }, []);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  // Pure local search with ranking
  const search = useCallback(async (query: string, network?: string, limit = 50): Promise<ScoredIdentity[]> => {
    if (!query || query.length < 2) {
      setResults([]);
      return [];
    }

    setIsSearching(true);
    try {
      const localResults = await searchLocalIdentities(query, network, limit);
      setResults(localResults);
      return localResults;
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Hybrid search: Local first (instant), then WebSocket, merge & dedupe, verify from chain
  const hybridSearch = useCallback(async (
    query: string,
    wsSearchFn: (query: string, limit?: number) => Promise<FullProfile[]>,
    options: { network?: string; limit?: number; verifyFromChain?: boolean } = {}
  ): Promise<HybridSearchResult[]> => {
    const { network, limit = 20, verifyFromChain = true } = options;

    if (!query || query.length < 2) {
      setHybridResults([]);
      return [];
    }

    // 1. INSTANT: Search local cache first
    const localResults = await searchLocalIdentities(query, network, limit);
    const localHybrid: HybridSearchResult[] = localResults.map(r => ({
      ...r,
      source: 'local' as const,
      isVerifiedFromChain: true, // Local data came from chain originally
      isVerifying: false,
    }));

    // Show local results immediately
    if (localHybrid.length > 0) {
      setHybridResults(localHybrid);
    }

    // 2. FAST: Fetch from WebSocket in parallel
    let wsResults: FullProfile[] = [];
    try {
      wsResults = await wsSearchFn(query, limit);
    } catch (err) {
      console.error('WebSocket search failed:', err);
    }

    // 3. MERGE: Combine local + WS results, dedupe by address+network
    const seen = new Set<string>();
    const merged: HybridSearchResult[] = [];

    // Add local results first (higher trust)
    for (const r of localHybrid) {
      const key = `${r.address}-${r.network}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(r);
      }
    }

    // Add WebSocket results that aren't in local cache
    for (const profile of wsResults) {
      const key = `${profile.wallet_id}-${profile.network || 'unknown'}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push({
          address: profile.wallet_id,
          network: profile.network || 'unknown',
          display: profile.display || null,
          legal: profile.legal || null,
          web: profile.web || null,
          email: profile.email || null,
          twitter: profile.twitter || null,
          github: profile.github || null,
          discord: profile.discord || null,
          matrix: profile.matrix || null,
          image: profile.image || null,
          pgpFingerprint: profile.pgp_fingerprint || null,
          isVerified: profile.verified || false,
          lastUpdated: Date.now(),
          score: 50, // Default score for WS results (backend already ranked)
          source: 'websocket',
          isVerifiedFromChain: false,
          isVerifying: verifyFromChain,
        });
      }
    }

    // Sort by score (local results tend to have higher scores)
    merged.sort((a, b) => b.score - a.score);
    setHybridResults(merged.slice(0, limit));

    // 4. BACKGROUND: Verify WebSocket results from chain
    if (verifyFromChain) {
      const toVerify = merged.filter(r => r.source === 'websocket' && !r.isVerifiedFromChain);

      for (const result of toVerify) {
        const key = `${result.address}-${result.network}`;
        if (verifyingRef.current.has(key)) continue;
        verifyingRef.current.add(key);

        // Verify in background without blocking
        (async () => {
          try {
            const chainId = getChainKeyFromNetwork(result.network || 'paseo');
            if (chainId) {
              const fromChain = await fetchAndCacheIdentity(result.address as SS58String, chainId);
              if (fromChain) {
                // Update the result in place
                setHybridResults(prev => prev.map(r =>
                  r.address === result.address && r.network === result.network
                    ? { ...r, ...fromChain, source: 'chain' as const, isVerifiedFromChain: true, isVerifying: false }
                    : r
                ));
              } else {
                setHybridResults(prev => prev.map(r =>
                  r.address === result.address && r.network === result.network
                    ? { ...r, isVerifying: false }
                    : r
                ));
              }
            }
          } catch (err) {
            console.error('Chain verification failed:', err);
          } finally {
            verifyingRef.current.delete(key);
          }
        })();
      }
    }

    return merged.slice(0, limit);
  }, []);

  const fetchIdentity = useCallback(async (address: SS58String, chainId: string): Promise<CachedIdentity | null> => {
    return fetchAndCacheIdentity(address, chainId);
  }, []);

  const syncNetwork = useCallback(async (chainId: string): Promise<number> => {
    setIsSyncing(true);
    setSyncProgress({ current: 0, total: 0 });

    try {
      const count = await syncAllIdentities(chainId, (current, total) => {
        setSyncProgress({ current, total });
      });
      await refreshStats();
      return count;
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
    }
  }, [refreshStats]);

  const clearAllCache = useCallback(async () => {
    await clearCache();
    setResults([]);
    setHybridResults([]);
    await refreshStats();
  }, [refreshStats]);

  return {
    search,
    results,
    isSearching,
    hybridSearch,
    hybridResults,
    fetchIdentity,
    syncNetwork,
    isSyncing,
    syncProgress,
    cacheStats,
    refreshStats,
    clearAllCache,
  };
}
