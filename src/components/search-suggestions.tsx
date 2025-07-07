"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { User, AtSign } from "lucide-react"

// This component will be loaded dynamically after the initial page load
export default function SearchSuggestions({
  query,
  setShowSuggestions,
}: {
  query: string
  setShowSuggestions: (show: boolean) => void
}) {
  const router = useRouter()
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Mock profiles - in a real app, this would be fetched from an API
  const mockProfiles = [
    {
      id: 1,
      displayName: "tommi",
      nickname: "tommi.dot",
      walletAddress: "13KVFndw5GXkwPSzNtd2FHGdJnFN3Z3zTvbjdQfDGpQYYpiK",
      email: "tommi@niemi.lol",
      avatar: "/professional-woman-avatar.png",
    },
    {
      id: 2,
      displayName: "Bob Wilson",
      nickname: "bob.dot",
      walletAddress: "15nt73xvxdRqz6kno46Yekg44cX3yGNWCYeK7HqHmEkFre4",
      email: "bob@example.org",
      avatar: "/professional-man-avatar.png",
    },
    {
      id: 3,
      displayName: "Carol Smith",
      nickname: null,
      walletAddress: "14Vz8D6TP7pzPeNKRYBLDEBuCJAVQYDVmJNHHHfWHEPGzXk",
      email: "carol@example.org",
      avatar: "/woman-developer-avatar.png",
    },
    {
      id: 4,
      displayName: "David Chen",
      nickname: "david.dot",
      walletAddress: "16DKyH4fggEXeGwCytqM19e9NFGkgR2neZPDJ5ta8BKpPbPK",
      email: "david@example.org",
      avatar: "/asian-man-developer-avatar.png",
    },
  ]

  useEffect(() => {
    if (query.length >= 3) {
      // Simulate API call for suggestions
      const filtered = mockProfiles.filter(
        (profile) =>
          profile.displayName.toLowerCase().includes(query.toLowerCase()) ||
          (profile.nickname && profile.nickname.toLowerCase().includes(query.toLowerCase())) ||
          profile.email.toLowerCase().includes(query.toLowerCase()) ||
          profile.walletAddress.toLowerCase().includes(query.toLowerCase()),
      )
      setSuggestions(filtered.slice(0, 5)) // Limit to 5 suggestions
      setSelectedIndex(-1)
    } else {
      setSuggestions([])
    }
  }, [query])

  const handleSuggestionClick = (profile: any) => {
    setShowSuggestions(false)
    router.push(`/profile/${profile.id}`)
  }

  // Lazy load the profile images
  useEffect(() => {
    if (suggestions.length > 0) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement
            const dataSrc = img.getAttribute("data-src")
            if (dataSrc) {
              img.src = dataSrc
              img.removeAttribute("data-src")
              observer.unobserve(img)
            }
          }
        })
      })

      const images = document.querySelectorAll(".suggestion-img")
      images.forEach((img) => {
        observer.observe(img)
      })

      return () => {
        images.forEach((img) => {
          observer.unobserve(img)
        })
      }
    }
  }, [suggestions])

  if (suggestions.length === 0) return null

  return (
    <div
      ref={suggestionsRef}
      className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
    >
      {suggestions.map((profile, index) => (
        <button
          key={profile.id}
          onClick={() => handleSuggestionClick(profile)}
          className={`w-full flex items-center space-x-3 p-3 text-left hover:bg-gray-700 transition-colors ${
            index === selectedIndex ? "bg-gray-700" : ""
          } ${index === 0 ? "rounded-t-lg" : ""} ${
            index === suggestions.length - 1 ? "rounded-b-lg" : "border-b border-gray-700"
          }`}
        >
          <img
            className="suggestion-img w-8 h-8 rounded-full object-cover bg-gray-700"
            data-src={profile.avatar || "/placeholder.svg"}
            src="/placeholder.svg?height=32&width=32"
            alt=""
            width={32}
            height={32}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center">
              <p className="text-white text-sm font-medium truncate">{profile.displayName}</p>
              {profile.nickname && (
                <div className="ml-2 flex items-center text-xs text-pink-400">
                  <AtSign className="w-3 h-3 mr-1" />
                  <span>{profile.nickname}.alt</span>
                </div>
              )}
            </div>
            <p className="text-gray-400 text-xs truncate">{profile.email}</p>
          </div>
          <User className="w-4 h-4 text-gray-400" />
        </button>
      ))}
    </div>
  )
}
