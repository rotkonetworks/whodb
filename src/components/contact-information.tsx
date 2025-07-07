"use client"

import type React from "react"
import { Mail, MessageCircle, Twitter, Globe, Github, Key, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Profile } from "@/lib/profile"
import { useVerification } from "@/contexts/verification-context"
import { toast } from "sonner"
import { useState } from "react"

interface ContactInformationProps {
  profile: Profile
}

interface ContactItemConfig {
  field: keyof Profile & ("email" | "matrix" | "twitter" | "website" | "github" | "pgpFingerprint")
  label: string
  icon: React.ElementType
  getLink?: (value: string) => string | null
  linkAriaLabel?: string
  isMonospace?: boolean
}

const contactItemConfigs: ContactItemConfig[] = [
  { field: "email", label: "Email", icon: Mail, getLink: (v) => `mailto:${v}`, linkAriaLabel: "Send email" },
  {
    field: "matrix",
    label: "Matrix",
    icon: MessageCircle,
    getLink: (v) => (v.startsWith("@") && v.includes(":") ? `https://matrix.to/#/${v}` : null),
    linkAriaLabel: "Open Matrix chat",
  },
  {
    field: "twitter",
    label: "Twitter/X",
    icon: Twitter,
    getLink: (v) => `https://x.com/${v.replace("@", "")}`,
    linkAriaLabel: "View X profile",
  },
  {
    field: "website",
    label: "Website",
    icon: Globe,
    getLink: (v) => (!v.match(/^https?:\/\//) ? `https://${v}` : v),
    linkAriaLabel: "Visit website",
  },
  {
    field: "github",
    label: "GitHub",
    icon: Github,
    getLink: (v) => `https://github.com/${v}`,
    linkAriaLabel: "View GitHub profile",
  },
  {
    field: "pgpFingerprint",
    label: "PGP",
    icon: Key,
    getLink: (v) => `https://keys.openpgp.org/search?q=${encodeURIComponent(v.replace(/\s+/g, ""))}`,
    linkAriaLabel: "Search PGP key",
    isMonospace: true,
  },
]

export function ContactInformation({ profile }: ContactInformationProps) {
  const { getFieldStatus } = useVerification()
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const copyToClipboard = (text: string, fieldLabel: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopiedField(fieldLabel)
    toast.success(`${fieldLabel} copied!`)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const getStatusStyles = (status: string | undefined) => {
    switch (status) {
      case "verified":
        return { borderColor: "border-green-500/30", hoverBorderColor: "hover:border-green-500/60" }
      case "pending":
        return { borderColor: "border-yellow-500/30", hoverBorderColor: "hover:border-yellow-500/60" }
      case "failed":
        return { borderColor: "border-red-500/30", hoverBorderColor: "hover:border-red-500/60" }
      default:
        return { borderColor: "border-gray-700", hoverBorderColor: "hover:border-pink-500/30" }
    }
  }

  const itemsToDisplay = contactItemConfigs
    .map((config) => ({ ...config, value: profile[config.field] as string | undefined }))
    .filter((item) => item.value && item.value.trim() !== "")

  if (itemsToDisplay.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Mail className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <p className="text-md font-medium">No contact information provided.</p>
        {profile.isOwnProfile && <p className="mt-2 text-xs">Add details to make your profile more discoverable.</p>}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {itemsToDisplay.map((item) => {
        const verification = getFieldStatus(item.field)
        const { borderColor, hoverBorderColor } = getStatusStyles(verification?.status)
        const itemValue = item.value!
        const link = item.getLink ? item.getLink(itemValue) : null

        const content = (
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <item.icon className="w-5 h-5 text-pink-400 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <span
                className={`block text-sm text-white truncate ${item.isMonospace ? "font-mono tracking-tight" : ""}`}
                title={itemValue}
              >
                {itemValue}
              </span>
              <span className="block text-xs text-gray-400">{item.label}</span>
            </div>
          </div>
        )

        return (
          <div
            key={item.field}
            className={`group relative flex items-center justify-between p-3 rounded-lg border bg-gray-800/60 transition-all duration-200 ${borderColor} ${hoverBorderColor}`}
          >
            {link ? (
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={item.linkAriaLabel}
                className="flex-grow min-w-0"
              >
                {content}
              </a>
            ) : (
              <div className="flex-grow min-w-0">{content}</div>
            )}

            <div className="pl-2 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:text-pink-300 hover:bg-white/10 w-8 h-8 rounded-md"
                onClick={(e) => {
                  e.stopPropagation()
                  copyToClipboard(itemValue, item.label)
                }}
                title={`Copy ${item.label}`}
                aria-label={`Copy ${item.label}`}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
