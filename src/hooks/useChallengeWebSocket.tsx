// src/hooks/useChallengeWebSocket.tsx
import _ from 'lodash';
import { SS58String } from 'polkadot-api';
import { useEffect, useCallback, useState, useRef } from 'react';

import { ChallengeStatus, ChallengeStore } from '@/store/challengesStore';
import { IdentityInfo, verifyStatuses } from '@/types/Identity';

import { AlertPropsOptionalKey } from './useAlerts';

// Types matching your Rust backend
type Data = {
  type: 'none' | 'raw' | 'blake_two_256' | 'sha_256' | 'keccak_256' | 'sha_three_256';
  value?: Uint8Array | [number, number, number, number];
};

export interface IdentityRawData {
  display: Data;
  legal: Data;
  web: Data;
  matrix: Data;
  email: Data;
  pgp_fingerprint?: Uint8Array;
  image: Data;
  twitter: Data;
  github: Data;
  discord: Data;
}

interface VerificationState {
  fields: Record<string, boolean>;
}

export interface NotifyAccountState {
  account: string;
  network?: string;
  info: IdentityInfo;
  verification_state: VerificationState;
}

interface ResponseAccountState {
  account: string;
  network?: string;
  hashed_info: string;
  verification_state: VerificationState;
  pending_challenges: [string, string][];
}

type ResponsePayload = {
  AccountState: ResponseAccountState;
  Secret: string;
  VerificationResult: boolean;
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

interface UseIdentityWebSocketProps {
  url: string;
  account: string;
  network: string;
  addNotification: (alert: AlertPropsOptionalKey) => void;
}

interface UseIdentityWebSocketReturn {
  isConnected: boolean;
  error: string | null;
  challengeState: ResponseAccountState | null;
  loading: boolean;
  subscribe: () => void;
  connect: () => void;
  disconnect: () => void;
  sendPGPVerification: (payload: VerifyPGPKey) => Promise<void>;
}

const useChallengeWebSocketWrapper = ({ url, address, network, identity, addNotification, }: {
  url: string;
  address: SS58String;
  network: string;
  identity: { info: IdentityInfo, status: verifyStatuses };
  addNotification: (alert: AlertPropsOptionalKey) => void;
}) => {
  const challengeWebSocket = useChallengeWebSocket({
    url,
    account: address,
    network: network.split("_")[0],
    addNotification,
  });
  const { challengeState, error, isConnected } = challengeWebSocket

  const [challenges, setChallenges] = useState<ChallengeStore>({});
  useEffect(() => {
    setChallenges({})
  }, [url, address, network])

  const idWsDeps = [challengeState, error, address, identity.status, network]

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
    if (challengeState) {
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
          if (identity.status === verifyStatuses.IdentityVerified) {
            status = ChallengeStatus.Passed;
          } else {
            status = done ? ChallengeStatus.Passed : ChallengeStatus.Pending;
          }

          _challenges[key] = {
            type: "matrixChallenge",
            status,
            code: !done && pendingChallenges[key],
          };
        })
      if (_.isEqual(challenges, _challenges)) {
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
const useChallengeWebSocket = (
  { url, account, network, addNotification }: UseIdentityWebSocketProps
): UseIdentityWebSocketReturn => {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [challengeState, setChallengeState] = useState<ResponseAccountState | null>(null);
  const [loading, setLoading] = useState(true);

  // Keep track of pending promises for responses
  const pendingRequests = useRef<Map<string, {
    resolve: (value: unknown) => void;
    reject: (reason: Error) => void;
    timeout: number;
  }>>(new Map());

  const generateRequestId = () => Math.random().toString(36).substring(7);

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

      pendingRequests.current.set(requestId, { resolve, reject, timeout });
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

  // Subscribe to account state
  const subscribe = useCallback(() => {
    sendMessage({
      type: 'SubscribeAccountState',
      payload: { account, network },
    }).catch(err => setError(err.message));
  }, [sendMessage, account, network]);

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
                addNotification({
                  type: 'success',
                  message: 'PGP key verified successfully!',
                });
                // Trigger a refresh of account state
                subscribe();
              } else {
                // Handle other string messages
                addNotification({
                  type: 'info',
                  message: message.payload.message,
                });
              }
            } else if (message.payload.message && typeof message.payload.message === 'object') {
              // Handle object responses (AccountState)
              const response = (message.payload.message as ResponsePayload).AccountState;
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
            addNotification({
              type: 'error',
              message: message.payload.message,
            });
          }
          break;

        case 'AccountState': {
          const verificationStateFields: Record<string, boolean> = {};
          const pendingChallenges: [string, string][] = [];

          // Extract verification states and pending challenges from the new format
          if (message.verification_state?.challenges) {
            Object.entries(message.verification_state.challenges)
              .forEach(([key, value]: [string, Challenge]) => {
                verificationStateFields[key] = value.done;
                if (value.done) {
                  addNotification({
                    message: `Challenge ${key} has been verified successfully`,
                    type: 'info'
                  });
                }
                if (!value.done && value.token) {
                  pendingChallenges.push([key, value.token]);
                }
              });
          }

          setChallengeState(prev => ({
            ...prev,
            verification_state: { fields: verificationStateFields },
            pending_challenges: pendingChallenges,
            network: message.network
          }));
          setLoading(false);
          break;
        }

        case "error":
          setError(message.message);
          setLoading(false);
          addNotification({
            type: 'error',
            message: message.message,
          });
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
  }, [addNotification, subscribe]);

  const disconnect = useCallback(() => {
    // Important. Socket explicitly checked if open. so it won't get closed before ones that are
    //  connecting. ws.current in dependency array ensures updating on unmount. Otherwise, it's a
    //  mess to work with it, as too many connections may be opened in vain, or expected events
    //  may not really be fired as expected.
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.onopen = null
      ws.current.onerror = null
      ws.current.onmessage = null
      ws.current.close();
      // ws.current = null and any remaining cleanup happens on close handling.
    }
    if (ws.current?.readyState > WebSocket.OPEN) {
      ws.current = null
    }
    setLoading(false);
    setIsConnected(false);
    // 1 Absolutely nothing, to avoid infinite loop. It's a bit tricky, but it works. No more deps!
  }, []);

  // Set up WebSocket connection
  const connect = useCallback(() => {
    setLoading(true);
    setIsConnected(false);
    ws.current = new WebSocket(url);

    ws.current.onopen = () => {
      console.log({ callBack: "onopen" })
      setIsConnected(true);
      setError(null);
    };
    ws.current.onclose = (event) => {
      console.log({ callBack: "onclose", code: event.code })
      setIsConnected(false);
      // Attempt to reconnect after a delay
      setTimeout(() => {
        if (!ws.current || ws.current.readyState === WebSocket.CLOSED) {
          connect();
        }
      }, 5000);
    };
    ws.current.onerror = (error) => {
      console.error(error)
      setError('WebSocket error occurred');
    };
    ws.current.onmessage = handleMessage;
  }, [url, handleMessage]);

  useEffect(() => {
    console.log({ ws: ws.current, state: ws.current?.readyState })
    if (ws.current?.readyState === WebSocket.CONNECTING) {
      setIsConnected(false)
      setLoading(true)
      return;
    }
    if (ws.current?.readyState === WebSocket.OPEN) {
      setIsConnected(true)
      return;
    }
    if (!ws.current?.readyState || ws.current?.readyState > WebSocket.OPEN) {
      connect()
      setIsConnected(false)
      setLoading(true)
    }

    return disconnect;
    // DITTO 1
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, ws.current?.readyState]);

  useEffect(() => {
    if (ws.current?.readyState === WebSocket.OPEN && account && network) {
      console.log({ ws: ws.current, state: ws.current?.readyState, account, callback: "sendMessage<effect>" });
      // Subscribe to account state on connection
      subscribe();
    }
    // DITTO 1
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, network, ws.current?.readyState])

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

export { useChallengeWebSocketWrapper as useChallengeWebSocket };
