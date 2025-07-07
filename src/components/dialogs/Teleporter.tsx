// All required dependencies are already in the dependency array.
/* eslint-disable react-hooks/exhaustive-deps */
import { Chains } from "@reactive-dot/core/internal.js"
import BigNumber from "bignumber.js"
import { HelpCircle } from 'lucide-react'
import { SS58String } from "polkadot-api"
import React, { ReactNode, useEffect } from "react"

import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ApiConfig } from "~/api/config"
import { AccountData } from "~/store/AccountStore"
import { XcmParameters } from "~/store/XcmParameters"
import { FormatAmountFn } from "~/types"
import { ApiTx } from "~/types/api"

import { AccountSelector } from "../ui/account-selector"
import { Alert } from "../ui/alert"
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "../ui/tooltip"

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
  const fromAddress = xcmParams.fromAddress
  const setFromAddress = (address: string) => xcmParams.fromAddress = address
  const toAddress = address

  useEffect(() => {
    if (open) {
      setFromAddress(address)
    }
  }, [address, open])

  const [amount, _setAmount] = React.useState(BigNumber(teleportAmount.toString())
    .div(BigNumber(10).pow(BigNumber(tokenDecimals)))
    .toString()
  )
  const setAmount = (amount: string) => {
    _setAmount(amount)
    const amountInBase = BigNumber(amount).multipliedBy(BigNumber(10).pow(BigNumber(tokenDecimals)))
    setTeleportAmount(amountInBase)
  }

  const selectedChain = xcmParams.fromChain.id
  const setSelectedChain = (id: keyof Chains) => xcmParams.fromChain.id = id
  const fromChainId = xcmParams.fromChain.id
  const toChainId = chainId as keyof Chains

  useEffect(() => {
    if (open) {
      setSelectedChain(xcmParams.fromChain.id)
    }
  }, [xcmParams.fromChain.id, open])

  const [comboboxOpen, setComboboxOpen] = React.useState(null)

  const handleFromWalletChange = React.useCallback((address: string) => {
    setFromAddress(address)
    setComboboxOpen(null)
  }, [])

  return (
    <div className="grid gap-4 p-2">
      <div className="flex items-start space-x-4">
        <div className="flex-1 space-y-2">
          <Label htmlFor="fromAddress">From Wallet</Label>
          <AccountSelector id="fromAddress" accounts={accounts} address={fromAddress}
            open={comboboxOpen} onAddressSelect={handleFromWalletChange}
            handleOpen={setComboboxOpen}
          />
        </div>

        <div className="flex-1 space-y-2">
          <Label htmlFor="toAddress">Current Wallet</Label>
          <Input readOnly id="toAddress"
            value={accounts.find(({ encodedAddress }) => encodedAddress === toAddress).name}
            className="flex-1"
          />
        </div>
      </div>

      <div className="flex items-start space-x-4">
        <div className="flex-1 space-y-2">
          <Label>From Chain:</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Select value={fromChainId as keyof Chains}
                  onValueChange={setSelectedChain as (value: string) => void}
                >
                  <SelectTrigger className="border-[#E6007A]">
                    <SelectValue placeholder="Select chain" />
                  </SelectTrigger>
                  <SelectContent>
                    {otherChains.map(({ id, name }) =>
                      <SelectItem key={id} value={id}>{name}</SelectItem>)
                    }
                  </SelectContent>
                </Select>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-[#3A3939] text-[#FFFFFF] border-[#E6007A]">
                <p>{selectedChain as ReactNode}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex-1 space-y-2">
          <Label>Corrent Chain:</Label>
          <Input value={config.chains[toChainId].name} readOnly
            className="placeholder-[#706D6D]"
          />
        </div>
      </div>

      <Card className="bg-transparent border-[#E6007A] b-1 text-black dark:text-white placeholder-[#706D6D] focus:ring-[#E6007A]">
        <CardContent className="p-4">
          <h3 className="mb-4 text-lg font-semibold text-[#E6007A]">Transferable Balances</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>{config.chains[fromChainId].name}</span>
              <span>{formatAmount(fromBalance, {
                symbol: config.chains[fromChainId].symbol,
              })}</span>
            </div>
            <div className="flex justify-between">
              <span>{config.chains[toChainId].name}</span>
              <span>{formatAmount(toBalance, {
                symbol: config.chains[toChainId].symbol,
              })}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="amount" className="flex items-center gap-2">
            Amount
          </Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 shrink-0 opacity-50" />
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p>
                  This is made up of:
                </p>
                <ul className="list-disc list-inside">
                  <li>Destination account&apos;s balance</li>
                  <li>Existential Deposit</li>
                  <li>Transaction fee and deposits</li>
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="relative">
          <Input
            id="amount"
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="pr-16"
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <span>{tokenSymbol}</span>
          </div>
        </div>
      </div>

      <Alert className="space-y-2 bg-transparent border-[#E6007A] b-1 text-black dark:text-white placeholder-[#706D6D] focus:ring-[#E6007A]">
        <p>
          <b className="text-primary">Note</b>:
          Two transactions are required, which you need to sign with your wallet and approve of:
        </p>
        <ol>
          <li>1. Teleport assets between chains</li>
          <li>2. Execute identity transaction</li>
        </ol>
        <p>
          <b className="text-primary">Important</b>:
          Please ensure you have enough balance in incoming chain to cover the transaction fee.
        </p>
        <p>
          The whole transaction may take up to 2 minutes to complete, please be patient.
        </p>
      </Alert>
    </div>
  )
}
