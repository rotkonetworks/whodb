import { Challenge, ChallengeStatus, ChallengeStore } from "@/store/challengesStore"
import type React from "react"
import { createContext, useCallback, useContext, useState, useEffect } from "react";
import { toast } from "sonner"
import { SS58String } from 'polkadot-api';

import { verifyStatuses } from '@/types/Identity';
import { useChallengeWebSocket, ResponseAccountState, VerifyPGPKeyMessage } from '../hooks/websocket/challenges';
import { useTriggerLog } from "@/hooks/use-trigger-log";
import { useWebSocketContext } from "./web-socket-provider";

type ChallengeType = keyof Omit<ChallengeStore, "display">
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
  identityStatus: verifyStatuses;
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
    identityStatus: verifyStatuses.Unknown,
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
  useEffect(() => {
    const newChallenges: FieldVerification[] = Object.entries(challengeWebSocket.challenges)
      .map(([key, challenge]: [string, Challenge]): FieldVerification => ({
        field: key as ChallengeType,
        status: CHALLENGE_STATUSES_TO_STATES[challenge.status] || "unverified",
        verificationMethod: CHALLENGE_TYPES[key as ChallengeType] || "code",
        verificationPayload: challenge.code,
      }))
    setVerifications(newChallenges)
  }, [challengeWebSocket.challenges])

  const startVerification = async (
    field: string,
    _methodType: "code" | "oauth" | "dns-challenge" | "challenge" | "challenge-url" | "gpg-challenge",
    label: string,
  ): Promise<string | null> => {
    setVerifyingFields((prev) => new Set(prev).add(field))

    // Check if we have a real challenge from WebSocket API for this field
    const websocketChallenge = challenges[field]
    if (websocketChallenge && websocketChallenge.code) {
      toast.info(`Using verification challenge for ${label}...`)

      setVerifications((prev) =>
        prev.map((v) =>
          v.field === field
            ? { ...v, status: "pending", verificationMethod: label, verificationPayload: websocketChallenge.code }
            : v,
        ),
      )

      setVerifyingFields((prev) => {
        const newSet = new Set(prev)
        newSet.delete(field)
        return newSet
      })

      return websocketChallenge.code
    }

    window.setTimeout(() => {
      if (!challenges[field] || !challenges[field].code) {
        toast.error(`No verification challenge available for ${label}. Please try again later.`)
        setVerifyingFields((prev) => {
          const newSet = new Set(prev)
          newSet.delete(field)
          return newSet
        })
      }
    }, 10000)
    return null
  }

  const confirmVerification = async (
    field: ChallengeType,
    extraConfirmationData: ExtraConfirmationData[ChallengeType]
  ): Promise<boolean> => {
    setVerifyingFields((prev) => new Set(prev).add(field))
    const fieldState = verifications.find((v) => v.field === field)
    toast.info(`Checking verification status for ${fieldState?.verificationMethod || field}...`)

    if (field === "pgp_fingerprint" && extraConfirmationData.signed_challenge && sendPGPVerification) {
      try {
        // Use the real PGP verification function from the API
        await sendPGPVerification({
          pubkey: extraConfirmationData.pubkey,
          signed_challenge: extraConfirmationData.signed_challenge,
          network: extraConfirmationData.network,
          account: extraConfirmationData.account,
        })

        return true

        toast.success(`PGP verification successful!`)
        return true

      } catch (error) {
        setVerifications((prev) =>
          prev.map((v) =>
            v.field === field
              ? { ...v, status: "failed" }
              : v,
          ),
        )

        setVerifyingFields((prev) => {
          const next = new Set(prev)
          next.delete(field)
          return next
        })

        toast.error(`PGP verification failed: ${error}`)
        return false
      }
    }

    // For other verification types, use the existing simulation logic
    if (field === "pgp_fingerprint" && extraConfirmationData && 'signed_challenge' in extraConfirmationData) {
      console.log("PGP Verification Data:", {
        fingerprint: "USER_FINGERPRINT_HERE", // This should be the actual fingerprint from form
        originalChallenge: fieldState?.verificationPayload,
        signedChallenge: extraConfirmationData.signed_challenge,
      })
      await new Promise((resolve) => setTimeout(resolve, 3500))
    } else {
      await new Promise((resolve) => setTimeout(resolve, 2500))
    }

    const success = Math.random() > 0.2 // Simulate success/failure

    setVerifications((prev) =>
      prev.map((v) =>
        v.field === field
          ? {
            ...v,
            status: success ? "verified" : "failed",
            lastVerified: success ? new Date().toISOString() : undefined,
            verificationPayload: success ? undefined : v.verificationPayload, // Clear payload on success
          }
          : v,
      ),
    )

    setVerifyingFields((prev) => {
      const next = new Set(prev)
      next.delete(field)
      return next
    })
    const verificationMethodLabel = fieldState?.verificationMethod || field
    if (success) {
      toast.success(`${verificationMethodLabel} has been successfully verified!`)
    } else {
      toast.error(`Verification for ${verificationMethodLabel} failed. Please try again.`)
    }

    return success
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
