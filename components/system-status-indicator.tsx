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
    <div className="fixed top-0 left-0 right-0 z-50 p-4">
      <Alert variant={status === "offline" ? "destructive" : "default"} className="mx-auto max-w-2xl">
        {status === "offline" ? (
          <WifiOff className="h-4 w-4" />
        ) : status === "degraded" ? (
          <AlertCircle className="h-4 w-4" />
        ) : (
          <CheckCircle className="h-4 w-4" />
        )}
        <AlertTitle>{status === "offline" ? "Offline Mode" : "Limited Mode"}</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
      </Alert>
    </div>
  )
}
