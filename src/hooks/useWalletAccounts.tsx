import { decodeAddress, encodeAddress } from "@polkadot/keyring";
import { useAccounts, useConnectedWallets, useWalletDisconnector } from "@reactive-dot/react";
import _ from "lodash";
import { SS58String } from "polkadot-api";
import { useCallback, useDeferredValue, useMemo } from "react";

interface UseWalletAccountsProps {
  chainSs58Format: number;
}

export function useWalletAccounts({
  chainSs58Format,
}: UseWalletAccountsProps) {
  //const _accounts = useAccounts();
  //const _connectedWallets = useConnectedWallets();
  
  // Get accounts from wallet
  // TODO Connect to wallet and fetch accounts
  const accounts = [];
  const connectedWallets = [];

  const isLoading = false; // TODO Replace with actual loading state if needed

  const disconnectWallet = [] as (() => void)[];

  // Format accounts with proper SS58 format
  const formattedAccounts = useMemo(() => accounts
    // First filter out accounts with invalid public keys, such as EVM accounts
    .filter(account => [1, 2, 4, 8, 32, 33].includes(account.polkadotSigner.publicKey.length))
    .map(account => ({
      ...account,
      encodedAddress: encodeAddress(account.polkadotSigner.publicKey, chainSs58Format),
    })
  ), [accounts, chainSs58Format]);

  // Get wallet account by address
  const getWalletAccount = useCallback((address: SS58String | Uint8Array) => {
    if (!address) return null;
    
    const decodedAddress: Uint8Array = typeof address==="string" ? decodeAddress(address) : address;
    const foundAccount = accounts.find(account => account.polkadotSigner.publicKey
      .every((byte, index) => byte === decodedAddress[index])
    );

    if (!foundAccount) {
      return null;
    }

    return {
      name: foundAccount.name,
      polkadotSigner: foundAccount.polkadotSigner,
      address: foundAccount.address,
      encodedAddress: encodeAddress(foundAccount.polkadotSigner.publicKey, chainSs58Format),
    };
  }, [accounts, chainSs58Format]);

  // Disconnect all wallets
  const disconnectAllWallets = useCallback(() => {
    connectedWallets.forEach(w => disconnectWallet(w));
  }, [connectedWallets, disconnectWallet]);

  return {
    accounts: formattedAccounts,
    isLoading,
    connectedWallets,
    getWalletAccount,
    disconnectAllWallets,
  };
}
