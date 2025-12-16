// Database service with offline-first approach

import { BaseAPIService, type ServiceResponse } from "./base-service"
import { ServiceType } from "../error-handler"
import type { APIProvider } from "../api-config"

export interface DBOperation {
  type: "create" | "read" | "update" | "delete"
  collection: string
  data?: unknown
  query?: unknown
}

export interface DBResponse {
  success: boolean
  data?: unknown
  synced: boolean
}

class DatabaseService extends BaseAPIService<DBResponse> {
  protected serviceType = "database" as const
  protected errorServiceType = ServiceType.DATABASE

  async execute(operation: DBOperation, userId?: string): Promise<ServiceResponse<DBResponse>> {
    return this.executeWithFailover(async (provider) => {
      if (provider.name === "MongoDB Atlas") {
        return this.executeOnMongoDB(operation, provider)
      } else {
        // Fallback to local storage with sync queue
        return this.executeLocally(operation)
      }
    }, userId)
  }

  private async executeOnMongoDB(operation: DBOperation, provider: APIProvider): Promise<DBResponse> {
    const response = await fetch("/api/database/execute", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(operation),
    })

    if (!response.ok) {
      throw new Error(`Database operation failed: ${response.statusText}`)
    }

    const data = await response.json()
    return {
      success: true,
      data,
      synced: true,
    }
  }

  private async executeLocally(operation: DBOperation): Promise<DBResponse> {
    const localDB = JSON.parse(localStorage.getItem("local_db") || "{}")
    const collection = localDB[operation.collection] || []

    let result: unknown

    switch (operation.type) {
      case "create":
        collection.push({ ...operation.data, _localId: Date.now() })
        result = operation.data
        break
      case "read":
        result = collection.filter((item: unknown) => this.matchesQuery(item, operation.query))
        break
      case "update":
        // Update logic
        result = operation.data
        break
      case "delete":
        // Delete logic
        result = { deleted: true }
        break
    }

    localDB[operation.collection] = collection
    localStorage.setItem("local_db", JSON.stringify(localDB))

    // Add to sync queue
    this.queueForSync(operation)

    return {
      success: true,
      data: result,
      synced: false,
    }
  }

  private matchesQuery(item: unknown, query: unknown): boolean {
    // Simple query matching
    if (!query) return true
    // Implement query matching logic
    return true
  }

  private queueForSync(operation: DBOperation): void {
    const queue = JSON.parse(localStorage.getItem("sync_queue") || "[]")
    queue.push({
      ...operation,
      timestamp: new Date().toISOString(),
    })
    localStorage.setItem("sync_queue", JSON.stringify(queue))
  }

  async syncWithCloud(): Promise<number> {
    const queue = JSON.parse(localStorage.getItem("sync_queue") || "[]")
    let successCount = 0

    for (const operation of queue) {
      try {
        const result = await this.execute(operation)
        if (result.success && result.data?.synced) {
          successCount++
          // Remove from queue
          const updated = queue.filter(
            (op: DBOperation & { timestamp: string }) => op.timestamp !== operation.timestamp,
          )
          localStorage.setItem("sync_queue", JSON.stringify(updated))
        }
      } catch {
        // Keep in queue
      }
    }

    return successCount
  }
}

export const databaseService = new DatabaseService()
