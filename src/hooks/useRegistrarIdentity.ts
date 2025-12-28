import { useEffect, useState } from "react";
import { useNetwork } from "@/contexts/network-context";
import { logger } from "@/utils/logger";
import { getPeopleChain } from "@/polkadot-api/chain-config";
import { Binary } from "polkadot-api"; // For decoding identity fields

export interface RegistrarIdentity {
  display?: string;
  email?: string;
  twitter?: string;
  matrix?: string;
  discord?: string;
  web?: string;
  github?: string;
}

export interface RegistrarInfo {
  account: string;
  fee: bigint;
  identity?: RegistrarIdentity;
}

/**
 * Fetches the on-chain identity of a registrar
 * This allows us to dynamically get contact details without hardcoding
 */
export function useRegistrarIdentity(registrarIndex?: number) {
  const { id: chainId } = useNetwork();
  const [registrarInfo, setRegistrarInfo] = useState<RegistrarInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (registrarIndex === undefined || !chainId) {
      return;
    }

    const fetchRegistrar = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Get People chain for this ecosystem
        // If already a people chain, use it directly
        let peopleChainId: string | null = chainId;
        if (!chainId.includes('_people')) {
          peopleChainId = getPeopleChain(chainId);
        }
        if (!peopleChainId) {
          throw new Error(`No People chain found for ${chainId}`);
        }

        // Import PAPI client dynamically
        const { getPapiClient } = await import("@/lib/papi-client");
        const descriptors = await import("@polkadot-api/descriptors");

        const client = await getPapiClient(peopleChainId, false);
        const descriptor = descriptors[peopleChainId];

        if (!descriptor) {
          throw new Error(`No descriptor for chain: ${peopleChainId}`);
        }

        const typedApi = client.getTypedApi(descriptor);

        // Fetch registrars list
        const registrars = await typedApi.query.Identity.Registrars.getValue();

        if (!registrars || registrarIndex >= registrars.length) {
          throw new Error(`Registrar ${registrarIndex} not found`);
        }

        const registrar = registrars[registrarIndex];

        if (!registrar || !('account' in registrar)) {
          throw new Error(`Invalid registrar data at index ${registrarIndex}`);
        }

        const registrarAccount = registrar.account;
        const registrarFee = registrar.fee;

        logger.log(`Fetching identity for registrar ${registrarIndex}:`, registrarAccount);

        // Fetch the registrar's identity using getValue()
        const identityResult = await typedApi.query.Identity.IdentityOf.getValue(registrarAccount);

        if (!identityResult) {
          logger.warn(`Registrar ${registrarIndex} has no identity set`);
          setRegistrarInfo({
            account: registrarAccount,
            fee: registrarFee,
          });
          return;
        }

        // Parse identity fields using same pattern as useIdentity.ts
        const identity: RegistrarIdentity = {};
        const info = identityResult.info;

        // Helper to extract string from Data field
        const extractData = (field: any): string | undefined => {
          if (!field) return undefined;

          // Handle PAPI enum format { type: "RawX", value: ... }
          if (field.type === "None" || field.type === "Raw0") return undefined;

          // For Raw types, value is a Binary or can be converted to text
          if (field.type?.startsWith("Raw")) {
            try {
              // If value has asText method (Binary type)
              if (field.value?.asText) {
                return field.value.asText();
              }
              // If value is a Uint8Array or array-like
              if (field.value instanceof Uint8Array || Array.isArray(field.value)) {
                return Binary.fromBytes(new Uint8Array(field.value)).asText();
              }
              // If value is already a string
              if (typeof field.value === 'string') {
                return field.value;
              }
            } catch (e) {
              logger.warn('Failed to decode identity field:', e);
            }
          }

          // Handle direct string value
          if (typeof field === 'string') return field;

          return undefined;
        };

        if (info.display) identity.display = extractData(info.display);
        if (info.email) identity.email = extractData(info.email);
        if (info.twitter) identity.twitter = extractData(info.twitter);
        if (info.riot) identity.matrix = extractData(info.riot); // riot field is used for matrix
        if (info.discord) identity.discord = extractData(info.discord);
        if (info.web) identity.web = extractData(info.web);
        if (info.github) identity.github = extractData(info.github);

        logger.log(`Registrar ${registrarIndex} identity:`, identity);

        setRegistrarInfo({
          account: registrarAccount,
          fee: registrarFee,
          identity,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch registrar';
        logger.error('Failed to fetch registrar identity:', err);
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRegistrar();
  }, [chainId, registrarIndex]);

  return { registrarInfo, isLoading, error };
}
