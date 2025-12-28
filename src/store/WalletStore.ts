import { proxy } from "valtio";
import { SS58String } from "polkadot-api";

export interface ExtendedAccountData {
  name: string;
  address: SS58String;
  encodedAddress?: SS58String;
  source?: string;
  type?: string;
  disabled?: boolean;
}

export interface WalletState {
  accounts: ExtendedAccountData[];
  selectedAccount: ExtendedAccountData | null;
  connectedWallets: string[];
  isConnecting: boolean;
  error: string | null;
}

// Fine-grained wallet store - avoids re-rendering when only account order changes
export const walletStore = proxy<WalletState>({
  accounts: [],
  selectedAccount: null,
  connectedWallets: [],
  isConnecting: false,
  error: null,
});

// Helper to check if accounts actually changed (by address)
const accountsEqual = (
  a: ExtendedAccountData[],
  b: ExtendedAccountData[]
): boolean => {
  if (a.length !== b.length) return false;
  return a.every((acc, i) => acc.address === b[i]?.address);
};

// Actions
export const setAccounts = (accounts: ExtendedAccountData[]) => {
  // Only update if accounts actually changed (prevent unnecessary re-renders)
  if (!accountsEqual(walletStore.accounts, accounts)) {
    walletStore.accounts = accounts;
  }
};

export const setSelectedAccount = (account: ExtendedAccountData | null) => {
  walletStore.selectedAccount = account;
};

export const addConnectedWallet = (wallet: string) => {
  if (!walletStore.connectedWallets.includes(wallet)) {
    walletStore.connectedWallets.push(wallet);
  }
};

export const removeConnectedWallet = (wallet: string) => {
  const index = walletStore.connectedWallets.indexOf(wallet);
  if (index > -1) {
    walletStore.connectedWallets.splice(index, 1);
  }
};

export const setIsConnecting = (isConnecting: boolean) => {
  walletStore.isConnecting = isConnecting;
};

export const setError = (error: string | null) => {
  walletStore.error = error;
};

export const clearWalletState = () => {
  walletStore.accounts = [];
  walletStore.selectedAccount = null;
  walletStore.connectedWallets = [];
  walletStore.error = null;
};
