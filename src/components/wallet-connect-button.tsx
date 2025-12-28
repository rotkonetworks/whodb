import { WalletIcon, ChevronDown, CheckCircle } from "lucide-react"
import { useAccount } from "@/contexts/wallet-context"
import { usePolkadotWallet } from "@/contexts/PolkadotWalletContext"
import { useEthereumWallet } from "@/contexts/EthereumWalletContext"
import { useNetwork } from "@/contexts/network-context"
import { CHAINS } from "@/polkadot-api/chain-config"
import { Button } from "@/components/ui/button"
import { useMemo, useContext } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { AccountBalanceBadge } from "@/components/ui/balance-badge"
import { PolkadotApiContext } from "@/contexts/PolkadotApiContext"

export function WalletConnectButton({ showText = false, size = "sm" }: { showText?: boolean; size?: "sm" | "lg" }) {
  const { address, disconnect, selectAccount, isLoadingAccounts } = useAccount()
  const { extensions, getFormattedAccounts, initializeWallets, isInitialized } = usePolkadotWallet()
  const { isMetaMaskInstalled, connectWallet: connectMetaMask, isInitialized: isEthInitialized } = useEthereumWallet()
  const { network } = useNetwork()

  // Use context directly to avoid error when provider is not available
  const polkadotApi = useContext(PolkadotApiContext)
  const chainStore = polkadotApi?.chainStore

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

  // Size-based styling
  const sizeClasses = size === "lg"
    ? "px-8 py-6 text-lg font-medium"
    : "text-sm"
  const iconClasses = size === "lg" ? "w-5 h-5" : "w-4 h-4"

  // If not initialized, show connect button
  if (!isInitialized) {
    return (
      <Button
        variant={size === "lg" ? "default" : "outline"}
        size={size}
        onClick={initializeWallets}
        className={`gap-2 ${size === "lg" ? "bg-pink-500 hover:bg-pink-600 text-white" : "border-gray-700/50 hover:border-gray-600"} ${sizeClasses}`}
      >
        <WalletIcon className={iconClasses} />
        {showText ? <span>Connect Wallet</span> : <span className="hidden sm:inline">Connect</span>}
      </Button>
    )
  }

  // If MetaMask detected but no Polkadot extensions, offer to connect MetaMask
  if (!isLoadingAccounts && extensions.length === 0 && isMetaMaskInstalled && !isEthInitialized) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={connectMetaMask}
        className="gap-2 border-gray-700/50 hover:border-gray-600 text-sm"
      >
        <WalletIcon className="w-4 h-4" />
        {showText ? <span>Connect MetaMask</span> : <span className="hidden sm:inline">Connect MetaMask</span>}
      </Button>
    )
  }

  // Detect device type
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  // If no extensions detected, show install prompt with options
  if (!isLoadingAccounts && extensions.length === 0 && !isMetaMaskInstalled) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-gray-700/50 hover:border-gray-600 text-sm text-yellow-400"
          >
            <WalletIcon className="w-4 h-4" />
            {showText ? <span>Get Wallet</span> : <span className="hidden sm:inline">Get Wallet</span>}
            <ChevronDown className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 bg-gray-800 border-gray-700">
          <DropdownMenuLabel className="text-gray-400 text-xs uppercase tracking-wide">
            Install a Wallet
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-gray-700" />
          {isMobile ? (
            // Mobile recommendations
            <>
              <DropdownMenuItem
                onClick={() => window.open('https://novawallet.io/', '_blank')}
                className="text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer py-2.5"
              >
                <div className="flex flex-col gap-0.5">
                  <div className="font-medium text-sm">Nova Wallet</div>
                  <div className="text-xs text-gray-500">Recommended • Mobile</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => window.open('https://www.enkrypt.com/', '_blank')}
                className="text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer py-2.5"
              >
                <div className="flex flex-col gap-0.5">
                  <div className="font-medium text-sm">Enkrypt</div>
                  <div className="text-xs text-gray-500">Multi-chain</div>
                </div>
              </DropdownMenuItem>
            </>
          ) : (
            // Desktop recommendations
            <>
              <DropdownMenuItem
                onClick={() => window.open('https://novawallet.io/', '_blank')}
                className="text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer py-2.5"
              >
                <div className="flex flex-col gap-0.5">
                  <div className="font-medium text-sm">Nova Wallet</div>
                  <div className="text-xs text-gray-500">Recommended • User-friendly</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => window.open('https://www.enkrypt.com/', '_blank')}
                className="text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer py-2.5"
              >
                <div className="flex flex-col gap-0.5">
                  <div className="font-medium text-sm">Enkrypt</div>
                  <div className="text-xs text-gray-500">Multi-chain</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => window.open('https://polkagate.xyz/', '_blank')}
                className="text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer py-2.5"
              >
                <div className="flex flex-col gap-0.5">
                  <div className="font-medium text-sm">PolkaGate</div>
                  <div className="text-xs text-gray-500">Full-featured • Staking</div>
                </div>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  // If MetaMask detected but no Polkadot extensions, show Ethereum wallet option
  if (!isLoadingAccounts && extensions.length === 0 && isMetaMaskInstalled) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-gray-700/50 hover:border-gray-600 text-sm text-yellow-400"
          >
            <WalletIcon className="w-4 h-4" />
            {showText ? <span>Get Wallet</span> : <span className="hidden sm:inline">Get Wallet</span>}
            <ChevronDown className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 bg-gray-800 border-gray-700">
          <DropdownMenuLabel className="text-gray-400 text-xs uppercase tracking-wide">
            Polkadot Wallets
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-gray-700" />
          {isMobile ? (
            // Mobile recommendations
            <>
              <DropdownMenuItem
                onClick={() => window.open('https://novawallet.io/', '_blank')}
                className="text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer py-2.5"
              >
                <div className="flex flex-col gap-0.5">
                  <div className="font-medium text-sm">Nova Wallet</div>
                  <div className="text-xs text-gray-500">Recommended • Mobile</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => window.open('https://www.enkrypt.com/', '_blank')}
                className="text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer py-2.5"
              >
                <div className="flex flex-col gap-0.5">
                  <div className="font-medium text-sm">Enkrypt</div>
                  <div className="text-xs text-gray-500">Multi-chain</div>
                </div>
              </DropdownMenuItem>
            </>
          ) : (
            // Desktop recommendations
            <>
              <DropdownMenuItem
                onClick={() => window.open('https://novawallet.io/', '_blank')}
                className="text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer py-2.5"
              >
                <div className="flex flex-col gap-0.5">
                  <div className="font-medium text-sm">Nova Wallet</div>
                  <div className="text-xs text-gray-500">Recommended • User-friendly</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => window.open('https://www.enkrypt.com/', '_blank')}
                className="text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer py-2.5"
              >
                <div className="flex flex-col gap-0.5">
                  <div className="font-medium text-sm">Enkrypt</div>
                  <div className="text-xs text-gray-500">Multi-chain</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => window.open('https://polkagate.xyz/', '_blank')}
                className="text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer py-2.5"
              >
                <div className="flex flex-col gap-0.5">
                  <div className="font-medium text-sm">PolkaGate</div>
                  <div className="text-xs text-gray-500">Full-featured • Staking</div>
                </div>
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator className="bg-gray-700" />
          <DropdownMenuLabel className="text-gray-400 text-xs uppercase tracking-wide">
            Or Use Ethereum Wallet
          </DropdownMenuLabel>
          <DropdownMenuItem
            onClick={connectMetaMask}
            className="text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer py-2.5"
          >
            <div className="flex flex-col gap-0.5">
              <div className="font-medium text-sm">Connect MetaMask</div>
              <div className="text-xs text-gray-500">Use with PolkaGate Snap</div>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
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
        <DropdownMenuContent align="end" className="w-80 bg-gray-800 border-gray-700 max-h-[500px] overflow-hidden flex flex-col">
          <DropdownMenuLabel className="text-gray-400 text-xs uppercase tracking-wide">
            Available Accounts
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-gray-700" />
          <div className="overflow-y-auto max-h-[400px] scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
            {accounts.map((account) => (
              <DropdownMenuItem
                key={account.address}
                onClick={() => selectAccount(account)}
                className="text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer py-2.5 px-3"
              >
                <div className="flex items-center justify-between w-full gap-2">
                  <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">{account.name || "Unnamed Account"}</div>
                    <div className="font-mono text-xs text-gray-500 truncate">
                      {account.encodedAddress}
                    </div>
                  </div>
                  {chainStore?.id && (
                    <AccountBalanceBadge address={account.address} chainId={chainStore.id} />
                  )}
                </div>
              </DropdownMenuItem>
            ))}
          </div>
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
      <DropdownMenuContent align="end" className="w-80 bg-gray-800 border-gray-700 max-h-[500px] overflow-hidden flex flex-col">
        <DropdownMenuLabel className="text-gray-400 text-xs uppercase tracking-wide">
          Switch Account
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-gray-700" />
        <div className="overflow-y-auto max-h-[400px] scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
          {accounts.map((account) => (
            <DropdownMenuItem
              key={account.address}
              onClick={() => selectAccount(account)}
              className="text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer py-2.5 px-3"
            >
              <div className="flex items-center justify-between w-full gap-2">
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                  <div className="font-medium text-sm truncate">{account.name || "Unnamed Account"}</div>
                  <div className="font-mono text-xs text-gray-500 truncate">
                    {account.encodedAddress}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {chainStore?.id && (
                    <AccountBalanceBadge address={account.address} chainId={chainStore.id} />
                  )}
                  {account.address === address && (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  )}
                </div>
              </div>
            </DropdownMenuItem>
          ))}
        </div>
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
