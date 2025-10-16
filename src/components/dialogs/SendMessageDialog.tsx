import { useState } from "react"
import { GenericDialog } from "./GenericDialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Lock, AlertCircle } from "lucide-react"

interface SendMessageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  recipientAddress: string
  recipientName?: string
  recipientEmail?: string
  recipientTwitter?: string
  recipientMatrix?: string
  recipientDiscord?: string
  recipientPgpFingerprint?: string | null
  network: string
  contactType?: 'email' | 'twitter' | 'matrix' | 'discord'
}

export function SendMessageDialog({
  open,
  onOpenChange,
  recipientAddress,
  recipientName,
  recipientEmail,
  recipientTwitter,
  recipientMatrix,
  recipientDiscord,
  recipientPgpFingerprint,
  network,
  contactType = 'email',
}: SendMessageDialogProps) {
  const [message, setMessage] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSend = async () => {
    if (!message.trim()) {
      setError("Please enter a message")
      return
    }

    setIsSending(true)
    setError(null)

    try {
      // TODO: Implement message sending with token payment
      // For now, just simulate
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Close dialog on success
      onOpenChange(false)
      setMessage("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message")
    } finally {
      setIsSending(false)
    }
  }

  const hasPgp = !!recipientPgpFingerprint

  const contactMethodLabel = {
    email: 'Email',
    twitter: 'Twitter DM',
    matrix: 'Matrix',
    discord: 'Discord DM'
  }[contactType]

  const contactDestination = {
    email: recipientEmail,
    twitter: recipientTwitter,
    matrix: recipientMatrix,
    discord: recipientDiscord
  }[contactType] || recipientAddress

  return (
    <GenericDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Send Message to ${recipientName || "User"}`}
      description={`Message will be forwarded via ${contactMethodLabel} to ${contactDestination}`}
      footer={
        <div className="flex items-center justify-between w-full gap-4">
          <div className="text-xs text-gray-400">
            Fee: 0.1 {network.replace('_people', '').toUpperCase()}
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={isSending || !message.trim()}
              className="bg-pink-500 hover:bg-pink-600"
            >
              {isSending ? "Sending..." : "Send Message"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {hasPgp && (
          <Alert className="bg-green-400/10 border-green-400/50 text-green-400">
            <Lock className="w-4 h-4" />
            <AlertDescription className="text-xs">
              This message will be encrypted with the recipient's PGP key client-side
            </AlertDescription>
          </Alert>
        )}

        {!hasPgp && (
          <Alert className="bg-yellow-400/10 border-yellow-400/50 text-yellow-400">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription className="text-xs">
              No PGP key found. Message will be sent unencrypted via remailer service.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <label className="text-sm text-gray-400">Message</label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message here..."
            className="min-h-[150px] bg-gray-800/50 border-gray-700 text-white"
            disabled={isSending}
          />
          <div className="text-xs text-gray-500 text-right">
            {message.length} characters
          </div>
        </div>

        {error && (
          <Alert className="bg-red-400/10 border-red-400/50 text-red-400">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}
      </div>
    </GenericDialog>
  )
}
