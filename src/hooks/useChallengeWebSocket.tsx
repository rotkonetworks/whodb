// src/hooks/useChallengeWebSocket.tsx
import { SS58String } from 'polkadot-api';
import { useEffect, useCallback, useState, useRef } from 'react';

import { ChallengeStatus, ChallengeStore } from '@/store/challengesStore';
import { IdentityInfo, verifyStatuses } from '@/types/Identity';
import { toHexString } from '@/utils/binary';

interface VerificationState {
  fields: Record<string, boolean>;
}

export interface NotifyAccountPayload {
  account: string;
  network?: string;
  info: IdentityInfo;
  verification_state: VerificationState;
}

export interface ResponseAccountState {
  account: string;
  network?: string;
  hashed_info: string;
  verification_state: VerificationState;
  pending_challenges: [string, string][];
}

type ResponsePayload = {
  AccountState: ResponseAccountState;
};

type SubscribeAccountPayload = {
  network: string;
  account: string;
};

export type VerifyPGPKeyMessage = {
  network: string;
  account: string;
  pubkey: string;
  signed_challenge: string;
};

type Challenge = {
  done: boolean;
  name: string;
  token?: string;
}

type VerificationStateNew = {
  all_done: boolean;
  challenges: Record<string, Challenge>;
  created_at: string;
  updated_at: string;
  network: string;
}

type AccountStateMessage = {
  network: string;
  operation: 'set';
  type: 'AccountState';
  verification_state: VerificationStateNew;
}

type ErrorResponse = {
  type: "error";
  message: string;
};

type GenericJsonResponse = {
  type: 'JsonResult';
  payload: {
    type: "ok";
    message: ResponsePayload | string;
  } | {
    type: "err";
    message: string;
  };
};

type WebSocketResponse = {
  type: 'SubscribeAccountState';
  payload: SubscribeAccountPayload
} | {
  type: 'NotifyAccountState';
  payload: NotifyAccountPayload
} | {
  type: 'VerifyPGPKey';
  payload: VerifyPGPKeyMessage;
} | GenericJsonResponse | ErrorResponse | Array<SearchRecord>;

export interface UseIdentityWebSocketProps {
  url?: string;
  account?: string;
  network?: string;
}

interface SearchRecord {
  wallet_id?: string;
  network?: string;
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
export type SearchResult = Array<SearchRecord>;

export interface UseIdentityWebSocketReturn {
  isConnected: boolean;
  error: string | null;
  challengeState: ResponseAccountState | null;
  loading: boolean;
  subscribe: () => void;
  connect: () => void;
  disconnect: () => void;
  sendPGPVerification: (payload: VerifyPGPKeyMessage) => Promise<void>;
  search: (query: string, limit?: number, options?: {
    supportedFields?: string[]
    v2Request?: boolean;
  }) => Promise<SearchResult>;
}

export interface UseChallengeWebSocketWrapperReturn extends UseIdentityWebSocketReturn {
  challenges: ChallengeStore;
}

const keyMapping: Record<string, string> = {// WWorkaround for old API
  'p_g_p_fingerprint': 'pgp_fingerprint',
}

const useChallengeWebSocketWrapper = ({ url, address, network, identity }: {
  url: string;
  address?: SS58String;
  network?: string;
  identity?: { info: IdentityInfo, status: verifyStatuses };
}) => {
  const cleanNetwork = network?.toLowerCase().split("_")[0].toLowerCase();

  const challengeWebSocket = useChallengeWebSocketBase({
    url,
    account: address,
    network: cleanNetwork,
  });
  const { challengeState, error, isConnected } = challengeWebSocket

  const [challenges, setChallenges] = useState<ChallengeStore>({});
  useEffect(() => {
    setChallenges({})
  }, [url, address, network])

  const idWsDeps = [challengeState, error, address, identity?.status, network]

  useEffect(() => {
    console.log({ idWsDeps })
    if (error) {
      console.error(error)
      return
    }
    if (idWsDeps.some((value) => value === undefined)) {
      return
    }
    console.log({ challengeState })
    if (challengeState && identity) {
      const {
        pending_challenges,
        verification_state: { fields: verifyState },
      } = challengeState;
      console.log({ pending_challenges, verifyState })
      const pendingChallenges = Object.fromEntries(pending_challenges
        .map(([key, code]: [string | [string, string], string | undefined]) => {
          if (Array.isArray(key)) {
            return [key[0], key[1]];
          } else {
            return [key, code];
          }
        })
      )

      const _challenges: ChallengeStore = {};
      Object.entries(verifyState)
        .filter(([key, done]) => pendingChallenges[key] || done)
        .forEach(([key, done]) => {
          let status;
          if (identity?.status === verifyStatuses.IdentityVerified) {
            status = ChallengeStatus.Passed;
          } else {
            status = done ? ChallengeStatus.Passed : ChallengeStatus.Pending;
          }

          _challenges[key as keyof ChallengeStore] = {
            type: "matrixChallenge",
            status,
            code: !done ? pendingChallenges[key] : undefined,
          };
        })

      // Simple deep equality check for challenges object
      const hasChanges = JSON.stringify(challenges) !== JSON.stringify(_challenges)
      if (!hasChanges) {
        console.log("No changes in challenges")
        return
      }
      setChallenges(_challenges)

      console.log({
        origin: "challengeState",
        pendingChallenges,
        verifyState,
        challenges: _challenges,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, idWsDeps)

  return {
    challenges,
    challengeState: challengeWebSocket.challengeState,
    error: error,
    isConnected,
    loading: challengeWebSocket.loading,
    subscribe: challengeWebSocket.subscribe,
    connect: challengeWebSocket.connect,
    disconnect: challengeWebSocket.disconnect,
    sendPGPVerification: challengeWebSocket.sendPGPVerification,
    search: challengeWebSocket.search,
  }
}

const SEARCH_2_SUPPORTED_FIELDS = {
  discord: 'Discord',
  display: 'Display',
  email: 'Email',
  matrix: 'Matrix',
  twitter: 'Twitter',
  github: 'Github',
  legal: 'Legal',
  web: 'Web',
  //pgp_fingerprint: 'PGPFingerprint',
}
// Generic WebSocket hook with challenge verification support
const useChallengeWebSocketBase = (
  { url, account, network }: UseIdentityWebSocketProps
): UseIdentityWebSocketReturn => {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [challengeState, setChallengeState] = useState<ResponseAccountState | null>(null);
  const [loading, setLoading] = useState(true);

  // Use environment variable as default URL
  const wsUrl = url || import.meta.env.VITE_APP_CHALLENGES_API_URL as string;

  // Only connect if we have required parameters
  const canConnect = Boolean(wsUrl);
  const canSubscribe = canConnect && Boolean(account && network);

  // Track if we've already subscribed for this connection
  const hasSubscribed = useRef(false);
  const reconnectTimeout = useRef<number | null>(null);
  const isReconnecting = useRef(false);
  const connectionAttempts = useRef(0);
  const lastConnectionAttempt = useRef(0);

  const pendingRequests = useRef<Map<string, {
    resolve: (value: unknown) => void;
    reject: (reason: Error) => void;
    timeout: number;
  }>>(new Map());

  const generateRequestId = () => Math.random().toString(36).substring(7);

  const cleanupPendingRequests = useCallback(() => {
    for (const [, { reject, timeout }] of pendingRequests.current.entries()) {
      clearTimeout(timeout);
      reject(new Error('WebSocket disconnected'));
    }
    pendingRequests.current.clear();
  }, []);


  /**
   * Sends a versioned message over the active WebSocket connection and returns a promise
   * that will later be resolved or rejected by the external message handler.
   *
   * This function only dispatches the outbound message; it does not handle or interpret
   * incoming responses. Resolution and rejection of the returned promise are performed
   * by `handleMessage`, which must correlate the incoming response with the internally
   * generated request identifier and settle the associated pending request.
   *
   * Behavior:
   * - Adds `version: '1.0'` to the outgoing payload.
   * - Generates an internal request identifier and registers the promise's resolve/reject
   *   callbacks in a pending-requests registry.
   * - Starts a 30s timeout that rejects the promise with a "Request timeout" error if
   *   no matching response is handled in time.
   * - Sets a loading state while the request is in flight.
   *
   * Requirements:
   * - The WebSocket connection must be open (`WebSocket.OPEN`) or the promise is rejected immediately.
   * - The message handler (e.g., `handleMessage`) must correlate responses to the generated
   *   request identifier and settle the stored promise accordingly.
   *
   * @param message Outbound WebSocket payload to send.
   * @returns A promise that resolves with the corresponding `WebSocketResponse` when the
   *          external handler settles it, or rejects on connection errors or timeout.
   * @throws Error If the WebSocket is not connected (promise is rejected immediately).
   * @throws Error If no response is correlated within 30 seconds (promise is rejected with "Request timeout").
   * @see handleMessage
   */
  const sendMessage = useCallback((message: WebSocketResponse): Promise<WebSocketResponse> => {
    setLoading(true);
    return new Promise((resolve, reject) => {
      if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket is not connected'));
        return;
      }
      console.log({ message, callback: "sendMessage" })

      const requestId = generateRequestId();
      const versionedMessage = {
        version: '1.0',
        ...message
      };

      const timeout = window.setTimeout(() => {
        const request = pendingRequests.current.get(requestId);
        if (request) {
          request.reject(new Error('Request timeout'));
          pendingRequests.current.delete(requestId);
        }
      }, 30000);

      pendingRequests.current.set(requestId, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timeout
      });
      ws.current.send(JSON.stringify(versionedMessage));
    });
  }, []);

  const search = (
    query: string,
    limit: number = 5,
    options: {
      v2Request?: boolean;
      supportedFields?: string[];
    }
  ): Promise<any[]> => {
    return new Promise(async (resolve, reject) => {
      const v2Request = options?.v2Request ?? false;
      const supportedFields = options?.supportedFields ?? Object.keys(SEARCH_2_SUPPORTED_FIELDS);

      const searchOutputs = supportedFields
        .map(field => SEARCH_2_SUPPORTED_FIELDS[field])
        .filter(field => field !== undefined)
        ;

      if (!canConnect) {
        return reject(new Error('WebSocket is not connected'));
      }
      //await connect();
      const searchFields = searchOutputs.map(field => {
        const _query = field === 'PGPFingerprint' ? toHexString(query) : query.trim().toLowerCase();
        return ({
          field: { [field]: _query },
          strict: false
        });
      });
      // Search across all fields for autocomplete
      const searchParams = {
        network: null, // Search all networks
        // TODO Filter by supportedFields
        outputs: searchOutputs,
        filters: v2Request
          ? {
            fields: searchFields,
            result_size: limit,
          }
          : searchFields
      }

      const message = {
        type: "SearchRegistration",
        payload: searchParams
      }

      const handleResponse = async (response: Promise<WebSocketResponse>, shouldReject: boolean = true) => {
        try {
          const _response: SearchRecord[] | ErrorResponse = await response;
          if ((_response as ErrorResponse).type === 'error') {
            const errorResponse: ErrorResponse = _response as ErrorResponse;
            console.error('Search error:', errorResponse.message);
            const error = new Error(errorResponse.message);
            if (shouldReject) {
              reject(error);
            }
            throw error;
          }
          if (Array.isArray(_response)) {
            resolve(_response);
            return _response;
          }
        } catch (error) {
          console.error('Error handling search response:', error);
          if (shouldReject) {
            reject(error);
          }
          throw error;
        }
      }

      console.log('Sending search query:', message)
      try {
        return await handleResponse(sendMessage(message))
      } catch (error) {
        console.error('Search failed:', error);
        const isParseError = error instanceof Error && error.message.startsWith('Failed to parse message');
        if (!v2Request && isParseError) {
          return await handleResponse(search(query, limit, {
            v2Request: true,
            supportedFields
          }));
        }
        reject(error);
      }
    })
  }

  const sendPGPVerification = useCallback((payload: VerifyPGPKeyMessage): Promise<void> => {
    return sendMessage({
      type: 'VerifyPGPKey',
      payload,
    });
  }, [sendMessage]);

  const subscribe = useCallback(() => {
    if (!hasSubscribed.current && ws.current?.readyState === WebSocket.OPEN && account && network) {
      hasSubscribed.current = true;
      console.log(`Subscribing to account state for ${account} on ${network}`);

      const cleanNetwork = network?.toLowerCase().split("_")[0];

      const message = {
        version: '1.0',
        type: 'SubscribeAccountState' as const,
        payload: {
          account: account,
          network: cleanNetwork
        },
      };

      try {
        ws.current.send(JSON.stringify(message));
        console.log('Subscription message sent:', message);
      } catch (err) {
        console.error('Subscription failed:', err);
        setError(err instanceof Error ? err.message : 'Subscription failed');
        hasSubscribed.current = false;
      }
    }
  }, [account, network]);

  type ChallengeMessageType = WebSocketResponse | AccountStateMessage;

  /**
   * Handles incoming WebSocket messages for the challenge workflow and resolves
   * pending requests initiated via sendMessage.
   *
   * This callback is the central response handler for all messages sent by sendMessage:
   * it parses the incoming JSON payload, updates local loading/error state, normalizes
   * and applies account state updates, and fulfills any awaiting sendMessage promises.
   *
   * Behavior:
   * - Attempts to parse the event data as a ChallengeMessageType.
   * - On a "JsonResult" with an "ok" payload:
   *   - If the message is a string (e.g., "PGP verification is done"), it is acknowledged.
   *   - If the message is an object, extracts AccountState from the payload, normalizes
   *     pending_challenges by mapping and key transformation, and updates the challenge state.
   *   - Clears loading and error states accordingly.
   * - On a non-"ok" payload or an "error" message, sets the error state and clears loading.
   * - Regardless of message content, resolves and cleans up all entries in pendingRequests
   *   (clears associated timeouts and resolves the stored Promise with the received message),
   *   thereby delivering the response back to the original sendMessage caller.
   * - If JSON parsing fails, records a parsing error and clears loading.
   *
   * Note:
   * - This function does not throw; errors are captured into state via setError.
   * - Key normalization in pending_challenges uses keyMapping to convert known keys.
   *
   * @param event - Message event carrying a JSON-encoded ChallengeMessageType from the WebSocket.
   * @see sendMessage
   */
  const handleMessage = useCallback((event: MessageEvent<ChallengeMessageType>) => {
    try {
      const message = JSON.parse(event.data as never) as ChallengeMessageType;
      console.log({ message })

      switch (message.type) {
        case 'JsonResult':
          if (message.payload.type === 'ok') {
            if (typeof message.payload.message === 'string') {
              if (message.payload.message === 'PGP verification is done') {
              } else {
              }
            } else if (message.payload.message && typeof message.payload.message === 'object') {
              const response: ResponseAccountState = (message.payload.message as ResponsePayload).AccountState;
              response.pending_challenges = response.pending_challenges.map(([key, code]): [string, string] => {
                let value: [string, string];
                if (Array.isArray(key)) {
                  value = [key[0], key[1]];
                } else {
                  value = [key, code];
                }
                const newKey = keyMapping[value[0]] || value[0];
                return [newKey, value[1]];
              });
              if (response) {
                console.log({ response })
                setChallengeState({
                  ...response,
                  network: response.network
                });
                setLoading(false);
                setError(null);
              }
            }
          } else {
            setError(message.payload.message);
            setLoading(false);
          }
          break;

        case "error":
          setError(message.message);
          setLoading(false);
          break;
      }

      for (const [requestId, { resolve, timeout }] of pendingRequests.current.entries()) {
        clearTimeout(timeout);
        resolve(message);
        pendingRequests.current.delete(requestId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse message');
      setLoading(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }

    isReconnecting.current = false;
    hasSubscribed.current = false;
    connectionAttempts.current = 0;
    lastConnectionAttempt.current = 0;

    cleanupPendingRequests();

    if (ws.current) {
      if (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING) {
        ws.current.onopen = null;
        ws.current.onerror = null;
        ws.current.onmessage = null;
        ws.current.onclose = null;
        ws.current.close();
      }
      ws.current = null;
    }

    setLoading(false);
    setIsConnected(false);
  }, [cleanupPendingRequests]);

  const connect = useCallback(() => {
    // Don't connect if we don't have required parameters
    if (!canConnect) {
      console.log("Cannot connect: missing URL, account, or network");
      return;
    }

    const now = Date.now();
    const timeSinceLastAttempt = now - lastConnectionAttempt.current;

    if (timeSinceLastAttempt < 1000) {
      console.log("Connection attempt throttled, too soon since last attempt");
      return;
    }

    if (isReconnecting.current || (ws.current && ws.current.readyState === WebSocket.CONNECTING)) {
      console.log("Connection attempt prevented - already connecting");
      return;
    }

    lastConnectionAttempt.current = now;
    connectionAttempts.current += 1;

    const backoffDelay = Math.min(1000 * Math.pow(2, Math.min(connectionAttempts.current - 1, 5)), 30000);
    if (connectionAttempts.current > 1 && timeSinceLastAttempt < backoffDelay) {
      console.log(`Connection backoff: waiting ${backoffDelay}ms before attempt ${connectionAttempts.current}`);
      reconnectTimeout.current = window.setTimeout(() => {
        connect();
      }, backoffDelay - timeSinceLastAttempt);
      return;
    }

    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }

    console.log(`Attempting WebSocket connection #${connectionAttempts.current} to ${wsUrl}`);
    setLoading(true);
    setIsConnected(false);
    setError(null);
    hasSubscribed.current = false;
    isReconnecting.current = true;

    if (ws.current) {
      ws.current.onopen = null;
      ws.current.onerror = null;
      ws.current.onmessage = null;
      ws.current.onclose = null;
      ws.current.close();
    }

    try {
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log({ callBack: "onopen", attempt: connectionAttempts.current });
        setIsConnected(true);
        setError(null);
        setLoading(false);
        isReconnecting.current = false;
        hasSubscribed.current = false;
        connectionAttempts.current = 0;

        if (account && network) {
          const cleanNetwork = network.toLowerCase().split("_")[0];

          const message = {
            version: '1.0',
            type: 'SubscribeAccountState' as const,
            payload: {
              account: account,
              network: cleanNetwork
            },
          };

          try {
            ws.current?.send(JSON.stringify(message));
            hasSubscribed.current = true;
            console.log('Auto-subscription message sent on connection open:', message);
          } catch (err) {
            console.error('Auto-subscription failed:', err);
          }
        }
      };

      ws.current.onclose = (event) => {
        console.log({ callBack: "onclose", code: event.code, attempt: connectionAttempts.current });
        setIsConnected(false);
        hasSubscribed.current = false;
        isReconnecting.current = false;

        if (event.code !== 1000 && event.code !== 1001) {
          const reconnectDelay = Math.min(5000 * Math.pow(1.5, Math.min(connectionAttempts.current, 5)), 30000);
          console.log(`Scheduling reconnection in ${reconnectDelay}ms`);
          reconnectTimeout.current = window.setTimeout(() => {
            if (!isReconnecting.current) {
              console.log("Attempting to reconnect...");
              connect();
            }
          }, reconnectDelay);
        } else {
          setLoading(false);
          connectionAttempts.current = 0;
        }
      };

      ws.current.onerror = (error) => {
        console.error("WebSocket error:", error, "attempt:", connectionAttempts.current);
        setError('WebSocket connection failed');
        isReconnecting.current = false;
        setLoading(false);
      };

      ws.current.onmessage = handleMessage;
    } catch (error) {
      console.error("Failed to create WebSocket:", error);
      setError('Failed to create WebSocket connection');
      isReconnecting.current = false;
      setLoading(false);
    }
  }, [wsUrl, canConnect]); // Depend on wsUrl and canConnect

  // Initialize connection when URL or connection parameters change
  useEffect(() => {
    if (canConnect) {
      // Debounce the initial connection to prevent rapid calls
      const timeoutId = setTimeout(() => {
        connect();
      }, 100);

      return () => {
        clearTimeout(timeoutId);
        disconnect();
      };
    } else {
      // Disconnect if we no longer have required parameters
      disconnect();
    }
  }, [wsUrl, canConnect, connect, disconnect]); // Include canConnect in deps

  useEffect(() => {
    if (isConnected && account && network && !hasSubscribed.current) {
      const timeoutId = setTimeout(() => {
        subscribe();
      }, 50);

      return () => clearTimeout(timeoutId);
    }
  }, [isConnected, account, network, subscribe]);

  return {
    connect,
    subscribe,
    disconnect,
    loading,
    isConnected,
    error,
    challengeState,
    sendPGPVerification,
    search,
  };
};

export { useChallengeWebSocketWrapper as useChallengeWebSocket, useChallengeWebSocketBase };
