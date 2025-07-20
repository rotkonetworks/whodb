import { ArrowLeft, Edit, Info, ListChecks, Loader2, UserCheck, WalletIcon, } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { BalanceCheck } from "@/components/balance-check"
import ConfirmActionDialog from "@/components/dialogs/ConfirmActionDialog"
import { IdentityVerificationForm } from "@/components/identity-verification-form"; // New verification form
import { Logo } from "@/components/logo"
import { NetworkSelection } from "@/components/network-selection-register"
import { SimpleIdentityForm } from "@/components/simple-identity-form"; // New simple form
import { useTheme } from "@/components/theme-provider-simple"
import { AccountSelector } from "@/components/ui/account-selector"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useNetwork, type Network as AppNetwork } from "@/contexts/network-context"
import { usePolkadotApi } from "@/contexts/PolkadotApiContext"
import { useUser } from "@/contexts/user-context"; // For fetching profile to edit
import { FieldVerification, useVerification } from "@/contexts/verification-context"
import { useWallet } from "@/contexts/wallet-context"
import { useUrlParams } from "@/hooks/useUrlParams"
import { getProfile, type Profile as ProfileType } from "@/lib/profile"; // For fetching profile by ID
import { CHAIN_CONFIG } from "@/polkadot-api/chain-config"
import { chainStore as _chainStore } from "@/store/ChainStore"
import { ChallengeStatus } from "@/store/challengesStore"
import { DialogMode } from "@/types"
import { verifyStatuses, type IdentityData } from "@/types/Identity"; // Import IdentityData
import { useConnectedWallets } from "@reactive-dot/react"
import BigNumber from "bignumber.js"
import { ConnectionDialog } from "dot-connect/react.js"
import { Binary, SS58String } from "polkadot-api"

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

  const { network, setNetwork, networkDisplayName, networkColor, isEncrypted: isNetworkEncrypted } = useNetwork()
  const [_network, _setNetwork] = useState<AppNetwork | null>(network)

  const polkadotApiContext = usePolkadotApi()
  const {
    chainStore,
    accountStore,
    accounts,
    identity,
    fetchIdAndJudgement,
    challenges,
    formatAmount,
    isTxBusy,
    supportedFields,
    typedApi,
    sendPGPVerification,
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

  const {
    isConnected: isWalletConnected,
    isConnecting: isWalletConnecting,
  } = useWallet()

  const walletAddress = useMemo(() => accountStore.address, [accountStore.address])

  const { userProfile: loggedInUserProfile, isLoading: isUserLoading } = useUser()
  const {
    getFieldStatus,
    getAllFilledFields,
    resetFieldVerification,
    setChallenges,
    setSendPGPVerification,
    setInitialVerifications,
  } = useVerification()

  useEffect(() => {
    const challengeStatusMapping = {
      [ChallengeStatus.Unknown]: "unverified",
      [ChallengeStatus.Pending]: "pending",
      [ChallengeStatus.Passed]: "verified",
      [ChallengeStatus.Failed]: "failed",
    }

    const verifications: FieldVerification[] = Object.entries(challenges || {}).map(([key, challenge]) => {
      const status = challengeStatusMapping[challenge.status] || "unknown"

      return {
        field: key,
        status,
        lastVerified: challenge.lastVerified,
        verificationMethod: challenge.verificationMethod,
        verificationPayload: challenge.verificationPayload,
      }
    })

    setInitialVerifications(verifications)
  }, [challenges, setInitialVerifications])

  const [currentStep, setCurrentStep] = useState(1)
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

  const location = useLocation()
  const { setParam, urlParams } = useUrlParams()

  const editIdParam = urlParams["editId"]
  const flowParam = urlParams["flow"]
  const parentIdParam = urlParams["parentId"]
  const isEditingCurrentUserFromParams = urlParams["edit"] === "true"

  const connectedWallets = useConnectedWallets();

  useEffect(() => {// Set up profile/idenity data based on URL parameters or logged in user
    // Wait for user data to be loaded before doing anything.
    if (isUserLoading) {
      return
    }

    const loadProfileData = async (idToLoad: string, currentFlow?: string | null, currentParentId?: string | null) => {
      setIsLoadingProfileForEdit(true)
      let profileDataToSet: Partial<IdentityData> = {
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
      }
      try {
        let fetchedProfile: ProfileType | null = null
        if (currentFlow === "subidentity" && currentParentId) {
          const parentProfile = await getProfile(currentParentId)
          fetchedProfile = parentProfile.subaccounts?.find((sa) => sa.id === idToLoad) || null
          if (!fetchedProfile) throw new Error(`Subidentity ${idToLoad} not found under parent ${currentParentId}.`)
        } else {
          fetchedProfile = await getProfile(idToLoad)
        }

        if (fetchedProfile) {
          profileDataToSet = {
            display: fetchedProfile.displayName || "",
            email: fetchedProfile.email || "",
            matrix: fetchedProfile.matrix || "",
            twitter: fetchedProfile.twitter || "",
            web: fetchedProfile.web || "",
            github: fetchedProfile.github || "",
            pgp_fingerprint: fetchedProfile.pgp_fingerprint || "",
            discord: fetchedProfile.discord || "",
            image: fetchedProfile.image || "",
            legal: fetchedProfile.legal || "",
          }
          setIdentityData(profileDataToSet as IdentityData) // Ensure full IdentityData type
          const fieldsToReset: (keyof IdentityData)[] = [
            "email",
            "matrix",
            "twitter",
            "web",
            "github",
            "pgp_fingerprint",
            "discord",
            "image",
            "legal",
          ]
          fieldsToReset.forEach((key) => {
            if (profileDataToSet[key] && (profileDataToSet[key] as string).trim() !== "") {
              resetFieldVerification(String(key))
            }
          })
        } else {
          throw new Error("Profile data for editing could not be found.")
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to load profile data for editing.")
        navigate(idToLoad ? `/profile/${idToLoad}` : "/")
      } finally {
        setIsLoadingProfileForEdit(false)
      }
    }

    if (editIdParam) {
      if (!isEditMode || editIdParam !== editingProfileId) {
        setIsEditMode(true)
        setEditingProfileId(editIdParam)
        loadProfileData(editIdParam, flowParam, parentIdParam)
      }
    } else if (isEditingCurrentUserFromParams) {
      if (loggedInUserProfile) {
        if (!isEditMode || (loggedInUserProfile.id && loggedInUserProfile.id !== editingProfileId)) {
          setIsEditMode(true)
          if (!loggedInUserProfile.id) {
            toast.error("Logged in user profile ID is missing.")
            navigate("/login")
            return
          }
          setEditingProfileId(loggedInUserProfile.id)
          const currentUserData: IdentityData = {
            display: loggedInUserProfile.displayName || "",
            email: loggedInUserProfile.email || "",
            matrix: loggedInUserProfile.matrix || "",
            twitter: loggedInUserProfile.twitter || "",
            web: loggedInUserProfile.web || "",
            github: loggedInUserProfile.github || "",
            pgp_fingerprint: loggedInUserProfile.pgp_fingerprint || "",
            discord: loggedInUserProfile.discord || "",
            image: loggedInUserProfile.image || "",
            legal: loggedInUserProfile.legal || "",
          }
          setIdentityData(currentUserData)
          const fieldsToReset: (keyof IdentityData)[] = [
            "email",
            "matrix",
            "twitter",
            "web",
            "github",
            "pgp_fingerprint",
            "discord",
            "image",
            "legal",
          ]
          fieldsToReset.forEach((key) => {
            if (currentUserData[key] && currentUserData[key]?.trim() !== "") {
              resetFieldVerification(String(key))
            }
          })
          setIsLoadingProfileForEdit(false)
        }
      } else {
        toast.error("Please log in to edit your profile.")
        navigate("/login")
      }
    } else {
      if (isEditMode) {
        setIsEditMode(false)
        setEditingProfileId(null)
        setIdentityData({
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
        const allVerifiableFields: (keyof IdentityData)[] = [
          "email",
          "matrix",
          "twitter",
          "web",
          "github",
          "pgp_fingerprint",
          "discord",
          "image",
          "legal",
        ]
        allVerifiableFields.forEach(field => resetFieldVerification(String(field)))
        setIsLoadingProfileForEdit(false)
      }
    }
  }, [
    isUserLoading,
    editIdParam,
    flowParam,
    parentIdParam,
    isEditingCurrentUserFromParams,
    loggedInUserProfile,
    isEditMode,
    editingProfileId,
    balance, // current account balance
    resetFieldVerification,
    navigate,
  ])

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
    if (identity.status === verifyStatuses.IdentityVerified) {
      // If identity is already verified, we can proceed
      return true
    }

    // For the fillIdentityInfo step, we only need displayName + at least one other field
    // No verification required at this step
    const hasDisplayName = identityData.display.trim() !== ""
    const otherFields = Object.entries(identityData)
      .filter(([key, value]) => key !== "displayName" && value && value.trim() !== "")
    const hasOtherFields = otherFields.length > 0

    return hasDisplayName && hasOtherFields
  }, [identityData])

  const canProceedFromVerificationStep = useMemo(() => {
    if (identity.status === verifyStatuses.IdentityVerified) {
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
      // For fillIdentityInfo, we only need displayName + at least one other field
      // No verification required at this step
      if (identityData.display.trim() === "") {
        toast.error("Please provide a Display Name.")
        return
      } else if (getAllFilledFields(identityData).filter((f) => f !== "display").length === 0) {
        toast.error("Please fill at least one other field besides Display Name.")
        return
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
  }, [])

  const submitTransaction = useCallback(async () => {
    if (!txToConfirm) {
      toast.error("No transaction to submit.")
      return
    }
    if (!walletAddress || !typedApi) {
      toast.error("No wallet connected.")
      return
    }

    setIsSubmittingIdentity(true)

    try {
      let action = ""
      let nextStep = currentStep

      // Determine action based on dialog mode
      if (currentDialogMode === "setIdentity") {
        action = isEditMode ? "Updating" : "Submitting"
        nextStep = STEP_NUMBERS.reviewAndSubmit
      } else if (currentDialogMode === "requestJudgement") {
        action = "Requesting judgement for"
        // Stay on same step to complete verification
      }

      await signSubmitAndWatch({
        call: txToConfirm,
        name: `${action} identity`,
      })

      // Close the dialog
      closeTxDialog()



    } catch (error: any) {
      console.error("Transaction submission error:", error)
      toast.error(`Failed to submit transaction: ${error.message}`)
      setIsSubmittingIdentity(false)
    }
  }, [txToConfirm, walletAddress, currentDialogMode, isEditMode, networkDisplayName, isNetworkEncrypted, closeTxDialog, currentStep, fetchIdAndJudgement])

  const [openDialog, setOpenDialog] = useState<DialogMode>(null)
  const [txName, setTxName] = useState<string | null>(null)

  const onSetIdentity = async () => {
    if (!walletAddress || !typedApi) return

    try {
      // Prepare transaction data
      const dataToSubmit = identityData

      // Transform the data to the format expected by the blockchain
      const initialInfo = {
        display: { type: "None" },
        legal: { type: "None" },
        web: { type: "None" },
        matrix: { type: "None" },
        email: { type: "None" },
        image: { type: "None" },
        twitter: { type: "None" },
        github: { type: "None" },
        discord: { type: "None" },
        pgp_fingerprint: { type: "None" }
      }

      const info: any = {
        ...initialInfo,
        ...Object.fromEntries(
          Object.entries(dataToSubmit)
            .filter(([_, value]) => value && value.trim() !== "")
            .map(([key, value]) => {
              // Map field names to blockchain field names
              const blockchainField = key || key

              if (key === "pgp_fingerprint") {
                return [null, null] // Handle separately
              }

              return [blockchainField, {
                type: `Raw${value.length}`,
                value: Binary.fromText(value)
              }]
            })
            .filter(([key]) => key !== null)
        )
      }

      // Handle PGP fingerprint separately
      if (dataToSubmit.pgp_fingerprint && dataToSubmit.pgp_fingerprint.trim() !== "") {
        info.pgp_fingerprint = Binary.fromHex(
          dataToSubmit.pgp_fingerprint.startsWith('0x')
            ? dataToSubmit.pgp_fingerprint.slice(2)
            : dataToSubmit.pgp_fingerprint
        )
      }

      // Create the transaction
      const tx = (typedApi.tx.Identity as any).set_identity({ info })

      // Estimate costs
      const estimatedCosts = {
        fees: await tx.getEstimatedFees(walletAddress, { at: "best" })
      }

      // Set dialog state for transaction confirmation
      setEstimatedCosts(estimatedCosts)
      setTxToConfirm(tx)
      setCurrentDialogMode("setIdentity")

      // Open transaction dialog
      setOpenDialog("setIdentity")
      setTxName("Set Identity")
    } catch (error: any) {
      console.error("Transaction preparation error:", error)
      toast.error(`Failed to prepare transaction: ${error.message}`)
    }
  }

  const onRequestJudgement = async () => {
    if (!walletAddress || !typedApi) return

    try {
      // Create the request judgement transaction
      const registrarIndex = 0 // This should be dynamic based on your registrar
      const tx = (typedApi.tx.Identity as any).request_judgement({
        reg_index: registrarIndex,
        max_fee: BigInt(1000000000000) // This should be dynamic based on registrar fee
      })

      // Estimate costs
      const estimatedCosts = {
        fees: await tx.getEstimatedFees(walletAddress, { at: "best" })
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

  const stepTitles = [
    "Select Network",
    "Connect Wallets",
    "Select Account",
    "Check Balance",
    isEditMode ? "Update & Verify Identity Info" : "Provide & Verify Identity Info",
    isEditMode ? "Review & Submit Update" : "Review & Submit",
    isEditMode ? "Update Complete" : "Registration Complete",
  ]

  const networks = Object.entries(CHAIN_CONFIG.chains)
    .filter(([key]) => key.endsWith("_people"))
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

  useEffect(() => {// Set steps based on whether required information is available
    if (network) {
      setCurrentStep(STEP_NUMBERS.connectWallet)
    } else {
      setCurrentStep(STEP_NUMBERS.pickNetwork)
      return
    }

    if (connectedWallets.length > 0) {
      setCurrentStep(STEP_NUMBERS.pickAccount)
    } else {
      setCurrentStep(STEP_NUMBERS.connectWallet)
      return;
    }

    if (accountStore.address) {
      setCurrentStep(STEP_NUMBERS.checkBalancet)
    } else {
      setCurrentStep(STEP_NUMBERS.pickAccount)
      return
    }

    if (hasEnoughBalance === true) {
      // If we have an identity set, go to verification, otherwise go to identity form
      if (identity?.status === verifyStatuses.IdentitySet || identity?.status === verifyStatuses.JudgementRequested || identity?.status === verifyStatuses.FeePaid) {
        setCurrentStep(STEP_NUMBERS.reviewAndSubmit)
      } else {
        setCurrentStep(STEP_NUMBERS.fillIdentityInfo)
      }
    } else if (hasEnoughBalance === false) {
      setCurrentStep(STEP_NUMBERS.checkBalance)
      return
    }
  }, [network, connectedWallets, accountStore.address, identity?.status, hasEnoughBalance])

  const getCanProceedOverall = () => {
    if (currentStep === STEP_NUMBERS.pickNetwork && !_network) return false
    if (currentStep === STEP_NUMBERS.connectWallet && connectedWallets.length < 1) return false
    if (currentStep === STEP_NUMBERS.pickAccount && !selectedAccount) return false
    if (currentStep === STEP_NUMBERS.checkBalance
      && !hasEnoughBalance && identity.status < verifyStatuses.IdentitySet
    ) return false
    if (currentStep === STEP_NUMBERS.fillIdentityInfo && !canProceedFromIdentityStep) return false
    if (currentStep === STEP_NUMBERS.reviewAndSubmit && !canProceedFromVerificationStep) return false
    return true
  }

  const { theme: isDark } = useTheme()

  // Sync WebSocket challenges with verification context
  useEffect(() => {
    if (challenges && typeof challenges === 'object') {
      setChallenges(challenges)
    }
  }, [challenges, setChallenges])

  // Sync sendPGPVerification function with verification context
  useEffect(() => {
    if (sendPGPVerification) {
      setSendPGPVerification(() => sendPGPVerification)
    }
  }, [sendPGPVerification, setSendPGPVerification])

  if (isUserLoading || isLoadingProfileForEdit) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-pink-500 animate-spin" />
      </div>
    )
  }

  return <>
    <ConnectionDialog open={openDialog === "connectWallets"}
      onClose={() => { setOpenDialog(null) }}
      dark={isDark === "dark"}
    />
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
      balance={new BigNumber(0)} // Simplified for now
      minimunTeleportAmount={new BigNumber(0)} // Simplified for now
      formatAmount={formatAmount}
      config={{} as any} // Simplified for now
      identity={identity || { status: verifyStatuses.NoIdentity, deposit: BigInt(0) } as any}
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
                {/* {wallets.length > 0 && (
                )} */}
                <div className="p-3 bg-green-900/20 border border-green-500/30 rounded-md text-green-400">
                  {connectedWallets.length} Wallet{connectedWallets.length > 1 ? "s" : ""} Connected
                </div>
                <Button
                  onClick={() => setOpenDialog("connectWallets")}
                  disabled={isWalletConnecting || isWalletConnected}
                  className="w-full md:w-auto"
                >
                  {openDialog === "connectWallets" ? "Managing..." : "Manage Wallets"}
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
                  selectedAccount={selectedAccount || walletAddress}
                  onSelect={(address: string) => setSelectedAccount(address as SS58String)}
                  hoveredAccount={hoveredAccount}
                  setHoveredAccount={setHoveredAccount}
                />
              </div>
            )}

            {currentStep === STEP_NUMBERS.checkBalance && walletAddress && (
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
                  identityStatus={identity?.status || verifyStatuses.NoIdentity}
                />
                <Button
                  onClick={onSetIdentity}
                  disabled={!canProceedFromIdentityStep || isSubmittingIdentity}
                  className="w-full mt-6"
                >
                  {isSubmittingIdentity
                    ? "Submitting Identity Data..."
                    : identity.status === verifyStatuses.NoIdentity
                      ? "Submit Identity Data"
                      : "Update Identity Data"
                  }
                </Button>
              </>
            )}

            {currentStep === STEP_NUMBERS.reviewAndSubmit && walletAddress && (
              <>
                {/* Identity Verification Form - All verification happens here */}
                <IdentityVerificationForm
                  identityData={identityData}
                  identityStatus={identity?.status || verifyStatuses.Unknown}
                  supportedFields={supportedFields}
                  canVerifyFields={identity?.status === verifyStatuses.FeePaid}
                />

                <Card className="bg-gray-800/50 border-gray-700 mt-6">
                  <CardHeader>
                    <CardTitle className="flex items-center text-white text-xl">
                      <ListChecks className="w-6 h-6 mr-3 text-pink-400" />
                      Review & Submit
                    </CardTitle>
                    <CardDescription className="text-gray-400 text-sm">
                      Verify all your information above, then submit to the {networkDisplayName} blockchain.
                      {isNetworkEncrypted && " Data on this network will be signed for privacy."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {/* TODO Display as profile design */}
                    <div className="p-3 rounded-md bg-gray-700/30 border border-gray-600/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-sm">Network:</span>
                        <span className="text-gray-300 text-sm font-mono">
                          {chainStore.relay.name}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-sm">Wallet Address:</span>
                        <span className="text-gray-300 text-sm font-mono break-all">
                          {accountStore.encodedAddress.substring(0, 10)}...{accountStore.encodedAddress.substring(accountStore.encodedAddress.length - 10)}
                        </span>
                      </div>
                      {Object.entries(identityData)
                        .filter(([key, value]) => value && value.trim() !== "" && getFieldStatus(key)?.status === "verified")
                        .map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between">
                            <span className="text-gray-400 text-sm capitalize">
                              {key.replace(/([A-Z])/g, " $1").replace(/_/g, " ")}:
                            </span>
                            <span className="text-gray-300 text-sm font-mono break-all">{value}</span>
                          </div>
                        ))}
                    </div>
                    <Button
                      onClick={identity?.status === verifyStatuses.IdentitySet ? onRequestJudgement : () => { }}
                      disabled={
                        (identity?.status === verifyStatuses.IdentitySet && false) || // Can request judgement
                        (identity?.status !== verifyStatuses.IdentitySet && !canProceedFromVerificationStep) // Need verification
                      }
                      className="w-full mt-6 py-3 text-base"
                    >
                      {identity?.status === verifyStatuses.IdentitySet
                        ? "Request Judgement & Pay Fee"
                        : identity?.status === verifyStatuses.FeePaid
                          ? "Complete All Verifications Above"
                          : identity?.status === verifyStatuses.IdentityVerified
                            ? "Identity Fully Verified!"
                            : "Complete Verification Steps"
                      }
                    </Button>
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
              disabled={currentStep === 1 || isSubmittingIdentity}
              variant="ghost"
              className="text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-50 px-4 py-2 rounded-md"
            >
              Previous
            </Button>
            {/* currentStep < TOTAL_STEPS && currentStep !== 3 && currentStep !== 5 && currentStep !== 6 && ( */}
            {currentStep < TOTAL_STEPS && (
              <Button
                onClick={handleNextStep}
                disabled={!getCanProceedOverall() || isSubmittingIdentity}
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
