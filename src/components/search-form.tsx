import { useWebSocketContext } from "@/contexts/web-socket-provider"
import { useTriggerLog } from "@/hooks/use-trigger-log"
import { useUrlParams } from "@/hooks/useUrlParams"
import { useSearchWebSocket } from "@/hooks/websocket/search"
import { useDebounce } from "@/hooks/useDebounce"
import { FullProfile } from "@/types/profile"
import { Search, User, Loader2, Sparkles } from "lucide-react"
import type React from "react"
import { useEffect, useRef, useState, useCallback, memo } from "react"
import { useNavigate } from "react-router-dom"
import { constructSearchObject } from "@/lib/utils"
import { getEcosystemName } from "@/polkadot-api/chain-config"

const SuggestionItem = memo<{
  profile: FullProfile;
  index: number;
  isSelected: boolean;
  onClick: (profile: FullProfile) => void;
}>(({ profile, index, isSelected, onClick }) => {
  return (
    <button
      onClick={() => onClick(profile)}
      className={`search-suggestion-item w-full flex items-center space-x-3 p-3 text-left hover:bg-gray-700 hover:scale-100 transition-colors ${isSelected ? "bg-gray-700" : ""} ${index === 0 ? "rounded-t-lg" : ""} border-b border-gray-700`}
    >
      <img
        src={profile.image || "/placeholder.svg"}
        alt={profile.display || "User"}
        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
        draggable="false"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center">
          <p className={`text-sm font-medium truncate ${isSelected ? "text-white" : "text-white"}`}>
            {profile.display || "Anonymous"}
          </p>
        </div>
        <p className={`text-xs truncate ${isSelected ? "text-gray-300" : "text-gray-400"}`}>
          {profile.email || profile.wallet_id.slice(0, 8) + "..."}
        </p>
      </div>
      <User className={`w-4 h-4 flex-shrink-0 ${isSelected ? "text-gray-300" : "text-gray-400"}`} />
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
  // Fast debounce (150ms) for instant-feeling search like Google
  // Cache layer handles deduplication so we can be more aggressive
  const debouncedQuery = useDebounce(query, 150)

  const { urlParams } = useUrlParams()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [isTyping, setIsTyping] = useState(false) // Instant feedback on keystroke
  const [suggestions, setSuggestions] = useState<FullProfile[]>([])
  useTriggerLog(suggestions, "suggestions")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [enablePredictive, setEnablePredictive] = useState(() => {
    const saved = localStorage.getItem('enablePredictiveSearch')
    return saved !== null ? saved === 'true' : true
  })
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  const { search } = useSearchWebSocket(useWebSocketContext())

  useEffect(() => {
    if (urlParams.q) {
      setQuery(urlParams.q)
    }
  }, [urlParams])

  // Save preference to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('enablePredictiveSearch', String(enablePredictive))
  }, [enablePredictive])

  useEffect(() => {
    if (!enablePredictive) {
      setSuggestions([])
      setShowSuggestions(false)
      setIsSearching(false)
      setIsTyping(false)
      return
    }

    // Start searching at 2 characters for faster results (Google-like)
    if (debouncedQuery.length >= 2) {
      setIsSearching(true)
      const searchObj = constructSearchObject(debouncedQuery, ["WalletID", "Display", "Email", "Twitter", "Network"])
      search(searchObj, 5).then((results) => {
        setSuggestions(results)
        setShowSuggestions(results.length > 0)
        setIsSearching(false)
        setIsTyping(false) // Clear typing indicator when results arrive
      }).catch((err) => {
        console.error("Search error:", err)
        setSuggestions([])
        setIsSearching(false)
        setIsTyping(false)
      })
    } else {
      setSuggestions([])
      setShowSuggestions(false)
      setIsSearching(false)
      setIsTyping(false)
    }
  }, [debouncedQuery, search, enablePredictive])

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
    navigate(`/profile/${ecosystem}/${profile.wallet_id}`)
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
            className="w-full h-10 md:h-12 px-4 pl-10 md:pl-12 pr-20 md:pr-28 rounded-full bg-gray-800 border border-gray-700 focus:border-pink-500 focus:outline-none text-white placeholder-gray-400 transition-colors text-sm md:text-base"
            aria-label="Search query"
            disabled={isSubmitting}
            autoComplete="off"
          />
          {isSearching || isTyping ? (
            <Loader2 className="absolute left-3 md:left-4 top-1/2 transform -translate-y-1/2 text-pink-400 w-4 h-4 md:w-5 md:h-5 animate-spin" />
          ) : (
            <Search className="absolute left-3 md:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5" />
          )}

          <div className="absolute right-2 md:right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setEnablePredictive(!enablePredictive)}
              className={`p-1 rounded-full transition-colors ${
                enablePredictive
                  ? 'text-pink-400 hover:bg-pink-500/10'
                  : 'text-gray-500 hover:bg-gray-700'
              }`}
              aria-label="Toggle predictive search"
              title={enablePredictive ? "Disable predictive search" : "Enable predictive search"}
            >
              <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4" />
            </button>

            <button
              type="submit"
              disabled={!query.trim() || isSubmitting}
              className="bg-primary hover:bg-primary/90 text-white px-2 md:px-4 py-1 md:py-1.5 rounded-full text-xs md:text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Submit search"
            >
              <span className="md:hidden">Go</span>
              <span className="hidden md:inline">Search</span>
            </button>
          </div>
        </div>
      </form>

      {/* Suggestions Dropdown - mobile responsive with memoized items */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
        >
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
