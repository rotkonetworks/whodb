"use client"

import type React from "react"

import { createContext, useContext, useState } from "react"

interface WalletContextType {
  isConnected: boolean
  address: string | null
  connect: () => Promise<void>
  disconnect: () => void
  signTransaction: (transaction: any) => Promise<string>
  isConnecting: boolean
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false)
  const [address, setAddress] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)

  const connect = async () => {
    setIsConnecting(true)

    // Simulate wallet connection
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Mock wallet address
    const mockAddress = "13KVFndw5GXkwPSzNtd2FHGdJnFN3Z3zTvbjdQfDGpQYYpiK"
    setAddress(mockAddress)
    setIsConnected(true)
    setIsConnecting(false)
  }

  const disconnect = () => {
    setIsConnected(false)
    setAddress(null)
  }

  const signTransaction = async (transaction: any) => {
    // Simulate transaction signing
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Return mock transaction hash
    return "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
  }

  return (
    <WalletContext.Provider value={{ isConnected, address, connect, disconnect, signTransaction, isConnecting }}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider")
  }
  return context
}
