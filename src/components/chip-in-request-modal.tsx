"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Search, Send, Mail, MessageSquare } from "lucide-react"
import { toast } from "sonner"
import type { Profile } from "@/lib/profile" // Assuming Profile type is exported
import { mockProfiles } from "@/lib/profile-mock-data" // Using a separate mock data for simplicity here

interface ChipInRequestModalProps {
  isOpen: boolean
  onClose: () => void
  currentUserAddress: string
  networkDisplayName: string
  requiredAmount: number
  tokenSymbol: string
}

// Simplified profile type for this modal's search
type SearchableProfile = Pick<Profile, "id" | "displayName" | "email" | "matrix" | "avatar">

export function ChipInRequestModal({
  isOpen,
  onClose,
  currentUserAddress,
  networkDisplayName,
  requiredAmount,
  tokenSymbol,
}: ChipInRequestModalProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchableProfile[]>([])
  const [selectedProfile, setSelectedProfile] = useState<SearchableProfile | null>(null)
  const [selectedContactMethod, setSelectedContactMethod] = useState<string>("")
  const [customMessage, setCustomMessage] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([])
      return
    }
    setIsSearching(true)
    // Simulate API call for search
    const timer = setTimeout(() => {
      const filtered = mockProfiles.filter(
        (p) =>
          p.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.email && p.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (p.matrix && p.matrix.toLowerCase().includes(searchQuery.toLowerCase())),
      )
      setSearchResults(filtered.slice(0, 5) as SearchableProfile[])
      setIsSearching(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleSelectProfile = (profile: SearchableProfile) => {
    setSelectedProfile(profile)
    setSearchResults([]) // Clear results after selection
    setSearchQuery(profile.displayName) // Populate search bar with selected name
    // Auto-select first available contact method
    if (profile.email) setSelectedContactMethod(`email:${profile.email}`)
    else if (profile.matrix) setSelectedContactMethod(`matrix:${profile.matrix}`)
    else setSelectedContactMethod("")
  }

  const availableContactMethods = useMemo(() => {
    if (!selectedProfile) return []
    const methods = []
    if (selectedProfile.email)
      methods.push({ value: `email:${selectedProfile.email}`, label: `Email: ${selectedProfile.email}`, icon: Mail })
    if (selectedProfile.matrix)
      methods.push({
        value: `matrix:${selectedProfile.matrix}`,
        label: `Matrix: ${selectedProfile.matrix}`,
        icon: MessageSquare,
      })
    return methods
  }, [selectedProfile])

  const handleSendRequest = async () => {
    if (!selectedProfile || !selectedContactMethod) {
      toast.error("Please select a user and a contact method.")
      return
    }
    setIsSending(true)
    const [methodType, contactAddress] = selectedContactMethod.split(":")

    const requestMessage = `Hi ${selectedProfile.displayName},\n\nUser ${currentUserAddress.substring(0, 6)}... needs ${requiredAmount.toFixed(4)} ${tokenSymbol} on the ${networkDisplayName} network for whodb registration. Would you be able to help chip in?\n\n${customMessage ? `Personal message: ${customMessage}\n\n` : ""}Thanks!\nwhodb System`

    // Simulate sending message via bot
    console.log("Sending Chip-in Request:", {
      to: selectedProfile.displayName,
      contact: contactAddress,
      method: methodType,
      message: requestMessage,
    })
    await new Promise((resolve) => setTimeout(resolve, 1500))

    toast.success(`Chip-in request sent to ${selectedProfile.displayName} via ${methodType}.`)
    setIsSending(false)
    onClose()
    // Reset form
    setSearchQuery("")
    setSelectedProfile(null)
    setSelectedContactMethod("")
    setCustomMessage("")
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg bg-gray-800 border-pink-500/30 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl">Request Chip-in</DialogTitle>
          <DialogDescription className="text-gray-400">
            Ask another user to help with the registration fee of {requiredAmount.toFixed(4)} {tokenSymbol} on{" "}
            {networkDisplayName}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search for a user (name, email, matrix)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-700 border-gray-600 focus:border-pink-500"
              disabled={!!selectedProfile}
            />
            {selectedProfile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedProfile(null)
                  setSearchQuery("")
                  setSelectedContactMethod("")
                }}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs"
              >
                Clear
              </Button>
            )}
          </div>

          {isSearching && <Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" />}

          {!isSearching && searchResults.length > 0 && !selectedProfile && (
            <div className="max-h-40 overflow-y-auto space-y-1 border border-gray-700 rounded-md p-1 bg-gray-900/30">
              {searchResults.map((profile) => (
                <Button
                  key={profile.id}
                  variant="ghost"
                  className="w-full justify-start h-auto py-2 px-2 text-left"
                  onClick={() => handleSelectProfile(profile)}
                >
                  <img
                    src={profile.avatar || `/placeholder.svg?width=32&height=32&query=${profile.displayName}`}
                    alt=""
                    className="w-6 h-6 rounded-full mr-2"
                  />
                  <div>
                    <p className="text-sm font-medium text-white">{profile.displayName}</p>
                    <p className="text-xs text-gray-400">{profile.email || profile.matrix}</p>
                  </div>
                </Button>
              ))}
            </div>
          )}

          {selectedProfile && (
            <div className="p-3 bg-gray-700/50 rounded-md space-y-3">
              <div className="flex items-center">
                <img
                  src={
                    selectedProfile.avatar || `/placeholder.svg?width=40&height=40&query=${selectedProfile.displayName}`
                  }
                  alt=""
                  className="w-8 h-8 rounded-full mr-3"
                />
                <div>
                  <p className="font-semibold text-white">{selectedProfile.displayName}</p>
                  <p className="text-xs text-gray-400">Selected recipient</p>
                </div>
              </div>

              {availableContactMethods.length > 0 ? (
                <Select value={selectedContactMethod} onValueChange={setSelectedContactMethod}>
                  <SelectTrigger className="w-full bg-gray-700 border-gray-600 focus:border-pink-500">
                    <SelectValue placeholder="Select contact method" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 text-white">
                    {availableContactMethods.map((method) => (
                      <SelectItem key={method.value} value={method.value} className="hover:bg-gray-700">
                        <div className="flex items-center">
                          <method.icon className="w-4 h-4 mr-2 text-pink-400" />
                          {method.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-xs text-yellow-400">This user has no public contact methods for requests.</p>
              )}
            </div>
          )}

          <div>
            <Textarea
              placeholder="Add an optional message (e.g., how you know them, why you need help)..."
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="bg-gray-700 border-gray-600 focus:border-pink-500 min-h-[80px]"
              disabled={!selectedProfile}
            />
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <DialogClose asChild>
            <Button type="button" variant="outline" className="btn-outline">
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            onClick={handleSendRequest}
            disabled={!selectedProfile || !selectedContactMethod || isSending}
            className="btn-primary"
          >
            {isSending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Send Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
