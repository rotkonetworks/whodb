"use client"

import Link from "next/link"
import { Logo } from "@/app/components/logo"
import { NetworkSelector } from "@/components/network-selector"
import { ThemeToggle } from "@/components/theme-toggle"
import { UserMenu } from "@/components/user-menu"
import { useNetwork } from "@/contexts/network-context"
import { useUser } from "@/contexts/user-context"

export function Header() {
  const { isEncrypted } = useNetwork()
  const { isLoggedIn } = useUser()

  return (
    <header className="border-b border-pink-500/30 bg-gray-800/50 backdrop-blur-sm sticky top-0 z-10">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/">
              {/* Logo will use 'default' variant by default */}
              <Logo />
            </Link>
            {isLoggedIn && (
              <>
                <NetworkSelector />
                {/* {isEncrypted && (
                  <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded-full">Private Mode</span>
                )} */}
              </>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <UserMenu />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  )
}
