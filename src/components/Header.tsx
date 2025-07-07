import { SelectLabel } from "@radix-ui/react-select";
import { Chains } from "@reactive-dot/core/internal.js";
import { useConnectedWallets, useSpendableBalance } from "@reactive-dot/react";
import { PolkadotIdenticon } from 'dot-identicon/react.js';
import { Sun, Moon, ShieldQuestion } from "lucide-react";
import { SS58String } from "polkadot-api";
import { useState } from "react";

import { Button } from "@/components/ui/button"
import {
  Select, SelectChangeHandler, SelectContent, SelectGroup, SelectItem, SelectSeparator,
  SelectTrigger, SelectValue
} from "@/components/ui/select"
import { ApiConfig } from "~/api/config";
import { useFormatAmount } from "~/hooks/useFormatAmount";
import { Account, AccountData } from "~/store/AccountStore";
import { ChainInfo } from "~/store/ChainStore";
import { AssetAmount } from "~/types";
import { Identity } from "~/types/Identity";

import { BalanceDisplay } from "./ui/balance-display";

const AccountListing = ({ address, name }: { address: SS58String, name: string }) => (
  <div className="flex items-center w-full min-w-0">
    <div className="flex-shrink-0">
      <PolkadotIdenticon address={address} />
    </div>
    <span className="mx-2 truncate min-w-0">{name}</span>
    <span className="flex-shrink-0">
      ({address.substring(0, 4)}...{address.substring(address.length - 4, address.length)})
    </span>
  </div>
)

const Header = ({
  config, chainStore, accountStore, identity, accounts, isTxBusy, isDark, balance,
  onChainSelect, onAccountSelect, onRequestWalletConnections, onToggleDark, openHelpDialog,
}: {
  accounts: AccountData[];
  config: ApiConfig;
  chainStore: ChainInfo;
  accountStore: Account;
  identity: Identity;
  isTxBusy: boolean;
  isDark: boolean;
  onChainSelect: (chainId: keyof ApiConfig["chains"]) => void;
  balance: AssetAmount;
  onAccountSelect: SelectChangeHandler;
  onRequestWalletConnections: () => void;
  onToggleDark: () => void;
  openHelpDialog: () => void;
}) => {
  const [isNetDropdownOpen, setNetDropdownOpen] = useState(false);
  const connectedWallets = useConnectedWallets()
  const [isUserDropdownOpen, setUserDropdownOpen] = useState(false)

  const allAccountBalances = useSpendableBalance(
    accounts.map(({ address }) => address),
    { chainId: chainStore.id as keyof Chains }
  )

  const shortFormatAmount = useFormatAmount({
    symbol: "",
    tokenDecimals: chainStore.tokenDecimals,
    decimals: 2,
  })
  const formatAmount = useFormatAmount({
    symbol: chainStore.tokenSymbol,
    tokenDecimals: chainStore.tokenDecimals,
  })

  return (
    <div className="flex flex-wrap justify-center sm:justify-between content-space-around mb-6 gap-2">
      <div className="flex gap-2 w-full sm:w-auto max-w-[300px]">
        <div className="flex-1 min-w-[180px]">
          <Select
            onValueChange={onAccountSelect}
            open={isUserDropdownOpen}
            onOpenChange={() => {
              if (connectedWallets.length > 0) {
                setUserDropdownOpen(open => !open)
              } else {
                setUserDropdownOpen(false)
                onRequestWalletConnections()
              }
            }}
            disabled={isTxBusy}
          >
            <SelectTrigger className="w-full bg-transparent border-[#E6007A] text-inherit min-w-0">
              <div className="w-full min-w-0">
                {(() => {
                  if (accountStore.address && accountStore.polkadotSigner) {
                    return <AccountListing address={accountStore.address} name={accountStore.name} />;
                  }
                  if (connectedWallets.length > 0) {
                    return <span>Select account</span>;
                  }
                  return <span>Connect wallet</span>;
                })()}
              </div>
            </SelectTrigger>
            <SelectContent>
              {connectedWallets.length > 0 && <>
                <SelectItem value={{ type: "Wallets" }}>Connect Wallets</SelectItem>
                <SelectItem value={{ type: "Teleport" }}>Teleport</SelectItem>
                <SelectItem value={{ type: "Disconnect" }}>Disconnect</SelectItem>
                {identity.info && accountStore.polkadotSigner && <>
                  <SelectItem value={{ type: "RemoveIdentity" }}>Remove Identity</SelectItem>
                </>}
                <SelectSeparator />
                <SelectGroup>
                  {accounts.length > 0
                    ? <>
                      <SelectLabel>Accounts</SelectLabel>
                      {accounts.map(({ name, address, encodedAddress, ...rest }, index) => {
                        const account = { name, address, ...rest };
                        return (
                          <SelectItem key={address} value={{ type: "account", account }} className="max-w-sm">
                            <div className="flex items-center w-full min-w-0">
                              <div className="flex-shrink-0">
                                <PolkadotIdenticon address={encodedAddress} />
                              </div>
                              <span className="mx-2 truncate min-w-0">{name}</span>
                              <span className="flex-shrink-0 pe-2">
                                ({encodedAddress.substring(0, 4)}...{encodedAddress.substring(encodedAddress.length - 4, encodedAddress.length)})
                              </span>
                              <BalanceDisplay balance={allAccountBalances?.[index]?.planck} formatter={shortFormatAmount} />
                            </div>
                          </SelectItem>
                        );
                      })}
                    </>
                    : <>
                      <SelectLabel>No accounts found</SelectLabel>
                    </>
                  }
                </SelectGroup>
              </>}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-[100px]">
          <Select
            open={isNetDropdownOpen}
            onOpenChange={setNetDropdownOpen}
            onValueChange={onChainSelect}
            disabled={isTxBusy}
          >
            <SelectTrigger className="w-full bg-transparent border-[#E6007A] text-inherit">
              <SelectValue placeholder={chainStore.name?.replace("People", "")} />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(config.chains)
                .filter(([key]) =>
                  import.meta.env.VITE_APP_AVAILABLE_CHAINS
                    ? import.meta.env.VITE_APP_AVAILABLE_CHAINS.split(',').map(key => key.trim())
                      .includes(key)
                    : key.includes("people")
                )
                .map(([key, net]: [string, { name: string }]) => (
                  <SelectItem key={key} value={key}>
                    {net.name.replace("People", "")}
                  </SelectItem>
                ))
              }
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex gap-2">
        <BalanceDisplay balance={balance} formatter={formatAmount} />
        <Button
          variant="outline"
          size="icon"
          className="border-[#E6007A] text-inherit hover:bg-[#E6007A] hover:text-[#FFFFFF]"
          onClick={() => openHelpDialog()}
        >
          <ShieldQuestion className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="border-[#E6007A] text-inherit hover:bg-[#E6007A] hover:text-[#FFFFFF]"
          onClick={() => onToggleDark()}
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

export default Header;
