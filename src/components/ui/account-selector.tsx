import { Check, User } from "lucide-react";
import { SS58String } from "polkadot-api";
import React from "react";

import { usePolkadotApi } from "@/contexts/PolkadotApiContext";
import { AccountData } from "@/store/AccountStore";
import { PolkadotIdenticon } from "dot-identicon/react.js";
import { AccountBalanceBadge } from "./balance-badge";
import { Card, CardContent } from "./card";

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

  // Debug logging
  if (accounts.length === 0) {
    console.log("[AccountSelector] No accounts available. providedAccounts:", providedAccounts, "availableAccounts:", availableAccounts);
  } else {
    console.log(`[AccountSelector] ${accounts.length} accounts available`);
  }

  return (
    <div className="space-y-3">
      {accounts.length === 0 ? (
        <div className="text-center py-8">
          <User className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No accounts available</p>
          <p className="text-gray-500 text-xs mt-2">
            Please connect your wallet or check that you have accounts in your wallet extension
          </p>
        </div>
      ) : (
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
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 flex-shrink-0">
                    {account.address ? (
                      <PolkadotIdenticon
                        address={account.address}
                        size={40}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-pink-500 to-purple-500 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-white text-base mb-1 truncate">
                      {account.name || "Unnamed Account"}
                    </h3>
                    <p className="text-xs text-gray-500 font-mono truncate">
                      {account.address}
                    </p>
                    {chainStore?.name && (
                      <p className="text-xs text-gray-500">
                        {chainStore.name} (SS58: {chainStore.ss58Format})
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {account.address && chainStore?.id && (
                    <AccountBalanceBadge address={account.address} chainId={chainStore.id} />
                  )}
                  {selectedAccount === account.address && (
                    <Check className="w-5 h-5 text-green-400" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          ))}
        </div>
      )}
    </div>
  );
};
