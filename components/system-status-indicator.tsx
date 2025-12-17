"use client"

// Global status indicator component to show on all pages

import { useEffect, useState } from "react"
import { AlertCircle, CheckCircle, WifiOff } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function SystemStatusIndicator() {
  const [status, setStatus] = useState<"online" | "degraded" | "offline">("online")
  const [message, setMessage] = useState("")

  useEffect(() => {
    checkSystemStatus()
    const interval = setInterval(checkSystemStatus, 15000) // Check every 15 seconds
    return () => clearInterval(interval)
  }, [])

  async function checkSystemStatus() {
    try {
      const response = await fetch("/api/admin/health/status")

      if (!response.ok) {
        setStatus("degraded")
        setMessage("Some services are experiencing issues")
        return
      }

      const data = await response.json()

      if (data.overallHealth === "down") {
        setStatus("offline")
        setMessage("Working in offline mode. Data will sync automatically.")
      } else if (data.overallHealth === "degraded") {
        setStatus("degraded")
        setMessage("Some features may be limited. Core functions working normally.")
      } else {
        setStatus("online")
        setMessage("")
      }
    } catch {
      setStatus("offline")
      setMessage("Connection issue detected. Working offline.")
    }
  }

  if (status === "online") {
    return null // Don't show anything when all is well
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pt-4">
  <Alert
    variant={status === "offline" ? "destructive" : "default"}
    className={`
      w-1/2 max-w-2xl
      backdrop-blur-xl
      bg-background/10
      shadow-lg 
      border-white border-3
      animate-slide-down
      flex items-start gap-3
    `}
  >
    {/* Status Icon */}
    <div className="mt-0.5">
      {status === "offline" ? (
        <WifiOff className="h-5 w-5 text-destructive" />
      ) : status === "degraded" ? (
        <AlertCircle className="h-5 w-5 text-yellow-500" />
      ) : (
        <CheckCircle className="h-5 w-5 text-green-600" />
      )}
    </div>

    {/* Content */}
    <div>
      <AlertTitle className="text-sm font-semibold tracking-wide">
        {status === "offline"
          ? "Offline Mode"
          : status === "degraded"
          ? "Limited Connectivity"
          : "All Systems Operational"}
      </AlertTitle>

      <AlertDescription className="text-sm text-muted-foreground mt-1 leading-relaxed">
        {message}
      </AlertDescription>
    </div>
  </Alert>
</div>
  )
}
