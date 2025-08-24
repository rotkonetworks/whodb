import BigNumber from "bignumber.js"

import { FormatAmountOptions } from "~/types"

export class LocalStorageUtil {
  static getItem<T>(key: string): T | null {
    const item = localStorage.getItem(key)
    if (!item) {
      return null
    }
    return JSON.parse(item) as T
  }

  static setItem<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value))
  }

  static removeItem(key: string): void {
    localStorage.removeItem(key)
  }
}

export const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Formats a numeric amount to a standard string representation with token symbol
 * @param amount - The amount to format 
 * @param options - Optional formatting configuration
 * @returns Formatted amount as string with symbol
 */
export const formatAmount = (
  amount: number | bigint | BigNumber | string,
  options: FormatAmountOptions = {
    symbol: "",
    tokenDecimals: 0
  }
): string => {
  if (amount === undefined || amount === null) {
    return "---"
  }

  const { decimals, symbol = "", tokenDecimals = 0 } = options

  const newAmount = BigNumber(amount.toString())
    .dividedBy(BigNumber(10).pow(tokenDecimals))
    .toFixed(decimals ?? tokenDecimals, BigNumber.ROUND_DOWN)

  return `${newAmount}${symbol ? ` ${symbol}` : ""}`
}


