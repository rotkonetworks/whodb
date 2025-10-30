import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Lock, Upload, Check, AlertCircle, X, Sparkles, Mail, ShieldCheck } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { isValidPgpFingerprint, formatFingerprint } from '@/utils/pgp'
import { logger } from '@/utils/logger'
import { usePGPWebSocket } from '@/hooks/websocket/pgp'
import { useWebSocket } from '@/hooks/websocket'
import { toast } from 'sonner'
import { usePolkadotWallet } from '@/contexts/PolkadotWalletContext'

interface PgpKeyManagerProps {
  address: string
  network: string
  currentFingerprint?: string | null
  onKeyUploaded?: () => void
  onKeyVerified?: () => void
}

export function PgpKeyManager({
  address,
  network,
  currentFingerprint,
  onKeyUploaded,
  onKeyVerified
}: PgpKeyManagerProps) {
  const [pgpKey, setPgpKey] = useState('')
  const [uploading, setUploading] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [remailerEnabled, setRemailerEnabled] = useState(false)
  const [remailerRegisteredOnly, setRemailerRegisteredOnly] = useState(true)
  const [requireVerifiedPgp, setRequireVerifiedPgp] = useState(true)
  const [updatingSettings, setUpdatingSettings] = useState(false)

  // WebSocket connection for PGP operations
  const wsUrl = typeof window !== 'undefined' ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws` : ''
  const webSocket = useWebSocket({ url: wsUrl })
  const pgpWs = usePGPWebSocket(webSocket)
  const { signMessage } = usePolkadotWallet()

  const handleAutomatedVerification = async () => {
    setError(null)
    setSuccess(false)
    setVerifying(true)

    try {
      const cleanNetwork = network.toLowerCase().split('_')[0]

      await pgpWs.verifyAutomated({
        network: cleanNetwork,
        account: address,
      })

      setSuccess(true)

      if (onKeyVerified) {
        onKeyVerified()
      }

      logger.log('Automated PGP verification successful')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Automated verification failed'

      // Check if error is about key not found
      if (errorMessage.includes('No PGP key found') || errorMessage.includes('not found')) {
        setError('Key not found. Upload to keyserver.ubuntu.com or paste your key below to verify.')
      } else {
        setError(errorMessage)
      }

      logger.error('Automated verification failed:', errorMessage)
    } finally {
      setVerifying(false)
    }
  }

  const handleUpload = async () => {
    setError(null)
    setSuccess(false)

    if (!pgpKey.trim()) {
      setError('Please paste your PGP public key')
      return
    }

    // Improved validation - check for complete PGP block structure
    if (!pgpKey.includes('-----BEGIN PGP PUBLIC KEY BLOCK-----') ||
        !pgpKey.includes('-----END PGP PUBLIC KEY BLOCK-----')) {
      setError('Invalid PGP key format. Must be a complete armored PGP public key block.')
      return
    }

    setExtracting(true)

    try {
      // Extract fingerprint from key using openpgp
      const openpgp = await import('openpgp')
      const publicKey = await openpgp.readKey({ armoredKey: pgpKey })
      const fingerprint = publicKey.getFingerprint().toUpperCase()

      logger.log('Extracted fingerprint from key:', fingerprint)

      if (!isValidPgpFingerprint(fingerprint)) {
        throw new Error('Invalid fingerprint format')
      }

      setExtracting(false)
      setUploading(true)

      const cleanNetwork = network.toLowerCase().split('_')[0]

      // Upload to backend via WebSocket
      await pgpWs.uploadKey({
        network: cleanNetwork,
        account: address,
        fingerprint,
        armored_key: pgpKey,
      })

      setSuccess(true)
      setPgpKey('')

      if (onKeyUploaded) {
        onKeyUploaded()
      }

      logger.log('PGP key uploaded successfully')

      // After successful upload, try automated verification
      setTimeout(() => {
        handleAutomatedVerification()
      }, 500)
    } catch (err) {
      logger.error('Failed to upload PGP key:', err)
      setError(err instanceof Error ? err.message : 'Failed to upload key')
    } finally {
      setExtracting(false)
      setUploading(false)
    }
  }

  const handleUpdateRemailerSettings = async (
    enabled: boolean,
    registeredOnly: boolean,
    verifiedOnly: boolean
  ) => {
    setUpdatingSettings(true)

    try {
      const cleanNetwork = network.toLowerCase().split('_')[0]
      const timestamp = Date.now()

      // construct message to sign (must match backend format exactly)
      const message = `Update remailer settings\nAccount: ${address}\nNetwork: ${cleanNetwork}\nEnabled: ${enabled}\nRegistered only: ${registeredOnly}\nVerified PGP only: ${verifiedOnly}\nTimestamp: ${timestamp}`

      logger.log('Requesting signature for remailer settings update')

      // sign message with wallet
      const { signature } = await signMessage(address, message)

      logger.log('Signature obtained, sending settings update')

      await pgpWs.updateRemailerSettings({
        network: cleanNetwork,
        account: address,
        remailer_enabled: enabled,
        remailer_registered_only: registeredOnly,
        require_verified_pgp: verifiedOnly,
        signature,
        timestamp,
      })

      toast.success('Remailer settings updated successfully')
      logger.log('Remailer settings updated', { enabled, registeredOnly, verifiedOnly })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update settings'
      toast.error(errorMessage)
      logger.error('Failed to update remailer settings:', errorMessage)
      // Revert on error
      setRemailerEnabled(!enabled)
      setRemailerRegisteredOnly(!registeredOnly)
      setRequireVerifiedPgp(!verifiedOnly)
    } finally {
      setUpdatingSettings(false)
    }
  }

  return (
    <Card className="p-6 bg-gray-800/50 border-gray-700">
      <div className="flex items-center gap-3 mb-4">
        <Lock className="w-5 h-5 text-pink-400" />
        <h3 className="text-lg font-medium text-white">PGP Encryption</h3>
      </div>

      {currentFingerprint && (
        <div className="mb-4 p-3 bg-gray-900/50 rounded border border-gray-700/50">
          <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">
            Current Fingerprint
          </div>
          <div className="text-sm text-white font-mono break-all">
            {formatFingerprint(currentFingerprint)}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <Alert className="bg-blue-400/10 border-blue-400/50 text-blue-400">
          <Sparkles className="w-4 h-4" />
          <AlertDescription className="text-xs">
            Automatic verification fetches from keyserver.ubuntu.com and caches it for instant future lookups.
          </AlertDescription>
        </Alert>

        {currentFingerprint && (
          <Button
            onClick={handleAutomatedVerification}
            disabled={verifying}
            className="w-full bg-blue-500 hover:bg-blue-600"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {verifying ? 'Verifying...' : 'Try Automatic Verification'}
          </Button>
        )}

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-700" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-gray-800 px-2 text-gray-500">Or upload manually</span>
          </div>
        </div>

        <div>
          <label className="text-sm text-gray-400 mb-2 block">
            Upload Your PGP Public Key
          </label>
          <Textarea
            value={pgpKey}
            onChange={(e) => {
              const text = e.target.value.trim()
              setPgpKey(text)
            }}
            placeholder="Paste your PGP public key here..."
            className="min-h-[200px] bg-gray-900/50 border-gray-700 text-white font-mono text-xs"
            disabled={uploading || extracting}
          />
          <p className="text-xs text-gray-500 mt-2">
            This allows others to send you encrypted messages.
          </p>
        </div>

        {error && (
          <Alert className="bg-red-400/10 border-red-400/50 text-red-400">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="bg-green-400/10 border-green-400/50 text-green-400">
            <Check className="w-4 h-4" />
            <AlertDescription className="text-xs">
              {verifying ? 'Verification successful! Key cached for instant future lookups.' : 'Key uploaded and cached! Verifying...'}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleUpload}
            disabled={uploading || extracting || verifying || !pgpKey.trim()}
            className="bg-pink-500 hover:bg-pink-600"
          >
            <Upload className="w-4 h-4 mr-2" />
            {extracting ? 'Extracting fingerprint...' : uploading ? 'Uploading...' : 'Upload Key'}
          </Button>

          {pgpKey && (
            <Button
              onClick={() => {
                setPgpKey('')
                setError(null)
                setSuccess(false)
              }}
              variant="ghost"
              disabled={uploading || extracting || verifying}
            >
              <X className="w-4 h-4 mr-2" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {currentFingerprint && (
        <div className="mt-6 p-4 bg-gray-900/30 rounded border border-gray-700/50">
          <div className="flex items-center gap-3 mb-4">
            <Mail className="w-4 h-4 text-blue-400" />
            <h4 className="text-sm font-medium text-white">Remailer Settings</h4>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <label className="text-sm text-gray-300">Enable Remailer</label>
                <p className="text-xs text-gray-500 mt-1">
                  Allow others to send you encrypted messages via the remailer service
                </p>
              </div>
              <Switch
                checked={remailerEnabled}
                onCheckedChange={(checked) => {
                  setRemailerEnabled(checked)
                  handleUpdateRemailerSettings(checked, remailerRegisteredOnly, requireVerifiedPgp)
                }}
                disabled={updatingSettings}
              />
            </div>

            {remailerEnabled && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pl-4 border-l-2 border-blue-500/30">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-3 h-3 text-green-400" />
                      <label className="text-sm text-gray-300">Registered Users Only</label>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Only allow registered identities to contact you
                    </p>
                  </div>
                  <Switch
                    checked={remailerRegisteredOnly}
                    onCheckedChange={(checked) => {
                      setRemailerRegisteredOnly(checked)
                      handleUpdateRemailerSettings(remailerEnabled, checked, requireVerifiedPgp)
                    }}
                    disabled={updatingSettings}
                  />
                </div>

                <div className="flex items-center justify-between pl-4 border-l-2 border-green-500/30">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Lock className="w-3 h-3 text-green-400" />
                      <label className="text-sm text-gray-300">Verified PGP Only</label>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Only accept messages from senders with verified PGP keys
                    </p>
                  </div>
                  <Switch
                    checked={requireVerifiedPgp}
                    onCheckedChange={(checked) => {
                      setRequireVerifiedPgp(checked)
                      handleUpdateRemailerSettings(remailerEnabled, remailerRegisteredOnly, checked)
                    }}
                    disabled={updatingSettings}
                  />
                </div>
              </div>
            )}

            <Alert className="bg-blue-400/10 border-blue-400/50 text-blue-400">
              <AlertDescription className="text-xs">
                The remailer protects your privacy by allowing encrypted communication without revealing your identity.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      )}

      <div className="mt-6 p-4 bg-gray-900/30 rounded border border-gray-700/50">
        <div className="text-xs text-gray-400 space-y-2">
          <p className="font-medium text-gray-300">How to generate a PGP key:</p>
          <code className="block bg-gray-900/50 p-2 rounded text-xs">
            gpg --full-generate-key
          </code>
          <p className="font-medium text-gray-300 mt-3">Export your public key:</p>
          <code className="block bg-gray-900/50 p-2 rounded text-xs">
            gpg --armor --export your-email@example.com
          </code>
          <p className="font-medium text-gray-300 mt-3">Get your fingerprint:</p>
          <code className="block bg-gray-900/50 p-2 rounded text-xs">
            gpg --fingerprint your-email@example.com
          </code>
          <p className="font-medium text-gray-300 mt-3">Upload to keyserver (for automatic verification):</p>
          <code className="block bg-gray-900/50 p-2 rounded text-xs">
            gpg --keyserver keyserver.ubuntu.com --send-keys YOUR_FINGERPRINT
          </code>
        </div>
      </div>
    </Card>
  )
}
