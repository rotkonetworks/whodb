import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Lock, AlertCircle, Send, X } from "lucide-react"
import { useRemailer } from "@/hooks/websocket/remailer"
import { encryptMessage } from "@/utils/pgp"
import { useAccount } from "@/contexts/wallet-context"
import { logger } from "@/utils/logger"
import { usePGPWebSocket } from "@/hooks/websocket/pgp"
import { useWebSocket } from "@/hooks/websocket"

interface RemailerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  recipientAddress: string
  recipientName?: string
  recipientPgpFingerprint?: string | null
  recipientIsVerified?: boolean
  network: string
}

export function RemailerDialog({
  open,
  onOpenChange,
  recipientAddress,
  recipientName,
  recipientPgpFingerprint,
  recipientIsVerified = false,
  network,
}: RemailerDialogProps) {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dark:bg-gray-900 dark:text-white border-gray-700/50 max-w-2xl flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">
                Message {recipientName || "User"}
              </DialogTitle>
              <p className="text-sm text-gray-400 mt-1">
                via Matrix · {recipientAddress.slice(0, 12)}...
              </p>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {hasPgp && recipientIsVerified && (
            <Alert className="bg-green-400/10 border-green-400/50 text-green-400">
              <Lock className="w-4 h-4" />
              <AlertDescription className="text-xs">
                PGP encryption enabled. Your message will be encrypted end-to-end.
              </AlertDescription>
            </Alert>
          )}

          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message here..."
            className="min-h-[100px] bg-gray-800/50 border-gray-700 text-white resize-none"
            disabled={isSending}
            maxLength={maxLength}
          />

          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-gray-500">
              {message.length}/{maxLength.toLocaleString()} chars
            </div>
            <Button
              onClick={handleSend}
              disabled={isSending || !message.trim() || !senderAddress}
              className="bg-pink-500 hover:bg-pink-600 gap-2"
            >
              <Send className="w-4 h-4" />
              {isSending ? "Sending..." : "Send Message"}
            </Button>
          </div>

          {sendSuccess && (
            <Alert className="bg-green-400/10 border-green-400/50 text-green-400">
              <AlertDescription className="text-xs">Message sent successfully via Matrix</AlertDescription>
            </Alert>
          )}

          {(remailerError || sendError) && (
            <Alert className="bg-red-400/10 border-red-400/50 text-red-400">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription className="text-xs">{sendError || remailerError}</AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
