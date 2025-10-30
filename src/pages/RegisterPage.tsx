import { AlertCircle, ArrowLeft, CheckCircle, Edit, Info, ListChecks, Loader2, UserCheck, WalletIcon, } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { BalanceCheck } from "@/components/balance-check"
import ConfirmActionDialog from "@/components/dialogs/ConfirmActionDialog"
import { IdentityVerificationForm } from "@/components/identity-verification-form"; // New verification form
import { Logo } from "@/components/logo"
import { NetworkSelection } from "@/components/network-selection-register"
import { SimpleIdentityForm } from "@/components/simple-identity-form"; // New simple form
import { useTheme } from "@/components/theme-provider-simple"
import { AccountSelector } from "@/components/ui/account-selector"
import { Alert } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useNetwork, type Network as AppNetwork } from "@/contexts/network-context"
import { usePolkadotApi } from "@/contexts/PolkadotApiContext"
import { useUser } from "@/contexts/user-context"; // For fetching profile to edit
import { FieldVerification, useVerification } from "@/contexts/verification-context"
import { usePolkadotWallet } from "@/contexts/PolkadotWalletContext"
import { useUrlParams } from "@/hooks/useUrlParams"
import { CHAINS } from "@/polkadot-api/chain-config"
import { chainStore as _chainStore } from "@/store/ChainStore"
import { ChallengeStatus } from "@/store/challengesStore"
import { DialogMode } from "@/types"
import { IdentityVerificationStatus, type IdentityData } from "@/types/Identity"; // Import IdentityData
import BigNumber from "bignumber.js"
import { SS58String } from "polkadot-api"
import { useTriggerLog } from "@/hooks/use-trigger-log"
import { getTxFees } from "@/utils/transactions"
import { fromHexString } from "@/utils/binary"

export const STEP_NUMBERS = {
  pickNetwork: 1,
  connectWallet: 2,
  pickAccount: 3,
  checkBalance: 4,
  fillIdentityInfo: 5,
  reviewAndSubmit: 6,
  complete: 7,
} as const
const TOTAL_STEPS = Object.keys(STEP_NUMBERS).length

export default function RegisterPage() {
  const navigate = useNavigate()

  const {
    network,
    setNetwork,
    networkDisplayName,
    networkColor,
    isEncrypted: isNetworkEncrypted,
  } = useNetwork()
  const [_network, _setNetwork] = useState<AppNetwork | null>(network)

  const polkadotApiContext = usePolkadotApi()
  const {
    chainStore,
    accountStore,
    identity,
    fetchIdAndJudgement,
    formatAmount,
    isTxBusy,
    supportedFields,
    typedApi,
    signSubmitAndWatch,
    chainConstants,
    balance, // Current account balance
    openTxDialog: _openTxDialog,
  } = polkadotApiContext

  const openTxDialog = (args: OpenTxDialogArgs) => {
    _openTxDialog({
      ...args,
      mode: args.mode || null,
      tx: args.tx || null,
      estimatedCosts: args.estimatedCosts || {},
    })
    setTxName(args.name || null)
  }

  const walletAddress = useMemo(() => accountStore.address, [accountStore.address])

  const { userProfile: loggedInUserProfile, isLoading: isUserLoading } = useUser()
  const {
    getFieldStatus,
    getAllFilledFields,
    resetFieldVerification,
    setInitialVerifications,
    challenges,
  } = useVerification()

  useEffect(() => {
    const challengeStatusMapping = {
      [ChallengeStatus.Unknown]: "unverified",
      [ChallengeStatus.Pending]: "pending",
      [ChallengeStatus.Passed]: "verified",
      [ChallengeStatus.Failed]: "failed",
    }

    // Convert WebSocket challenges to FieldVerification format
    const verifications: FieldVerification[] = Object.entries(challenges || {}).map(([key, challenge]) => {
      const status = challengeStatusMapping[challenge.status] || "unverified"

      return {
        field: key,
        status,
        lastVerified: challenge.lastVerified,
        verificationMethod: challenge.verificationMethod || "code",
        verificationPayload: challenge.code,
      }
    })

    setInitialVerifications(verifications)
  }, [challenges, setInitialVerifications])

  const [currentStep, setCurrentStep] = useState(1)
  useTriggerLog(currentStep, "currentStep") // TODO Tracking why it becomes null
  useEffect(() => {
    if (!currentStep || !Object.values(STEP_NUMBERS).includes(currentStep)) {
      throw new Error("currentStep is null or undefined")
    }
  }, [currentStep])


  const [identityData, setIdentityData] = useState<IdentityData>({
    display: "",
    email: "",
    matrix: "",
    twitter: "",
    web: "",
    github: "",
    pgp_fingerprint: "",
    discord: "",
    image: "",
    legal: "",
  })
  const [isSubmittingIdentity, setIsSubmittingIdentity] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null)
  const [isLoadingProfileForEdit, setIsLoadingProfileForEdit] = useState(false)

  const [hoveredAccount, setHoveredAccount] = useState<string | null>(null)
  const [selectedAccount, setSelectedAccount] = useState<SS58String | null>(null)

  // Transaction dialog state
  const [estimatedCosts, setEstimatedCosts] = useState<any>({})
  const [txToConfirm, setTxToConfirm] = useState<any>(null)
  const [currentDialogMode, setCurrentDialogMode] = useState<DialogMode>(null)

  const { setParam, urlParams } = useUrlParams()

  const editIdParam = urlParams["editId"]
  const flowParam = urlParams["flow"]
  const parentIdParam = urlParams["parentId"]
  const isEditingCurrentUserFromParams = urlParams["edit"] === "true"

  const {
    accounts,
    extensions,
    isLoading: isLoadingAccounts,
  } = usePolkadotWallet()
  const isWalletConnecting = useMemo(() => isLoadingAccounts, [isLoadingAccounts])
  const isWalletConnected = useMemo(() => accounts.length > 0, [accounts])
  const connectedWallets = extensions;

  const handleNetworkSelect = (selectedNet: AppNetwork) => {
    setNetwork(selectedNet)
    chainStore.id = selectedNet
  }

  const handlePickAccount = (address: SS58String) => {
    accountStore.address = address // Update the accountStore with the selected account
    // Set address as search parameter to persist selection
    setParam("address", address)
    console.debug("Selected account:", address)
  }

  useEffect(() => {
    const searchAddress = urlParams["address"]
    if (searchAddress && accounts.some((acc) => acc.address === searchAddress)) {
      setSelectedAccount(searchAddress as SS58String)
      accountStore.address = searchAddress as SS58String // Update the accountStore with the selected account
      // Set address as search parameter to persist selection
      setParam("address", searchAddress)
      console.debug("Selected account from search params:", searchAddress)
    }
  }, [accounts])

  // Fetch on-chain identity when account is selected
  useEffect(() => {
    if (accountStore.address) {
      fetchIdAndJudgement().then((fetchedIdentity) => {
        if (fetchedIdentity && fetchedIdentity.info && !isEditMode) {
          // Only populate form with fetched identity data if not in edit mode
          // This allows users to update their existing identity
          const fetchedData: IdentityData = {
            display: fetchedIdentity.info.display || "",
            email: fetchedIdentity.info.email || "",
            matrix: fetchedIdentity.info.matrix || "",
            twitter: fetchedIdentity.info.twitter || "",
            web: fetchedIdentity.info.web || "",
            github: fetchedIdentity.info.github || "",
            pgp_fingerprint: fetchedIdentity.info.pgp_fingerprint || "",
            discord: fetchedIdentity.info.discord || "",
            image: fetchedIdentity.info.image || "",
            legal: fetchedIdentity.info.legal || "",
          }
          setIdentityData(fetchedData)
        }
      })
    }
  }, [accountStore.address, isEditMode, fetchIdAndJudgement])

  const handleIdentityDataFormChange = useCallback((newData: IdentityData) => {
    setIdentityData(newData)
  }, [])

  const canProceedFromIdentityStep = useMemo(() => {
    // Check if form has required data (display name + at least one other field)
    const hasDisplayName = identityData.display && identityData.display.trim() !== ""
    const hasOtherFields = Object.entries(identityData)
      .filter(([key, value]) => key !== 'display' && value && value.trim() !== "")
      .length > 0

    // Can submit if form has required data
    return hasDisplayName && hasOtherFields
  }, [identityData])

  const canProceedFromVerificationStep = useMemo(() => {
    if (identity.status === IdentityVerificationStatus.IdentityVerified) {
      // If identity is already verified, we can proceed
      return true
    }

    // For the reviewAndSubmit step, all filled fields (except displayName) must be verified
    const filledFields = getAllFilledFields(identityData)
    const verifiableFields = filledFields.filter(f =>
      !["", "display"].includes(f) && identityData[f] && identityData[f].trim() !== ""
    )

    // If no verifiable fields, can proceed (display name only)
    if (verifiableFields.length === 0) return true

    // All verifiable fields must be verified
    for (const fieldName of verifiableFields) {
      const status = getFieldStatus(fieldName)
      if (!status || status.status !== "verified") {
        return false
      }
    }
    return true
  }, [identityData, getAllFilledFields, getFieldStatus])

  const handleNextStep = () => {
    if (currentStep === STEP_NUMBERS.pickNetwork && _network) {
      handleNetworkSelect(_network)
    }
    if (currentStep === STEP_NUMBERS.fillIdentityInfo && !canProceedFromIdentityStep) {
      // For fillIdentityInfo step, identity must be submitted to chain first
      if (identity.status < IdentityVerificationStatus.IdentitySet) {
        // Check if form has required data before prompting to submit
        if (identityData.display.trim() === "") {
          toast.error("Please provide a Display Name before submitting.")
          return
        } else if (getAllFilledFields(identityData).filter((f) => f !== "display").length === 0) {
          toast.error("Please fill at least one other field besides Display Name before submitting.")
          return
        } else {
          toast.error("Please submit your identity data to the blockchain before proceeding to verification.")
          return
        }
      }
    }
    if (currentStep === STEP_NUMBERS.reviewAndSubmit && !canProceedFromVerificationStep) {
      // For reviewAndSubmit, all filled fields (except displayName) must be verified
      const filledFields = getAllFilledFields(identityData)
      const unverifiedFields = filledFields.filter(fieldName => {
        if (fieldName === "displayName") return false
        const status = getFieldStatus(fieldName)
        return !status || status.status !== "verified"
      })

      if (unverifiedFields.length > 0) {
        const fieldNames = unverifiedFields
          .map(fieldName => fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/([A-Z])/g, " $1"))
        toast.error(`Please verify all fields before continuing: ${fieldNames.join(", ")}.`)
      }
      return
    }
    if (currentStep === STEP_NUMBERS.pickAccount && selectedAccount) {
      handlePickAccount(selectedAccount)
    }

    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep => currentStep + 1)
    }
  }

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  // Transaction dialog handlers
  const closeTxDialog = useCallback(() => {
    setOpenDialog(null)
    setEstimatedCosts({})
    setTxToConfirm(null)
    setCurrentDialogMode(null)
    setIsSubmittingIdentity(false) // Reset submitting state when dialog closes
  }, [])

  const submitTransaction = useCallback(async () => {
    console.log("🔵 submitTransaction called");
    console.log("🔵 txToConfirm:", txToConfirm);
    console.log("🔵 currentDialogMode:", currentDialogMode);
    console.log("🔵 walletAddress:", walletAddress);
    console.log("🔵 typedApi:", !!typedApi);

    if (!txToConfirm) {
      console.log("🔴 No transaction to submit");
      toast.error("No transaction to submit.")
      return
    }
    if (!walletAddress || !typedApi) {
      console.log("🔴 No wallet connected");
      toast.error("No wallet connected.")
      return
    }

    console.log("🔵 Setting submitting state to true");
    setIsSubmittingIdentity(true)

    try {
      let action = ""
      let nextStep = currentStep

      // Determine action based on dialog mode
      if (currentDialogMode === "setIdentity") {
        // Check if this is a batch transaction (multiple operations)
        const isBatchTransaction = txToConfirm?.method?.method === "batchAll"
        if (isBatchTransaction) {
          action = "Processing identity update (multi-step)"
        } else {
          action = isEditMode ? "Updating" : "Submitting"
        }
        nextStep = currentStep === STEP_NUMBERS.fillIdentityInfo ? STEP_NUMBERS.reviewAndSubmit : currentStep
      } else if (currentDialogMode === "requestJudgement") {
        action = "Requesting judgement for"
        // Stay on same step to complete verification
      } else if (currentDialogMode === "cancelRequest") {
        console.log("🔵 Processing cancel request");
        action = "Cancelling request for"
        // Go back to identity setting step after cancellation
        nextStep = STEP_NUMBERS.fillIdentityInfo
      }

      console.log("🔵 Action determined:", action);
      console.log("🔵 signSubmitAndWatch function exists:", typeof signSubmitAndWatch);
      console.log("🔵 Transaction call:", txToConfirm);
      console.log("🔵 Transaction name:", action.endsWith("(multi-step)") ? action : `${action} identity`);
      console.log("🔵 Calling signSubmitAndWatch...");
      console.log("🔵 Transaction call details:", {
        method: txToConfirm?.method,
        section: txToConfirm?.method?.section,
        methodName: txToConfirm?.method?.method,
        args: txToConfirm?.args,
        isValid: typeof txToConfirm?.sign === 'function'
      });

      try {
        // Try direct signing first to see if that works
        console.log("🔵 Attempting direct transaction signing...");
        
        const result = await signSubmitAndWatch({
          call: txToConfirm,
          name: action.endsWith("(multi-step)") ? action : `${action} identity`,
        });
        
        console.log("🔵 signSubmitAndWatch result:", result);
      } catch (signError) {
        console.error("🔴 Signing error:", signError);
        throw signError;
      }

      console.log("🔵 signSubmitAndWatch completed successfully");

      // Auto-advance to next step if identity was submitted from step 5
      if (currentDialogMode === "setIdentity" && currentStep === STEP_NUMBERS.fillIdentityInfo) {
        console.log("🔵 Advancing to reviewAndSubmit step");
        console.log("🔵 Clearing old verification state after identity update...");
        // Clear verification state when moving to step 6 with new identity
        setInitialVerifications([]);
        setCurrentStep(STEP_NUMBERS.reviewAndSubmit)
      }

      // Go back to step 5 if request was cancelled from step 6
      if (currentDialogMode === "cancelRequest" && currentStep === STEP_NUMBERS.reviewAndSubmit) {
        console.log("🔵 Going back to fillIdentityInfo step after cancellation");
        // Refresh identity state after cancellation
        await fetchIdAndJudgement();
        setCurrentStep(STEP_NUMBERS.fillIdentityInfo)
        toast.success("Judgment request cancelled. You can now update your identity.")
      }

      console.log("🔵 Closing dialog");
      // Close the dialog
      closeTxDialog()
    } catch (error: any) {
      console.error("🔴 Transaction submission error:", error)
      toast.error(`Failed to submit transaction: ${error.message}`)
    } finally {
      console.log("🔵 Setting submitting state to false");
      setIsSubmittingIdentity(false)
    }
  }, [txToConfirm, walletAddress, currentDialogMode, isEditMode, networkDisplayName, isNetworkEncrypted, closeTxDialog, currentStep, fetchIdAndJudgement])

  const [openDialog, setOpenDialog] = useState<DialogMode>(null)
  const [txName, setTxName] = useState<string | null>(null)

  const onSetIdentity = async () => {
    console.log("🟢 Set Identity button clicked!");
    console.log("🟢 Typed API:", !!typedApi);
    
    if (!walletAddress || !typedApi) {
      console.log("🔴 Missing wallet or API");
      toast.error("Wallet not connected or API not ready");
      return;
    }

    // Set submitting state early to prevent double-clicks
    console.log("🟢 Setting submitting state to true");
    setIsSubmittingIdentity(true)

    try {
      console.log("🟢 Starting to prepare identity transactions...");
      // Prepare all three transactions in sequence
      const transactions = await prepareIdentityTransactions()
      console.log("🟢 Transactions prepared:", transactions.length);
      
      if (transactions.length === 0) {
        throw new Error("No transactions to execute")
      }
      
      console.log(`🟢 Preparing ${transactions.length} transaction(s) for execution`)

      console.log("🟢 Estimating transaction costs...");
      // For multi-transaction, use the batch transaction for fee estimation
      // This is more accurate than summing individual fees
      const estimatedCosts = {
        fees: transactions.length > 1 
          ? await getTxFees(typedApi.tx.utility.batchAll(transactions))(walletAddress)
          : await getTxFees(transactions[0])(walletAddress),
        deposits: chainConstants?.basicDeposit ? BigNumber(chainConstants.basicDeposit.toString()) : null,
      }
      
      console.log('🟢 Estimated costs for transaction:', estimatedCosts)

      console.log("🟢 Creating batch transaction...");
      // Create batch transaction if multiple operations needed
      const batchTx = transactions.length > 1 
        ? typedApi.tx.utility.batchAll(transactions)
        : transactions[0]

      console.log("🟢 Setting dialog state...");
      // Set dialog state for transaction confirmation
      setEstimatedCosts(estimatedCosts)
      setTxToConfirm(batchTx)
      setCurrentDialogMode("setIdentity")

      console.log("🟢 Opening transaction dialog...");
      // Open transaction dialog
      setOpenDialog("setIdentity")
      setTxName(transactions.length > 1 ? "Update Identity (Multi-step)" : "Set Identity")
      
      // Reset submitting state since we're now waiting for user confirmation in dialog
      console.log("🟢 Resetting submitting state - waiting for user confirmation");
      setIsSubmittingIdentity(false)
    } catch (error: any) {
      console.error("🔴 Transaction preparation error:", error)
      toast.error(`Failed to prepare transaction: ${error.message}`)
      setIsSubmittingIdentity(false) // Reset on error
    }
  }

  // Helper function to prepare all identity-related transactions
  const prepareIdentityTransactions = async () => {
    console.log("🟢 prepareIdentityTransactions started");
    console.log("🟢 Current identity status:", identity?.status);
    
    const transactions = []

    try {
      // Step 1: Cancel any pending registration request (if needed)
      console.log("🟢 Step 1: Checking cancel request...");
      if (identity?.status === IdentityVerificationStatus.PendingJudgement) {
        console.log("🟢 Adding cancel request transaction...");
        const registrarIndex = Number(import.meta.env[
          `VITE_APP_REGISTRAR_INDEX__PEOPLE_${chainStore.relay?.id.toUpperCase()}`
        ])
        console.log("🟢 Registrar index for cancel:", registrarIndex);
        
        if (!isNaN(registrarIndex)) {
          const cancelTx = typedApi.tx.identity.cancelRequest(registrarIndex)
          transactions.push(cancelTx)
          console.log("🟢 Cancel transaction added");
        }
      } else {
        console.log("🟢 No cancel needed, status is:", identity?.status);
      }

      // Step 2: Set identity (existing logic)
      console.log("Adding set identity transaction...")
      const dataToSubmit = identityData

      // Transform the data to the format expected by the blockchain
      const initialInfo = {
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

      const info: any = {
        ...initialInfo,
        ...Object.fromEntries(
          Object.entries(dataToSubmit)
            .filter(([_, value]) => value && value.trim() !== "")
            .map(([key, value]) => {
              value = value.trim()
              if (key === "pgp_fingerprint") {
                return [null, null] // Handle separately
              }

              return [key, { raw: value }]
            })
            .filter(([key]) => key !== null)
        )
      }

      // Handle PGP fingerprint separately
      if (dataToSubmit.pgp_fingerprint && dataToSubmit.pgp_fingerprint.trim() !== "") {
        const formattedPgpFingerprint = dataToSubmit.pgp_fingerprint.startsWith('0x')
          ? dataToSubmit.pgp_fingerprint.slice(2)
          : dataToSubmit.pgp_fingerprint
        ;
        // Workaround for the 0x prefix, 14_16 = 20 bytes. Necessary as PAPI seems to use it for 
        //  some reason, maybe as length...
        info.pgp_fingerprint = fromHexString(`14${formattedPgpFingerprint}`)
      }

      const setIdentityTx = typedApi.tx.identity.setIdentity(info)
      transactions.push(setIdentityTx)

      // Step 3: Request judgement
      console.log("🟢 Step 3: Adding request judgement transaction...");
      const registrarIndex = Number(import.meta.env[
        `VITE_APP_REGISTRAR_INDEX__PEOPLE_${chainStore.relay?.id.toUpperCase()}`
      ])
      console.log("🟢 Registrar index for judgement:", registrarIndex);
      console.log("🟢 Chain store relay ID:", chainStore.relay?.id);
      
      if (isNaN(registrarIndex)) {
        throw new Error(`Registrar index for ${chainStore.relay?.id} is not defined.`)
      }

      console.log("🟢 Querying registrars from chain... (this might take time)");
      const registrars = await typedApi.query.identity.registrars()
      console.log("🟢 Registrars query completed:", registrars?.length || 0, "registrars found");
      
      const registrarData = registrars[registrarIndex]
      console.log("🟢 Registrar data at index", registrarIndex, ":", registrarData);
      
      if (!registrarData?.value?.fee) {
        throw new Error(`Registrar at index ${registrarIndex} not found or has no fee`);
      }
      
      const registrarFee = BigInt(registrarData.value.fee)
      console.log("🟢 Registrar fee:", registrarFee.toString());
      
      const requestJudgementTx = typedApi.tx.identity.requestJudgement(registrarIndex, registrarFee)
      transactions.push(requestJudgementTx)
      console.log("🟢 Request judgement transaction added");

      console.log(`✅ Prepared ${transactions.length} transactions:`, {
        steps: transactions.map((tx, index) => {
          if (tx.method.method === "cancelRequest") return `${index + 1}. Cancel pending request`
          if (tx.method.method === "setIdentity") return `${index + 1}. Set identity`  
          if (tx.method.method === "requestJudgement") return `${index + 1}. Request judgment`
          return `${index + 1}. ${tx.method.method}`
        }),
        totalSteps: transactions.length
      })

      return transactions

    } catch (error) {
      console.error("Error preparing identity transactions:", error)
      throw error
    }
  }

  const onRequestJudgement = async () => {
    if (!walletAddress || !typedApi) return

    try {
      // Create the request judgement transaction
      const registrarIndex = Number(import.meta.env[
        `VITE_APP_REGISTRAR_INDEX__PEOPLE_${chainStore.relay?.id.toUpperCase()}`
      ])
      if (isNaN(registrarIndex)) {  // If it's NaN, index is not defined
        throw new Error(`Registrar index for ${chainStore.relay?.id} is not defined.`)
      }

      const registrars = await typedApi.query.identity.registrars()
      const registrarFee = BigInt(registrars[registrarIndex]?.value.fee)
      const tx = await typedApi.tx.identity.requestJudgement(registrarIndex, registrarFee)

      // Estimate costs
      const estimatedCosts = {
        fees: await getTxFees(tx)(walletAddress),
      }

      // Set dialog state for transaction confirmation
      setEstimatedCosts(estimatedCosts)
      setTxToConfirm(tx)
      setCurrentDialogMode("requestJudgement")

      // Open transaction dialog
      setOpenDialog("requestJudgement")
      setTxName("Request Judgement")
    } catch (error: any) {
      console.error("Transaction preparation error:", error)
      toast.error(`Failed to prepare transaction: ${error.message}`)
    }
  }

  const onCancelRequest = async () => {
    console.log("🔴 Cancel Request button clicked!");
    console.log("🔴 Typed API:", !!typedApi);
    console.log("🔴 Chain store relay ID:", chainStore.relay?.id);
    
    if (!walletAddress || !typedApi) {
      console.log("🔴 Missing wallet or API");
      toast.error("Wallet not connected or API not ready");
      return;
    }

    try {
      // First check if we can cancel
      console.log("🔴 Current identity status:", identity?.status);
      console.log("🔴 Identity object:", identity);

      // Create the cancel request transaction
      const registrarIndex = Number(import.meta.env[
        `VITE_APP_REGISTRAR_INDEX__PEOPLE_${chainStore.relay?.id.toUpperCase()}`
      ])
      console.log("🔴 Registrar index:", registrarIndex);
      console.log("🔴 Registrar env var:", import.meta.env[`VITE_APP_REGISTRAR_INDEX__PEOPLE_${chainStore.relay?.id.toUpperCase()}`]);
      
      if (isNaN(registrarIndex)) {
        throw new Error(`Registrar index for ${chainStore.relay?.id} is not defined.`)
      }

      console.log("🔴 Creating cancel request transaction...");
      console.log("🔴 TypedApi available:", !!typedApi);
      console.log("🔴 Identity methods available:", Object.keys(typedApi?.tx?.identity || {}));
      
      const tx = typedApi.tx.identity.cancelRequest(registrarIndex)
      console.log("🔴 Transaction created:", tx);
      console.log("🔴 Transaction method:", tx?.method);
      console.log("🔴 Transaction method section:", tx?.method?.section);
      console.log("🔴 Transaction method name:", tx?.method?.method);
      console.log("🔴 Transaction args:", tx?.args);
      console.log("🔴 Transaction is callable:", typeof tx?.signAsync === 'function');

      // Estimate costs
      console.log("🔴 Estimating costs...");
      const estimatedCosts = {
        fees: await getTxFees(tx)(walletAddress),
      }
      console.log("🔴 Estimated costs:", estimatedCosts);

      // Set dialog state for transaction confirmation
      setEstimatedCosts(estimatedCosts)
      setTxToConfirm(tx)
      setCurrentDialogMode("cancelRequest")

      // Open transaction dialog
      setOpenDialog("cancelRequest")
      setTxName("Cancel Request")
      console.log("🔴 Dialog opened for cancel request");
    } catch (error: any) {
      console.error("🔴 Cancel request preparation error:", error)
      toast.error(`Failed to prepare cancel request: ${error.message}`)
    }
  }

  const stepTitles = [
    "Select Network",
    "Connect Wallets",
    "Select Account",
    "Check Balance",
    isEditMode ? "Update & Verify Identity Info" : "Provide & Verify Identity Info",
    isEditMode ? "Review & Submit Update" : "Review & Submit",
    isEditMode ? "Update Complete" : "Registration Complete",
  ]

  // Only show Paseo testnet for registration (we're not registrars on Polkadot/Kusama yet)
  const networks = Object.entries(CHAINS)
    .filter(([key]) => key.endsWith("_people") && key.includes("paseo"))
    .map(([key, networkInfo]) => ({
      id: key,
      name: networkInfo.name,
      // TODO Add actual icons for each network
      icon: (
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${networkInfo.iconStyle}`}>
          <span className="text-white font-bold text-xs">{networkInfo.symbol}</span>
        </div>
      ),
      color: networkInfo.iconStyle || "border-gray-500/70 hover:bg-gray-500/10",
      badge: networkInfo.badge || "",
      badgeColor: networkInfo.badgeColor || "bg-gray-500/20 text-gray-400",
      features: networkInfo.features || [],
    }))
  const [hoveredNetwork, setHoveredNetwork] = useState<string | null>(null)

  const minBalanceAmount = useMemo(// existentialDeposit * byteDeposit*32*10 + basicDeposit*2
    () => chainConstants
      ? BigNumber(chainConstants.existentialDeposit.toString())
        .plus(BigNumber(chainConstants.byteDeposit.toString()).times(32).times(10)) // Assumed max for each of the identity fields
        .plus(BigNumber(chainConstants.basicDeposit.toString()).multipliedBy(2n)) // Min. for setting identity, and extra for more transactions
      : null,
    [chainConstants]
  )
  const hasEnoughBalance = useMemo(
    () => (balance && minBalanceAmount)
      ? balance.isGreaterThanOrEqualTo(minBalanceAmount)
      : null,
    [balance, minBalanceAmount]
  )

  // Auto-select a default network if none is selected 
  useEffect(() => {
    if (!network && !_network) {
      // Set default network to paseo_people (testnet with free tokens)
      const defaultNetwork = "paseo_people" as AppNetwork;
      console.log('Setting default network:', defaultNetwork);
      setNetwork(defaultNetwork);
      _setNetwork(defaultNetwork);
      chainStore.id = defaultNetwork;
    }
  }, [network, _network, setNetwork, chainStore]);

  useEffect(() => {// Set steps based on whether required information is available
    console.log('RegisterPage step determination:', {
      network,
      connectedWallets: connectedWallets.length,
      accounts: accounts.length,
      accountAddress: accountStore.address,
      hasEnoughBalance
    });
    
    if (network) {
      setCurrentStep(STEP_NUMBERS.connectWallet)
    } else {
      setCurrentStep(STEP_NUMBERS.pickNetwork)
      return
    }

    if (connectedWallets.length > 0 && accounts.length > 0) {
      setCurrentStep(STEP_NUMBERS.pickAccount)
    } else {
      setCurrentStep(STEP_NUMBERS.connectWallet)
      return;
    }

    if (accountStore.address) {
      setCurrentStep(STEP_NUMBERS.checkBalance)
    } else {
      setCurrentStep(STEP_NUMBERS.pickAccount)
      return
    }

    if (hasEnoughBalance === true) {
      // Go to completion step (7) if identity is fully verified
      if (identity?.status === IdentityVerificationStatus.IdentityVerified) {
        setCurrentStep(STEP_NUMBERS.complete)
      }
      // Go to verification step (6) if judgement has been requested and fee paid
      else if (identity?.status === IdentityVerificationStatus.JudgementRequested || identity?.status === IdentityVerificationStatus.FeePaid || identity?.status === IdentityVerificationStatus.PendingJudgement) {
        setCurrentStep(STEP_NUMBERS.reviewAndSubmit)
      } else {
        // Stay in identity form step (5) for NoIdentity, IdentitySet, etc.
        setCurrentStep(STEP_NUMBERS.fillIdentityInfo)
      }
    } else if (hasEnoughBalance === false) {
      setCurrentStep(STEP_NUMBERS.checkBalance)
      return
    }
  }, [network, connectedWallets, accountStore.address, identity?.status, hasEnoughBalance])

  // Auto-refresh identity status when waiting for judgment in step 6
  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null;

    // Only poll when in verification step and waiting for judgment
    if (currentStep === STEP_NUMBERS.reviewAndSubmit && 
        (identity?.status === IdentityVerificationStatus.PendingJudgement || 
         identity?.status === IdentityVerificationStatus.FeePaid)) {
      
      console.log("🔄 Starting identity status polling - waiting for judgment...");
      
      // Poll every 10 seconds to check for status changes
      pollInterval = setInterval(async () => {
        console.log("🔄 Polling identity status...");
        try {
          await fetchIdAndJudgement();
        } catch (error) {
          console.error("❌ Error polling identity status:", error);
        }
      }, 10000); // Poll every 10 seconds
    }

    // Cleanup interval when component unmounts or conditions change
    return () => {
      if (pollInterval) {
        console.log("🔄 Stopping identity status polling");
        clearInterval(pollInterval);
      }
    };
  }, [currentStep, identity?.status, fetchIdAndJudgement]);

  const getCanProceedOverall = () => {
    if (currentStep === STEP_NUMBERS.pickNetwork && !_network) return false
    if (currentStep === STEP_NUMBERS.connectWallet && (connectedWallets.length < 1 || accounts.length < 1)) return false
    if (currentStep === STEP_NUMBERS.pickAccount && !selectedAccount) return false
    if (currentStep === STEP_NUMBERS.checkBalance
      && !hasEnoughBalance && identity.status < IdentityVerificationStatus.IdentitySet
    ) return false
    if (currentStep === STEP_NUMBERS.fillIdentityInfo && !canProceedFromIdentityStep) return false
    if (currentStep === STEP_NUMBERS.reviewAndSubmit && !canProceedFromVerificationStep) return false
    return true
  }

  const { theme: isDark } = useTheme()

  // Console log challenges from WebSocket for debugging

  if (isUserLoading || isLoadingProfileForEdit) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-pink-500 animate-spin" />
      </div>
    )
  }

  return <>
    <ConfirmActionDialog
      openDialog={openDialog}
      name={txName}
      closeTxDialog={closeTxDialog}
      openTxDialog={openTxDialog}
      submitTransaction={submitTransaction}
      estimatedCosts={estimatedCosts}
      txToConfirm={txToConfirm}
      xcmParams={{} as any} // Simplified for now
      teleportExpanded={false}
      setTeleportExpanded={() => { }} // Simplified for now
      displayedAccounts={accounts}
      chainStore={{
        id: network || "",
        name: networkDisplayName,
        tokenSymbol: "DOT", // This should be dynamic based on network
        tokenDecimals: 10, // This should be dynamic based on network
      } as any}
      accountStore={{
        address: walletAddress || "",
        encodedAddress: walletAddress || "",
      } as any}
      relayAndParachains={[]} // Simplified for now
      fromBalance={new BigNumber(0)} // Simplified for now
      balance={balance} // Simplified for now
      minimunTeleportAmount={new BigNumber(0)} // Simplified for now
      formatAmount={formatAmount}
      identity={identity || { status: IdentityVerificationStatus.NoIdentity, deposit: BigInt(0) } as any}
      isTxBusy={isTxBusy}
    />
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <header className="border-b border-pink-500/30 bg-gray-800/50 backdrop-blur-sm sticky top-0 z-20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 md:space-x-4">
              <Link to={isEditMode && editingProfileId ? `/profile/${editingProfileId}` : "/"}>
                <Button
                  variant="ghost"
                  className="text-gray-400 hover:bg-white/10 hover:text-white p-2 md:px-3 md:py-2"
                >
                  <ArrowLeft className="w-4 h-4 md:mr-2" />
                  <span className="hidden md:inline">{isEditMode ? "Back to Profile" : "Back to Home"}</span>
                </Button>
              </Link>
              <Logo />
            </div>
            <div className="flex items-center space-x-2">
              {isEditMode && (
                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                  <Edit className="w-3 h-3 mr-1" />
                  Editing Mode
                </Badge>
              )}
              {network && (
                <Badge className={`${networkColor} bg-opacity-20 text-opacity-100 hidden sm:inline-flex`}>
                  {networkDisplayName}
                  {/* TODO Maybe display if testnet. */}
                  {/* {isNetworkEncrypted && "(Private Mode)"} */}
                </Badge>
              )}
              <Badge className="bg-gray-700 text-white text-xs">
                <span className="hidden sm:inline">Step </span>
                {currentStep}/{TOTAL_STEPS}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold mb-2 text-center text-white">{stepTitles[currentStep - 1]}</h1>
          <p className="text-gray-400 text-center mb-8">
            {isEditMode
              ? "Update your decentralized identity information."
              : "Follow the steps to register your decentralized identity."}
          </p>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 md:p-8 shadow-xl min-h-[300px]">
            {currentStep === STEP_NUMBERS.pickNetwork && (
              <>
                <div className="mb-4 p-3 text-sm text-yellow-300 bg-yellow-900/20 border border-yellow-500/30 rounded-md flex items-start">
                  <Info className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-yellow-400" />
                  <span>
                    Registration is currently only available on Paseo testnet. We will be available as registrars on Polkadot and Kusama soon!
                  </span>
                </div>
                <NetworkSelection
                  networks={networks}
                  selectedNetwork={_network}
                  onSelect={(val) => _setNetwork(val as AppNetwork)}
                  hoveredNetwork={hoveredNetwork}
                  setHoveredNetwork={setHoveredNetwork}
                />
                {_network === "kusama" && (
                  <div className="mt-4 p-3 text-sm text-cyan-300 bg-cyan-900/20 border border-cyan-500/30 rounded-md flex items-start">
                    <Info className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-cyan-400" />
                    <span>
                      On Kusama, your identity data is signed for privacy. It won&apos;t be publicly readable on-chain
                      but can still be verified by authorized registrars.
                    </span>
                  </div>
                )}
              </>
            )}

            {currentStep === STEP_NUMBERS.connectWallet && (
              <div className="text-center space-y-6">
                <WalletIcon className="w-16 h-16 text-pink-500 mx-auto" />
                <h2 className="text-xl font-semibold">Connect Your Wallets</h2>
                <p className="text-gray-400">
                  In order to access your accounts, you need to connect your wallets.
                </p>
                {/* TODO Add wallet connection buttons for each extension */}
                {extensions.length > 0 && (<>
                  {accounts <= 0 && (<Alert className="bg-red-900/20 border-red-500/30 text-red-400">
                    <AlertCircle className="w-4 h-4 mr-2 inline-block" />
                    No accounts connected. Please make sure at least one wallet is connected and has accounts available.
                  </Alert>)}
                  <div className="p-3 bg-green-900/20 border border-green-500/30 rounded-md text-green-400">
                    {connectedWallets.length} Wallet{connectedWallets.length > 1 ? "s" : ""} Connected
                  </div>
                </>)}
                {extensions.length <= 0 && (
                  <Alert className="bg-red-900/20 border-red-500/30 text-red-400">
                    <AlertCircle className="w-4 h-4 mr-2 inline-block" />
                    No wallets connected. Please connect a wallet to continue.
                  </Alert>
                )}
                <Button
                  onClick={() => setOpenDialog("connectWallets")}
                  disabled={isWalletConnecting || !isWalletConnected}
                  className="w-full md:w-auto"
                >
                  Pick Account
                </Button>
              </div>
            )}

            {currentStep === STEP_NUMBERS.pickAccount && (
              <div className="space-y-6">
                <div className="text-center">
                  <WalletIcon className="w-16 h-16 text-pink-500 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold mb-2">Select Your Account</h2>
                  <p className="text-gray-400">
                    Choose the account that will be associated with your identity on the {networkDisplayName} network.
                  </p>
                </div>

                <AccountSelector
                  accounts={accounts}
                  selectedAccount={selectedAccount || walletAddress}
                  onSelect={(address: string) => setSelectedAccount(address as SS58String)}
                  hoveredAccount={hoveredAccount}
                  setHoveredAccount={setHoveredAccount}
                />
              </div>
            )}

            {currentStep === STEP_NUMBERS.checkBalance && (
              <BalanceCheck
                onSufficientBalance={handleNextStep}
                minBalanceAmount={minBalanceAmount}
                hasEnoughBalance={hasEnoughBalance}
              />
            )}

            {currentStep === STEP_NUMBERS.fillIdentityInfo && (
              <>
                {/* Simple Identity Setting Form - No Verification */}
                <SimpleIdentityForm
                  initialData={identityData}
                  onSubmit={() => { }}
                  isEditMode={isEditMode}
                  onDataChange={handleIdentityDataFormChange}
                  supportedFields={supportedFields}
                  identityStatus={identity?.status || IdentityVerificationStatus.NoIdentity}
                />
                <div className="mt-6 space-y-3">
                  <Button
                    onClick={onSetIdentity}
                    disabled={!canProceedFromIdentityStep || isSubmittingIdentity || isTxBusy}
                    className="w-full bg-pink-600 hover:bg-pink-700 disabled:bg-gray-700 disabled:text-gray-400"
                  >
                    {isSubmittingIdentity || isTxBusy ? (
                      <span className="flex items-center justify-center">
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing Transaction...
                      </span>
                    ) : (
                      <>Submit Identity & Request Judgment</>
                    )}
                  </Button>
                  {/* Show helpful hint if button is disabled */}
                  {!canProceedFromIdentityStep && !isSubmittingIdentity && !isTxBusy && (
                    <p className="text-xs text-center text-gray-500">
                      Fill in Display Name and at least one other field to continue
                    </p>
                  )}
                </div>
              </>
            )}

            {currentStep === STEP_NUMBERS.reviewAndSubmit && (
              <>
                {/* Identity Verification Form - All verification happens here */}
                <IdentityVerificationForm
                  identityData={identityData}
                  identityStatus={identity?.status || IdentityVerificationStatus.Unknown}
                  supportedFields={supportedFields}
                  canVerifyFields={identity?.status === IdentityVerificationStatus.FeePaid}
                />


                {/* Simplified summary card */}
                <Card className="bg-gray-800/50 border-gray-700 mt-6">
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-gray-700/50">
                      <span className="text-sm text-gray-400">Network</span>
                      <span className="text-sm text-white font-medium">{chainStore.relay.name}</span>
                    </div>
                    <div className="flex items-center justify-between pb-3 border-b border-gray-700/50">
                      <span className="text-sm text-gray-400">Account</span>
                      <span className="text-xs text-white font-mono">
                        {accountStore.encodedAddress?.substring(0, 8)}...{accountStore.encodedAddress?.substring(accountStore.encodedAddress.length - 6)}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <span className="text-sm text-gray-400">Verified Fields</span>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(identityData)
                          .filter(([key, value]) => value && value.trim() !== "" && getFieldStatus(key)?.status === "verified")
                          .map(([key]) => (
                            <span key={key} className="px-2 py-1 text-xs bg-green-900/30 text-green-400 rounded-full border border-green-700/50">
                              {key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                            </span>
                          ))}
                        {Object.entries(identityData)
                          .filter(([key, value]) => value && value.trim() !== "" && getFieldStatus(key)?.status === "verified").length === 0 && (
                            <span className="text-xs text-gray-500">None verified yet</span>
                          )}
                      </div>
                    </div>
                    {/* Action buttons based on verification state */}
                    {identity?.status === IdentityVerificationStatus.IdentityVerified ? (
                      <Button
                        onClick={handleNextStep}
                        className="w-full mt-6 py-3 text-base bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Identity Verified - Continue
                      </Button>
                    ) : canProceedFromVerificationStep ? (
                      <Button
                        onClick={handleNextStep}
                        className="w-full mt-6 py-3 text-base"
                      >
                        Continue to Complete Registration
                      </Button>
                    ) : (
                      <div className="w-full mt-6 py-3 text-base bg-gray-800/50 text-gray-400 rounded-md text-center border border-gray-700/50">
                        {identity?.status === IdentityVerificationStatus.FeePaid ? (
                          <span className="flex items-center justify-center">
                            <AlertCircle className="w-4 h-4 mr-2" />
                            Complete Field Verifications Above
                          </span>
                        ) : identity?.status === IdentityVerificationStatus.PendingJudgement ? (
                          <span className="flex items-center justify-center">
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Waiting for Registrar Judgment...
                          </span>
                        ) : (
                          "Verification In Progress"
                        )}
                      </div>
                    )}
                    
                    {/* Cancel Request Button - Only show if request is pending */}
                    {(() => {
                      const shouldShowCancelButton = (identity?.status === IdentityVerificationStatus.PendingJudgement || 
                                                     identity?.status === IdentityVerificationStatus.FeePaid);
                      console.log("🔴 Identity status:", identity?.status);
                      console.log("🔴 Should show cancel button:", shouldShowCancelButton);
                      console.log("🔴 PendingJudgement constant:", IdentityVerificationStatus.PendingJudgement);
                      console.log("🔴 FeePaid constant:", IdentityVerificationStatus.FeePaid);
                      
                      return shouldShowCancelButton && (
                        <Button
                          onClick={onCancelRequest}
                          disabled={isSubmittingIdentity}
                          variant="outline"
                          className="w-full mt-3 py-3 text-base border-red-500/70 text-red-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-400"
                        >
                          {isSubmittingIdentity ? "Processing..." : "Cancel Request & Update Identity"}
                        </Button>
                      );
                    })()}
                  </CardContent>
                </Card>
              </>
            )}

            {currentStep === STEP_NUMBERS.complete && (
              <div className="text-center space-y-6 py-8">
                <UserCheck className="w-20 h-20 text-green-500 mx-auto" />
                <h2 className="text-2xl font-semibold text-white">
                  {isEditMode ? "Update Successful!" : "Registration Successful!"}
                </h2>
                <p className="text-gray-300">
                  Your identity has been successfully {isEditMode ? "updated" : "registered"} on the{" "}
                  {networkDisplayName} network.
                </p>
                <p className="text-gray-400 text-sm">
                  Wallet:{" "}
                  <span className="font-mono">
                    {walletAddress?.substring(0, 10)}...{walletAddress?.substring(walletAddress.length - 10)}
                  </span>
                </p>
                <Link to={`/profile/${editingProfileId || walletAddress || "me"}`}>
                  View Your Profile
                </Link>
              </div>
            )}
          </div>

          <div className="mt-8 flex justify-between items-center">
            <Button
              onClick={handlePreviousStep}
              disabled={currentStep === 1 || isSubmittingIdentity || isTxBusy}
              variant="ghost"
              className="text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-50 px-4 py-2 rounded-md"
            >
              Previous
            </Button>
            {/* Show Next button on applicable steps */}
            {currentStep < TOTAL_STEPS && currentStep !== STEP_NUMBERS.fillIdentityInfo && currentStep !== STEP_NUMBERS.reviewAndSubmit && (
              <Button
                onClick={handleNextStep}
                disabled={!getCanProceedOverall() || isSubmittingIdentity || isTxBusy}
                variant="ghost"
                className="text-pink-400 hover:bg-pink-500/10 hover:text-pink-300 disabled:opacity-50 px-4 py-2 rounded-md"
              >
                Next
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  </>
}
