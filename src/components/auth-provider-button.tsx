"use client"

import type React from "react"
import { Button } from "@/components/ui/button"

interface AuthProviderButtonProps {
  providerName: string
  icon: React.ReactNode
  onClick: () => void
  className?: string
  disabled?: boolean
}

export function AuthProviderButton({
  providerName,
  icon,
  onClick,
  className = "",
  disabled = false,
}: AuthProviderButtonProps) {
  return (
    <Button
      variant="ghost" // Changed to ghost
      onClick={onClick}
      className={`w-full flex items-center justify-center py-3 text-sm font-medium transition-colors duration-150
            text-gray-300 hover:bg-white/10 hover:text-white  // Applied ghost styling
            focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900
            disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
      disabled={disabled}
    >
      <span className="mr-2.5">{icon}</span>
      Login with {providerName}
    </Button>
  )
}
