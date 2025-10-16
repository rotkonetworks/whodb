import { useSearchContext } from "@/contexts/web-socket-provider"
import { constructSearcObject } from "@/lib/utils"
import { createSafeUrl } from "@/lib/validation"
import { ArrowLeft, Mail, CheckCircle, Globe, AlertCircle, User, MessageSquare, Key, Edit, WalletIcon, Github, Copy, Check, Send } from "lucide-react"
import VerificationTimeline from "@/components/verification-timeline"
import { Link, useParams, Navigate } from "react-router-dom"
import { useEffect, useState, useMemo } from 'react';
import { FullDisplayedOutputs } from "@/types/search_fields";
import * as Avatar from "@radix-ui/react-avatar"
import { useIdentity } from "@/hooks/useIdentity"
import { SS58String } from "polkadot-api"
import { decodeAddress, encodeAddress } from "@polkadot/util-crypto"
import { CHAINS } from "@/polkadot-api/chain-config"
import { useAccount } from "@/contexts/wallet-context"
import { Button } from "@/components/ui/button"
import { SimpleIdentityForm } from "@/components/simple-identity-form"
import { PageHeader } from "@/components/page-header"
import { IdentityVerificationStatus } from "@/types/Identity"
import { RemailerDialog } from "@/components/dialogs/RemailerDialog"


const getPeopleChain = (network: string | undefined): string => {
  if (!network) return "polkadot_people";
  if (network.includes("_people")) return network;
  return `${network}_people`;
};

export default function ProfilePage() {
  const { search } = useSearchContext();
  const { address: connectedAddress } = useAccount();
  const { network: networkParam, address: addressParam } = useParams<{ network?: string; address: string }>();
  const [timeline, setTimeline] = useState<any[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [messageContactType, setMessageContactType] = useState<'email' | 'twitter' | 'matrix' | 'discord'>('email');

  // Handle case where network is missing - use address as the actual address and default to paseo
  const network = networkParam || 'paseo';
  const address = networkParam ? addressParam : networkParam;

  const peopleChain = getPeopleChain(network);

  // Convert address to chain-specific format and redirect if needed
  const { chainSpecificAddress, shouldRedirect } = useMemo(() => {
    if (!address || !peopleChain) return { chainSpecificAddress: address, shouldRedirect: false };

    try {
      const publicKey = decodeAddress(address);
      const chainConfig = CHAINS[peopleChain as keyof typeof CHAINS];
      if (!chainConfig) return { chainSpecificAddress: address, shouldRedirect: false };
      const converted = encodeAddress(publicKey, chainConfig.ss58Format);
      return {
        chainSpecificAddress: converted,
        shouldRedirect: converted !== address
      };
    } catch (error) {
      console.error("Failed to convert address format:", error);
      return { chainSpecificAddress: address, shouldRedirect: false };
    }
  }, [address, peopleChain]);

  const { identity, isLoading, error, isVerified } = useIdentity(
    chainSpecificAddress as SS58String | undefined,
    peopleChain
  );

  // Check if viewing own profile (compare public keys to handle different SS58 formats)
  const isOwnProfile = useMemo(() => {
    if (!connectedAddress || !chainSpecificAddress) return false;
    try {
      const connectedPubKey = decodeAddress(connectedAddress);
      const profilePubKey = decodeAddress(chainSpecificAddress);
      return Buffer.from(connectedPubKey).equals(Buffer.from(profilePubKey));
    } catch {
      return false;
    }
  }, [connectedAddress, chainSpecificAddress]);

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  useEffect(() => {
    const getTimeline = async () => {
      if (!chainSpecificAddress) return;

      try {
        setTimelineLoading(true);
        const searchObj = constructSearcObject("id: " + chainSpecificAddress, FullDisplayedOutputs);
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
  }, [chainSpecificAddress, search]);

  // Redirect to canonical address format if needed
  if (shouldRedirect && chainSpecificAddress) {
    return <Navigate to={`/profile/${network}/${chainSpecificAddress}`} replace />;
  }

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

  // Show edit form if in edit mode and it's the user's own profile
  if (isEditing && isOwnProfile) {
    const initialData = {
      display: identity?.info?.display || "",
      legal: identity?.info?.legal || "",
      email: identity?.info?.email || "",
      web: identity?.info?.web || "",
      twitter: identity?.info?.twitter || "",
      riot: identity?.info?.riot || "",
      image: identity?.info?.image || "",
      pgpFingerprint: identity?.info?.pgpFingerprint || "",
    };

    const handleSubmit = (data: any) => {
      console.log("Form submitted:", data);
      // TODO: Implement actual submission logic here
      // This will be handled by the transaction logic from RegisterPage
    };

    const handleDataChange = (data: any) => {
      setFormData(data);
    };

    return (
      <div className="min-h-screen bg-gray-900">
        <PageHeader
          backTo={identity ? `/profile/${network}/${chainSpecificAddress}` : "/"}
          title={identity ? "Update Identity" : "Create Identity"}
        />
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <SimpleIdentityForm
            initialData={initialData}
            onSubmit={handleSubmit}
            isEditMode={!!identity}
            onDataChange={handleDataChange}
            supportedFields={["display", "legal", "email", "web", "twitter", "riot", "image", "pgpFingerprint"]}
            identityStatus={identity?.status}
          />
        </div>
      </div>
    );
  }

  if (!identity) {
    // If viewing own profile without identity, show edit form automatically
    if (isOwnProfile) {
      const initialData = {
        display: "",
        legal: "",
        email: "",
        web: "",
        twitter: "",
        riot: "",
        image: "",
        pgpFingerprint: "",
      };

      const handleSubmit = (data: any) => {
        console.log("Form submitted:", data);
        // TODO: Implement actual submission logic here
      };

      const handleDataChange = (data: any) => {
        setFormData(data);
      };

      return (
        <div className="min-h-screen bg-gray-900">
          <PageHeader backTo="/search" title="Create Identity" />
          <div className="container mx-auto px-4 py-8 max-w-2xl">
            <SimpleIdentityForm
              initialData={initialData}
              onSubmit={handleSubmit}
              isEditMode={false}
              onDataChange={handleDataChange}
              supportedFields={["display", "legal", "email", "web", "twitter", "riot", "image", "pgpFingerprint"]}
              identityStatus={IdentityVerificationStatus.NoIdentity}
            />
          </div>
        </div>
      );
    }

    // Viewing someone else's profile without identity
    return (
      <div className="min-h-screen bg-gray-900">
        <PageHeader backTo="/search" />
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
            <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">No Identity Found</h2>
            <p className="text-gray-400 mb-4">This address doesn't have an on-chain identity yet</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <PageHeader
        backTo="/search"
        rightActions={
          isOwnProfile ? (
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={() => setIsEditing(true)}
            >
              <Edit className="w-4 h-4" />
              {identity ? "Edit Profile" : "Create Profile"}
            </Button>
          ) : undefined
        }
      />
      <div className="container mx-auto px-4 py-8 max-w-4xl relative z-0">

        {/* Profile Header */}
        <div className="mb-8">
          <div className="flex items-center gap-6 mb-6">
            <Avatar.Root className="w-20 h-20 rounded-full overflow-hidden bg-gray-800/50 border border-gray-700/50 flex-shrink-0">
              <Avatar.Image
                src={identity.image || undefined}
                alt={identity.display || "profile"}
                className="w-full h-full object-cover"
              />
              <Avatar.Fallback className="w-full h-full bg-gray-700 flex items-center justify-center text-2xl font-medium text-gray-300">
                {identity.display?.charAt(0)?.toUpperCase() || "?"}
              </Avatar.Fallback>
            </Avatar.Root>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-medium text-white">{identity.display || "Anonymous"}</h1>
                {isVerified && (
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
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

        {/* Profile Details */}
        <div className="space-y-6 pt-6 border-t border-gray-700/50">
          {identity.legal && (
            <div className="flex items-start gap-4">
              <User className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Legal Name</div>
                <div className="text-white">{identity.legal}</div>
              </div>
            </div>
          )}

          {identity.email && (
            <div className="flex items-center gap-4">
              <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Email</div>
                <div className="text-white break-all">{identity.email}</div>
              </div>
              {!isOwnProfile && (
                <button
                  onClick={() => {
                    setMessageContactType('email');
                    setIsMessageDialogOpen(true);
                  }}
                  className="p-2 text-pink-400 hover:text-pink-300 hover:bg-gray-700/50 rounded transition-colors flex-shrink-0"
                  title="Send message via remailer"
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => copyToClipboard(identity.email!, 'email')}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded transition-colors flex-shrink-0"
              >
                {copiedField === 'email' ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          )}

          {identity.web && (() => {
            const safeUrl = createSafeUrl(identity.web, 'website')
            return safeUrl ? (
              <div className="flex items-center gap-4">
                <Globe className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Website</div>
                  <a
                    href={safeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white hover:text-gray-300 break-all"
                  >
                    {identity.web}
                  </a>
                </div>
                <button
                  onClick={() => copyToClipboard(identity.web!, 'web')}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded transition-colors flex-shrink-0"
                >
                  {copiedField === 'web' ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            ) : null
          })()}

          {identity.twitter && (() => {
            const safeUrl = createSafeUrl(identity.twitter, 'twitter')
            return safeUrl ? (
              <div className="flex items-center gap-4">
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                <div className="flex-1 min-w-0">
                  <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Twitter</div>
                  <a
                    href={safeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white hover:text-gray-300"
                  >
                    {identity.twitter}
                  </a>
                </div>
                {!isOwnProfile && (
                  <button
                    onClick={() => {
                      setMessageContactType('twitter');
                      setIsMessageDialogOpen(true);
                    }}
                    className="p-2 text-pink-400 hover:text-pink-300 hover:bg-gray-700/50 rounded transition-colors flex-shrink-0"
                    title="Send DM via remailer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => copyToClipboard(identity.twitter!, 'twitter')}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded transition-colors flex-shrink-0"
                >
                  {copiedField === 'twitter' ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            ) : null
          })()}

          {identity.matrix && (
            <div className="flex items-center gap-4">
              <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Matrix</div>
                <div className="text-white font-mono text-sm break-all">{identity.matrix}</div>
              </div>
              {!isOwnProfile && (
                <button
                  onClick={() => {
                    setMessageContactType('matrix');
                    setIsMessageDialogOpen(true);
                  }}
                  className="p-2 text-pink-400 hover:text-pink-300 hover:bg-gray-700/50 rounded transition-colors flex-shrink-0"
                  title="Send message via remailer"
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => copyToClipboard(identity.matrix!, 'matrix')}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded transition-colors flex-shrink-0"
              >
                {copiedField === 'matrix' ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          )}

          {identity.github && (
            <div className="flex items-center gap-4">
              <Github className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">GitHub</div>
                <a
                  href={`https://github.com/${identity.github}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white hover:text-gray-300"
                >
                  {identity.github}
                </a>
              </div>
              <button
                onClick={() => copyToClipboard(identity.github!, 'github')}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded transition-colors flex-shrink-0"
              >
                {copiedField === 'github' ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          )}

          {identity.discord && (
            <div className="flex items-center gap-4">
              <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Discord</div>
                <div className="text-white font-mono text-sm break-all">{identity.discord}</div>
              </div>
              {!isOwnProfile && (
                <button
                  onClick={() => {
                    setMessageContactType('discord');
                    setIsMessageDialogOpen(true);
                  }}
                  className="p-2 text-pink-400 hover:text-pink-300 hover:bg-gray-700/50 rounded transition-colors flex-shrink-0"
                  title="Send DM via remailer"
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => copyToClipboard(identity.discord!, 'discord')}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded transition-colors flex-shrink-0"
              >
                {copiedField === 'discord' ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          )}

          {identity.pgpFingerprint && (
            <div className="flex items-center gap-4">
              <Key className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">PGP Fingerprint</div>
                <div className="text-white font-mono text-sm break-all">{identity.pgpFingerprint}</div>
              </div>
              <button
                onClick={() => copyToClipboard(identity.pgpFingerprint!, 'pgpFingerprint')}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded transition-colors flex-shrink-0"
              >
                {copiedField === 'pgpFingerprint' ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          )}

          {(identity.judgements && identity.judgements.length > 0) || (timeline && timeline.length > 0) ? (
            <div className="pt-6 mt-6 border-t border-gray-700/50">
              <div className="text-xs uppercase tracking-wide text-gray-500 mb-4">Verification</div>

              {identity.judgements && identity.judgements.length > 0 && (
                <div className="space-y-3 mb-6">
                  {identity.judgements.map((judgement, idx) => (
                    <div key={idx} className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white text-sm font-medium">Registrar #{judgement.registrarIndex}</span>
                        <span className={`text-xs px-2 py-1 rounded font-medium ${
                          judgement.judgement === "Reasonable" || judgement.judgement === "KnownGood"
                            ? "bg-green-400/10 text-green-400"
                            : "bg-yellow-400/10 text-yellow-400"
                        }`}>
                          {judgement.judgement}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {timeline && timeline.length > 0 && (
                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-500 mb-4">Timeline</div>
                  <VerificationTimeline timeline={timeline} />
                </div>
              )}
            </div>
          ) : null}
        </div>
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
