"use client"

import type React from "react"
import { useSearchParams, useNavigate, Link } from "react-router-dom"
import { useState, useEffect, useCallback } from "react"
import {
  Search,
  Users,
  Shield,
  Verified,
  Globe,
  Github,
  MessageCircle,
  Key,
  Copy,
  Mail,
  Circle,
  User,
  ArrowLeft,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/page-header"

import { shortenAddress } from "@/utils/format-address"
import { useSearchContext } from "@/contexts/web-socket-provider"
import { SearchResults as ProfileSearchResults } from "@/hooks/websocket/search"
import { useTriggerLog } from "@/hooks/use-trigger-log"


export default function SearchResults() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const query = searchParams.get("q") || ""

  const [isLoading, setIsLoading] = useState(true)
  const [results, setResults] = useState<ProfileSearchResults | null>(null)
  useTriggerLog(results, "results")
  const [searchQuery, setSearchQuery] = useState(query)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const { search, results: _results } = useSearchContext()

  const fetchResults = useCallback(async () => {
    setIsLoading(true)
    try {
      const filteredProfiles = await search(query, 50)
      setResults(filteredProfiles)
    } catch (error) {
      console.error("Error fetching search results:", error)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [query, search])
  
  useEffect(() => {
    if (!query) {
      navigate("/")
      return
    }

    if (!_results) {
      setTimeout(fetchResults, 100);
    } else {
      setResults(_results)
      setIsLoading(false)
    }
  }, [query, navigate, _results])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
  }

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const getVerificationBadge = (verified: boolean, judgement: string) => {
    if (verified && judgement === "KnownGood") {
      return (
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
          <Verified className="w-3 h-3 mr-1" />
          <span className="hidden sm:inline">Verified</span>
        </Badge>
      )
    } else if (verified && judgement === "Reasonable") {
      return (
        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
          <Shield className="w-3 h-3 mr-1" />
          <span className="hidden sm:inline">Reasonable</span>
        </Badge>
      )
    } else if (judgement === "Fee Paid") {
      return (
        <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
          <Shield className="w-3 h-3 mr-1" />
          <span className="hidden sm:inline">Fee Paid</span>
        </Badge>
      )
    } else {
      return (
        <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs">
          <span className="hidden sm:inline">Unverified</span>
        </Badge>
      )
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <PageHeader backTo="/"
        rightActions={
          <Link to="/register">
            <Button className="bg-pink-500 hover:bg-pink-600 text-white p-2 md:px-4 md:py-2">
              <User className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Register Identity</span>
            </Button>
          </Link>
        }
      />

      <div className="border-b border-gray-800 bg-gray-900">
        <div className="container mx-auto px-4 py-4">
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search identities..."
              className="w-full h-10 md:h-12 px-4 pl-10 md:pl-12 pr-16 md:pr-20 rounded-md bg-gray-800 border border-gray-700 focus:border-pink-500 focus:outline-none text-white placeholder-gray-400 text-sm md:text-base"
            />
            <Search className="absolute left-3 md:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5" />
            <button
              type="submit"
              className="absolute right-2 md:right-3 top-1/2 transform -translate-y-1/2 bg-pink-500 hover:bg-pink-600 text-white px-2 md:px-4 py-1 md:py-1.5 rounded-md text-xs md:text-sm font-medium"
            >
              <span className="md:hidden">Go</span>
              <span className="hidden md:inline">Search</span>
            </button>
          </form>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-lg md:text-xl font-bold mb-2">{isLoading ? "Searching..." : `Results for "${query}"`}</h1>
          <p className="text-gray-400 text-sm">
            {!isLoading && `Found ${results.length} ${results.length === 1 ? "identity" : "identities"}`}
          </p>
        </div>

        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <div className="w-8 h-8 rounded-full border-2 border-pink-500/30 border-t-pink-500 animate-spin"></div>
          </div>
        )}

        {!isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {results.map((profile) => (
              <Card
                key={profile.id}
                className="bg-gray-800 border-pink-500/30 hover:border-pink-500/50 transition-colors"
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between m-3">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <img
                        src={profile.avatar || "/placeholder.svg"}
                        alt={profile.displayName}
                        className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover flex-shrink-0"
                        loading="lazy"
                      />
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-white text-sm md:text-base truncate">{profile.displayName}</h3>
                        {profile.nickname && (
                          <div className="flex items-center text-xs text-gray-400">
                            <Circle className="w-3 h-3 mr-1 text-pink-400 fill-pink-400 flex-shrink-0" />
                            <span className="truncate">{profile.nickname}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0">{getVerificationBadge(profile.verified, profile.judgement)}</div>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center min-w-0 flex-1">
                        <span className="text-gray-400 mr-2 flex-shrink-0">Address:</span>
                        <span className="font-mono text-gray-300 truncate">
                          {shortenAddress(profile.walletAddress, 4, 4)}
                        </span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(profile.walletAddress, `wallet-${profile.id}`)}
                        className="text-gray-400 hover:text-pink-400 transition-colors flex-shrink-0 ml-2"
                        title="Copy address"
                      >
                        {copiedField === `wallet-${profile.id}` ? (
                          <span className="text-green-400 text-xs">✓</span>
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>

                    {profile.email && (
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center min-w-0 flex-1">
                          <Mail className="w-3 h-3 text-gray-400 mr-1 flex-shrink-0" />
                          <span className="text-gray-300 truncate">{profile.email}</span>
                        </div>
                        <button
                          onClick={() => copyToClipboard(profile.email, `email-${profile.id}`)}
                          className="text-gray-400 hover:text-pink-400 transition-colors flex-shrink-0 ml-2"
                          title="Copy email"
                        >
                          {copiedField === `email-${profile.id}` ? (
                            <span className="text-green-400 text-xs">✓</span>
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    )}

                    {profile.matrix && (
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center min-w-0 flex-1">
                          <MessageCircle className="w-3 h-3 text-gray-400 mr-1 flex-shrink-0" />
                          <span className="text-gray-300 truncate">{profile.matrix}</span>
                        </div>
                        <button
                          onClick={() => copyToClipboard(profile.matrix, `matrix-${profile.id}`)}
                          className="text-gray-400 hover:text-pink-400 transition-colors flex-shrink-0 ml-2"
                          title="Copy Matrix ID"
                        >
                          {copiedField === `matrix-${profile.id}` ? (
                            <span className="text-green-400 text-xs">✓</span>
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {profile.connections.website && (
                      <a
                        href={`https://${profile.connections.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-gray-700 p-1.5 rounded-md hover:bg-gray-600 transition-colors"
                        title={profile.connections.website}
                      >
                        <Globe className="w-4 h-4 text-pink-400" />
                      </a>
                    )}
                    {profile.connections.github && (
                      <a
                        href={`https://github.com/${profile.connections.github}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-gray-700 p-1.5 rounded-md hover:bg-gray-600 transition-colors"
                        title={`github.com/${profile.connections.github}`}
                      >
                        <Github className="w-4 h-4 text-pink-400" />
                      </a>
                    )}
                    {profile.connections.pgp && (
                      <button
                        onClick={() => copyToClipboard(profile.connections.pgp, `pgp-${profile.id}`)}
                        className="bg-gray-700 p-1.5 rounded-md hover:bg-gray-600 transition-colors"
                        title="Copy PGP fingerprint"
                      >
                        <Key className="w-4 h-4 text-pink-400" />
                      </button>
                    )}
                    {profile.connections.discord && (
                      <button
                        onClick={() => copyToClipboard(profile.connections.discord, `discord-${profile.id}`)}
                        className="bg-gray-700 p-1.5 rounded-md hover:bg-gray-600 transition-colors"
                        title="Copy Discord ID"
                      >
                        <MessageCircle className="w-4 h-4 text-pink-400" />
                      </button>
                    )}
                  </div>

                  <Link to={`/profile/${profile.id}`} className="w-full">
                    <Button className="w-full bg-gray-700 hover:bg-gray-600 text-white border border-gray-600 text-xs h-8">
                      <span className="md:hidden">View Profile</span>
                      <span className="hidden md:inline">View Full Profile</span>
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && results.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">No identities found</h3>
            <p className="text-gray-500 mb-6">Try adjusting your search terms or browse all verified identities</p>
            <Link to="/">
              <Button className="bg-gray-700 hover:bg-gray-600 text-white border border-gray-600">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        )}
      </main>

      <footer className="container mx-auto px-4 py-6 border-t border-gray-800">
        <div className="flex flex-col items-center justify-center text-gray-500 text-xs space-y-1">
          <div className="flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-3 h-3 mr-1"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M9 10a3 3 0 1 1 6 0v4a3 3 0 1 1-6 0" />
            </svg>
            <span>{new Date().getFullYear()} whodb</span>
          </div>
          <span className="text-gray-600">Released under Creative Commons (CC BY-SA 4.0)</span>
        </div>
      </footer>
    </div>
  )
}
