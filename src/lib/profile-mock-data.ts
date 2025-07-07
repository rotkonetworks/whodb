// Using a separate mock data file for the chip-in modal to avoid circular dependencies
// or overly complex imports if lib/profile.ts grows.
// In a real app, this would come from an API.

import type { Profile } from "./profile" // Ensure Profile type is available

export const mockProfiles: Profile[] = [
  {
    id: "1",
    displayName: "alice",
    nickname: "alice.dot",
    walletAddress: "13KVFndw5GXkwPSzNtd2FHGdJnFN3Z3zTvbjdQfDGpQYYpiK",
    verified: false,
    judgement: "Fee Paid",
    deposit: "0.2005900000 PAS",
    network: "paseo",
    email: "alice@example.org",
    matrix: "@alice:matrix.org",
    discord: "alice#1234",
    twitter: "@alice",
    github: "alice-dev",
    website: "alice.dev",
    pgpFingerprint: "3AA5 7A23 F091 DC24 3314 12AF 4268 A3AC 5A1A 4DF3",
    avatar: "/professional-woman-avatar.png",
  },
  {
    id: "2",
    displayName: "bob",
    nickname: "bob.dot",
    walletAddress: "15nt73xvxdRqz6kno46Yekg44cX3yGNWCYeK7HqHmEkFre4",
    verified: true,
    judgement: "Reasonable",
    deposit: "0.1000000000 PAS",
    network: "polkadot",
    email: "bob@example.org",
    matrix: "@bob:matrix.org",
    avatar: "/professional-man-avatar.png",
  },
  {
    id: "3",
    displayName: "charlie",
    nickname: null,
    walletAddress: "14Vz8D6TP7pzPeNKRYBLDEBuCJAVQYDVmJNHHHfWHEPGzXk",
    verified: false,
    judgement: "Unknown",
    deposit: "0.0000000000 PAS",
    network: "kusama",
    email: "charlie@example.org",
    avatar: "/woman-developer-avatar.png",
  },
  {
    id: "4",
    displayName: "david",
    nickname: "david.dot",
    walletAddress: "16DKyH4fggEXeGwCytqM19e9NFGkgR2neZPDJ5ta8BKpPbPK",
    verified: true,
    judgement: "KnownGood",
    deposit: "0.3000000000 PAS",
    network: "paseo",
    matrix: "@david:matrix.org",
    avatar: "/asian-man-developer-avatar.png",
  },
]
