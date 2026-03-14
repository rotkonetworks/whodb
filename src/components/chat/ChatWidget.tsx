import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Lock, AlertCircle, Send, X, Minus, Maximize2 } from "lucide-react"
import { useRemailer } from "@/hooks/websocket/remailer"
import { encryptMessage } from "@/utils/pgp"
import { useAccount } from "@/contexts/wallet-context"
import { logger } from "@/utils/logger"
import { usePGPWebSocket } from "@/hooks/websocket/pgp"
import { useWebSocket } from "@/hooks/websocket"

export interface ChatWidgetProps {
  recipientAddress: string
  recipientName?: string
  recipientPgpFingerprint?: string | null
  recipientIsVerified?: boolean
  network: string
  isMinimized: boolean
  onMinimize: () => void
  onMaximize: () => void
  onClose: () => void
}

export function ChatWidget({
  recipientAddress,
  recipientName,
  recipientPgpFingerprint,
  recipientIsVerified = false,
  network,
  isMinimized,
  onMinimize,
  onMaximize,
  onClose,
}: ChatWidgetProps) {
  const [message, setMessage] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [sendSuccess, setSendSuccess] = useState(false)
  const { address: senderAddress } = useAccount()

  const wsUrl = typeof window !== 'undefined' ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws` : ''
  const webSocket = useWebSocket({ url: wsUrl })
  const pgpWs = usePGPWebSocket(webSocket)

  const {
    error: remailerError,
    sendMessage: sendRemailerMessage,
  } = useRemailer()

  const hasPgp = !!recipientPgpFingerprint
  const maxLength = 65536

  const handleSend = async () => {
    if (!message.trim() || !senderAddress) return

    if (message.length > maxLength) {
      setSendError(`Message too long. Limit is ${maxLength.toLocaleString()} characters.`)
      return
    }

    setIsSending(true)
    setSendError(null)
    setSendSuccess(false)

    try {
      let messageToSend = message

      // PGP encryption if recipient has verified PGP key
      if (recipientPgpFingerprint && recipientIsVerified) {
        try {
          const keyData = await pgpWs.fetchKey({ fingerprint: recipientPgpFingerprint })
          if (keyData.armored_key) {
            messageToSend = await encryptMessage(message, keyData.armored_key)
          }
        } catch (err) {
          logger.error('Failed to encrypt message:', err)
        }
      }

      await sendRemailerMessage({
        recipient: recipientAddress,
        recipient_network: network,
        message: messageToSend,
        network,
      })

      setMessage("")
      setSendSuccess(true)
      setTimeout(() => setSendSuccess(false), 3000)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to send message'
      logger.error('Failed to send message:', err)
      setSendError(errorMsg)
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (isMinimized) {
    return (
      <div
        className="w-64 bg-gray-800 rounded-t-lg shadow-xl border border-gray-700 cursor-pointer"
        onClick={onMaximize}
      >
        <div className="flex items-center justify-between px-3 py-2 bg-gray-700 rounded-t-lg">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
            <span className="text-sm font-medium text-white truncate">
              {recipientName || recipientAddress.slice(0, 8) + '...'}
            </span>
            <span className="text-xs text-gray-400 flex-shrink-0">Matrix</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); onMaximize() }}
              className="p-1 text-gray-400 hover:text-white transition-colors"
            >
              <Maximize2 className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onClose() }}
              className="p-1 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-80 bg-gray-900 rounded-t-lg shadow-2xl border border-gray-700 flex flex-col" style={{ height: '300px' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-700 rounded-t-lg flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
          <div className="min-w-0">
            <div className="text-sm font-medium text-white truncate">
              {recipientName || recipientAddress.slice(0, 8) + '...'}
            </div>
            <div className="text-xs text-gray-400">via Matrix</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onMinimize} className="p-1 text-gray-400 hover:text-white transition-colors" title="Minimize">
            <Minus className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white transition-colors" title="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Info area */}
      <div className="flex-1 flex flex-col justify-center items-center p-4 text-center">
        <p className="text-xs text-gray-500 mb-2">
          Messages are delivered via Matrix DM to the recipient.
        </p>
        {hasPgp && recipientIsVerified && (
          <div className="px-2 py-1 bg-green-400/10 border border-green-400/30 rounded text-green-400 text-[10px] flex items-center gap-1.5">
            <Lock className="w-3 h-3" />
            <span>End-to-end encrypted</span>
          </div>
        )}
        {sendSuccess && (
          <div className="mt-2 px-2 py-1 bg-green-400/10 border border-green-400/30 rounded text-green-400 text-[10px]">
            Message sent
          </div>
        )}
      </div>

      {/* Error */}
      {(remailerError || sendError) && (
        <div className="mx-3 mb-2 px-2 py-1 bg-red-400/10 border border-red-400/30 rounded text-red-400 text-[10px] flex items-center gap-1.5 flex-shrink-0">
          <AlertCircle className="w-3 h-3" />
          <span>{sendError || remailerError}</span>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-gray-700 flex-shrink-0">
        <div className="flex gap-2">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 min-h-[60px] max-h-[100px] bg-gray-800 border-gray-700 text-white text-sm resize-none"
            disabled={isSending}
            maxLength={maxLength}
          />
          <Button
            onClick={handleSend}
            disabled={isSending || !message.trim() || !senderAddress}
            size="sm"
            className="bg-pink-500 hover:bg-pink-600 h-auto self-end"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <div className="text-[10px] text-gray-500 mt-1">
          {message.length}/{maxLength}
        </div>
      </div>
    </div>
  )
}
