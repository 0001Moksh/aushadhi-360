// API endpoint to get complete health status

import { NextResponse } from "next/server"
import { healthMonitor } from "@/lib/health-monitor"
import { apiConfigManager } from "@/lib/api-config"

export const runtime = "edge"

export async function GET() {
  try {
    const statuses = healthMonitor.getHealthStatus()
    const config = apiConfigManager.getConfig()
    const overallHealth = healthMonitor.getOverallHealth()

    return NextResponse.json({
      statuses,
      config,
      overallHealth,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[Health Status] Error:", error)
    return NextResponse.json({ error: "Failed to get health status" }, { status: 500 })
  }
}