"use client"

// Email invoice component with graceful degradation

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Mail, Download, CheckCircle, AlertCircle } from "lucide-react"
import { emailService } from "@/lib/api-services/email-service"
import type { EmailRequest } from "@/lib/api-services/email-service"

interface Props {
  invoiceData: {
    invoiceNumber: string
    customerName: string
    items: Array<{ name: string; quantity: number; price: number }>
    total: number
  }
  onComplete?: () => void
}

export function EmailInvoiceWrapper({ invoiceData, onComplete }: Props) {
  const [email, setEmail] = useState("")
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState<"idle" | "sent" | "queued" | "failed">("idle")

  async function handleSendEmail() {
    if (!email.trim()) return

    setSending(true)
    setStatus("idle")

    try {
      const request: EmailRequest = {
        to: email,
        subject: `Invoice #${invoiceData.invoiceNumber} - Aushadhi 360`,
        body: generateInvoiceBody(),
      }

      const result = await emailService.sendEmail(request)

      if (result.success && result.data) {
        if (result.data.sent) {
          setStatus("sent")
        } else if (result.data.queued) {
          setStatus("queued")
        }
      } else {
        setStatus("failed")
      }
    } catch {
      setStatus("failed")
    } finally {
      setSending(false)
      setTimeout(() => {
        onComplete?.()
      }, 2000)
    }
  }

  function generateInvoiceBody(): string {
    return `
Thank you for your purchase!

Invoice Number: ${invoiceData.invoiceNumber}
Customer: ${invoiceData.customerName}

Items:
${invoiceData.items.map((item) => `- ${item.name} x ${item.quantity}: Rs ${item.price}`).join("\n")}

Total: Rs ${invoiceData.total}

Thank you for choosing Aushadhi 360!
    `
  }

  function handleDownload() {
    // Generate and download PDF
    const blob = new Blob([generateInvoiceBody()], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `invoice-${invoiceData.invoiceNumber}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Send invoice to customer email (optional)</label>
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="customer@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button onClick={handleSendEmail} disabled={sending || !email.trim()} className="gap-2">
            <Mail className="h-4 w-4" />
            {sending ? "Sending..." : "Send Email"}
          </Button>
          <Button variant="outline" onClick={handleDownload} className="gap-2 bg-transparent hover:text-primary">
            <Download className="h-4 w-4" />
            Download
          </Button>
        </div>
      </div>

      {status === "sent" && (
        <Alert className="bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">Invoice sent successfully!</AlertDescription>
        </Alert>
      )}

      {status === "queued" && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Email service is temporarily unavailable. Invoice has been queued and will be sent automatically when the
            service is restored. You can download the invoice now.
          </AlertDescription>
        </Alert>
      )}

      {status === "failed" && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Unable to send email right now. You can download the invoice and send it manually, or try again later.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
