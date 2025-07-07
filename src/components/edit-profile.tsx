"use client"

import type React from "react"
import { useState } from "react"
import { Save, X, Mail, MessageCircle, Twitter, Globe, Github, Key, User, AtSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField } from "@/components/form-field"
import type { Profile } from "@/lib/profile"

interface EditProfileProps {
  profile: Profile
  onClose: () => void
  onUpdate: (profileData: Partial<Profile>) => void // Allow partial updates
}

export function EditProfile({ profile, onClose, onUpdate }: EditProfileProps) {
  const [formData, setFormData] = useState({
    displayName: profile.displayName || "",
    nickname: profile.nickname || "", // Keep for display, but field will be disabled
    email: profile.email || "",
    matrix: profile.matrix || "",
    twitter: profile.twitter || "",
    website: profile.website || "",
    github: profile.github || "",
    pgpFingerprint: profile.pgpFingerprint || "",
  })

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Exclude nickname from the update if it's disabled and not meant to be changed
    const { nickname, ...dataToUpdate } = formData
    onUpdate(dataToUpdate)
    onClose()
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card className="bg-gray-800 border-pink-500/30">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white">Edit Profile</CardTitle>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} className="text-gray-400">
            <X className="w-4 h-4" />
            <span className="sr-only">Close</span>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-400">Basic Information</h3>
            <FormField
              id="displayName"
              label="Display Name"
              icon={<User className="w-4 h-4 text-pink-400 mr-2" />}
              value={formData.displayName}
              onChange={(value) => handleChange("displayName", value)}
              placeholder="Your display name"
              required
            />
            <FormField
              id="nickname"
              label="Nickname (DNS)"
              icon={<AtSign className="w-4 h-4 text-pink-400 mr-2" />}
              value={formData.nickname}
              onChange={(value) => handleChange("nickname", value)}
              placeholder="your-name.dot"
              description="Register a human-readable DNS name for your on-chain identity. This will make it easier for others to find and interact with you."
              className=""
              disabled={false}
            />
          </div>

          {/* Contact Information */}
          <div className="space-y-4 pt-4 border-t border-gray-700">
            <h3 className="text-sm font-medium text-gray-400">Contact Information</h3>
            <FormField
              id="email"
              label="Email"
              icon={<Mail className="w-4 h-4 text-pink-400 mr-2" />}
              value={formData.email}
              onChange={(value) => handleChange("email", value)}
              placeholder="your.email@example.com"
              type="email"
            />
            <FormField
              id="matrix"
              label="Matrix"
              icon={<MessageCircle className="w-4 h-4 text-pink-400 mr-2" />}
              value={formData.matrix}
              onChange={(value) => handleChange("matrix", value)}
              placeholder="@username:matrix.org"
            />
            <FormField
              id="twitter"
              label="Twitter"
              icon={<Twitter className="w-4 h-4 text-pink-400 mr-2" />}
              value={formData.twitter}
              onChange={(value) => handleChange("twitter", value)}
              placeholder="@username"
            />
          </div>

          {/* Web Presence */}
          <div className="space-y-4 pt-4 border-t border-gray-700">
            <h3 className="text-sm font-medium text-gray-400">Web Presence</h3>
            <FormField
              id="website"
              label="Website"
              icon={<Globe className="w-4 h-4 text-pink-400 mr-2" />}
              value={formData.website}
              onChange={(value) => handleChange("website", value)}
              placeholder="https://example.com"
            />
            <FormField
              id="github"
              label="GitHub"
              icon={<Github className="w-4 h-4 text-pink-400 mr-2" />}
              value={formData.github}
              onChange={(value) => handleChange("github", value)}
              placeholder="username"
            />
            <FormField
              id="pgpFingerprint"
              label="PGP Fingerprint"
              icon={<Key className="w-4 h-4 text-pink-400 mr-2" />}
              value={formData.pgpFingerprint}
              onChange={(value) => handleChange("pgpFingerprint", value)}
              placeholder="XXXX XXXX XXXX XXXX XXXX XXXX XXXX XXXX XXXX XXXX"
              className="font-mono"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-pink-500 hover:bg-pink-600 text-white">
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
