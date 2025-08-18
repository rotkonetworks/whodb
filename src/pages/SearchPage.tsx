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
import { ProfileResults, useSearchContext } from "@/contexts/web-socket-provider"
import { useTriggerLog } from "@/hooks/use-trigger-log"

import { useUrlParams } from "@/hooks/useUrlParams"
import SearchForm from "@/components/search-form"

// TODO: fix loading animation
// TODO: fix navigation (forward and backward page)
// TODO: fix search suggestion
export default function SearchResults() {
  const [searchParams] = useSearchParams()
  const query = searchParams.get("q") || ""
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [results, setResults] = useState<ProfileResults | null>(null)
  useTriggerLog(results, "results")
  
  const { search, results: _results } = useSearchContext()
  
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
  if (Boolean(import.meta.env.VITE_APP_SIMPLE_SEARCH_DESIGN) === false) {
  } else {
    var { urlParams } = useUrlParams()

    // Maybe this is just as below hook to load results?
    /* useEffect(() => {
      if (searchObj && searchObj["type"] == "SearchRegistration") {
        setIsLoading(true)
      } else {
        setResults([])
      }
    }, [urlParams.q]) */
  }

  useEffect(() => {
    if (!query) {
      navigate("/")
      return
    }

    if (!_results) {
      fetchResults(query, 50);
    } else {
      setResults(_results)
      setIsLoading(false)
    }
  }, [query, navigate, _results])
  
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

  if (Boolean(import.meta.env.VITE_APP_SIMPLE_SEARCH_DESIGN) === false) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-4">Search Results</h1>
            <div className="max-w-2xl">
              <SearchForm />
            </div>
          </div>

          {urlParams.q && (
            <div className="mb-6">
              <p className="text-muted">
                {isLoading ? 'Searching...' : `Found ${results.length} result(s) for "${urlParams.q}"`}
              </p>
            </div>
          )}

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-card p-6 rounded-lg border border-border/30 animate-pulse">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gray-600 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-600 rounded w-1/4 mb-2"></div>
                      <div className="h-3 bg-gray-600 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-4">
              {results.map((profile) => (
                <div key={profile.wallet_id} className="bg-card p-6 rounded-lg border border-border/30 hover:border-accent/50 transition-colors">
                  <div className="flex items-start space-x-4">
                    <img
                      src={profile.image || "../assets/placeholder.svg"}
                      alt={profile.display_name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-xl font-semibold text-foreground">{profile.display_name}</h3>
                        {profile.verified && (
                          <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                        <span className={`text-sm font-medium ${getNetworkColor(profile.network)}`}>
                          {profile.network}
                        </span>
                      </div>

                      {profile.nickname && (
                        <div className="flex items-center text-muted mb-2">
                          <User className="w-4 h-4 mr-2" />
                          <span>{profile.nickname}</span>
                        </div>
                      )}
                      {profile.email ?
                        <div className="flex items-center text-muted mb-2">
                          <Mail className="w-4 h-4 mr-2" />
                          <span className="truncate">{profile.email}</span>
                        </div>
                        : <></>}

                      <div className="flex items-center text-muted">
                        <Wallet className="w-4 h-4 mr-2" />
                        <span className="font-mono text-xs truncate">{profile.wallet_id}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn-primary px-4 py-2 rounded-lg text-sm"
                      onClick={() => {
                        const profileString = btoa(JSON.stringify(profile));
                        navigate(`/profile/${profile.wallet_id}?data=${profileString}`);
                      }}>
                      View Profile
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Globe className="w-16 h-16 text-muted mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">Start searching</h3>
              <p className="text-muted">Enter at least 3 characters to search for identities.</p>
            </div>
          )}
        </div>
      </div>
    )
  } else {
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

          {isLoading && (
            <div className="flex justify-center items-center py-12">
              <div className="w-8 h-8 rounded-full border-2 border-pink-500/30 border-t-pink-500 animate-spin"></div>
            </div>
          )}

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
              {results?.map((profile) => (
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
                          {profile.displayName && (
                            <div className="flex items-center text-xs text-gray-400">
                              <Circle className="w-3 h-3 mr-1 text-pink-400 fill-pink-400 flex-shrink-0" />
                              <span className="truncate">{profile.displayName}</span>
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
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>)
          )}
        </main>
      </div>
    )
  }
}
