"use client"

import { useState } from "react"
import { User, LogOut, Settings, ChevronDown } from "lucide-react"
import { useUser } from "@/contexts/user-context"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export function UserMenu() {
  const { isLoggedIn, userProfile, logout } = useUser()
  const [isOpen, setIsOpen] = useState(false)

  if (!isLoggedIn) {
    return (
      <div className="flex items-center space-x-2">
        <Link href="/login">
          <Button size="sm" className="bg-gray-700 hover:bg-gray-600 text-white border border-gray-600">
            Login
          </Button>
        </Link>
        <Link href="/register">
          <Button size="sm" className="bg-pink-500 hover:bg-pink-600 text-white">
            Register
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-md border border-gray-700 bg-gray-800 hover:bg-gray-700"
      >
        <User className="w-4 h-4 text-pink-400" />
        <span className="text-sm">{userProfile?.displayName || "User"}</span>
        <ChevronDown className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-gray-800 border border-gray-700 z-50">
          <div className="py-1">
            <Link
              href={`/profile/${userProfile?.id}`}
              className="block px-4 py-2 text-sm hover:bg-gray-700"
              onClick={() => setIsOpen(false)}
            >
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4" />
                <span>My Profile</span>
              </div>
            </Link>
            <Link
              href="/settings"
              className="block px-4 py-2 text-sm hover:bg-gray-700"
              onClick={() => setIsOpen(false)}
            >
              <div className="flex items-center space-x-2">
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </div>
            </Link>
            <button
              className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-700 text-red-400"
              onClick={() => {
                logout()
                setIsOpen(false)
              }}
            >
              <div className="flex items-center space-x-2">
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
