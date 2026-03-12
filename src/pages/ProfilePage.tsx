import { CheckCircle, AlertCircle, User, Copy, Check, Eye, Pencil, Settings, Shield, Users } from "lucide-react"
import { ProfileContent } from "@/components/ProfileContent"
import { Link, useParams, Navigate, useNavigate } from "react-router-dom"
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import * as Avatar from "@radix-ui/react-avatar"
import { useIdentity } from "@/hooks/useIdentity"
import { SS58String } from "polkadot-api"
import { decodeAddress, encodeAddress } from "@polkadot/util-crypto"
import { CHAINS, getPeopleChain as getEcosystemPeopleChain } from "@/polkadot-api/chain-config"
import { useAccount } from "@/contexts/wallet-context"
import { usePolkadotApi } from "@/contexts/PolkadotApiContext"
import { useVerification } from "@/contexts/verification-context"
import { IdentityVerificationStatus } from "@/types/Identity"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/page-header"
import { useChat } from "@/contexts/ChatContext"
import { useSnapshot, snapshot } from "valtio"
import { identityDraftStore, markDraftSaved } from "@/store/IdentityDraftStore"
import { toast } from "sonner"
import { logger } from "@/utils/logger"
import { settingsStore, toggleTransactionModal } from "@/store/SettingsStore"
import { actingAsStore, setActingAs } from "@/store/ActingAsStore"

// Cache for decoded address public keys
type AddressCache = { address: string; hex: string } | null
import { WalletConnectButton } from "@/components/wallet-connect-button"
import { ProfileSkeleton } from "@/components/ui/profile-skeleton"
import { TransactionProgressModal, TxStatus } from "@/components/dialogs/TransactionProgressModal"
import { ActingAsSelector } from "@/components/ActingAsSelector"
import { getTransactionType } from "@/utils/proxyWrapper"
import { fromHexString } from "@/utils/binary"
import { PendingMultisigCalls } from "@/components/PendingMultisigCalls"

const getPeopleChain = (ecosystem: string | undefined): string | null => {
  if (!ecosystem) return "paseo_people";
  if (ecosystem.includes("_people")) return ecosystem;
  return getEcosystemPeopleChain(ecosystem);
};

export default function ProfilePage() {
  const { address: connectedAddress } = useAccount();
  const { typedApi, signSubmitAndWatch, chainStore } = usePolkadotApi();
  const { network: networkParam, address: addressParam } = useParams<{ network?: string; address: string }>();
  const navigate = useNavigate();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [txStatus, setTxStatus] = useState<TxStatus>("idle");
  const [txHash, setTxHash] = useState<string | undefined>();
  const [txError, setTxError] = useState<string | undefined>();
  const { openChat } = useChat();
  const draftSnap = useSnapshot(identityDraftStore);
  // Only subscribe to actingAs - read settingsStore directly in callbacks
  const actingAs = useSnapshot(actingAsStore);
  // Minimal subscription for UI toggle state only
  const showTxModal = useSnapshot(settingsStore).showTransactionModal;
  const { setWebSocketParams } = useVerification();

  // Cache address hex conversions to avoid recalculating
  const addressCacheRef = useRef<{
    connected: AddressCache;
    effective: AddressCache;
    profile: AddressCache;
  }>({ connected: null, effective: null, profile: null });

  const network = networkParam || 'paseo';
  const address = addressParam || connectedAddress;
  const peopleChain = getPeopleChain(network);

  // Initialize acting-as to connected address
  useEffect(() => {
    if (connectedAddress && !actingAs.targetAddress) {
      setActingAs(connectedAddress, false, false)
    }
  }, [connectedAddress, actingAs.targetAddress]);

  // The effective address we're managing (could be our own or acting-as)
  const effectiveAddress = actingAs.targetAddress || connectedAddress;

  // Convert address to chain-specific format for on-chain queries
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

  // Redirect to canonical URL if address format doesn't match chain-specific format
  useEffect(() => {
    if (addressParam && chainSpecificAddress && addressParam !== chainSpecificAddress) {
      navigate(`/${network}/profile/${chainSpecificAddress}`, { replace: true });
    }
  }, [addressParam, chainSpecificAddress, network, navigate]);

  const { identity, isLoading, error, isVerified, refetch } = useIdentity(
    chainSpecificAddress as SS58String | undefined,
    peopleChain
  );

  // Helper to get cached hex for an address
  const getAddressHex = useCallback((addr: SS58String | null, cacheKey: 'connected' | 'effective' | 'profile'): string | null => {
    if (!addr) return null;
    const cache = addressCacheRef.current[cacheKey];
    if (cache && cache.address === addr) return cache.hex;
    try {
      const pubKey = decodeAddress(addr);
      const hex = Array.from(pubKey).map(b => b.toString(16).padStart(2, '0')).join('');
      addressCacheRef.current[cacheKey] = { address: addr, hex };
      return hex;
    } catch {
      return null;
    }
  }, []);

  // Check if this is a profile we can manage (our own OR one we're acting as)
  const isOwnProfile = useMemo((): boolean => {
    if (!chainSpecificAddress) return false;

    const profileHex = getAddressHex(chainSpecificAddress as SS58String, 'profile');
    if (!profileHex) return false;

    const connectedHex = getAddressHex(connectedAddress, 'connected');
    const effectiveHex = getAddressHex(effectiveAddress as SS58String, 'effective');

    // Can manage if it's our connected address OR our acting-as address
    const matchesConnected = connectedHex !== null && connectedHex === profileHex;
    const matchesEffective = effectiveHex !== null && effectiveHex === profileHex;
    return matchesConnected || matchesEffective;
  }, [connectedAddress, effectiveAddress, chainSpecificAddress, getAddressHex]);

  // Whether we're acting as this profile (proxy/multisig)
  const isActingAsMode = useMemo(() => {
    if (!effectiveAddress || !chainSpecificAddress) return false;
    if (effectiveAddress === connectedAddress) return false;

    const effectiveHex = getAddressHex(effectiveAddress as SS58String, 'effective');
    const profileHex = getAddressHex(chainSpecificAddress as SS58String, 'profile');

    return effectiveHex !== null && effectiveHex === profileHex;
  }, [effectiveAddress, connectedAddress, chainSpecificAddress, getAddressHex]);

  // Set up WebSocket params for verification when viewing own profile
  // Only run when address/network changes, not on identity changes (to avoid clearing challenges)
  const wsParamsSetRef = useRef<string | null>(null);
  useEffect(() => {
    if (isOwnProfile && chainSpecificAddress && peopleChain) {
      const paramsKey = `${chainSpecificAddress}-${peopleChain}`;

      // Only set params if they've changed
      if (wsParamsSetRef.current !== paramsKey) {
        wsParamsSetRef.current = paramsKey;

        // Determine identity status based on judgements
        let identityStatus = IdentityVerificationStatus.Unknown;
        if (identity?.judgements?.length) {
          const hasVerified = identity.judgements.some(j =>
            ["Reasonable", "KnownGood"].includes(j.judgement)
          );
          const hasPending = identity.judgements.some(j => j.judgement === "FeePaid");
          if (hasVerified) {
            identityStatus = IdentityVerificationStatus.IdentityVerified;
          } else if (hasPending) {
            identityStatus = IdentityVerificationStatus.PendingJudgement;
          }
        }

        setWebSocketParams({
          address: chainSpecificAddress as SS58String,
          network: peopleChain,
          identityStatus,
        });
      }
    }
  }, [isOwnProfile, chainSpecificAddress, peopleChain, identity?.judgements, setWebSocketParams]);

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
    if (!typedApi || !connectedAddress) {
      toast.error("Wallet not connected or API not ready");
      return;
    }

    setIsSaving(true);

    // Read directly from store to avoid re-render subscription
    const showModal = snapshot(settingsStore).showTransactionModal;
    const draft = snapshot(identityDraftStore).draft;

    // Show modal if enabled
    if (showModal) {
      setTxModalOpen(true);
      setTxStatus("signing");
      setTxHash(undefined);
      setTxError(undefined);
    }

    try {
      logger.log("🚀 Starting identity submission", { draft });

      // Build identity info object for the chain
      const info: any = {
        display: { none: undefined },
        legal: { none: undefined },
        web: { none: undefined },
        matrix: { none: undefined },
        email: { none: undefined },
        image: { none: undefined },
        twitter: { none: undefined },
        github: { none: undefined },
        discord: { none: undefined },
      };

      // Populate fields that have values
      Object.entries(draft)
        .filter(([key, value]) => value && value.trim() !== "" && key !== "pgp_fingerprint")
        .forEach(([key, value]) => {
          info[key] = { raw: value.trim() };
        });

      // Handle PGP fingerprint specially (same format as RegisterPage)
      if (draft.pgp_fingerprint && draft.pgp_fingerprint.trim() !== "") {
        const formattedPgpFingerprint = draft.pgp_fingerprint.startsWith('0x')
          ? draft.pgp_fingerprint.slice(2)
          : draft.pgp_fingerprint;
        // 14_16 = 20 bytes prefix needed by PAPI
        info.pgp_fingerprint = fromHexString(`14${formattedPgpFingerprint}`);
      }

      const transactions = [];

      // Clear identity first if sticky judgement exists
      const hasStickyJudgement = identity?.judgements?.some(j =>
        ["Reasonable", "KnownGood"].includes(j.judgement)
      );

      if (hasStickyJudgement) {
        transactions.push(typedApi.tx.identity.clearIdentity());
      } else {
        // Cancel pending request if exists
        const hasPendingJudgement = identity?.judgements?.some(j => j.judgement === "FeePaid");
        if (hasPendingJudgement) {
          const registrarIndex = Number(import.meta.env[
            `VITE_APP_REGISTRAR_INDEX__PEOPLE_${chainStore.relay?.id?.toUpperCase()}`
          ]);
          if (!isNaN(registrarIndex)) {
            logger.log("Cancelling previous judgement request");
            transactions.push(typedApi.tx.identity.cancelRequest(registrarIndex));
          }
        }
      }

      // Add setIdentity transaction
      transactions.push(typedApi.tx.identity.setIdentity(info));

      // Add requestJudgement transaction
      const networkId = chainStore.relay?.id?.toUpperCase();
      const registrarIndex = Number(import.meta.env[`VITE_APP_REGISTRAR_INDEX__PEOPLE_${networkId}`]);

      if (!isNaN(registrarIndex)) {
        // Get registrar fee from chain
        const registrars = await typedApi.query.identity.registrars();
        const registrarArray = Array.isArray(registrars) ? registrars : [];

        if (registrarArray[registrarIndex]?.value?.fee) {
          const registrarFee = BigInt(registrarArray[registrarIndex].value.fee);
          transactions.push(typedApi.tx.identity.requestJudgement(registrarIndex, registrarFee));
          logger.log("Adding requestJudgement with fee:", registrarFee.toString());
        }
      }

      // Execute batch or single transaction
      const batchTx = transactions.length > 1
        ? typedApi.tx.utility.batchAll(transactions)
        : transactions[0];

      logger.log("📝 Submitting batch transaction with", transactions.length, "operations");
      setTxStatus("broadcasting");

      const result = await signSubmitAndWatch({
        call: batchTx,
        name: transactions.length > 1 ? "Update Identity (Multi-step)" : "Set Identity"
      });

      setTxStatus("confirming");

      if (result.txHash) {
        setTxHash(result.txHash);
      }

      setTxStatus("success");
      toast.success("Identity saved to chain!");
      markDraftSaved();
      refetch();
    } catch (err) {
      logger.error("❌ Identity submission error:", err);
      setTxStatus("error");
      setTxError(err instanceof Error ? err.message : "Transaction failed");

      if (err instanceof Error && !err.message.includes("Cancelled")) {
        toast.error(err.message || "Failed to save identity");
      }
    } finally {
      setIsSaving(false);
    }
  }, [typedApi, connectedAddress, signSubmitAndWatch, chainStore, identity, refetch]);

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

  // Get transaction type for display
  const txType = useMemo(() => getTransactionType(), [actingAs]);

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
                  className={`p-2 ${showTxModal ? 'text-pink-400' : 'text-gray-400'} hover:text-white`}
                  title={showTxModal ? "Transaction modal: ON" : "Transaction modal: OFF"}
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
          <div className="mb-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Managing identity for:</span>
              <ActingAsSelector
                chainId={peopleChain || undefined}
                selectedAddress={effectiveAddress}
                onSelect={(addr, isProxy, isMultisig, options) => {
                  setActingAs(addr, isProxy, isMultisig, options)
                }}
              />
            </div>
            {txType.type !== 'direct' && (
              <div className={`text-xs px-3 py-1.5 rounded-md ${
                txType.type === 'proxy'
                  ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                  : 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
              }`}>
                {txType.type === 'multisig' && (
                  <span>Transactions will require {actingAs.multisigThreshold} of {actingAs.multisigSignatories?.length} signatures</span>
                )}
                {txType.type === 'proxy' && (
                  <span>Transactions will be sent via {actingAs.proxyType || 'Any'} proxy</span>
                )}
              </div>
            )}
            {/* Pending multisig calls */}
            {txType.type === 'multisig' && actingAs.targetAddress && actingAs.multisigSignatories && (
              <PendingMultisigCalls
                multisigAddress={actingAs.targetAddress}
                signatories={[...actingAs.multisigSignatories]}
                threshold={actingAs.multisigThreshold || 2}
                chainId={peopleChain || undefined}
              />
            )}
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
        {/* Pass raw identity (not displayIdentity) so ProfileContent can initialize draft correctly */}
        <ProfileContent
          identity={identity}
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
