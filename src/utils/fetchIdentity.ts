import { IdentityData } from "@polkadot-api/descriptors";
import { ChainId } from "@reactive-dot/core";
import { ChainDescriptorOf } from "@reactive-dot/core/internal.js";
import { Binary, SS58String, TypedApi } from "polkadot-api";

import { verifyStatuses } from "@/types/Identity";
import { ApiStorage } from "@/types/api";

export interface JudgementData {
  registrar: {
    index: number;
  };
  state: string;
  fee: bigint;
}

export interface IdentityInfo {
  status: verifyStatuses;
  info: Record<string, string> | null;
  deposit: bigint;
  judgements: JudgementData[];
}

/**
 * Fetches identity and judgement information for a given address
 * 
 * @param api - The typed API instance with access to identity pallet
 * @param address - The SS58-encoded address to fetch identity for
 * @returns Promise with identity information or null if an error occurs
 */
export const fetchIdentity = async (
  api: TypedApi<ChainDescriptorOf<ChainId>>,
  address: SS58String
): Promise<IdentityInfo | null> => {
  if (!api || !address) {
    console.error("API or address not provided to fetchIdentity");
    return null;
  }

  try {
    // Default "no identity" state
    const identityInfo: IdentityInfo = {
      status: verifyStatuses.NoIdentity,
      info: null,
      deposit: null,
      judgements: []
    };

    // Fetch identity information from chain
    const result = await (api.query.Identity.IdentityOf as ApiStorage)
      .getValue(address, { at: "best" });

    if (!result) return identityInfo;

    // For most chains, the result is an array of IdentityOf, but for Westend it's an object
    const identityOf = result[0] || result;
    console.log("Fetched identityOf:", identityOf);

    // Extract identity data (raw text fields)
    const identityData = Object.fromEntries(
      Object.entries(identityOf.info)
        .filter(([_, value]: [string, IdentityData]) => value?.type?.startsWith("Raw"))
        .map(([key, value]: [string, IdentityData]) => [
          key,
          (value.value as Binary).asText()
        ])
    );
    // PGP fingerprint is a special case.
    if (identityOf.info.pgp_fingerprint) {
      identityData.pgp_fingerprint = (identityOf.info.pgp_fingerprint as Binary).asHex();
    }

    // Store the deposit
    identityInfo.deposit = identityOf.deposit;
    identityInfo.info = identityData;
    identityInfo.status = verifyStatuses.IdentitySet;

    // Process judgements
    const judgementsData: JudgementData[] = identityOf.judgements.map((judgement) => ({
      registrar: { index: judgement[0] },
      state: judgement[1].type,
      fee: judgement[1].value,
    }));

    if (judgementsData.length > 0) {
      identityInfo.judgements = judgementsData;
      identityInfo.status = verifyStatuses.JudgementRequested;
    }

    // Update status based on judgement states
    if (judgementsData.find(j => j.state === "FeePaid")) {
      identityInfo.status = verifyStatuses.FeePaid;
    }

    if (judgementsData.find(j => ["Reasonable", "KnownGood"].includes(j.state))) {
      identityInfo.status = verifyStatuses.IdentityVerified;
    }

    return identityInfo;
  } catch (error) {
    console.error("Error fetching identity:", error);
    return null;
  }
};
