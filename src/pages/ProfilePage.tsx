import { CheckCircle, AlertCircle, User, Copy, Check, Eye, Pencil, Settings, Shield, Users } from "lucide-react"
import { ProfileContent } from "@/components/ProfileContent"
import { Link, useParams, Navigate } from "react-router-dom"
import { useState, useMemo, useCallback, useEffect } from 'react';
import * as Avatar from "@radix-ui/react-avatar"
import { useIdentity } from "@/hooks/useIdentity"
import { SS58String } from "polkadot-api"
import { decodeAddress, encodeAddress } from "@polkadot/util-crypto"
import { CHAINS, getPeopleChain as getEcosystemPeopleChain } from "@/polkadot-api/chain-config"
import { useAccount } from "@/contexts/wallet-context"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/page-header"
import { useChat } from "@/contexts/ChatContext"
import { useSnapshot } from "valtio"
import { identityDraftStore } from "@/store/IdentityDraftStore"
import { settingsStore, toggleTransactionModal } from "@/store/SettingsStore"
import { actingAsStore, setActingAs } from "@/store/ActingAsStore"
import { WalletConnectButton } from "@/components/wallet-connect-button"
import { ProfileSkeleton } from "@/components/ui/profile-skeleton"
import { TransactionProgressModal, TxStatus } from "@/components/dialogs/TransactionProgressModal"
import { ActingAsSelector } from "@/components/ActingAsSelector"

const getPeopleChain = (ecosystem: string | undefined): string | null => {
  if (!ecosystem) return "paseo_people";
  if (ecosystem.includes("_people")) return ecosystem;
  return getEcosystemPeopleChain(ecosystem);
};

export default function ProfilePage() {
  const { address: connectedAddress } = useAccount();
  const { network: networkParam, address: addressParam } = useParams<{ network?: string; address: string }>();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [txStatus, setTxStatus] = useState<TxStatus>("idle");
  const [txHash, setTxHash] = useState<string | undefined>();
  const [txError, setTxError] = useState<string | undefined>();
  const { openChat } = useChat();
  const draftSnap = useSnapshot(identityDraftStore);
  const settings = useSnapshot(settingsStore);
  const actingAs = useSnapshot(actingAsStore);

  const network = networkParam || 'paseo';
  const address = networkParam ? addressParam : networkParam;
  const peopleChain = getPeopleChain(network);

  // Initialize acting-as to connected address
  useEffect(() => {
    if (connectedAddress && !actingAs.targetAddress) {
      setActingAs(connectedAddress, false, false)
    }
  }, [connectedAddress, actingAs.targetAddress]);

  // The effective address we're managing (could be our own or acting-as)
  const effectiveAddress = actingAs.targetAddress || connectedAddress;

  const chainSpecificAddress = useMemo(() => {
    if (!address || !peopleChain) return address;
    try {
      const publicKey = decodeAddress(address);
      const chainConfig = CHAINS[peopleChain as keyof typeof CHAINS];
      if (!chainConfig) return address;
      return encodeAddress(publicKey, chainConfig.ss58Format);
    } catch {
      return address;
    }
  }, [address, peopleChain]);

  const { identity, isLoading, error, isVerified, refetch } = useIdentity(
    chainSpecificAddress as SS58String | undefined,
    peopleChain
  );

  // Check if this is a profile we can manage (our own OR one we're acting as)
  const isOwnProfile = useMemo(() => {
    if (!chainSpecificAddress) return false;

    const matchesAddress = (addr: SS58String | null) => {
      if (!addr) return false;
      try {
        const pubKey = decodeAddress(addr);
        const profilePubKey = decodeAddress(chainSpecificAddress);
        const addrHex = Array.from(pubKey).map(b => b.toString(16).padStart(2, '0')).join('');
        const profileHex = Array.from(profilePubKey).map(b => b.toString(16).padStart(2, '0')).join('');
        return addrHex === profileHex;
      } catch {
        return false;
      }
    };

    // Can manage if it's our connected address OR our acting-as address
    return matchesAddress(connectedAddress) || matchesAddress(effectiveAddress);
  }, [connectedAddress, effectiveAddress, chainSpecificAddress]);

  // Whether we're acting as this profile (proxy/multisig)
  const isActingAsMode = useMemo(() => {
    if (!effectiveAddress || !chainSpecificAddress) return false;
    if (effectiveAddress === connectedAddress) return false;
    try {
      const effectivePubKey = decodeAddress(effectiveAddress);
      const profilePubKey = decodeAddress(chainSpecificAddress);
      return Array.from(effectivePubKey).every((b, i) => b === profilePubKey[i]);
    } catch {
      return false;
    }
  }, [effectiveAddress, connectedAddress, chainSpecificAddress]);

  const copyToClipboard = useCallback((text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  }, []);

  const handleMessageClick = useCallback((type: 'email' | 'twitter' | 'matrix' | 'discord') => {
    openChat({
      recipientAddress: address!,
      recipientName: identity?.display || undefined,
      recipientEmail: identity?.email || undefined,
      recipientTwitter: identity?.twitter || undefined,
      recipientMatrix: identity?.matrix || undefined,
      recipientDiscord: identity?.discord || undefined,
      recipientPgpFingerprint: identity?.pgpFingerprint,
      recipientIsVerified: isVerified,
      network,
      contactType: type,
    });
  }, [address, identity, isVerified, network, openChat]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);

    // Show modal if enabled
    if (settings.showTransactionModal) {
      setTxModalOpen(true);
      setTxStatus("signing");
      setTxHash(undefined);
      setTxError(undefined);
    }

    try {
      // Simulate signing
      await new Promise(resolve => setTimeout(resolve, 1000));
      setTxStatus("broadcasting");

      // TODO: Implement actual blockchain submission
      // For now, simulate the flow
      await new Promise(resolve => setTimeout(resolve, 800));
      setTxStatus("confirming");

      // Simulate confirmation
      await new Promise(resolve => setTimeout(resolve, 1200));
      setTxHash("0x" + Math.random().toString(16).slice(2, 18) + "..."); // Fake hash for demo
      setTxStatus("success");

      refetch();
    } catch (err) {
      setTxStatus("error");
      setTxError(err instanceof Error ? err.message : "Transaction failed");
    } finally {
      setIsSaving(false);
    }
  }, [refetch, settings.showTransactionModal]);

  const displayIdentity = useMemo(() => {
    if (isOwnProfile) {
      return {
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
      };
    }
    return {
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
    };
  }, [isOwnProfile, draftSnap.draft, identity]);

  // Redirect to own profile if visiting /profile without address
  if (!address && !addressParam) {
    if (connectedAddress) {
      return <Navigate to={`/profile/${network}/${connectedAddress}`} replace />;
    }

    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <PageHeader backTo="/" />
        <div className="container mx-auto px-4 py-16 max-w-lg">
          <div className="text-center space-y-4 mb-8">
            <h1 className="text-2xl font-medium">Create Your Identity</h1>
            <p className="text-gray-400">Connect your wallet to get started</p>
          </div>
          <div className="flex justify-center">
            <WalletConnectButton showText={true} size="lg" />
          </div>
        </div>
      </div>
    );
  }

  const displayName = (isOwnProfile && draftSnap.draft.display)
    ? draftSnap.draft.display
    : (identity?.display || "Anonymous");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900">
        <PageHeader backTo="/search" />
        <ProfileSkeleton />
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

  return (
    <div className="min-h-screen bg-gray-900">
      <PageHeader
        backTo="/search"
        rightActions={
          <div className="flex items-center gap-1">
            {isOwnProfile && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreviewMode(!previewMode)}
                  className={`p-2 ${previewMode ? 'text-pink-400' : 'text-gray-400'} hover:text-white`}
                  title={previewMode ? "Edit mode" : "Preview as public"}
                >
                  {previewMode ? <Pencil className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleTransactionModal}
                  className={`p-2 ${settings.showTransactionModal ? 'text-pink-400' : 'text-gray-400'} hover:text-white`}
                  title={settings.showTransactionModal ? "Transaction modal: ON" : "Transaction modal: OFF"}
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </>
            )}
            {connectedAddress && !isOwnProfile && (
              <Link to={`/profile/${network}/${connectedAddress}`}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white p-2"
                  title="My Profile"
                >
                  <User className="w-4 h-4" />
                </Button>
              </Link>
            )}
          </div>
        }
      />

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Acting As Selector - shown when connected and viewing own profile */}
        {connectedAddress && isOwnProfile && !previewMode && (
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm text-gray-400">Managing identity for:</span>
            <ActingAsSelector
              chainId={peopleChain || undefined}
              selectedAddress={effectiveAddress}
              onSelect={(addr, isProxy, isMultisig) => {
                setActingAs(addr, isProxy, isMultisig)
              }}
            />
          </div>
        )}

        {/* Profile Header */}
        <div className="flex items-start gap-4 mb-6">
          <Avatar.Root className="w-16 h-16 rounded-full overflow-hidden bg-gray-800 border-2 border-gray-700 flex-shrink-0">
            <Avatar.Image
              src={displayIdentity.image || undefined}
              alt={displayName}
              className="w-full h-full object-cover"
            />
            <Avatar.Fallback className="w-full h-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-xl font-bold text-white">
              {displayName.charAt(0).toUpperCase()}
            </Avatar.Fallback>
          </Avatar.Root>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-semibold text-white truncate">{displayName}</h1>
              {isVerified && (
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
              )}
              {isOwnProfile && !previewMode && !isActingAsMode && (
                <span className="text-xs bg-pink-500/20 text-pink-300 px-2 py-0.5 rounded">You</span>
              )}
              {isActingAsMode && actingAs.isProxy && (
                <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Proxy
                </span>
              )}
              {isActingAsMode && actingAs.isMultisig && (
                <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded flex items-center gap-1">
                  <Users className="w-3 h-3" /> Multisig
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">
              {network.replace('_people', '').replace('_', ' ')}
            </div>
            <div className="flex items-center gap-2">
              <code className="text-xs text-gray-400 font-mono truncate">
                {address?.slice(0, 8)}...{address?.slice(-6)}
              </code>
              <button
                onClick={() => copyToClipboard(address!, 'address')}
                className="p-1 text-gray-500 hover:text-white transition-colors"
                title="Copy address"
              >
                {copiedField === 'address' ? (
                  <Check className="w-3 h-3 text-green-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Profile Content - Inline Editable */}
        <ProfileContent
          identity={displayIdentity}
          address={chainSpecificAddress as SS58String}
          network={network}
          peopleChain={peopleChain}
          isOwnProfile={isOwnProfile && !previewMode}
          isVerified={isVerified}
          onMessageClick={handleMessageClick}
          onSave={handleSave}
          isSaving={isSaving}
        />

        {/* Preview mode indicator */}
        {previewMode && (
          <div className="mt-4 p-3 bg-pink-500/10 border border-pink-500/20 rounded-lg text-center">
            <span className="text-pink-300 text-sm">
              <Eye className="w-4 h-4 inline mr-2" />
              Preview mode — This is how others see your profile
            </span>
          </div>
        )}
      </div>

      {/* Transaction Progress Modal */}
      <TransactionProgressModal
        open={txModalOpen}
        onClose={() => setTxModalOpen(false)}
        status={txStatus}
        txHash={txHash}
        error={txError}
        title="Save Identity"
        network={peopleChain || undefined}
      />
    </div>
  );
}
