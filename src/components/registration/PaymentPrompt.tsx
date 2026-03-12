import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Coins, Zap, ArrowLeftRight } from "lucide-react"
import BigNumber from "bignumber.js"
import { PaseoFaucetDialog } from "@/components/dialogs/PaseoFaucetDialog"
import { TeleporterDialog } from "@/components/dialogs/teleportDialog"

interface PaymentPromptProps {
  networkName: string
  requiredAmount: BigNumber
  formatAmount: (amount: BigNumber) => string
  tokenSymbol: string
  walletAddress: string
  isPaseo?: boolean
  isTxBusy?: boolean
  onCancel: () => void
  onBalanceRefresh?: () => void
}

export function PaymentPrompt({
  networkName,
  requiredAmount,
  formatAmount,
  tokenSymbol,
  walletAddress,
  isPaseo = false,
  isTxBusy = false,
  onCancel,
  onBalanceRefresh,
}: PaymentPromptProps) {
  const [showFaucet, setShowFaucet] = useState(false)
  const [showTeleporter, setShowTeleporter] = useState(false)

  const handleFundsReceived = () => {
    // Just notify parent - let the reactive balance subscription do its job
    if (onBalanceRefresh) {
      onBalanceRefresh();
    }
    // Don't auto-close - let the balance check naturally hide this when funds arrive
  };

  return (
    <>
      <Card className="bg-gray-800/50 border-yellow-500/30 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-yellow-400 text-lg">
            <Coins className="w-5 h-5" />
            Insufficient Balance
          </CardTitle>
          <CardDescription className="text-gray-300 text-sm">
            You need {formatAmount(requiredAmount)} {tokenSymbol} on {networkName} to complete registration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          {isPaseo && (
            <>
              <div className="p-4 bg-blue-900/10 border border-blue-500/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-blue-400" />
                  <span className="text-blue-400 font-medium text-sm">Free Testnet Tokens</span>
                </div>
                <p className="text-gray-300 text-sm mb-3">
                  Get free PAS tokens instantly from the Paseo faucet
                </p>
                <Button
                  onClick={() => setShowFaucet(true)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  size="sm"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Request Tokens
                </Button>
              </div>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-700/50" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-gray-800/50 px-3 text-xs text-gray-500">or</span>
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Button
              onClick={() => setShowTeleporter(true)}
              variant="outline"
              className="w-full text-sm"
              size="sm"
            >
              <ArrowLeftRight className="w-4 h-4 mr-2" />
              Transfer via XCM
            </Button>

            <Button
              onClick={onCancel}
              variant="ghost"
              className="w-full text-sm text-gray-400"
              size="sm"
            >
              Cancel
            </Button>
          </div>

          {isPaseo && (
            <div className="text-xs text-gray-400 bg-gray-900/30 p-3 rounded border border-gray-700/30">
              Balance updates automatically when tokens arrive
            </div>
          )}
        </CardContent>
      </Card>

      {/* Paseo Faucet Dialog */}
      <PaseoFaucetDialog
        open={showFaucet}
        onOpenChange={setShowFaucet}
        address={walletAddress}
        onFundsReceived={handleFundsReceived}
      />

      {/* XCM Teleporter Dialog */}
      <TeleporterDialog
        isTxBusy={isTxBusy}
        open={showTeleporter}
        setOpen={setShowTeleporter}
        teleportAmount={requiredAmount}
      />
    </>
  )
}
