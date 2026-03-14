import BigNumber from "bignumber.js"
import { HelpCircle } from 'lucide-react'
import { SS58String } from "polkadot-api"
import React, { ReactNode, useEffect } from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { Network } from "@/contexts/network-context"
import { usePolkadotApi } from "@/contexts/PolkadotApiContext"
import { usePolkadotWallet } from "@/contexts/PolkadotWalletContext"
import { CHAINS } from "@/polkadot-api/chain-config"
import { AccountDropdown } from "../ui/account-dropdown"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip"

export default function Teleporter({ teleportAmount, setTeleportAmount, setOnTeleportClick, }: {
  teleportAmount: BigNumber,
  setTeleportAmount: (amount: BigNumber) => void,
  setOnTeleportClick: (callback: () => void) => void,
}) {
  const polkadotApi = usePolkadotApi()
  const {
    chainConstants,
    getTeleportCall,
    signSubmitAndWatch,
    chainStore,
    accountStore,
    xcmParams,
    accounts,
    fromBalance,
    balance: toBalance,
    formatAmount,
    getWalletAccount,
    fromTypedApi,
  } = polkadotApi
  const { getSignerForAddress } = usePolkadotWallet()

  useEffect(() => {
    if (teleportAmount) {
      setTeleportAmount(teleportAmount)
    }
  }, [teleportAmount, setTeleportAmount])

  const address = accountStore.address
  const fromAddress = xcmParams?.fromAddress
  const setFromAddress = (address: string) => {
    if (xcmParams) {
      xcmParams.fromAddress = address
    }
  }
  const toAddress = address

  useEffect(() => {
    if (address) {
      setFromAddress(address)
    }
  }, [address, accounts])

  const tokenSymbol = (chainConstants as any)?.tokenSymbol ?? chainStore.tokenSymbol
  const tokenDecimals = (chainConstants as any)?.tokenDecimals ?? chainStore.tokenDecimals
  const [amount, _setAmount] = React.useState(
    teleportAmount && tokenDecimals
      ? BigNumber(teleportAmount.toString())
        .div(BigNumber(10).pow(BigNumber(tokenDecimals)))
        .toString()
      : "0"
  )
  const setAmount = (amount: string) => {
    _setAmount(amount)
    const amountInBase = BigNumber(amount).multipliedBy(BigNumber(10).pow(BigNumber(tokenDecimals)))
    setTeleportAmount(amountInBase)
  }

  const [selectedChain, setSelectedChain] = React.useState<string>(chainStore.relay?.id ?? '')
  const fromChainId = selectedChain as Network
  const toChainId = chainStore.id as Network

  const handleFromWalletChange = React.useCallback((address: SS58String) => {
    setFromAddress(address)
  }, [])

  const availableAccounts = accounts
  const otherChains = chainStore.relay
    ? [chainStore.relay, ...chainStore.relay.parachains].filter((chain) => chain?.id !== toChainId)
    : []

  const handleTeleport = React.useCallback(async () => {
    const tokenDecimals = chainStore.tokenDecimals ?? 10
    const newAmount = BigNumber(amount).multipliedBy(BigNumber(10).pow(BigNumber(tokenDecimals)))
    const tx = getTeleportCall({
      amount: newAmount,
    })

    const fromAccount = getWalletAccount(fromAddress);
    if (!fromAccount) {
      throw new Error("From account not found");
    }
    
    const fromSigner = await getSignerForAddress(fromAccount.address);
    if (!fromSigner) {
      throw new Error("Signer not available for from account");
    }

    signSubmitAndWatch({
      call: tx,
      name: `Teleport Assets from ${fromChainId} to ${toChainId}`,
      awaitFinalization: true,
      signer: fromSigner, // Ensure to use the correct signer
      api: fromTypedApi || undefined, // Pass the API for the from chain
    })
  }, [amount, xcmParams, getTeleportCall, chainStore, signSubmitAndWatch, fromChainId, toChainId])

  useEffect(() => {
    // Set up teleport handler wrapped twice to prevent execution on every render
    //  Outer function is consumed by setter, returning the actual handler.
    //  See https://reactjs.org/docs/hooks-reference.html#usestate
    setOnTeleportClick(() => handleTeleport)
  }, [setOnTeleportClick, handleTeleport])

  return (
    <div className="space-y-6 p-6 rounded-lg border border-gray-700">
      <div className="p-4 bg-gray-700/30 rounded-lg border border-gray-600">
        <h3 className="text-white font-medium mb-4">Wallet Selection</h3>
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <Label htmlFor="fromAddress" className="text-gray-400">From Wallet</Label>
            {availableAccounts.length > 0 ? (
              <AccountDropdown
                id="fromAddress"
                accounts={availableAccounts}
                address={fromAddress}
                onAddressSelect={handleFromWalletChange}
              />
            ) : (
              <div className="p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-md">
                <p className="text-yellow-400 text-sm">
                  No other wallets available. Please connect additional wallets to enable teleportation.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="toAddress" className="text-gray-400">Current Wallet</Label>
            <Input readOnly
              value={(() => {
                const account = accounts?.find(({ encodedAddress }) => encodedAddress === toAddress);
                return account?.name || toAddress || 'Unknown Account';
              })()}
              className="bg-gray-800 border-gray-600 text-gray-300"
            />
          </div>
        </div>
      </div>

      <div className="p-4 bg-gray-700/30 rounded-lg border border-gray-600">
        <h3 className="text-white font-medium mb-4">Chain Selection</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-gray-400">From Chain:</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Select value={fromChainId as Network}
                    onValueChange={setSelectedChain as (value: string) => void}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                      <SelectValue placeholder="Select chain" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      {(otherChains || []).map(({ id, name }) =>
                        <SelectItem key={id} value={id} className="text-white hover:bg-gray-700">{name}</SelectItem>)
                      }
                    </SelectContent>
                  </Select>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-gray-800 text-white border-gray-600">
                  <p>{selectedChain as ReactNode}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="space-y-2">
            <Label className="text-gray-400">Current Chain:</Label>
            <Input
              value={CHAINS[toChainId].name}
              readOnly
              className="bg-gray-800 border-gray-600 text-gray-300"
            />
          </div>
        </div>
      </div>

      <div className="p-4 bg-gray-700/30 rounded-lg border border-gray-600">
        <h3 className="text-white font-medium mb-4">Transferable Balances</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">{CHAINS[fromChainId].name}</span>
            <span className="text-white font-mono text-sm">{formatAmount(fromBalance)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">{CHAINS[toChainId].name}</span>
            <span className="text-white font-mono text-sm">{formatAmount(toBalance)}</span>
          </div>
        </div>
      </div>

      <div className="p-4 bg-gray-700/30 rounded-lg border border-gray-600">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="amount" className="text-gray-400 flex items-center gap-2">
              Amount to Teleport
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-gray-500 hover:text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm bg-gray-800 text-white border-gray-600">
                    <p>This amount will be transferred between chains and includes:</p>
                    <ul className="list-disc list-inside mt-2">
                      <li>Destination account balance</li>
                      <li>Existential Deposit</li>
                      <li>Transaction fees and deposits</li>
                    </ul>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
          </div>
          <div className="relative">
            <Input
              id="amount"
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="pr-16 bg-gray-800 border-gray-600 text-white"
              placeholder="0.0"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <span className="text-gray-400">{tokenSymbol}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
        <div className="space-y-3">
            <p className="text-blue-300 text-sm">
            Teleport and balance update may take a couple minutes. Please wait for confirmation.
            </p>
        </div>
      </div>
    </div>
  )
}
