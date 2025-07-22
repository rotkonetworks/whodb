import { useState } from "react"
import { Copy, Share2, Edit3, Users, ListChecks, Contact } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/page-header"
import { ContactInformation } from "@/components/contact-information"
import { AccountHierarchy } from "@/components/account-hierarchy"
import { VerificationTimeline } from "@/components/verification-timeline"
import { getVerificationBadge } from "@/components/verification-badge"
import { shortenAddress } from "@/utils/format-address"
import type { Profile } from "@/lib/profile"
import { toast } from "sonner"

type ProfileTab = "contact" | "timeline"

// Mock data adapted to the Profile interface
const mockProfile: Profile = {
  id: "alice",
  displayName: "alice",
  nickname: "alice.dot",
  walletAddress: "13KVFr...HGKutQY",
  email: "alice@example.org",
  web: "https://alice.dev",
  twitter: "@alicewonder",
  discord: "alice#1234",
  matrix: "@alice:matrix.org",
  github: "alicewonder",
  verified: true,
  judgement: "KnownGood",
  legal: "Alice Carol Wonder",
  avatar: "/professional-woman-avatar.png",
  subaccounts: [
    {
      id: "alice-staking",
      displayName: "alice/gaming",
      nickname: "12abc...JKLm",
      walletAddress: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
      verified: false,
      judgement: "None"
    },
    {
      id: "alice-treasury",
      displayName: "alice/dev",
      nickname: "13bcD...1MnOp",
      walletAddress: "5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy",
      verified: false,
      judgement: "None"
    }
  ]
}

export default function ProfilePage() {
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
    { id: "timeline" as ProfileTab, label: "Timeline", icon: ListChecks },
  ]

  return (
    <div className="bg-gray-900 min-h-screen text-white">
      <PageHeader backTo="/search"
        rightActions={
          <div className="flex items-center space-x-2 md:space-x-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-pink-400 border border-pink-400 hover:bg-pink-500/10 hover:text-pink-300 p-2 md:px-3"
              onClick={() =>
                copyToClipboard(
                  `${window.location.origin}/profile/${mockProfile.id}`,
                  "Profile link",
                )
              }
            >
              <Share2 className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline text-sm">{copiedField === "Profile link" ? "Copied!" : "Share"}</span>
            </Button>
            <Button
              size="sm"
              className="bg-pink-500 hover:bg-pink-600 text-white p-2 md:px-3"
            >
              <Edit3 className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline text-sm">Edit Profile</span>
            </Button>
          </div>
        }
      />

      <div className="container mx-auto p-3 sm:p-4 md:p-6">
        <div className="space-y-4 md:space-y-6">
          {/* Profile Header Section */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 sm:p-4 shadow-md">
            <div className="flex items-start space-x-3 sm:space-x-4">
              <div
                className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 border-pink-500/50 flex-shrink-0 bg-gray-700 flex items-center justify-center"
                style={{ backgroundImage: `url(${mockProfile.avatar || "/placeholder.svg"})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
              >
                {!mockProfile.avatar && (
                  <span className="text-white font-bold text-lg">
                    {mockProfile.displayName.substring(0, 1).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-grow min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <h1 className="text-lg sm:text-xl font-bold text-white truncate" title={mockProfile.displayName}>
                    {mockProfile.displayName}
                  </h1>
                  <div className="mt-1 sm:mt-0 flex-shrink-0">
                    {getVerificationBadge(mockProfile.verified, mockProfile.judgement)}
                  </div>
                </div>
                <div className="flex items-center text-xs text-gray-400 mt-0.5">
                  <span className="font-mono truncate" title={mockProfile.walletAddress}>
                    {shortenAddress(mockProfile.walletAddress, 6, 6)}
                  </span>
                  <div
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && copyToClipboard(mockProfile.walletAddress, "Wallet address")}
                    onMouseDown={() => copyToClipboard(mockProfile.walletAddress, "Wallet address")}
                    className="ml-1.5 text-gray-500 hover:text-pink-400 transition-colors flex-shrink-0 cursor-pointer"
                    title="Copy wallet address"
                  >
                    <Copy className="w-3 h-3" />
                  </div>
                </div>
                {mockProfile.nickname && (
                  <div className="flex items-center text-xs text-pink-400 mt-1 bg-gray-700/50 px-1.5 py-0.5 rounded-full self-start w-fit">
                    <span className="truncate" title={mockProfile.nickname}>
                      {mockProfile.nickname}
                    </span>
                    <span className="text-gray-500 text-xs ml-0.5 hidden sm:inline">.alt</span>
                    <div
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && copyToClipboard(mockProfile.nickname!, "Nickname")}
                      onMouseDown={() => copyToClipboard(mockProfile.nickname!, "Nickname")}
                      className="ml-1.5 text-gray-500 hover:text-white transition-colors flex-shrink-0 cursor-pointer"
                      title="Copy nickname"
                    >
                      <Copy className="w-3 h-3" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="mt-4 md:mt-5 mb-3 md:mb-4">
            <div className="border-b border-gray-700">
              <nav
                className="flex flex-wrap sm:flex-nowrap -mb-px space-x-px sm:space-x-1"
                aria-label="Profile sections"
              >
                {tabItems.map((tab) => (
                  <div
                    key={tab.id}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && setActiveTab(tab.id)}
                    onMouseDown={() => setActiveTab(tab.id)}
                    className={`flex items-center justify-center whitespace-nowrap px-2 py-2 sm:px-3 sm:py-2.5 font-medium text-xs sm:text-sm rounded-t-md transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-pink-500 focus-visible:ring-offset-1 focus-visible:ring-offset-gray-900 cursor-pointer
                      ${activeTab === tab.id
                        ? "text-pink-400 border-b-2 border-pink-500 bg-gray-800/40"
                        : "text-gray-400 hover:text-white hover:bg-gray-700/40"
                      }`
                    }
                    aria-current={activeTab === tab.id ? "page" : undefined}
                    title={tab.label}
                  >
                    <tab.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 sm:mr-1.5" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </div>
                ))}
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          <div className="min-h-[200px] py-2 space-y-6">
            {activeTab === "contact" && (
              <>
                <ContactInformation profile={mockProfile} />
                <div>
                  <h2 className="text-lg font-semibold text-white mb-3 mt-6 flex items-center">
                    <Users className="w-5 h-5 mr-2 text-pink-400" />
                    Subidentities
                  </h2>
                  <AccountHierarchy profile={mockProfile} isOwnProfile={true} />
                </div>
              </>
            )}
            {activeTab === "timeline" && <VerificationTimeline profile={mockProfile} />}
          </div>
        </div>
      </div>
    </div>
  )
}
