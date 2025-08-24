import { useCallback } from "react";
import { usePolkadotWallet } from "../contexts/PolkadotWalletContext";
import { useTriggerLog } from "./use-trigger-log";

interface UseWalletAccountsProps {
  chainSs58Format: number;
}

export function useWalletAccounts({
  chainSs58Format,
}: UseWalletAccountsProps) {
  // Get everything from PolkadotWalletContext
  const {
    accounts,
    getFormattedAccounts,
    getWalletAccount,
    connectedWallets,
    disconnectAllWallets,
    isLoading,
    error,
  } = usePolkadotWallet();

  // Get formatted accounts for the specific chain
  const formattedAccounts = getFormattedAccounts(chainSs58Format);

  // Create a wrapper for getWalletAccount with the chainSs58Format pre-applied
  const getWalletAccountForChain = useCallback((address: string | Uint8Array) => {
    return getWalletAccount(address, chainSs58Format);
  }, [getWalletAccount, chainSs58Format]);
  useTriggerLog(getWalletAccountForChain, "getWalletAccountForChain");

  useTriggerLog(accounts, "useWalletAccounts accounts");

  return {
    accounts: formattedAccounts,
    connectedWallets,
    getWalletAccount: getWalletAccountForChain,
    disconnectAllWallets,
    isLoading,
    error,
  };
}
