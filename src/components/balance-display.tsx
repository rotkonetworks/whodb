import { AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Alert } from "@/components/ui/alert"
import BigNumber from "bignumber.js"

interface BalanceDisplayProps {
  balance: BigNumber | null
  minBalance: BigNumber | null
  formatAmount: (amount: BigNumber) => string
  tokenSymbol: string
  showStatus?: boolean
}

export function BalanceDisplay({
  balance,
  minBalance,
  formatAmount,
  tokenSymbol,
  showStatus = true
}: BalanceDisplayProps) {
  if (balance === null || minBalance === null) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-pink-500 animate-spin" />
      </div>
    )
  }

  const hasEnough = balance.isGreaterThanOrEqualTo(minBalance)

  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardContent className="p-6 space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Current Balance</span>
          <span className="text-white font-mono text-lg">
            {formatAmount(balance)} {tokenSymbol}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Required Amount</span>
          <span className="text-white font-mono text-lg">
            {formatAmount(minBalance)} {tokenSymbol}
          </span>
        </div>
        {showStatus && (
          <div className="pt-4 border-t border-gray-700">
            {hasEnough ? (
              <Alert className="bg-green-900/20 border-green-500/30 text-green-400">
                <CheckCircle className="w-4 h-4 inline-block mr-2" />
                Sufficient balance available
              </Alert>
            ) : (
              <Alert className="bg-red-900/20 border-red-500/30 text-red-400">
                <AlertCircle className="w-4 h-4 inline-block mr-2" />
                Insufficient balance. Please add funds to continue.
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
