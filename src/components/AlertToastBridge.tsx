import { useEffect, useRef } from "react"
import { toast } from "sonner"
import { AlertProps } from "@/hooks/useAlerts"

// Define icons for different alert types
const getAlertIcon = (type: AlertProps["type"]) => {
  switch (type) {
    case "success":
      return "✅"
    case "error":
      return "❌"
    case "info":
      return "ℹ️"
    case "loading":
      return "⏳"
    default:
      return ""
  }
}

interface AlertToastBridgeProps {
  alerts: AlertProps[]
  onDismissAlert?: (key: string) => void
}

/**
 * Bridge component that converts alerts from the PolkadotAPI alerts system
 * into toast notifications using Sonner toast library
 */
export function AlertToastBridge({ alerts, onDismissAlert }: AlertToastBridgeProps) {
  // Track which alerts have been converted to toasts - use ref to persist across renders
  const processedAlerts = useRef(new Set<string>())

  useEffect(() => {
    // Filter out already processed alerts
    const newAlerts = alerts.filter(alert => !processedAlerts.current.has(alert.key))
    
    newAlerts.forEach((alert) => {
      processedAlerts.current.add(alert.key)
      
      const icon = getAlertIcon(alert.type)
      const alertTitle = alert.title || `${icon} ${alert.type.charAt(0).toUpperCase() + alert.type.slice(1)}`
      
      // Common toast options
      const baseOptions = {
        description: alert.message,
        action: alert.seeDetails ? {
          label: "Details",
          onClick: alert.seeDetails,
        } : undefined,
        onDismiss: () => {
          onDismissAlert?.(alert.key)
          processedAlerts.current.delete(alert.key) // Clean up when dismissed
        },
        id: alert.key,
        className: "font-mono", // Match the app's monospace styling
      }

      // Convert alert to appropriate toast type
      switch (alert.type) {
        case "success":
          toast.success(alertTitle, {
            ...baseOptions,
            duration: alert.duration || 5000,
            className: `${baseOptions.className} border-green-500/50 bg-green-50/90 text-green-800 dark:bg-green-950/90 dark:text-green-200`,
          })
          break

        case "error":
          toast.error(alertTitle, {
            ...baseOptions,
            duration: alert.duration || 8000, // Error toasts last longer
            className: `${baseOptions.className} border-red-500/50 bg-red-50/90 text-red-800 dark:bg-red-950/90 dark:text-red-200`,
          })
          break

        case "info":
          toast.info(alertTitle, {
            ...baseOptions,
            duration: alert.duration || 5000,
            className: `${baseOptions.className} border-blue-500/50 bg-blue-50/90 text-blue-800 dark:bg-blue-950/90 dark:text-blue-200`,
          })
          break

        case "loading":
          toast.loading(alertTitle, {
            ...baseOptions,
            duration: alert.duration || Infinity, // Loading toasts persist until dismissed
            className: `${baseOptions.className} border-yellow-500/50 bg-yellow-50/90 text-yellow-800 dark:bg-yellow-950/90 dark:text-yellow-200`,
          })
          break

        default:
          // Fallback to basic toast
          toast(alertTitle, {
            ...baseOptions,
            duration: alert.duration || 5000,
          })
      }
    })

    // Clean up processed alerts that are no longer in the alerts array
    const currentAlertKeys = new Set(alerts.map(alert => alert.key))
    for (const processedKey of processedAlerts.current) {
      if (!currentAlertKeys.has(processedKey)) {
        processedAlerts.current.delete(processedKey)
        // Optionally dismiss the toast when alert is removed from the API
        toast.dismiss(processedKey)
      }
    }
  }, [alerts, onDismissAlert])

  // This component doesn't render anything - it just manages toast notifications
  return null
}
