import { proxy } from "valtio";

export enum ChallengeStatus {
  Failed = -2,
  Unknown = -1,
  Pending = 0,
  Passed = 1,
  Optional = 2,
}

export interface Challenge {
  type: string;
  status: ChallengeStatus;
  code?: string;
  accountName?: string;  // Account name/handle from WebSocket (e.g., "@username", "user@email.com")
}

export interface ChallengeStore {
  discord?: Challenge;
  display?: Challenge;
  email?: Challenge;
  legal?: Challenge;
  github?: Challenge;
  matrix?: Challenge;
  twitter?: Challenge;
  image?: Challenge;
  pgp_fingerprint?: Challenge;
  web?: Challenge;
}

export const challengeStore = proxy<ChallengeStore>({})
