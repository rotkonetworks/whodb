import { BigNumber } from "bignumber.js"

export const getTxFees = (tx: any) => async (walletAddress: string) => {
  let fees = await tx.paymentInfo(walletAddress)
  fees = !fees.partialFee.isEmpty ? BigNumber(fees.partialFee.toString()) : null
  return fees
}
