import { useState, useCallback } from 'react'
import { toast } from 'sonner'

export function useCopyToClipboard() {
  const [copied, setCopied] = useState<string | null>(null)

  const copy = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(label)
      toast.success(`${label} copied!`)
      setTimeout(() => setCopied(null), 2000)
    } catch (err) {
      console.error('Failed to copy text:', err)
      toast.error('Failed to copy to clipboard')
    }
  }, [])

  return { copy, copied }
}