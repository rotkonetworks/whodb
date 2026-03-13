import { useEffect, useState, memo, useMemo, useCallback, useRef } from "react"
import { motion } from "framer-motion"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { CheckCircle, Search, AlertCircle, RefreshCw, Database } from "lucide-react"
import { SearchResultSkeleton } from "@/components/ui/profile-skeleton"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useSearchContext } from "@/contexts/web-socket-provider"
import { useLocalIdentitySearch } from "@/hooks/useLocalIdentitySearch"
import { FullProfile } from "@/types/profile"
import { ScoredIdentity } from "@/lib/identity-cache"
import * as Avatar from "@radix-ui/react-avatar"
import { constructSearchObject } from "@/lib/utils"
import { CHAINS, getEcosystemName, getChainKeyFromNetwork } from "@/polkadot-api/chain-config"
import { encodeAddress, decodeAddress } from "@polkadot/util-crypto"

// Convert local cached identity to FullProfile format
function scoredIdentityToProfile(identity: ScoredIdentity): FullProfile {
  return {
    wallet_id: identity.address,
    network: identity.network as any,
    display: identity.display || undefined,
    legal: identity.legal || undefined,
    web: identity.web || undefined,
    email: identity.email || undefined,
    twitter: identity.twitter || undefined,
    github: identity.github || undefined,
    discord: identity.discord || undefined,
    matrix: identity.matrix || undefined,
    image: identity.image || undefined,
    pgp_fingerprint: identity.pgpFingerprint || undefined,
    verified: identity.isVerified,
  }
}

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
      const chainKey = getChainKeyFromNetwork(profile.network)
      const chainConfig = chainKey ? CHAINS[chainKey] : null
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
    const chainKey = getChainKeyFromNetwork(profile.network)
    const chainConfig = chainKey ? CHAINS[chainKey] : null
    if (chainConfig?.name) return chainConfig.name.replace(' People', '')
    if (profile.network) return profile.network.charAt(0).toUpperCase() + profile.network.slice(1)
    return 'Unknown'
  }, [profile.network])

  return (
    <div
      className="flex items-center gap-4 px-4 py-3 border-b border-gray-700/30 hover:bg-gray-800/40 transition-colors cursor-pointer"
      onClick={() => onViewProfile(profile.network, formattedAddress)}
    >
      <Avatar.Root className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
        <Avatar.Image
          src={profile.image || undefined}
          alt={profile.display}
          className="w-full h-full object-cover"
        />
        <Avatar.Fallback className="w-full h-full bg-gray-700 flex items-center justify-center text-sm font-medium text-gray-300">
          {profile.display?.charAt(0)?.toUpperCase() || "?"}
        </Avatar.Fallback>
      </Avatar.Root>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-white truncate">{profile.display || "Anonymous"}</h3>
          {isVerified && (
            <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-500 font-mono truncate">{formattedAddress.slice(0, 8)}...{formattedAddress.slice(-6)}</span>
          <span className="text-[10px] text-gray-600 uppercase tracking-wide">{networkDisplayName}</span>
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
  const { search: localSearch, cacheStats, isSyncing } = useLocalIdentitySearch()
  const [results, setResults] = useState<FullProfile[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [usingLocalFallback, setUsingLocalFallback] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Stable cache check and syncing ref
  const hasLocalCache = useMemo(() => cacheStats && cacheStats.count > 0, [cacheStats?.count])
  const isSyncingRef = useRef(isSyncing)
  isSyncingRef.current = isSyncing

  const query = searchParams.get('query') || '';
  let searchJson = null;

  // Get query from decoded base64 url param
  if (query !== '') {
    searchJson = constructSearchObject(query);
  }

  const fetchResults = async (searchQuery: any, limit: number = 20) => {
    setIsLoading(true);
    setSearchError(null);

    // Extract search text from the query object
    const searchText = typeof searchQuery === 'string'
      ? searchQuery
      : searchQuery?.payload?.filters?.fields?.[0]?.field?.Generic || '';

    // PRIORITY: Local on-chain data is trustless - use it when available
    // Also search local if syncing in progress (partial results are better than nothing)
    if ((hasLocalCache || isSyncingRef.current) && searchText && searchText.length >= 2) {
      try {
        const localResults = await localSearch(searchText, undefined, limit);
        const profiles = localResults.map(scoredIdentityToProfile);
        console.log('Local search results (trustless):', profiles.length);
        setResults(profiles);
        setUsingLocalFallback(true);
        if (profiles.length === 0) {
          setSearchError('No matching identities found in local cache.');
        }
      } catch (localErr) {
        console.error('Local search failed:', localErr);
        setSearchError('Local search failed');
        setResults([]);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // FALLBACK: Use WebSocket for fast initial search when local cache is empty
    setUsingLocalFallback(false);
    try {
      const searchResults = await search(searchQuery, limit);
      console.log('WebSocket search results:', searchResults.length);
      setResults(searchResults);
    } catch (error) {
      console.error('WebSocket search failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Search service unavailable';
      setSearchError(errorMessage + '. Sync identities from chain to enable local search.');
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

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <PageHeader backTo="/" showWallet={false} showNetwork={false} />

      <div className="border-b border-gray-800">
        <div className="container mx-auto px-4 py-3 max-w-2xl">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search identities..."
              className="w-full h-10 px-4 pl-10 pr-4 rounded-md bg-gray-800 border border-gray-700 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 focus:outline-none text-white placeholder-gray-400 text-sm transition-all"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          </form>
        </div>
      </div>

      <main className="container mx-auto px-4 py-4 max-w-2xl">
        {/* Error state */}
        {searchError && !isLoading && (
          <div className="flex items-center gap-3 px-3 py-3 mb-4 rounded-md bg-red-500/10 border border-red-500/20 text-sm">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="text-gray-400 flex-1 truncate">{searchError}</span>
            <Button onClick={handleRetry} variant="ghost" size="sm" className="text-red-400 hover:text-red-300 flex-shrink-0">
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}

        {/* Loading state */}
        {isLoading ? (
          <div className="bg-gray-800/20 border border-gray-700/50 rounded-lg overflow-hidden">
            <SearchResultSkeleton />
          </div>
        ) : results.length > 0 ? (
          <div className="bg-gray-800/20 border border-gray-700/50 rounded-lg overflow-hidden">
            {usingLocalFallback && (
              <div className="flex items-center gap-2 px-4 py-3 text-sm text-gray-400 bg-gray-700/30 border-b border-gray-700">
                <Database className="w-4 h-4 text-pink-400/70" />
                <span>
                  local cache ({cacheStats?.count || 0} identities)
                  {isSyncing && ' · syncing...'}
                </span>
              </div>
            )}
            {results.map((profile, i) => (
              <motion.div
                key={profile.wallet_id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15, delay: Math.min(i * 0.03, 0.3) }}
              >
                <SearchResultItem
                  profile={profile}
                  onViewProfile={handleViewProfile}
                />
              </motion.div>
            ))}
          </div>
        ) : !searchError && query ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="text-center py-16"
          >
            <Search className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-300 mb-1">No results found</h3>
            <p className="text-gray-500 text-sm">Try a different search term</p>
          </motion.div>
        ) : !searchError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="text-center py-16"
          >
            <Search className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-300 mb-1">Search identities</h3>
            <p className="text-gray-500 text-sm">Enter at least 3 characters to begin</p>
          </motion.div>
        )}
      </main>
    </div>
  )
}
