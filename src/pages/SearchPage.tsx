import type React from "react"
import { useSearchParams, useNavigate, Link, useLocation } from "react-router-dom"
import { useState, useEffect, useCallback } from "react"
import { Search, Users, Shield, Verified, Copy, Circle, User, ArrowLeft, } from "lucide-react"
import { Button } from "@/lib/ui"
import { Card, CardContent } from "@/lib/ui"
import { Badge } from "@/lib/ui"
import { PageHeader } from "@/components/page-header"

import { shortenAddress } from "@/utils/format-address"
import { useWebSocketContext } from "@/contexts/web-socket-provider"
import { useTriggerLog } from "@/hooks/use-trigger-log"

import { LoadingSpinner } from "@/components/LoadingSpinner"
import { FullProfile } from "@/types/profile"
import { useSearchWebSocket } from "@/hooks/websocket/search"
import { TimelineEventRecord } from "@/types/timeline"

// TODO: fix loading animation
// TODO: fix search suggestion
export default function SearchResults() {
  const [searchParams] = useSearchParams()
  const query = searchParams.get("q") || ""
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [results, setResults] = useState<FullProfile[] | null>(null)
  useTriggerLog(results, "results")
  
  const { search } = useSearchWebSocket(useWebSocketContext())
  
  const [searchQuery, setSearchQuery] = useState(query)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  
  const fetchResults = useCallback(async (query: string, limit?: number) => {
    setIsLoading(true)
    try {
      const filteredProfiles = await search(query, limit)
      setResults(filteredProfiles)
    } catch (error) {
      console.error("Error fetching search results:", error)
    } finally {
      setIsLoading(false)
    }
  }, [search])

  const { results: pushedResults } = useLocation().state || {};
  useTriggerLog(pushedResults, "pushedResults")

  useEffect(() => {
    if (!query) {
      navigate("/")
      return
    }

    if (!pushedResults) {
      fetchResults(query, 20);  // TODO Maybe add flags
    } else {
      setResults(pushedResults)
      setIsLoading(false)
    }
  }, [query, navigate, pushedResults])
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    fetchResults(searchQuery.trim())
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

  const resultsLength = results?.length || 0

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
              className="absolute right-2 md:right-3 top-1/2 transform -translate-y-1/2 bg-primary hover:bg-primary/90 text-white px-2 md:px-4 py-1 md:py-1.5 rounded-md text-xs md:text-sm font-medium"
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
            {!isLoading && `Found ${resultsLength} ${resultsLength === 1 ? "identity" : "identities"}`}
          </p>
        </div>

        {isLoading && <LoadingSpinner />}

        {!isLoading && (resultsLength === 0 
          ? (<div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">No identities found</h3>
            <p className="text-gray-500 mb-6">Try adjusting your search terms or browse all verified identities</p>
            <Link to="/">
              <Button className="bg-gray-700 hover:bg-gray-600 text-white border border-gray-600">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>)
          : (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {results?.map((profile) => {
              const info = profile.identity.info
              return (
                <Card
                  key={`${profile.network}/${profile.address}`}
                  className="bg-gray-800 border-pink-500/30 hover:border-pink-500/50 transition-colors"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between m-3">
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <img
                          src={info.image || "/placeholder.svg"}
                          alt={info.display}
                          className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover flex-shrink-0"
                          loading="lazy" />
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium text-white text-sm md:text-base truncate">{info.display}</h3>
                          {info.display && (
                            <div className="flex items-center text-xs text-gray-400">
                              <Circle className="w-3 h-3 mr-1 text-pink-400 fill-pink-400 flex-shrink-0" />
                              {/* TODO Have a domain-like name be generated with current's display and superaccounts */}
                              <span className="truncate">{info.display}.alt</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {/* FIXME using it twice already */}
                        {getVerificationBadge(
                          profile.verified ?? false,
                          profile.timeline?.find((event: TimelineEventRecord) =>
                            event.event === 'verified'
                          )
                            ? "KnownGood"
                            : profile.timeline?.find((event: TimelineEventRecord) =>
                              event.event === 'created'
                            )
                              ? "IdentitySet"
                              : "Unknown"
                          ,
                        )}
                      </div>
                    </div>
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center min-w-0 flex-1">
                          <span className="text-gray-400 mr-2 flex-shrink-0">Address:</span>
                          <span className="font-mono text-gray-300 truncate">
                            {shortenAddress(profile.address, 4, 4)}
                          </span>
                        </div>
                        <button
                          onClick={() => copyToClipboard(profile.address, `wallet-${profile.address}`)}
                          className="text-gray-400 hover:text-pink-400 transition-colors flex-shrink-0 ml-2"
                          title="Copy address"
                        >
                          {copiedField === `wallet-${profile.address}` ? (
                            <span className="text-green-400 text-xs">✓</span>
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Link key={profile.address}
                        to={`/profile/${profile.network}/${profile.address}`}
                        state={{ fromSearch: true, profile }}
                      >
                        <Button className="w-full transition-colors flex-shrink-0 py-0 text-sm">
                          View Full Profile
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>)
        )}
      </main>
    </div>
  )
}
