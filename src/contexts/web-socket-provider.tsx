import { useTriggerLog } from "@/hooks/use-trigger-log";
import { SearchOptions, useSearchWebSocket } from "@/hooks/websocket/search";
import { useWebSocket, WebSocketHookReturn } from "@/hooks/websocket";
import { SS58String } from "polkadot-api";
import { createContext, useCallback, useContext, useState } from "react";

const WebSocketContext = createContext<WebSocketHookReturn | undefined>(undefined);

export const WebSocketProvider = ({ children, url }: {
  children: React.ReactNode;
  url: string;
}) => {
  const webSocket = useWebSocket({ url, autoConnect: true, });

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

export type ProfileResults = Array<{
  id: SS58String;
  walletAddress: SS58String;
  network: string;
  discord?: string;
  displayName?: string;
  email?: string;
  matrix?: string;
  twitter?: string;
  github?: string;
  legal?: string;
  web?: string;
  pgp_fingerprint?: string;
  avatar?: string;
  verified: boolean;
}>;
const SearchContext = createContext<{
  webSocket: WebSocketHookReturn | undefined;
  search: (query: string, limit?: number, options?: SearchOptions) => Promise<ProfileResults>;
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
    options?: SearchOptions,
  ): Promise<ProfileResults> => {
    if (!webSocket) return [];

    // Search across all networks seamlessly
    const filtered = (await searchWebSocket.search(query, limit, options))
      .map((profile) => ({
        id: profile.wallet_id,
        discord: profile.discord,
        displayName: profile.display_name,
        email: profile.email,
        matrix: profile.matrix,
        twitter: profile.twitter,
        github: profile.github,
        legal: profile.legal,
        web: profile.web,
        pgp_fingerprint: profile.pgp_fingerprint,
        walletAddress: profile.wallet_id,
        //avatar: profile.image || "/placeholder.svg", // TODO Add circle letter avatar fallback
        network: profile.network,
        verified: profile.timeline?.some(event => event.event === 'verified') || false,
      }))
    setResults(filtered);

    return filtered;
  }, [searchWebSocket]);

  return (
    <SearchContext.Provider value={{ webSocket, search, results }}>
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
