import { WalletIcon, ChevronDown, CheckCircle } from "lucide-react"
import { useAccount } from "@/contexts/wallet-context"
import { usePolkadotWallet } from "@/contexts/PolkadotWalletContext"
import { useNetwork } from "@/contexts/network-context"
import { CHAINS } from "@/polkadot-api/chain-config"
import { Button } from "@/components/ui/button"
import { useMemo } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

export function WalletConnectButton() {
  const { address, disconnect, selectAccount, isLoadingAccounts } = useAccount()
  const { extensions, getFormattedAccounts } = usePolkadotWallet()
  const { network } = useNetwork()

  // Get accounts formatted for the current network's SS58 format
  const accounts = useMemo(() => {
    if (!network) {
      // Default to Paseo format (0) if no network selected
      return getFormattedAccounts(0)
    }
    const chainConfig = CHAINS[network]
    if (!chainConfig?.ss58Format) {
      return getFormattedAccounts(0)
    }
    return getFormattedAccounts(chainConfig.ss58Format)
  }, [network, getFormattedAccounts])

  // If no extensions detected, show install prompt
  if (!isLoadingAccounts && extensions.length === 0) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => window.open('https://polkadot.js.org/extension/', '_blank')}
        className="gap-2 border-gray-700/50 hover:border-gray-600 text-sm text-gray-400"
      >
        <WalletIcon className="w-4 h-4" />
        <span className="hidden sm:inline">Install Wallet</span>
      </Button>
    )
  }

  // If loading
  if (isLoadingAccounts) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        className="gap-2 border-gray-700/50 text-sm text-gray-500"
      >
        <WalletIcon className="w-4 h-4" />
        <span className="hidden sm:inline">Loading...</span>
      </Button>
    )
  }

  // If no accounts available
  if (accounts.length === 0) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        className="gap-2 border-gray-700/50 text-sm text-gray-500"
      >
        <WalletIcon className="w-4 h-4" />
        <span className="hidden sm:inline">No Accounts</span>
      </Button>
    )
  }

  // If not connected, show account selector
  if (!address) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-gray-700/50 hover:border-gray-600 text-sm"
          >
            <WalletIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Select Account</span>
            <ChevronDown className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 bg-gray-800 border-gray-700">
          <DropdownMenuLabel className="text-gray-400 text-xs uppercase tracking-wide">
            Available Accounts
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-gray-700" />
          {accounts.map((account) => (
            <DropdownMenuItem
              key={account.address}
              onClick={() => selectAccount(account)}
              className="text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer py-3"
            >
              <div className="flex flex-col gap-1 w-full">
                <div className="font-medium text-sm">{account.name || "Unnamed Account"}</div>
                <div className="font-mono text-xs text-gray-500">
                  {account.encodedAddress.slice(0, 10)}...{account.encodedAddress.slice(-8)}
                </div>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  // Connected state - show current account with network-encoded address
  const currentAccount = accounts.find(acc => acc.address === address)
  const displayAddress = currentAccount?.encodedAddress || address

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-gray-700/50 hover:border-gray-600 text-sm"
        >
          <WalletIcon className="w-4 h-4 text-green-400" />
          <span className="hidden sm:inline font-mono text-xs">
            {displayAddress.slice(0, 6)}...{displayAddress.slice(-4)}
          </span>
          <ChevronDown className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 bg-gray-800 border-gray-700">
        <DropdownMenuLabel className="text-gray-400 text-xs uppercase tracking-wide">
          Switch Account
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-gray-700" />
        {accounts.map((account) => (
          <DropdownMenuItem
            key={account.address}
            onClick={() => selectAccount(account)}
            className="text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer py-3"
          >
            <div className="flex items-start justify-between w-full gap-3">
              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <div className="font-medium text-sm">{account.name || "Unnamed Account"}</div>
                <div className="font-mono text-xs text-gray-500 truncate">
                  {account.encodedAddress}
                </div>
              </div>
              {account.address === address && (
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator className="bg-gray-700" />
        <DropdownMenuItem
          onClick={disconnect}
          className="text-red-400 hover:text-red-300 hover:bg-gray-700/50 cursor-pointer"
        >
          Disconnect Wallet
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
