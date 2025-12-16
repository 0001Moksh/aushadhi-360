"use client"

// Custom hook for checking system health from any component

import { useEffect, useState } from "react"

export interface SystemHealth {
  overall: "healthy" | "degraded" | "down"
  services: Record<string, boolean>
  canContinue: boolean
}

export function useSystemHealth() {
  const [health, setHealth] = useState<SystemHealth>({
    overall: "healthy",
    services: {},
    canContinue: true,
  })

  useEffect(() => {
    checkHealth()
    const interval = setInterval(checkHealth, 30000)
    return () => clearInterval(interval)
  }, [])

  async function checkHealth() {
    try {
      const response = await fetch("/api/admin/health/status")
      const data = await response.json()

      const services: Record<string, boolean> = {}
      data.statuses.forEach((status: { service: string; status: string }) => {
        services[status.service] = status.status === "healthy"
      })

      setHealth({
        overall: data.overallHealth,
        services,
        canContinue: data.overallHealth !== "down",
      })
    } catch {
      setHealth({
        overall: "down",
        services: {},
        canContinue: true, // Can continue in offline mode
      })
    }
  }

  return { health, refresh: checkHealth }
}
