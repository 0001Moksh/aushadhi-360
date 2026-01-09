// Admin notification API endpoint
// Sends instant alerts to Moksh Bhardwaj when APIs fail

import { type NextRequest, NextResponse } from "next/server"
import type { ServiceType, ErrorSeverity } from "@/lib/error-handler"

export const runtime = "edge"

interface NotificationPayload {
  service: ServiceType
  severity: ErrorSeverity
  message: string
  timestamp: Date
  userId?: string
  metadata?: Record<string, unknown>
}

export async function POST(request: NextRequest) {
  try {
    const payload: NotificationPayload = await request.json()

    // Send notification via multiple channels for redundancy
    const results = await Promise.allSettled([
      sendEmailNotification(payload),
      logToDatabase(payload),
      sendWebhookNotification(payload),
    ])

    const successCount = results.filter((r) => r.status === "fulfilled").length

    if (successCount === 0) {
      // All notification methods failed
      console.error("[CRITICAL] All admin notification methods failed:", payload)
      return NextResponse.json({ success: false, error: "All notification channels failed" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      notified: successCount,
      total: results.length,
    })
  } catch (error) {
    console.error("[Admin Notify] Error:", error)
    return NextResponse.json({ success: false, error: "Notification failed" }, { status: 500 })
  }
}

async function sendEmailNotification(payload: NotificationPayload): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL || "moksh@aushadhi360.com"
  const subject = `[Aushadhi 360] ${payload.severity} Alert: ${payload.service} Failure`

  const body = `
Service Failure Alert

Service: ${payload.service}
Severity: ${payload.severity}
Time: ${new Date(payload.timestamp).toLocaleString()}
User ID: ${payload.userId || "N/A"}

Error Message:
${payload.message}

Additional Details:
${JSON.stringify(payload.metadata, null, 2)}

---
This is an automated alert from Aushadhi 360
Action may be required to restore service
  `

  // Use Gmail SMTP
  const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ""}/api/email/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: adminEmail,
      subject,
      body,
      priority: "high",
    }),
  })

  if (!response.ok) {
    throw new Error("Email notification failed")
  }
}

async function logToDatabase(payload: NotificationPayload): Promise<void> {
  // Log to admin alerts collection in MongoDB
  const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ""}/api/database/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "create",
      collection: "admin_alerts",
      data: {
        ...payload,
        resolved: false,
        createdAt: new Date(),
      },
    }),
  })

  if (!response.ok) {
    throw new Error("Database logging failed")
  }
}

async function sendWebhookNotification(payload: NotificationPayload): Promise<void> {
  // Optional: Send to external webhook (Slack, Discord, etc.)
  const webhookUrl = process.env.ADMIN_WEBHOOK_URL

  if (!webhookUrl) {
    return // Skip if not configured
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: `🚨 ${payload.severity} Alert`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Service:* ${payload.service}\n*Severity:* ${payload.severity}\n*Message:* ${payload.message}`,
          },
        },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error("Webhook notification failed")
  }
}
