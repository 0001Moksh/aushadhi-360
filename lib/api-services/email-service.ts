// Email service with queue-based retry system

import { BaseAPIService, type ServiceResponse } from "./base-service"
import { ServiceType } from "../error-handler"
import type { APIProvider } from "../api-config"

export interface EmailRequest {
  to: string
  subject: string
  body: string
  attachments?: Array<{
    filename: string
    content: string
  }>
}

export interface EmailResponse {
  sent: boolean
  queued: boolean
  messageId?: string
}

class EmailService extends BaseAPIService<EmailResponse> {
  protected serviceType = "smtp" as const
  protected errorServiceType = ServiceType.SMTP

  async sendEmail(request: EmailRequest, userId?: string): Promise<ServiceResponse<EmailResponse>> {
    return this.executeWithFailover(async (provider) => {
      if (provider.name === "Gmail") {
        return this.sendViaGmail(request, provider)
      } else {
        // Fallback to queue for later sending
        return this.queueEmail(request)
      }
    }, userId)
  }

  private async sendViaGmail(request: EmailRequest, provider: APIProvider): Promise<EmailResponse> {
    const response = await fetch("/api/email/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...request,
        provider: "gmail",
      }),
    })

    if (!response.ok) {
      throw new Error(`Email sending failed: ${response.statusText}`)
    }

    const data = await response.json()
    return {
      sent: true,
      queued: false,
      messageId: data.messageId,
    }
  }

  private async queueEmail(request: EmailRequest): Promise<EmailResponse> {
    // Store in local queue for retry
    const queue = JSON.parse(localStorage.getItem("email_queue") || "[]")
    queue.push({
      ...request,
      timestamp: new Date().toISOString(),
      retryCount: 0,
    })
    localStorage.setItem("email_queue", JSON.stringify(queue))

    return {
      sent: false,
      queued: true,
    }
  }

  async retryQueuedEmails(): Promise<number> {
    const queue = JSON.parse(localStorage.getItem("email_queue") || "[]")
    let successCount = 0

    for (const email of queue) {
      try {
        const result = await this.sendEmail(email)
        if (result.success && result.data?.sent) {
          successCount++
          // Remove from queue
          const updated = queue.filter((e: EmailRequest & { timestamp: string }) => e.timestamp !== email.timestamp)
          localStorage.setItem("email_queue", JSON.stringify(updated))
        }
      } catch {
        // Keep in queue
      }
    }

    return successCount
  }
}

export const emailService = new EmailService()
