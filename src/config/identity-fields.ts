import {
  User,
  Mail,
  MessageSquare,
  Twitter,
  Globe,
  Github,
  Key,
  ShieldCheck,
  Info,
} from "lucide-react"

export const IDENTITY_FIELDS = {
  display: {
    label: "Display Name",
    icon: User,
    type: "text",
    placeholder: "Enter your display name",
    description: "Your public display name",
  },
  email: {
    label: "Email",
    icon: Mail,
    type: "email",
    placeholder: "your@email.com",
    description: "Your contact email address",
  },
  matrix: {
    label: "Matrix",
    icon: MessageSquare,
    type: "text",
    placeholder: "@username:server.com",
    description: "Your Matrix ID",
  },
  twitter: {
    label: "Twitter",
    icon: Twitter,
    type: "text",
    placeholder: "@username",
    description: "Your Twitter/X handle",
  },
  web: {
    label: "Website",
    icon: Globe,
    type: "url",
    placeholder: "https://yourwebsite.com",
    description: "Your personal website",
  },
  github: {
    label: "GitHub",
    icon: Github,
    type: "text",
    placeholder: "username",
    description: "Your GitHub username",
  },
  pgp_fingerprint: {
    label: "PGP Fingerprint",
    icon: Key,
    type: "text",
    placeholder: "ABCD EFGH 1234 5678",
    description: "Your PGP key fingerprint",
  },
  discord: {
    label: "Discord",
    icon: MessageSquare,
    type: "text",
    placeholder: "username#1234",
    description: "Your Discord handle",
  },
  image: {
    label: "Image URL",
    icon: Info,
    type: "url",
    placeholder: "https://...",
    description: "URL to your profile image",
  },
  legal: {
    label: "Legal Name",
    icon: ShieldCheck,
    type: "text",
    placeholder: "Your legal name",
    description: "Your legal/formal name",
  },
} as const

export type IdentityFieldKey = keyof typeof IDENTITY_FIELDS