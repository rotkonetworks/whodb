"use client"

import type React from "react"

import { createContext, useContext, useState, useEffect } from "react"

interface UserProfile {
  id: string
  displayName: string
  nickname: string | null
  walletAddress: string
  isVerified: boolean
  judgement: string
  deposit: string
  network: string
  email?: string
  matrix?: string
  discord?: string
  twitter?: string
  github?: string
  website?: string
  pgpFingerprint?: string
}

interface UserContextType {
  isLoggedIn: boolean
  userProfile: UserProfile | null
  login: (address: string) => void
  logout: () => void
  isLoading: boolean
  updateProfile: (updates: Partial<UserProfile>) => void
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is logged in
    const savedSession = localStorage.getItem("userSession")
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession)
        setIsLoggedIn(true)
        setUserProfile(session.profile)
      } catch (error) {
        console.error("Failed to parse user session", error)
        localStorage.removeItem("userSession")
      }
    }
    setIsLoading(false)
  }, [])

  const login = async (address: string) => {
    setIsLoading(true)

    // Mock alice's profile data
    const aliceProfile: UserProfile = {
      id: "1",
      displayName: "alice",
      nickname: "alice.dot",
      walletAddress: address,
      isVerified: false,
      judgement: "Fee Paid",
      deposit: "0.2005900000 PAS",
      network: "paseo",
      email: "alice@example.org",
      matrix: "@alice:matrix.org",
      discord: "alice#1234",
      twitter: "@alice",
      github: "alice-dev",
      website: "alice.dev",
      pgpFingerprint: "3AA5 7A23 F091 DC24 3314 12AF 4268 A3AC 5A1A 4DF3",
    }

    setUserProfile(aliceProfile)
    setIsLoggedIn(true)
    localStorage.setItem("userSession", JSON.stringify({ profile: aliceProfile }))
    setIsLoading(false)
  }

  const logout = () => {
    setIsLoggedIn(false)
    setUserProfile(null)
    localStorage.removeItem("userSession")
  }

  const updateProfile = (updates: Partial<UserProfile>) => {
    if (userProfile) {
      const updatedProfile = { ...userProfile, ...updates }
      setUserProfile(updatedProfile)
      localStorage.setItem("userSession", JSON.stringify({ profile: updatedProfile }))
    }
  }

  return (
    <UserContext.Provider value={{ isLoggedIn, userProfile, login, logout, isLoading, updateProfile }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider")
  }
  return context
}
