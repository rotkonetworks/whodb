import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNetwork } from "@/contexts/network-context";
import { usePolkadotApi } from "@/contexts/PolkadotApiContext";
import { useWallet } from "@/contexts/wallet-context"; // Import wallet context
import { useFormatAmount } from "@/hooks/useFormatAmount";
import BigNumber from "bignumber.js";
import { AlertCircle, CheckCircle, Loader2, Users, Wallet, Zap } from "lucide-react";
import { SS58String } from "polkadot-api";
import { useEffect, useState } from "react";
import { ChipInRequestModal } from "./chip-in-request-modal"; // Import the new modal

interface BalanceCheckProps {
  address: string
  onSufficientBalance: () => void
  minBalanceAmount?: BigNumber // Optional minimum balance amount
  hasEnoughBalance?: boolean // Optional prop to control balance check
  currentBalance?: BigNumber // Optional current balance, if available
}

export function BalanceCheck({
  address, onSufficientBalance, minBalanceAmount, hasEnoughBalance, currentBalance
}: BalanceCheckProps) {
  //const { balance, isLoading, checkBalance, requestTokens, isRequestingTokens } = useBalance()
  const balance = currentBalance;
  const isLoading = balance === undefined; // Assuming balance is undefined while loading
  const [isRequestingTokens, setIsRequestingTokens] = useState(false)
  
  const checkBalance = (address: SS58String, chainId: string) => balance // TODO Add balance checks with ParaSpell
  const { network, networkDisplayName } = useNetwork()
  const [hasChecked, setHasChecked] = useState(false)
  const [showChipInModal, setShowChipInModal] = useState(false) // State for modal
  const { walletAddress } = useWallet() // Get wallet address from context

  useEffect(() => {
    if (address && !hasChecked) {
      checkBalance(address)
      setHasChecked(true)
    }
  }, [address, hasChecked, checkBalance])

  const balanceFloat = Number.parseFloat(balance)
  const requiredBalance = minBalanceAmount || new BigNumber(0) // Use provided min balance or default to 0
  const hasSufficientBalance = hasEnoughBalance
  const needsTokensOnPaseo = network === "paseo" && balanceFloat < requiredBalance
  const canRequestChipIn = !hasSufficientBalance && !needsTokensOnPaseo && network !== "paseo" // Only for non-Paseo, insufficient balance

  const polkadotApi = usePolkadotApi()
  const { chainStore, accountStore } = polkadotApi

  const formatAmount = useFormatAmount({
    symbol: chainStore.tokenSymbol,
    tokenDecimals: chainStore.tokenDecimals,
  })

  const balanceFormatted = formatAmount(balance || 0)
  const requiredBalanceFormatted = formatAmount(requiredBalance || 0)

  const handleRequestTokens = async () => {
    const success = await requestTokens(address)
    if (success) {
      setTimeout(() => {
        // Re-check balance or directly proceed if new balance is known to be sufficient
        checkBalance(address).then(() => {
          const updatedBalance = Number.parseFloat(balance) // This 'balance' might be stale from context
          // It's better if requestTokens updates context's balance or returns new balance
          // For now, we assume it might take a moment for context to update, or we proceed if it was a fixed amount
          if (updatedBalance >= requiredBalance) {
            // Re-evaluate with potentially updated balance
            onSufficientBalance()
          }
        })
      }, 1000)
    }
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

  const amountNeededForChipIn = requiredBalance - balanceFloat > 0 ? requiredBalance - balanceFloat : 0

  return (
    <>
      <Card className="bg-gray-800 border-pink-500/30">
        <CardHeader>
          <CardTitle className="flex items-center text-white">
            <Wallet className="w-6 h-6 mr-2 text-pink-500" />
            Balance Check - {networkDisplayName}
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
                {address.substring(0, 10)}...{address.substring(address.length - 10)}
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
              {hasSufficientBalance ? (
                <div className="space-y-4">
                  <div className="flex items-center p-3 bg-green-900/20 border border-green-500/30 rounded-md">
                    <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
                    <span className="text-green-400 font-medium">Sufficient balance for registration</span>
                  </div>
                  <Button onClick={handleProceed} className="w-full btn-primary text-white">
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
                    <Badge className="bg-blue-500 text-white">No cost • Instant delivery</Badge>
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
                </div> // Insufficient balance on non-Paseo networks
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center p-3 bg-red-900/20 border border-red-500/30 rounded-md">
                    <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
                    <span className="text-red-400 font-medium">Insufficient balance for registration</span>
                  </div>
                  <div className="p-4 bg-gray-700/30 rounded-md">
                    <p className="text-gray-300 text-sm mb-2">
                      You need at least {requiredBalance.toFixed(1)} {getNetworkToken()} to register your identity on{" "}
                      {networkDisplayName}.
                    </p>
                    <p className="text-gray-400 text-xs">
                      Please add funds to your wallet and refresh, or request a chip-in.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Button
                      onClick={() => {
                        setHasChecked(false) // Allow re-checking
                        checkBalance(address)
                      }}
                      className="w-full btn-outline" // Use outline style
                    >
                      Refresh Balance
                    </Button>
                    {canRequestChipIn && (
                      <Button
                        onClick={() => setShowChipInModal(true)}
                        className="w-full btn-secondary" // Use secondary style
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Request Chip-in
                      </Button>
                    )}
                  </div>
                </div>
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
    </>
  )
}
