import { Challenge, ChallengeStatus, ChallengeStore } from "@/store/challengesStore"
import type React from "react"
import { createContext, useCallback, useContext, useState, useEffect } from "react";
import { toast } from "sonner"
import { SS58String } from 'polkadot-api';

import { IdentityVerificationStatus } from '@/types/Identity';
import { useChallengeWebSocket, ResponseAccountState, VerifyPGPKeyMessage, InitiateChallengeMessage } from '../hooks/websocket/challenges';
import { useTriggerLog } from "@/hooks/use-trigger-log";
import { useWebSocketContext } from "./web-socket-provider";

export type ChallengeType = keyof Omit<ChallengeStore, "display">
type ExtraConfirmationData = {
  "email": never
  "matrix": never
  "twitter": never
  "website": never
  "github": never
  "pgp_fingerprint": VerifyPGPKeyMessage
  "discord": never
  "image": never
  "legal": never
  "web": never
}

export interface FieldVerification {
  field: ChallengeType
  status: "unverified" | "pending" | "verified" | "failed"
  lastVerified?: string
  verificationMethod?: string
  verificationPayload?: string
}

const VerificationContext = createContext<VerificationContextType | undefined>(undefined)
interface VerificationContextType {
  verifications: FieldVerification[]
  startVerification: (
    field: string,
    methodType: "code" | "oauth" | "dns-challenge" | "challenge" | "challenge-url" | "gpg-challenge",
    label: string,
  ) => Promise<string | null>
  confirmVerification: (
    field: ChallengeType,
    extraConfirmationData: ExtraConfirmationData[ChallengeType]
  ) => Promise<boolean>
  getFieldStatus: (field: ChallengeType) => FieldVerification | null
  isVerifying: (field: ChallengeType) => boolean
  getVerifiedFields: () => FieldVerification[]
  getAllFilledFields: (formData: Record<string, string>) => string[]
  resetFieldVerification: (field: ChallengeType) => void
  setInitialVerifications: (initialStates: FieldVerification[]) => void
  // Add challenges from WebSocket API
  setChallenges: (challenges: Record<string, { code: string; status: any }>) => void
  // Add PGP verification function
  setSendPGPVerification: (fn: (payload: { pubkey: string; signed_challenge: string; network: string; account: string }) => Promise<void>) => void

  // WebSocket integration
  setWebSocketParams: (params: ChallengeWebSocketParameters) => void
  isConnected: boolean
  error: string | null
  isLoading: boolean
  challengeState: ResponseAccountState | null
  challenges: ChallengeStore
  wsSubscribe: () => void
  wsConnect: () => void
  wsDisconnect: () => void
  wsSendPGPVerification: (payload: VerifyPGPKeyMessage) => Promise<void>
  wsInitiateChallenge: (payload: InitiateChallengeMessage) => Promise<void>
}

const initialVerificationFields: FieldVerification[] = [
  { field: "email", status: "unverified" },
  { field: "matrix", status: "unverified" },
  { field: "twitter", status: "unverified" },
  { field: "web", status: "unverified" },
  { field: "github", status: "unverified" },
  { field: "pgp_fingerprint", status: "unverified" },
  { field: "discord", status: "unverified" },
  { field: "image", status: "unverified" },
  { field: "legal", status: "unverified" },
]

type ChallengeWebSocketParameters = {
  address?: SS58String;
  network?: string;
  identityStatus: IdentityVerificationStatus;
};

const CHALLENGE_STATUSES_TO_STATES: Partial<Record<ChallengeStatus, FieldVerification["status"]>> = {
  [ChallengeStatus.Failed]: "failed",
  [ChallengeStatus.Passed]: "verified",
  [ChallengeStatus.Pending]: "pending",
}

const CHALLENGE_TYPES: Partial<Record<ChallengeType, string>> = {
  "pgp_fingerprint": "gpg",
  "github": "oauth",
}

export function VerificationProvider({ children }: { children: React.ReactNode }) {
  const [verifications, setVerifications] = useState<FieldVerification[]>(initialVerificationFields)
  const [verifyingFields, setVerifyingFields] = useState<Set<string>>(new Set())
  const [challenges, setChallenges] = useState<Record<string, { code: string; status: any }>>({})
  const [sendPGPVerification, setSendPGPVerification] = useState<((payload: { pubkey: string; signed_challenge: string; network: string; account: string }) => Promise<void>) | null>(null)

  // WebSocket parameters
  const [wsParams, setWsParams] = useState<ChallengeWebSocketParameters>({
    address: undefined,
    network: undefined,
    identityStatus: IdentityVerificationStatus.Unknown,
  })

  // Initialize WebSocket hook with optional parameters
  const webSocketInstance = useWebSocketContext();
  useTriggerLog(webSocketInstance, "verification-context webSocketInstance");
  const challengeWebSocket = useChallengeWebSocket(
    webSocketInstance,
    wsParams.identityStatus,
    wsParams.address,
    wsParams.network,
  )

  // Update local challenges state when WebSocket provides new data
  useEffect(() => {
    if (challengeWebSocket.challenges) {
      // Convert ChallengeStore to the expected format
      const newChallenges: Record<string, { code: string; status: any }> = {};
      Object.entries(challengeWebSocket.challenges).forEach(([key, challenge]) => {
        if (challenge && typeof challenge === 'object' && 'code' in challenge && 'status' in challenge) {
          newChallenges[key] = {
            code: challenge.code || '',
            status: challenge.status,
          };
        }
      });

      setChallenges(newChallenges);
    }
  }, [challengeWebSocket.challenges])

  // Set up PGP verification function from WebSocket
  useEffect(() => {
    setSendPGPVerification(() => challengeWebSocket.sendPGPVerification);
  }, [challengeWebSocket.sendPGPVerification])
  useTriggerLog(challengeWebSocket.sendPGPVerification, "sendPGPVerification")

  const setWebSocketParams = useCallback((params: ChallengeWebSocketParameters) => {
    
    // Reset all verification state when account/network changes
    setVerifications(initialVerificationFields);
    setVerifyingFields(new Set());
    setChallenges({});
    
    // Update WebSocket parameters
    setWsParams(params);
  }, []);

  const isVerifying = useCallback((field: string) => verifyingFields.has(field), [verifyingFields])

  const resetFieldVerification = useCallback((fieldToReset: string) => {
    setVerifications((prev) =>
      prev.map((v) =>
        v.field === fieldToReset
          ? { ...initialVerificationFields.find((f) => f.field === fieldToReset)!, status: "unverified" } // Reset to initial unverified state
          : v,
      ),
    )
    // No toast here, change is silent until user tries to save or explicitly verifies
  }, [])

  const setInitialVerifications = useCallback((initialStates: FieldVerification[]) => {
    // This function could be used if loading an existing profile into the form
    // to set their known verification states. For now, editing resets all to unverified.
    // A more sophisticated approach would merge initialStates with initialVerificationFields.
    // For now, editing will always require re-verification of changed fields.
    // So, this function might not be strictly needed if resetFieldVerification is used on field change.
    // However, it's good to have for potential future use.
    const updatedVerifications = initialVerificationFields.map((initialField) => {
      const existingState = initialStates.find((s) => s.field === initialField.field)
      return existingState ? { ...initialField, ...existingState } : initialField
    })
    setVerifications(updatedVerifications)
  }, [])
  // Helper function to convert WebSocket challenges to field verifications
  const convertChallengeToVerification = (key: string, challenge: Challenge): FieldVerification => ({
    field: key as ChallengeType,
    status: CHALLENGE_STATUSES_TO_STATES[challenge.status] || "unverified",
    verificationMethod: CHALLENGE_TYPES[key as ChallengeType] || "code",
    verificationPayload: challenge.code,
  });

  // Update verifications when WebSocket challenges change
  useEffect(() => {
    const newVerifications: FieldVerification[] = Object.entries(challengeWebSocket.challenges)
      .map(([key, challenge]: [string, Challenge]) => {
        return convertChallengeToVerification(key, challenge);
      });

    setVerifications(newVerifications);

    // Note: We compute identity hash from on-chain data, not from backend
    // See setCurrentIdentityHash() in RegistrationOrchestrator/ProfilePage
    // where we compute hash after fetching from chain (trustless)
  }, [challengeWebSocket.challenges, challengeWebSocket.challengeState]);

  const startVerification = async (
    field: string,
    _methodType: "code" | "oauth" | "dns-challenge" | "challenge" | "challenge-url" | "gpg-challenge",
    label: string,
  ): Promise<string | null> => {
    setFieldVerifying(field, true);

    // Check if we have a challenge from WebSocket for this field
    const websocketChallenge = challenges[field];
    
    if (websocketChallenge?.code) {
      toast.info(`Using verification challenge for ${label}...`);
      
      updateVerificationState(field, "pending");
      setFieldVerifying(field, false);
      
      return websocketChallenge.code;
    }

    // Set a timeout to show error if no challenge is found
    window.setTimeout(() => {
      if (!challenges[field]?.code) {
        toast.error(`No verification challenge available for ${label}. Please try again later.`);
        setFieldVerifying(field, false);
      }
    }, 10000);

    return null;
  }

  // Helper function to handle PGP verification
  const handlePGPVerification = async (
    field: ChallengeType, 
    extraConfirmationData: VerifyPGPKeyMessage
  ): Promise<boolean> => {
    if (!sendPGPVerification) {
      toast.error("PGP verification service not available")
      return false
    }

    try {
      await sendPGPVerification(extraConfirmationData)
      toast.success("PGP verification successful!")
      return true
    } catch (error) {
      toast.error(`PGP verification failed: ${error}`)
      return false
    }
  }

  // Helper function to refresh WebSocket data
  const refreshWebSocketData = async (): Promise<void> => {
    challengeWebSocket.subscribe()
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  // Helper function to check WebSocket verification status
  const checkWebSocketVerificationStatus = (field: ChallengeType): {
    isVerified: boolean
    wsChallenge: Challenge | undefined
  } => {
    const wsChallenge = challengeWebSocket.challenges[field]
    const isVerified = wsChallenge?.status === ChallengeStatus.Passed
    
    return { isVerified, wsChallenge }
  }

  // Helper function to update verification state
  const updateVerificationState = (
    field: ChallengeType, 
    status: "verified" | "pending" | "failed"
  ): void => {
    setVerifications((prev) =>
      prev.map((v) =>
        v.field === field
          ? {
            ...v,
            status,
            lastVerified: status === "verified" ? new Date().toISOString() : undefined,
            verificationPayload: status === "verified" ? undefined : v.verificationPayload,
          }
          : v,
      ),
    )
  }

  // Helper function to show verification result messages
  const showVerificationResult = (
    field: ChallengeType,
    isVerified: boolean,
    wsChallenge: Challenge | undefined
  ): void => {
    const fieldState = verifications.find((v) => v.field === field)
    const verificationMethodLabel = fieldState?.verificationMethod || field

    if (isVerified) {
      toast.success(`${verificationMethodLabel} has been successfully verified!`)
    } else if (wsChallenge) {
      toast.info(`${verificationMethodLabel} verification is still pending. Please complete the challenge and try again.`)
    } else {
      toast.error(`No verification challenge found for ${verificationMethodLabel}. Please try again later.`)
    }
  }

  // Helper function to manage verifying fields state
  const setFieldVerifying = (field: ChallengeType, isVerifying: boolean): void => {
    setVerifyingFields((prev) => {
      const next = new Set(prev)
      if (isVerifying) {
        next.add(field)
      } else {
        next.delete(field)
      }
      return next
    })
  }

  const confirmVerification = async (
    field: ChallengeType,
    extraConfirmationData: ExtraConfirmationData[ChallengeType]
  ): Promise<boolean> => {
    // Start verification process
    setFieldVerifying(field, true)
    const fieldState = verifications.find((v) => v.field === field)
    toast.info(`Checking verification status for ${fieldState?.verificationMethod || field}...`)

    try {
      // Handle PGP verification separately
      if (field === "pgp_fingerprint" && extraConfirmationData?.signed_challenge) {
        const isVerified = await handlePGPVerification(field, extraConfirmationData as VerifyPGPKeyMessage)
        updateVerificationState(field, isVerified ? "verified" : "failed")
        return isVerified
      }

      // For other verification types, check WebSocket state
      await refreshWebSocketData()
      const { isVerified, wsChallenge } = checkWebSocketVerificationStatus(field)

      // Update state and show result
      const status = isVerified ? "verified" : (wsChallenge ? "pending" : "failed")
      updateVerificationState(field, status)
      showVerificationResult(field, isVerified, wsChallenge)

      return isVerified
    } finally {
      // Always stop the verifying state
      setFieldVerifying(field, false)
    }
  }

  const getFieldStatus = useCallback((field: string) => {
    return verifications.find((v) => v.field === field) || null
  }, [verifications])

  const getVerifiedFields = useCallback(() => {
    return verifications.filter((v) => v.status === "verified")
  }, [verifications])

  const getAllFilledFields = useCallback((formData: Record<string, string>) => {
    const { nickname, ...relevantData } = formData
    return Object.keys(relevantData).filter((key) => relevantData[key] && relevantData[key].trim() !== "")
  }, [])

  return (
    <VerificationContext.Provider
      value={{
        verifications,
        startVerification,
        confirmVerification,
        getFieldStatus,
        isVerifying,
        getVerifiedFields,
        getAllFilledFields,
        resetFieldVerification,
        setInitialVerifications,
        setChallenges,
        setSendPGPVerification,
        // WebSocket integration
        setWebSocketParams,
        isConnected: challengeWebSocket.isConnected,
        error: challengeWebSocket.error,
        isLoading: challengeWebSocket.loading,
        challengeState: challengeWebSocket.challengeState || null,
        challenges: challengeWebSocket.challenges,
        wsSubscribe: challengeWebSocket.subscribe,
        wsConnect: challengeWebSocket.connect,
        wsDisconnect: challengeWebSocket.disconnect,
        wsSendPGPVerification: challengeWebSocket.sendPGPVerification,
        wsInitiateChallenge: challengeWebSocket.initiateChallenge,
      }}
    >
      {children}
    </VerificationContext.Provider>
  )
}

export function useVerification() {
  const context = useContext(VerificationContext)
  if (context === undefined) {
    throw new Error("useVerification must be used within a VerificationProvider")
  }
  return context
}
