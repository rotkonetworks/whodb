import _ from "lodash"
import { AtSign, Mail, Copy, Shield, Github } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SOCIAL_ICONS } from "~/assets/icons"
import { DiscordIcon } from "~/assets/icons/discord"
import { XIcon } from "~/assets/icons/x"
import { AlertPropsOptionalKey } from "~/hooks/useAlerts"
import { LoadingPlaceholder } from "~/pages/Loading"
import { ChallengeStatus, ChallengeStore } from "~/store/challengesStore"
import { Identity } from "~/types/Identity"

import { PGPVerification } from "../challenges/PGPVerification"
import { StatusBadge } from "../challenges/StatusBadge"
import { Alert, AlertDescription, AlertTitle } from "../ui/alert"
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover"

// Challenge renderer interface for extensibility
interface ChallengeRenderer {
  (props: {
    field: string
    code: string
    status: ChallengeStatus
    identity: Identity
    onVerify: (data: unknown) => Promise<void>
    isLoading: boolean
  }): React.ReactElement | null
}

// Map of special challenge renderers
const specialChallengeRenderers: Record<string, ChallengeRenderer> = {
  pgp_fingerprint: ({ code, status, onVerify, isLoading }) => {
    if (!code || status !== ChallengeStatus.Pending) return null

    return (
      <PGPVerification
        challenge={code}
        onVerify={async (pubkey, signed_challenge) => {
          await onVerify({
            pubkey,
            signed_challenge,
          })
        }}
        isVerifying={isLoading}
      />
    )
  },
  // Easy to add more special renderers here
  // web: ({ ... }) => <WebVerification ... />,
  // github: ({ ... }) => <GitHubVerification ... />,
}

interface ChallengePageProps {
  addNotification: (alert: AlertPropsOptionalKey) => void
  challengeStore: {
    challenges: ChallengeStore
    error: string | null
    loading: boolean
  }
  identity: Identity
  chainStore: { id: string }
  accountStore: { encodedAddress: string }
  sendPGPVerification: (payload: {
    pubkey: string;
    signed_challenge: string;
    network: string;
    account: string
  }) => Promise<void>
  // Add more props as needed
}

export function ChallengePage({
  addNotification,
  challengeStore,
  identity,
  chainStore,
  accountStore,
  sendPGPVerification,
}: ChallengePageProps) {
  // State management
  const [localChallengeStore, setLocalChallengeStore] = useState(challengeStore.challenges)
  const [formData, setFormData] = useState<Record<string, { value: string; error: string | null }>>({})

  // Sync challenge store
  useEffect(() => {
    if (!challengeStore.loading && !_.isEqual(challengeStore.challenges, localChallengeStore)) {
      setLocalChallengeStore(challengeStore.challenges)
    }
  }, [challengeStore, localChallengeStore])

  // Build challenge configuration
  const challengeFieldsConfig = useMemo<ChallengeStore>(() => ({
    ...Object.fromEntries(
      Object.entries(localChallengeStore)
        .filter(([field]) => field !== "display_name")
        .map(([field, { code, status }]) => [field, { type: "matrixChallenge", code, status }])
    ),
  }), [localChallengeStore])

  // Form data sync
  useEffect(() => {
    const _formData = Object.fromEntries(
      Object.keys(challengeFieldsConfig)
        .filter(key => challengeFieldsConfig[key].type === "input")
        .map(key => [key, {
          value: formData[key]?.value || "",
          error: formData[key]?.error || null,
        }])
    )
    if (!_.isEqual(_formData, formData)) {
      setFormData(_formData)
    }
  }, [challengeFieldsConfig, formData])

  // Handlers
  const setFormField = useCallback((field: string, value: string): void => {
    setFormData(prev => ({
      ...prev,
      [field]: { ...prev[field], value }
    }))
  }, [])

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (error) {
      console.error('Failed to copy:', error)
      addNotification({
        type: 'error',
        message: 'Failed to copy to clipboard',
      })
    }
  }

  // Generic verification handler
  const handleVerification = async (field: string, data: null | {
    pubkey: string
    signed_challenge: string
  }) => {
    try {
      // Route to appropriate verification method
      switch (field) {
        case 'pgp_fingerprint':
          await sendPGPVerification({
            ...data,
            network: chainStore.id.split("_")[0],
            account: accountStore.encodedAddress,
          })
          break
        // Add more cases as needed
        default:
          throw new Error(`Unknown verification type: ${field}`)
      }
    } catch (error) {
      addNotification({
        type: 'error',
        message: `Failed to verify ${field}`,
      })
      console.error(`Verification error for ${field}:`, error)
    }
  }

  // Icon configuration
  const inviteLinkIcons: Record<string, React.ReactNode> = {
    matrix: <AtSign className="h-4 w-4" />,
    email: <Mail className="h-4 w-4" />,
    discord: <DiscordIcon className="h-4 w-4" />,
    twitter: <XIcon className="h-4 w-4" />,
    github: <Github className="h-4 w-4" />,
  }

  const inviteAltDescription: Record<string, string> = {
    matrix: "Accept the invite and paste it in the Matrix chat",
    email: "Send an email to the provided address with the code",
    discord: "Join the Discord server and paste the code in the #verification channel",
    twitter: "Send a DM to the provided Twitter account with the code",
  }

  // Popover descriptions (keeping existing implementation)
  const FullDescriptionPopOver = ({ button, name, url, onclick, description }: {
    button: React.ReactNode
    name: string
    url?: string
    onclick?: () => void
    description: React.ReactNode
  }) => {
    if (!url && !onclick) {
      throw new Error("Either url or onclick must be provided")
    }

    return (
      <Popover>
        <PopoverTrigger className="cursor-help" asChild>
          {button}
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-4 bg-[#2C2B2B] border-[#E6007A]" sideOffset={5}>
          {description}
          <a href={url} target="_blank" rel="noreferrer">
            <Button variant="primary" className="mt-2 w-full">
              {`Join ${name}`}
            </Button>
          </a>
        </PopoverContent>
      </Popover>
    )
  }

  const inviteFullDescriptions = {
    matrix: ({ button }) => (
      <FullDescriptionPopOver
        button={button}
        name="Matrix"
        url={import.meta.env.VITE_APP_INVITE_LINK_MATRIX}
        description={<ol className="list-decimal pl-4">
          <li>Click the button to join the Matrix server.</li>
          <li>Once you are in the server, find the {" "}<code>{import.meta.env.VITE_APP_CHALLENGES_PRIVATE_ACCOUNT_MATRIX}</code> bot in the admin members list.</li>
          <li>Send a DM to the bot with the code.</li>
          <li>Wait for the bot to verify your code.</li>
        </ol>}
      />
    ),
    twitter: ({ button }) => (
      <FullDescriptionPopOver
        button={button}
        name="Twitter"
        url={import.meta.env.VITE_APP_INVITE_LINK_TWITTER}
        description={<ol className="list-decimal pl-4">
          <li>Click the button to send a DM to the {" "}<code>@{import.meta.env.VITE_APP_CHALLENGES_PRIVATE_ACCOUNT_TWITTER}</code> X account.</li>
          <li>Send the code in the DM.</li>
          <li>Wait for the account to verify your code.</li>
        </ol>}
      />
    ),
    discord: ({ button }) => (
      <FullDescriptionPopOver
        button={button}
        name="Discord"
        url={import.meta.env.VITE_APP_INVITE_LINK_DISCORD}
        description={<ol className="list-decimal pl-4">
          <li>Click the button to join the Discord server.</li>
          <li>Once you are in the server, find the {" "}<code>{import.meta.env.VITE_APP_CHALLENGES_PRIVATE_ACCOUNT_DISCORD}</code> bot in the admin members list.</li>
          <li>Send a DM to the user with the code.</li>
          <li>Wait for the bot to verify your code.</li>
        </ol>}
      />
    ),
    email: ({ button }) => (
      <FullDescriptionPopOver
        button={button}
        name="Email"
        url={import.meta.env.VITE_APP_INVITE_LINK_EMAIL}
        description={<>
          <ol className="list-decimal pl-4">
            <li>Click the button to send an email to the provided address.</li>
            <li>
              Send the code in the email as the message body.
            </li>
            <p className="text-sm mt-1">
              <strong>Note:</strong> Subject does not matter, don&apos;t worry about it!
            </p>
            <li>Wait for the email to verify your code.</li>
          </ol>
          <Button variant="outline" size="icon" className="mt-2 w-full"
            onClick={async () => {
              await copyToClipboard(import.meta.env.VITE_APP_INVITE_LINK_EMAIL)
            }}
          >
            Copy Email
            <Copy className="h-4 w-4" />
          </Button>
        </>}
      />
    ),
    github: ({ button, link }) => (
      <FullDescriptionPopOver
        button={button}
        url={link}
        name="GitHub"
        description={
          <div>
            <ol className="list-decimal pl-4">
              <li>Follow the link.</li>
              <li>Log into your GitHub account.</li>
              <li>Click the button to accept the invite.</li>
            </ol>
          </div>
        }
      />
    ),
  }

  // Loading state
  if (challengeStore.loading && Object.keys(challengeFieldsConfig).length === 0) {
    return (
      <LoadingPlaceholder className="flex flex-col w-full h-40 flex-center">
        <span className="sm:text-3xl text-xl text-center font-bold pt-4">
          Loading Challenges...
        </span>
      </LoadingPlaceholder>
    )
  }

  // Main render
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-inherit flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Challenges
        </CardTitle>
        <CardDescription className="text-[#706D6D]">
          Complete these identity verification challenges by copying each code and submitting it via
          the chat link. All challenges must be passed for affirmative judgment. You have click the
          link for instructions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 p-4 overflow-x-auto">
        {Object.entries(challengeFieldsConfig).map(([field, { type, code, status }]) => {
          // Check for special renderer
          const specialRenderer = specialChallengeRenderers[field]
          if (specialRenderer) {
            const rendered = specialRenderer({
              field,
              code,
              status,
              identity,
              // Depending on the challenge type, the verification data may vary.
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onVerify: (data: any) => handleVerification(field, data),
              isLoading: challengeStore.loading,
            })
            if (rendered) {
              return <div key={field} className="mb-4 last:mb-0">{rendered}</div>
            }
          }

          // Default renderer
          const actualButton = inviteLinkIcons[field] ? (
            <Button variant="primary" size="icon">{inviteLinkIcons[field]}</Button>
          ) : null

          return (
            <div key={field} className="mb-4 last:mb-0 flex flex-col gap-2">
              <div className="flex flex-wrap justify-between gap-2">
                <Label htmlFor={`challenge-${field}`} className="flex flex-wrap items-center gap-2 max-w-full">
                  <div className="flex flex-col xs:flex-row gap-x-2 max-w-full">
                    <div className="flex items-center gap-2 shrink-0">
                      {SOCIAL_ICONS[field]}
                      <span className="font-bold">
                        {field.charAt(0).toUpperCase() + field.slice(1)} Code:
                      </span>
                    </div>
                    <span className="overflow-hidden truncate w-full sm:w-auto">
                      {identity.info[field]}
                    </span>
                  </div>
                </Label>
                <div className="flex flex-row gap-2 items-center justify-end grow">
                  <StatusBadge status={status} />
                </div>
              </div>
              <div className="flex justify-end flex-wrap gap-2">
                {(code && field !== "github") && (
                  <Input
                    id={`challenge-${field}`}
                    value={code}
                    readOnly
                    className="bg-transparent border-[#E6007A] text-inherit flex-grow flex-shrink-0 flex-basis-[120px]"
                  />
                )}
                {status === ChallengeStatus.Pending && (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={async () => {
                        if (type === "input") {
                          const clipText = await window.navigator.clipboard.readText()
                          setFormField(field, clipText)
                        } else if (code) {
                          await copyToClipboard(code)
                        }
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>

                    {import.meta.env[`VITE_APP_INVITE_LINK_${field.toUpperCase()}`] &&
                      (inviteFullDescriptions[field]
                        ? inviteFullDescriptions[field]({ button: actualButton })
                        : (
                          <a
                            href={import.meta.env[`VITE_APP_INVITE_LINK_${field.toUpperCase()}`]}
                            target="_blank"
                            rel="noreferrer"
                            title={inviteAltDescription[field]}
                          >
                            {actualButton}
                          </a>
                        )
                      )
                    }

                    {field === "github" && (
                      inviteFullDescriptions.github({
                        button: actualButton,
                        link: code,
                      })
                    )}

                    {field === "web" && <Button variant="primary">Verify</Button>}
                  </>
                )}
              </div>
            </div>
          )
        })}

        {Object.keys(challengeFieldsConfig).length > 0 && (
          <Alert key="useOwnAccounts">
            <AlertTitle>Note</AlertTitle>
            <AlertDescription className="flex flex-col justify-between items-center gap-2">
              <p>
                Please use your own accounts for verification. Otherwise, you will not be able to
                prove ownership of the linked accounts, thus failing the challenge.
              </p>
            </AlertDescription>
          </Alert>
        )}

        {challengeStore.error && (
          <Alert
            key="challengeError"
            variant="destructive"
            className="mb-4 bg-red-200 border-[#E6007A] text-red-800 dark:bg-red-800 dark:text-red-200"
          >
            <AlertTitle>Error</AlertTitle>
            <AlertDescription className="flex flex-col justify-between items-stretch gap-2">
              <p>There was an error loading the challenges. Please wait a moment and try again.</p>
              <p>{challengeStore.error}</p>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
