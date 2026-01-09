import { NextRequest, NextResponse } from "next/server"
import { sendInvoiceEmail } from "@/lib/email-service"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { customerEmail, storeName, storePhone, storeAddress, items, subtotal, gst, total, billId } = body

    if (!customerEmail) {
      return NextResponse.json({ error: "Customer email is required" }, { status: 400 })
    }

    // Send email using Node.js nodemailer
    const emailSent = await sendInvoiceEmail({
      billId: billId || `INV-${Date.now()}`,
      customerEmail,
      storeName: storeName || "Aushadhi 360",
      address: storeAddress || "",
      phone: storePhone || "",
      items: items || [],
      subtotal: subtotal || 0,
      gst: gst || 0,
      total: total || 0,
      date: new Date(),
    })

    if (emailSent) {
      return NextResponse.json({ 
        success: true, 
        message: "Invoice email sent successfully" 
      })
    } else {
      // Email service not configured or failed, but don't block the billing
      return NextResponse.json({
        success: true,
        message: "Bill created. Email service not configured.",
        warning: "Configure SMTP settings to enable email notifications"
      })
    }
  } catch (error) {
    console.error("Error sending invoice email:", error)
    // Don't fail the request, just log the error
    return NextResponse.json({
      success: true,
      message: "Bill created. Email sending failed.",
      error: error instanceof Error ? error.message : "Unknown error"
    })
  }
}
