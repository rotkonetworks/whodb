import { IdentityVerificationStatus } from "@/types/Identity"
import type { ReactNode } from "react"
import {
  WalletIcon, UserCheck, Loader2, Globe, Github, Mail,
  MessageSquare, Twitter, Key, User, ShieldCheck
} from "lucide-react"

// Compact step configuration
export const STEPS = {
  pickNetwork: 1,
  connectWallet: 2,
  pickAccount: 3,
  checkBalance: 4,
  fillIdentityInfo: 5,
  reviewAndSubmit: 6,
  complete: 7,
} as const

export const stepTitles = [
  "Select Network",
  "Connect Wallets",
  "Select Account",
  "Check Balance",
  "Provide & Verify Identity Info",
  "Review & Submit",
  "Registration Complete"
]

// Field configuration with icons and validation
export const FIELD_CONFIG = {
  display: {
    label: "Display Name",
    icon: User,
    placeholder: "Satoshi Nakamoto",
    required: true
  },
  email: {
    label: "Email",
    icon: Mail,
    placeholder: "satoshi@example.com",
    type: "email"
  },
  web: {
    label: "Website",
    icon: Globe,
    placeholder: "https://bitcoin.org",
    type: "url"
  },
  twitter: {
    label: "Twitter/X",
    icon: Twitter,
    placeholder: "@satoshi"
  },
  github: {
    label: "GitHub",
    icon: Github,
    placeholder: "satoshi-nakamoto"
  },
  matrix: {
    label: "Matrix",
    icon: MessageSquare,
    placeholder: "@satoshi:matrix.org"
  },
  pgp_fingerprint: {
    label: "PGP Fingerprint",
    icon: Key,
    placeholder: "0x123456789abcdef"
  },
  discord: {
    label: "Discord",
    icon: MessageSquare,
    placeholder: "username#1234"
  },
  image: {
    label: "Avatar URL",
    icon: User,
    placeholder: "https://example.com/avatar.png",
    type: "url"
  },
  legal: {
    label: "Legal Name",
    icon: User,
    placeholder: "John Doe"
  }
} as const

// Status colors and indicators
export const STATUS_CONFIG = {
  [IdentityVerificationStatus.NoIdentity]: {
    color: "text-gray-400",
    bg: "bg-gray-800/30",
    icon: "⚪"
  },
  [IdentityVerificationStatus.IdentitySet]: {
    color: "text-orange-400",
    bg: "bg-orange-900/20",
    icon: "🟠"
  },
  [IdentityVerificationStatus.IdentityVerified]: {
    color: "text-green-400",
    bg: "bg-green-900/20",
    icon: "✓"
  },
  [IdentityVerificationStatus.PendingJudgement]: {
    color: "text-blue-400",
    bg: "bg-blue-900/20",
    icon: "⏳"
  },
  [IdentityVerificationStatus.FeePaid]: {
    color: "text-yellow-400",
    bg: "bg-yellow-900/20",
    icon: "⏳"
  }
} as const

// Form validation helpers
export const validateIdentityForm = (data: Record<string, string>) => ({
  hasDisplay: !!data.display?.trim(),
  hasOtherFields: Object.entries(data)
    .some(([k, v]) => k !== 'display' && v?.trim()),
  isValid: !!data.display?.trim() && Object.entries(data)
    .some(([k, v]) => k !== 'display' && v?.trim())
})

// Get filled fields efficiently
export const getFilledFields = (data: Record<string, string>) =>
  Object.entries(data)
    .filter(([_, v]) => v?.trim())
    .map(([k]) => k)

// Format field name for display
export const formatFieldName = (field: string) =>
  field.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())