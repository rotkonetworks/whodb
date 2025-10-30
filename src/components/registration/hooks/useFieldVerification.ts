import { useEffect, useState } from "react"
import { useVerification } from "@/contexts/verification-context"
import { useSnapshot } from "valtio"
import { identityDraftStore, markFieldVerified } from "@/store/IdentityDraftStore"

type VerifiableField = "email" | "twitter" | "github" | "matrix" | "discord" | "web"

export function useFieldVerification(fieldKey: string, isVerifiable: boolean) {
  const { getFieldStatus, challenges, startVerification } = useVerification()
  const draftSnap = useSnapshot(identityDraftStore)

  const fieldValue = draftSnap.draft[fieldKey as keyof typeof draftSnap.draft]
  const isVerified = draftSnap.verifications[fieldKey]?.isVerified
  const challenge = challenges[fieldKey]

  // Sync verification status from context to store
  useEffect(() => {
    if (!isVerifiable) return

    const status = getFieldStatus(fieldKey as VerifiableField)
    if (status?.status === 'verified' && !isVerified) {
      markFieldVerified(fieldKey as VerifiableField)
    }
  }, [getFieldStatus, fieldKey, isVerifiable, isVerified])

  // Manual verification request function
  const requestVerification = () => {
    if (!isVerifiable || !fieldValue || isVerified) return
    startVerification(fieldKey, "code", fieldKey)
  }

  return {
    isVerified,
    challenge,
    hasChallenge: Boolean(challenge?.code),
    requestVerification,
  }
}
