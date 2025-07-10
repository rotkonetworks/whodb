"use client"

import type React from "react"
import { createContext, useContext, useState, useCallback } from "react" // Added useCallback
import { toast } from "sonner"

export interface FieldVerification {
  field: string
  status: "unverified" | "pending" | "verified" | "failed"
  lastVerified?: string
  verificationMethod?: string
  verificationPayload?: string
}

interface VerificationContextType {
  verifications: FieldVerification[]
  startVerification: (
    field: string,
    methodType: "code" | "oauth" | "dns-challenge" | "challenge" | "challenge-url" | "gpg-challenge",
    label: string,
  ) => Promise<string | null>
  confirmVerification: (field: string, signedChallenge?: string) => Promise<boolean>
  getFieldStatus: (field: string) => FieldVerification | null
  isVerifying: (field: string) => boolean
  getVerifiedFields: () => FieldVerification[]
  getAllFilledFields: (formData: Record<string, string>) => string[]
  resetFieldVerification: (field: string) => void
  setInitialVerifications: (initialStates: FieldVerification[]) => void
  // Add challenges from WebSocket API
  setChallenges: (challenges: Record<string, { code: string; status: any }>) => void
  // Add PGP verification function
  setSendPGPVerification: (fn: (payload: { pubkey: string; signed_challenge: string; network: string; account: string }) => Promise<void>) => void
}

const VerificationContext = createContext<VerificationContextType | undefined>(undefined)

const initialVerificationFields: FieldVerification[] = [
  { field: "email", status: "unverified" },
  { field: "matrix", status: "unverified" },
  { field: "twitter", status: "unverified" },
  { field: "website", status: "unverified" },
  { field: "github", status: "unverified" },
  { field: "pgpFingerprint", status: "unverified" },
  { field: "discord", status: "unverified" },
  { field: "image", status: "unverified" },
  { field: "legal", status: "unverified" },
]

export function VerificationProvider({ children }: { children: React.ReactNode }) {
  const [verifications, setVerifications] = useState<FieldVerification[]>(initialVerificationFields)
  const [verifyingFields, setVerifyingFields] = useState<Set<string>>(new Set())
  const [challenges, setChallenges] = useState<Record<string, { code: string; status: any }>>({})
  const [sendPGPVerification, setSendPGPVerification] = useState<((payload: { pubkey: string; signed_challenge: string; network: string; account: string }) => Promise<void>) | null>(null)

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

  const startVerification = async (
    field: string,
    methodType: "code" | "oauth" | "dns-challenge" | "challenge" | "challenge-url" | "gpg-challenge",
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

  const confirmVerification = async (field: string, signedChallenge?: string): Promise<boolean> => {
    setVerifyingFields((prev) => new Set(prev).add(field))
    const fieldState = verifications.find((v) => v.field === field)
    toast.info(`Checking verification status for ${fieldState?.verificationMethod || field}...`)

    if (field === "pgpFingerprint" && signedChallenge && sendPGPVerification) {
      try {
        // Use the real PGP verification function from the API
        await sendPGPVerification({
          pubkey: "USER_PGP_KEY", // This would need to be extracted from the signed challenge
          signed_challenge: signedChallenge,
          network: "current_network", // This would be passed from context
          account: "current_account", // This would be passed from context
        })

        setVerifications((prev) =>
          prev.map((v) =>
            v.field === field
              ? {
                ...v,
                status: "verified",
                lastVerified: new Date().toISOString(),
                verificationPayload: undefined,
              }
              : v,
          ),
        )

        setVerifyingFields((prev) => {
          const next = new Set(prev)
          next.delete(field)
          return next
        })

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
    if (field === "pgpFingerprint" && signedChallenge) {
      console.log("PGP Verification Data:", {
        fingerprint: "USER_FINGERPRINT_HERE", // This should be the actual fingerprint from form
        originalChallenge: fieldState?.verificationPayload,
        signedChallenge: signedChallenge,
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

  const getFieldStatus = useCallback(
    (field: string) => {
      return verifications.find((v) => v.field === field) || null
    },
    [verifications],
  )

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
