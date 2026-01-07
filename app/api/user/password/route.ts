import { MongoClient } from "mongodb"
import { NextRequest, NextResponse } from "next/server"
import { sendEmail } from "@/lib/email-service"

const mongoUri = process.env.DATABASE_URL || ""
const DEMO_EMAIL = "demo@aushadhi360.com"

async function getDb() {
  const client = new MongoClient(mongoUri)
  await client.connect()
  return client.db("aushadhi360")
}

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

function buildOtpEmail(otp: string) {
  return {
    subject: "Aushadhi 360 – Password Reset OTP",
    html: `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2 style="color:#2E7D32;">Aushadhi 360</h2>
      <p>Hello,</p>
      <p>You requested to reset your Aushadhi 360 account password.</p>

      <p style="margin:20px 0;">
        <strong>Your One-Time Password (OTP):</strong>
      </p>

      <h1 style="letter-spacing: 4px; color:#000;">${otp}</h1>

      <p>This OTP is valid for <strong>10 minutes</strong>.</p>

      <p>If you did not request this change, please ignore this email or contact support immediately.</p>

      <p style="margin-top:30px;">
        Regards,<br/>
        <strong>Aushadhi 360 Team</strong>
      </p>
    </div>
  `,
    text: `
Aushadhi 360

You requested to reset your account password.

Your OTP is: ${otp}

This OTP is valid for 10 minutes.

If you did not request this change, please ignore this email.

— Aushadhi 360 Team
  `,
  }

}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, action, otp, newPassword } = body || {}

    if (!email) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 })
    }

    if (email.toLowerCase() === DEMO_EMAIL.toLowerCase()) {
      return NextResponse.json({ message: "Password changes are disabled for demo account" }, { status: 403 })
    }

    const db = await getDb()
    const users = db.collection("users")
    const user = await users.findOne({ email })

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    if (action === "send-otp") {
      const code = generateOtp()
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

      await users.updateOne({ email }, { $set: { passwordReset: { otp: code, expiresAt, attempts: 0 } } })

      const emailContent = buildOtpEmail(code)
      await sendEmail({ to: email, subject: emailContent.subject, html: emailContent.html, text: emailContent.text })

      return NextResponse.json({ message: "OTP sent to your email" })
    }

    if (action === "reset") {
      if (!otp || !newPassword) {
        return NextResponse.json({ message: "OTP and newPassword are required" }, { status: 400 })
      }

      const reset = user.passwordReset

      if (!reset || !reset.otp || !reset.expiresAt) {
        return NextResponse.json({ message: "Request a new OTP first" }, { status: 400 })
      }

      const expired = new Date(reset.expiresAt).getTime() < Date.now()
      if (expired) {
        return NextResponse.json({ message: "OTP expired. Please request a new one." }, { status: 400 })
      }

      if (reset.otp !== otp) {
        await users.updateOne({ email }, { $inc: { "passwordReset.attempts": 1 } })
        return NextResponse.json({ message: "Invalid OTP" }, { status: 400 })
      }

      await users.updateOne(
        { email },
        {
          $set: { password: newPassword },
          $unset: { passwordReset: "" },
        },
      )

      return NextResponse.json({ message: "Password updated successfully" })
    }

    return NextResponse.json({ message: "Unsupported action" }, { status: 400 })
  } catch (error) {
    console.error("Error handling password change", error)
    return NextResponse.json({ message: "Password change failed" }, { status: 500 })
  }
}
