import { Link } from "react-router-dom"
import { Users, ChevronRight, Plus } from "lucide-react"
import { SS58String } from "polkadot-api"
import { useSuperOf } from "@/hooks/useSuperOf"
import * as Avatar from "@radix-ui/react-avatar"

interface AccountRelationsProps {
  address: SS58String
  network: string
  peopleChain: string | null
  isOwnProfile: boolean
  onAddSubAccount?: () => void
}

function AccountCard({
  address,
  name,
  network,
  label,
  isCurrent = false
}: {
  address: SS58String
  name?: string
  network: string
  label?: string
  isCurrent?: boolean
}) {
  const displayName = name || `${address.slice(0, 6)}...${address.slice(-4)}`

  return (
    <Link
      to={`/profile/${network}/${address}`}
      className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
        isCurrent
          ? "bg-pink-500/10 border border-pink-500/30"
          : "bg-gray-800/30 border border-gray-700/50 hover:bg-gray-800/50"
      }`}
    >
      <Avatar.Root className="w-8 h-8 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
        <Avatar.Fallback className="w-full h-full flex items-center justify-center text-sm font-medium text-gray-300">
          {displayName.charAt(0).toUpperCase()}
        </Avatar.Fallback>
      </Avatar.Root>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white truncate">{displayName}</div>
        <div className="text-xs text-gray-500 truncate font-mono">{address.slice(0, 8)}...{address.slice(-6)}</div>
      </div>
      {label && (
        <span className={`text-xs px-2 py-0.5 rounded ${
          isCurrent ? "bg-pink-500/20 text-pink-300" : "bg-gray-700 text-gray-400"
        }`}>
          {label}
        </span>
      )}
      <ChevronRight className="w-4 h-4 text-gray-500" />
    </Link>
  )
}

export function AccountRelations({
  address,
  network,
  peopleChain,
  isOwnProfile,
  onAddSubAccount
}: AccountRelationsProps) {
  const { superOf, subsOf, isLoading } = useSuperOf(address, peopleChain)

  // Don't show if no relations and loading is done
  if (!isLoading && !superOf && !subsOf?.subs?.length && !isOwnProfile) {
    return null
  }

  const hasRelations = superOf || (subsOf?.subs?.length ?? 0) > 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-400">
          <Users className="w-4 h-4" />
          <span className="text-xs uppercase tracking-wide">Account Relations</span>
        </div>
        {isOwnProfile && onAddSubAccount && (
          <button
            onClick={onAddSubAccount}
            className="flex items-center gap-1 text-xs text-pink-400 hover:text-pink-300 transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add Sub
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-gray-500 text-sm py-4">
          <div className="w-4 h-4 border-2 border-gray-600 border-t-pink-500 rounded-full animate-spin" />
          Loading relations...
        </div>
      ) : !hasRelations ? (
        <div className="text-sm text-gray-500 py-2">
          {isOwnProfile ? "No linked accounts. Add sub-accounts to organize your identities." : "No linked accounts."}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Parent account */}
          {superOf && (
            <div className="space-y-2">
              <div className="text-xs text-gray-500 uppercase tracking-wide">Parent Account</div>
              <AccountCard
                address={superOf.address}
                name={superOf.name}
                network={network}
                label="Parent"
              />
            </div>
          )}

          {/* Sub accounts */}
          {subsOf && subsOf.subs.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-gray-500 uppercase tracking-wide flex items-center justify-between">
                <span>Sub Accounts ({subsOf.subs.length})</span>
              </div>
              <div className="space-y-2">
                {subsOf.subs.map((sub) => (
                  <AccountCard
                    key={sub.address}
                    address={sub.address}
                    name={sub.name}
                    network={network}
                    label="Sub"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
