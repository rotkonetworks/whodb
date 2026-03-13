import { memo, useMemo } from 'react'
import { useIdentityEvents } from '@/hooks/useIdentityEvents'
import { History, ExternalLink, Loader2, AlertCircle, CheckCircle, XCircle, UserPlus, UserMinus, FileEdit, Scale } from 'lucide-react'

interface IdentityHistoryProps {
  wallet: string
  network: string
  peopleChain: string | null
}

function getEventIcon(eventType: string) {
  switch (eventType) {
    case 'identity_set':
      return <FileEdit className="w-4 h-4" />
    case 'identity_cleared':
      return <UserMinus className="w-4 h-4" />
    case 'judgement_requested':
      return <Scale className="w-4 h-4" />
    case 'judgement_given':
      return <CheckCircle className="w-4 h-4" />
    case 'judgement_unrequested':
      return <XCircle className="w-4 h-4" />
    case 'sub_identity_added':
      return <UserPlus className="w-4 h-4" />
    case 'sub_identity_removed':
      return <UserMinus className="w-4 h-4" />
    default:
      return <History className="w-4 h-4" />
  }
}

function getEventLabel(eventType: string): string {
  switch (eventType) {
    case 'identity_set':
      return 'Identity Set'
    case 'identity_cleared':
      return 'Identity Cleared'
    case 'judgement_requested':
      return 'Judgement Requested'
    case 'judgement_given':
      return 'Judgement Given'
    case 'judgement_unrequested':
      return 'Judgement Cancelled'
    case 'sub_identity_added':
      return 'Sub-identity Added'
    case 'sub_identity_removed':
      return 'Sub-identity Removed'
    default:
      return eventType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  }
}

function getEventColor(eventType: string): string {
  switch (eventType) {
    case 'identity_set':
      return 'text-blue-400'
    case 'identity_cleared':
      return 'text-red-400'
    case 'judgement_requested':
      return 'text-yellow-400'
    case 'judgement_given':
      return 'text-green-400'
    case 'judgement_unrequested':
      return 'text-orange-400'
    case 'sub_identity_added':
      return 'text-purple-400'
    case 'sub_identity_removed':
      return 'text-pink-400'
    default:
      return 'text-gray-400'
  }
}

function getBlockExplorerUrl(network: string, blockNumber: number): string {
  // Map network names to subscan domains
  const subscanNetwork = network
    .replace('_people', '-people')
    .replace('ksmcc3', 'kusama')

  return `https://${subscanNetwork}.subscan.io/block/${blockNumber}`
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60))
      return diffMinutes <= 1 ? 'Just now' : `${diffMinutes}m ago`
    }
    return `${diffHours}h ago`
  }
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`
  return `${Math.floor(diffDays / 365)}y ago`
}

export const IdentityHistory = memo(function IdentityHistory({
  wallet,
  network,
  peopleChain,
}: IdentityHistoryProps) {
  const { events, isLoading, error } = useIdentityEvents(wallet, peopleChain || network)

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => b.block_number - a.block_number)
  }, [events])

  if (isLoading) {
    return (
      <div className="pt-4 border-t border-gray-700/50">
        <div className="text-xs uppercase tracking-wide text-gray-500 mb-3 flex items-center gap-2">
          <History className="w-4 h-4" />
          History
        </div>
        <div className="flex items-center justify-center py-8 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="pt-4 border-t border-gray-700/50">
        <div className="text-xs uppercase tracking-wide text-gray-500 mb-3 flex items-center gap-2">
          <History className="w-4 h-4" />
          History
        </div>
        <div className="flex items-center gap-2 py-4 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4" />
          Unable to load history
        </div>
      </div>
    )
  }

  if (sortedEvents.length === 0) {
    return (
      <div className="pt-4 border-t border-gray-700/50">
        <div className="text-xs uppercase tracking-wide text-gray-500 mb-3 flex items-center gap-2">
          <History className="w-4 h-4" />
          History
        </div>
        <div className="py-4 text-gray-500 text-sm text-center">
          No on-chain events recorded
        </div>
      </div>
    )
  }

  return (
    <div className="pt-4 border-t border-gray-700/50">
      <div className="text-xs uppercase tracking-wide text-gray-500 mb-3 flex items-center gap-2">
        <History className="w-4 h-4" />
        History
        <span className="text-gray-600">({sortedEvents.length})</span>
      </div>

      <div className="space-y-0">
        {sortedEvents.map((event, index) => (
          <div
            key={event.id}
            className="flex items-start gap-3 py-2 group"
          >
            {/* Timeline indicator */}
            <div className="flex flex-col items-center">
              <div className={`p-1.5 rounded-full bg-gray-800 ${getEventColor(event.event_type)}`}>
                {getEventIcon(event.event_type)}
              </div>
              {index < sortedEvents.length - 1 && (
                <div className="w-px h-full min-h-[24px] bg-gray-700/50" />
              )}
            </div>

            {/* Event content */}
            <div className="flex-1 min-w-0 pb-2">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${getEventColor(event.event_type)}`}>
                  {getEventLabel(event.event_type)}
                </span>
                {event.registrar_index !== null && (
                  <span className="text-xs text-gray-500">
                    Registrar #{event.registrar_index}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                <span>{formatDate(event.created_at)}</span>
                <span className="text-gray-600">·</span>
                <a
                  href={getBlockExplorerUrl(network, event.block_number)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-gray-300 transition-colors"
                >
                  Block #{event.block_number.toLocaleString()}
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
})
