import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Check, Loader2, X, ExternalLink, Copy } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"

export type TxStatus = "idle" | "signing" | "broadcasting" | "confirming" | "success" | "error"

interface TransactionProgressModalProps {
  open: boolean
  onClose: () => void
  status: TxStatus
  txHash?: string
  error?: string
  title?: string
  network?: string
}

const statusConfig: Record<TxStatus, { label: string; description: string }> = {
  idle: { label: "Preparing", description: "Preparing transaction..." },
  signing: { label: "Sign Transaction", description: "Please sign the transaction in your wallet" },
  broadcasting: { label: "Broadcasting", description: "Sending transaction to the network..." },
  confirming: { label: "Confirming", description: "Waiting for block confirmation..." },
  success: { label: "Success", description: "Transaction confirmed on-chain" },
  error: { label: "Failed", description: "Transaction failed" },
}

const steps: TxStatus[] = ["signing", "broadcasting", "confirming", "success"]

export function TransactionProgressModal({
  open,
  onClose,
  status,
  txHash,
  error,
  title = "Transaction",
  network,
}: TransactionProgressModalProps) {
  const [copied, setCopied] = useState(false)

  const copyHash = () => {
    if (txHash) {
      navigator.clipboard.writeText(txHash)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const getExplorerUrl = () => {
    if (!txHash || !network) return null
    const explorers: Record<string, string> = {
      polkadot_people: "https://people-polkadot.subscan.io/extrinsic/",
      ksmcc3_people: "https://people-kusama.subscan.io/extrinsic/",
      paseo_people: "https://people-paseo.subscan.io/extrinsic/",
      polkadot: "https://polkadot.subscan.io/extrinsic/",
      kusama: "https://kusama.subscan.io/extrinsic/",
      paseo: "https://paseo.subscan.io/extrinsic/",
    }
    const base = explorers[network]
    return base ? `${base}${txHash}` : null
  }

  const currentStepIndex = steps.indexOf(status)
  const isComplete = status === "success"
  const isError = status === "error"

  return (
    <Dialog open={open} onOpenChange={(v) => !v && (isComplete || isError) && onClose()}>
      <DialogContent className="dark:bg-gray-900 bg-gray-100 max-w-sm p-0 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-lg font-medium text-white">{title}</h2>
        </div>

        {/* Progress Steps */}
        <div className="p-6">
          <div className="space-y-4">
            {steps.map((step, index) => {
              const isActive = step === status
              const isPast = currentStepIndex > index || isComplete
              const isFuture = currentStepIndex < index && !isComplete
              const config = statusConfig[step]

              return (
                <div key={step} className="flex items-center gap-3">
                  {/* Step indicator */}
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all
                    ${isPast ? "bg-green-500" : ""}
                    ${isActive && !isError ? "bg-pink-500 animate-pulse" : ""}
                    ${isActive && isError ? "bg-red-500" : ""}
                    ${isFuture ? "bg-gray-700" : ""}
                  `}>
                    {isPast ? (
                      <Check className="w-4 h-4 text-white" />
                    ) : isActive && !isError ? (
                      <Loader2 className="w-4 h-4 text-white animate-spin" />
                    ) : isActive && isError ? (
                      <X className="w-4 h-4 text-white" />
                    ) : (
                      <span className="text-gray-400 text-sm">{index + 1}</span>
                    )}
                  </div>

                  {/* Step content */}
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium ${
                      isPast ? "text-green-400" :
                      isActive ? (isError ? "text-red-400" : "text-white") :
                      "text-gray-500"
                    }`}>
                      {config.label}
                    </div>
                    {isActive && (
                      <div className="text-xs text-gray-400 mt-0.5">
                        {isError ? error : config.description}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Transaction Hash */}
          {txHash && (
            <div className="mt-6 p-3 bg-gray-800/50 rounded-lg">
              <div className="text-xs text-gray-500 mb-1">Transaction Hash</div>
              <div className="flex items-center gap-2">
                <code className="text-xs text-gray-300 font-mono truncate flex-1">
                  {txHash.slice(0, 18)}...{txHash.slice(-8)}
                </code>
                <button
                  onClick={copyHash}
                  className="p-1 text-gray-400 hover:text-white transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                {getExplorerUrl() && (
                  <a
                    href={getExplorerUrl()!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-gray-400 hover:text-white transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {(isComplete || isError) && (
          <div className="p-4 border-t border-gray-800">
            <Button
              onClick={onClose}
              className={`w-full ${isComplete ? "bg-green-600 hover:bg-green-700" : "bg-gray-700 hover:bg-gray-600"}`}
            >
              {isComplete ? "Done" : "Close"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
