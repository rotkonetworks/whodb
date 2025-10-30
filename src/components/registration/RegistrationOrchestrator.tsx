import { useState, useEffect, useMemo } from "react"
import { toast } from "sonner"
import { SS58String } from "polkadot-api"
import BigNumber from "bignumber.js"
import { IdentityData, IdentityVerificationStatus } from "@/types/Identity"
import { usePolkadotApi } from "@/contexts/PolkadotApiContext"
import { useNetwork } from "@/contexts/network-context"
import { useVerification } from "@/contexts/verification-context"
import { InlineIdentityForm } from "@/components/inline-identity-form"
import { ProgressiveIdentityForm } from "@/components/registration/ProgressiveIdentityForm"
import { BalanceDisplay } from "@/components/balance-display"
import { IdentityVerificationForm } from "@/components/identity-verification-form"
import { PaymentPrompt } from "@/components/registration/PaymentPrompt"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert } from "@/components/ui/alert"
import { ListChecks, UserCheck, AlertCircle } from "lucide-react"
import { validateIdentityData, sanitizeIdentityData, type ValidationError } from "@/lib/validation"
import { logger } from "@/utils/logger"
import { registrationRateLimiter, RATE_LIMITS } from "@/utils/rate-limiter"
import {
  validatePgpFingerprint,
  detectSuspiciousPatterns,
  generateTransactionId,
  sanitizeForLogging
} from "@/utils/transaction-security"
import { useSnapshot } from "valtio"
import { identityDraftStore, initializeDraft, setCurrentIdentityHash } from "@/store/IdentityDraftStore"

export enum RegistrationPhase {
  Setup = "setup",
  FormFill = "form_fill",
  Verification = "verification",
  Complete = "complete"
}

interface RegistrationOrchestratorProps {
  walletAddress: SS58String
  onComplete?: () => void
  progressive?: boolean // Use progressive one-field-at-a-time form
}

export function RegistrationOrchestrator({
  walletAddress,
  onComplete,
  progressive = false
}: RegistrationOrchestratorProps) {
  const { networkDisplayName, network } = useNetwork()

  const polkadotApi = usePolkadotApi()
  const {
    identity,
    fetchIdAndJudgement,
    formatAmount,
    balance, // Combined balance (People + AssetHub)
    peopleChainBalance, // CRITICAL: Use this for registration checks
    assetHubBalance,
    chainConstants,
    supportedFields,
    chainStore,
    typedApi,
    signSubmitAndWatch,
  } = polkadotApi

  const { getAllFilledFields, getFieldStatus, setWebSocketParams } = useVerification()

  // Use the draft store as single source of truth
  const draftSnap = useSnapshot(identityDraftStore)
  const identityData = draftSnap.draft

  // Use People chain balance for registration since that's where the tx must be signed
  const registrationBalance = peopleChainBalance || new BigNumber(0)

  useEffect(() => {
    console.log("🔍 Registration balance check:", {
      peopleChainBalance: peopleChainBalance?.toString() || "null",
      registrationBalance: registrationBalance.toString(),
      hasBalance: !!peopleChainBalance,
      isGreaterThanZero: registrationBalance.isGreaterThan(0)
    });
  }, [peopleChainBalance, registrationBalance]);

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [retryCount, setRetryCount] = useState(0)
  const [loadingMessage, setLoadingMessage] = useState<string>("")
  const [userTriedToSubmit, setUserTriedToSubmit] = useState(false)
  const MAX_RETRIES = 3

  // Derive current phase from identity status
  const currentPhase = useMemo(() => {
    if (!identity) return RegistrationPhase.FormFill

    switch (identity.status) {
      case IdentityVerificationStatus.JudgementRequested:
      case IdentityVerificationStatus.FeePaid:
        return RegistrationPhase.Verification
      case IdentityVerificationStatus.IdentityVerified:
        return RegistrationPhase.Complete
      default:
        return RegistrationPhase.FormFill
    }
  }, [identity?.status])

  const handleBalanceRefresh = () => {
    logger.log("User indicated they received tokens - balance subscription will auto-detect")
    // The useCombinedBalance hook is already subscribed and will auto-update
    // No need to do anything - just log for debugging
  }

  // Calculate minimum balance
  const minBalance = useMemo(() =>
    chainConstants
      ? BigNumber(chainConstants.existentialDeposit.toString())
          .plus(BigNumber(chainConstants.byteDeposit.toString()).times(32).times(10))
          .plus(BigNumber(chainConstants.basicDeposit.toString()).multipliedBy(2))
      : null,
    [chainConstants]
  )

  const hasEnoughBalance = useMemo(() => {
    if (!minBalance) return null;
    // peopleChainBalance is null when not loaded yet, BigNumber(0) when explicitly 0
    if (peopleChainBalance === null) return null;

    const hasBalance = registrationBalance.isGreaterThanOrEqualTo(minBalance);
    console.log("💳 Balance check:", {
      registrationBalance: registrationBalance.toString(),
      minBalance: minBalance.toString(),
      hasBalance,
      decimals: chainConstants?.tokenDecimals
    });
    return hasBalance;
  }, [peopleChainBalance, registrationBalance, minBalance, chainConstants])

  // Check if user has balance on AssetHub that could be teleported
  const hasAssetHubBalance = useMemo(
    () => assetHubBalance && assetHubBalance.isGreaterThan(0),
    [assetHubBalance]
  )

  // Derived: show payment prompt if user tried to submit but lacks balance
  const showPaymentPrompt = useMemo(() => {
    return userTriedToSubmit && hasEnoughBalance === false;
  }, [userTriedToSubmit, hasEnoughBalance])

  // Auto-dismiss when balance arrives
  useEffect(() => {
    if (userTriedToSubmit && hasEnoughBalance === true) {
      logger.log("✅ Sufficient balance detected")
      setUserTriedToSubmit(false)
      toast.success("Balance updated! You can now submit your identity.")
    }
  }, [hasEnoughBalance, userTriedToSubmit])

  // Update current identity hash when on-chain identity changes (trustless)
  useEffect(() => {
    if (identity?.info) {
      setCurrentIdentityHash(identity.info)
    }
  }, [identity])

  // Initialize draft store from existing identity (only when not dirty)
  useEffect(() => {
    if (identity?.info && !draftSnap.isDirty) {
      initializeDraft({
        display: identity.info.display || "",
        email: identity.info.email || "",
        matrix: identity.info.matrix || "",
        twitter: identity.info.twitter || "",
        web: identity.info.web || "",
        github: identity.info.github || "",
        image: identity.info.image || "",
        pgp_fingerprint: identity.info.pgp_fingerprint || "",
        discord: identity.info.discord || "",
        legal: identity.info.legal || "",
      })
    }
  }, [identity, draftSnap.isDirty])

  // Monitor wallet disconnection
  useEffect(() => {
    if (!walletAddress && isSubmitting) {
      logger.error("Wallet disconnected during transaction")
      toast.error("Wallet disconnected. Please reconnect and try again.")
      setIsSubmitting(false)
    }
  }, [walletAddress, isSubmitting])

  // Initialize WebSocket for verification challenges with signature
  useEffect(() => {
    const initializeVerification = async () => {
      if (!walletAddress || !network) return

      const identityStatus = identity?.status || IdentityVerificationStatus.NoIdentity

      // If identity exists on-chain, use normal flow
      if (identity?.info) {
        logger.log("🔌 Setting up WebSocket for existing identity", {
          address: walletAddress,
          network,
          identityStatus
        })
        setWebSocketParams({
          address: walletAddress as SS58String,
          network,
          identityStatus
        })
        return
      }

      // For new identities, we'll request signature when user requests verification
      // This happens in the field verification hook
      logger.log("🔌 New identity - verification will require signature")
      setWebSocketParams({
        address: walletAddress as SS58String,
        network,
        identityStatus
      })
    }

    initializeVerification()
  }, [walletAddress, network, identity?.status, identity?.info, setWebSocketParams])

  const handleSubmitIdentity = async () => {
    // Prevent double-click submissions (Ryan Carniato: guard against race conditions)
    if (isSubmitting) {
      console.log("⚠️ Submission already in progress, ignoring duplicate call")
      return
    }

    // Pre-flight checks
    if (!typedApi || !walletAddress) {
      toast.error("Wallet not connected or API not ready")
      return
    }

    // Check current identity status before attempting submission
    logger.log("🔍 Checking current identity status before submission...")
    try {
      await fetchIdAndJudgement?.()

      // If identity already exists with judgement requested, stop here
      if (identity && (
        identity.status === IdentityVerificationStatus.JudgementRequested ||
        identity.status === IdentityVerificationStatus.FeePaid ||
        identity.status === IdentityVerificationStatus.IdentityVerified
      )) {
        logger.log("✅ Identity already registered, skipping submission")
        toast.success("Identity already registered! Moving to verification phase.")
        setRetryCount(0) // Reset retry count
        return
      }
    } catch (err) {
      logger.warn("Could not check identity status, proceeding with submission:", err)
    }

    // Check if balance has loaded yet
    if (peopleChainBalance === null) {
      toast.info("Loading balance... Please wait.")
      setIsSubmitting(true)
      setLoadingMessage("Loading balance...")

      // Wait for balance to load (max 5 seconds)
      const startTime = Date.now()
      while (peopleChainBalance === null && Date.now() - startTime < 5000) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      if (peopleChainBalance === null) {
        toast.error("Unable to load balance. Please check your connection and try again.")
        setIsSubmitting(false)
        setLoadingMessage("")
        return
      }
    }

    // Rate limiting check
    const rateLimitKey = `registration:${walletAddress}`
    if (!registrationRateLimiter.isAllowed(
      rateLimitKey,
      RATE_LIMITS.REGISTRATION.MAX_ATTEMPTS,
      RATE_LIMITS.REGISTRATION.WINDOW_MS
    )) {
      const waitTime = registrationRateLimiter.getTimeUntilAllowed(
        rateLimitKey,
        RATE_LIMITS.REGISTRATION.MAX_ATTEMPTS,
        RATE_LIMITS.REGISTRATION.WINDOW_MS
      )
      const seconds = Math.ceil(waitTime / 1000)
      toast.error(`Rate limit exceeded. Please wait ${seconds} seconds before trying again.`)
      logger.warn("Registration rate limit exceeded", { walletAddress, waitTime })
      return
    }

    // Validate identity data
    const sanitized = sanitizeIdentityData(identityData)
    const errors = validateIdentityData(sanitized)

    if (errors.length > 0) {
      setValidationErrors(errors)
      const errorMsg = errors.map(e => `${e.field}: ${e.message}`).join('\n')
      toast.error(`Validation failed:\n${errorMsg}`)
      logger.error("Validation errors:", sanitizeForLogging(errors))
      return
    }

    // Additional security validation for PGP fingerprint
    if (sanitized.pgp_fingerprint) {
      const pgpValidation = validatePgpFingerprint(sanitized.pgp_fingerprint)
      if (!pgpValidation.valid) {
        toast.error(pgpValidation.error || "Invalid PGP fingerprint")
        logger.error("PGP validation failed:", pgpValidation.error)
        return
      }
    }

    // Detect suspicious patterns
    const warnings = detectSuspiciousPatterns(sanitized)
    if (warnings.length > 0) {
      toast.error("Identity data contains suspicious patterns. Please review your inputs.")
      logger.error("Suspicious patterns detected:", warnings)
      return
    }

    setValidationErrors([])

    // Generate transaction ID for tracking
    const txId = generateTransactionId(walletAddress, Date.now())
    logger.log(`🔐 Transaction ${txId} initiated`, sanitizeForLogging({ sanitized }))

    setIsSubmitting(true)
    logger.log("🚀 Starting identity submission", { sanitized, retryCount })

    // Check balance before proceeding (balance is already loaded from check above)
    setLoadingMessage("Checking balance...")
    if (hasEnoughBalance === false) {
      logger.warn("Insufficient balance detected", { balance, minBalance })
      setUserTriedToSubmit(true)
      setIsSubmitting(false)
      setLoadingMessage("")
      return
    }

    setLoadingMessage("Preparing transaction...")

    try {
      const transactions = []

      // Cancel pending request if exists (for any status that might have a pending request)
      if (identity && identity.status >= IdentityVerificationStatus.JudgementRequested) {
        setLoadingMessage("Cancelling previous request...")
        const registrarIndex = Number(import.meta.env[
          `VITE_APP_REGISTRAR_INDEX__PEOPLE_${chainStore.relay?.id.toUpperCase()}`
        ])
        if (!isNaN(registrarIndex)) {
          transactions.push(typedApi.tx.identity.cancelRequest(registrarIndex))
        }
      }

      // Set identity
      const info: any = {
        display: { none: undefined },
        legal: { none: undefined },
        web: { none: undefined },
        matrix: { none: undefined },
        email: { none: undefined },
        image: { none: undefined },
        twitter: { none: undefined },
        github: { none: undefined },
        discord: { none: undefined },
      }

      // Use sanitized data for blockchain submission
      Object.entries(sanitized)
        .filter(([_, value]) => value && value.trim() !== "")
        .forEach(([key, value]) => {
          if (key === "pgp_fingerprint") return
          info[key] = { raw: value.trim() }
        })

      if (sanitized.pgp_fingerprint && sanitized.pgp_fingerprint.trim() !== "") {
        try {
          const formatted = sanitized.pgp_fingerprint.startsWith('0x')
            ? sanitized.pgp_fingerprint.slice(2)
            : sanitized.pgp_fingerprint
          info.pgp_fingerprint = Array.from(Buffer.from(`14${formatted}`, 'hex'))
        } catch (err) {
          throw new Error(`Invalid PGP fingerprint format: ${err.message}`)
        }
      }

      transactions.push(typedApi.tx.identity.setIdentity(info))

      // Request judgement
      setLoadingMessage("Fetching registrar information...")
      const networkId = chainStore.relay?.id.toUpperCase()
      const registrarIndex = Number(import.meta.env[
        `VITE_APP_REGISTRAR_INDEX__PEOPLE_${networkId}`
      ])
      if (isNaN(registrarIndex)) {
        throw new Error(`Registrar index for ${chainStore.relay?.id} not defined`)
      }

      // Get max fee from env (safety limit)
      const maxFeeEnv = import.meta.env[`VITE_APP_REGISTRAR_MAX_FEE__PEOPLE_${networkId}`]
      const maxFee = maxFeeEnv ? BigInt(maxFeeEnv) : null

      const registrars = await typedApi.query.identity.registrars()
      const registrarArray = Array.isArray(registrars) ? registrars : []
      if (!registrarArray[registrarIndex]?.value?.fee) {
        throw new Error(`Registrar at index ${registrarIndex} not found`)
      }

      // Get actual fee from chain
      const chainFee = BigInt(registrarArray[registrarIndex].value.fee)

      // Use max fee as safety limit, or chain fee if no limit set
      let registrarFee = chainFee
      if (maxFee !== null) {
        if (chainFee > maxFee) {
          logger.warn(`⚠️ Chain fee (${chainFee}) exceeds max fee (${maxFee}), using max fee`)
          toast.warning(`Registrar fee capped at configured maximum`, {
            duration: 5000,
            position: "bottom-right"
          })
          registrarFee = maxFee
        } else {
          logger.log(`✅ Chain fee (${chainFee}) within max fee limit (${maxFee})`)
        }
      }

      // If chain fee is 0 and no max fee set, use a nominal fee or 0 (free registrar)
      logger.log(`💰 Using registrar fee: ${registrarFee} (chain: ${chainFee}, max: ${maxFee})`)
      transactions.push(typedApi.tx.identity.requestJudgement(registrarIndex, registrarFee))

      // Execute batch
      const batchTx = transactions.length > 1
        ? typedApi.tx.utility.batchAll(transactions)
        : transactions[0]

      logger.log("📝 Submitting batch transaction with", transactions.length, "operations")
      setLoadingMessage("Please sign the transaction in your wallet...")

      await signSubmitAndWatch({
        call: batchTx,
        name: transactions.length > 1 ? "Update Identity (Multi-step)" : "Set Identity"
      })

      setLoadingMessage("Transaction confirmed! Refreshing...")

      logger.log("✅ Transaction successful, refreshing identity state")
      toast.success("Identity submitted successfully!")

      // Reset retry counter on success
      setRetryCount(0)

      // Note: verifications are cleared when fields are edited (see updateDraftField)
      // Hash is computed from field values, so it changes on edit, not submission

      // Refresh identity (this will trigger currentPhase to update via useMemo)
      if (fetchIdAndJudgement) {
        try {
          await fetchIdAndJudgement()
        } catch (refreshErr) {
          logger.error("Failed to refresh identity after submission:", refreshErr)
          // Non-fatal, continue anyway
        }
      }

      // currentPhase will automatically update via the useMemo when identity refreshes
    } catch (error: any) {
      logger.error("❌ Identity submission error:", error)

      // Categorize error types for better UX
      let userMessage = "Failed to submit identity"
      let canRetry = false

      if (error.message?.includes("User rejected") || error.message?.includes("Cancelled")) {
        userMessage = "Transaction was cancelled"
      } else if (error.message?.includes("Inability to pay")) {
        userMessage = "Insufficient balance to complete transaction"
      } else if (error.message?.includes("Transaction is outdated") || error.message?.includes("1010")) {
        // This often means the transaction already succeeded or nonce is stale
        userMessage = "Transaction outdated. Checking if already registered..."
        canRetry = true

        // Try to refresh identity to see if it actually succeeded
        if (fetchIdAndJudgement) {
          setTimeout(async () => {
            try {
              await fetchIdAndJudgement()
              logger.log("Identity status refreshed after outdated transaction")
            } catch (err) {
              logger.error("Failed to refresh identity after outdated tx:", err)
            }
          }, 1000) // Wait 1 second before refreshing to allow block to finalize
        }
      } else if (error.message?.includes("registrar")) {
        userMessage = "Registrar not available. Please try again later"
        canRetry = true
      } else if (error.message?.includes("network") || error.message?.includes("timeout") || error.message?.includes("disconnected")) {
        userMessage = "Network error. Please check your connection"
        canRetry = true
      } else {
        userMessage = `Transaction failed: ${error.message}`
        canRetry = true
      }

      toast.error(userMessage)

      // Offer retry if appropriate and not exceeded max retries
      if (canRetry && retryCount < MAX_RETRIES) {
        setRetryCount(prev => prev + 1)
      }
    } finally {
      setIsSubmitting(false)
      setLoadingMessage("")
    }
  }

  const canProceedFromVerification = useMemo(() => {
    if (!identity) return false
    if (identity.status === IdentityVerificationStatus.IdentityVerified) return true

    const filledFields = getAllFilledFields(identityData)
    const verifiableFields = filledFields.filter(f =>
      !["", "display"].includes(f) && identityData[f] && identityData[f].trim() !== ""
    )

    if (verifiableFields.length === 0) return true

    for (const fieldName of verifiableFields) {
      const status = getFieldStatus(fieldName as any)
      if (!status || status.status !== "verified") return false
    }
    return true
  }, [identity, identityData, getAllFilledFields, getFieldStatus])

  // Show completion
  if (currentPhase === RegistrationPhase.Complete) {
    return (
      <div className="text-center space-y-6 py-8">
        <UserCheck className="w-20 h-20 text-green-500 mx-auto" />
        <h2 className="text-2xl font-semibold text-white">Registration Complete!</h2>
        <p className="text-gray-300">
          Your identity has been successfully registered on the {networkDisplayName} network.
        </p>
        {onComplete && (
          <Button onClick={onComplete} className="w-full md:w-auto">
            Continue
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Payment Prompt */}
      {showPaymentPrompt && minBalance && (
        <PaymentPrompt
          networkName={networkDisplayName}
          requiredAmount={minBalance}
          formatAmount={formatAmount}
          tokenSymbol={chainStore.tokenSymbol || "DOT"}
          walletAddress={walletAddress}
          isPaseo={chainStore.id?.includes("paseo") || false}
          isTxBusy={polkadotApi.isTxBusy}
          onCancel={() => setUserTriedToSubmit(false)}
          onBalanceRefresh={handleBalanceRefresh}
        />
      )}

      {/* Identity Form Phase */}
      {currentPhase === RegistrationPhase.FormFill && !showPaymentPrompt && (
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-3">Identity Information</h3>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <Alert className="bg-red-900/20 border-red-500/30 text-red-400 mb-4">
              <AlertCircle className="w-4 h-4 inline-block mr-2" />
              <div>
                <strong>Validation Errors:</strong>
                <ul className="list-disc list-inside mt-1">
                  {validationErrors.map((err, idx) => (
                    <li key={idx} className="text-sm">
                      <strong>{err.field}:</strong> {err.message}
                    </li>
                  ))}
                </ul>
              </div>
            </Alert>
          )}

          {/* Retry information with action buttons */}
          {retryCount > 0 && retryCount < MAX_RETRIES && (
            <Alert className="bg-yellow-900/20 border-yellow-500/30 mb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-yellow-400 font-medium text-sm">
                      Transaction failed - Retry {retryCount} of {MAX_RETRIES}
                    </div>
                    <div className="text-yellow-400/80 text-xs mt-1">
                      The transaction may have succeeded despite the error. Check status or try submitting again.
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    toast.info("Checking current status...")
                    if (fetchIdAndJudgement) {
                      try {
                        await fetchIdAndJudgement()
                        toast.success("Status refreshed")
                      } catch (err) {
                        toast.error("Failed to refresh status")
                      }
                    }
                  }}
                  className="flex-shrink-0 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
                >
                  Check Status
                </Button>
              </div>
            </Alert>
          )}

          <div className="space-y-4">
            {progressive ? (
              <ProgressiveIdentityForm
                initialData={identityData}
                onSubmit={handleSubmitIdentity}
                isSubmitting={isSubmitting}
              />
            ) : (
              <InlineIdentityForm
                initialData={identityData}
                onSubmit={handleSubmitIdentity}
                isEditMode={identity?.status !== IdentityVerificationStatus.NoIdentity}
              />
            )}

            {/* Loading indicator */}
            {isSubmitting && loadingMessage && !progressive && (
              <Alert className="bg-blue-900/20 border-blue-500/30 text-blue-400">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                  <span>{loadingMessage}</span>
                </div>
              </Alert>
            )}
          </div>
        </div>
      )}

      {/* Verification Phase */}
      {currentPhase === RegistrationPhase.Verification && (
        <div className="space-y-6">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Field Verification</h3>
          <IdentityVerificationForm
            identityData={identityData}
            identityStatus={identity?.status || IdentityVerificationStatus.Unknown}
            supportedFields={supportedFields}
          />

          <Card className="bg-gray-800/50 border-gray-700 mt-6">
            <CardHeader>
              <CardTitle className="flex items-center text-white text-xl">
                <ListChecks className="w-6 h-6 mr-3 text-pink-400" />
                Review & Submit
              </CardTitle>
              <CardDescription className="text-gray-400 text-sm">
                Complete all verifications above to finish registration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={onComplete}
                disabled={!canProceedFromVerification}
                className="w-full"
              >
                {identity?.status === IdentityVerificationStatus.IdentityVerified
                  ? "Complete Registration"
                  : "Complete All Verifications First"
                }
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
