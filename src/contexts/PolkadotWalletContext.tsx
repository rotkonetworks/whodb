import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback, ReactNode } from "react";
import { web3Enable, web3AccountsSubscribe, web3FromAddress } from "@polkadot/extension-dapp";
import { u8aToHex } from "@polkadot/util";
import { decodeAddress, encodeAddress } from "@polkadot/keyring";
import { SS58String } from "polkadot-api";
import { AccountData } from "../store/AccountStore";
import { useTriggerLog } from "@/hooks/use-trigger-log";
import { Signer } from "@polkadot/api/types";
import { getPublicKey } from "@/utils/wallets-accounts";

// Define the account type based on what we actually get from the extension
export interface InjectedAccountWithMeta {
  address: string;
  meta: {
    genesisHash?: string | null;
    name?: string;
    source: string;
  };
  type?: string;
}

export interface InjectedExtension {
  name: string;
  version: string;
  accounts: {
    get: () => Promise<InjectedAccountWithMeta[]>;
    subscribe?: (cb: (accounts: InjectedAccountWithMeta[]) => void) => () => void;
  };
  metadata?: any;
  provider?: any;
  signer?: any;
}

// Extended account data that combines AccountData with InjectedAccountWithMeta
export interface ExtendedAccountData extends AccountData, InjectedAccountWithMeta {
  // Inherits all properties from both interfaces
  address: SS58String;
  encodedAddress: SS58String;
  publicKey?: string; // Hex-encoded public key for cross-network identification
}

export interface SignRawParams {
  address: string;
  data: string;
  type: "bytes" | "payload";
}

export interface PolkadotWalletContextType {
  extensions: InjectedExtension[];
  accounts: ExtendedAccountData[];
  isLoading: boolean;
  signRaw: (params: SignRawParams) => Promise<{ signature: string }>;
  signMessage: (address: string, message: string) => Promise<{ signature: string }>;
  getSignerForAddress: (address: string) => Promise<Signer | null>;
  error: string | null;

  // Additional functionality from useWalletAccounts
  getFormattedAccounts: (chainSs58Format: number) => ExtendedAccountData[];
  getWalletAccount: (address: SS58String | Uint8Array, chainSs58Format?: number) => ExtendedAccountData | null;
  connectedWallets: InjectedExtension[];
  disconnectAllWallets: () => void;

  // Lazy initialization
  initializeWallets: () => Promise<void>;
  isInitialized: boolean;
}

const PolkadotWalletContext = createContext<PolkadotWalletContextType | undefined>(undefined);

export interface PolkadotWalletProviderProps {
  children: ReactNode;
  appName?: string;
  autoConnect?: boolean;
}

export function PolkadotWalletProvider({ children, appName = "Polkadot Wallet", autoConnect: _autoConnect = true }: PolkadotWalletProviderProps) {
  const [extensions, setExtensions] = useState<InjectedExtension[]>([]);
  const [accounts, setAccounts] = useState<ExtendedAccountData[]>([]);
  useTriggerLog(accounts, "PolkadotWalletProvider accounts");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [_isConnected, _setIsConnected] = useState(false);

  const allAccountsSubscription = useRef<(() => void) | null>(null);

  // Lazy initialization function - only called when needed
  const initializeWallets = useCallback(async () => {
    if (isInitialized) return;

    setIsLoading(true);
    setError(null);

    try {
      const ext = await web3Enable(appName);
      if (ext.length === 0) {
        const errorMsg = "No wallet found. Please install a Polkadot wallet extension.";
        console.error(errorMsg);
        setError(errorMsg);
        setIsLoading(false);
        setIsInitialized(true); // Mark as initialized so button can show "Install" state
        return;
      }
      setExtensions(ext as InjectedExtension[]);
      setIsInitialized(true);
    } catch (err: any) {
      const errorMsg = `Failed to enable extensions: ${err.message}`;
      console.error(errorMsg);
      setError(errorMsg);
      setIsLoading(false);
    }
  }, [appName, isInitialized]);

  // Load accounts when extensions are available
  useEffect(() => {
    if (extensions.length > 0) {
      web3AccountsSubscribe((injectedAccounts) => {
        // Transform InjectedAccountWithMeta to ExtendedAccountData
        const transformedAccounts: ExtendedAccountData[] = injectedAccounts
          .filter(account => {
            try {
              const publicKey = getPublicKey(account.address);
              return Boolean(publicKey);
            } catch {
              // Filter out accounts with invalid addresses, such as EVM accounts, as they don't 
              //  work well with Polkadot.js
              return false;
            }
          })
          .map((account) => {
            let publicKey: string | undefined;
            try {
              const pk = getPublicKey(account.address);
              publicKey = pk ? u8aToHex(pk) : undefined;
            } catch {
              publicKey = undefined;
            }

            return {
              // AccountData properties
              name: account.meta.name || account.address,
              address: account.address as SS58String,
              encodedAddress: account.address as SS58String,
              publicKey,
              disabled: false,

              // InjectedAccountWithMeta properties
              meta: account.meta,
              type: account.type,
            };
          });

        setAccounts(transformedAccounts);
        setIsLoading(false);
        setError(null);
      }).then((unsub) => {
        allAccountsSubscription.current = unsub;
      }).catch((err) => {
        const errorMsg = `Failed to subscribe to accounts: ${err.message}`;
        console.error(errorMsg);
        setError(errorMsg);
        setIsLoading(false);
      });
    }

    return () => {
      if (allAccountsSubscription.current) {
        allAccountsSubscription.current();
      }
    };
  }, [extensions]);

  const getSignerForAddress = useCallback(async (address: string): Promise<Signer | null> => {
    // Input validation
    if (!address || typeof address !== 'string' || address.trim().length === 0) {
      throw new Error("Invalid address provided for getting signer");
    }

    try {
      // Validate address format before making the call
      decodeAddress(address);
    } catch {
      throw new Error("Invalid address format for getting signer");
    }

    try {
      const injector = await web3FromAddress(address);
      if (!injector || !injector.signer) {
        console.warn(`No signer available for the requested address`);
        return null;
      }
      return injector.signer;
    } catch (error) {
      console.error("Error getting signer:", error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }, []);

  // Sign raw data function
  const signRaw = useCallback(async (params: SignRawParams): Promise<{ signature: string }> => {
    if (!params.address) {
      throw new Error("No address provided for signing");
    }

    try {
      // Get injector for the selected account
      const injector = await web3FromAddress(params.address);

      // Check if signer and signRaw are available
      if (!injector.signer || !injector.signer.signRaw) {
        throw new Error("Signer or signRaw method not available");
      }

      // Use the extension's signer to sign raw data
      const result = await injector.signer.signRaw({
        address: params.address,
        data: params.data,
        type: params.type,
      });

      return { signature: result.signature };
    } catch (err) {
      const errorMsg = `Failed to sign data: ${err instanceof Error ? err.message : 'Unknown error'}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  // Convenience function to sign a string message
  const signMessage = useCallback(async (address: string, message: string): Promise<{ signature: string }> => {
    const payload = new TextEncoder().encode(message);
    return signRaw({
      address,
      data: u8aToHex(payload),
      type: "bytes",
    });
  }, [signRaw]);

  // Get formatted accounts with specific SS58 format
  const getFormattedAccounts = useCallback((chainSs58Format: number) => {
    return accounts
      // Map and filter in one pass to avoid double getPublicKey calls
      .map(account => {
        try {
          const publicKey = getPublicKey(account.address);
          if (publicKey) {
            return {
              ...account,
              encodedAddress: encodeAddress(publicKey, chainSs58Format),
              publicKey: u8aToHex(publicKey),
            };
          }
          return null;
        } catch {
          return null;
        }
      })
      .filter((account): account is NonNullable<typeof account> => account !== null);
  }, [accounts]);

  // Get wallet account by address (default to Polkadot format 0, not generic substrate 42)
  const getWalletAccount = useCallback((address: SS58String | Uint8Array, chainSs58Format = 0) => {
    if (!address) return null;

    try {
      const decodedAddress: Uint8Array = typeof address === "string" ? decodeAddress(address) : address;
      const foundAccount = accounts.find(account => {
        try {
          const publicKey = getPublicKey(account.address);
          return publicKey && publicKey.every((byte: number, index: number) => byte === decodedAddress[index]);
        } catch {
          return false;
        }
      });

      if (!foundAccount) {
        return null;
      }

      try {
        const publicKey = getPublicKey(foundAccount.address);
        return {
          ...foundAccount,
          encodedAddress: encodeAddress(publicKey, chainSs58Format),
          publicKey: u8aToHex(publicKey),
        };
      } catch {
        console.warn("Failed to encode address for found account");
        return null;
      }
    } catch {
      console.warn("Invalid address provided to getWalletAccount");
      return null;
    }
  }, [accounts]);

  // Disconnect all wallets
  const disconnectAllWallets = useCallback(() => {
    // Browser extensions don't typically support programmatic disconnection
    // This would need to be handled at the application level by clearing state
    console.warn("Disconnect requested - browser extensions cannot be programmatically disconnected");
  }, []);

  const value = useMemo<PolkadotWalletContextType>(() => ({
    extensions,
    accounts,
    isLoading,
    signRaw,
    signMessage,
    getSignerForAddress,
    error,
    getFormattedAccounts,
    getWalletAccount,
    connectedWallets: extensions,
    disconnectAllWallets,
    initializeWallets,
    isInitialized,
  }), [extensions, accounts, isLoading, signRaw, signMessage, getSignerForAddress, error, getFormattedAccounts, getWalletAccount, disconnectAllWallets, initializeWallets, isInitialized]);

  return (
    <PolkadotWalletContext.Provider value={value}>
      {children}
    </PolkadotWalletContext.Provider>
  );
}

// Custom hook to use the context
export function usePolkadotWallet(): PolkadotWalletContextType {
  const context = useContext(PolkadotWalletContext);
  if (context === undefined) {
    throw new Error('usePolkadotWallet must be used within a PolkadotWalletProvider');
  }
  return context;
}
