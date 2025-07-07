import React, { useEffect, useState } from "react"
import { useUrlParams } from "@/hooks/useUrlParams"
import SearchForm from "@/components/search-form"
import { User, Mail, Wallet, Globe } from "lucide-react"

// Mock profiles data - same as in SearchForm
const mockProfiles = [
  {
    id: 1,
    displayName: "alice",
    nickname: "alice.dot",
    walletAddress: "13KVFndw5GXkwPSzNtd2FHGdJnFN3Z3zTvbjdQfDGpQYYpiK",
    email: "alice@example.org",
    avatar: "/professional-woman-avatar.png",
    network: "paseo",
    verified: true,
  },
  {
    id: 2,
    displayName: "bob",
    nickname: "bob.dot",
    walletAddress: "15nt73xvxdRqz6kno46Yekg44cX3yGNWCYeK7HqHmEkFre4",
    email: "bob@example.org",
    avatar: "/professional-man-avatar.png",
    network: "polkadot",
    verified: true,
  },
  {
    id: 3,
    displayName: "charlie",
    nickname: null,
    walletAddress: "14Vz8D6TP7pzPeNKRYBLDEBuCJAVQYDVmJNHHHfWHEPGzXk",
    email: "charlie@example.org",
    avatar: "/woman-developer-avatar.png",
    network: "kusama",
    verified: false,
  },
  {
    id: 4,
    displayName: "david",
    nickname: "david.dot",
    walletAddress: "16DKyH4fggEXeGwCytqM19e9NFGkgR2neZPDJ5ta8BKpPbPK",
    email: "david@example.org",
    avatar: "/asian-man-developer-avatar.png",
    network: "paseo",
    verified: true,
  },
]

export default function SearchPage() {
  const { urlParams } = useUrlParams()
  const [results, setResults] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const query = urlParams.q
    if (query && query.length >= 3) {
      setIsLoading(true)
      // Simulate API call delay
      setTimeout(() => {
        const filtered = mockProfiles.filter(
          (profile) =>
            profile.displayName.toLowerCase().includes(query.toLowerCase()) ||
            (profile.nickname && profile.nickname.toLowerCase().includes(query.toLowerCase())) ||
            profile.email.toLowerCase().includes(query.toLowerCase()) ||
            profile.walletAddress.toLowerCase().includes(query.toLowerCase()),
        )
        setResults(filtered)
        setIsLoading(false)
      }, 300)
    } else {
      setResults([])
    }
  }, [urlParams.q])

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
              <div key={profile.id} className="bg-card p-6 rounded-lg border border-border/30 hover:border-accent/50 transition-colors">
                <div className="flex items-start space-x-4">
                  <img
                    src={profile.avatar || "/placeholder.svg"}
                    alt={profile.displayName}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-xl font-semibold text-foreground">{profile.displayName}</h3>
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

                    <div className="flex items-center text-muted mb-2">
                      <Mail className="w-4 h-4 mr-2" />
                      <span className="truncate">{profile.email}</span>
                    </div>

                    <div className="flex items-center text-muted">
                      <Wallet className="w-4 h-4 mr-2" />
                      <span className="font-mono text-xs truncate">{profile.walletAddress}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn-primary px-4 py-2 rounded-lg text-sm"
                    onClick={() => window.location.href = `/profile/${profile.id}`}
                  >
                    View Profile
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : urlParams.q && urlParams.q.length >= 3 ? (
          <div className="text-center py-12">
            <Globe className="w-16 h-16 text-muted mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No results found</h3>
            <p className="text-muted">Try searching with different keywords or check the spelling.</p>
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
