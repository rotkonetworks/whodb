// All required dependencies are already in the dependency array.
import { Chains } from "@reactive-dot/core/internal.js"
import BigNumber from "bignumber.js"
import { HelpCircle } from 'lucide-react'
import { SS58String } from "polkadot-api"
import React, { ReactNode, useEffect } from "react"

import { ApiConfig } from "@/api/config"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AccountData } from "@/store/AccountStore"
import { XcmParameters } from "@/store/XcmParameters"
import { FormatAmountFn } from "@/types"
import { ApiTx } from "@/types/api"

import { AccountDropdown } from "../ui/account-dropdown"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip"

export default function Teleporter({
  address, accounts, chainId, tokenSymbol, tokenDecimals, config, xcmParams, fromBalance, toBalance,
  otherChains, teleportAmount,
  setTeleportAmount, formatAmount,
}: {
  address: SS58String,
  accounts: AccountData[],
  chainId: string | number | symbol,
  config: ApiConfig,
  tokenSymbol: string,
  tokenDecimals: number,
  xcmParams: XcmParameters,
  tx: ApiTx,
  otherChains: { id: string; name: string }[],
  fromBalance: BigNumber,
  toBalance: BigNumber,
  teleportAmount: BigNumber,
  setTeleportAmount: (amount: BigNumber) => void,
  formatAmount: FormatAmountFn,
}) {
  const fromAddress = xcmParams?.fromAddress || address
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
  }, [address])

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

  const selectedChain = xcmParams?.fromChain?.id
  const setSelectedChain = (id: keyof Chains) => {
    if (xcmParams?.fromChain) {
      xcmParams.fromChain.id = id
    }
  }
  const fromChainId = xcmParams?.fromChain?.id
  const toChainId = chainId as keyof Chains

  useEffect(() => {
    if (xcmParams?.fromChain?.id) {
      setSelectedChain(xcmParams.fromChain.id)
    }
  }, [xcmParams?.fromChain?.id])

  const handleFromWalletChange = React.useCallback((address: SS58String) => {
    setFromAddress(address)
  }, [])

  return (
    <div className="space-y-6 p-6 rounded-lg border border-gray-700">
      <div className="p-4 bg-gray-700/30 rounded-lg border border-gray-600">
        <h3 className="text-white font-medium mb-4">Wallet Selection</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="fromAddress" className="text-gray-400">From Wallet</Label>
            <AccountDropdown 
              id="fromAddress"
              accounts={accounts} 
              address={fromAddress}
              onAddressSelect={handleFromWalletChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="toAddress" className="text-gray-400">Current Wallet</Label>
            <Input readOnly 
              value={accounts?.find(({ encodedAddress }) => encodedAddress === toAddress)?.name || 'Unknown Account'}
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
                  <Select value={fromChainId as keyof Chains}
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
              value={config?.chains?.[toChainId]?.name || 'Unknown Chain'} 
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
            <span className="text-gray-400">{config?.chains?.[fromChainId]?.name || 'From Chain'}</span>
            <span className="text-white font-mono text-sm">{formatAmount(fromBalance, {
              symbol: config?.chains?.[fromChainId]?.symbol || tokenSymbol,
            })}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">{config?.chains?.[toChainId]?.name || 'To Chain'}</span>
            <span className="text-white font-mono text-sm">{formatAmount(toBalance, {
              symbol: config?.chains?.[toChainId]?.symbol || tokenSymbol,
            })}</span>
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
          <p className="text-blue-300">
            <span className="font-semibold text-blue-400">Note:</span> Two transactions are required, which you need to sign with your wallet:
          </p>
          <ol className="list-decimal list-inside space-y-1 text-blue-300 text-sm">
            <li>Teleport assets between chains</li>
            <li>Execute identity transaction</li>
          </ol>
          <p className="text-blue-300 text-sm">
            <span className="font-semibold text-blue-400">Important:</span> Please ensure you have enough balance in the destination chain to cover transaction fees.
          </p>
          <p className="text-blue-300 text-sm">
            The entire process may take up to 2 minutes to complete. Please be patient.
          </p>
        </div>
      </div>
    </div>
  )
}
