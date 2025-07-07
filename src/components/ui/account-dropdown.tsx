import { ChevronDown, Check, User, Wallet } from "lucide-react";
import { SS58String } from "polkadot-api";
import { useState } from "react";

import { AccountData } from "@/store/AccountStore";
import { usePolkadotApi } from "@/contexts/PolkadotApiContext";
import { Card, CardContent } from "./card";
import { useSpendableBalance } from "@reactive-dot/react";
import { Badge } from "./badge";
import { PolkadotIdenticon } from "dot-identicon/react.js";

// Component to display individual account balance
const AccountBalance = ({ address, chainId }: { address: SS58String; chainId: string }) => {
  const { formatAmount } = usePolkadotApi();
  const balance = useSpendableBalance(address, { chainId: chainId as any });
  
  return (
    <span className="text-xs text-gray-400">
      {formatAmount ? formatAmount(balance.planck) : `${balance.planck.toString()} units`}
    </span>
  );
};

export const AccountDropdown = ({
  accounts: providedAccounts, address, onAddressSelect: onAddressChange, id, open, handleOpen, disabled = false
}: {
  id: string,
  accounts?: AccountData[],
  address?: SS58String,
  onAddressSelect: (address: SS58String) => void,
  open?: boolean,
  handleOpen?: (open: boolean) => void,
  disabled?: boolean
}) => {
  const { accounts: availableAccounts, chainStore } = usePolkadotApi()
  const accounts = providedAccounts ?? availableAccounts;

  const [_open, setOpen] = useState(false);
  const isOpen = typeof open === "boolean" ? open : _open;
  
  const selectedAccount = accounts.find((account: AccountData) => account.address === address);
  const [hoveredAccount, setHoveredAccount] = useState<string | null>(null);

  const handleAccountChange = (selectedAddress: SS58String) => {
    onAddressChange(selectedAddress);
    handleOpen ? handleOpen(false) : setOpen(false);
  };

  const toggleOpen = () => {
    if (disabled) return;
    const newOpen = !isOpen;
    setOpen(newOpen);
    if (handleOpen) {
      handleOpen(newOpen);
    }
  };

  return (
    <div className="relative">
      <button
        id={id}
        onClick={toggleOpen}
        disabled={disabled}
        className={`flex items-center justify-between w-full px-4 py-2 rounded-md border border-gray-700 bg-gray-800 text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed ${disabled ? '' : 'cursor-pointer'}`}
      >
        <div className="text-left truncate flex-1">
          {selectedAccount ? (
            <div className="flex flex-col">
              <span className="font-medium">
                {selectedAccount.name || "Unnamed Account"}
              </span>
              <span className="text-xs text-gray-400 font-mono truncate">
                {selectedAccount.address}
              </span>
            </div>
          ) : (
            <span>Select account</span>
          )}
        </div>
        <ChevronDown className="w-4 h-4 shrink-0 ml-2" />
      </button>

      {isOpen && !disabled && (
        <div className="absolute mt-2 w-full min-w-48 rounded-md shadow-lg bg-gray-900 border border-gray-700 z-50 max-h-96 overflow-y-auto">
          <div className="p-3 space-y-3">
            {accounts.length > 0 ? (
              accounts.map((account: AccountData) => (
                <Card
                  key={account.address}
                  className={`cursor-pointer transition-all duration-200 bg-gray-800/50 ${
                    address === account.address
                      ? "ring-2 ring-offset-2 ring-offset-gray-900 ring-pink-500"
                      : "border-gray-700"
                  } ${hoveredAccount === account.address ? "shadow-lg scale-[1.02]" : ""} ${
                    account.disabled ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  onMouseEnter={() => !account.disabled && account.address && setHoveredAccount(account.address)}
                  onMouseLeave={() => setHoveredAccount(null)}
                  onClick={() => !account.disabled && account.address && handleAccountChange(account.address)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2 min-w-0 flex-1">
                        <div className="w-6 h-6 flex-shrink-0">
                          <div className="w-full h-full rounded-full flex items-center justify-center">
                            <PolkadotIdenticon
                              value={account.address}
                              size={24}
                            />
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-white text-sm truncate">
                            {account.name || "Unnamed Account"}
                          </h3>
                          <p className="text-xs text-gray-400 font-mono truncate">
                            {account.address}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1.5 flex-shrink-0">
                        {account.address && chainStore?.id && (
                          <Badge className="bg-gray-700/50 text-gray-300 text-xs px-1.5 py-0.5">
                            <AccountBalance address={account.address} chainId={chainStore.id} />
                          </Badge>
                        )}
                        {address === account.address && (
                          <Check className="w-4 h-4 text-green-400" />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center text-xs text-gray-300">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 flex-shrink-0"></div>
                      <span>Ready to sign transactions</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="px-4 py-6 text-center">
                <Wallet className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No accounts found</p>
                <p className="text-gray-500 text-xs">Connect a wallet to see accounts</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
