import { Search } from "lucide-react"
import type React from "react"
import { useRef, useState } from "react"
import { useNavigate } from "react-router-dom"

export default function SearchFormMinimal() {
  const navigate = useNavigate()
  const [query, setQuery] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      navigate(`/search?query=${encodeURIComponent(query)}`)
    }
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
            placeholder="Search identities..."
            className="w-full h-10 md:h-12 px-4 pl-10 md:pl-12 pr-16 md:pr-20 rounded-full bg-gray-800 border border-gray-700 focus:border-pink-500 focus:outline-none text-white placeholder-gray-400 transition-colors text-sm md:text-base"
            aria-label="Search query"
            autoComplete="off"
          />
          <Search className="absolute left-3 md:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5" />

          <button
            type="submit"
            disabled={!query.trim()}
            className="absolute right-2 md:right-3 top-1/2 transform -translate-y-1/2 bg-primary hover:bg-primary/90 text-white px-2 md:px-4 py-1 md:py-1.5 rounded-full text-xs md:text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Submit search"
          >
            <span className="md:hidden">Go</span>
            <span className="hidden md:inline">Search</span>
          </button>
        </div>
      </form>
    </div>
  )
}