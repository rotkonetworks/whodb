import { ApiPromise } from "@polkadot/api";
import { SS58String } from "polkadot-api";

import { IdentityVerificationStatus } from "@/types/Identity";
import { decodeUint8Array, toHexString } from "./binary";

export interface JudgementData {
  registrar: {
    index: number;
  };
  state: string;
  fee: bigint;
}

export interface RawIdentityInfo {
  status: IdentityVerificationStatus;
  info: Record<string, string> | null;
  deposit: bigint;
  judgements: JudgementData[];
}

/**
 * Fetches identity and judgement information for a given address
 * 
 * @param api - The ApiPromise instance with access to identity pallet
 * @param address - The SS58-encoded address to fetch identity for
 * @returns Promise with identity information or null if an error occurs
 */
export const fetchIdentity = async (
  api: ApiPromise,
  address: SS58String
): Promise<RawIdentityInfo | null> => {
  if (!api || !address) {
    console.error("API or address not provided to fetchIdentity");
    return null;
  }

  try {
    // Default "no identity" state
    const identityInfo: RawIdentityInfo = {
      status: IdentityVerificationStatus.NoIdentity,
      info: null,
      deposit: BigInt(0),
      judgements: []
    };

    // Fetch identity information from chain
    const result = await api.query.identity.identityOf(address);

    if (!result || (result as any).isNone) return identityInfo;

    // For most chains, the result is an Option containing IdentityOf  
    const identityOf = (result as any).isSome ? (result as any).unwrap() : result;
    console.log("Fetched identityOf:", identityOf);

    // Extract identity data (raw text fields)
    const identityData = Object.fromEntries(
      [...identityOf.info.entries()]
        .filter(([_, { isRaw }]) => isRaw)
        .map(([key, { value }]) => [key, decodeUint8Array(value as Uint8Array)])
    );
    // PGP fingerprint is a special case.
    if (identityOf.info.pgpFingerprint.isSome) {
      identityData.pgp_fingerprint = toHexString(identityOf.info.pgpFingerprint.value);
    }

    // Store the deposit
    identityInfo.deposit = identityOf.deposit;
    identityInfo.info = identityData;
    identityInfo.status = IdentityVerificationStatus.IdentitySet;

    // Process judgements
    const judgementsData: JudgementData[] = identityOf.judgements
      .map((judgement: [number, {type: string, value: bigint}]) => ({
        registrar: { index: judgement[0] },
        state: judgement[1].type,
        fee: judgement[1].value,
      }))
    ;

    if (judgementsData.length > 0) {
      identityInfo.judgements = judgementsData;
      identityInfo.status = IdentityVerificationStatus.JudgementRequested;
    }

    // Update status based on judgement states
    if (judgementsData.find(j => j.state === "FeePaid")) {
      identityInfo.status = IdentityVerificationStatus.FeePaid;
    }

    if (judgementsData.find(j => ["Reasonable", "KnownGood"].includes(j.state))) {
      identityInfo.status = IdentityVerificationStatus.IdentityVerified;
    }

    return identityInfo;
  } catch (error) {
    console.error("Error fetching identity:", error);
    return null;
  }
};
