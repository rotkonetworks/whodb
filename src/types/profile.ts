import { ChallengeStore } from "@/store/challengesStore";
import { Identity } from "./Identity";
import { Timeline } from "./timeline";

export type FullProfile = {
  identity: Identity;
  verified?: boolean;
  challenges: ChallengeStore;
  timeline: Timeline;
}
