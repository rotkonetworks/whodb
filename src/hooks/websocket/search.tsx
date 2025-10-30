import { useCallback } from 'react';
import { WebSocketHookReturn } from '.';
import { TimelineEventRecord } from '@/types/timeline';
import { FullProfile } from '@/types/profile';
import { CHAINS, sortByNetworkPriority } from '@/polkadot-api/chain-config';
import { logger } from '@/utils/logger';

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
  search: (query: string, limit?: number) => Promise<Array<FullProfile>>;
}

interface ErrorResponse {
  type: 'error';
  message: string;
}

type SearchSupportedFields = Record<keyof Omit<IdentityInfo, "image"> | 'wallet_id' | 'network', string>;
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

type SearchOutputFields = Record<keyof SearchSupportedFields | 'timeline', string>;
export const SEARCH_OUTPUT_FIELDS: SearchOutputFields = {
  ...SEARCH_SUPPORTED_FIELDS,
  timeline: 'Timeline',
  //image: 'Image'  // TODO Add support for image when API makes it available.
} as const;

type SearchFilterCriteria = Record<keyof SearchSupportedFields | 'wallet_id' | 'result_size', string>;
export const SEARCH_FILTER_CRITERIA_KEYS = {
  ...SEARCH_SUPPORTED_FIELDS,
  wallet_id: 'AccountId32',
  result_size: "result_size",
} as const;

type IdentityInfoFieldMapping = Record<SearchOutputFields[keyof SearchOutputFields], keyof IdentityInfo>;
export const FULL_PROFILE_IDENTIY_INFO_MAPPING: IdentityInfoFieldMapping = {
  discord: 'discord',
  display_name: 'display',
  email: 'email',
  github: 'github',
  image: "image",
  legal: 'legal',
  matrix: 'matrix',
  twitter: 'twitter',
  pgp_fingerprint: 'pgp_fingerprint',
  web: 'web',
}

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
    logger.debug('Constructing search parameters for query:', query);

    // For empty or whitespace-only queries, get all results
    if (!query || query.trim() === "") {
      return {
        version: "1.1",
        type: "SearchRegistration",
        payload: {
          network: null,
          outputs: Object.values(SEARCH_OUTPUT_FIELDS)
            .filter((v): v is string => typeof v === 'string'),
          filters: {
            fields: [],
            result_size: limit || 100,
            time: null
          }
        }
      };
    }

    const parseSearchString = (input: string): { structuredFields: Record<string, string>, genericTerms: string } => {
      const result: Record<string, string> = {};
      const regex = /(\w+):\s*([^:]+?)(?=\s+\w+:|\s*$)/g;
      let match;
      let lastIndex = 0;
      const genericTerms: string[] = [];

      while ((match = regex.exec(input)) !== null) {
        // Extract any text before this match as generic terms
        if (match.index > lastIndex) {
          const beforeMatch = input.substring(lastIndex, match.index).trim();
          if (beforeMatch) {
            genericTerms.push(beforeMatch);
          }
        }

        const key = match[1].trim();
        const value = match[2].trim();

        if (Object.keys(SEARCH_FILTER_CRITERIA_KEYS).includes(key) && value !== undefined) {
          logger.debug("Matched query parameter:", key, value);
          result[key] = value;
        }

        lastIndex = regex.lastIndex;
      }

      // Extract any remaining text after the last match as generic terms
      if (lastIndex < input.length) {
        const afterLastMatch = input.substring(lastIndex).trim();
        if (afterLastMatch) {
          genericTerms.push(afterLastMatch);
        }
      }

      // If no structured fields found and no generic terms collected yet, treat the entire input as generic
      if (Object.keys(result).length === 0 && genericTerms.length === 0 && input.trim()) {
        genericTerms.push(input.trim());
      }

      return {
        structuredFields: result,
        genericTerms: genericTerms.join(' ').trim()
      };
    }

    const { structuredFields, genericTerms } = parseSearchString(query);
    const resultSize = structuredFields["result_size"] ? parseInt(structuredFields["result_size"]) : limit || 100;

    // Remove result_size from structured fields
    delete structuredFields.result_size;
    delete structuredFields.network;

    logger.debug('Parsed search - structured:', structuredFields, 'generic:', genericTerms);

    // Build filters array
    const filtersFields = [];

    // Add Generic field for uncategorized terms (this is what the backend expects!)
    if (genericTerms) {
      filtersFields.push({
        field: { "Generic": genericTerms },
        strict: false
      });
    }

    // Add structured field filters
    Object.keys(structuredFields).forEach(key => {
      const mappedKey = SEARCH_FILTER_CRITERIA_KEYS[key as keyof typeof SEARCH_FILTER_CRITERIA_KEYS];
      if (mappedKey) {
        filtersFields.push({
          field: { [mappedKey]: structuredFields[key] },
          strict: false
        });
      }
    });

    return {
      version: "1.1",
      type: "SearchRegistration",
      payload: {
        network: null,  // Search across all networks
        outputs: Object.values(SEARCH_OUTPUT_FIELDS)
          .filter((v): v is string => typeof v === 'string'),
        filters: {
          fields: filtersFields,
          result_size: resultSize,
          time: null
        }
      }
    }
  }

  // TODO Allow to specify strict fields
  const search = useCallback(async (
    query: string | object,  // Allow direct object passing
    limit?: number,
  ): Promise<Array<FullProfile>> => {
    // Search across all fields for autocomplete
    try {
      // If query is already an object with version/type (from constructSearcObject), send it directly
      // Otherwise, construct search parameters from string
      const isFormattedObject = typeof query === 'object' && query !== null &&
                                'version' in query && 'type' in query && 'payload' in query;

      const searchMessage = typeof query === 'string'
        ? constructSearchParameters(query, limit)
        : isFormattedObject
          ? query
          : constructSearchParameters(JSON.stringify(query), limit);

      logger.log('Sending search message:', JSON.stringify(searchMessage));

      const response = await webSocketInstance.sendMessage<SearchResults | ErrorResponse>(searchMessage);

      if ((response as ErrorResponse).type === 'error') {
        const errorResponse = response as ErrorResponse;
        logger.error('Search error:', errorResponse.message);
        throw new Error(errorResponse.message);
      }

      if (Array.isArray(response)) {
        const results = (response as SearchResults).map((profile) => {
          const timeline = profile.timeline;

          // Map backend field names to IdentityInfo field names
          const identityInfo: Partial<IdentityInfo> = {};
          if (profile.display_name && profile.display_name !== "NULL") identityInfo.display = profile.display_name;
          if (profile.email && profile.email !== "NULL") identityInfo.email = profile.email;
          if (profile.web && profile.web !== "NULL") identityInfo.web = profile.web;
          if (profile.discord && profile.discord !== "NULL") identityInfo.discord = profile.discord;
          if (profile.twitter && profile.twitter !== "NULL") identityInfo.twitter = profile.twitter;
          if (profile.matrix && profile.matrix !== "NULL") identityInfo.matrix = profile.matrix;
          if (profile.github && profile.github !== "NULL") identityInfo.github = profile.github;
          if (profile.legal && profile.legal !== "NULL") identityInfo.legal = profile.legal;
          if (profile.pgp_fingerprint && profile.pgp_fingerprint !== "NULL") identityInfo.pgp_fingerprint = profile.pgp_fingerprint;

          const mapped: FullProfile = {
            wallet_id: profile.wallet_id,
            network: profile.network as keyof typeof CHAINS,
            ...identityInfo,
            timeline: timeline
          };

          logger.debug('Mapped profile:', profile, '→', mapped);
          return mapped;
        });

        logger.log('Total results mapped:', results.length);
        logger.log('Sample mapped result:', results[0]);

        const sorted = sortByNetworkPriority(results);

        logger.log('Returning sorted results:', sorted.length);
        return sorted;
      }

      throw new Error('Invalid search response format');
    } catch (error) {
      logger.error('Search failed:', error);

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
