// Profile type definition
export interface Profile {
  id: string
  displayName: string
  nickname: string | null
  walletAddress: string
  verified: boolean
  judgement: string
  isOwnProfile?: boolean
  avatar?: string
  email?: string
  matrix?: string
  discord?: string
  twitter?: string
  github?: string
  website?: string
  pgpFingerprint?: string
  subaccounts?: Profile[]
  deposit?: string
  network?: string
}

// Mock profiles for development
const mockProfiles: Record<string, Profile> = {
  "1": {
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
    subaccounts: [
      {
        id: "1-sub1",
        displayName: "alice//gaming",
        nickname: "alicegaming.dot",
        walletAddress: "12abCDefGHiJkLmNoPqRsTuVwXyZ12abCDefGHiJkLmN",
        verified: true,
        judgement: "Reasonable",
        deposit: "0.0500000000 PAS",
        network: "paseo",
        avatar: "/placeholder.svg?width=64&height=64",
      },
      {
        id: "1-sub2",
        displayName: "alice//dev",
        nickname: "alicedev.dot",
        walletAddress: "13bcDEfgHijKlMnOpQrStUvWxYz13bcDEfgHijKlMnOp",
        verified: false,
        judgement: "Fee Paid",
        deposit: "0.0500000000 PAS",
        network: "paseo",
        avatar: "/placeholder.svg?width=64&height=64",
      },
    ],
  },
  "2": {
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
    discord: "bob#5678",
    twitter: "@bob",
    github: "bob-security",
    website: "bob.dev",
    pgpFingerprint: "4BB6 8B34 G102 ED35 4425 23BG 5379 B4BD 6B2B 5EG4",
    avatar: "/professional-man-avatar.png",
    // Bob has no subaccounts for this example
  },
}

// Function to get a profile by ID
export async function getProfile(id: string): Promise<Profile> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 300))

  // Check if profile exists
  const profileData = mockProfiles[id]
  if (!profileData) {
    throw new Error("Profile not found")
  }

  // Return a copy of the profile
  return {
    ...profileData,
    // Simulate if this is the user's own profile (for demo purposes)
    isOwnProfile: id === "1", // Alice is considered "own profile"
  }
}
