import { SS58String, Binary } from "polkadot-api";
import { useState, useEffect, useMemo, useCallback } from "react";

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
  refetch: () => void;
}

export const useIdentity = (
  address: SS58String | undefined,
  chainId: string | null
): IdentityState => {
  const [identity, setIdentity] = useState<OnChainIdentity | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  useEffect(() => {
    if (!address || !chainId) {
      setIdentity(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    // Clear previous identity when switching accounts
    setIdentity(null);

    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    const fetchOnChainIdentity = async () => {
      try {
        const { getPapiClient } = await import("@/lib/papi-client");
        const descriptors = await import("@polkadot-api/descriptors");

        const client = await getPapiClient(chainId, false);
        const descriptor = (descriptors as any)[chainId];

        if (!descriptor) {
          throw new Error(`No descriptor for chain: ${chainId}`);
        }

        const typedApi: any = client.getTypedApi(descriptor);

        // Use .getValue() method like in papi-console
        const identityData = await typedApi.query.Identity.IdentityOf.getValue(address);

        if (isCancelled) return;

        if (!identityData) {
          setIdentity(null);
          setIsLoading(false);
          return;
        }

        const readData = (field: any): string | null => {
          if (!field || field.type === "None" || field.type === "Raw0") return null;
          if (field.type === "Raw1") {
            return Binary.fromBytes(new Uint8Array(field.value)).asText();
          }
          return field.value?.asText() || null;
        };

        const decoded: OnChainIdentity = {
          display: readData(identityData.info.display),
          legal: readData(identityData.info.legal),
          web: readData(identityData.info.web),
          matrix: readData(identityData.info.matrix),
          email: readData(identityData.info.email),
          twitter: readData(identityData.info.twitter),
          github: readData(identityData.info.github),
          discord: readData(identityData.info.discord),
          image: readData(identityData.info.image),
          pgpFingerprint: identityData.info.pgp_fingerprint
            ? Array.from(identityData.info.pgp_fingerprint).map((b: any) => b.toString(16).padStart(2, '0')).join('')
            : null,
          judgements: identityData.judgements.map(([index, judgement]: [any, any]) => ({
            registrarIndex: index,
            judgement: judgement.type,
          })),
        };

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
  }, [address, chainId, refreshKey]);

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
    refetch,
  };
};

export const decodeIdentityField = (field: any): string | null => {
  if (!field) return null;

  // Polkadot.js JSON format: { raw: "0x..." }
  if (typeof field === 'object' && field.raw) {
    const hex = field.raw.startsWith('0x') ? field.raw.slice(2) : field.raw;
    try {
      return new TextDecoder().decode(Buffer.from(hex, 'hex'));
    } catch {
      return null;
    }
  }

  if (typeof field === "string") return field;
  return null;
};
