"use client"

// Custom hook for checking system health from any component
// Uses local storage caching to prevent excessive API calls

import { useEffect, useState, useRef } from "react"

export interface SystemHealth {
  overall: "healthy" | "degraded" | "down"
  services: Record<string, boolean>
  canContinue: boolean
}

const HEALTH_CHECK_INTERVAL = 60000 // 60 seconds instead of 30 seconds
const HEALTH_CACHE_KEY = "system_health_cache"

interface CachedHealth {
  data: SystemHealth
  timestamp: number
}

export function useSystemHealth() {
  const [health, setHealth] = useState<SystemHealth>({
    overall: "healthy",
    services: {},
    canContinue: true,
  })
  const isFetchingRef = useRef(false)
  const lastFetchRef = useRef<number>(0)

  useEffect(() => {
    // Load from cache on mount
    const cached = localStorage.getItem(HEALTH_CACHE_KEY)
    if (cached) {
      try {
        const entry: CachedHealth = JSON.parse(cached)
        const now = Date.now()
        // Use cache if less than 5 minutes old
        if (now - entry.timestamp < 5 * 60 * 1000) {
          setHealth(entry.data)
          lastFetchRef.current = entry.timestamp
        }
      } catch (err) {
        console.error("Failed to load health cache:", err)
      }
    }

    // Set up interval for periodic checks
    checkHealth()
    const interval = setInterval(checkHealth, HEALTH_CHECK_INTERVAL)
    return () => clearInterval(interval)
  }, [])

  async function checkHealth() {
    const now = Date.now()
    
    // Prevent rapid-fire requests within 30 seconds
    if (isFetchingRef.current || now - lastFetchRef.current < 30000) {
      return
    }

    isFetchingRef.current = true

    try {
      const response = await fetch("/api/admin/health/status")
      const data = await response.json()

      const services: Record<string, boolean> = {}
      data.statuses.forEach((status: { service: string; status: string }) => {
        services[status.service] = status.status === "healthy"
      })

      const healthData: SystemHealth = {
        overall: data.overallHealth,
        services,
        canContinue: data.overallHealth !== "down",
      }

      // Cache the result
      const cacheEntry: CachedHealth = {
        data: healthData,
        timestamp: Date.now(),
      }
      localStorage.setItem(HEALTH_CACHE_KEY, JSON.stringify(cacheEntry))

      setHealth(healthData)
      lastFetchRef.current = Date.now()
    } catch (err) {
      console.error("Health check failed:", err)
      // On error, try to use cached data or default to healthy
      const cached = localStorage.getItem(HEALTH_CACHE_KEY)
      if (cached) {
        try {
          const entry: CachedHealth = JSON.parse(cached)
          setHealth(entry.data)
        } catch {
          // If cache is invalid, show degraded status
          setHealth({
            overall: "degraded",
            services: {},
            canContinue: true,
          })
        }
      }
    } finally {
      isFetchingRef.current = false
    }
  }

  return { health, refresh: checkHealth }
}
