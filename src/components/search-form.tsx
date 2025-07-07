"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useUrlParams } from "@/hooks/useUrlParams"
import { Search, User, Circle } from "lucide-react"
import { useNavigate } from "react-router-dom"

// Mock profiles from all networks - in production this would query all databases
const mockProfiles = [
  {
    id: 1,
    displayName: "alice",
    nickname: "alice.dot",
    walletAddress: "13KVFndw5GXkwPSzNtd2FHGdJnFN3Z3zTvbjdQfDGpQYYpiK",
    email: "alice@example.org",
    avatar: "/professional-woman-avatar.png",
    network: "paseo",
  },
  {
    id: 2,
    displayName: "bob",
    nickname: "bob.dot",
    walletAddress: "15nt73xvxdRqz6kno46Yekg44cX3yGNWCYeK7HqHmEkFre4",
    email: "bob@example.org",
    avatar: "/professional-man-avatar.png",
    network: "polkadot",
  },
  {
    id: 3,
    displayName: "charlie",
    nickname: null,
    walletAddress: "14Vz8D6TP7pzPeNKRYBLDEBuCJAVQYDVmJNHHHfWHEPGzXk",
    email: "charlie@example.org",
    avatar: "/woman-developer-avatar.png",
    network: "kusama",
  },
  {
    id: 4,
    displayName: "david",
    nickname: "david.dot",
    walletAddress: "16DKyH4fggEXeGwCytqM19e9NFGkgR2neZPDJ5ta8BKpPbPK",
    email: "david@example.org",
    avatar: "/asian-man-developer-avatar.png",
    network: "paseo",
  },
]

export default function SearchForm() {
  const navigate = useNavigate()
  const [query, setQuery] = useState("")
  const { urlParams, setParam, deleteParam } = useUrlParams()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (urlParams.q) {
      setQuery(urlParams.q)
    }
  }, [urlParams])

  useEffect(() => {
    if (query.length >= 3) {
      // Search across all networks seamlessly
      const filtered = mockProfiles.filter(
        (profile) =>
          profile.displayName.toLowerCase().includes(query.toLowerCase()) ||
          (profile.nickname && profile.nickname.toLowerCase().includes(query.toLowerCase())) ||
          profile.email.toLowerCase().includes(query.toLowerCase()) ||
          profile.walletAddress.toLowerCase().includes(query.toLowerCase()),
      )
      setSuggestions(filtered.slice(0, 5))
      setShowSuggestions(true)
      setSelectedIndex(-1)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }, [query])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!query.trim()) return

    setIsSubmitting(true)
    setShowSuggestions(false)
    //navigate(`/search?query=${encodeURIComponent(query.trim())}`)
    navigate(`/search?q=${encodeURIComponent(query.trim())}`)
    //setParam("query", query.trim())
  }

  const handleSuggestionClick = (profile: any) => {
    setShowSuggestions(false)
    navigate(`/profile/${profile.id}`)
  }

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
          <Search className="absolute left-3 md:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5" />

          <button
            type="submit"
            disabled={!query.trim() || isSubmitting}
            className="absolute right-2 md:right-3 top-1/2 transform -translate-y-1/2 bg-pink-500 hover:bg-pink-600 text-white px-2 md:px-4 py-1 md:py-1.5 rounded-full text-xs md:text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Submit search"
          >
            <span className="md:hidden">Go</span>
            <span className="hidden md:inline">Search</span>
          </button>
        </div>
      </form>

      {/* Suggestions Dropdown - mobile responsive */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
        >
          {suggestions.map((profile, index) => (
            <button
              key={profile.id}
              onClick={() => handleSuggestionClick(profile)}
              className={`search-suggestion-item w-full flex items-center space-x-3 p-3 text-left hover:bg-gray-700 hover:scale-100 transition-colors ${index === selectedIndex ? "bg-gray-700" : ""
                } ${index === 0 ? "rounded-t-lg" : ""} ${index === suggestions.length - 1 ? "rounded-b-lg" : "border-b border-gray-700"
                }`}
            >
              <img
                src={profile.avatar || "/placeholder.svg"}
                alt={profile.displayName}
                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                draggable="false"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center">
                  <p
                    className={`text-sm font-medium truncate ${index === selectedIndex ? "text-white" : "text-white"}`}
                  >
                    {profile.displayName}
                  </p>
                  {profile.nickname && (
                    <div
                      className={`ml-2 flex items-center text-xs flex-shrink-0 ${index === selectedIndex ? "text-pink-300" : "text-pink-400"}`}
                    >
                      <Circle
                        className={`w-3 h-3 mr-1 ${index === selectedIndex ? "fill-pink-300" : "fill-pink-400"}`}
                      />
                      <span className="truncate max-w-20">{profile.nickname}</span>
                    </div>
                  )}
                </div>
                <p className={`text-xs truncate ${index === selectedIndex ? "text-gray-300" : "text-gray-400"}`}>
                  {profile.email}
                </p>
              </div>
              <User
                className={`w-4 h-4 flex-shrink-0 ${index === selectedIndex ? "text-gray-300" : "text-gray-400"}`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
