// Core error handling system for Aushadhi 360
// Handles all API failures with graceful degradation

export enum ServiceType {
  GEMINI_AI = "GEMINI_AI",
  SMTP = "SMTP",
  DATABASE = "DATABASE",
  OCR = "OCR",
  GENERAL = "GENERAL",
}

export enum ErrorSeverity {
  LOW = "LOW", // User can continue without issue
  MEDIUM = "MEDIUM", // Some features unavailable
  HIGH = "HIGH", // Critical but has fallback
  CRITICAL = "CRITICAL", // Requires immediate attention
}

export interface ErrorContext {
  service: ServiceType
  error: Error
  severity: ErrorSeverity
  timestamp: Date
  userId?: string
  metadata?: Record<string, unknown>
}

export interface UserFacingError {
  title: string
  message: string
  actionable: boolean
  suggestedAction?: string
  canContinue: boolean
}

class ErrorHandler {
  private static instance: ErrorHandler
  private errorLog: ErrorContext[] = []
  private adminEmail = "moksh@example.com" // Admin email for Moksh Bhardwaj

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler()
    }
    return ErrorHandler.instance
  }

  // Convert technical errors to user-friendly messages
  getUserFacingError(context: ErrorContext): UserFacingError {
    switch (context.service) {
      case ServiceType.GEMINI_AI:
        return {
          title: "AI Assistant Unavailable",
          message: "AI suggestions are temporarily unavailable. You can continue with manual search.",
          actionable: true,
          suggestedAction: "Use manual medicine search",
          canContinue: true,
        }

      case ServiceType.SMTP:
        return {
          title: "Email Service Issue",
          message: "Email could not be sent right now. Your bill is saved and you can download it.",
          actionable: true,
          suggestedAction: "Download bill or try sending later",
          canContinue: true,
        }

      case ServiceType.DATABASE:
        if (context.severity === ErrorSeverity.CRITICAL) {
          return {
            title: "Connection Issue",
            message: "Working in offline mode. Your data will sync automatically when connection is restored.",
            actionable: false,
            canContinue: true,
          }
        }
        return {
          title: "Temporary Delay",
          message: "Syncing data in the background. No action needed.",
          actionable: false,
          canContinue: true,
        }

      case ServiceType.OCR:
        return {
          title: "Image Reading Issue",
          message: "Some items could not be read clearly. Please review and edit before saving.",
          actionable: true,
          suggestedAction: "Review and manually edit entries",
          canContinue: true,
        }

      default:
        return {
          title: "Temporary Issue",
          message: "We are fixing something. Please try again shortly.",
          actionable: true,
          suggestedAction: "Try again",
          canContinue: true,
        }
    }
  }

  // Log error and notify admin if needed
  async handleError(context: ErrorContext): Promise<UserFacingError> {
    // Log error
    this.errorLog.push(context)
    console.error(`[Aushadhi 360 Error] ${context.service}:`, context.error)

    // Notify admin for medium severity and above
    if (context.severity !== ErrorSeverity.LOW) {
      await this.notifyAdmin(context)
    }

    // Store in local storage for offline persistence
    this.persistErrorLog()

    return this.getUserFacingError(context)
  }

  private async notifyAdmin(context: ErrorContext): Promise<void> {
    try {
      // Send notification via API endpoint
      await fetch("/api/admin/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service: context.service,
          severity: context.severity,
          message: context.error.message,
          timestamp: context.timestamp,
          userId: context.userId,
          metadata: context.metadata,
        }),
      })
    } catch (notifyError) {
      // If notification fails, store for retry
      console.error("[Admin Notification Failed]:", notifyError)
      this.storeFailedNotification(context)
    }
  }

  private storeFailedNotification(context: ErrorContext): void {
    const failed = JSON.parse(localStorage.getItem("failed_notifications") || "[]")
    failed.push(context)
    localStorage.setItem("failed_notifications", JSON.stringify(failed))
  }

  private persistErrorLog(): void {
    // Keep only last 100 errors
    const recentErrors = this.errorLog.slice(-100)
    localStorage.setItem("error_log", JSON.stringify(recentErrors))
  }

  // Retry failed admin notifications
  async retryFailedNotifications(): Promise<void> {
    const failed = JSON.parse(localStorage.getItem("failed_notifications") || "[]")

    for (const context of failed) {
      try {
        await this.notifyAdmin(context)
        // Remove from failed queue if successful
        const updated = failed.filter((c: ErrorContext) => c.timestamp !== context.timestamp)
        localStorage.setItem("failed_notifications", JSON.stringify(updated))
      } catch {
        // Keep in queue for next retry
      }
    }
  }

  getErrorLog(): ErrorContext[] {
    return this.errorLog
  }
}

export const errorHandler = ErrorHandler.getInstance()

// Convenience function for error handling
export async function handleServiceError(
  service: ServiceType,
  error: Error,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM,
  userId?: string,
  metadata?: Record<string, unknown>,
): Promise<UserFacingError> {
  return errorHandler.handleError({
    service,
    error,
    severity,
    timestamp: new Date(),
    userId,
    metadata,
  })
}
