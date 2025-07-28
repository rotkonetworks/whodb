// src/hooks/useChallengeWebSocket.tsx
import { SS58String } from 'polkadot-api';
import { useEffect, useCallback, useState, useRef } from 'react';

import { ChallengeStatus, ChallengeStore } from '@/store/challengesStore';
import { IdentityInfo, verifyStatuses } from '@/types/Identity';

interface VerificationState {
  fields: Record<string, boolean>;
}

export interface NotifyAccountState {
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

type SubscribeAccountState = {
  network: string;
  account: string;
};

export type VerifyPGPKey = {
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

type WebSocketMessage = {
  type: 'SubscribeAccountState';
  payload: SubscribeAccountState
} | {
  type: 'NotifyAccountState';
  payload: NotifyAccountState
} | {
  type: 'VerifyPGPKey';
  payload: VerifyPGPKey;
} | {
  type: 'JsonResult';
  payload: {
    type: "ok",
    message: ResponsePayload | string
  } | {
    type: "err",
    message: string
  }
} | {
  type: "error",
  message: string,
};

export interface UseIdentityWebSocketProps {
  url?: string;
  account?: string;
  network?: string;
}

export interface UseIdentityWebSocketReturn {
  isConnected: boolean;
  error: string | null;
  challengeState: ResponseAccountState | null;
  loading: boolean;
  subscribe: () => void;
  connect: () => void;
  disconnect: () => void;
  sendPGPVerification: (payload: VerifyPGPKey) => Promise<void>;
}

export interface UseChallengeWebSocketWrapperReturn extends UseIdentityWebSocketReturn {
  challenges: ChallengeStore;
}

const keyMapping: Record<string, string> = {// WWorkaround for old API
  'p_g_p_fingerprint': 'pgp_fingerprint',
}

const useChallengeWebSocketWrapper = ({ url, address, network, identity }: {
  url?: string;
  address?: SS58String;
  network?: string;
  identity?: { info: IdentityInfo, status: verifyStatuses };
}): UseChallengeWebSocketWrapperReturn => {
  const challengeWebSocket = useChallengeWebSocketBase({
    url,
    account: address,
    network: network?.split("_")[0],
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
        // new API assumes challenges are Array<[[string, string]]>, but we still support old format.
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
    // DRY code, also, all required values are already in the deps array and null checked.
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
  }
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
  const canConnect = Boolean(wsUrl && account && network);

  // Track if we've already subscribed for this connection
  const hasSubscribed = useRef(false);
  const reconnectTimeout = useRef<number | null>(null);
  const isReconnecting = useRef(false);
  const connectionAttempts = useRef(0);
  const lastConnectionAttempt = useRef(0);

  // Keep track of pending promises for responses
  const pendingRequests = useRef<Map<string, {
    resolve: (value: unknown) => void;
    reject: (reason: Error) => void;
    timeout: number;
  }>>(new Map());

  const generateRequestId = () => Math.random().toString(36).substring(7);

  // Clean up all pending requests
  const cleanupPendingRequests = useCallback(() => {
    for (const [, { reject, timeout }] of pendingRequests.current.entries()) {
      clearTimeout(timeout);
      reject(new Error('WebSocket disconnected'));
    }
    pendingRequests.current.clear();
  }, []);

  const sendMessage = useCallback((message: WebSocketMessage): Promise<void> => {
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

      // Set up timeout for response
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

  // Send PGP verification
  const sendPGPVerification = useCallback((payload: VerifyPGPKey): Promise<void> => {
    return sendMessage({
      type: 'VerifyPGPKey',
      payload,
    });
  }, [sendMessage]);

  // Subscribe to account state - only once per connection
  const subscribe = useCallback(() => {
    if (!hasSubscribed.current && ws.current?.readyState === WebSocket.OPEN && account && network) {
      hasSubscribed.current = true;
      console.log(`Subscribing to account state for ${account} on ${network}`);

      // Send message directly without using sendMessage to avoid dependency issues
      const message = {
        version: '1.0',
        type: 'SubscribeAccountState' as const,
        payload: { account, network },
      };

      try {
        ws.current.send(JSON.stringify(message));
        console.log('Subscription message sent');
      } catch (err) {
        console.error('Subscription failed:', err);
        setError(err instanceof Error ? err.message : 'Subscription failed');
        hasSubscribed.current = false; // Reset on error to allow retry
      }
    }
  }, [account, network]);

  // Note union of types for event.data. it's done because AccountStateMessage does not have `payload` field.
  type ChallengeMessageType = WebSocketMessage | AccountStateMessage;

  const handleMessage = useCallback((event: MessageEvent<ChallengeMessageType>) => {
    try {
      const message = JSON.parse(event.data as never) as ChallengeMessageType;
      console.log({ message })

      switch (message.type) {
        case 'JsonResult':
          if (message.payload.type === 'ok') {
            // Handle different success scenarios
            if (typeof message.payload.message === 'string') {
              // Handle string responses (like PGP verification)
              if (message.payload.message === 'PGP verification is done') {
              } else {
              }
            } else if (message.payload.message && typeof message.payload.message === 'object') {
              // Handle object responses (AccountState)
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
            // Handle error
            setError(message.payload.message);
            setLoading(false);
          }
          break;

        case "error":
          setError(message.message);
          setLoading(false);
          break;
      }

      // Resolve any pending requests
      for (const [requestId, { resolve, timeout }] of pendingRequests.current.entries()) {
        clearTimeout(timeout);
        resolve(message);
        pendingRequests.current.delete(requestId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse message');
      setLoading(false);
    }
  }, [subscribe]);

  const disconnect = useCallback(() => {
    // Clear reconnection timeout
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }

    isReconnecting.current = false;
    hasSubscribed.current = false;
    connectionAttempts.current = 0; // Reset connection attempts
    lastConnectionAttempt.current = 0; // Reset throttling

    // Clean up pending requests
    cleanupPendingRequests();

    // Close WebSocket if it exists and is open
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

  // Set up WebSocket connection
  const connect = useCallback(() => {
    // Don't connect if we don't have required parameters
    if (!canConnect) {
      console.log("Cannot connect: missing URL, account, or network");
      return;
    }

    const now = Date.now();
    const timeSinceLastAttempt = now - lastConnectionAttempt.current;

    // Debounce connection attempts - minimum 1 second between attempts
    if (timeSinceLastAttempt < 1000) {
      console.log("Connection attempt throttled, too soon since last attempt");
      return;
    }

    // Prevent multiple concurrent connection attempts
    if (isReconnecting.current || (ws.current && ws.current.readyState === WebSocket.CONNECTING)) {
      console.log("Connection attempt prevented - already connecting");
      return;
    }

    lastConnectionAttempt.current = now;
    connectionAttempts.current += 1;

    // Exponential backoff for multiple failed attempts
    const backoffDelay = Math.min(1000 * Math.pow(2, Math.min(connectionAttempts.current - 1, 5)), 30000);
    if (connectionAttempts.current > 1 && timeSinceLastAttempt < backoffDelay) {
      console.log(`Connection backoff: waiting ${backoffDelay}ms before attempt ${connectionAttempts.current}`);
      reconnectTimeout.current = window.setTimeout(() => {
        connect();
      }, backoffDelay - timeSinceLastAttempt);
      return;
    }

    // Clear any existing timeout
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

    // Close existing connection if any
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
        hasSubscribed.current = false; // Reset subscription flag for new connection
        connectionAttempts.current = 0; // Reset connection attempts on successful connection

        // Subscribe immediately after connection - call subscribe directly to avoid closure issues
        if (account && network) {
          const message = {
            version: '1.0',
            type: 'SubscribeAccountState' as const,
            payload: { account, network },
          };

          try {
            ws.current?.send(JSON.stringify(message));
            hasSubscribed.current = true;
            console.log('Auto-subscription message sent on connection open');
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

        // Only attempt reconnection for abnormal closures and if not manually disconnected
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
          connectionAttempts.current = 0; // Reset on clean close
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

  // Subscribe when connection is ready and we have account/network
  useEffect(() => {
    if (isConnected && account && network && !hasSubscribed.current) {
      // Add a small delay to ensure connection is fully established
      const timeoutId = setTimeout(() => {
        subscribe();
      }, 50);

      return () => clearTimeout(timeoutId);
    }
  }, [isConnected, account, network]); // Remove subscribe from deps to prevent recreation

  return {
    connect,
    subscribe,
    disconnect,
    loading,
    isConnected,
    error,
    challengeState,
    sendPGPVerification,
  };
};

export { useChallengeWebSocketWrapper as useChallengeWebSocket, useChallengeWebSocketBase };
