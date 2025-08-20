import { useCallback } from 'react';
import { WebSocketHookReturn } from '.';
import { TimelineEventRecord } from '@/types/timeline';
import { IdentityInfo } from '@/types/Identity';
import { FullProfile } from '@/types/profile';

interface SearchRecord {
  wallet_id: string;
  network: string;
  discord?: string;
  display_name?: string;
  email?: string;
  matrix?: string;
  twitter?: string;
  github?: string;
  legal?: string;
  web?: string;
  pgp_fingerprint?: string;
  timeline?: TimelineEventRecord[];
}

type SearchResults = Array<SearchRecord>;

export interface SearchWebSocketConfig {
  url: string;
  autoConnect?: boolean;
}

export interface SearchWebSocketReturn extends Pick<WebSocketHookReturn, 'isConnected' | 'error' | 'loading' | 'connect' | 'disconnect'> {
  search: (query: string, limit?: number) => Promise<SearchResults>;
}

interface ErrorResponse {
  type: 'error';
  message: string;
}

type SearchSupportedFields = Partial<Record<keyof IdentityInfo | 'wallet_id' | 'network', string>>;
// Keys are an allowed subset of IdentityInfo plus wallet_id and network.
const SEARCH_SUPPORTED_FIELDS: SearchSupportedFields = {
  wallet_id: 'WalletID',
  network: 'Network',
  discord: 'Discord',
  display: 'Display',
  email: 'Email',
  github: 'Github',
  legal: 'Legal',
  matrix: 'Matrix',
  twitter: 'Twitter',
  pgp_fingerprint: 'PGPFingerprint',
  web: 'Web',
} as const;

type SearchOutputFields = Partial<Record<keyof SearchSupportedFields | 'timeline', string>>;
export const SEARCH_OUTPUT_FIELDS: SearchOutputFields = {
  ...SEARCH_SUPPORTED_FIELDS,
  timeline: 'Timeline',
  //image: 'Image'  // TODO Add support for image when API makes it available.
} as const;

type SearchFilterCriteria = Partial<Record<keyof SearchSupportedFields | 'wallet_id' | 'result_size', string>>;
export const SEARCH_FILTER_CRITERIA_KEYS = {
  ...SEARCH_SUPPORTED_FIELDS,
  wallet_id: 'AccountId32',
  result_size: "result_size",
} as const;

/**
 * Search WebSocket hook that uses the main WebSocket for search functionality.
 * Can be used with dependency injection to share a WebSocket instance.
 */
export const useSearchWebSocket = (
  webSocketInstance?: WebSocketHookReturn
): SearchWebSocketReturn => {
  // Use provided WebSocket instance or create a new one
  if (!webSocketInstance) {
    throw new Error('WebSocket instance is required');
  }

  const constructSearchParameters = (query: string, limit?: number) => {
    console.debug('Constructing search parameters for query:', query);
    const parseSearchString = (input: string): Record<string, string> => {
      const result: SearchFilterCriteria = {};
      const regex = /(\w+):\s*([^:]+?)(?=\s+\w+:|\s*$)/g;

      let match;
      while ((match = regex.exec(input)) !== null) {
        const key = match[1].trim() as keyof SearchFilterCriteria;
        const value = match[2].trim();

        console.debug("Matched query parameter:", key, value);

        if (key && value !== undefined) {
          if (Object.keys(SEARCH_FILTER_CRITERIA_KEYS).includes(key)) {
            result[key] = value;
          }
        }
      }

      return result;
    }

    const pairs = parseSearchString(query);

    return {
      network: pairs["network"],
      outputs: Object.values(SEARCH_OUTPUT_FIELDS)
        .filter((v): v is string => typeof v === 'string')
      ,
      filters: {
        fields: (Object.values(SEARCH_FILTER_CRITERIA_KEYS) as Array<keyof SearchFilterCriteria>)
          .filter(([key]) => pairs[key] !== undefined)
          // These two don't get mapped into the searchParams.filters.fields, as usual.
          .filter(([key]) => ['network', 'result_size'].includes(key) === false)
          .map(([key, value]) => ({
            field: { [value as string]: `${pairs[key]}` },
            strict: false, // Default to not strict for now
          })),
        result_size: pairs["result_size"] ? parseInt(pairs["result_size"]) : limit || 10,
      }
    }
  }

  const search = useCallback(async (
    query: string,
    limit?: number,
  ): Promise<Array<FullProfile>> => {
    // Search across all fields for autocomplete
    const message = {
      type: 'SearchRegistration',
      payload: constructSearchParameters(query, limit),
    };

    console.log('Sending search query:', message);

    try {
      const response = await webSocketInstance.sendMessage<SearchResults | ErrorResponse>(message);

      if ((response as ErrorResponse).type === 'error') {
        const errorResponse = response as ErrorResponse;
        console.error('Search error:', errorResponse.message);
        throw new Error(errorResponse.message);
      }

      if (Array.isArray(response)) {
        return (response as SearchResults).map((profile) => Object.fromEntries(
          Object.entries(profile)
            .filter(([, value]) => ![undefined, null, "NULL"].includes(value))
            .map(([key, value]) => [key, value])
        ));
      }

      throw new Error('Invalid search response format');
    } catch (error) {
      console.error('Search failed:', error);

      throw error;
    }
  }, [webSocketInstance]);

  return {
    isConnected: webSocketInstance.isConnected,
    error: webSocketInstance.error,
    loading: webSocketInstance.loading,
    connect: webSocketInstance.connect,
    disconnect: webSocketInstance.disconnect,
    search,
  };
};
