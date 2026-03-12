import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { usePolkadotApi } from "@/contexts/PolkadotApiContext"
import { useVerification } from "@/contexts/verification-context"
import { AlertTriangle, CheckCircle, ClipboardCopy, Github, Loader2, ShieldQuestion } from "lucide-react"
import type React from "react"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { GitHubVerification } from "./challenges/GitHubVerification"

interface VerifiableFormFieldProps {
  fieldId: "email" | "matrix" | "twitter" | "web" | "github" | "pgp_fingerprint" | "discord" | "image" | "legal"
  label: string
  icon: React.ReactNode
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  verificationInstructions: {
    method: "code" | "oauth" | "dns-challenge" | "challenge" | "challenge-url" | "gpg-challenge"
    contactAddress?: string
    details?: string
  }
}

export function VerifiableFormField({
  fieldId,
  label,
  icon,
  value,
  onChange,
  placeholder,
  type = "text",
  verificationInstructions,
}: VerifiableFormFieldProps) {
  const { startVerification, confirmVerification, getFieldStatus, isVerifying, challenges } = useVerification()
  const [challengeOrCode, setChallengeOrCode] = useState<string | null>(null)
  const [signedChallenge, setSignedChallenge] = useState<string>("")

  const fieldStatus = getFieldStatus(fieldId)
  

  const { identity, chainStore, accountStore } = usePolkadotApi()

  // Auto-populate challenge code when available from WebSocket
  useEffect(() => {
    const wsChallenge = challenges[fieldId]
    
    if (wsChallenge && wsChallenge.code && !challengeOrCode) {
      setChallengeOrCode(wsChallenge.code)
    }
  }, [challenges, fieldId, challengeOrCode, fieldStatus])

  const handleRequestChallenge = async () => {
    console.log(`🔵 Request Challenge clicked for ${fieldId}`);
    
    // Check if we have a value (either from user input or WebSocket account name)
    const effectiveValue = challenges[fieldId]?.accountName || value
    if (!effectiveValue) {
      toast.error(`Please enter your ${label.toLowerCase()} before requesting verification.`)
      return
    }
    
    console.log(`🔵 Requesting challenge for ${fieldId}`);
    
    try {
      const challengeCode = await startVerification(
        fieldId,
        verificationInstructions.method,
        label
      );
      
      console.log(`🔵 Challenge requested successfully`);
      
      if (challengeCode) {
        setChallengeOrCode(challengeCode);
        toast.success(`Challenge received for ${label}!`);
      } else {
        toast.info(`Challenge request submitted for ${label}. Please wait...`);
      }
    } catch (error) {
      console.error('Challenge request error:', error);
      toast.error(`Failed to request challenge for ${label}`);
    }
  }

  const handleVerifyClick = async () => {
    console.log(`🔵 Verify clicked for ${fieldId}`);
    
    // Check if we have a value (either from user input or WebSocket account name)
    const effectiveValue = challenges[fieldId]?.accountName || value
    if (!effectiveValue) {
      toast.error(`Please enter your ${label.toLowerCase()} before verifying.`)
      return
    }
    
    // For PGP verification, handle signed challenge submission
    if (fieldId === "pgp_fingerprint" && verificationInstructions.method === "gpg-challenge") {
      if (!signedChallenge) {
        toast.error("Please paste your signed PGP message before confirming verification.")
        return
      }
      const isConfirmed = await confirmVerification(fieldId, {
        signed_challenge: signedChallenge,
        pubkey: effectiveValue,
        network: (chainStore.id as string).split("_")[0],
        account: accountStore.encodedAddress!!
      })
      if (isConfirmed) {
        toast.success("PGP verification confirmed!")
      } else {
        toast.error("PGP verification failed. Please check your signed message.")
      }
      return
    }

    // For other verification methods, just trigger the check
    // Challenges are automatically provided by WebSocket
    console.log(`🔵 Confirming verification for ${fieldId}`);
    await confirmVerification(fieldId, undefined as never)
  }

  const copyToClipboard = (text: string, message = "Copied to clipboard!") => {
    navigator.clipboard.writeText(text)
    toast.success(message)
  }

  const isInputDisabled = fieldStatus?.status === "pending" || fieldStatus?.status === "verified"
  const isVerifyingThisField = isVerifying(fieldId)

  const renderStatusIcon = () => {
    switch (fieldStatus?.status) {
      case "verified":
        return <CheckCircle className="w-4 h-4 text-green-400" />
      case "pending":
        return <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
      case "failed":
        return <AlertTriangle className="w-4 h-4 text-red-400" />
      default:
        // If we have a challenge from WebSocket but no status, show as ready for verification
        if (challengeOrCode) {
          return <ShieldQuestion className="w-4 h-4 text-yellow-400" />
        }
        return <ShieldQuestion className="w-4 h-4 text-gray-500" />
    }
  }

  const renderVerificationButton = () => {
    if (fieldStatus?.status === "verified") {
      return (
        <span className="text-xs text-green-400 font-medium flex items-center h-8 px-3">
          <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Verified
        </span>
      )
    }

    // Show verification button when we have a challenge to process OR when field has value (fallback)
    const shouldShowButton = challengeOrCode || (value && value.trim() !== "")
    
    if (shouldShowButton) {
      const isGithubChallengeUrl = verificationInstructions.method === "challenge-url"
        && fieldId === "github"
      if (isGithubChallengeUrl) {
        return (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleVerifyClick}
            disabled={isVerifyingThisField}
            className="text-xs h-8 px-2.5 border border-pink-500/70 text-pink-400 hover:bg-pink-500/10 hover:text-pink-300"
          >
            {isVerifyingThisField ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                <Github className="w-3 h-3 mr-1" /> Verify with GitHub
              </>
            )}
          </Button>
        )
      }

      return (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={challengeOrCode ? handleVerifyClick : handleRequestChallenge}
          disabled={isVerifyingThisField}
          className="text-xs h-8 px-2.5 border border-yellow-500/70 text-yellow-400 hover:bg-yellow-500/10 hover:text-yellow-300"
        >
          {isVerifyingThisField ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            challengeOrCode ? "Check Verification" : "Request Challenge"
          )}
        </Button>
      )
    }

    // No button when no challenge is available - challenges come automatically from WebSocket
    return null
  }

  return (
    <div className="space-y-2 p-3 bg-gray-800/50 border border-gray-700 rounded-lg">
      <div className="flex items-center justify-between">
        <Label htmlFor={fieldId} className="flex items-center text-white text-sm">
          {icon}
          {label}
        </Label>
        {renderStatusIcon()}
      </div>
      <div className="flex items-center space-x-2">
        <Input
          id={fieldId}
          type={type}
          value={challenges[fieldId]?.accountName || value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`text-white placeholder:text-gray-400/60 placeholder:italic placeholder:font-light focus:border-pink-500 disabled:opacity-70 disabled:cursor-not-allowed text-sm ${
            challenges[fieldId]?.accountName 
              ? 'bg-blue-900/30 border-blue-500/50 text-blue-200' 
              : 'bg-gray-700 border-pink-500/30'
          }`}
          disabled={isInputDisabled || isVerifyingThisField || !!challenges[fieldId]?.accountName}
        />
        {renderVerificationButton()}
      </div>

      {(fieldStatus?.status === "pending" || challengeOrCode) && challengeOrCode && (
        <div className="p-2.5 mt-2.5 text-xs text-yellow-200 bg-yellow-900/30 border border-yellow-500/40 rounded-md space-y-1.5">
          <p className="font-semibold text-yellow-100 mb-1">Action Required:</p>
          
          {/* Show general instructions (except for methods with specific detailed instructions) */}
          {verificationInstructions.details && 
           verificationInstructions.method !== "dns-challenge" && 
           verificationInstructions.method !== "gpg-challenge" && (
            <p className="text-yellow-200 mb-2">{verificationInstructions.details}</p>
          )}

          {(verificationInstructions.method === "code" || verificationInstructions.method === "challenge") && (
            <>
              <div className="my-1.5 p-1.5 bg-gray-900 rounded-md flex items-center justify-between">
                <span className="font-mono text-sm tracking-wider text-white">{challengeOrCode}</span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="w-7 h-7 text-gray-300 hover:text-white"
                  onClick={() => copyToClipboard(challengeOrCode)}
                  aria-label="Copy verification code"
                >
                  <ClipboardCopy className="w-3.5 h-3.5" />
                </Button>
              </div>
            </>
          )}
          {verificationInstructions.method === "gpg-challenge" && fieldId === "pgp_fingerprint" && (
            <>
              {/* Show instructions for PGP */}
              {verificationInstructions.details && (
                <p className="text-yellow-200 mb-2">{verificationInstructions.details}</p>
              )}
              <p>1. Sign the following challenge string with your PGP key ({value || "your key"}):</p>
              <div className="my-1.5 p-2 bg-gray-900 rounded-md">
                <pre className="font-mono text-xs text-white whitespace-pre-wrap break-all">{challengeOrCode}</pre>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-xs h-auto p-1 mt-1.5 text-gray-300 hover:text-white"
                  onClick={() => copyToClipboard(challengeOrCode, "PGP Challenge copied!")}
                >
                  <ClipboardCopy className="w-3 h-3 mr-1" />
                </Button>
              </div>
              <p>2. Use this command to sign: <code className="bg-gray-700 px-1 rounded">gpg --clearsign --armor</code></p>
              <p>3. Paste the full PGP signed message (including headers and footers) below:</p>
              <Textarea
                value={signedChallenge}
                onChange={(e) => setSignedChallenge(e.target.value)}
                placeholder="-----BEGIN PGP SIGNED MESSAGE-----&#10;Hash: SHA256&#10;&#10;...&#10;-----BEGIN PGP SIGNATURE-----&#10;...&#10;-----END PGP SIGNATURE-----"
                className="bg-gray-900 text-white font-mono text-xs h-28 mt-1.5 p-2"
                aria-label="Paste PGP signed message"
              />
              <p className="text-[11px] text-yellow-300/80">
                Ensure your public key is available on keyservers (keys.openpgp.org or pgp.mit.edu)
              </p>
            </>
          )}
          {verificationInstructions.method === "dns-challenge" && fieldId === "web" && (
            <>
              {/* Show instructions for DNS */}
              {verificationInstructions.details && (
                <p className="text-yellow-200 mb-2">{verificationInstructions.details}</p>
              )}
              <p>
                Add the following TXT record to your domain&apos;s DNS settings for{" "}
                <strong className="text-yellow-100">{value || "your website"}</strong>:
              </p>
              <div className="my-1.5 p-1.5 bg-gray-900 rounded-md font-mono text-sm text-white flex items-center justify-between">
                <span>whodb-verification={challengeOrCode}</span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="w-7 h-7 text-gray-300 hover:text-white"
                  onClick={() => copyToClipboard(`whodb-verification=${challengeOrCode}`)}
                  aria-label="Copy DNS TXT record value"
                >
                  <ClipboardCopy className="w-3.5 h-3.5" />
                </Button>
              </div>
              <p className="text-[11px] text-yellow-300/80">
                Note: DNS changes can take some time to propagate globally.
              </p>
            </>
          )}
          {verificationInstructions.method === "challenge-url" && fieldId === "github"
            && challengeOrCode && identity?.info?.github && (
              <GitHubVerification
                url={challengeOrCode}
                expectedUsername={identity?.info?.github}
                onVerify={(isVerified) => {
                  if (isVerified) {
                    toast.success("GitHub account successfully verified!")
                  } else {
                    toast.error("GitHub verification failed. Please try again.")
                  }
                }}
              />
            )}
        </div>
      )}

    </div>
  )
}
