import { ChallengeStatus, ChallengeStore } from '@/store/challengesStore';
import { IdentityInfo, IdentityVerificationStatus } from '@/types/Identity';
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
  identityStatus: IdentityVerificationStatus,
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
        version: '1.0',
      };

      try {
        webSocketInstance.sendMessage(message);
        unsubscribe.current = webSocketInstance.subscribe(handleMessage);
        console.log('WebSocket subscription successful - automatically fetching pending challenges:', message);
      } catch (err) {
        console.error('WebSocket subscription failed:', err);
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
    console.log('🔵 Challenge WebSocket message received');
    console.log('🔵 Message type:', message.type);

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
              console.log('🟢 Account state received with pending challenges');
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

  // Helper function to normalize pending challenges from new format
  const normalizePendingChallenges = (pending_challenges: PendingChallenge[]): Record<string, {code: string, accountName: string}> => {
    const normalizedChallenges: Record<string, {code: string, accountName: string}> = {};
    
    pending_challenges.forEach((challengeObj) => {
      const { account_name, account_type, challenge } = challengeObj;
      
      // Map account_type to field name (account_type should match our field names like "email", "twitter", etc.)
      const fieldName = keyMapping[account_type] || account_type;
      
      normalizedChallenges[fieldName] = {
        code: challenge,
        accountName: account_name
      };
    });
    return normalizedChallenges;
  };

  // Helper function to determine challenge status
  const getChallengeStatus = (isFieldVerified: boolean, identityStatus: IdentityVerificationStatus): ChallengeStatus => {
    if (identityStatus === IdentityVerificationStatus.IdentityVerified) {
      return ChallengeStatus.Passed;
    }
    return isFieldVerified ? ChallengeStatus.Passed : ChallengeStatus.Pending;
  };

  // Helper function to create challenge object
  const createChallenge = (
    fieldKey: string,
    isFieldVerified: boolean,
    identityStatus: IdentityVerificationStatus,
    pendingChallenges: Record<string, {code: string, accountName: string}>
  ): Challenge => {
    const status = getChallengeStatus(isFieldVerified, identityStatus);
    const challengeInfo = pendingChallenges[fieldKey];
    const challengeCode = !isFieldVerified ? challengeInfo?.code : undefined;
    const accountName = !isFieldVerified ? challengeInfo?.accountName : undefined;


    return {
      type: 'matrixChallenge',
      status,
      code: challengeCode,
      accountName: accountName,
    };
  };

  // Helper function to process verification state into challenges
  const processVerificationState = (
    verifyState: Record<string, boolean>,
    pendingChallenges: Record<string, {code: string, accountName: string}>,
    identityStatus: IdentityVerificationStatus
  ): ChallengeStore => {
    const challenges: ChallengeStore = {};

    // Get all unique field names from both verifyState AND pendingChallenges
    const allFieldNames = new Set([
      ...Object.keys(verifyState || {}),
      ...Object.keys(pendingChallenges || {})
    ]);

    allFieldNames.forEach((key) => {
      const boolValue = verifyState[key] || false; // Default to false if not in verifyState
      const hasPendingChallenge = !!pendingChallenges[key];
      
      // Include field if:
      // 1. It has a pending challenge (regardless of verification state), OR
      // 2. Identity is fully verified AND field is true in verification state
      if (hasPendingChallenge || (identityStatus === IdentityVerificationStatus.IdentityVerified && boolValue)) {
        challenges[key as keyof ChallengeStore] = createChallenge(
          key,
          // Only mark as verified if identity is fully verified AND the field is true
          identityStatus === IdentityVerificationStatus.IdentityVerified && boolValue,
          identityStatus,
          pendingChallenges
        );
      }
    });
    return challenges;
  };

  // Helper function to check if challenges have changed
  const hasChanges = (oldChallenges: ChallengeStore, newChallenges: ChallengeStore): boolean => {
    return JSON.stringify(oldChallenges) !== JSON.stringify(newChallenges);
  };

  // Main challenge processing effect
  useEffect(() => {
    const dependencies = [challengeState, webSocketInstance.error, address, identityStatus, network];
    console.log('Challenge dependencies changed:', { dependencies });

    // Early returns for invalid states
    if (webSocketInstance.error) {
      console.error('WebSocket error:', webSocketInstance.error);
      return;
    }

    if (dependencies.some((value) => value === undefined)) {
      console.log('Missing required dependencies');
      return;
    }

    if (!challengeState || !identityStatus) {
      console.log('Missing challenge state or identity status');
      return;
    }

    // Process challenge state
    const { pending_challenges, verification_state: { fields: verifyState } } = challengeState;
    
    const pendingChallenges = normalizePendingChallenges(pending_challenges);
    const newChallenges = processVerificationState(verifyState, pendingChallenges, identityStatus);

    // Only update if there are actual changes
    if (!hasChanges(challenges, newChallenges)) {
      return;
    }
    
    setChallenges(newChallenges);
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
