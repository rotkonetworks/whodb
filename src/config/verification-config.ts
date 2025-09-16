export interface VerificationFieldConfig {
  label: string
  placeholder?: string
  destinationName: string
  contactAddress?: string
  instructions: {
    method: "code" | "oauth" | "dns-challenge" | "challenge" | "challenge-url" | "gpg-challenge"
    details: string
  }
}

// Get instruction message from environment variables
const getInstructionMessage = (fieldId: string): string => {
  const envKey = `VITE_APP_VERIFICATION_INSTRUCTION_${fieldId.toUpperCase()}`
  return import.meta.env[envKey] || `Follow the verification process for ${fieldId}.`
}

// Create configuration dynamically to ensure environment variables are loaded
const createVerificationConfig = (): Record<string, VerificationFieldConfig> => {
  return {
    email: {
      label: "Email Address",
      placeholder: "your@email.com",
      destinationName: "email",
      contactAddress: import.meta.env.VITE_APP_CONTACT_LINK_EMAIL,
      instructions: {
        method: "code",
        details: getInstructionMessage("email")
      }
    },
    matrix: {
      label: "Matrix Handle",
      placeholder: "@username:matrix.org",
      destinationName: "Matrix",
      contactAddress: import.meta.env.VITE_APP_CHALLENGES_PRIVATE_ACCOUNT_MATRIX,
      instructions: {
        method: "code",
        details: getInstructionMessage("matrix")
      }
    },
    twitter: {
      label: "Twitter / X Handle",
      placeholder: "@username",
      destinationName: "Twitter / X",
      contactAddress: import.meta.env.VITE_APP_CHALLENGES_PRIVATE_ACCOUNT_TWITTER,
      instructions: {
        method: "challenge",
        details: getInstructionMessage("twitter")
      }
    },
    discord: {
      label: "Discord Handle",
      placeholder: "username#1234",
      destinationName: "Discord",
      contactAddress: import.meta.env.VITE_APP_CHALLENGES_PRIVATE_ACCOUNT_DISCORD,
      instructions: {
        method: "code",
        details: getInstructionMessage("discord")
      }
    },
    github: {
      label: "GitHub Username",
      placeholder: "username",
      destinationName: "GitHub",
      instructions: {
        method: "challenge-url",
        details: getInstructionMessage("github")
      }
    },
    web: {
      label: "Website URL",
      placeholder: "https://yourwebsite.com",
      destinationName: "website DNS",
      instructions: {
        method: "dns-challenge",
        details: getInstructionMessage("web")
      }
    },
    pgp_fingerprint: {
      label: "PGP Public Key Fingerprint",
      placeholder: "ABCD1234EFGH5678...",
      destinationName: "PGP signature",
      instructions: {
        method: "gpg-challenge",
        details: getInstructionMessage("pgp_fingerprint")
      }
    },
    legal: {
      label: "Legal Name",
      placeholder: "Your full legal name",
      destinationName: "legal documents",
      instructions: {
        method: "challenge",
        details: getInstructionMessage("legal")
      }
    },
    image: {
      label: "Profile Image",
      destinationName: "image verification",
      instructions: {
        method: "challenge",
        details: getInstructionMessage("image")
      }
    }
  }
}

// Export the configuration - created lazily to ensure env vars are loaded
export const verificationConfig = createVerificationConfig()

// Helper functions
export const getVerificationDestination = (fieldId: string): string => {
  return verificationConfig[fieldId]?.destinationName || fieldId
}

export const getContactAddress = (fieldId: string): string | undefined => {
  return verificationConfig[fieldId]?.contactAddress
}

export const getVerificationInstructions = (fieldId: string) => {
  return verificationConfig[fieldId]?.instructions || {
    method: "challenge" as const,
    details: getInstructionMessage(fieldId)
  }
}