import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from "react";
import { web3Enable, web3AccountsSubscribe, web3FromAddress } from "@polkadot/extension-dapp";
import { u8aToHex } from "@polkadot/util";
import { PolkadotSigner, SS58String } from "polkadot-api";
import { AccountData } from "../store/AccountStore";

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
  error: string | null;
}

const PolkadotWalletContext = createContext<PolkadotWalletContextType | undefined>(undefined);

export interface PolkadotWalletProviderProps {
  children: ReactNode;
  appName?: string;
}

export function PolkadotWalletProvider({ children, appName = "Polkadot Wallet" }: PolkadotWalletProviderProps) {
  const [extensions, setExtensions] = useState<InjectedExtension[]>([]);
  const [accounts, setAccounts] = useState<ExtendedAccountData[]>([]);
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
          // Create a placeholder PolkadotSigner - in a real implementation, 
          // you'd need to properly create this from the extension's signer
          const polkadotSigner: PolkadotSigner = {
            publicKey: new Uint8Array(), // This would need proper implementation
          } as PolkadotSigner;

          return {
            // AccountData properties
            name: account.meta.name || account.address,
            address: account.address as SS58String,
            encodedAddress: account.address as SS58String, // You might want to encode this properly
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

  const value: PolkadotWalletContextType = {
    extensions,
    accounts,
    isLoading,
    signRaw,
    signMessage,
    error,
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
