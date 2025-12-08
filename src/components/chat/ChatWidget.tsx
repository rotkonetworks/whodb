import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Lock, AlertCircle, Send, Trash2, X, Minus, Maximize2 } from "lucide-react"
import { useRemailer } from "@/hooks/websocket/remailer"
import { encryptMessage } from "@/utils/pgp"
import { getRemailerFee, formatTokenAmount } from "@/utils/remailer-transaction"
import { useAccount } from "@/contexts/wallet-context"
import { SS58String } from "polkadot-api"
import { logger } from "@/utils/logger"
import { usePGPWebSocket } from "@/hooks/websocket/pgp"
import { useWebSocket } from "@/hooks/websocket"

export interface ChatWidgetProps {
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
  isMinimized: boolean
  onMinimize: () => void
  onMaximize: () => void
  onClose: () => void
}

export function ChatWidget({
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
  isMinimized,
  onMinimize,
  onMaximize,
  onClose,
}: ChatWidgetProps) {
  const [message, setMessage] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [verificationError, setVerificationError] = useState<string | null>(null)
  const { address: senderAddress } = useAccount()
  const [senderIdentity, setSenderIdentity] = useState<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const wsUrl = typeof window !== 'undefined' ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws` : ''
  const webSocket = useWebSocket({ url: wsUrl })
  const pgpWs = usePGPWebSocket(webSocket)

  const {
    messages: remailerMessages,
    error: remailerError,
    sendMessage: sendRemailerMessage,
    deleteMessage: deleteRemailerMessage,
    fetchMessages,
  } = useRemailer()

  const hasPgp = !!recipientPgpFingerprint
  const fee = getRemailerFee(network)
  const feeFormatted = formatTokenAmount(fee.amount, 10)

  const messageLimits = {
    email: 10000,
    twitter: 10000,
    matrix: 65536,
    discord: 2000
  }
  const maxLength = messageLimits[contactType]

  const contactMethodLabel = {
    email: 'Email',
    twitter: 'Twitter',
    matrix: 'Matrix',
    discord: 'Discord'
  }[contactType]

  const contactDestination = {
    email: recipientEmail,
    twitter: recipientTwitter,
    matrix: recipientMatrix,
    discord: recipientDiscord
  }[contactType] || recipientAddress

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [remailerMessages])

  // Fetch sender identity
  useEffect(() => {
    const fetchSenderIdentity = async () => {
      if (!senderAddress || !network) return

      try {
        const { getPapiClient } = await import('@/lib/papi-client')
        const client = await getPapiClient(network, false)
        const descriptors = await import('@polkadot-api/descriptors') as Record<string, any>
        const typedApi = client.getTypedApi(descriptors[network]) as any

        let identityData = null

        try {
          if (typedApi.query?.PeopleIdentity?.IdentityOf) {
            identityData = await typedApi.query.PeopleIdentity.IdentityOf.getValue(senderAddress as SS58String)
          } else if (typedApi.query?.Identity?.IdentityOf) {
            identityData = await typedApi.query.Identity.IdentityOf.getValue(senderAddress as SS58String)
          }
        } catch {
          return
        }

        if (identityData?.info) {
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
        if (err instanceof Error && !err.message.includes('Runtime entry Storage')) {
          logger.error('Failed to fetch sender identity:', err)
        }
      }
    }

    fetchSenderIdentity()
  }, [senderAddress, network])

  // Fetch message history
  useEffect(() => {
    if (!isMinimized && recipientAddress) {
      fetchMessages(recipientAddress)
    }
  }, [isMinimized, recipientAddress, fetchMessages])

  const handleSend = async () => {
    if (!message.trim()) return

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
      let messageToSend = message
      const senderContact = senderIdentity?.[contactType]

      if (senderContact) {
        const contactLabels = { email: 'Email', twitter: 'Twitter', matrix: 'Matrix', discord: 'Discord' }
        const senderName = senderIdentity?.display || senderAddress.slice(0, 8) + '...'
        messageToSend = `${message}\n\n---\nFrom: ${senderName}\n${contactLabels[contactType]}: ${senderContact}`
      } else {
        const senderName = senderIdentity?.display || senderAddress.slice(0, 8) + '...'
        messageToSend = `${message}\n\n---\nFrom: ${senderName}`
      }

      let encryptedContent: string | undefined

      if (recipientPgpFingerprint && recipientIsVerified) {
        try {
          const keyData = await pgpWs.fetchKey({ fingerprint: recipientPgpFingerprint })
          if (keyData.armored_key) {
            encryptedContent = await encryptMessage(messageToSend, keyData.armored_key)
          }
        } catch (err) {
          logger.error('Failed to encrypt message:', err)
        }
      }

      // Stub transaction
      const txHash = '0x' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')

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

    if (minutes < 1) return 'now'
    if (minutes < 60) return `${minutes}m`
    if (hours < 24) return `${hours}h`
    return date.toLocaleDateString()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Minimized state - just header bar
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
            <span className="text-xs text-gray-400 flex-shrink-0">
              {contactMethodLabel}
            </span>
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

  // Expanded state
  return (
    <div className="w-80 bg-gray-900 rounded-t-lg shadow-2xl border border-gray-700 flex flex-col" style={{ height: '400px' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-700 rounded-t-lg flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
          <div className="min-w-0">
            <div className="text-sm font-medium text-white truncate">
              {recipientName || recipientAddress.slice(0, 8) + '...'}
            </div>
            <div className="text-xs text-gray-400">
              via {contactMethodLabel}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onMinimize}
            className="p-1 text-gray-400 hover:text-white transition-colors"
            title="Minimize"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {remailerMessages.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-xs">
            No messages yet
          </div>
        ) : (
          remailerMessages.map((msg) => (
            <div
              key={msg.id}
              className="bg-gray-800/70 rounded-lg p-2 text-xs group hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-500">{formatTimestamp(msg.timestamp)}</span>
                  {msg.encrypted && <Lock className="w-3 h-3 text-green-400" />}
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${
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
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              <p className="text-white whitespace-pre-wrap break-words">{msg.content}</p>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* PGP Notice */}
      {hasPgp && recipientIsVerified && (
        <div className="mx-3 mb-2 px-2 py-1 bg-green-400/10 border border-green-400/30 rounded text-green-400 text-[10px] flex items-center gap-1.5 flex-shrink-0">
          <Lock className="w-3 h-3" />
          <span>End-to-end encrypted</span>
        </div>
      )}

      {/* Error */}
      {(remailerError || verificationError) && (
        <div className="mx-3 mb-2 px-2 py-1 bg-red-400/10 border border-red-400/30 rounded text-red-400 text-[10px] flex items-center gap-1.5 flex-shrink-0">
          <AlertCircle className="w-3 h-3" />
          <span>{verificationError || remailerError}</span>
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
            disabled={isSending || !message.trim()}
            size="sm"
            className="bg-pink-500 hover:bg-pink-600 h-auto self-end"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <div className="text-[10px] text-gray-500 mt-1">
          {message.length}/{maxLength} · Fee: {feeFormatted}
        </div>
      </div>
    </div>
  )
}
