import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Lock, AlertCircle, Send, Trash2, X } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useRemailer } from "@/hooks/websocket/remailer"
import { encryptMessage } from "@/utils/pgp"
import { sendRemailerFeeTransaction, getRemailerFee, formatTokenAmount } from "@/utils/remailer-transaction"
import { useAccount } from "@/contexts/wallet-context"
import { SS58String } from "polkadot-api"
import { logger } from "@/utils/logger"

interface RemailerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  recipientAddress: string
  recipientName?: string
  recipientEmail?: string
  recipientTwitter?: string
  recipientMatrix?: string
  recipientDiscord?: string
  recipientPgpFingerprint?: string | null
  recipientIsVerified?: boolean
  network: string
  contactType: 'email' | 'twitter' | 'matrix' | 'discord'
}

export function RemailerDialog({
  open,
  onOpenChange,
  recipientAddress,
  recipientName,
  recipientEmail,
  recipientTwitter,
  recipientMatrix,
  recipientDiscord,
  recipientPgpFingerprint,
  recipientIsVerified = false,
  network,
  contactType,
}: RemailerDialogProps) {
  const [message, setMessage] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [verificationError, setVerificationError] = useState<string | null>(null)
  const { address: senderAddress, signMessage } = useAccount()
  const [senderIdentity, setSenderIdentity] = useState<any>(null)

  const {
    messages: remailerMessages,
    loading: remailerLoading,
    error: remailerError,
    sendMessage: sendRemailerMessage,
    deleteMessage: deleteRemailerMessage,
    fetchMessages,
  } = useRemailer()

  const hasPgp = !!recipientPgpFingerprint
  const fee = getRemailerFee(network)
  const feeFormatted = formatTokenAmount(fee.amount, 10)

  // Platform-specific message limits
  const messageLimits = {
    email: 10000,      // Email can handle long messages
    twitter: 10000,    // Twitter DMs allow up to 10k characters
    matrix: 65536,     // Matrix has 64KB limit for message events
    discord: 2000      // Discord has 2000 character limit
  }

  const maxLength = messageLimits[contactType]

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

  // Fetch sender's identity for contact info
  useEffect(() => {
    const fetchSenderIdentity = async () => {
      if (!senderAddress || !network) return

      try {
        const { getPapiClient } = await import('@/lib/papi-client')
        const client = await getPapiClient(network, false)
        const descriptors = await import('@polkadot-api/descriptors')
        const typedApi = client.getTypedApi(descriptors[network])

        const identityData = await typedApi.query.Identity.IdentityOf.getValue(senderAddress as SS58String)

        if (identityData) {
          const { decodeIdentityField } = await import('@/hooks/useIdentity')
          setSenderIdentity({
            display: decodeIdentityField(identityData.info.display),
            email: decodeIdentityField(identityData.info.email),
            twitter: decodeIdentityField(identityData.info.twitter),
            matrix: decodeIdentityField(identityData.info.matrix),
            discord: decodeIdentityField(identityData.info.discord),
          })
        }
      } catch (err) {
        logger.error('Failed to fetch sender identity:', err)
      }
    }

    fetchSenderIdentity()
  }, [senderAddress, network])

  // Fetch message history from websocket when dialog opens
  useEffect(() => {
    if (open && recipientAddress) {
      fetchMessages(recipientAddress)
    }
  }, [open, recipientAddress, fetchMessages])

  const handleSend = async () => {
    if (!message.trim()) {
      return
    }

    // Check message length against platform limits
    if (message.length > maxLength) {
      setVerificationError(`Message too long. ${contactType} limit is ${maxLength.toLocaleString()} characters.`)
      return
    }

    if (!senderAddress) {
      logger.error('No sender address available')
      return
    }

    setIsSending(true)
    setVerificationError(null)

    try {
      // Step 1: Format message with sender contact info
      let messageToSend = message
      const senderContact = senderIdentity?.[contactType]

      if (senderContact) {
        const contactLabels = {
          email: 'Email',
          twitter: 'Twitter',
          matrix: 'Matrix',
          discord: 'Discord'
        }
        const senderName = senderIdentity?.display || senderAddress.slice(0, 8) + '...'
        messageToSend = `${message}\n\n---\nFrom: ${senderName}\n${contactLabels[contactType]}: ${senderContact}`
      } else {
        const senderName = senderIdentity?.display || senderAddress.slice(0, 8) + '...'
        messageToSend = `${message}\n\n---\nFrom: ${senderName}`
      }

      // Step 2: PGP encryption (currently disabled - requires key fetching implementation)
      let encryptedContent: string | undefined
      // TODO: Implement proper PGP encryption with key fetching

      // Step 3: Send payment transaction
      // TODO: CRITICAL - Transaction signing not implemented
      // This is currently non-functional and needs proper wallet integration
      logger.warn('Transaction signing not implemented - using stub')

      // Temporary stub for development only
      const txHash = '0x' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')

      logger.log('Stub transaction hash:', txHash.slice(0, 10) + '...')

      // Step 4: Send message via websocket with transaction proof
      await sendRemailerMessage({
        recipient_address: recipientAddress,
        content: messageToSend,
        encrypted: !!encryptedContent,
        encrypted_content: encryptedContent,
        contact_type: contactType,
        destination: contactDestination || recipientAddress,
        network,
        transaction_hash: txHash,
      })

      setMessage("")
    } catch (err) {
      logger.error('Failed to send message:', err)
    } finally {
      setIsSending(false)
    }
  }

  const handleDelete = async (messageId: string) => {
    try {
      await deleteRemailerMessage(messageId)
    } catch (err) {
      logger.error('Failed to delete message:', err)
    }
  }

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dark:bg-gray-900 dark:text-white border-gray-700/50 max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">
                Message {recipientName || "User"}
              </DialogTitle>
              <p className="text-sm text-gray-400 mt-1">
                via {contactMethodLabel} · {contactDestination}
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

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Message History */}
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-3">
              {remailerMessages.length === 0 ? (
                <div className="text-center py-12 text-gray-500 text-sm">
                  No messages sent yet
                </div>
              ) : (
                remailerMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50 group hover:border-gray-600/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                          {formatTimestamp(msg.timestamp)}
                        </span>
                        {msg.encrypted && (
                          <Lock className="w-3 h-3 text-green-400" />
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          msg.status === 'sent' ? 'bg-green-400/10 text-green-400' :
                          msg.status === 'pending' ? 'bg-yellow-400/10 text-yellow-400' :
                          'bg-red-400/10 text-red-400'
                        }`}>
                          {msg.status}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDelete(msg.id)}
                        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity"
                        title="Delete message"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-sm text-white whitespace-pre-wrap break-words">
                      {msg.content}
                    </p>
                    <div className="text-xs text-gray-500 mt-2">
                      to: {msg.destination}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* PGP Notice - Currently Disabled */}
          {hasPgp && (
            <Alert className="bg-yellow-400/10 border-yellow-400/50 text-yellow-400 flex-shrink-0">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription className="text-xs">
                PGP encryption available but not yet implemented. Messages sent unencrypted.
              </AlertDescription>
            </Alert>
          )}

          {/* Message Input */}
          <div className="space-y-3 flex-shrink-0">
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
                Fee: {feeFormatted} {network.replace('_people', '').toUpperCase()} · {message.length}/{maxLength.toLocaleString()} chars
              </div>
              <Button
                onClick={handleSend}
                disabled={isSending || !message.trim()}
                className="bg-pink-500 hover:bg-pink-600 gap-2"
              >
                <Send className="w-4 h-4" />
                {isSending ? "Sending..." : "Send Message"}
              </Button>
            </div>
          </div>

          {(remailerError || verificationError) && (
            <Alert className="bg-red-400/10 border-red-400/50 text-red-400 flex-shrink-0">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription className="text-xs">{verificationError || remailerError}</AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
