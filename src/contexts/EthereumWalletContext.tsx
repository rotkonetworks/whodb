import { createContext, useContext, useEffect, useMemo, useState, useCallback, ReactNode } from "react";
import type { SS58String as _SS58String } from "polkadot-api";

// Extend Window interface to include ethereum
declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, handler: (...args: any[]) => void) => void;
      removeListener: (event: string, handler: (...args: any[]) => void) => void;
      selectedAddress?: string | null;
    };
  }
}

export interface EthereumAccount {
  address: string;
  name?: string;
  type: "ethereum";
}

export interface EthereumWalletContextType {
  accounts: EthereumAccount[];
  isLoading: boolean;
  error: string | null;
  isMetaMaskInstalled: boolean;
  connectWallet: () => Promise<void>;
  isInitialized: boolean;
  selectedAccount: EthereumAccount | null;
  selectAccount: (account: EthereumAccount) => void;
  disconnect: () => void;
  signMessage: (address: string, message: string) => Promise<{ signature: string }>;
}

const EthereumWalletContext = createContext<EthereumWalletContextType | undefined>(undefined);

export interface EthereumWalletProviderProps {
  children: ReactNode;
}

export function EthereumWalletProvider({ children }: EthereumWalletProviderProps) {
  const [accounts, setAccounts] = useState<EthereumAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<EthereumAccount | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMetaMaskInstalled = typeof window !== "undefined" && typeof window.ethereum !== "undefined";

  // Connect to MetaMask
  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      setError("MetaMask is not installed");
      setIsInitialized(true);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Request account access
      const accountAddresses: string[] = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (accountAddresses.length === 0) {
        setError("No accounts found");
        setIsLoading(false);
        setIsInitialized(true);
        return;
      }

      const ethereumAccounts: EthereumAccount[] = accountAddresses.map((address) => ({
        address,
        name: `Ethereum Account ${address.slice(0, 6)}...${address.slice(-4)}`,
        type: "ethereum" as const,
      }));

      setAccounts(ethereumAccounts);

      // Auto-select first account if none selected
      if (!selectedAccount && ethereumAccounts.length > 0) {
        setSelectedAccount(ethereumAccounts[0]);
      }

      setIsInitialized(true);
      setIsLoading(false);
    } catch (err: any) {
      const errorMsg = `Failed to connect to MetaMask: ${err.message}`;
      console.error(errorMsg);
      setError(errorMsg);
      setIsLoading(false);
      setIsInitialized(true);
    }
  }, [selectedAccount]);

  // Listen for account changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accountAddresses: string[]) => {
      if (accountAddresses.length === 0) {
        setAccounts([]);
        setSelectedAccount(null);
      } else {
        const ethereumAccounts: EthereumAccount[] = accountAddresses.map((address) => ({
          address,
          name: `Ethereum Account ${address.slice(0, 6)}...${address.slice(-4)}`,
          type: "ethereum" as const,
        }));
        setAccounts(ethereumAccounts);

        // Update selected account if it changed
        if (selectedAccount && !accountAddresses.includes(selectedAccount.address)) {
          setSelectedAccount(ethereumAccounts[0]);
        }
      }
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      }
    };
  }, [selectedAccount]);

  // Select account
  const selectAccount = useCallback((account: EthereumAccount) => {
    setSelectedAccount(account);
  }, []);

  // Disconnect
  const disconnect = useCallback(() => {
    setSelectedAccount(null);
    setAccounts([]);
    setIsInitialized(false);
  }, []);

  // Sign message with MetaMask
  const signMessage = useCallback(async (address: string, message: string): Promise<{ signature: string }> => {
    if (!window.ethereum) {
      throw new Error("MetaMask is not installed");
    }

    try {
      const signature = await window.ethereum.request({
        method: "personal_sign",
        params: [message, address],
      });

      return { signature };
    } catch (err: any) {
      const errorMsg = `Failed to sign message: ${err.message}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const value = useMemo<EthereumWalletContextType>(() => ({
    accounts,
    isLoading,
    error,
    isMetaMaskInstalled,
    connectWallet,
    isInitialized,
    selectedAccount,
    selectAccount,
    disconnect,
    signMessage,
  }), [accounts, isLoading, error, isMetaMaskInstalled, connectWallet, isInitialized, selectedAccount, selectAccount, disconnect, signMessage]);

  return (
    <EthereumWalletContext.Provider value={value}>
      {children}
    </EthereumWalletContext.Provider>
  );
}

// Custom hook to use the context
export function useEthereumWallet(): EthereumWalletContextType {
  const context = useContext(EthereumWalletContext);
  if (context === undefined) {
    throw new Error('useEthereumWallet must be used within an EthereumWalletProvider');
  }
  return context;
}
