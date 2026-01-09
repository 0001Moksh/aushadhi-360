// Email sending route handler with Gmail SMTP

import { type NextRequest, NextResponse } from "next/server"

const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com"
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587")
const SMTP_USER = process.env.SMTP_USER || ""
const SMTP_PASS = process.env.SMTP_PASS || ""

export async function POST(request: NextRequest) {
  try {
    const { to, subject, message, body } = await request.json()
    const emailBody = message || body

    if (!to || !subject || !emailBody) {
      return NextResponse.json(
        { success: false, error: "To, subject, and message are required" },
        { status: 400 }
      )
    }

    const nodemailer = require("nodemailer")

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: false,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    })

    const mailOptions = {
      from: SMTP_USER,
      to,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Aushadhi 360 Notification</h2>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            ${emailBody.replace(/\n/g, "<br>")}
          </div>
          <p style="color: #666; font-size: 12px;">This is an automated message from Aushadhi 360 Admin.</p>
        </div>
      `,
    }

    await transporter.sendMail(mailOptions)

    return NextResponse.json({
      success: true,
      messageId: `msg_${Date.now()}`,
      sent: true,
    })
  } catch (error) {
    console.error("[Email] Send failed:", error)
    return NextResponse.json({ success: false, error: "Email send failed" }, { status: 500 })
  }
}
