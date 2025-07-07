import { Link } from "lucide-react"

// Data structures
export const HELP_SLIDES = {
  features: {
    title: "Features",
    items: [
      {
        title: "Platform Verification",
        description: "Prove ownership of your Discord, Twitter, Matrix, and email accounts through automated challenge-response verification."
      },
      {
        title: "Automated Validation",
        description: "Simple challenge-response system confirms your control of declared accounts using one-time verification codes."
      },
      {
        title: "Status Monitoring",
        description: "Track your verification progress with real-time status updates throughout the process."
      },
      {
        title: "On-chain Registration",
        description: "Successfully verified identities are registered directly on-chain, providing transparent proof of ownership."
      }
    ]
  },
  steps: {
    title: "Verification Process",
    items: [
      {
        title: "Wallet Connection",
        description: "Connect your Polkadot wallet and select the account for verification."
      },
      {
        title: "Identity Declaration",
        description: "Declare the accounts and domains you want to verify as part of your on-chain identity."
      },
      {
        title: "Validation",
        description: "Complete automated challenge-response verification for each declared platform."
      },
      {
        title: "Judgement",
        description: "Receive an on-chain judgement confirming verified ownership of your declared accounts."
      }
    ]
  },
  faq: {
    title: "FAQ",
    items: [
      {
        title: "Verification Duration",
        description: "The automated process typically completes within 5 minutes, depending on how quickly you complete the challenges."
      },
      {
        title: "Failed Validations",
        description: "Failed challenges can be reattempted immediately. Contact support for persistent issues."
      },
      {
        title: "On-chain Data",
        description: "All verified identity information is stored publicly on-chain. Only declare accounts you want publicly associated with your address."
      },
      {
        title: "Multiple Accounts",
        description: "Each account requires separate verification. The same external accounts cannot be used across multiple verifications."
      }
    ]
  },
  states: {
    title: "Verification States",
    items: [
      {
        title: "Uninitialized",
        description: "No on-chain identity declared. Set your identity information to begin verification."
      },
      {
        title: "Initialized",
        description: "Identity information declared on-chain. Ready to request judgement."
      },
      {
        title: "Pending",
        description: "Judgement requested and awaiting processing."
      },
      {
        title: "Processing",
        description: "Payment confirmed. Challenge-response verification in progress."
      },
      {
        title: "Verified",
        description: "Verification complete. Judgement registered on-chain confirming account ownership."
      }
    ]
  },
  support: {
    title: "Support",
    items: Object.entries(import.meta.env)
      .filter(([key]) => key.startsWith("VITE_APP_CONTACT_LINK_"))
      .map(([key, value]) => {
        const contactLinkName = key.replace("VITE_APP_CONTACT_LINK_", "").replace("_", " ")
        return ({
          key,
          title: <><Link className="inline h-4 w-4" />  {contactLinkName}</>,
          description: <a href={value} target="_blank" rel="noreferrer" className="break-words">
            {value}
          </a>,
        })
      })
  }
} as const

export const Overview = () => (
  <section className="max-w-3xl mx-auto px-4 py-4 text-center">
    <h1 className="text-3xl font-bold mb-2">Identity Verification</h1>
    <p className="text-lg text-gray-600">
      Verify ownership of your social media accounts and web domains for transparent on-chain
      identity. Our automated judgement system helps you prove control of your declared accounts,
      allowing others to verify who they&apos;re interacting with on the Polkadot network.
    </p>
  </section>
)

export const StartGuide = () => (
  <section className="max-w-3xl mx-auto px-4 py-3 text-center">
    <p className="text-lg text-gray-600">
      Start the verification process to establish your on-chain identity. The automated system
      validates your account ownership through simple challenge-response checks.
    </p>
  </section>
)


type HelpItem = {
  key?: string
  title: React.ReactNode
  description: React.ReactNode
}

const Item = ({ title, description }: HelpItem) => {
  return (
    <div
      className="dark:bg-gray-800 bg-gray-200 border-1 border-gray rounded-lg shadow-sm p-3 text-center sm:w-[13rem] w-[70vw]"
    >
      <h3 className="font-semibold text-md mb-2 dark:text-gray-200">{title}</h3>
      <p className="dark:text-gray-400 text-sm">{description}</p>
    </div>
  )
}

export const Collection = ({ title, items }: { title: string, items: HelpItem[] }) => {
  return <>
    <h2 className="text-2xl font-bold text-center mb-3">{title}</h2>
    <div
      className="grid sm:grid-cols-2 grid-col-1 gap-2 overflow-auto max-h-[20rem] sm:max-h-full sm:overflow-visible"
    >
      {items.map(({ key, title, description }) => (
        <Item key={(key || title) as string} title={title} description={description} />
      ))}
    </div>
  </>
}
