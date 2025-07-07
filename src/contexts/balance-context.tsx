"use client"

import type React from "react"

import { createContext, useContext, useState } from "react"
import { useNetwork } from "@/contexts/network-context"

interface BalanceContextType {
  balance: string
  isLoading: boolean
  checkBalance: (address: string) => Promise<void>
  requestTokens: (address: string) => Promise<boolean>
  isRequestingTokens: boolean
}

const BalanceContext = createContext<BalanceContextType | undefined>(undefined)

export function BalanceProvider({ children }: { children: React.ReactNode }) {
  const [balance, setBalance] = useState("0.0000000000")
  const [isLoading, setIsLoading] = useState(false)
  const [isRequestingTokens, setIsRequestingTokens] = useState(false)
  const { network } = useNetwork()

  const checkBalance = async (address: string) => {
    setIsLoading(true)

    // Simulate websocket connection and balance check
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Mock different balances based on network
    let mockBalance = "0.0000000000"
    if (network === "paseo") {
      // Random balance between 0 and 2 PSO for demo
      const randomBalance = Math.random() * 2
      mockBalance = randomBalance.toFixed(10)
    } else if (network === "polkadot") {
      // Usually higher balances on mainnet
      const randomBalance = Math.random() * 10 + 5
      mockBalance = randomBalance.toFixed(10)
    } else if (network === "kusama") {
      // Medium balances on Kusama
      const randomBalance = Math.random() * 5 + 1
      mockBalance = randomBalance.toFixed(10)
    }

    setBalance(mockBalance)
    setIsLoading(false)
  }

  const requestTokens = async (address: string) => {
    setIsRequestingTokens(true)

    // Simulate token distribution
    await new Promise((resolve) => setTimeout(resolve, 3000))

    // Add 2 PSO to balance
    const currentBalance = Number.parseFloat(balance)
    const newBalance = (currentBalance + 2).toFixed(10)
    setBalance(newBalance)

    setIsRequestingTokens(false)
    return true
  }

  return (
    <BalanceContext.Provider value={{ balance, isLoading, checkBalance, requestTokens, isRequestingTokens }}>
      {children}
    </BalanceContext.Provider>
  )
}

export function useBalance() {
  const context = useContext(BalanceContext)
  if (context === undefined) {
    throw new Error("useBalance must be used within a BalanceProvider")
  }
  return context
}
