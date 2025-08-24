import { CheckCircle, Clock, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/lib/ui"
import { Timeline, TimelineEventType } from "@/types/timeline";
import { formatDate } from "../utils/date-time";

interface VerificationTimelineProps {
  timeline: Timeline;
}

const EVENTS_ADDITIONAL_INFO: Record<TimelineEventType, {
  description: string
  details: string
}> = {
  created: {
    description: "Account created",
    details: "The user account record was created in the system."
  },
  verified: {
    description: "Core verification completed",
    details: "Primary identity and baseline eligibility checks were completed."
  },
  discord: {
    description: "Discord account linked",
    details: "The user connected a Discord account for community / role validation."
  },
  display: {
    description: "Display name set",
    details: "A public display name was provided or updated."
  },
  email: {
    description: "Email verified",
    details: "The user confirmed ownership of their email address."
  },
  matrix: {
    description: "Matrix ID linked",
    details: "A Matrix (Element) account was associated and validated."
  },
  twitter: {
    description: "X (Twitter) handle linked",
    details: "The user linked an X (formerly Twitter) profile for social proof."
  },
  github: {
    description: "GitHub account linked",
    details: "A GitHub profile was connected for developer/reputation signals."
  },
  legal: {
    description: "Legal review passed",
    details: "KYC / legal compliance checks were completed successfully."
  },
  web: {
    description: "Website verified",
    details: "Ownership of an external website or domain was confirmed."
  },
  image: {
    description: "Profile image set",
    details: "The user uploaded or updated a profile image."
  },
  pgp_fingerprint: {
    description: "PGP fingerprint added",
    details: "A PGP public key fingerprint was submitted and recorded."
  },
}

export function VerificationTimeline({ timeline }: VerificationTimelineProps) {

  const getStatusClasses = (status: string) => {
    switch (status) {
      case "completed":
        return {
          iconContainerBg: "bg-green-500",
          iconColor: "text-white",
          connectorBg: "bg-green-500",
          cardBorder: "border-green-500/30",
          cardBg: "bg-green-900/20",
        }
      case "pending":
        return {
          iconContainerBg: "bg-yellow-500",
          iconColor: "text-white",
          connectorBg: "bg-yellow-500",
          cardBorder: "border-yellow-500/30",
          cardBg: "bg-yellow-900/20",
        }
      case "failed":
        return {
          iconContainerBg: "bg-red-500",
          iconColor: "text-white",
          connectorBg: "bg-red-500",
          cardBorder: "border-red-500/30",
          cardBg: "bg-red-900/20",
        }
      default: // upcoming or other
        return {
          iconContainerBg: "bg-gray-500",
          iconColor: "text-white",
          connectorBg: "bg-gray-500",
          cardBorder: "border-gray-600",
          cardBg: "bg-gray-700/30",
        }
    }
  }

  const getStatusIcon = (status: string, iconColor: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className={`w-4 h-4 ${iconColor}`} />
      case "pending":
        return <Clock className={`w-4 h-4 ${iconColor} animate-spin`} />
      case "failed":
        return <AlertTriangle className={`w-4 h-4 ${iconColor}`} />
      case "upcoming":
        return <Clock className={`w-4 h-4 ${iconColor}`} />
      default:
        return <Clock className={`w-4 h-4 ${iconColor}`} />
    }
  }

  if (!timeline || timeline.length === 0) {
    return (
      <Card className="bg-gray-800 border-pink-500/30">
        <CardHeader>
          <CardTitle className="text-white">Verification Timeline</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <p className="text-gray-400 text-center py-4">No verification events yet.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-gray-800 border-pink-500/30">
      <CardHeader>
        <CardTitle className="text-white flex items-center">Verification Timeline</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="relative">
          {" "}
          {/* Container for timeline bar and events */}
          {/* Main Vertical Timeline Bar */}
          <div className="absolute left-3.5 top-0 h-full w-0.5 bg-gray-600" aria-hidden="true"></div>
          <div className="space-y-5">
            {" "}
            {/* Spacing between timeline items */}
            {timeline.map((event) => {
              const statusClasses = getStatusClasses(event.event)
              const additionalInfo = EVENTS_ADDITIONAL_INFO[event.event]

              return (
                <div key={event.date.toLocaleString()} className="relative pl-10">
                  {" "}
                  {/* pl-10 for node (w-7) + connector (w-3) */}
                  {/* Node (Icon Container) */}
                  <div
                    className={`absolute left-0 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center ${statusClasses.iconContainerBg} z-10 border-4 border-gray-800`}
                  >
                    {/* border-gray-800 matches Card's bg, creating cutout effect */}
                    {getStatusIcon(event.event, statusClasses.iconColor)}
                  </div>
                  {/* Horizontal Connector from Node to Card */}
                  <div
                    className={`absolute left-7 top-1/2 -translate-y-px w-3 h-0.5 ${statusClasses.connectorBg} z-0`}
                    aria-hidden="true"
                  ></div>
                  {/* Event Content Card */}
                  <div className={`p-3 rounded-lg ${statusClasses.cardBorder} ${statusClasses.cardBg} shadow-sm`}>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-1">
                      <h4 className="font-medium text-white text-sm">{additionalInfo.description}</h4>
                      <span className="text-xs text-gray-400 mt-1 sm:mt-0 flex-shrink-0">{formatDate(event.date)}</span>
                    </div>
                    <p className="text-xs text-gray-300">{additionalInfo.details}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
