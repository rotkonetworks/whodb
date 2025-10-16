import { useWebSocketContext } from "@/contexts/web-socket-provider"
import { useTriggerLog } from "@/hooks/use-trigger-log"
import { useUrlParams } from "@/hooks/useUrlParams"
import { useSearchWebSocket } from "@/hooks/websocket/search"
import { FullProfile } from "@/types/profile"
import { Circle, Search, User, Loader2 } from "lucide-react"
import type React from "react"
import { useEffect, useRef, useState, useDeferredValue, useMemo, useCallback, memo } from "react"
import { useNavigate } from "react-router-dom"
import { constructSearcObject } from "@/lib/utils"

const SuggestionItem = memo<{
  profile: FullProfile;
  index: number;
  isSelected: boolean;
  onClick: (profile: FullProfile) => void;
}>(({ profile, index, isSelected, onClick }) => {
  const info = profile.identity.info;

  return (
    <button
      onClick={() => onClick(profile)}
      className={`search-suggestion-item w-full flex items-center space-x-3 p-3 text-left hover:bg-gray-700 hover:scale-100 transition-colors ${isSelected ? "bg-gray-700" : ""} ${index === 0 ? "rounded-t-lg" : ""} border-b border-gray-700`}
    >
      <img
        src={info.image || "/placeholder.svg"}
        alt={info.display}
        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
        draggable="false"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center">
          <p className={`text-sm font-medium truncate ${isSelected ? "text-white" : "text-white"}`}>
            {info.display}
          </p>
          {info.display && (
            <div className={`ml-2 flex items-center text-xs flex-shrink-0 ${isSelected ? "text-pink-300" : "text-pink-400"}`}>
              <Circle className={`w-3 h-3 mr-1 ${isSelected ? "fill-pink-300" : "fill-pink-400"}`} />
              <span className="truncate max-w-20">{info.display}</span>.alt
            </div>
          )}
        </div>
        <p className={`text-xs truncate ${isSelected ? "text-gray-300" : "text-gray-400"}`}>
          {info.email}
        </p>
      </div>
      <User className={`w-4 h-4 flex-shrink-0 ${isSelected ? "text-gray-300" : "text-gray-400"}`} />
    </button>
  );
}, (prev, next) => {
  return prev.profile.address === next.profile.address &&
         prev.isSelected === next.isSelected;
});
SuggestionItem.displayName = "SuggestionItem";

export default function SearchForm() {
  const navigate = useNavigate()
  const [query, setQuery] = useState("")
  const deferredQuery = useDeferredValue(query)

  const { urlParams } = useUrlParams()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [suggestions, setSuggestions] = useState<FullProfile[]>([])
  useTriggerLog(suggestions, "suggestions")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  const { search } = useSearchWebSocket(useWebSocketContext())

  useEffect(() => {
    if (urlParams.q) {
      setQuery(urlParams.q)
    }
  }, [urlParams])

  useEffect(() => {
    if (deferredQuery.length >= 2) {
      setIsSearching(true)
      const searchObj = constructSearcObject(deferredQuery, ["id", "display", "email", "twitter"])
      search(searchObj, 5).then((results) => {
        setSuggestions(results)
        setShowSuggestions(results.length > 0)
        setIsSearching(false)
      }).catch((err) => {
        console.error("Search error:", err)
        setSuggestions([])
        setIsSearching(false)
      })
    } else {
      setSuggestions([])
      setShowSuggestions(false)
      setIsSearching(false)
    }
  }, [deferredQuery, search])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()

    setIsSubmitting(true)
    setShowSuggestions(false)
    // Use Base64 encoding for safer URL handling
    navigate(`/search?query=${query}`);
  }, [query, navigate]);

  const handleSuggestionClick = useCallback((profile: FullProfile) => {
    setShowSuggestions(false)
    navigate(`/profile/${profile.network}/${profile.address}`)
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
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            onFocus={() => query.length >= 3 && setShowSuggestions(true)}
            placeholder="Search identities..."
            className="w-full h-10 md:h-12 px-4 pl-10 md:pl-12 pr-16 md:pr-20 rounded-full bg-gray-800 border border-gray-700 focus:border-pink-500 focus:outline-none text-white placeholder-gray-400 transition-colors text-sm md:text-base"
            aria-label="Search query"
            disabled={isSubmitting}
            autoComplete="off"
          />
          {isSearching ? (
            <Loader2 className="absolute left-3 md:left-4 top-1/2 transform -translate-y-1/2 text-pink-400 w-4 h-4 md:w-5 md:h-5 animate-spin" />
          ) : (
            <Search className="absolute left-3 md:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5" />
          )}

          <button
            type="submit"
            disabled={!query.trim() || isSubmitting}
            className="absolute right-2 md:right-3 top-1/2 transform -translate-y-1/2 bg-primary hover:bg-primary/90 text-white px-2 md:px-4 py-1 md:py-1.5 rounded-full text-xs md:text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Submit search"
          >
            <span className="md:hidden">Go</span>
            <span className="hidden md:inline">Search</span>
          </button>
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
              key={`${profile.network}-${profile.address}`}
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
