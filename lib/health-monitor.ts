// Health monitoring system for all APIs
// Runs periodic checks and auto-switches to fallbacks

import { apiConfigManager } from "./api-config"
import { errorHandler, ServiceType, ErrorSeverity } from "./error-handler"

export interface HealthStatus {
  service: string
  provider: string
  status: "healthy" | "degraded" | "down"
  responseTime: number
  lastCheck: Date
  errorRate: number
}

class HealthMonitor {
  private static instance: HealthMonitor
  private healthChecks: Map<string, HealthStatus> = new Map()
  private checkInterval = 60000 // 1 minute
  private intervalId?: NodeJS.Timeout

  private constructor() {}

  static getInstance(): HealthMonitor {
    if (!HealthMonitor.instance) {
      HealthMonitor.instance = new HealthMonitor()
    }
    return HealthMonitor.instance
  }

  // Start monitoring all services
  startMonitoring(): void {
    if (this.intervalId) return // Already monitoring

    this.intervalId = setInterval(() => {
      this.checkAllServices()
    }, this.checkInterval)

    // Initial check
    this.checkAllServices()
  }

  stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = undefined
    }
  }

  private async checkAllServices(): Promise<void> {
    const services: Array<keyof typeof ServiceType> = ["ai", "ocr", "smtp", "database"]

    for (const service of services) {
      const providers = apiConfigManager.getAllProviders(service)

      for (const provider of providers) {
        await this.checkProvider(service, provider.name)
      }
    }

    // Retry failed admin notifications
    await errorHandler.retryFailedNotifications()
  }

  private async checkProvider(serviceType: string, providerName: string): Promise<void> {
    const startTime = Date.now()
    const key = `${serviceType}:${providerName}`

    try {
      // Perform health check based on service type
      const isHealthy = await this.performHealthCheck(serviceType, providerName)
      const responseTime = Date.now() - startTime

      const status: HealthStatus = {
        service: serviceType,
        provider: providerName,
        status: isHealthy ? "healthy" : "down",
        responseTime,
        lastCheck: new Date(),
        errorRate: 0,
      }

      this.healthChecks.set(key, status)

      // Update provider status
      if (isHealthy) {
        apiConfigManager.markProviderHealthy(serviceType as any, providerName)
      } else {
        apiConfigManager.markProviderUnhealthy(serviceType as any, providerName)

        // Notify about service degradation
        await errorHandler.handleError({
          service: this.mapServiceType(serviceType),
          error: new Error(`${providerName} health check failed`),
          severity: ErrorSeverity.MEDIUM,
          timestamp: new Date(),
          metadata: { responseTime },
        })
      }
    } catch (error) {
      const status: HealthStatus = {
        service: serviceType,
        provider: providerName,
        status: "down",
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
        errorRate: 1,
      }

      this.healthChecks.set(key, status)
      apiConfigManager.markProviderUnhealthy(serviceType as any, providerName)
    }
  }

  private async performHealthCheck(serviceType: string, providerName: string): Promise<boolean> {
    try {
      // Make a lightweight health check request
      const response = await fetch(`/api/health/${serviceType}/${providerName}`, {
        method: "GET",
        signal: AbortSignal.timeout(5000), // 5 second timeout
      })

      return response.ok
    } catch {
      return false
    }
  }

  private mapServiceType(serviceType: string): ServiceType {
    const mapping: Record<string, ServiceType> = {
      ai: ServiceType.GEMINI_AI,
      ocr: ServiceType.OCR,
      smtp: ServiceType.SMTP,
      database: ServiceType.DATABASE,
    }
    return mapping[serviceType] || ServiceType.GENERAL
  }

  getHealthStatus(service?: string): HealthStatus[] {
    const statuses = Array.from(this.healthChecks.values())
    return service ? statuses.filter((s) => s.service === service) : statuses
  }

  getOverallHealth(): "healthy" | "degraded" | "down" {
    const statuses = Array.from(this.healthChecks.values())
    const downCount = statuses.filter((s) => s.status === "down").length
    const degradedCount = statuses.filter((s) => s.status === "degraded").length

    if (downCount > statuses.length / 2) return "down"
    if (degradedCount > 0 || downCount > 0) return "degraded"
    return "healthy"
  }
}

export const healthMonitor = HealthMonitor.getInstance()
