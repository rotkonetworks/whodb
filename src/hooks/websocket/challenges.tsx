import { ChallengeStatus, ChallengeStore } from '@/store/challengesStore';
import { IdentityInfo, verifyStatuses } from '@/types/Identity';
import { SS58String } from 'polkadot-api';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTriggerLog } from '../use-trigger-log';
import { WebSocketHookReturn } from '.';

export interface VerifyPGPKeyMessage {
  network: string;
  account: string;
  pubkey: string;
  signed_challenge: string;
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

interface VerificationState {
  fields: Record<string, boolean>;
}

interface ResponsePayload {
  AccountState: ResponseAccountState;
}

export interface ChallengeWebSocketConfig {
  account?: string;
  network?: string;
}

export interface ChallengeWebSocketReturn extends Pick<WebSocketHookReturn, 'isConnected' | 'error' | 'loading' | 'connect' | 'disconnect'> {
  challengeState: ResponseAccountState | null;
  challenges: ChallengeStore;
  subscribe: () => void;
  sendPGPVerification: (payload: VerifyPGPKeyMessage) => Promise<void>;
}

// Workaround for old API
const keyMapping: Record<string, string> = {
  'p_g_p_fingerprint': 'pgp_fingerprint',
};

/**
 * Challenge WebSocket hook that handles challenge subscriptions, PGP verification,
 * and challenge state management. Uses the main WebSocket for communication.
 */
export const useChallengeWebSocket = (
  _webSocketInstance: WebSocketHookReturn,
  identityStatus: verifyStatuses,
  _address?: SS58String,
  _network?: string,
): ChallengeWebSocketReturn => {
  const [
    webSocketInstance,
    setWebSocketInstance
  ] = useState<WebSocketHookReturn | null>(_webSocketInstance);

  useEffect(() => {
    const different = JSON.stringify(webSocketInstance) !== JSON.stringify(_webSocketInstance);
    if (different) {
      setWebSocketInstance(_webSocketInstance);
    }
  }, [_webSocketInstance]);

  if (!webSocketInstance) {
    throw new Error('WebSocket instance is required');
  }

  const network = useMemo(() => _network?.toLowerCase().split('_')[0], [_network]);
  const address = useMemo(() => _address, [_address]);

  const cleanNetwork = network?.toLowerCase?.().split('_')[0];

  const [challengeState, setChallengeState] = useState<ResponseAccountState | null>(null);
  const [challenges, setChallenges] = useState<ChallengeStore>({});
  const [hasSubscribed, setHasSubscribed] = useState(false);

  useTriggerLog(challengeState, "ChallengeState");
  useTriggerLog(challenges, "Challenges");

  const unsubscribe = useRef<() => void>(() => { });
  // Reset state when connection parameters change
  useEffect(() => {
    setChallenges({});
    setChallengeState(null);
    setHasSubscribed(false);
    unsubscribe.current();
    unsubscribe.current = () => { };
  }, [webSocketInstance, address, network]);
  useTriggerLog(webSocketInstance, "webSocketInstance");

  // Subscribe to account state updates
  const subscribe = useCallback(() => {
    if (!hasSubscribed && webSocketInstance.isConnected && address && cleanNetwork) {
      setHasSubscribed(true);
      console.log(`Subscribing to account state for ${address} on ${cleanNetwork}`);

      const message = {
        type: 'SubscribeAccountState' as const,
        payload: {
          account: address,
          network: cleanNetwork,
        },
      };

      try {
        webSocketInstance.sendMessage(message);
        unsubscribe.current = webSocketInstance.subscribe(handleMessage);
        console.log('Subscription message sent:', message);
      } catch (err) {
        console.error('Subscription failed:', err);
        setHasSubscribed(false);
      }
    }
  }, [webSocketInstance, address, cleanNetwork, hasSubscribed]);

  // Send PGP verification
  const sendPGPVerification = useCallback(
    async (payload: VerifyPGPKeyMessage): Promise<void> => {
      await webSocketInstance.sendMessage({
        type: 'VerifyPGPKey',
        payload,
      });
    },
    [webSocketInstance]
  );

  const handleMessage = (message: any) => {
    console.log('Challenge WebSocket message received:', message);

    switch (message.type) {
      case 'JsonResult':
        if (message.payload.type === 'ok') {
          if (typeof message.payload.message === 'string') {
            if (message.payload.message === 'PGP verification is done') {
              console.log('PGP verification completed');
            }
          } else if (message.payload.message && typeof message.payload.message === 'object') {
            const response: ResponseAccountState = (message.payload.message as ResponsePayload).AccountState;
            if (response) {
              // Normalize pending challenges and apply key mapping
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

              console.log('Account state received:', response);
              setChallengeState({
                ...response,
                network: response.network,
              });
            }
          }
        } else {
          console.error('Challenge WebSocket error:', message.payload.message);
        }
        break;

      case 'error':
        console.error('Challenge WebSocket error:', message.message);
        break;
    }
  };

  // Handle incoming messages from WebSocket
  useEffect(() => {
    if (!webSocketInstance) return;

    const unsubscribe = subscribe();
    return unsubscribe;
  }, [webSocketInstance]);

  // Auto-subscribe when connected
  useEffect(() => {
    if (webSocketInstance.isConnected && address && cleanNetwork && !hasSubscribed) {
      const timeoutId = setTimeout(() => {
        subscribe();
      }, 50);

      return () => clearTimeout(timeoutId);
    }
  }, [webSocketInstance.isConnected, address, cleanNetwork, hasSubscribed, subscribe]);

  // Process challenge state and update challenges store
  useEffect(() => {
    const idWsDeps = [challengeState, webSocketInstance.error, address, identityStatus, network];

    console.log('Challenge dependencies changed:', { idWsDeps });

    if (webSocketInstance.error) {
      console.error('WebSocket error:', webSocketInstance.error);
      return;
    }

    if (idWsDeps.some((value) => value === undefined)) {
      return;
    }

    if (challengeState && identityStatus) {
      const {
        pending_challenges,
        verification_state: { fields: verifyState },
      } = challengeState;

      console.log('Processing challenges:', { pending_challenges, verifyState });

      const pendingChallenges = Object.fromEntries(
        pending_challenges.map(([key, code]: [string | [string, string], string | undefined]) => {
          if (Array.isArray(key)) {
            return [key[0], key[1]];
          } else {
            return [key, code];
          }
        })
      );

      const _challenges: ChallengeStore = {};
      Object.entries(verifyState)
        .filter(([key, done]) => pendingChallenges[key] || done)
        .forEach(([key, done]) => {
          let status;
          if (identityStatus === verifyStatuses.IdentityVerified) {
            status = ChallengeStatus.Passed;
          } else {
            status = done ? ChallengeStatus.Passed : ChallengeStatus.Pending;
          }

          _challenges[key as keyof ChallengeStore] = {
            type: 'matrixChallenge',
            status,
            code: !done ? pendingChallenges[key] : undefined,
          };
        });

      // Simple deep equality check for challenges object
      const hasChanges = JSON.stringify(challenges) !== JSON.stringify(_challenges);
      if (!hasChanges) {
        console.log('No changes in challenges');
        return;
      }

      console.debug({ _challenges })
      setChallenges(_challenges);

      console.log({
        origin: 'challengeState',
        pendingChallenges,
        verifyState,
        challenges: _challenges,
      });
    }
  }, [challengeState, webSocketInstance.error, address, identityStatus, network, challenges]);

  return {
    isConnected: webSocketInstance.isConnected,
    error: webSocketInstance.error,
    loading: webSocketInstance.loading,
    connect: webSocketInstance.connect,
    disconnect: webSocketInstance.disconnect,
    challengeState,
    challenges,
    subscribe,
    sendPGPVerification,
  };
};
