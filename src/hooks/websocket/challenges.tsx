import { ChallengeStatus, ChallengeStore } from '@/store/challengesStore';
import { IdentityVerificationStatus } from '@/types/Identity';
import { SS58String } from 'polkadot-api';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  info: any;
  verification_state: VerificationState;
}

export interface PendingChallenge {
  account_name: string;
  account_type: string;
  challenge: string;
}

export interface ResponseAccountState {
  account: string;
  network?: string;
  hashed_info: string;
  verification_state: VerificationState;
  pending_challenges: PendingChallenge[];
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

export interface InitiateChallengeMessage {
  network: string;
  account: string;
  field_type: string;
  field_value: string;
}

export interface ChallengeWebSocketReturn extends Pick<WebSocketHookReturn, 'isConnected' | 'error' | 'loading' | 'connect' | 'disconnect'> {
  challengeState: ResponseAccountState | null;
  challenges: ChallengeStore;
  subscribe: () => void;
  sendPGPVerification: (payload: VerifyPGPKeyMessage) => Promise<void>;
  initiateChallenge: (payload: InitiateChallengeMessage) => Promise<void>;
}

// Workaround for old API
const keyMapping: Record<string, string> = {
  'p_g_p_fingerprint': 'pgp_fingerprint',
};

interface Challenge {
  type: string;
  status: ChallengeStatus;
  code?: string;
  accountName?: string;
}

/**
 * Challenge WebSocket hook that handles challenge subscriptions, PGP verification,
 * and challenge state management. Uses the main WebSocket for communication.
 */
export const useChallengeWebSocket = (
  webSocketInstance: WebSocketHookReturn,
  identityStatus: IdentityVerificationStatus,
  _address?: SS58String,
  _network?: string,
): ChallengeWebSocketReturn => {
  if (!webSocketInstance) {
    throw new Error('WebSocket instance is required');
  }

  const network = useMemo(() => _network?.toLowerCase().split('_')[0], [_network]);
  const address = useMemo(() => _address, [_address]);
  const cleanNetwork = network?.toLowerCase?.().split('_')[0];

  const [challengeState, setChallengeState] = useState<ResponseAccountState | null>(null);
  const [challenges, setChallenges] = useState<ChallengeStore>({});
  const [hasSubscribed, setHasSubscribed] = useState(false);

  const unsubscribeRef = useRef<() => void>(() => { });
  const prevParamsRef = useRef<string | null>(null);

  // Reset state when address or network changes
  useEffect(() => {
    const paramsKey = `${address}-${network}`;
    if (prevParamsRef.current !== null && prevParamsRef.current !== paramsKey) {
      setChallenges({});
      setChallengeState(null);
      setHasSubscribed(false);
      unsubscribeRef.current();
      unsubscribeRef.current = () => { };
    }
    prevParamsRef.current = paramsKey;
  }, [address, network]);

  // Handle incoming messages
  const handleMessage = useCallback((message: any) => {
    if (message.type === 'JsonResult') {
      if (message.payload?.type === 'ok' && message.payload.message) {
        const payload = message.payload.message;
        if (typeof payload === 'object') {
          const response: ResponseAccountState = (payload as ResponsePayload).AccountState;
          if (response) {
            setChallengeState({ ...response, network: response.network });
          }
        }
      }
    }
  }, []);

  // Subscribe to account state updates
  const subscribe = useCallback(() => {
    if (!hasSubscribed && webSocketInstance.isConnected && address && cleanNetwork) {
      setHasSubscribed(true);

      const message = {
        type: 'SubscribeAccountState' as const,
        payload: { account: address, network: cleanNetwork },
        version: '1.1',
      };

      try {
        webSocketInstance.sendMessage(message);
        unsubscribeRef.current = webSocketInstance.subscribe(handleMessage);
      } catch {
        setHasSubscribed(false);
      }
    }
  }, [webSocketInstance, address, cleanNetwork, hasSubscribed, handleMessage]);

  // Send PGP verification
  const sendPGPVerification = useCallback(
    async (payload: VerifyPGPKeyMessage): Promise<void> => {
      await webSocketInstance.sendMessage({ type: 'VerifyPGPKey', payload });
    },
    [webSocketInstance]
  );

  // Initiate challenge for a field
  const initiateChallenge = useCallback(
    async (payload: InitiateChallengeMessage): Promise<void> => {
      await webSocketInstance.sendMessage({
        type: 'InitiateChallenge',
        version: '1.1',
        payload,
      });
    },
    [webSocketInstance]
  );

  // Auto-subscribe when connected
  useEffect(() => {
    if (webSocketInstance.isConnected && address && cleanNetwork && !hasSubscribed) {
      const timeoutId = setTimeout(subscribe, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [webSocketInstance.isConnected, address, cleanNetwork, hasSubscribed, subscribe]);

  // Normalize pending challenges from WebSocket format
  const normalizePendingChallenges = useCallback((pending_challenges: any[]): Record<string, {code: string, accountName: string}> => {
    const normalized: Record<string, {code: string, accountName: string}> = {};

    if (!Array.isArray(pending_challenges)) return normalized;

    pending_challenges.forEach((item) => {
      // Handle object format
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        const { account_name, account_type, challenge } = item;
        if (account_type && challenge) {
          const fieldName = keyMapping[account_type] || account_type;
          normalized[fieldName] = { code: challenge, accountName: account_name || account_type };
        }
      }
      // Handle nested array format
      else if (Array.isArray(item)) {
        item.forEach((arr) => {
          if (Array.isArray(arr)) {
            arr.forEach((pair) => {
              if (Array.isArray(pair) && pair.length === 2) {
                const [account_type, challenge] = pair;
                const fieldName = keyMapping[account_type] || account_type;
                normalized[fieldName] = { code: challenge, accountName: account_type };
              }
            });
          }
        });
      }
    });

    return normalized;
  }, []);

  // Determine challenge status
  const getChallengeStatus = useCallback((isVerified: boolean, status: IdentityVerificationStatus): ChallengeStatus => {
    if (status === IdentityVerificationStatus.IdentityVerified) return ChallengeStatus.Passed;
    return isVerified ? ChallengeStatus.Passed : ChallengeStatus.Pending;
  }, []);

  // Main challenge processing effect
  useEffect(() => {
    if (webSocketInstance.error || !challengeState || !identityStatus) return;

    const { pending_challenges, verification_state: { fields: verifyState } } = challengeState;
    const pendingChallenges = normalizePendingChallenges(pending_challenges);

    const newChallenges: ChallengeStore = {};
    const allFields = new Set([...Object.keys(verifyState || {}), ...Object.keys(pendingChallenges || {})]);

    allFields.forEach((key) => {
      const isVerified = verifyState[key] || false;
      const hasPending = !!pendingChallenges[key];

      if (hasPending || (identityStatus === IdentityVerificationStatus.IdentityVerified && isVerified)) {
        const status = getChallengeStatus(
          identityStatus === IdentityVerificationStatus.IdentityVerified && isVerified,
          identityStatus
        );
        const info = pendingChallenges[key];

        newChallenges[key as keyof ChallengeStore] = {
          type: 'matrixChallenge',
          status,
          code: !isVerified ? info?.code : undefined,
          accountName: !isVerified ? info?.accountName : undefined,
        } as Challenge;
      }
    });

    // Only update if changed
    if (JSON.stringify(challenges) !== JSON.stringify(newChallenges)) {
      setChallenges(newChallenges);
    }
  }, [challengeState, webSocketInstance.error, identityStatus, normalizePendingChallenges, getChallengeStatus, challenges]);

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
    initiateChallenge,
  };
};
