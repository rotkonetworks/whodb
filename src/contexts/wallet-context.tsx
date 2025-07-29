import type React from "react"
import { createContext, useContext, useState, useCallback } from "react"
import { usePolkadotWallet, type ExtendedAccountData, type SignRawParams } from "../contexts/PolkadotWalletContext"
import { PolkadotSigner, SS58String } from "polkadot-api"

interface AccountContextType {
  // Properties from AccountData
  name: string | null
  address: SS58String | null
  encodedAddress: SS58String | null
  polkadotSigner: PolkadotSigner | null
  disabled: boolean

  // Connection state
  isConnected: boolean
  isConnecting: boolean

  // Available accounts from wallet
  accounts: ExtendedAccountData[]
  isLoadingAccounts: boolean
  accountsError: string | null

  // Actions
  selectAccount: (account: ExtendedAccountData) => void
  disconnect: () => void

  // Signing capabilities from usePolkadotWallet
  signRaw: (params: SignRawParams) => Promise<{ signature: string }>
  signMessage: (message: string) => Promise<{ signature: string }>
  signTransaction: (transaction: any) => Promise<string>
}

const AccountContext = createContext<AccountContextType | undefined>(undefined)

export function AccountProvider({ children }: { children: React.ReactNode }) {
  // Current selected account state
  const [selectedAccount, setSelectedAccount] = useState<ExtendedAccountData | null>(null)

  // Get wallet accounts and signing capabilities
  const {
    accounts,
    isLoading: isLoadingAccounts,
    error: accountsError,
    signRaw: walletSignRaw,
    signMessage: walletSignMessage
  } = usePolkadotWallet()

  const selectAccount = useCallback((account: ExtendedAccountData) => {
    setSelectedAccount(account)
  }, [])

  const disconnect = useCallback(() => {
    setSelectedAccount(null)
  }, [])

  const signRaw = useCallback(async (params: SignRawParams) => {
    if (!selectedAccount) {
      throw new Error("No account selected for signing")
    }
    // Use the selected account's address for signing
    return walletSignRaw({ ...params, address: selectedAccount.address })
  }, [selectedAccount, walletSignRaw])

  const signMessage = useCallback(async (message: string) => {
    if (!selectedAccount) {
      throw new Error("No account selected for signing")
    }
    return walletSignMessage(selectedAccount.address, message)
  }, [selectedAccount, walletSignMessage])

  const signTransaction = useCallback(async (transaction: any) => {
    if (!selectedAccount) {
      throw new Error("No account selected for signing")
    }

    // This is a wrapper around signRaw for transaction signing
    // In a real implementation, you would serialize the transaction properly
    const signature = await signRaw({
      address: selectedAccount.address,
      data: JSON.stringify(transaction), // This should be proper transaction serialization
      type: "payload"
    })

    return signature.signature
  }, [selectedAccount, signRaw])

  const value: AccountContextType = {
    // AccountData properties from selected account
    name: selectedAccount?.name || null,
    address: selectedAccount?.address || null,
    encodedAddress: selectedAccount?.encodedAddress || null,
    polkadotSigner: selectedAccount?.polkadotSigner || null,
    disabled: selectedAccount?.disabled || false,

    // Connection state
    isConnected: !!selectedAccount,
    isConnecting: isLoadingAccounts,

    // Available accounts
    accounts,
    isLoadingAccounts,
    accountsError,

    // Actions
    selectAccount,
    disconnect,

    // Signing capabilities
    signRaw,
    signMessage,
    signTransaction,
  }

  return (
    <AccountContext.Provider value={value}>
      {children}
    </AccountContext.Provider>
  )
}

export function useAccount() {
  const context = useContext(AccountContext)
  if (context === undefined) {
    throw new Error("useAccount must be used within an AccountProvider")
  }
  return context
}

// Keep the old useWallet for backward compatibility during migration
export function useWallet() {
  const account = useAccount()
  return {
    isConnected: account.isConnected,
    address: account.address,
    connect: async () => {
      // For backward compatibility, if there are accounts available, select the first one
      if (account.accounts.length > 0) {
        account.selectAccount(account.accounts[0])
      }
    },
    disconnect: account.disconnect,
    signTransaction: account.signTransaction,
    isConnecting: account.isConnecting,
  }
}
