import { useState, useMemo, useCallback } from "react"
import { SS58String } from "polkadot-api"
import { useAccount } from "@/contexts/wallet-context"
import { useProxies, addCanActAs, removeCanActAs, verifyProxyRelationship } from "@/hooks/useProxies"
import { useMultisig } from "@/hooks/useMultisig"
import { usePolkadotApi } from "@/contexts/PolkadotApiContext"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  ChevronDown,
  Users,
  Plus,
  Trash2,
  AlertCircle,
  Check,
  Loader2,
  Shield,
  Key,
} from "lucide-react"
import * as Avatar from "@radix-ui/react-avatar"

interface ActingAsSelectorProps {
  chainId?: string
  selectedAddress: SS58String | null
  onSelect: (
    address: SS58String | null,
    isProxy: boolean,
    isMultisig: boolean,
    options?: {
      proxyType?: string
      multisigThreshold?: number
      multisigSignatories?: SS58String[]
    }
  ) => void
}

type DialogType = 'main' | 'proxy' | 'multisig' | null

interface FormState {
  proxyAddress: string
  multisigSignatories: string
  multisigThreshold: number
  multisigName: string
  isVerifying: boolean
  error: string | null
}

const initialFormState: FormState = {
  proxyAddress: "",
  multisigSignatories: "",
  multisigThreshold: 2,
  multisigName: "",
  isVerifying: false,
  error: null,
}

export function ActingAsSelector({
  chainId,
  selectedAddress,
  onSelect,
}: ActingAsSelectorProps) {
  const { address: connectedAddress } = useAccount()
  const { typedApi } = usePolkadotApi()
  const { canActAs, refetch: refetchProxies } = useProxies(connectedAddress)
  const { multisigs, addMultisig, removeMultisig } = useMultisig(connectedAddress, chainId)

  // Consolidated state: 9 useState → 2 useState
  const [openDialog, setOpenDialog] = useState<DialogType>(null)
  const [form, setForm] = useState<FormState>(initialFormState)

  // Helper to update form fields
  const updateForm = useCallback((updates: Partial<FormState>) => {
    setForm(prev => ({ ...prev, ...updates }))
  }, [])

  // Current selection display
  const currentSelection = useMemo(() => {
    if (!selectedAddress) return null
    if (selectedAddress === connectedAddress) {
      return { type: "self", label: "Your Account" }
    }
    const proxy = canActAs.find(p => p.address === selectedAddress)
    if (proxy) {
      return { type: "proxy", label: `Proxy (${proxy.proxyType})` }
    }
    const msig = multisigs.find(m => m.address === selectedAddress)
    if (msig) {
      return { type: "multisig", label: msig.name || `Multisig (${msig.threshold}/${msig.signatories.length})` }
    }
    return { type: "unknown", label: "Unknown" }
  }, [selectedAddress, connectedAddress, canActAs, multisigs])

  const handleAddProxy = useCallback(async () => {
    if (!connectedAddress || !form.proxyAddress || !typedApi) return

    updateForm({ isVerifying: true, error: null })

    try {
      // Verify the proxy relationship exists on-chain
      const result = await verifyProxyRelationship(
        typedApi,
        connectedAddress,
        form.proxyAddress as SS58String
      )

      if (!result.valid) {
        updateForm({ error: "No proxy relationship found. Make sure the target account has added you as a proxy.", isVerifying: false })
        return
      }

      addCanActAs(
        connectedAddress,
        form.proxyAddress as SS58String,
        result.proxyType || "Any",
        result.delay || 0
      )
      refetchProxies()
      setForm(initialFormState)
      setOpenDialog(null)
    } catch (err) {
      updateForm({ error: err instanceof Error ? err.message : "Failed to verify proxy", isVerifying: false })
    }
  }, [connectedAddress, form.proxyAddress, typedApi, updateForm, refetchProxies])

  const handleAddMultisig = useCallback(() => {
    if (!connectedAddress) return

    const signatories = form.multisigSignatories
      .split(/[,\n]/)
      .map(s => s.trim())
      .filter(Boolean) as SS58String[]

    if (signatories.length < 2) {
      updateForm({ error: "At least 2 signatories required" })
      return
    }

    if (form.multisigThreshold < 2 || form.multisigThreshold > signatories.length + 1) {
      updateForm({ error: `Threshold must be between 2 and ${signatories.length + 1}` })
      return
    }

    addMultisig(signatories, form.multisigThreshold, form.multisigName || undefined)
    setForm(initialFormState)
    setOpenDialog(null)
  }, [connectedAddress, form.multisigSignatories, form.multisigThreshold, form.multisigName, updateForm, addMultisig])

  const handleRemoveProxy = useCallback((address: SS58String) => {
    if (!connectedAddress) return
    removeCanActAs(connectedAddress, address)
    refetchProxies()
    if (selectedAddress === address) {
      onSelect(connectedAddress, false, false)
    }
  }, [connectedAddress, refetchProxies, selectedAddress, onSelect])

  const handleRemoveMultisig = useCallback((address: SS58String) => {
    removeMultisig(address)
    if (selectedAddress === address) {
      onSelect(connectedAddress, false, false)
    }
  }, [removeMultisig, selectedAddress, connectedAddress, onSelect])

  if (!connectedAddress) return null

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpenDialog('main')}
        className="gap-2 bg-gray-800/50 border-gray-700 hover:bg-gray-700"
      >
        {currentSelection?.type === "proxy" && <Shield className="w-3.5 h-3.5 text-blue-400" />}
        {currentSelection?.type === "multisig" && <Users className="w-3.5 h-3.5 text-purple-400" />}
        {currentSelection?.type === "self" && <Key className="w-3.5 h-3.5 text-green-400" />}
        <span className="text-xs">
          {currentSelection?.label || "Select Account"}
        </span>
        <ChevronDown className="w-3.5 h-3.5" />
      </Button>

      <Dialog open={openDialog === 'main'} onOpenChange={(open) => setOpenDialog(open ? 'main' : null)}>
        <DialogContent className="dark:bg-gray-900 max-w-md">
          <DialogHeader>
            <DialogTitle>Act As Account</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Your own account */}
            <div className="space-y-2">
              <div className="text-xs text-gray-500 uppercase tracking-wide">Your Account</div>
              <AccountOption
                address={connectedAddress}
                label="Direct (your keys)"
                icon={<Key className="w-4 h-4 text-green-400" />}
                isSelected={selectedAddress === connectedAddress}
                onSelect={() => {
                  onSelect(connectedAddress, false, false)
                  setOpenDialog(null)
                }}
              />
            </div>

            {/* Proxy accounts */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500 uppercase tracking-wide">Proxy Accounts</div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setOpenDialog('proxy')}
                  className="h-6 px-2 text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" /> Add
                </Button>
              </div>

              {canActAs.length === 0 ? (
                <div className="text-sm text-gray-500 py-2">
                  No proxy accounts added
                </div>
              ) : (
                <div className="space-y-1">
                  {canActAs.map(proxyAccount => (
                    <AccountOption
                      key={proxyAccount.address}
                      address={proxyAccount.address}
                      label={`${proxyAccount.proxyType} proxy`}
                      icon={<Shield className="w-4 h-4 text-blue-400" />}
                      isSelected={selectedAddress === proxyAccount.address}
                      onSelect={() => {
                        onSelect(proxyAccount.address, true, false, {
                          proxyType: proxyAccount.proxyType,
                        })
                        setOpenDialog(null)
                      }}
                      onRemove={() => handleRemoveProxy(proxyAccount.address)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Multisig accounts */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500 uppercase tracking-wide">Multisig Accounts</div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setOpenDialog('multisig')}
                  className="h-6 px-2 text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" /> Add
                </Button>
              </div>

              {multisigs.length === 0 ? (
                <div className="text-sm text-gray-500 py-2">
                  No multisig accounts added
                </div>
              ) : (
                <div className="space-y-1">
                  {multisigs.map(msig => (
                    <AccountOption
                      key={msig.address}
                      address={msig.address}
                      label={msig.name || `${msig.threshold}/${msig.signatories.length} multisig`}
                      icon={<Users className="w-4 h-4 text-purple-400" />}
                      isSelected={selectedAddress === msig.address}
                      onSelect={() => {
                        onSelect(msig.address, false, true, {
                          multisigThreshold: msig.threshold,
                          multisigSignatories: msig.signatories,
                        })
                        setOpenDialog(null)
                      }}
                      onRemove={() => handleRemoveMultisig(msig.address)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Proxy Dialog */}
      <Dialog open={openDialog === 'proxy'} onOpenChange={(open) => {
        if (!open) { setOpenDialog(null); setForm(initialFormState) }
      }}>
        <DialogContent className="dark:bg-gray-900 max-w-md">
          <DialogHeader>
            <DialogTitle>Add Proxy Account</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-sm text-gray-400">
              Enter the address of an account that has added you as a proxy.
              This will be verified on-chain.
            </p>

            <Input
              placeholder="Account address (e.g., 5Grw...)"
              value={form.proxyAddress}
              onChange={(e) => updateForm({ proxyAddress: e.target.value, error: null })}
              className="bg-gray-800 border-gray-700"
            />

            {form.error && (
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                {form.error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpenDialog(null); setForm(initialFormState) }}>
              Cancel
            </Button>
            <Button
              onClick={handleAddProxy}
              disabled={!form.proxyAddress || form.isVerifying}
              className="bg-pink-500 hover:bg-pink-600"
            >
              {form.isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify & Add"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Multisig Dialog */}
      <Dialog open={openDialog === 'multisig'} onOpenChange={(open) => {
        if (!open) { setOpenDialog(null); setForm(initialFormState) }
      }}>
        <DialogContent className="dark:bg-gray-900 max-w-md">
          <DialogHeader>
            <DialogTitle>Add Multisig Account</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm text-gray-400 block mb-2">
                Signatories (one per line, your address will be added)
              </label>
              <textarea
                placeholder="5Grw...\n5Hpz...\n5Abc..."
                value={form.multisigSignatories}
                onChange={(e) => updateForm({ multisigSignatories: e.target.value, error: null })}
                className="w-full h-24 bg-gray-800 border border-gray-700 rounded-md p-2 text-sm font-mono"
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 block mb-2">
                Threshold (min signatures required)
              </label>
              <Input
                type="number"
                min={2}
                value={form.multisigThreshold}
                onChange={(e) => updateForm({ multisigThreshold: parseInt(e.target.value) || 2 })}
                className="bg-gray-800 border-gray-700"
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 block mb-2">
                Name (optional)
              </label>
              <Input
                placeholder="e.g., Team Treasury"
                value={form.multisigName}
                onChange={(e) => updateForm({ multisigName: e.target.value })}
                className="bg-gray-800 border-gray-700"
              />
            </div>

            {form.error && (
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                {form.error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpenDialog(null); setForm(initialFormState) }}>
              Cancel
            </Button>
            <Button
              onClick={handleAddMultisig}
              disabled={!form.multisigSignatories}
              className="bg-pink-500 hover:bg-pink-600"
            >
              Add Multisig
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function AccountOption({
  address,
  label,
  icon,
  isSelected,
  onSelect,
  onRemove,
}: {
  address: SS58String
  label: string
  icon: React.ReactNode
  isSelected: boolean
  onSelect: () => void
  onRemove?: () => void
}) {
  return (
    <div
      className={`
        flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors
        ${isSelected ? "bg-pink-500/20 border border-pink-500/30" : "bg-gray-800/50 hover:bg-gray-700/50"}
      `}
      onClick={onSelect}
    >
      <Avatar.Root className="w-8 h-8 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
        <Avatar.Fallback className="w-full h-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center">
          {icon}
        </Avatar.Fallback>
      </Avatar.Root>

      <div className="flex-1 min-w-0">
        <div className="text-sm text-white truncate font-mono">
          {address.slice(0, 8)}...{address.slice(-6)}
        </div>
        <div className="text-xs text-gray-400">{label}</div>
      </div>

      {isSelected && (
        <Check className="w-4 h-4 text-pink-400 flex-shrink-0" />
      )}

      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="p-1 text-gray-500 hover:text-red-400 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
