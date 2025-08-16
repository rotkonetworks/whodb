import { useEffect, useState } from "react"
import { useUrlParams } from "@/hooks/useUrlParams"
import SearchForm from "@/components/search-form"
import { User, Mail, Wallet, Globe } from "lucide-react"
import { useNavigate, useSearchParams } from "react-router-dom"

// TODO: fix loading animation
// TODO: fix navigation (forward and backward page)
// TODO: fix search suggestion
export default function SearchPage() {
  const { urlParams } = useUrlParams()
  const [results, setResults] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Get search object from URL params
  const getSearchObj = () => {
    const searchData = searchParams.get('data');
    if (searchData) {
      try {
        const decodedData = atob(searchData);
        return JSON.parse(decodedData);
      } catch (error) {
        console.error('Failed to parse search data:', error);
        return null;
      }
    }
    return null;
  };

  const searchObj = getSearchObj();

  useEffect(() => {
    if (searchObj && searchObj["type"] == "SearchRegistration") {
      setIsLoading(true)
      const ws = new WebSocket(import.meta.env.VITE_WS_URL)
      ws.onopen = () => {
        ws.send(JSON.stringify(searchObj))
      }

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        console.log(JSON.stringify(data))
        setResults(data)
        setIsLoading(false)
      }

      ws.onerror = (error) => {
        setIsLoading(false)
      }

      return () => {
        ws.close()
      }
    } else {
      setResults([])
    }
  }, [searchParams.get('data')])

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
      </main>
    </div>
  )
}
