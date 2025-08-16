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

  const getNetworkColor = (network: string) => {
    switch (network) {
      case 'polkadot': return 'text-purple-400'
      case 'kusama': return 'text-blue-400'
      case 'paseo': return 'text-pink-400'
      default: return 'text-gray-400'
    }
  }

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
}
