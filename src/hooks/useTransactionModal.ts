import { useState, useCallback } from "react"
import { useSnapshot } from "valtio"
import { settingsStore } from "@/store/SettingsStore"
import { TxStatus } from "@/components/dialogs/TransactionProgressModal"

interface TransactionModalState {
  open: boolean
  status: TxStatus
  txHash?: string
  error?: string
  title?: string
  network?: string
}

export function useTransactionModal() {
  const settings = useSnapshot(settingsStore)
  const [state, setState] = useState<TransactionModalState>({
    open: false,
    status: "idle",
  })

  const startTransaction = useCallback((title: string, network?: string) => {
    if (!settings.showTransactionModal) return
    setState({
      open: true,
      status: "signing",
      title,
      network,
      txHash: undefined,
      error: undefined,
    })
  }, [settings.showTransactionModal])

  const updateStatus = useCallback((status: TxStatus, txHash?: string) => {
    setState(prev => ({
      ...prev,
      status,
      txHash: txHash ?? prev.txHash,
    }))
  }, [])

  const setError = useCallback((error: string) => {
    setState(prev => ({
      ...prev,
      status: "error",
      error,
    }))
  }, [])

  const closeModal = useCallback(() => {
    setState(prev => ({
      ...prev,
      open: false,
    }))
  }, [])

  const reset = useCallback(() => {
    setState({
      open: false,
      status: "idle",
    })
  }, [])

  return {
    ...state,
    isEnabled: settings.showTransactionModal,
    startTransaction,
    updateStatus,
    setError,
    closeModal,
    reset,
  }
}
