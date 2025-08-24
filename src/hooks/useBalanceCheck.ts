import { useContext, useMemo } from 'react'
import { BalanceContext } from '@/contexts/balance-context'
import BigNumber from 'bignumber.js'

export function useBalanceCheck(requiredAmount?: BigNumber | string | number) {
  const balance = useContext(BalanceContext)
  
  const hasRequiredBalance = useMemo(() => {
    if (!balance || !requiredAmount) return true
    
    const required = new BigNumber(requiredAmount)
    const available = new BigNumber(balance.free.toString())
    
    return available.isGreaterThanOrEqualTo(required)
  }, [balance, requiredAmount])

  const balanceShortfall = useMemo(() => {
    if (!balance || !requiredAmount || hasRequiredBalance) return null
    
    const required = new BigNumber(requiredAmount)
    const available = new BigNumber(balance.free.toString())
    
    return required.minus(available)
  }, [balance, requiredAmount, hasRequiredBalance])

  return {
    balance,
    hasRequiredBalance,
    balanceShortfall,
    isLoading: balance === undefined
  }
}