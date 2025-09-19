import { useEffect, useState } from "react"
import { useUrlParams } from "@/hooks/useUrlParams"
import SearchForm from "@/components/search-form"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { User, Mail, Wallet, Globe, Shield, CheckCircle, Search } from "lucide-react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Link } from "react-router-dom"
import { useSearchContext } from "@/contexts/web-socket-provider"
import { FullProfile } from "@/types/profile"
import * as Avatar from "@radix-ui/react-avatar"
import { constructSearcObject } from "@/lib/utils"

// TODO: fix loading animation
// TODO: fix navigation (forward and backward page)
// TODO: fix search suggestion
export default function SearchPage() {
  const { search } = useSearchContext()
  const [results, setResults] = useState<FullProfile[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const query = searchParams.get('query') || '';
  // const decodedString = atob(query);
  var searchTxt = query;
  var searchJson = null;

  // Get query from decoded base64 url param
  if (query != '') {
    searchJson = constructSearcObject(query);
  }

  const fetchResults = async (searchQuery: any, limit: number = 20) => {

    setIsLoading(true);
    try {
      // Use the centralized search function from context
      const searchResults = await search(searchQuery, limit);
      setResults(searchResults);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize search query from URL on component mount
  useEffect(() => {
    if (query && query !== searchQuery) {
      setSearchQuery("");
    }
  }, [query]);

  useEffect(() => {
    if (query) {
      try {
        // Extract the enum and JSON object from searchData
        fetchResults(searchJson, 20);
      } catch (error) {
        console.error('Failed to decode search data:', error);
        fetchResults(searchJson, 20);
      }
    } else {
      // Clear results when no query is present
      setResults([]);
    }
  }, [query])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) {
      navigate('/search')
      return
    }
    // Use Base64 encoding for safer URL handling
    navigate(`/search?query=${searchQuery}`);
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
              <span className="hidden md:inline">Search</span>
            </button>
          </form>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-lg md:text-xl font-bold mb-2">{isLoading ? "Searching..." : `Results for "${searchTxt}"`}</h1>
          <p className="text-gray-400 text-sm">
            {!isLoading && `Found ${resultsLength} ${resultsLength === 1 ? "identity" : "identities"}`}
          </p>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
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
              <div key={profile.id} className="bg-gray-800 p-6 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors">
                <div className="flex items-start space-x-4">
                  <Avatar.Root className="w-16 h-16 rounded-full overflow-hidden">
                    <Avatar.Image
                      src={profile.image}
                      alt={profile.display}
                      className="w-full h-full object-cover"
                    />
                    <Avatar.Fallback className="w-full h-full bg-gray-600 flex items-center justify-center text-lg font-semibold text-white">
                      {profile.display?.charAt(0)?.toUpperCase() || "?"}
                    </Avatar.Fallback>
                  </Avatar.Root>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-xl font-semibold text-white">{profile.display}</h3>
                      {profile.timeline?.some(event => event.event === 'verified') && (
                        <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                    {profile.email ? (
                      <div className="flex items-center text-gray-300 mb-2">
                        <Mail className="w-4 h-4 mr-2 text-pink-400" />
                        <span className="truncate">{profile.email}</span>
                      </div>
                    ) : null}

                    <div className="flex items-center text-gray-300">
                      <Wallet className="w-4 h-4 mr-2 text-pink-400" />
                      <span className="font-mono text-xs truncate">{profile.wallet_id}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn-primary px-4 py-2 rounded-lg text-sm"
                    onClick={() => {
                      navigate(`/profile/${profile.wallet_id}`);
                    }}>
                    View Profile
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Globe className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Start searching</h3>
            <p className="text-gray-400">Enter at least 3 characters to search for identities.</p>
          </div>
        )
        }
      </main >
    </div >
  )
}
