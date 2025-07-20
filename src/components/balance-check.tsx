import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNetwork } from "@/contexts/network-context";
import { usePolkadotApi } from "@/contexts/PolkadotApiContext";
import { useWallet } from "@/contexts/wallet-context"; // Import wallet context
import { useFormatAmount } from "@/hooks/useFormatAmount";
import { verifyStatuses } from "@/types/Identity";
import BigNumber from "bignumber.js";
import { AlertCircle, ArrowLeftRight, CheckCircle, Coins, Loader2, Users, Wallet, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { ChipInRequestModal } from "./chip-in-request-modal"; // Import the new modal
import { TeleporterDialog } from "./dialogs/teleportDialog"; // Import the teleporter dialog

interface BalanceCheckProps {
  onSufficientBalance: () => void
  minBalanceAmount?: BigNumber | null // Optional minimum balance amount
  hasEnoughBalance?: boolean | null // Optional prop to control balance check
}

export function BalanceCheck({
  onSufficientBalance, minBalanceAmount, hasEnoughBalance
}: BalanceCheckProps) {
  const { network, networkDisplayName } = useNetwork()
  const [hasChecked, setHasChecked] = useState(false)
  const [showChipInModal, setShowChipInModal] = useState(false) // State for modal
  const [showTeleportDialog, setShowTeleportDialog] = useState(false) // State for teleport dialog
  const { address: walletAddress } = useWallet() // Get wallet address from context

  const { chainStore, accountStore, isTxBusy, balance, identity } = usePolkadotApi()

  // Use passed balance or fall back to context balance
  const address = accountStore.encodedAddress
  console.debug("BalanceCheck address:", address, "balance:", balance.toString())
  const isLoading = balance === undefined
  const [isRequestingTokens, setIsRequestingTokens] = useState(false)

  useEffect(() => {
    if (address && !hasChecked) {
      // TODO: Add proper balance check implementation
      setHasChecked(true)
    }
  }, [address, hasChecked])

  const balanceFloat = balance ? parseFloat(balance.toString()) : 0
  const requiredBalance = minBalanceAmount || new BigNumber(0) // Use provided min balance or default to 0
  const requiredBalanceFloat = parseFloat(requiredBalance.toString())
  const hasSufficientBalance = hasEnoughBalance ?? (balance && balance.isGreaterThanOrEqualTo(requiredBalance))
  const needsTokensOnPaseo = network === "paseo" && balanceFloat < requiredBalanceFloat
  const canRequestChipIn = !hasSufficientBalance && !needsTokensOnPaseo && network !== "paseo" // Only for non-Paseo, insufficient balance

  const formatAmount = useFormatAmount({
    symbol: chainStore.tokenSymbol || 'TOKEN',
    tokenDecimals: chainStore.tokenDecimals || 12,
  })

  const balanceFormatted = formatAmount(balance || 0)
  const requiredBalanceFormatted = formatAmount(requiredBalance || 0)

  const handleRequestTokens = async () => {
    setIsRequestingTokens(true)
    try {
      // TODO: Implement proper token request functionality
      // For now, just simulate a request
      await new Promise(resolve => setTimeout(resolve, 2000))
      // Re-check balance after token request
      onSufficientBalance()
    } catch (error) {
      console.error('Failed to request tokens:', error)
    } finally {
      setIsRequestingTokens(false)
    }
  }

  const handleTeleportTokens = () => {
    setShowTeleportDialog(true)
  }

  const handleProceed = () => {
    onSufficientBalance()
  }

  const getNetworkToken = () => {
    switch (network) {
      case "paseo":
        return "PAS"
      case "polkadot":
        return "DOT"
      case "kusama":
        return "KSM"
      default:
        return "TOKEN"
    }
  }

  const amountNeededForChipIn = requiredBalanceFloat - balanceFloat > 0 ? requiredBalanceFloat - balanceFloat : 0

  const fauceturl = import.meta.env[`VITE_APP_${(chainStore.id as string).split("_")[0].toUpperCase()}_FAUCET_URL`]

  return (
    <>
      <Card className="bg-gray-800 border-pink-500/30">
        <CardHeader>
          <CardTitle className="flex items-center text-white">
            <Wallet className="w-6 h-6 mr-2 text-pink-500" />
            Balance Check
          </CardTitle>
          <p className="text-gray-400">Checking your balance to ensure you can register your identity.</p>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="p-4 bg-gray-700/30 rounded-lg border border-gray-600">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400">Account Name:</span>
              <span className="text-white font-mono text-lg">
                {accountStore.name}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Address:</span>
              <span className="text-gray-300 text-sm font-mono">
                {address ? `${address.substring(0, 10)}...${address.substring(address.length - 10)}` : null}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Network:</span>
              <span className="text-gray-300 text-sm font-mono">
                {chainStore.relay.name}
              </span>
            </div>
          </div>

          <div className="p-4 bg-gray-700/30 rounded-lg border border-gray-600">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400">Current Balance:</span>
              {isLoading ? (
                <div className="flex items-center">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  <span className="text-gray-400">Checking...</span>
                </div>
              ) : (
                <span className="text-white font-mono text-sm">
                  {balanceFormatted}
                </span>
              )}
            </div>

            {!isLoading && (
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Required for registration:</span>
                <span className="text-gray-300 font-mono text-sm">
                  {requiredBalanceFormatted}
                </span>
              </div>
            )}
          </div>

          {!isLoading && (
            <>
              {identity.status >= verifyStatuses.IdentitySet ? (
                <div className="space-y-4">
                  <div className="flex items-center p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-md">
                    <AlertCircle className="w-5 h-5 text-yellow-400 mr-2" />
                    <span className="text-yellow-400 font-medium">Identity already registered</span>
                  </div>
                  <div className="p-4 bg-gray-700/30 rounded-md">
                    <p className="text-gray-300 text-sm">
                      You already have an identity registered on this network. You can proceed to the next step.
                    </p>
                  </div>
                  <Button onClick={handleProceed} className="w-full">
                    Continue to Next Step
                  </Button>
                </div>
              ) : (hasSufficientBalance
                ? (
                  <div className="space-y-4">
                    <div className="flex items-center p-3 bg-green-900/20 border border-green-500/30 rounded-md">
                      <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
                      <span className="text-green-400 font-medium">Sufficient balance for registration</span>
                    </div>
                    <div className="p-4 bg-gray-700/30 rounded-md">
                      <p className="text-gray-300 text-sm">You can proceed to registration.</p>
                    </div>
                    <Button onClick={handleProceed} className="w-full">
                      Continue to Registration
                    </Button>
                  </div>
                ) : hasSufficientBalance ? (
                  <div className="space-y-4">
                    <div className="flex items-center p-3 bg-green-900/20 border border-green-500/30 rounded-md">
                      <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
                      <span className="text-green-400 font-medium">Sufficient balance for registration</span>
                    </div>
                    <Button onClick={handleProceed} className="w-full">
                      Continue to Registration
                    </Button>
                  </div>
                ) : needsTokensOnPaseo ? (
                  <div className="space-y-4">
                    <div className="flex items-center p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-md">
                      <AlertCircle className="w-5 h-5 text-yellow-400 mr-2" />
                      <span className="text-yellow-400 font-medium">Insufficient balance for registration</span>
                    </div>
                    <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-md">
                      <div className="flex items-center mb-2">
                        <Zap className="w-4 h-4 text-blue-400 mr-2" />
                        <span className="text-blue-400 font-medium">Free Tokens Available!</span>
                      </div>
                      <p className="text-blue-300 text-sm mb-3">
                        Since you&apos;re registering on Paseo testnet, we can send you free tokens to get started.
                      </p>
                      <span className="inline-flex items-center rounded-full bg-blue-500 text-white px-2.5 py-0.5 text-xs font-semibold">No cost • Instant delivery</span>
                    </div>
                    <Button
                      onClick={handleRequestTokens}
                      disabled={isRequestingTokens}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {isRequestingTokens ? (
                        <div className="flex items-center">
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Sending tokens...
                        </div>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 mr-2" />
                          Request Free Tokens
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center p-3 bg-red-900/20 border border-red-500/30 rounded-md">
                      <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
                      <span className="text-red-400 font-medium">Insufficient balance for registration</span>
                    </div>
                    <div className="p-4 bg-gray-700/30 rounded-md">
                      <p className="text-gray-300 text-sm mb-2">
                        You need at least {requiredBalance.toFixed(2)} {getNetworkToken()} to register your identity on{" "}
                        {networkDisplayName}.
                      </p>
                      <p className="text-gray-400 text-xs">
                        Please add funds to your wallet and refresh, or request a chip-in.
                      </p>
                    </div>
                    <div className="flex flex-row gap-2">
                      {fauceturl && (
                        <Button
                          onClick={() => window.open(fauceturl, '_blank')}
                          className="w-full"
                          variant="outline"
                        >
                          <Coins className="w-4 h-4 mr-2" />
                          Get Test Tokens
                        </Button>
                      )}
                      {canRequestChipIn && (
                        <Button
                          onClick={() => setShowChipInModal(true)}
                          className="w-full"
                          variant="outline"
                        >
                          <Users className="w-4 h-4 mr-2" />
                          Request Chip-In
                        </Button>
                      )}
                      <Button
                        onClick={handleTeleportTokens}
                        disabled={isTxBusy}
                        className="w-full"
                      >
                        <ArrowLeftRight className="w-4 h-4 mr-2" />
                        Teleport Tokens
                      </Button>
                    </div>
                  </div>
                )
              )}
            </>
          )}
        </CardContent>
      </Card>

      {canRequestChipIn && walletAddress && (
        <ChipInRequestModal
          isOpen={showChipInModal}
          onClose={() => setShowChipInModal(false)}
          currentUserAddress={walletAddress}
          networkDisplayName={networkDisplayName}
          requiredAmount={amountNeededForChipIn}
          tokenSymbol={getNetworkToken()}
        />
      )}

      <TeleporterDialog
        isTxBusy={isTxBusy}
        open={showTeleportDialog}
        setOpen={setShowTeleportDialog}
        teleportAmount={minBalanceAmount || new BigNumber(0)}
      />
    </>
  )
}
