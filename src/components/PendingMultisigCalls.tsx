import { memo, useCallback } from "react"
import { SS58String } from "polkadot-api"
import { useMultisig, PendingMultisigCall } from "@/hooks/useMultisig"
import { useAccount } from "@/contexts/wallet-context"
import { Clock, Users, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PendingMultisigCallsProps {
  multisigAddress: SS58String
  signatories: SS58String[]
  threshold: number
  chainId?: string
  onApprove?: (call: PendingMultisigCall) => void
}

export const PendingMultisigCalls = memo(function PendingMultisigCalls({
  multisigAddress: _multisigAddress,  // Reserved for future filtering by multisig
  signatories,
  threshold,
  chainId,
  onApprove,
}: PendingMultisigCallsProps) {
  const { address: connectedAddress } = useAccount()
  const { pendingCalls, isLoading, refetch } = useMultisig(connectedAddress, chainId)

  // Filter to only show calls for this multisig
  // Currently shows all pending calls - can be filtered by multisig address in future
  const relevantCalls = pendingCalls

  const handleApprove = useCallback((call: PendingMultisigCall) => {
    onApprove?.(call)
  }, [onApprove])

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-gray-500 text-sm py-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Loading pending calls...</span>
      </div>
    )
  }

  if (relevantCalls.length === 0) {
    return null
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500 uppercase tracking-wide">
          Pending Multisig Calls
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={refetch}
          className="h-6 px-2 text-xs text-gray-500 hover:text-white"
        >
          Refresh
        </Button>
      </div>

      <div className="space-y-2">
        {relevantCalls.map((call) => {
          const hasApproved = connectedAddress && call.approvals.includes(connectedAddress)
          const approvalsNeeded = threshold - call.approvals.length
          const canApprove = connectedAddress && !hasApproved && signatories.includes(connectedAddress)

          return (
            <div
              key={call.callHash}
              className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <code className="text-xs text-gray-400 font-mono truncate">
                      {call.callHash.slice(0, 10)}...{call.callHash.slice(-8)}
                    </code>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Block #{call.when.height}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {call.approvals.length}/{threshold} approvals
                    </span>
                  </div>

                  {/* Approval status */}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {signatories.map((sig) => {
                      const approved = call.approvals.includes(sig)
                      const isMe = sig === connectedAddress
                      return (
                        <span
                          key={sig}
                          className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${
                            approved
                              ? 'bg-green-500/20 text-green-300'
                              : 'bg-gray-700/50 text-gray-500'
                          } ${isMe ? 'ring-1 ring-pink-500/50' : ''}`}
                        >
                          {approved ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <AlertCircle className="w-3 h-3" />
                          )}
                          {sig.slice(0, 4)}...{sig.slice(-4)}
                          {isMe && ' (you)'}
                        </span>
                      )
                    })}
                  </div>
                </div>

                {canApprove && approvalsNeeded > 0 && (
                  <Button
                    size="sm"
                    onClick={() => handleApprove(call)}
                    className="bg-purple-500 hover:bg-purple-600 text-xs"
                  >
                    Approve
                  </Button>
                )}

                {hasApproved && (
                  <span className="text-xs text-green-400 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    Approved
                  </span>
                )}
              </div>

              {approvalsNeeded > 0 && (
                <div className="mt-2 text-xs text-yellow-400/80">
                  Needs {approvalsNeeded} more approval{approvalsNeeded > 1 ? 's' : ''} to execute
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
})
