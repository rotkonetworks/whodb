"use client"

import { CheckCircle, Clock, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Profile } from "@/lib/profile"

interface VerificationTimelineProps {
  profile: Profile
}

// Mock verification events - assuming this structure from your existing code
const generateMockEvents = (profile: Profile) => [
  {
    id: 1,
    type: "registration",
    status: "completed",
    date: "2023-09-15T14:30:00Z",
    description: "Identity registered on-chain",
    details: `Deposit: ${profile.deposit || "0.1000000000 TOKEN"}`,
  },
  {
    id: 2,
    type: "fee",
    status: "completed",
    date: "2023-09-15T14:35:00Z",
    description: "Verification fee paid",
    details: "Fee: 0.0500000000 TOKEN",
  },
  {
    id: 3,
    type: "verification",
    status: profile.judgement === "Reasonable" || profile.judgement === "KnownGood" ? "completed" : "pending",
    date: profile.judgement === "Reasonable" || profile.judgement === "KnownGood" ? "2023-09-16T10:15:00Z" : null,
    description: "Identity verification",
    details:
      profile.judgement === "Reasonable" || profile.judgement === "KnownGood"
        ? `Judgement: ${profile.judgement}`
        : "Awaiting verification from registrar",
  },
  {
    id: 4,
    type: "renewal",
    status: "upcoming",
    date: "2024-09-15T14:30:00Z",
    description: "Annual renewal",
    details: "Fee: 0.0250000000 TOKEN",
  },
]

export function VerificationTimeline({ profile }: VerificationTimelineProps) {
  const events = generateMockEvents(profile)

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Pending"
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

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

  if (!events || events.length === 0) {
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
            {events.map((event) => {
              const statusClasses = getStatusClasses(event.status)
              return (
                <div key={event.id} className="relative pl-10">
                  {" "}
                  {/* pl-10 for node (w-7) + connector (w-3) */}
                  {/* Node (Icon Container) */}
                  <div
                    className={`absolute left-0 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center ${statusClasses.iconContainerBg} z-10 border-4 border-gray-800`}
                  >
                    {/* border-gray-800 matches Card's bg, creating cutout effect */}
                    {getStatusIcon(event.status, statusClasses.iconColor)}
                  </div>
                  {/* Horizontal Connector from Node to Card */}
                  <div
                    className={`absolute left-7 top-1/2 -translate-y-px w-3 h-0.5 ${statusClasses.connectorBg} z-0`}
                    aria-hidden="true"
                  ></div>
                  {/* Event Content Card */}
                  <div className={`p-3 rounded-lg ${statusClasses.cardBorder} ${statusClasses.cardBg} shadow-sm`}>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-1">
                      <h4 className="font-medium text-white text-sm">{event.description}</h4>
                      <span className="text-xs text-gray-400 mt-1 sm:mt-0 flex-shrink-0">{formatDate(event.date)}</span>
                    </div>
                    <p className="text-xs text-gray-300">{event.details}</p>
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
