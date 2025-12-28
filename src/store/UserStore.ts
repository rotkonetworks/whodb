import { proxy } from "valtio";

export interface UserProfile {
  id: string;
  displayName: string;
  nickname: string | null;
  walletAddress: string;
  isVerified: boolean;
  judgement: string;
  deposit: string;
  network: string;
  email?: string;
  matrix?: string;
  discord?: string;
  twitter?: string;
  github?: string;
  web?: string;
  pgp_fingerprint?: string;
  image?: string;
  legal?: string;
}

export interface UserState {
  isLoggedIn: boolean;
  userProfile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
}

// Fine-grained user store
export const userStore = proxy<UserState>({
  isLoggedIn: false,
  userProfile: null,
  isLoading: true,
  error: null,
});

/**
 * Initialize user session from localStorage
 */
export const initializeUserSession = () => {
  userStore.isLoading = true;

  try {
    const savedSession = localStorage.getItem("userSession");
    if (savedSession) {
      const session = JSON.parse(savedSession);
      userStore.isLoggedIn = true;
      userStore.userProfile = session.profile;
    }
  } catch (error) {
    console.error("Failed to parse user session", error);
    localStorage.removeItem("userSession");
    userStore.error = "Failed to restore session";
  } finally {
    userStore.isLoading = false;
  }
};

/**
 * Login user with wallet address
 * In production, this should verify signature and fetch from backend
 */
export const login = async (address: string) => {
  userStore.isLoading = true;
  userStore.error = null;

  try {
    // Mock alice's profile data
    const aliceProfile: UserProfile = {
      id: "1",
      displayName: "alice",
      nickname: "alice.dot",
      walletAddress: address,
      isVerified: false,
      judgement: "Fee Paid",
      deposit: "0.2005900000 PAS",
      network: "paseo",
      email: "alice@example.org",
      matrix: "@alice:matrix.org",
      discord: "alice#1234",
      twitter: "@alice",
      github: "alice-dev",
      web: "alice.dev",
      pgp_fingerprint: "3AA5 7A23 F091 DC24 3314 12AF 4268 A3AC 5A1A 4DF3",
    };

    // TODO: Replace with actual authentication
    // 1. Verify signature from wallet
    // 2. Fetch profile from backend API
    // 3. Or better: fetch from on-chain via PAPI (trustless)

    userStore.userProfile = aliceProfile;
    userStore.isLoggedIn = true;
    localStorage.setItem("userSession", JSON.stringify({ profile: aliceProfile }));
  } catch (err) {
    userStore.error = err instanceof Error ? err.message : "Failed to login";
  } finally {
    userStore.isLoading = false;
  }
};

/**
 * Logout user and clear session
 */
export const logout = () => {
  userStore.isLoggedIn = false;
  userStore.userProfile = null;
  userStore.error = null;
  localStorage.removeItem("userSession");
};

/**
 * Update user profile
 */
export const updateProfile = (updates: Partial<UserProfile>) => {
  if (userStore.userProfile) {
    const updatedProfile = { ...userStore.userProfile, ...updates };
    userStore.userProfile = updatedProfile;
    localStorage.setItem("userSession", JSON.stringify({ profile: updatedProfile }));
  }
};

/**
 * Clear user data
 */
export const clearUserData = () => {
  userStore.isLoggedIn = false;
  userStore.userProfile = null;
  userStore.isLoading = false;
  userStore.error = null;
};
