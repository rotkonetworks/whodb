import { encodeUint8Array, toHexString } from '@/utils/binary';
import { useCallback } from 'react';
import { WebSocketHookReturn } from '.';

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
  timeline?: {
    event: 'created'
      | 'verified'
      | 'discord'
      | 'display'
      | 'email'
      | 'matrix'
      | 'twitter'
      | 'github'
      | 'legal'
      | 'web'
      | 'pgp_fingerprint'
    ;
    date: Date;
  }[];
}

export type SearchResults = Array<SearchRecord>;

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

const SEARCH_SUPPORTED_FIELDS: Record<string, string> = {
  wallet_id: 'WalletID',
  discord: 'Discord',
  display: 'Display',
  email: 'Email',
  matrix: 'Matrix',
  twitter: 'Twitter',
  github: 'Github',
  legal: 'Legal',
  web: 'Web',
  pgp_fingerprint: 'PGPFingerprint',
  network: 'Network',
};
export const SEARCH_SUPPORTED_OUTPUTS = { ...SEARCH_SUPPORTED_FIELDS,
  timeline: 'Timeline',
};
export const SEARCH_SUPPORTED_FILTERS = { ...SEARCH_SUPPORTED_FIELDS,
  result_size: "result_size",
};

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
      const result = {};
      const regex = /(\w+):\s*([^:]+?)(?=\s+\w+:|\s*$)/g;

      let match;
      while ((match = regex.exec(input)) !== null) {
        const key = match[1].trim();
        const value = match[2].trim();

        console.debug("Matched query parameter:", key, value);

        if (key && value !== undefined) {
          if (Object.keys(SEARCH_SUPPORTED_FILTERS).includes(key)) {
            result[key] = value;
          }
        }
      }

      return result;
    }

    const pairs = parseSearchString(query);

    return {
      network: pairs["network"],
      outputs: Object.keys(SEARCH_SUPPORTED_OUTPUTS)
        .map(key => SEARCH_SUPPORTED_OUTPUTS[key])
      ,
      filters: {
        fields: Object.keys(SEARCH_SUPPORTED_FILTERS)
          .filter(key => pairs[key] !== undefined)
          // These two don't get mapped into the searchParams.filters.fields, as usual.
          .filter(key => ['network', 'result_size'].includes(key) === false)
          .map(key => ({
            field: { [SEARCH_SUPPORTED_FILTERS[key]]: "%" + pairs[key] + "%" },
            strict: false, // Default to not strict for now
          })),
        result_size: pairs["result_size"] ? parseInt(pairs["result_size"]) : 8,
      }
    }
  }

  const search = useCallback(async (
    query: string,
    limit: number,
  ): Promise<SearchResults> => {
    /* if (!webSocketInstance.isConnected) {
      throw new Error('WebSocket is not connected');
    } */

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
        return response as SearchResults;
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
