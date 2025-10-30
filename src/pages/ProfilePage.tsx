// NOTE: for searching, we need to only query necessary info, like wallet_id, email, verification status ONLY
// then for profile preview, we need to query the whole thing for that id
import { Profile, ProfileResults, useSearchContext } from "@/contexts/web-socket-provider"
import { constructSearcObject } from "@/lib/utils"
import { ArrowLeft, Mail, Wallet, Shield, CheckCircle, Globe, Github, Fingerprint, AtSign } from "lucide-react"
import { SOCIAL_ICONS } from "@/assets/icons"
import VerificationTimeline from "@/components/verification-timeline"
import { Link, useSearchParams, useLocation } from "react-router-dom"
import { useParams } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { FullDisplayedOutputs } from "@/types/search_fields";
import * as Avatar from "@radix-ui/react-avatar"
import RegistredAccounts from "@/components/registred-accounts"
import { Badge } from "@/components/ui/badge"


const getNetworkColor = (network: string) => {
  switch (network?.toLowerCase()) {
    case 'polkadot':
      return 'bg-pink-500/20 text-pink-400 border-pink-500/30'
    case 'kusama':
      return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
    default:
      return 'bg-gray-600/50 text-gray-300 border-gray-600'
  }
}
const limit = 1;

export default function ProfilePage() {
  const { search } = useSearchContext();
  const { id } = useParams();
  const location = useLocation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const loadedIdRef = useRef<string | null>(null);

  // Extract network from path (e.g., /polkadot/profile/... -> polkadot)
  const networkFromPath = location.pathname.split('/')[1];
  const isNetworkSpecific = ['polkadot', 'kusama', 'paseo'].includes(networkFromPath);

  useEffect(() => {
    const getProfile = async () => {
      if (id && loadedIdRef.current !== id) {
        loadedIdRef.current = id;
        try {
          setLoading(true);
          const searchObj = constructSearcObject("id: " + id, FullDisplayedOutputs);
          const searchResults = await search(searchObj, limit).then((result) => result[0]);
          setProfile(searchResults);
        } catch (error) {
          console.error('Failed to parse profile data:', error);
          setProfile(null);
        } finally {
          setLoading(false);
        }
      }
    };

    getProfile();
  }, [id, search, isNetworkSpecific, networkFromPath]);

  if (loading) {
    return <div>Loading...</div>
  }

  if (!profile) {
    return <div>Profile not found</div>
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link to="/search" className="inline-flex items-center text-gray-400 hover:text-white mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Search
          </Link>
        </div>

        {/* Profile Card */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          {/* Cover/Header */}
          <div className="h-32 bg-gradient-to-r from-pink-500/20 to-purple-500/20"></div>

          {/* Profile Content */}
          <div className="px-6 pb-6">
            {/* Avatar and Basic Info */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:space-x-6 -mt-16 sm:-mt-12">
              <Avatar.Root className="w-16 h-16 rounded-full overflow-hidden">
                <Avatar.Image
                  src={profile.image}
                  alt={profile.display}
                  className="w-full h-full object-cover"
                />
                <Avatar.Fallback className="w-full h-full bg-muted flex items-center justify-center text-lg font-semibold">
                  {profile.display?.charAt(0)?.toUpperCase() || "?"}
                </Avatar.Fallback>
              </Avatar.Root>

              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center space-x-3 mb-2">
                      <h1 className="text-2xl font-bold text-white">{profile.display || "Anonymous"}</h1>
                      {profile.verified && (
                        <div className="w-6 h-6 bg-pink-400 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>

                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getNetworkColor(profile.network)}`}>
                      <Globe className="w-3 h-3 mr-1" />
                      {profile.network}
                    </div>
                  </div>

                </div>
              </div>
            </div>


            {/* Contact Information */}
            <div className="mt-8">
              <RegistredAccounts profile={profile} />

              {/* Timeline */}
              {profile.timeline && profile.timeline.length > 0 && (
                <div className="md:col-span-2 mt-8">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Verification Timeline</h3>
                  <div className="border-t border-gray-600"></div>
                  <VerificationTimeline timeline={profile.timeline} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
