import { proxy, subscribe } from "valtio";
import { IdentityData } from "@/types/Identity";
import { blake2AsHex } from '@polkadot/util-crypto';

export interface FieldVerificationState {
  isVerified: boolean;
  verificationDate?: string;
  proof?: string; // Challenge proof or verification data
  verifiedAtHash?: string; // Identity hash when this field was verified
}

export interface IdentityDraftState {
  // Draft identity data being built
  draft: IdentityData;

  // Verification status for each field
  verifications: {
    email?: FieldVerificationState;
    twitter?: FieldVerificationState;
    github?: FieldVerificationState;
    web?: FieldVerificationState;
    matrix?: FieldVerificationState;
    discord?: FieldVerificationState;
    pgp_fingerprint?: FieldVerificationState;
  };

  // Current identity hash from backend (on-chain)
  currentIdentityHash: string | null;

  // Track if draft has unsaved changes
  isDirty: boolean;

  // Track which fields have been edited
  editedFields: Set<keyof IdentityData>;
}

const STORAGE_KEY = "w3registrar_identity_draft";

// Load from localStorage
const loadFromStorage = (): Partial<IdentityDraftState> | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    // Convert editedFields array back to Set
    if (parsed.editedFields && Array.isArray(parsed.editedFields)) {
      parsed.editedFields = new Set(parsed.editedFields);
    }
    return parsed;
  } catch (error) {
    console.error("Failed to load identity draft from storage:", error);
    return null;
  }
};

// Save to localStorage
const saveToStorage = (state: IdentityDraftState) => {
  try {
    // Convert Set to array for JSON serialization
    const toSave = {
      ...state,
      editedFields: Array.from(state.editedFields),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (error) {
    console.error("Failed to save identity draft to storage:", error);
  }
};

// Initialize store with localStorage data or defaults
const storedData = loadFromStorage();

if (storedData) {
  console.log("📦 Loaded identity draft from localStorage:", {
    isDirty: storedData.isDirty,
    hasDisplay: !!storedData.draft?.display,
    fieldCount: Object.keys(storedData.draft || {}).filter(k => storedData.draft?.[k as keyof IdentityData]).length
  });
} else {
  console.log("📦 No cached identity draft found, starting fresh");
}

// Default empty state
const defaultState: IdentityDraftState = {
  draft: {
    display: "",
    email: "",
    legal: "",
    web: "",
    twitter: "",
    matrix: "",
    discord: "",
    github: "",
    pgp_fingerprint: "",
    image: "",
  },
  verifications: {},
  currentIdentityHash: null,
  isDirty: false,
  editedFields: new Set(),
};

// Merge stored data with defaults to ensure all fields exist
const initialState: IdentityDraftState = storedData
  ? {
      ...defaultState,
      ...storedData,
      draft: { ...defaultState.draft, ...storedData.draft },
      verifications: { ...storedData.verifications },
      editedFields: storedData.editedFields instanceof Set
        ? storedData.editedFields
        : new Set(storedData.editedFields || []),
    }
  : defaultState;

// Valtio store for identity draft
export const identityDraftStore = proxy<IdentityDraftState>(initialState);

// Subscribe to changes and persist to localStorage
subscribe(identityDraftStore, () => {
  saveToStorage(identityDraftStore);
});

/**
 * Initialize draft from existing on-chain identity
 */
export const initializeDraft = (existingIdentity: IdentityData) => {
  identityDraftStore.draft = { ...existingIdentity };
  identityDraftStore.isDirty = false;
  identityDraftStore.editedFields = new Set();
  identityDraftStore.verifications = {};
};

/**
 * Update a field in the draft
 *
 * Note: We don't clear verifications here. Instead, we compute current hash
 * and compare with verifiedAtHash to determine if verifications are still valid.
 * This is reactive: verifications become invalid automatically when hash changes.
 */
export const updateDraftField = (field: keyof IdentityData, value: string) => {
  identityDraftStore.draft[field] = value;
  identityDraftStore.editedFields.add(field);
  identityDraftStore.isDirty = true;
};

/**
 * Update multiple fields at once
 */
export const updateDraft = (updates: Partial<IdentityData>) => {
  Object.entries(updates).forEach(([key, value]) => {
    const field = key as keyof IdentityData;
    identityDraftStore.draft[field] = value;
    identityDraftStore.editedFields.add(field);
  });
  identityDraftStore.isDirty = true;
};

/**
 * Mark a field as verified at current identity hash
 */
export const markFieldVerified = (
  field: keyof typeof identityDraftStore.verifications,
  identityHash: string,
  proof?: string
) => {
  identityDraftStore.verifications[field] = {
    isVerified: true,
    verificationDate: new Date().toISOString(),
    verifiedAtHash: identityHash,
    proof,
  };
};

/**
 * Clear verification for a field (when user edits it)
 */
export const clearFieldVerification = (field: keyof typeof identityDraftStore.verifications) => {
  delete identityDraftStore.verifications[field];
};

/**
 * Check if draft is ready to submit
 * At minimum needs display name
 */
export const isDraftReadyToSubmit = (): boolean => {
  return identityDraftStore.draft.display.trim().length > 0;
};

/**
 * Get count of verified fields
 */
export const getVerifiedFieldsCount = (): number => {
  return Object.values(identityDraftStore.verifications).filter((v) => v.isVerified).length;
};

/**
 * Reset draft to empty state
 */
export const clearDraft = () => {
  identityDraftStore.draft = {
    display: "",
    email: "",
    legal: "",
    web: "",
    twitter: "",
    matrix: "",
    discord: "",
    github: "",
    pgp_fingerprint: "",
    image: "",
  };
  identityDraftStore.verifications = {};
  identityDraftStore.isDirty = false;
  identityDraftStore.editedFields = new Set();

  // Clear from localStorage
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear identity draft from storage:", error);
  }
};

/**
 * Compute identity hash from identity data (trustless, local computation)
 *
 * CRITICAL: This hash MUST match Rust's format! It's used ON-CHAIN in provideJudgement.
 * We compute locally (trustless) but must match Substrate's exact format.
 *
 * Rust code (w3registrar/node/mod.rs:131):
 *   let info_bytes = format!("{:?}", registration.info).into_bytes();
 *   let hash = blake2_256(&info_bytes);
 *
 * Format: IdentityInfo { display: Raw([bytes]), legal: None, web: Raw([bytes]), ...}
 */
export const computeIdentityHash = (identity: Partial<IdentityData>): string => {
  // Format field as Rust Debug would: Raw14([bytes]) or None
  // CRITICAL: Substrate uses sized variants like Raw0, Raw1, ..., Raw32
  const rustDebugField = (value: string | null | undefined): string => {
    if (!value || value === '') return 'None';
    const bytes = Buffer.from(value, 'utf8');
    const byteArray = Array.from(bytes).join(', ');
    return `Raw${bytes.length}([${byteArray}])`;  // Include length in variant name!
  };

  // Match current Substrate format: uses 'matrix' (not 'riot') and includes 'discord'
  const debugStr = [
    'IdentityInfo { ',
    `display: ${rustDebugField(identity.display)}, `,
    `legal: ${rustDebugField(identity.legal)}, `,
    `web: ${rustDebugField(identity.web)}, `,
    `matrix: ${rustDebugField(identity.matrix)}, `,
    `email: ${rustDebugField(identity.email)}, `,
    `pgp_fingerprint: ${identity.pgp_fingerprint ? `Some([${identity.pgp_fingerprint}])` : 'None'}, `,
    `image: ${rustDebugField(identity.image)}, `,
    `twitter: ${rustDebugField(identity.twitter)}, `,
    `github: ${rustDebugField(identity.github)}, `,
    `discord: ${rustDebugField(identity.discord)}`,
    ' }'
  ].join('');

  return blake2AsHex(debugStr);
};

/**
 * Update current identity hash from ON-CHAIN identity (trustless)
 * Call this after fetching identity from chain via PAPI
 */
export const setCurrentIdentityHash = (identity: Partial<IdentityData> | null) => {
  if (!identity) {
    identityDraftStore.currentIdentityHash = null;
    return;
  }

  // Compute hash locally - never trust backend!
  identityDraftStore.currentIdentityHash = computeIdentityHash(identity);
};

/**
 * Check if a field verification is still valid for current identity hash
 *
 * Verifications are valid only if:
 * 1. Field is marked as verified
 * 2. verifiedAtHash matches currentIdentityHash (from backend)
 *
 * This makes verification validity reactive - it automatically becomes
 * invalid when identity hash changes (e.g., after user edits and submits).
 */
export const isVerificationValid = (field: keyof typeof identityDraftStore.verifications): boolean => {
  const verification = identityDraftStore.verifications[field];
  if (!verification || !verification.isVerified) {
    return false;
  }

  // If no hash stored, consider it valid (legacy support)
  if (!verification.verifiedAtHash || !identityDraftStore.currentIdentityHash) {
    return verification.isVerified;
  }

  // Check if verified at current hash
  return verification.verifiedAtHash === identityDraftStore.currentIdentityHash;
};

/**
 * Mark draft as saved (after blockchain submission)
 */
export const markDraftSaved = () => {
  identityDraftStore.isDirty = false;
  identityDraftStore.editedFields = new Set();
};
