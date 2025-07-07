import { Check, User } from "lucide-react";
import { SS58String } from "polkadot-api";
import React from "react";

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

interface AccountSelectorProps {
  accounts?: AccountData[];
  selectedAccount: SS58String | null;
  onSelect: (address: SS58String) => void;
  hoveredAccount: string | null;
  setHoveredAccount: (address: string | null) => void;
}

export const AccountSelector: React.FC<AccountSelectorProps> = ({
  accounts: providedAccounts,
  selectedAccount,
  onSelect,
  hoveredAccount,
  setHoveredAccount,
}) => {
  const { accounts: availableAccounts, chainStore } = usePolkadotApi();
  const accounts = providedAccounts ?? availableAccounts;

  return (
    <div className="space-y-3">
      <div className="grid gap-3">
        {accounts.map((account) => (
          <Card
            key={account.address}
            className={`cursor-pointer transition-all duration-200 bg-gray-800/50 ${
              selectedAccount === account.address
                ? "ring-2 ring-offset-2 ring-offset-gray-900 ring-pink-500"
                : "border-gray-700"
            } ${hoveredAccount === account.address ? "shadow-lg sm:scale-[1.02]" : ""} ${
              account.disabled ? "opacity-50 cursor-not-allowed" : ""
            }`}
            onMouseEnter={() => !account.disabled && account.address && setHoveredAccount(account.address)}
            onMouseLeave={() => setHoveredAccount(null)}
            onClick={() => !account.disabled && account.address && onSelect(account.address)}
            role="radio"
            aria-checked={selectedAccount === account.address}
            tabIndex={0}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === " ") && account.address) {
                onSelect(account.address);
              }
            }}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2 min-w-0 flex-1">
                  <div className="w-6 h-6 flex-shrink-0">
                    {account.address ? (
                      <PolkadotIdenticon
                        value={account.address}
                        size={24}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-pink-500 to-purple-500 rounded-full flex items-center justify-center">
                        <User className="w-3 h-3 text-white" />
                      </div>
                    )}
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
                  {selectedAccount === account.address && (
                    <Check className="w-4 h-4 text-green-400" />
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 items-center mt-1.5">
                <div className="flex items-center text-xs text-gray-300">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 flex-shrink-0"></div>
                  <span>Ready to sign transactions</span>
                </div>
                {account.polkadotSigner && (
                  <div className="flex items-center text-xs text-gray-300">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-1.5 flex-shrink-0"></div>
                    <span>Signer available</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
