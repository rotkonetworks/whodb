import { ChallengeStore } from "@/store/challengesStore";
import { Identity } from "./Identity";
import { Timeline } from "./timeline";
import { CHAINS } from "@/polkadot-api/chain-config";
import { SS58String } from "polkadot-api";

export type FullProfile = {
  network: keyof typeof CHAINS;
  address: SS58String;
  identity: Identity;
  verified?: boolean;
  challenges?: ChallengeStore;
  timeline?: Timeline;
  subaccounts?: FullProfile[];
  superAccount?: FullProfile;
}
