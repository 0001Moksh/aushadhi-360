"use client"

// Global status indicator component to show on all pages
// Uses caching to prevent excessive API calls

import { useEffect, useState, useRef } from "react"
import { AlertCircle, CheckCircle, WifiOff } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

const HEALTH_CACHE_KEY = "system_health_cache"
const CHECK_INTERVAL = 60000 // 60 seconds instead of 15 seconds
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

interface CachedHealth {
  status: "online" | "degraded" | "offline"
  message: string
  timestamp: number
}

export function SystemStatusIndicator() {
  const [status, setStatus] = useState<"online" | "degraded" | "offline">("online")
  const [message, setMessage] = useState("")
  const isFetchingRef = useRef(false)
  const lastFetchRef = useRef<number>(0)

  useEffect(() => {
    // Load cached status on mount
    const cached = localStorage.getItem(HEALTH_CACHE_KEY)
    if (cached) {
      try {
        const entry: CachedHealth = JSON.parse(cached)
        const now = Date.now()
        if (now - entry.timestamp < CACHE_TTL) {
          setStatus(entry.status)
          setMessage(entry.message)
          lastFetchRef.current = entry.timestamp
        }
      } catch (err) {
        console.error("Failed to load health cache:", err)
      }
    }

    checkSystemStatus()
    const interval = setInterval(checkSystemStatus, CHECK_INTERVAL)
    return () => clearInterval(interval)
  }, [])

  async function checkSystemStatus() {
    const now = Date.now()
    
    // Prevent rapid API calls within 30 seconds
    if (isFetchingRef.current || now - lastFetchRef.current < 30000) {
      return
    }

    isFetchingRef.current = true

    try {
      const response = await fetch("/api/admin/health/status")

      if (!response.ok) {
        setStatus("degraded")
        setMessage("Some services are experiencing issues")
        cacheStatus("degraded", "Some services are experiencing issues")
        lastFetchRef.current = Date.now()
        return
      }

      const data = await response.json()
      let newStatus: "online" | "degraded" | "offline" = "online"
      let newMessage = ""

      if (data.overallHealth === "down") {
        newStatus = "offline"
        newMessage = "Working in offline mode. Data will sync automatically."
      } else if (data.overallHealth === "degraded") {
        newStatus = "degraded"
        newMessage = "Some features may be limited. Core functions working normally."
      }

      setStatus(newStatus)
      setMessage(newMessage)
      cacheStatus(newStatus, newMessage)
      lastFetchRef.current = Date.now()
    } catch (err) {
      console.error("Health check error:", err)
      // On error, try to use cached data
      const cached = localStorage.getItem(HEALTH_CACHE_KEY)
      if (cached) {
        try {
          const entry: CachedHealth = JSON.parse(cached)
          setStatus(entry.status)
          setMessage(entry.message)
        } catch {
          setStatus("offline")
          setMessage("Connection issue detected. Working offline.")
        }
      } else {
        setStatus("offline")
        setMessage("Connection issue detected. Working offline.")
      }
    } finally {
      isFetchingRef.current = false
    }
  }

  function cacheStatus(newStatus: "online" | "degraded" | "offline", newMessage: string) {
    const cacheEntry: CachedHealth = {
      status: newStatus,
      message: newMessage,
      timestamp: Date.now(),
    }
    localStorage.setItem(HEALTH_CACHE_KEY, JSON.stringify(cacheEntry))
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
