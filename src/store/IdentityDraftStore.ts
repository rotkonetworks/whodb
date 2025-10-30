import { proxy, subscribe } from "valtio";
import { IdentityData } from "@/types/Identity";

export interface FieldVerificationState {
  isVerified: boolean;
  verificationDate?: string;
  proof?: string; // Challenge proof or verification data
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
 * Mark a field as verified
 */
export const markFieldVerified = (
  field: keyof typeof identityDraftStore.verifications,
  proof?: string
) => {
  identityDraftStore.verifications[field] = {
    isVerified: true,
    verificationDate: new Date().toISOString(),
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
 * Mark draft as saved (after blockchain submission)
 */
export const markDraftSaved = () => {
  identityDraftStore.isDirty = false;
  identityDraftStore.editedFields = new Set();
};
