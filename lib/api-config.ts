// API configuration with fallback support
// Allows hot-swapping APIs without downtime

export interface APIProvider {
  name: string
  priority: number // Lower number = higher priority
  isHealthy: boolean
  lastHealthCheck: Date
  endpoint?: string
  apiKey?: string
}

export interface APIConfig {
  ai: APIProvider[]
  ocr: APIProvider[]
  smtp: APIProvider[]
  database: APIProvider[]
}

// Configuration for all API providers
export const apiConfig: APIConfig = {
  ai: [
    {
      name: "Gemini",
      priority: 1,
      isHealthy: true,
      lastHealthCheck: new Date(),
      endpoint: process.env.NEXT_PUBLIC_GEMINI_ENDPOINT,
      apiKey: process.env.GEMINI_API_KEY,
    },
    {
      name: "LocalFallback",
      priority: 2,
      isHealthy: true,
      lastHealthCheck: new Date(),
      endpoint: "/api/local-ai",
    },
  ],

  ocr: [
    {
      name: "Tesseract",
      priority: 1,
      isHealthy: true,
      lastHealthCheck: new Date(),
      endpoint: "/api/ocr/tesseract",
    },
    {
      name: "ManualEntry",
      priority: 2,
      isHealthy: true,
      lastHealthCheck: new Date(),
      endpoint: "/api/ocr/manual",
    },
  ],

  smtp: [
    {
      name: "Gmail",
      priority: 1,
      isHealthy: true,
      lastHealthCheck: new Date(),
      endpoint: "smtp.gmail.com",
    },
    {
      name: "LocalStorage",
      priority: 2,
      isHealthy: true,
      lastHealthCheck: new Date(),
      endpoint: "/api/email/queue",
    },
  ],

  database: [
    {
      name: "MongoDB Atlas",
      priority: 1,
      isHealthy: true,
      lastHealthCheck: new Date(),
      endpoint: process.env.DATABASE_URL,
    },
    {
      name: "LocalStorage",
      priority: 2,
      isHealthy: true,
      lastHealthCheck: new Date(),
      endpoint: "local",
    },
  ],
}

class APIConfigManager {
  private static instance: APIConfigManager
  private config: APIConfig = apiConfig

  private constructor() {
    // Load config from localStorage if available
    this.loadConfig()
  }

  static getInstance(): APIConfigManager {
    if (!APIConfigManager.instance) {
      APIConfigManager.instance = new APIConfigManager()
    }
    return APIConfigManager.instance
  }

  // Get the best available provider for a service
  getBestProvider(serviceType: keyof APIConfig): APIProvider | null {
    const providers = this.config[serviceType].filter((p) => p.isHealthy).sort((a, b) => a.priority - b.priority)

    return providers[0] || null
  }

  // Get all providers for a service
  getAllProviders(serviceType: keyof APIConfig): APIProvider[] {
    return this.config[serviceType]
  }

  // Mark provider as unhealthy
  markProviderUnhealthy(serviceType: keyof APIConfig, providerName: string): void {
    const provider = this.config[serviceType].find((p) => p.name === providerName)
    if (provider) {
      provider.isHealthy = false
      provider.lastHealthCheck = new Date()
      this.saveConfig()
    }
  }

  // Mark provider as healthy
  markProviderHealthy(serviceType: keyof APIConfig, providerName: string): void {
    const provider = this.config[serviceType].find((p) => p.name === providerName)
    if (provider) {
      provider.isHealthy = true
      provider.lastHealthCheck = new Date()
      this.saveConfig()
    }
  }

  // Update provider configuration
  updateProvider(serviceType: keyof APIConfig, providerName: string, updates: Partial<APIProvider>): void {
    const provider = this.config[serviceType].find((p) => p.name === providerName)
    if (provider) {
      Object.assign(provider, updates)
      this.saveConfig()
    }
  }

  // Add new provider
  addProvider(serviceType: keyof APIConfig, provider: APIProvider): void {
    this.config[serviceType].push(provider)
    this.saveConfig()
  }

  // Remove provider
  removeProvider(serviceType: keyof APIConfig, providerName: string): void {
    this.config[serviceType] = this.config[serviceType].filter((p) => p.name !== providerName)
    this.saveConfig()
  }

  private saveConfig(): void {
    if (typeof window !== "undefined") {
      localStorage.setItem("api_config", JSON.stringify(this.config))
    }
  }

  private loadConfig(): void {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("api_config")
      if (stored) {
        try {
          this.config = JSON.parse(stored)
        } catch {
          // Use default config
        }
      }
    }
  }

  getConfig(): APIConfig {
    return this.config
  }
}

export const apiConfigManager = APIConfigManager.getInstance()
