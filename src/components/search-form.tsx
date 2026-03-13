import { useWebSocketContext } from "@/contexts/web-socket-provider"
import { useTriggerLog } from "@/hooks/use-trigger-log"
import { useUrlParams } from "@/hooks/useUrlParams"
import { useSearchWebSocket } from "@/hooks/websocket/search"
import { useDebounce } from "@/hooks/useDebounce"
import { useLocalIdentitySearch } from "@/hooks/useLocalIdentitySearch"
import { FullProfile } from "@/types/profile"
import { ScoredIdentity } from "@/lib/identity-cache"
import { Search, User, Loader2, Database } from "lucide-react"
import type React from "react"
import { useEffect, useRef, useState, useCallback, memo, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { constructSearchObject } from "@/lib/utils"
import { getEcosystemName, CHAINS, getChainKeyFromNetwork } from "@/polkadot-api/chain-config"
import { decodeAddress, encodeAddress } from "@polkadot/util-crypto"

// Module-level flag to prevent re-syncing across component mounts
let globalSyncStarted = false;

// Convert local cached identity to FullProfile format
function scoredIdentityToProfile(identity: ScoredIdentity): FullProfile {
  return {
    wallet_id: identity.address,
    network: identity.network as any,
    display: identity.display || undefined,
    legal: identity.legal || undefined,
    web: identity.web || undefined,
    email: identity.email || undefined,
    twitter: identity.twitter || undefined,
    github: identity.github || undefined,
    discord: identity.discord || undefined,
    matrix: identity.matrix || undefined,
    image: identity.image || undefined,
    pgp_fingerprint: identity.pgpFingerprint || undefined,
    verified: identity.isVerified,
  }
}

const SuggestionItem = memo<{
  profile: FullProfile;
  index: number;
  isSelected: boolean;
  onClick: (profile: FullProfile) => void;
}>(({ profile, isSelected, onClick }) => {
  return (
    <button
      onClick={() => onClick(profile)}
      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors border-b border-gray-700/50 last:border-b-0 ${isSelected ? "bg-gray-700" : "hover:bg-gray-700/50"}`}
    >
      <img
        src={profile.image || "/placeholder.svg"}
        alt=""
        className="w-8 h-8 rounded-full object-cover flex-shrink-0 bg-gray-800"
        draggable="false"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate text-white">
          {profile.display || "Anonymous"}
        </p>
        <p className="text-xs truncate text-gray-400">
          {profile.email || profile.wallet_id.slice(0, 8) + "..."}
        </p>
      </div>
      <User className="w-4 h-4 flex-shrink-0 text-gray-500" />
    </button>
  );
}, (prev, next) => {
  return prev.profile.wallet_id === next.profile.wallet_id &&
         prev.isSelected === next.isSelected;
});
SuggestionItem.displayName = "SuggestionItem";

export default function SearchForm() {
  const navigate = useNavigate()
  const [query, setQuery] = useState("")
  // Fast debounce (100ms) for instant-feeling search like Google
  // Local IndexedDB search is fast enough to handle this
  const debouncedQuery = useDebounce(query, 100)

  const { urlParams } = useUrlParams()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [isTyping, setIsTyping] = useState(false) // Instant feedback on keystroke
  const [suggestions, setSuggestions] = useState<FullProfile[]>([])
  useTriggerLog(suggestions, "suggestions")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const enablePredictive = true
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  const wsContext = useWebSocketContext()
  const { search: wsSearch, isConnected: wsConnected } = useSearchWebSocket(wsContext)
  const { search: localSearch, cacheStats, syncNetwork, isSyncing } = useLocalIdentitySearch()
  const [usingLocalFallback, setUsingLocalFallback] = useState(false)

  // Stable cache check - once we have identities, this stays true
  const hasLocalCache = useMemo(() => cacheStats && cacheStats.count > 0, [cacheStats?.count])
  // Track syncing in a ref to avoid re-triggering search effect
  const isSyncingRef = useRef(isSyncing)
  isSyncingRef.current = isSyncing
  // Track last searched query to avoid duplicate searches
  const lastSearchedRef = useRef<string>('')

  // Auto-sync identities from chain on first load (background, non-blocking)
  // Uses module-level flag to prevent re-syncing across component mounts
  useEffect(() => {
    if (globalSyncStarted) return
    if (cacheStats && cacheStats.count === 0) {
      globalSyncStarted = true
      console.log('[search-form] empty local cache, syncing from chain...')
      // Sync all people chains in parallel (non-blocking)
      Promise.all([
        syncNetwork('paseo_people').catch(() => 0),
        syncNetwork('polkadot_people').catch(() => 0),
        syncNetwork('ksmcc3_people').catch(() => 0),
      ]).then((counts) => {
        console.log('[search-form] synced identities:', counts.reduce((a, b) => a + b, 0))
      })
    }
  }, [cacheStats, syncNetwork])

  useEffect(() => {
    if (urlParams.q) {
      setQuery(urlParams.q)
    }
  }, [urlParams])

  useEffect(() => {
    if (!enablePredictive) {
      setSuggestions([])
      setShowSuggestions(false)
      setIsSearching(false)
      setIsTyping(false)
      setUsingLocalFallback(false)
      lastSearchedRef.current = ''
      return
    }

    // Start searching at 2 characters for faster results (Google-like)
    if (debouncedQuery.length >= 2) {
      // Skip if we already searched this exact query (prevents duplicate searches during sync)
      if (lastSearchedRef.current === debouncedQuery) {
        setIsSearching(false)
        setIsTyping(false)
        return
      }

      setIsSearching(true)

      // PRIORITY: Local on-chain data is trustless - use it when available
      // Also use local search if syncing is in progress (it will search what's already cached)
      if (hasLocalCache || isSyncingRef.current) {
        localSearch(debouncedQuery, undefined, 5).then((localResults) => {
          const profiles = localResults.map(scoredIdentityToProfile)
          setSuggestions(profiles)
          setShowSuggestions(profiles.length > 0)
          setUsingLocalFallback(true)
          setIsSearching(false)
          setIsTyping(false)
          lastSearchedRef.current = debouncedQuery
        }).catch((err) => {
          console.error("Local search failed:", err)
          setSuggestions([])
          setIsSearching(false)
          setIsTyping(false)
        })
        return
      }

      // FALLBACK: Use WebSocket only when local cache is empty and not syncing
      if (!wsConnected) {
        setSuggestions([])
        setShowSuggestions(false)
        setIsSearching(false)
        setIsTyping(false)
        return
      }

      const searchObj = constructSearchObject(debouncedQuery, ["WalletID", "Display", "Email", "Twitter", "Network"])
      wsSearch(searchObj, 5).then((results) => {
        setSuggestions(results)
        setShowSuggestions(results.length > 0)
        setIsSearching(false)
        setIsTyping(false)
        setUsingLocalFallback(false)
        lastSearchedRef.current = debouncedQuery
      }).catch(() => {
        setSuggestions([])
        setIsSearching(false)
        setIsTyping(false)
      })
    } else {
      setSuggestions([])
      setShowSuggestions(false)
      setIsSearching(false)
      setIsTyping(false)
      setUsingLocalFallback(false)
      lastSearchedRef.current = ''
    }
  }, [debouncedQuery, wsSearch, localSearch, enablePredictive, wsConnected, hasLocalCache])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()

    setIsSubmitting(true)
    setShowSuggestions(false)
    // Use Base64 encoding for safer URL handling
    navigate(`/search?query=${query}`);
  }, [query, navigate]);

  const handleSuggestionClick = useCallback((profile: FullProfile) => {
    setShowSuggestions(false)
    const ecosystem = profile.network ? getEcosystemName(profile.network) : 'paseo'
    // Convert to chain-specific address format
    let address = profile.wallet_id
    try {
      // Map backend network name (kusama, polkadot, paseo) to CHAINS key (ksmcc3_people, etc)
      const chainKey = profile.network ? getChainKeyFromNetwork(profile.network) : null
      const chainConfig = chainKey ? CHAINS[chainKey] : null
      if (chainConfig?.ss58Format !== undefined) {
        const publicKey = decodeAddress(profile.wallet_id)
        address = encodeAddress(publicKey, chainConfig.ss58Format)
      }
    } catch {
      // Keep original address on error
    }
    navigate(`/profile/${ecosystem}/${address}`)
  }, [navigate]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev))
        break
      case "ArrowUp":
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
        break
      case "Enter":
        if (selectedIndex >= 0) {
          e.preventDefault()
          handleSuggestionClick(suggestions[selectedIndex])
        }
        break
      case "Escape":
        setShowSuggestions(false)
        setSelectedIndex(-1)
        break
    }
  }

  const handleBlur = (e: React.FocusEvent) => {
    setTimeout(() => {
      if (!suggestionsRef.current?.contains(e.relatedTarget as Node)) {
        setShowSuggestions(false)
      }
    }, 150)
  }

  return (
    <div className="w-full relative">
      <form onSubmit={handleSubmit} className="w-full" role="search" aria-label="Search for identities">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              const newValue = e.target.value
              setQuery(newValue)
              // Instant feedback: show typing indicator immediately (2+ chars for Google-like speed)
              if (enablePredictive && newValue.length >= 2) {
                setIsTyping(true)
              } else {
                setIsTyping(false)
                setSuggestions([])
                setShowSuggestions(false)
              }
            }}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            onFocus={() => enablePredictive && debouncedQuery.length >= 2 && suggestions.length > 0 && setShowSuggestions(true)}
            placeholder="Search identities..."
            className="w-full h-10 md:h-12 px-4 pl-10 md:pl-12 pr-10 rounded-full bg-gray-800 border border-gray-700 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 focus:outline-none text-white placeholder-gray-400 transition-all text-sm md:text-base"
            aria-label="Search query"
            disabled={isSubmitting}
            autoComplete="off"
          />
          {isSearching || isTyping ? (
            <Loader2 className="absolute left-3 md:left-4 top-1/2 transform -translate-y-1/2 text-pink-400 w-4 h-4 md:w-5 md:h-5 animate-spin" />
          ) : (
            <Search className="absolute left-3 md:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5" />
          )}

          {query.trim() && !isSearching && !isTyping && (
            <button
              type="submit"
              disabled={isSubmitting}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              aria-label="Submit search"
            >
              <Search className="w-4 h-4" />
            </button>
          )}
        </div>
      </form>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 mt-2 bg-gray-800/95 backdrop-blur-sm border border-gray-700 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150"
        >
          {usingLocalFallback && (
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-gray-400 bg-gray-700/30 border-b border-gray-700">
              <Database className="w-3 h-3 text-pink-400/70" />
              <span>
                local cache ({cacheStats?.count || 0})
                {isSyncing && ' · syncing...'}
              </span>
            </div>
          )}
          {suggestions.map((profile, index) => (
            <SuggestionItem
              key={`${profile.network || 'unknown'}-${profile.wallet_id}`}
              profile={profile}
              index={index}
              isSelected={index === selectedIndex}
              onClick={handleSuggestionClick}
            />
          ))}
        </div>
      )}
    </div>
  )
}
