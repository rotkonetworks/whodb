import { useTriggerLog } from "@/hooks/use-trigger-log";
import { useSearchWebSocket } from "@/hooks/websocket/search";
import { useWebSocket, WebSocketHookReturn } from "@/hooks/websocket";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { FullProfile } from "@/types/profile";
import { cachedSearch } from "@/utils/searchCache";

const WebSocketContext = createContext<WebSocketHookReturn | undefined>(undefined);

export const WebSocketProvider = ({ children, url, autoConnect = true }: {
  children: React.ReactNode;
  url: string;
  autoConnect?: boolean;
}) => {
  const webSocket = useWebSocket({
    url,
    autoConnect,
    maxReconnectAttempts: 3,
  });

  return (
    <WebSocketContext.Provider value={webSocket}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocketContext must be used within a WebSocketProvider");
  }
  return context;
};

export type ProfileResults = Array<FullProfile>;

const SearchContext = createContext<{
  webSocket: WebSocketHookReturn | undefined;
  search: (query: string, limit?: number, options?: any) => Promise<ProfileResults>;
  results: ProfileResults | null;
}>({
  webSocket: undefined,
  search: () => { throw new Error("Search function not implemented"); },
  results: null,
});

export const SearchProvider = ({ children }: {
  children: React.ReactNode;
}) => {
  const webSocket = useWebSocketContext();
  const searchWebSocket = useSearchWebSocket(webSocket);

  const [results, setResults] = useState<ProfileResults | null>(null);

  const search = useCallback(async (
    query: string,
    limit?: number,
  ): Promise<ProfileResults> => {
    // Create a cache key that includes the limit
    const cacheKey = typeof query === 'string'
      ? `${query}::${limit || 100}`
      : JSON.stringify({ query, limit });

    // Use cached search for instant results
    const filtered = await cachedSearch(cacheKey, async () => {
      // Search across all networks seamlessly
      const searchResults = await searchWebSocket.search(query, limit);
      return searchResults.map((profile) => ({
        id: profile.wallet_id,
        wallet_id: profile.wallet_id,
        network: profile.network,
        discord: profile.discord,
        display: profile.display,
        email: profile.email,
        matrix: profile.matrix,
        twitter: profile.twitter,
        github: profile.github,
        legal: profile.legal,
        web: profile.web,
        pgp_fingerprint: profile.pgp_fingerprint,
        timeline: profile.timeline,
        verified: profile.timeline?.some(event => event.event === 'verified') || false,
      }));
    });

    setResults(filtered);
    return filtered;
  }, [searchWebSocket]);

  const value = useMemo(() => ({ webSocket, search, results }), [webSocket, search, results])

  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  );
};

export const useSearchContext = () => {
  const context = useContext(SearchContext);
  useTriggerLog(context, "SearchContext");
  if (!context) {
    throw new Error("useSearchContext must be used within a SearchProvider");
  }
  return context;
};
