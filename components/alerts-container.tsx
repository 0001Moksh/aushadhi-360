"use client"

import { useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { X, AlertTriangle, AlertCircle, CheckCircle, Info } from "lucide-react"
import { cn } from "@/lib/utils"

interface ErrorAlert {
  id: string
  type: "error" | "warning" | "success" | "info"
  title?: string
  message: string
  dismissable?: boolean
  timestamp: number
}

interface AlertsContainerProps {
  alerts: ErrorAlert[]
  onDismiss: (id: string) => void
  maxVisible?: number
  position?: "top-center" | "top-right" | "top-left" | "bottom-center"
  className?: string
}

export function AlertsContainer({
  alerts,
  onDismiss,
  maxVisible = 10,
  position = "top-center",
  className,
}: AlertsContainerProps) {
  // Sort by timestamp and limit to maxVisible
  const visibleAlerts = alerts.slice(-maxVisible).sort((a, b) => b.timestamp - a.timestamp)

  const positionClasses = {
    "top-center": "top-4 left-1/2 -translate-x-1/2",
    "top-right": "top-4 right-4",
    "top-left": "top-4 left-4",
    "bottom-center": "bottom-4 left-1/2 -translate-x-1/2",
  }

  const typeConfig = {
    error: {
      variant: "destructive" as const,
      icon: AlertTriangle,
      bgColor: "bg-red-50 dark:bg-red-950",
      borderColor: "border-red-200 dark:border-red-800",
      textColor: "text-red-900 dark:text-red-100",
    },
    warning: {
      variant: "default" as const,
      icon: AlertCircle,
      bgColor: "bg-yellow-50 dark:bg-yellow-950",
      borderColor: "border-yellow-200 dark:border-yellow-800",
      textColor: "text-yellow-900 dark:text-yellow-100",
    },
    success: {
      variant: "default" as const,
      icon: CheckCircle,
      bgColor: "bg-green-50 dark:bg-green-950",
      borderColor: "border-green-200 dark:border-green-800",
      textColor: "text-green-900 dark:text-green-100",
    },
    info: {
      variant: "default" as const,
      icon: Info,
      bgColor: "bg-blue-50 dark:bg-blue-950",
      borderColor: "border-blue-200 dark:border-blue-800",
      textColor: "text-blue-900 dark:text-blue-100",
    },
  }

  const config = typeConfig[visibleAlerts[0]?.type ?? "info"]

  return (
    <div
      className={cn(
        "fixed z-50 pointer-events-none space-y-3",
        "w-[min(420px,calc(100%-1.5rem))]",
        positionClasses[position],
        className
      )}
    >
      {visibleAlerts.map((alert) => {
        const alertConfig = typeConfig[alert.type]
        const Icon = alertConfig.icon

        return (
          <Alert
            key={alert.id}
            variant={alertConfig.variant}
            className={cn(
              "relative pointer-events-auto shadow-lg border-2 pr-10",
              "animate-in fade-in slide-in-from-top-2 duration-300"
            )}
          >
            <Icon className="h-4 w-4" />
            {alert.title && <AlertTitle>{alert.title}</AlertTitle>}
            <AlertDescription className={alert.title ? "mt-2" : ""}>
              {alert.message}
            </AlertDescription>
            {alert.dismissable !== false && (
              <button
                aria-label={`Dismiss ${alert.type}`}
                onClick={() => onDismiss(alert.id)}
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </Alert>
        )
      })}

      {alerts.length > maxVisible && (
        <div className="text-xs text-muted-foreground text-center pt-2">
          +{alerts.length - maxVisible} more alerts
        </div>
      )}
    </div>
  )
}

export function useAlerts() {
  const [alerts, setAlerts] = useState<ErrorAlert[]>([])

  const addAlert = (
    message: string,
    type: ErrorAlert["type"] = "error",
    title?: string,
    dismissable?: boolean
  ) => {
    const id = `alert_${Date.now()}_${Math.random()}`
    setAlerts((prev) => [
      ...prev,
      {
        id,
        type,
        title,
        message,
        dismissable: dismissable ?? true,
        timestamp: Date.now(),
      },
    ])
    return id
  }

  const dismissAlert = (id: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id))
  }

  const clearAll = () => {
    setAlerts([])
  }

  const addError = (message: string, title = "Error") =>
    addAlert(message, "error", title)
  const addWarning = (message: string, title = "Warning") =>
    addAlert(message, "warning", title)
  const addSuccess = (message: string, title = "Success") =>
    addAlert(message, "success", title)
  const addInfo = (message: string, title = "Info") => addAlert(message, "info", title)

  return {
    alerts,
    addAlert,
    dismissAlert,
    clearAll,
    addError,
    addWarning,
    addSuccess,
    addInfo,
  }
}
