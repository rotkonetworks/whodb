import { useParams, Link } from "react-router-dom"
import { ArrowLeft, Mail, Wallet, Shield, CheckCircle, XCircle, Globe } from "lucide-react"

// Mock profile data
const mockProfiles = {
  "1": {
    id: 1,
    displayName: "alice",
    nickname: "alice.dot",
    walletAddress: "13KVFndw5GXkwPSzNtd2FHGdJnFN3Z3zTvbjdQfDGpQYYpiK",
    email: "alice@example.org",
    avatar: "/professional-woman-avatar.png",
    network: "paseo",
    verified: true,
    bio: "Blockchain developer and DeFi enthusiast. Building the future of decentralized finance.",
    joinDate: "2023-08-15",
    verificationStatus: {
      email: true,
      phone: false,
      identity: true,
      github: true,
    }
  },
  "2": {
    id: 2,
    displayName: "bob",
    nickname: "bob.dot",
    walletAddress: "15nt73xvxdRqz6kno46Yekg44cX3yGNWCYeK7HqHmEkFre4",
    email: "bob@example.org",
    avatar: "/professional-man-avatar.png",
    network: "polkadot",
    verified: true,
    bio: "Smart contract auditor and security researcher. Passionate about making DeFi safer.",
    joinDate: "2023-06-20",
    verificationStatus: {
      email: true,
      phone: true,
      identity: true,
      github: false,
    }
  },
  "3": {
    id: 3,
    displayName: "charlie",
    nickname: null,
    walletAddress: "14Vz8D6TP7pzPeNKRYBLDEBuCJAVQYDVmJNHHHfWHEPGzXk",
    email: "charlie@example.org",
    avatar: "/woman-developer-avatar.png",
    network: "kusama",
    verified: false,
    bio: "Frontend developer specializing in Web3 UX. Making blockchain accessible to everyone.",
    joinDate: "2023-09-10",
    verificationStatus: {
      email: true,
      phone: false,
      identity: false,
      github: true,
    }
  },
  "4": {
    id: 4,
    displayName: "david",
    nickname: "david.dot",
    walletAddress: "16DKyH4fggEXeGwCytqM19e9NFGkgR2neZPDJ5ta8BKpPbPK",
    email: "david@example.org",
    avatar: "/asian-man-developer-avatar.png",
    network: "paseo",
    verified: true,
    bio: "Parachain developer and substrate enthusiast. Building the next generation of blockchains.",
    joinDate: "2023-07-05",
    verificationStatus: {
      email: true,
      phone: true,
      identity: true,
      github: true,
    }
  }
}

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>()
  const profile = id ? mockProfiles[id as keyof typeof mockProfiles] : null

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Globe className="w-16 h-16 text-muted mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Profile Not Found</h1>
          <p className="text-muted mb-6">The profile you're looking for doesn't exist.</p>
          <Link to="/" className="btn-primary px-6 py-3 rounded-lg">
            Go Back Home
          </Link>
        </div>
      </div>
    )
  }

  const getNetworkColor = (network: string) => {
    switch (network) {
      case 'polkadot': return 'text-purple-400 bg-purple-400/10'
      case 'kusama': return 'text-blue-400 bg-blue-400/10'
      case 'paseo': return 'text-pink-400 bg-pink-400/10'
      default: return 'text-gray-400 bg-gray-400/10'
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link to="/search" className="inline-flex items-center text-muted hover:text-foreground mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Search
          </Link>
        </div>

        {/* Profile Card */}
        <div className="bg-card rounded-lg border border-border/30 overflow-hidden">
          {/* Cover/Header */}
          <div className="h-32 bg-gradient-to-r from-accent/20 to-accent/40"></div>

          {/* Profile Content */}
          <div className="px-6 pb-6">
            {/* Avatar and Basic Info */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:space-x-6 -mt-16 sm:-mt-12">
              <img
                src={profile.avatar || "/placeholder.svg"}
                alt={profile.displayName}
                className="w-24 h-24 rounded-full border-4 border-card object-cover mb-4 sm:mb-0"
              />

              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center space-x-3 mb-2">
                      <h1 className="text-2xl font-bold text-foreground">{profile.displayName}</h1>
                      {profile.verified && (
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>

                    {profile.nickname && (
                      <p className="text-accent font-medium mb-1">{profile.nickname}</p>
                    )}

                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getNetworkColor(profile.network)}`}>
                      <Globe className="w-3 h-3 mr-1" />
                      {profile.network}
                    </div>
                  </div>

                  <div className="mt-4 sm:mt-0">
                    <button type="button" className="btn-outline px-4 py-2 rounded-lg">
                      Follow
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bio */}
            <div className="mt-6">
              <p className="text-foreground">{profile.bio}</p>
            </div>

            {/* Contact Information */}
            <div className="mt-6 space-y-3">
              <div className="flex items-center text-muted">
                <Mail className="w-4 h-4 mr-3" />
                <span>{profile.email}</span>
              </div>

              <div className="flex items-center text-muted">
                <Wallet className="w-4 h-4 mr-3" />
                <span className="font-mono text-xs break-all">{profile.walletAddress}</span>
              </div>
            </div>

            {/* Verification Status */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Verification Status
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {Object.entries(profile.verificationStatus).map(([key, verified]) => (
                  <div key={key} className="flex items-center space-x-2">
                    {verified ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span className={`text-sm capitalize ${verified ? 'text-green-400' : 'text-red-400'}`}>
                      {key}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Member Since */}
            <div className="mt-6 pt-6 border-t border-border/30">
              <p className="text-muted text-sm">
                Member since {new Date(profile.joinDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
