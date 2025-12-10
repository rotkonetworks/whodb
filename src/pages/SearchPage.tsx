import { useEffect, useState, memo, useMemo, useCallback } from "react"
import { useUrlParams } from "@/hooks/useUrlParams"
import SearchForm from "@/components/search-form"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { User, Mail, Wallet, Globe, Shield, CheckCircle, Search, UserPlus, Copy, AlertCircle, RefreshCw } from "lucide-react"
import { SearchResultSkeleton } from "@/components/ui/profile-skeleton"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Link } from "react-router-dom"
import { useSearchContext } from "@/contexts/web-socket-provider"
import { FullProfile } from "@/types/profile"
import * as Avatar from "@radix-ui/react-avatar"
import { constructSearcObject } from "@/lib/utils"
import { CHAINS, getEcosystemName } from "@/polkadot-api/chain-config"
import { encodeAddress, decodeAddress } from "@polkadot/util-crypto"
import { useAccount } from "@/contexts/wallet-context"

const SearchResultItem = memo<{
  profile: FullProfile;
  onViewProfile: (network: string, address: string) => void;
}>(({ profile, onViewProfile }) => {
  const [copied, setCopied] = useState<string | null>(null);

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

  const handleCopy = useCallback((e: React.MouseEvent, text: string, label: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }, []);

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
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-medium text-white truncate">{profile.display}</h3>
            {isVerified && (
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
            )}
            <span className="text-xs text-gray-500 uppercase tracking-wide">{networkDisplayName}</span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={(e) => handleCopy(e, formattedAddress, 'address')}
              className="font-mono text-xs truncate text-left hover:text-pink-400 transition-colors text-gray-400"
              title="Click to copy address"
            >
              {formattedAddress}
            </button>
            {copied === 'address' && (
              <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" />
            )}
          </div>
          <div className="space-y-1 text-sm text-gray-400">
            {profile.email && (
              <div className="truncate">{profile.email}</div>
            )}
            {profile.web && (
              <div className="truncate">{profile.web}</div>
            )}
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
  const { address: connectedAddress } = useAccount()
  const [results, setResults] = useState<FullProfile[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const query = searchParams.get('query') || '';
  // const decodedString = atob(query);
  const searchTxt = query;
  let searchJson = null;

  // Get query from decoded base64 url param
  if (query !== '') {
    searchJson = constructSearchObject(query);
  }

  const fetchResults = async (searchQuery: any, limit: number = 20) => {
    setIsLoading(true);
    setSearchError(null);
    try {
      // Use the centralized search function from context
      const searchResults = await search(searchQuery, limit);
      console.log('Search results received:', searchResults);
      setResults(searchResults);
    } catch (error) {
      console.error('Search failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Search service unavailable';
      setSearchError(errorMessage);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    if (searchJson) {
      fetchResults(searchJson, 20);
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
    const ecosystem = getEcosystemName(network);
    navigate(`/profile/${ecosystem}/${address}`);
  }, [navigate]);

  const resultsLength = results?.length || 0

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <PageHeader
        backTo="/"
        showWallet={false}
        showNetwork={false}
        rightActions={
          connectedAddress ? (
            <Link to={`/profile/paseo/${connectedAddress}`}>
              <Button
                size="sm"
                variant="ghost"
                className="text-pink-400 hover:bg-pink-500/10 hover:text-pink-300 transition-colors"
              >
                <User className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">My Profile</span>
              </Button>
            </Link>
          ) : undefined
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

        {/* Error state */}
        {searchError && !isLoading && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 mb-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-red-400 font-medium mb-1">Search failed</h3>
                <p className="text-gray-400 text-sm mb-3">{searchError}</p>
                <Button
                  onClick={handleRetry}
                  variant="outline"
                  size="sm"
                  className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try again
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Loading state */}
        {isLoading ? (
          <div className="bg-gray-800/20 border border-gray-700/50 rounded-lg overflow-hidden">
            <SearchResultSkeleton />
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
        ) : !searchError && query ? (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No results found</h3>
            <p className="text-gray-400">Try a different search term or check your spelling.</p>
          </div>
        ) : !searchError && (
          <div className="text-center py-12">
            <Globe className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Start searching</h3>
            <p className="text-gray-400">Enter at least 3 characters to search for identities.</p>
          </div>
        )}
      </main >
    </div >
  )
}
