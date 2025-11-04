import { useSearchContext } from "@/contexts/web-socket-provider"
import { constructSearcObject } from "@/lib/utils"
import { CheckCircle, AlertCircle, User, Edit, Copy, Check } from "lucide-react"
import { ProfileDetailsSection } from "@/components/ProfileDetailsSection"
import { Link, useParams, Navigate } from "react-router-dom"
import { useEffect, useState, useMemo } from 'react';
import { FullDisplayedOutputs } from "@/types/search_fields";
import * as Avatar from "@radix-ui/react-avatar"
import { useIdentity } from "@/hooks/useIdentity"
import { SS58String } from "polkadot-api"
import { decodeAddress, encodeAddress } from "@polkadot/util-crypto"
import { CHAINS, getPeopleChain as getEcosystemPeopleChain } from "@/polkadot-api/chain-config"
import { useAccount } from "@/contexts/wallet-context"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/page-header"
import { IdentityVerificationStatus } from "@/types/Identity"
import { RemailerDialog } from "@/components/dialogs/RemailerDialog"
import { RegistrationOrchestrator } from "@/components/registration/RegistrationOrchestrator"
import { PolkadotApiProvider } from "@/contexts/PolkadotApiContext"
import { useSnapshot } from "valtio"
import { identityDraftStore } from "@/store/IdentityDraftStore"
import { WalletConnectButton } from "@/components/wallet-connect-button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { usePolkadotWallet } from "@/contexts/PolkadotWalletContext"
import { ArrowUpRight } from "lucide-react"


const getPeopleChain = (ecosystem: string | undefined): string | null => {
  if (!ecosystem) return "paseo_people";
  // If it's already a people chain, return it
  if (ecosystem.includes("_people")) return ecosystem;
  // Otherwise map ecosystem to people chain
  return getEcosystemPeopleChain(ecosystem);
};

export default function ProfilePage() {
  const { search } = useSearchContext();
  const { address: connectedAddress } = useAccount();
  const { network: networkParam, address: addressParam } = useParams<{ network?: string; address: string }>();
  const { initializeWallets } = usePolkadotWallet();

  const [timeline, setTimeline] = useState<any[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [messageContactType, setMessageContactType] = useState<'email' | 'twitter' | 'matrix' | 'discord'>('email');
  const [isEditing, setIsEditing] = useState(false);

  // Subscribe to draft store for reactive display name
  const draftSnap = useSnapshot(identityDraftStore);

  // Handle case where network is missing - use address as the actual address and default to paseo
  const network = networkParam || 'paseo';
  const address = networkParam ? addressParam : networkParam;
  const peopleChain = getPeopleChain(network);

  // Use address directly without conversion - no need to convert since we're not redirecting
  const { identity, isLoading, error, isVerified } = useIdentity(
    address as SS58String | undefined,
    peopleChain
  );

  // Check if viewing own profile (compare public keys to handle different SS58 formats)
  const isOwnProfile = useMemo(() => {
    if (!connectedAddress || !address) {
      return false;
    }
    try {
      const connectedPubKey = decodeAddress(connectedAddress);
      const profilePubKey = decodeAddress(address);

      // Compare as hex strings instead of using Buffer
      const connectedHex = Array.from(connectedPubKey).map(b => b.toString(16).padStart(2, '0')).join('');
      const profileHex = Array.from(profilePubKey).map(b => b.toString(16).padStart(2, '0')).join('');

      return connectedHex === profileHex;
    } catch (error) {
      return false;
    }
  }, [connectedAddress, address]);

  // Auto-enable edit mode when user visits their own profile without identity
  useEffect(() => {
    if (isOwnProfile && !identity && !isLoading && !isEditing) {
      setIsEditing(true);
    }
  }, [isOwnProfile, identity, isLoading, isEditing]);

  // NOW we can do conditional rendering after ALL hooks are called
  // If visiting /profile without address, redirect to connected wallet or show welcome
  if (!address && !addressParam) {
    if (connectedAddress) {
      // Redirect to own profile
      return <Navigate to={`/profile/${network}/${connectedAddress}`} replace />;
    }

    // Show welcome screen for newcomers
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <PageHeader backTo="/" />

        <div className="container mx-auto px-4 py-16 max-w-2xl">
          <div className="text-center space-y-6 mb-12">
            <h1 className="text-3xl font-medium text-white">Create Your Identity</h1>
            <p className="text-gray-300 text-lg">
              Your on-chain identity is your digital passport across the ecosystem
            </p>
          </div>

          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-8 space-y-6">
            <div className="space-y-4">
              <h2 className="text-xl font-medium text-white">Getting Started</h2>
              <ol className="space-y-4 text-gray-300">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center text-sm font-medium">1</span>
                  <span>Connect your wallet</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center text-sm font-medium">2</span>
                  <span>Fill in your identity details (name, email, social handles)</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center text-sm font-medium">3</span>
                  <span>Verify your details to build trust</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center text-sm font-medium">4</span>
                  <span>Submit to the blockchain to make it permanent</span>
                </li>
              </ol>
            </div>

            <div className="pt-6 border-t border-gray-700 flex justify-center">
              <Button
                onClick={initializeWallets}
                className="bg-pink-500 hover:bg-pink-600 text-white px-8 py-6 text-lg font-medium"
              >
                Get Started
                <ArrowUpRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  console.log('[ProfilePage] Route params:', { networkParam, addressParam, network, address, peopleChain });
  console.log('[ProfilePage] Calling useIdentity with:', { address, peopleChain });
  console.log('[ProfilePage] useIdentity returned:', { identity, isLoading, error, isVerified });

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // If no identity exists, create a mock identity object for display
  // When editing, use draft display name if available
  const displayName = (isEditing && isOwnProfile && draftSnap.draft.display)
    ? draftSnap.draft.display
    : (identity?.display || "anon");

  // Show draft preview with reduced opacity when user is editing (not yet saved)
  const isDraftMode = isEditing && isOwnProfile && draftSnap.isDirty;

  // When own profile, always show draft data merged with identity (for live preview)
  // When viewing others, show their identity only
  const displayIdentity = isOwnProfile
    ? {
        display: draftSnap.draft.display || identity?.display || null,
        legal: draftSnap.draft.legal || identity?.legal || null,
        email: draftSnap.draft.email || identity?.email || null,
        web: draftSnap.draft.web || identity?.web || null,
        twitter: draftSnap.draft.twitter || identity?.twitter || null,
        matrix: draftSnap.draft.matrix || identity?.matrix || null,
        discord: draftSnap.draft.discord || identity?.discord || null,
        github: draftSnap.draft.github || identity?.github || null,
        image: draftSnap.draft.image || identity?.image || null,
        pgpFingerprint: draftSnap.draft.pgp_fingerprint || identity?.pgpFingerprint || null,
        judgements: identity?.judgements || [],
        status: identity?.status || IdentityVerificationStatus.NoIdentity
      }
    : {
        display: identity?.display || null,
        legal: identity?.legal || null,
        email: identity?.email || null,
        web: identity?.web || null,
        twitter: identity?.twitter || null,
        matrix: identity?.matrix || null,
        discord: identity?.discord || null,
        github: identity?.github || null,
        image: identity?.image || null,
        pgpFingerprint: identity?.pgpFingerprint || null,
        judgements: identity?.judgements || [],
        status: identity?.status || IdentityVerificationStatus.NoIdentity
      };

  // Don't auto-redirect - it causes infinite loop with RegisterRedirect
  // Instead, show a prompt to create identity with a button

  useEffect(() => {
    // Only fetch if there's an identity (no point fetching timeline if no identity exists)
    if (!identity || !address) return;

    const getTimeline = async () => {
      try {
        setTimelineLoading(true);
        const searchObj = constructSearcObject("id: " + address, FullDisplayedOutputs);
        const result = await search(searchObj, 1).then((result) => result[0]);
        setTimeline(result?.timeline || []);
      } catch (error) {
        console.error('failed to fetch timeline:', error);
        setTimeline([]);
      } finally {
        setTimelineLoading(false);
      }
    };

    getTimeline();
  }, [address, identity, search]);

  // Don't redirect - keep original address format in URL
  // This was causing unwanted address format conversions
  // if (shouldRedirect && chainSpecificAddress) {
  //   return <Navigate to={`/profile/${network}/${chainSpecificAddress}`} replace />;
  // }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900">
        <PageHeader backTo="/search" />
        <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 200px)' }}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
            <p className="text-gray-400 text-sm">Loading identity...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900">
        <PageHeader backTo="/search" />
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="py-12 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-lg font-medium text-white mb-2">Unable to Load Profile</h2>
            <p className="text-gray-400 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // For profiles without identity, we still show the profile view
  // If it's own profile, show edit mode inline

  return (
    <div className="min-h-screen bg-gray-900">
      <PageHeader
        backTo="/search"
        rightActions={
          isOwnProfile ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
            >
              <Edit className="w-4 h-4" />
            </Button>
          ) : connectedAddress ? (
            <Link to={`/profile/${network}/${connectedAddress}`}>
              <Button
                variant="ghost"
                size="sm"
                className="text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 transition-colors p-2"
                title="My Profile"
              >
                <User className="w-4 h-4" />
              </Button>
            </Link>
          ) : undefined
        }
      />
      <div className="container mx-auto px-4 py-8 max-w-4xl relative z-0">

        {/* Draft Mode Indicator */}
        {isDraftMode && (
          <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">Draft Preview - Changes not saved to blockchain</span>
            </div>
          </div>
        )}

        {/* Profile Header */}
        <div className={`mb-8 transition-opacity duration-200 ${isDraftMode ? 'opacity-70' : 'opacity-100'}`}>
          <div className="flex items-center gap-6 mb-6">
            <Avatar.Root className="w-20 h-20 rounded-full overflow-hidden bg-gray-800/50 border border-gray-700/50 flex-shrink-0">
              <Avatar.Image
                src={displayIdentity.image || undefined}
                alt={displayName}
                className="w-full h-full object-cover"
              />
              <Avatar.Fallback className="w-full h-full bg-gray-700 flex items-center justify-center text-2xl font-medium text-gray-300">
                {displayName.charAt(0).toUpperCase()}
              </Avatar.Fallback>
            </Avatar.Root>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-medium text-white">
                  {displayName}
                </h1>
                {isVerified && !isDraftMode && (
                  <span className="inline-flex items-center gap-1 text-xs text-green-400 bg-green-900/20 px-2 py-1 rounded border border-green-500/30">
                    <CheckCircle className="w-3 h-3" />
                    Verified
                  </span>
                )}
                {isDraftMode && isVerified && (
                  <span className="inline-flex items-center gap-1 text-xs text-yellow-400 bg-yellow-900/20 px-2 py-1 rounded border border-yellow-500/30">
                    <CheckCircle className="w-3 h-3" />
                    Verified (editing)
                  </span>
                )}
                {isDraftMode && !isVerified && (
                  <span className="text-xs text-yellow-400 bg-yellow-900/20 px-2 py-1 rounded border border-yellow-500/30">Draft</span>
                )}
                {!identity && isOwnProfile && !isDraftMode && (
                  <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">Not yet registered</span>
                )}
              </div>
              <div className="text-xs uppercase tracking-wide text-gray-500 mb-3">
                {network.replace('_people', '').replace('_', ' ')}
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Address</div>
                <div className="text-white font-mono text-sm break-all">{address}</div>
              </div>
              <button
                onClick={() => copyToClipboard(address, 'address')}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded transition-colors flex-shrink-0"
              >
                {copiedField === 'address' ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Profile Details Section - Show when identity exists or user is editing */}
        {/* Always show if identity exists (even with all fields empty) to display verification status */}
        {(identity || (isOwnProfile && isEditing)) && (
          <ProfileDetailsSection
            displayIdentity={displayIdentity}
            identity={identity}
            timeline={timeline}
            isDraftMode={isDraftMode}
            isOwnProfile={isOwnProfile}
            isVerified={isVerified}
            onMessageClick={(type) => {
              setMessageContactType(type);
              setIsMessageDialogOpen(true);
            }}
          />
        )}

        {/* Edit Form (when editing) - placed after profile details */}
        {isEditing && isOwnProfile && (
          <div className="pt-6 border-t border-gray-700/50 mb-6">
            <PolkadotApiProvider>
              <RegistrationOrchestrator
                walletAddress={address as SS58String}
                progressive={true}
                onComplete={() => {
                  setIsEditing(false)
                  window.location.reload()
                }}
              />
            </PolkadotApiProvider>
          </div>
        )}
      </div>

      <RemailerDialog
        open={isMessageDialogOpen}
        onOpenChange={setIsMessageDialogOpen}
        recipientAddress={address}
        recipientName={identity?.display || undefined}
        recipientEmail={identity?.email || undefined}
        recipientTwitter={identity?.twitter || undefined}
        recipientMatrix={identity?.matrix || undefined}
        recipientDiscord={identity?.discord || undefined}
        recipientPgpFingerprint={identity?.pgpFingerprint}
        recipientIsVerified={isVerified}
        network={network}
        contactType={messageContactType}
      />
    </div>
  )
}
