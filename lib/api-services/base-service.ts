// Base service class with automatic failover logic

import { apiConfigManager, type APIProvider } from "../api-config"
import { handleServiceError, type ServiceType, ErrorSeverity } from "../error-handler"

export interface ServiceResponse<T> {
  success: boolean
  data?: T
  error?: string
  provider?: string
  fallbackUsed: boolean
}

export abstract class BaseAPIService<T> {
  protected abstract serviceType: keyof ReturnType<typeof apiConfigManager.getConfig>
  protected abstract errorServiceType: ServiceType
  protected maxRetries = 2
  protected timeout = 10000 // 10 seconds

  // Main method with automatic failover
  async executeWithFailover(
    operation: (provider: APIProvider) => Promise<T>,
    userId?: string,
  ): Promise<ServiceResponse<T>> {
    const providers = apiConfigManager.getAllProviders(this.serviceType).filter((p) => p.isHealthy)

    if (providers.length === 0) {
      await handleServiceError(
        this.errorServiceType,
        new Error("No healthy providers available"),
        ErrorSeverity.CRITICAL,
        userId,
      )

      return {
        success: false,
        error: "Service temporarily unavailable",
        fallbackUsed: false,
      }
    }

    // Try each provider in order of priority
    for (let i = 0; i < providers.length; i++) {
      const provider = providers[i]
      const isFallback = i > 0

      try {
        console.log(`[${this.serviceType}] Attempting with provider: ${provider.name}`)

        const data = await this.executeWithTimeout(operation(provider), this.timeout)

        // Success - mark provider as healthy
        apiConfigManager.markProviderHealthy(this.serviceType, provider.name)

        return {
          success: true,
          data,
          provider: provider.name,
          fallbackUsed: isFallback,
        }
      } catch (error) {
        console.error(`[${this.serviceType}] Provider ${provider.name} failed:`, error)

        // Mark provider as unhealthy
        apiConfigManager.markProviderUnhealthy(this.serviceType, provider.name)

        // Notify admin if not on last provider
        if (i === providers.length - 1) {
          await handleServiceError(this.errorServiceType, error as Error, ErrorSeverity.HIGH, userId, {
            provider: provider.name,
          })
        }

        // Continue to next provider
        continue
      }
    }

    // All providers failed
    await handleServiceError(this.errorServiceType, new Error("All providers failed"), ErrorSeverity.CRITICAL, userId)

    return {
      success: false,
      error: "Service unavailable - please try again later",
      fallbackUsed: true,
    }
  }

  private executeWithTimeout<R>(promise: Promise<R>, timeout: number): Promise<R> {
    return Promise.race([
      promise,
      new Promise<R>((_, reject) => setTimeout(() => reject(new Error("Request timeout")), timeout)),
    ])
  }

  // Retry mechanism for failed operations
  async retry<R>(operation: () => Promise<R>, retries: number = this.maxRetries, delay = 1000): Promise<R> {
    try {
      return await operation()
    } catch (error) {
      if (retries <= 0) throw error

      await new Promise((resolve) => setTimeout(resolve, delay))
      return this.retry(operation, retries - 1, delay * 2)
    }
  }
}
