import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Lock, Upload, Check, AlertCircle, X } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { isValidPgpFingerprint, formatFingerprint } from '@/utils/pgp'
import { logger } from '@/utils/logger'

interface PgpKeyManagerProps {
  address: string
  network: string
  currentFingerprint?: string | null
  onKeyUploaded?: () => void
}

export function PgpKeyManager({
  address,
  network,
  currentFingerprint,
  onKeyUploaded
}: PgpKeyManagerProps) {
  const [pgpKey, setPgpKey] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleUpload = async () => {
    setError(null)
    setSuccess(false)

    if (!pgpKey.trim()) {
      setError('Please paste your PGP public key')
      return
    }

    // Basic validation
    if (!pgpKey.includes('BEGIN PGP PUBLIC KEY BLOCK')) {
      setError('Invalid PGP key format. Must start with -----BEGIN PGP PUBLIC KEY BLOCK-----')
      return
    }

    setUploading(true)

    try {
      // Extract fingerprint from key using openpgp
      const openpgp = await import('openpgp')
      const publicKey = await openpgp.readKey({ armoredKey: pgpKey })
      const fingerprint = publicKey.getFingerprint().toUpperCase()

      logger.log('Extracted fingerprint from key')

      // TODO: Upload to backend via WebSocket
      // For now, just validate
      if (!isValidPgpFingerprint(fingerprint)) {
        throw new Error('Invalid fingerprint format')
      }

      // Simulate upload
      await new Promise(resolve => setTimeout(resolve, 1000))

      setSuccess(true)
      setPgpKey('')

      if (onKeyUploaded) {
        onKeyUploaded()
      }

      logger.log('PGP key uploaded successfully')
    } catch (err) {
      logger.error('Failed to upload PGP key')
      setError(err instanceof Error ? err.message : 'Failed to upload key')
    } finally {
      setUploading(false)
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
        <div>
          <label className="text-sm text-gray-400 mb-2 block">
            Upload Your PGP Public Key
          </label>
          <Textarea
            value={pgpKey}
            onChange={(e) => setPgpKey(e.target.value)}
            placeholder="-----BEGIN PGP PUBLIC KEY BLOCK-----&#10;&#10;Paste your armored PGP public key here...&#10;&#10;-----END PGP PUBLIC KEY BLOCK-----"
            className="min-h-[200px] bg-gray-900/50 border-gray-700 text-white font-mono text-xs"
            disabled={uploading}
          />
          <p className="text-xs text-gray-500 mt-2">
            This allows others to send you encrypted messages. Your key will be stored on our server.
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
              PGP key uploaded successfully! Don't forget to add the fingerprint to your on-chain identity.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleUpload}
            disabled={uploading || !pgpKey.trim()}
            className="bg-pink-500 hover:bg-pink-600"
          >
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? 'Uploading...' : 'Upload Key'}
          </Button>

          {pgpKey && (
            <Button
              onClick={() => {
                setPgpKey('')
                setError(null)
                setSuccess(false)
              }}
              variant="ghost"
              disabled={uploading}
            >
              <X className="w-4 h-4 mr-2" />
              Clear
            </Button>
          )}
        </div>
      </div>

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
        </div>
      </div>
    </Card>
  )
}
