import { useState, useEffect, useMemo } from "react";
import { SS58String } from "polkadot-api";
import { logger } from "@/utils/logger";

export interface OnChainIdentity {
  display: string | null;
  legal: string | null;
  web: string | null;
  matrix: string | null;
  email: string | null;
  twitter: string | null;
  github: string | null;
  discord: string | null;
  image: string | null;
  pgpFingerprint: string | null;
  judgements: Array<{
    registrarIndex: number;
    judgement: string;
  }>;
}

export interface IdentityState {
  identity: OnChainIdentity | null;
  isLoading: boolean;
  error: string | null;
  isVerified: boolean;
}

export const useIdentity = (
  address: SS58String | undefined,
  chainId: string
): IdentityState => {
  const [identity, setIdentity] = useState<OnChainIdentity | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address || !chainId) {
      setIdentity(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    const fetchOnChainIdentity = async () => {
      try {
        const { getPapiClient } = await import("@/lib/papi-client");
        const client = await getPapiClient(chainId, false);

        const descriptors = await import("@polkadot-api/descriptors");
        const typedApi = client.getTypedApi(descriptors[chainId]);

        const identityData = await typedApi.query.Identity.IdentityOf.getValue(address);

        if (isCancelled) return;

        if (!identityData) {
          setIdentity(null);
          setIsLoading(false);
          return;
        }

        // Debug: log raw data
        console.log('Raw identity data from chain:', identityData);
        console.log('Display field:', identityData.info.display);

        const decoded: OnChainIdentity = {
          display: decodeIdentityField(identityData.info.display),
          legal: decodeIdentityField(identityData.info.legal),
          web: decodeIdentityField(identityData.info.web),
          matrix: decodeIdentityField(identityData.info.matrix),
          email: decodeIdentityField(identityData.info.email),
          twitter: decodeIdentityField(identityData.info.twitter),
          github: decodeIdentityField(identityData.info.github),
          discord: decodeIdentityField(identityData.info.discord),
          image: decodeIdentityField(identityData.info.image),
          pgpFingerprint: identityData.info.pgp_fingerprint
            ? Array.from(identityData.info.pgp_fingerprint).map(b => b.toString(16).padStart(2, '0')).join('')
            : null,
          judgements: identityData.judgements.map(([index, judgement]) => ({
            registrarIndex: index,
            judgement: judgement.type,
          })),
        };

        console.log('Decoded identity:', decoded);
        setIdentity(decoded);
        setIsLoading(false);
      } catch (err) {
        if (isCancelled) return;

        logger.error("failed to fetch on-chain identity:", err);
        setError(err instanceof Error ? err.message : "failed to fetch identity");
        setIdentity(null);
        setIsLoading(false);
      }
    };

    fetchOnChainIdentity();

    return () => {
      isCancelled = true;
    };
  }, [address, chainId]);

  const isVerified = useMemo(() => {
    if (!identity || !identity.judgements || identity.judgements.length === 0) {
      return false;
    }

    return identity.judgements.some(
      (j) => j.judgement === "Reasonable" || j.judgement === "KnownGood"
    );
  }, [identity]);

  return {
    identity,
    isLoading,
    error,
    isVerified,
  };
};

export const decodeIdentityField = (field: any): string | null => {
  if (!field || field.type === "None") return null;

  if (typeof field === "string") return field;

  const rawMatch = field.type?.match(/^Raw(\d+)$/);
  if (rawMatch) {
    const bytes = field.value;

    // Handle FixedSizeBinary objects from PAPI
    if (bytes && typeof bytes === 'object' && 'asBytes' in bytes) {
      return new TextDecoder().decode(bytes.asBytes());
    }

    // Handle regular Uint8Array
    if (bytes instanceof Uint8Array) {
      return new TextDecoder().decode(bytes);
    }

    // Try to convert to bytes if it's an array-like object
    if (bytes && typeof bytes[Symbol.iterator] === 'function') {
      try {
        const byteArray = new Uint8Array(Array.from(bytes));
        return new TextDecoder().decode(byteArray);
      } catch (e) {
        console.error('Failed to decode field:', e);
      }
    }

    return null;
  }

  if (field.type === "BlakeTwo256" || field.type === "Sha256" ||
      field.type === "Keccak256" || field.type === "ShaThree256") {
    const bytes = field.value;

    // Handle FixedSizeBinary
    if (bytes && typeof bytes === 'object' && 'asBytes' in bytes) {
      const byteArray = bytes.asBytes();
      return "0x" + Array.from(byteArray).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    if (bytes instanceof Uint8Array) {
      return "0x" + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    }
  }

  return null;
};
