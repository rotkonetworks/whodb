import { useParams, Link, useSearchParams } from "react-router-dom"
import { ArrowLeft, Mail, Wallet, Shield, CheckCircle, XCircle, Globe } from "lucide-react"
import VerificationTimeline from "../components/verification-timeline";

export default function ProfilePage() {
  const [searchParams] = useSearchParams()
  
  // Get profile object from URL params
  const getProfile = () => {
    const profileData = searchParams.get('data');
    if (profileData) {
      try {
        const decodedData = atob(profileData);
        return JSON.parse(decodedData);
      } catch (error) {
        console.error('Failed to parse profile data:', error);
        return null;
      }
    }
    return null;
  };
  
  const profile = getProfile();

  const { search } = useSearchWebSocket(useWebSocketContext())
  const {
    data: profile,
    isLoading: isProfileLoading,
    isError: isProfileFetchError,
  } = useQuery({
    queryKey: ['profile', network, address],
    queryFn: async () => {
      if (pushedProfile) {// TODO Maybe use it as initial value?
        return pushedProfile
      }
      try {
        // TODO Matching here should be strict.
        const fetchedProfiles = await search(`wallet_id:${address} network:${network}`, 1)
        if (fetchedProfiles.length === 0) {
          throw new Error("Profile not found")
        }
        return fetchedProfiles?.[0]!!;
      } catch (error) {
        console.error("Error fetching profile:", error)
        throw new Error(`Failed to fetch profile: ${error}`)
      }
    }
  })

  const [activeTab, setActiveTab] = useState<ProfileTab>("contact")
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    toast?.success(`${field.charAt(0).toUpperCase() + field.slice(1)} copied!`)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const tabItems = [
    { id: "contact" as ProfileTab, label: "Contact", icon: Contact },
    { id: "timeline" as ProfileTab, label: "Timeline", icon: ListChecks }
  ]
  useTriggerLog(tabItems, "tabItems")
  useTriggerLog(profile, "profile")

  const info = profile?.identity.info

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
                alt={profile.display_name}
                className="w-24 h-24 rounded-full border-4 border-card object-cover mb-4 sm:mb-0"
              />

              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center space-x-3 mb-2">
                      <h1 className="text-2xl font-bold text-foreground">{profile.display_name}</h1>
                      {profile.verified && (
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>

                    {profile.display_name && (
                      <p className="text-accent font-medium mb-1">{profile.display_name}</p>
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

            {/* Contact Information */}
            <div className="mt-6 space-y-3">
              <div className="flex items-center text-muted">
                <Mail className="w-4 h-4 mr-3" />
                <span>{profile.email}</span>
              </div>

              <div className="flex items-center text-muted">
                <Wallet className="w-4 h-4 mr-3" />
                <span className="font-mono text-xs break-all">{profile.wallet_id}</span>
              </div>
            </div>

            {/* Verification Status */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Verification Status
              </h3>

              <VerificationTimeline timeline={profile.timeline} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
