import { useEffect, useState, memo, useMemo, useCallback } from "react"
import { useUrlParams } from "@/hooks/useUrlParams"
import SearchForm from "@/components/search-form"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { User, Mail, Wallet, Globe, Shield, CheckCircle, Search, UserPlus } from "lucide-react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Link } from "react-router-dom"
import { useSearchContext } from "@/contexts/web-socket-provider"
import { FullProfile } from "@/types/profile"
import * as Avatar from "@radix-ui/react-avatar"
import { constructSearcObject } from "@/lib/utils"
import { CHAINS } from "@/polkadot-api/chain-config"
import { encodeAddress, decodeAddress } from "@polkadot/util-crypto"

const SearchResultItem = memo<{
  profile: FullProfile;
  onViewProfile: (network: string, address: string) => void;
}>(({ profile, onViewProfile }) => {
  const isVerified = useMemo(
    () => profile.timeline?.some((event) => event.event === "verified"),
    [profile.timeline]
  );

  const formattedAddress = useMemo(() => {
    try {
      const chainConfig = CHAINS[profile.network]
      if (chainConfig?.ss58Format !== undefined) {
        const publicKey = decodeAddress(profile.wallet_id)
        return encodeAddress(publicKey, chainConfig.ss58Format)
      }
      return profile.wallet_id
    } catch {
      return profile.wallet_id
    }
  }, [profile.wallet_id, profile.network])

  const networkDisplayName = useMemo(() => {
    const chainConfig = CHAINS[profile.network]
    return chainConfig?.name?.replace(' People', '') || profile.network
  }, [profile.network])

  return (
    <div
      className="bg-gray-800/20 p-6 border-b border-gray-700/50 hover:bg-gray-800/30 transition-colors cursor-pointer"
      onClick={() => onViewProfile(profile.network, profile.wallet_id)}
    >
      <div className="flex items-start gap-5">
        <Avatar.Root className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
          <Avatar.Image
            src={profile.image}
            alt={profile.display}
            className="w-full h-full object-cover"
          />
          <Avatar.Fallback className="w-full h-full bg-gray-700 flex items-center justify-center text-base font-medium text-gray-300">
            {profile.display?.charAt(0)?.toUpperCase() || "?"}
          </Avatar.Fallback>
        </Avatar.Root>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-base font-medium text-white truncate">{profile.display}</h3>
            {isVerified && (
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
            )}
            <span className="text-xs text-gray-500 uppercase tracking-wide">{networkDisplayName}</span>
          </div>
          <div className="space-y-1.5 text-sm text-gray-400">
            {profile.email && (
              <div className="truncate">{profile.email}</div>
            )}
            <div className="font-mono text-xs truncate">{formattedAddress}</div>
          </div>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.profile.wallet_id === nextProps.profile.wallet_id &&
         prevProps.profile.verified === nextProps.profile.verified &&
         prevProps.profile.display === nextProps.profile.display &&
         prevProps.profile.network === nextProps.profile.network;
});
SearchResultItem.displayName = "SearchResultItem";

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

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) {
      navigate('/search')
      return
    }
    // Use Base64 encoding for safer URL handling
    navigate(`/search?query=${searchQuery}`);
  }, [searchQuery, navigate]);

  const handleViewProfile = useCallback((network: string, address: string) => {
    navigate(`/profile/${network}/${address}`);
  }, [navigate]);

  const resultsLength = results?.length || 0

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <PageHeader
        backTo="/"
        showWallet={false}
        showNetwork={false}
        rightActions={
          <Link to="/register">
            <Button
              size="sm"
              variant="ghost"
              className="text-pink-400 hover:bg-pink-500/10 hover:text-pink-300 transition-colors"
            >
              <UserPlus className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Register</span>
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
          <div className="bg-gray-800/20 border border-gray-700/50 rounded-lg overflow-hidden">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-6 border-b border-gray-700/50 animate-pulse">
                <div className="flex items-start gap-5">
                  <div className="w-12 h-12 bg-gray-700 rounded-full flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <div className="h-4 bg-gray-700 rounded w-32 mb-3"></div>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-700 rounded w-48"></div>
                      <div className="h-3 bg-gray-700 rounded w-56"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : results.length > 0 ? (
          <div className="bg-gray-800/20 border border-gray-700/50 rounded-lg overflow-hidden">
            {results.map((profile) => (
              <SearchResultItem
                key={profile.wallet_id}
                profile={profile}
                onViewProfile={handleViewProfile}
              />
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
