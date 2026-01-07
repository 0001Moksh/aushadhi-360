import nodemailer from "nodemailer"
import { buildInvoiceHtml, type InvoiceItem, type InvoiceTemplateOptions } from "@/lib/invoice-template"

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

interface InvoiceData {
  billId: string
  customerEmail: string
  customerName?: string
  address?: string
  phone?: string
  physician?: string
  storeName?: string
  items: InvoiceItem[]
  subtotal: number
  gst: number
  total: number
  date?: Date
  invoiceOptions?: InvoiceTemplateOptions
}

// Configure email transporter
const createTransporter = () => {
  // Use environment variables for email configuration
  const emailConfig = {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  }

  // If no credentials, use test account (for development)
  if (!emailConfig.auth.user || !emailConfig.auth.pass) {
    console.warn("Email credentials not configured. Using fallback mode.")
    return null
  }

  return nodemailer.createTransport(emailConfig)
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const transporter = createTransporter()
    
    if (!transporter) {
      console.warn("Email service not configured. Skipping email send.")
      return false
    }

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    })

    return true
  } catch (error) {
    console.error("Failed to send email:", error)
    return false
  }
}

export async function sendInvoiceEmail(data: InvoiceData): Promise<boolean> {
  const html = buildInvoiceHtml({
    billId: data.billId,
    customerEmail: data.customerEmail,
    storeName: data.storeName,
    storeAddress: data.address,
    storePhone: data.phone,
    items: data.items,
    subtotal: data.subtotal,
    gst: data.gst,
    total: data.total,
    invoiceDate: data.date,
  }, data.invoiceOptions)
  const text = `
Invoice #${data.billId}
${data.storeName || "Aushadhi 360"}

Date: ${data.date || new Date()}
Customer: ${data.customerEmail}

Items:
${data.items.map((item) => `- ${item.name} (Batch: ${item.batch}${item.form ? `, Form: ${item.form}` : ""}${item.qtyPerPack ? `, Qty/Pack: ${item.qtyPerPack}` : ""}) x${item.quantity} @ ₹${item.price} = ₹${(item.quantity * item.price).toFixed(2)} | ${item.description || "Medicine sale"}`).join("\n")}

Subtotal: ₹${data.subtotal.toFixed(2)}
GST (18%): ₹${data.gst.toFixed(2)}
Total: ₹${data.total.toFixed(2)}

Thank you for your purchase!
  `.trim()

  const subject = `Invoice #${data.billId} - ${data.storeName || "Aushadhi 360"}`
  const customerSent = await sendEmail({
    to: data.customerEmail,
    subject,
    html,
    text,
  })

  const supportEmail = process.env.SUPPORT_EMAIL || process.env.ADMIN_EMAIL || process.env.SMTP_USER
  if (supportEmail) {
    await sendEmail({
      to: supportEmail,
      subject: `${subject} (copy)` ,
      html,
      text,
    })
  }

  return customerSent
}
