import { IdentityData as PolkadotIdentityData, IdentityJudgement } from "@polkadot-api/descriptors";
import { Binary, FixedSizeBinary, SS58String, StorageDescriptor } from "polkadot-api";

export interface IdentityInfo {
  discord?: string;
  display?: string;
  email?: string;
  github?: string;
  image?: string;
  legal?: string;
  matrix?: string;
  pgp_fingerprint?: string;
  twitter?: string;
  web?: string;
}

// Centralized IdentityData interface using Polkadot API field names
export interface IdentityData {
  display: string;
  email: string;
  matrix: string;
  twitter: string;
  web: string;
  github: string;
  pgp_fingerprint: string;
  discord: string;
  image: string;
  legal: string;
  [key: string]: string;
}

export type IdentityOf = StorageDescriptor<[Key: SS58String], [{
  deposit: bigint;
  info: {
    discord: PolkadotIdentityData;
    display: PolkadotIdentityData;
    email: PolkadotIdentityData;
    github: PolkadotIdentityData;
    image: PolkadotIdentityData;
    legal: PolkadotIdentityData;
    matrix: PolkadotIdentityData;
    pgp_fingerprint?: FixedSizeBinary<20>;
    twitter: PolkadotIdentityData;
    web: PolkadotIdentityData;
  };
  judgements: [number, IdentityJudgement][];
}, Binary | undefined], true, "identityOf">;

export type IdentityOfResult = {
  type: string;
  value: IdentityOf;
}

export enum verifyStatuses {
  Unknown = -1,
  NoIdentity = 0,
  IdentitySet = 1,
  JudgementRequested = 2,
  FeePaid = 3, // Ready to complete challenges
  IdentityVerified = 4, // Judgement is deemed Reasonable, KnownGood, or any other afformative state
}

export interface Judgement {
  registrar: {
    index: number;
  };
  state: "FeePaid" | "OutOfDate" | "Reasonable" | "KnownGood" | "Erroneous" | "LowQuality";
  fee: bigint;
}

export interface Identity {
  info?: IdentityInfo;
  judgements?: Judgement[];
  status: verifyStatuses;
  hash?: Uint16Array;
  deposit?: bigint;
}
