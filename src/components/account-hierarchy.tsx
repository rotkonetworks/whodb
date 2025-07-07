"use client"

import { User, ExternalLink, PlusCircle, Edit2, Users } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { shortenAddress } from "@/lib/utils"
import type { Profile } from "@/lib/profile"
import Link from "next/link"
import { useRouter } from "next/navigation" // Import useRouter

interface AccountHierarchyProps {
  profile: Profile // The parent profile containing subaccounts
  isOwnProfile: boolean // To conditionally show Add/Edit buttons
}

export function AccountHierarchy({ profile, isOwnProfile }: AccountHierarchyProps) {
  const router = useRouter() // Initialize router

  const handleAddSubidentity = () => {
    router.push(`/register?flow=subidentity&parentId=${profile.id}`)
  }

  const handleEditSubidentity = (subId: string) => {
    router.push(`/register?editId=${subId}&flow=subidentity&parentId=${profile.id}`)
  }

  return (
    <div className="space-y-3">
      {isOwnProfile && (
        <div className="flex justify-end mb-3">
          <Button
            variant="ghost" // Changed from "outline"
            size="sm"
            className="text-pink-400 hover:bg-pink-500/10 hover:text-pink-300" // Adjusted classes for ghost-like appearance
            onClick={handleAddSubidentity}
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            Add Subidentity
          </Button>
        </div>
      )}
      {(!profile.subaccounts || profile.subaccounts.length === 0) && (
        <div className="text-center py-6 bg-gray-800/50 border border-gray-700 rounded-lg">
          <Users className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No subidentities linked yet.</p>
          {isOwnProfile && <p className="text-xs text-gray-600 mt-1">Click "Add Subidentity" to create one.</p>}
        </div>
      )}
      {profile.subaccounts &&
        profile.subaccounts.map((account) => (
          <Card
            key={account.id}
            className="bg-gray-800/70 border border-gray-700/80 hover:border-pink-500/30 transition-colors"
          >
            <CardContent className="p-2.5 sm:p-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                  <User className="w-4 h-4 text-pink-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate" title={account.displayName}>
                      {account.displayName}
                    </p>
                    <p className="text-xs text-gray-400 font-mono truncate" title={account.walletAddress}>
                      {shortenAddress(account.walletAddress, 5, 5)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-1.5 sm:space-x-2 self-end sm:self-center flex-shrink-0">
                  {isOwnProfile && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-xs h-auto p-1 sm:p-1.5 text-gray-400 hover:text-pink-300 hover:bg-pink-500/10 w-6 h-6 sm:w-7 sm:h-7"
                      onClick={() => handleEditSubidentity(account.id)}
                      aria-label={`Edit ${account.displayName}`}
                      title={`Edit ${account.displayName}`}
                    >
                      <Edit2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </Button>
                  )}
                  <Link href={`/profile/${account.id}`} passHref>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-xs h-auto p-1 sm:p-1.5 text-pink-400 hover:bg-pink-500/10 hover:text-pink-300 w-6 h-6 sm:w-7 sm:h-7"
                      aria-label={`View ${account.displayName}'s profile`}
                      title={`View ${account.displayName}'s profile`}
                    >
                      <ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
              {account.nickname && (
                <p className="text-xs text-gray-500 mt-1 sm:mt-1.5 pl-6 sm:pl-7" title={`Purpose: ${account.nickname}`}>
                  Purpose: {account.nickname}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
    </div>
  )
}
