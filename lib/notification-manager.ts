// Manages admin notifications with batching and deduplication

interface NotificationQueueItem {
  id: string
  service: string
  severity: string
  message: string
  timestamp: Date
  sent: boolean
}

class NotificationManager {
  private static instance: NotificationManager
  private queue: NotificationQueueItem[] = []
  private batchInterval = 60000 // Batch notifications every 1 minute
  private maxBatchSize = 10
  private intervalId?: NodeJS.Timeout

  private constructor() {
    this.loadQueue()
  }

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager()
    }
    return NotificationManager.instance
  }

  startBatching(): void {
    if (this.intervalId) return

    this.intervalId = setInterval(() => {
      this.processBatch()
    }, this.batchInterval)
  }

  stopBatching(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = undefined
    }
  }

  addToQueue(item: Omit<NotificationQueueItem, "id" | "sent">): void {
    // Check for duplicates (same service + severity within 5 minutes)
    const isDuplicate = this.queue.some(
      (existing) =>
        existing.service === item.service &&
        existing.severity === item.severity &&
        new Date(item.timestamp).getTime() - new Date(existing.timestamp).getTime() < 300000,
    )

    if (isDuplicate) {
      console.log("[NotificationManager] Duplicate notification ignored")
      return
    }

    this.queue.push({
      ...item,
      id: `notif_${Date.now()}_${Math.random()}`,
      sent: false,
    })

    this.saveQueue()

    // If queue is full, process immediately
    if (this.queue.length >= this.maxBatchSize) {
      this.processBatch()
    }
  }

  private async processBatch(): Promise<void> {
    const unsent = this.queue.filter((item) => !item.sent)

    if (unsent.length === 0) return

    console.log(`[NotificationManager] Processing ${unsent.length} notifications`)

    for (const item of unsent) {
      try {
        await fetch("/api/admin/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item),
        })

        item.sent = true
      } catch (error) {
        console.error("[NotificationManager] Failed to send:", error)
      }
    }

    // Clean up sent notifications older than 24 hours
    const oneDayAgo = Date.now() - 86400000
    this.queue = this.queue.filter((item) => !item.sent || new Date(item.timestamp).getTime() > oneDayAgo)

    this.saveQueue()
  }

  private saveQueue(): void {
    localStorage.setItem("notification_queue", JSON.stringify(this.queue))
  }

  private loadQueue(): void {
    const stored = localStorage.getItem("notification_queue")
    if (stored) {
      try {
        this.queue = JSON.parse(stored)
      } catch {
        this.queue = []
      }
    }
  }

  getQueue(): NotificationQueueItem[] {
    return this.queue
  }
}

export const notificationManager = NotificationManager.getInstance()
