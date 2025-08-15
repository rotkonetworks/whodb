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
  search: (query: string, limit?: number, options?: SearchOptions) => Promise<SearchResults>;
}

export interface SearchOptions {
  filterFields?: string[];
  outputFields?: string[];
  v2Request?: boolean;
}

interface ErrorResponse {
  type: 'error';
  message: string;
}

const SEARCH_2_SUPPORTED_FIELDS: Record<string, string> = {
  discord: 'Discord',
  display: 'Display',
  email: 'Email',
  matrix: 'Matrix',
  twitter: 'Twitter',
  github: 'Github',
  legal: 'Legal',
  web: 'Web',
  timeline: 'Timeline',
  // pgp_fingerprint: 'PGPFingerprint', // Commented out in original
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

  const search = useCallback(
    async (
      query: string,
      limit: number = 5,
      options: SearchOptions = {}
    ): Promise<SearchResults> => {
      const {
        v2Request = false,
        filterFields = ['Display'],
        outputFields = Object.keys(SEARCH_2_SUPPORTED_FIELDS),
      } = options;

      if (!webSocketInstance.isConnected) {
        throw new Error('WebSocket is not connected');
      }

      const searchOutputs = outputFields
        .map(field => SEARCH_2_SUPPORTED_FIELDS[field])
        .filter(field => field !== undefined);

      const searchFields = filterFields.map(field => {
        const _query = field === 'PGPFingerprint' 
          ? toHexString(encodeUint8Array(query)) 
          : query.trim().toLowerCase()
        ;
        return {
          field: { [field]: _query },
          strict: false,
        };
      });

      // Search across all fields for autocomplete
      const searchParams = {
        network: null, // Search all networks
        outputs: searchOutputs,
        filters: v2Request
          ? {
            fields: searchFields,
            result_size: limit,
          }
          : searchFields,
      };

      const message = {
        type: 'SearchRegistration',
        payload: searchParams,
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

        // Retry with v2Request if it was a parse error and not already using v2
        const isParseError = error instanceof Error && error.message.startsWith('Failed to parse message');
        if (!v2Request && isParseError) {
          console.log('Retrying search with v2Request');
          return search(query, limit, {
            ...options,
            v2Request: true,
          });
        }

        throw error;
      }
    },
    [webSocketInstance]
  );

  return {
    isConnected: webSocketInstance.isConnected,
    error: webSocketInstance.error,
    loading: webSocketInstance.loading,
    connect: webSocketInstance.connect,
    disconnect: webSocketInstance.disconnect,
    search,
  };
};
