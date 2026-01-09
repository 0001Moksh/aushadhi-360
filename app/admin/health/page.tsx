"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, AlertTriangle, CheckCircle, XCircle } from "lucide-react"
import type { HealthStatus } from "@/lib/health-monitor"
import type { APIConfig } from "@/lib/api-config"

export default function HealthMonitoringDashboard() {
  const [healthStatuses, setHealthStatuses] = useState<HealthStatus[]>([])
  const [apiConfig, setApiConfig] = useState<APIConfig | null>(null)
  const [overallHealth, setOverallHealth] = useState<"healthy" | "degraded" | "down">("healthy")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  useEffect(() => {
    loadHealthData()
    const interval = setInterval(loadHealthData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  async function loadHealthData() {
    try {
      const response = await fetch("/api/admin/health/status")
      const data = await response.json()
      setHealthStatuses(data.statuses)
      setApiConfig(data.config)
      setOverallHealth(data.overallHealth)
      setLastUpdate(new Date())
    } catch (error) {
      console.error("Failed to load health data:", error)
    }
  }

  async function handleRefresh() {
    setIsRefreshing(true)
    await loadHealthData()
    setIsRefreshing(false)
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "healthy":
        return "text-green-600"
      case "degraded":
        return "text-yellow-600"
      case "down":
        return "text-red-600"
      default:
        return "text-gray-600"
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "healthy":
        return <Badge className="bg-green-100 text-green-800">Healthy</Badge>
      case "degraded":
        return <Badge className="bg-yellow-100 text-yellow-800">Degraded</Badge>
      case "down":
        return <Badge className="bg-red-100 text-red-800">Down</Badge>
      default:
        return <Badge>Unknown</Badge>
    }
  }

  function getOverallStatusIcon() {
    switch (overallHealth) {
      case "healthy":
        return <CheckCircle className="h-8 w-8 text-green-600" />
      case "degraded":
        return <AlertTriangle className="h-8 w-8 text-yellow-600" />
      case "down":
        return <XCircle className="h-8 w-8 text-red-600" />
    }
  }

  const serviceGroups = healthStatuses.reduce(
    (acc, status) => {
      if (!acc[status.service]) {
        acc[status.service] = []
      }
      acc[status.service].push(status)
      return acc
    },
    {} as Record<string, HealthStatus[]>,
  )

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-balance">System Health Monitor</h1>
            <p className="text-muted-foreground text-pretty">Real-time status of all API services</p>
          </div>
          <Button onClick={handleRefresh} disabled={isRefreshing} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Overall Health Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Overall System Health</CardTitle>
                <CardDescription>Last updated: {lastUpdate.toLocaleTimeString()}</CardDescription>
              </div>
              {getOverallStatusIcon()}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="text-4xl font-bold capitalize">{overallHealth}</div>
              {getStatusBadge(overallHealth)}
            </div>
          </CardContent>
        </Card>

        {/* Service Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {Object.entries(serviceGroups).map(([service, statuses]) => (
            <Card key={service}>
              <CardHeader>
                <CardTitle className="capitalize">{service} Service</CardTitle>
                <CardDescription>{statuses.length} provider(s) configured</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {statuses.map((status, index) => (
                    <div key={index} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex-1">
                        <div className="font-medium">{status.provider}</div>
                        <div className="text-sm text-muted-foreground">Response time: {status.responseTime}ms</div>
                        <div className="text-xs text-muted-foreground">
                          Last checked: {new Date(status.lastCheck).toLocaleTimeString()}
                        </div>
                      </div>
                      <div>{getStatusBadge(status.status)}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* API Configuration */}
        {apiConfig && (
          <Card>
            <CardHeader>
              <CardTitle>API Configuration</CardTitle>
              <CardDescription>Current provider priorities and settings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(apiConfig).map(([service, providers]) => (
                  <div key={service}>
                    <h3 className="mb-2 font-semibold capitalize">{service}</h3>
                    <div className="space-y-2">
                      {providers.map((provider, index) => (
                        <div key={index} className="flex items-center justify-between rounded border p-2 text-sm">
                          <span>{provider.name}</span>
                          <div className="flex items-center gap-4">
                            <span className="text-muted-foreground">Priority: {provider.priority}</span>
                            <Badge variant={provider.isHealthy ? "default" : "destructive"}>
                              {provider.isHealthy ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
