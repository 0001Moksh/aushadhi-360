"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Eye, History, Search } from "lucide-react"
import { useEffect, useState, useMemo } from "react"
import { format, subDays, startOfMonth } from "date-fns"

interface BillHistory {
  id: string
  billId: string
  date: string
  items: any[]
  subtotal: number
  gst: number
  total: number
  customerEmail?: string
  itemCount: number
  storeName?: string
}

export default function BillingHistoryPage() {
  const [bills, setBills] = useState<BillHistory[]>([])
  const [search, setSearch] = useState("")
  const [quickFilter, setQuickFilter] = useState<"all" | "today" | "7days" | "month">("all")

  useEffect(() => {
    const load = async () => {
      const email = localStorage.getItem("user_email")
      if (!email) return

      const res = await fetch(`/api/billing/history?email=${encodeURIComponent(email)}&limit=500`)
      if (res.ok) {
        const data = await res.json()
        setBills(data.bills || [])
      }
    }
    load()
  }, [])

  const buildInvoiceHtml = (payload: {
    items: any[]
    subtotal: number
    gst: number
    total: number
    customerEmail?: string
    billId?: string
    invoiceDate?: Date
    storeName?: string
    storePhone?: string
    storeAddress?: string
  }) => {
    const invoiceDate = payload.invoiceDate || new Date()
    const formattedDate = invoiceDate.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    const invoiceNumber = payload.billId || `INV-${invoiceDate.getTime()}`
    const headerStoreName = payload.storeName || "Your Pharmacy"
    const headerStorePhone = payload.storePhone || ""
    const headerStoreAddress = payload.storeAddress || ""

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Invoice - ${headerStoreName}</title>

  <style>
    * { box-sizing: border-box; }
    body {
      font-family: "Segoe UI", Roboto, Arial, sans-serif;
      background: #f7f9fc;
      padding: 30px;
      color: #1f2937;
    }

    .invoice {
      max-width: 900px;
      margin: auto;
      background: #ffffff;
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.08);
      border: 1px solid #e5e7eb;
    }

    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 12px;
      gap: 12px;
    }

    .brand {
      font-size: 26px;
      font-weight: 700;
      color: #111827;
    }

    .brand span {
      font-size: 13px;
      font-weight: 500;
      display: block;
      color: #6b7280;
      margin-top: 4px;
    }

    .contact {
      text-align: right;
      font-size: 13px;
      color: #475569;
      line-height: 1.4;
    }

    .invoice-badge {
      background: #2563eb;
      color: white;
      padding: 8px 16px;
      border-radius: 999px;
      font-size: 14px;
      font-weight: 600;
    }

    /* Info */
    .info {
      display: flex;
      justify-content: space-between;
      margin-top: 20px;
      font-size: 14px;
      gap: 12px;
      flex-wrap: wrap;
    }

    .info div p {
      margin: 4px 0;
    }

    /* Table */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 24px;
      font-size: 14px;
    }

    thead th {
      text-align: left;
      padding: 12px;
      background: #f1f5f9;
      color: #334155;
      font-weight: 600;
      border-bottom: 2px solid #e5e7eb;
    }

    tbody td {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
      vertical-align: top;
    }

    tbody tr:last-child td {
      border-bottom: none;
    }

    .right { text-align: right; }
    .muted { color: #6b7280; font-size: 12px; }

    /* Totals */
    .totals {
      margin-top: 24px;
      display: flex;
      justify-content: flex-end;
    }

    .totals-box {
      width: 320px;
      font-size: 14px;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      overflow: hidden;
    }

    .totals-box div {
      display: flex;
      justify-content: space-between;
      padding: 10px 12px;
      border-bottom: 1px solid #e5e7eb;
      background: #fff;
    }

    .totals-box div:last-child { border-bottom: none; }

    .totals-box .grand {
      font-size: 18px;
      font-weight: 700;
      color: #2563eb;
      border-top: 2px solid #e5e7eb;
      padding-top: 10px;
      margin-top: 8px;
      background: #f8fafc;
    }

    /* Notes */
    .notes {
      margin-top: 24px;
      padding: 16px;
      border-radius: 12px;
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      color: #475569;
      font-size: 13px;
    }

    /* Footer */
    .footer {
      margin-top: 28px;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
    }

    @media print {
      body { padding: 0; background: #fff; }
      .invoice { box-shadow: none; border: 1px solid #e5e7eb; border-radius: 0; }
      @page { size: A4; margin: 12mm; }
    }
  </style>
</head>

<body>
  <div class="invoice">

    <!-- Header -->
    <div class="header">
      <div class="brand">
        ${headerStoreName}
        <span>Powered by Aushadhi 360 (software)</span>
      </div>
      <div class="contact">
        <div class="invoice-badge" style="float:right; margin-bottom:8px;">INVOICE</div>
        ${headerStorePhone ? `<div><strong>Phone:</strong> ${headerStorePhone}</div>` : ""}
        ${headerStoreAddress ? `<div><strong>Address:</strong> ${headerStoreAddress}</div>` : ""}
      </div>
    </div>

    <!-- Info -->
    <div class="info">
      <div>
        <p><strong>Date:</strong> ${formattedDate}</p>
        <p><strong>Invoice No:</strong> ${invoiceNumber}</p>
      </div>
      <div>
        ${payload.customerEmail ? `<p><strong>Customer:</strong> ${payload.customerEmail}</p>` : `<p><strong>Customer:</strong> Walk-in</p>`}
        <p class="muted">This is a system generated invoice.</p>
      </div>
    </div>

    <!-- Table -->
    <table>
      <thead>
        <tr>
          <th>Medicine</th>
          <th>Batch</th>
          <th class="right">Qty</th>
          <th class="right">Price</th>
          <th class="right">Amount</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        ${payload.items.map((item: any) => `
          <tr>
            <td>${item.name}</td>
            <td>${item.batch}</td>
            <td class="right">${item.quantity}</td>
            <td class="right">₹${item.price.toFixed(2)}</td>
            <td class="right">₹${(item.price * item.quantity).toFixed(2)}</td>
            <td>${item.description || "Medicine sale"}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>

    <!-- Totals -->
    <div class="totals">
      <div class="totals-box">
        <div>
          <span>Subtotal</span>
          <span>₹${payload.subtotal.toFixed(2)}</span>
        </div>
        <div>
          <span>GST (18%)</span>
          <span>₹${payload.gst.toFixed(2)}</span>
        </div>
        <div class="grand">
          <span>Total</span>
          <span>₹${payload.total.toFixed(2)}</span>
        </div>
      </div>
    </div>

    <!-- Notes -->
    <div class="notes">
      <strong>Notes & Guidance</strong><br/>
      • Medicines once sold will not be returned.<br/>
      • Please consult physician before use.<br/>
      • For support, contact your pharmacist.<br/>
      ${headerStorePhone ? `• Store Phone: ${headerStorePhone}<br/>` : ""}
      ${headerStoreAddress ? `• Address: ${headerStoreAddress}` : ""}
    </div>
 
    <!-- Footer -->
    <div class="footer">
      Thank you for choosing ${headerStoreName}<br />
    </div>
  </div>
</body>
</html>
    `
  }

  const previewInvoice = (bill: BillHistory) => {
    const payload = {
      items: bill.items,
      subtotal: bill.subtotal,
      gst: bill.gst,
      total: bill.total,
      customerEmail: bill.customerEmail,
      billId: bill.billId,
      invoiceDate: new Date(bill.date),
      storeName: bill.storeName || "Your Pharmacy",
      storePhone: undefined,
      storeAddress: undefined,
    }
    const htmlContent = buildInvoiceHtml(payload)
    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(htmlContent)
      printWindow.document.close()
      printWindow.focus()
    }
  }

  const filteredBills = useMemo(() => {
    let data = [...bills]

    // 🔍 Search
    if (search.trim()) {
      const q = search.toLowerCase()
      data = data.filter(b =>
        b.billId?.toLowerCase().includes(q) ||
        b.customerEmail?.toLowerCase().includes(q) ||
        b.items?.some((i: any) => i.name?.toLowerCase().includes(q))
      )
    }

    // ⏱ Quick Filters
    const now = new Date()
    if (quickFilter === "today") {
      data = data.filter(b => format(new Date(b.date), "yyyy-MM-dd") === format(now, "yyyy-MM-dd"))
    }
    if (quickFilter === "7days") {
      const from = subDays(now, 7)
      data = data.filter(b => new Date(b.date) >= from)
    }
    if (quickFilter === "month") {
      const from = startOfMonth(now)
      data = data.filter(b => new Date(b.date) >= from)
    }

    // Default sort: latest first
    return data.sort((a, b) => +new Date(b.date) - +new Date(a.date))
  }, [bills, search, quickFilter])

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Billing History</h1>
          <p className="text-sm text-muted-foreground">
            Track and view all generated invoices
          </p>
        </div>
        <Link href="/dashboard/billing">
          <Button variant="outline" className="hover:text-primary">Back to Billing</Button>
        </Link>
      </div>

      {/* Controls */}
      <Card className="p-3 mb-4 border-accent">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          {/* Search */}
          <div className="relative w-full lg:max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search bill, customer or medicine…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Quick Filters */}
          <div className="flex gap-2 flex-wrap">
            {["all", "today", "7days", "month"].map((f) => (
              <Button
                key={f}
                size="sm"
                variant={quickFilter === f ? "default" : "outline"}
                onClick={() => setQuickFilter(f as any)}
              > 
                {f === "all" ? "All" : f === "today" ? "Today" : f === "7days" ? "Last 7 Days" : "This Month"}
              </Button>
            ))}
          </div>
        </div>

      </Card>
        <div className="text-sm text-foreground py-2 ml-1">
          Showing <b>{filteredBills.length}</b> of {bills.length} bills
        </div>

      {/* Bills */}
      {filteredBills.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <History className="h-12 w-12 mx-auto mb-4 opacity-40" />
          No billing records found
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredBills.map((bill) => (
            <Card key={bill.id} className="p-3 hover:shadow-lg hover:border-accent transition">
              <div className="flex justify-between mb-2">
                <div>
                  <p className="font-semibold">{bill.billId}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(bill.date), "dd MMM yyyy, hh:mm a")}
                  </p>
                </div>
                <Badge variant="secondary">{bill.itemCount} items</Badge>
              </div>

              {/* {bill.customerEmail && (
                <p className="text-xs text-muted-foreground truncate mb-2">
                  {bill.customerEmail}
                </p>
              )} */}

              <div className="text-xl font-bold text-primary mb-4">
                ₹{bill.total.toFixed(2)}
              </div>

              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => previewInvoice(bill)}
              >
                <Eye className="h-4 w-4 mr-2" />
                View Invoice
              </Button>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}
