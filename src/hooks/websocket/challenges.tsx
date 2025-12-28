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
  // Track previous address/network to detect actual changes
  const prevParamsRef = useRef<string | null>(null);

  // Reset state ONLY when address or network changes (not on connection state changes)
  useEffect(() => {
    const paramsKey = `${address}-${network}`;

    // Only reset if params actually changed (not on initial mount or connection state changes)
    if (prevParamsRef.current !== null && prevParamsRef.current !== paramsKey) {
      console.log('🔄 Address/network changed, resetting challenge state');
      setChallenges({});
      setChallengeState(null);
      setHasSubscribed(false);
      unsubscribe.current();
      unsubscribe.current = () => { };
    }

    prevParamsRef.current = paramsKey;
  }, [address, network]);
  useTriggerLog(webSocketInstance, "webSocketInstance");

  // Subscribe to account state updates
  const subscribe = useCallback(() => {
    if (!hasSubscribed && webSocketInstance.isConnected && address && cleanNetwork) {
      setHasSubscribed(true);
      console.log(`Subscribing to account state`);

      const message = {
        type: 'SubscribeAccountState' as const,
        payload: {
          account: address,
          network: cleanNetwork,
        },
        version: '1.1',
      };

      try {
        webSocketInstance.sendMessage(message);
        unsubscribe.current = webSocketInstance.subscribe(handleMessage);
        console.log('WebSocket subscription successful - automatically fetching pending challenges');
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
    console.log('🔵 RAW WebSocket message received:', message);
    console.log('🔵 WebSocket message JSON:', JSON.stringify(message, null, 2));
    console.log('🔵 Message type:', message.type);

    switch (message.type) {
      case 'JsonResult':
        console.log('🔵 JsonResult payload:', JSON.stringify(message.payload, null, 2));
        if (message.payload.type === 'ok') {
          console.log('🔵 Payload message type:', typeof message.payload.message);
          console.log('🔵 Payload message content:', JSON.stringify(message.payload.message, null, 2));
          
          if (typeof message.payload.message === 'string') {
            if (message.payload.message === 'PGP verification is done') {
              console.log('PGP verification completed');
            }
          } else if (message.payload.message && typeof message.payload.message === 'object') {
            console.log('🔵 Processing object message:', message.payload.message);
            const response: ResponseAccountState = (message.payload.message as ResponsePayload).AccountState;
            console.log('🔵 Extracted AccountState');
            
            if (response) {
              console.log('🟢 Account state received with challenges and verification data');
              
              setChallengeState({
                ...response,
                network: response.network,
              });
            } else {
              console.log('❌ No AccountState found in message');
            }
          }
        } else {
          console.error('Challenge WebSocket error - payload not ok:', message.payload.message);
        }
        break;

      case 'error':
        console.error('Challenge WebSocket error:', message.message);
        break;
      
      default:
        console.log('🔵 Unknown message type:', message.type, message);
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

  // Helper function to normalize pending challenges from WebSocket format
  const normalizePendingChallenges = (pending_challenges: any[]): Record<string, {code: string, accountName: string}> => {
    const normalizedChallenges: Record<string, {code: string, accountName: string}> = {};
    
    console.log('🔍 Processing pending challenges:', pending_challenges?.length || 0);
    
    if (!Array.isArray(pending_challenges)) {
      console.log('⚠️ pending_challenges is not an array');
      return normalizedChallenges;
    }
    
    // Handle both object and nested array formats
    pending_challenges.forEach((challengeItem, index) => {
      console.log(`🔍 Processing challenge item ${index}`);
      
      // Handle object format: {account_name: "...", account_type: "email", challenge: "..."}
      if (challengeItem && typeof challengeItem === 'object' && !Array.isArray(challengeItem)) {
        const { account_name, account_type, challenge } = challengeItem;
        
        if (account_type && challenge) {
          const fieldName = keyMapping[account_type] || account_type;
          
          console.log(`✅ Found challenge object: ${account_type} -> ${fieldName}`);
          normalizedChallenges[fieldName] = {
            code: challenge,
            accountName: account_name || account_type
          };
          console.log(`✅ Added challenge to normalized list`);
        } else {
          console.log(`⚠️ Missing required fields in challenge object`);
        }
      }
      // Handle nested array format: [[["email","QHX9WXY6"]],[["matrix","GV7P976N"]]]
      else if (Array.isArray(challengeItem)) {
        console.log(`🔍 Processing nested array format for item ${index}`);
        challengeItem.forEach((challengeArray, arrayIndex) => {
          console.log(`🔍 Processing challenge array ${index}.${arrayIndex}`);
          
          if (Array.isArray(challengeArray)) {
            challengeArray.forEach((challengePair, pairIndex) => {
              console.log(`🔍 Processing challenge pair ${index}.${arrayIndex}.${pairIndex}`);
              
              if (Array.isArray(challengePair) && challengePair.length === 2) {
                const [account_type, challenge] = challengePair;
                const fieldName = keyMapping[account_type] || account_type;
                
                console.log(`✅ Found challenge array: ${account_type} -> ${fieldName}`);
                normalizedChallenges[fieldName] = {
                  code: challenge,
                  accountName: account_type
                };
                console.log(`✅ Added challenge to normalized list`);
              }
            });
          }
        });
      } else {
        console.log(`⚠️ Unknown challenge format at index ${index}`);
      }
    });
    
    console.log('🔍 Final normalized challenges count:', Object.keys(normalizedChallenges).length);
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
    console.log('🔧 processVerificationState called with:', {
      verifyState,
      pendingChallenges,
      identityStatus
    });

    const challenges: ChallengeStore = {};

    // Get all unique field names from both verifyState AND pendingChallenges
    const allFieldNames = new Set([
      ...Object.keys(verifyState || {}),
      ...Object.keys(pendingChallenges || {})
    ]);

    console.log('🔧 All field names:', Array.from(allFieldNames));

    allFieldNames.forEach((key) => {
      const boolValue = verifyState[key] || false; // Default to false if not in verifyState
      const hasPendingChallenge = !!pendingChallenges[key];
      
      console.log(`🔧 Processing field ${key}: verified=${boolValue}, hasPending=${hasPendingChallenge}`);
      
      // Include field if:
      // 1. It has a pending challenge (regardless of verification state), OR
      // 2. Identity is fully verified AND field is true in verification state
      if (hasPendingChallenge || (identityStatus === IdentityVerificationStatus.IdentityVerified && boolValue)) {
        const challenge = createChallenge(
          key,
          // Only mark as verified if identity is fully verified AND the field is true
          identityStatus === IdentityVerificationStatus.IdentityVerified && boolValue,
          identityStatus,
          pendingChallenges
        );
        console.log(`✅ Adding challenge for ${key}`);
        challenges[key as keyof ChallengeStore] = challenge;
      } else {
        console.log(`❌ Skipping field ${key} - no pending challenge and not verified`);
      }
    });
    
    console.log('🔧 Final processed challenges count:', Object.keys(challenges).length);
    return challenges;
  };

  // Helper function to check if challenges have changed
  const hasChanges = (oldChallenges: ChallengeStore, newChallenges: ChallengeStore): boolean => {
    return JSON.stringify(oldChallenges) !== JSON.stringify(newChallenges);
  };

  // Main challenge processing effect
  useEffect(() => {
    const dependencies = [challengeState, webSocketInstance.error, address, identityStatus, network];

    // Early returns for invalid states
    if (webSocketInstance.error) {
      return;
    }

    if (dependencies.some((value) => value === undefined)) {
      return;
    }

    if (!challengeState || !identityStatus) {
      return;
    }

    // Process challenge state
    const { pending_challenges, verification_state: { fields: verifyState } } = challengeState;

    const pendingChallenges = normalizePendingChallenges(pending_challenges);

    const newChallenges = processVerificationState(verifyState, pendingChallenges, identityStatus);

    // NOTE: MOCK DATA FOR TESTING - REMOVE AFTER TESTING
    // Mock a verified twitter challenge
    // newChallenges.twitter = {
    //   type: 'twitterChallenge',
    //   status: ChallengeStatus.Passed,
    //   code: undefined,
    //   accountName: '@MOCK',
    // };
    
    // Only update if there are actual changes
    if (!hasChanges(challenges, newChallenges)) {
      return;
    }
    
    console.log('✅ Setting new challenges count:', Object.keys(newChallenges).length);
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
