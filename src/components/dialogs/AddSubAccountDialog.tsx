import { useState } from "react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface AddSubAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (address: string, name: string) => Promise<void>
}

export function AddSubAccountDialog({ open, onOpenChange, onSubmit }: AddSubAccountDialogProps) {
  const [address, setAddress] = useState("")
  const [name, setName] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!address.trim()) {
      setError("Address is required")
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await onSubmit(address.trim(), name.trim())
      setAddress("")
      setName("")
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add sub-account")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dark:bg-gray-900 bg-gray-100 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Add Sub-Account</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm text-gray-400 block mb-1">Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="5Grw..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-pink-500"
              disabled={submitting}
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Name (optional)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sub-account name"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-pink-500"
              disabled={submitting}
            />
          </div>
          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !address.trim()}
            className="flex-1 bg-pink-500 hover:bg-pink-600"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              "Add Sub-Account"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
