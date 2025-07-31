import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode, use } from "react";
import { web3Enable, web3AccountsSubscribe, web3FromAddress } from "@polkadot/extension-dapp";
import { u8aToHex } from "@polkadot/util";
import { decodeAddress, encodeAddress } from "@polkadot/keyring";
import { PolkadotSigner, SS58String } from "polkadot-api";
import { AccountData } from "../store/AccountStore";
import { useTriggerLog } from "@/hooks/use-trigger-log";

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

export interface ExtendedAccountData extends Omit<AccountData, 'address' | 'encodedAddress'>, InjectedAccountWithMeta {
  // AccountData properties with SS58String types
  address: SS58String;
  encodedAddress: SS58String;
  polkadotSigner: PolkadotSigner;
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
  getSignerForAddress: (address: string) => Promise<PolkadotSigner | null>;
  error: string | null;

  // Additional functionality from useWalletAccounts
  getFormattedAccounts: (chainSs58Format: number) => ExtendedAccountData[];
  getWalletAccount: (address: SS58String | Uint8Array, chainSs58Format?: number) => ExtendedAccountData | null;
  connectedWallets: InjectedExtension[];
  disconnectAllWallets: () => void;
}

const PolkadotWalletContext = createContext<PolkadotWalletContextType | undefined>(undefined);

export interface PolkadotWalletProviderProps {
  children: ReactNode;
  appName?: string;
}

export function PolkadotWalletProvider({ children, appName = "Polkadot Wallet" }: PolkadotWalletProviderProps) {
  const [extensions, setExtensions] = useState<InjectedExtension[]>([]);
  const [accounts, setAccounts] = useState<ExtendedAccountData[]>([]);
  useTriggerLog(accounts, "PolkadotWalletProvider accounts");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const allAccountsSubscription = useRef<(() => void) | null>(null);

  // Enable extensions on mount
  useEffect(() => {
    setIsLoading(true);
    setError(null);

    web3Enable(appName).then((ext) => {
      if (ext.length === 0) {
        const errorMsg = "No extensions found. Make sure Polkadot.js extension is installed.";
        console.error(errorMsg);
        setError(errorMsg);
        setIsLoading(false);
        return;
      }
      console.log("Extensions enabled:", ext);
      setExtensions(ext as InjectedExtension[]);
    }).catch((err) => {
      const errorMsg = `Failed to enable extensions: ${err.message}`;
      console.error(errorMsg);
      setError(errorMsg);
      setIsLoading(false);
    });
  }, [appName]);

  // Load accounts when extensions are available
  useEffect(() => {
    if (extensions.length > 0) {
      web3AccountsSubscribe((injectedAccounts) => {
        console.log("Accounts updated:", injectedAccounts);

        // Transform InjectedAccountWithMeta to ExtendedAccountData
        const transformedAccounts: ExtendedAccountData[] = injectedAccounts.map((account) => {
          // Extract the publicKey from the account address
          const publicKey = decodeAddress(account.address);

          // Create a PolkadotSigner with the proper publicKey
          // TODO Use injector.signer as in signRaw
          const polkadotSigner: PolkadotSigner = {
            publicKey,
          } as PolkadotSigner;

          return {
            // AccountData properties
            name: account.meta.name || account.address,
            address: account.address as SS58String,
            encodedAddress: account.address as SS58String,
            polkadotSigner,
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

  const getSignerForAddress = useCallback(async (address: string): Promise<PolkadotSigner | null> => {
    if (!address) {
      throw new Error("No address provided for getting signer");
    }

    const injector = await web3FromAddress(address);
    if (!injector || !injector.signer) {
      console.warn(`No signer found for address ${address}`);
      return null;
    }
    return injector.signer;
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
      // Filter out accounts with invalid public keys, such as EVM accounts
      .filter(account => account.polkadotSigner?.publicKey && [1, 2, 4, 8, 32, 33].includes(account.polkadotSigner.publicKey.length))
      .map(account => ({
        ...account,
        encodedAddress: encodeAddress(account.polkadotSigner.publicKey, chainSs58Format),
      }));
  }, [accounts]);

  // Get wallet account by address
  const getWalletAccount = useCallback((address: SS58String | Uint8Array, chainSs58Format = 42) => {
    if (!address) return null;

    const decodedAddress: Uint8Array = typeof address === "string" ? decodeAddress(address) : address;
    const foundAccount = accounts.find(account =>
      account.polkadotSigner?.publicKey &&
      account.polkadotSigner.publicKey.every((byte, index) => byte === decodedAddress[index])
    );

    if (!foundAccount) {
      return null;
    }

    return {
      ...foundAccount,
      encodedAddress: encodeAddress(foundAccount.polkadotSigner.publicKey, chainSs58Format),
    };
  }, [accounts]);

  // Disconnect all wallets
  const disconnectAllWallets = useCallback(() => {
    // Browser extensions don't typically support programmatic disconnection
    // This would need to be handled at the application level by clearing state
    console.warn("Disconnect requested - browser extensions cannot be programmatically disconnected");
  }, []);

  const value: PolkadotWalletContextType = {
    extensions,
    accounts,
    isLoading,
    signRaw,
    signMessage,
    getSignerForAddress,
    error,

    // Additional functionality from useWalletAccounts
    getFormattedAccounts,
    getWalletAccount,
    connectedWallets: extensions,
    disconnectAllWallets,
  };

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
