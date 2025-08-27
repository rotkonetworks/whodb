import { Timeline } from "./timeline";
import { CHAINS } from "@/polkadot-api/chain-config";
import { SS58String } from "polkadot-api";

export type FullProfile = {
  network: keyof typeof CHAINS;
  wallet_id: SS58String;
  timeline?: Timeline;
  discord?: string;
  display?: string;
  email?: string;
  matrix?: string;
  twitter?: string;
  github?: string;
  legal?: string;
  web?: string;
  pgp_fingerprint?: string;
  image?: null
}
