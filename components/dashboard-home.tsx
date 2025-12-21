"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { Receipt, Sparkles, Upload, AlertTriangle, TrendingUp, Package, Clock, DollarSign, Loader2, Eye } from "lucide-react"

interface UserProfile {
  email: string
  storeName: string
  ownerName: string
  phone: string
  address: string
}

interface DashboardStats {
  totalMedicines: number
  lowStockItems: number
  expiringSoon: number
}

interface BillHistory {
  id: string
  billId: string
  date: string | Date
  items: any[]
  subtotal: number
  gst: number
  total: number
  customerEmail?: string
  itemCount: number
  storeName?: string
}

export function DashboardHome() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentBills, setRecentBills] = useState<BillHistory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [thresholds, setThresholds] = useState({ lowStockMin: 50, expiryDays: 365 })

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const email = localStorage.getItem("user_email")
      if (!email) {
        setIsLoading(false)
        return
      }

      // Load user profile
      const profileResponse = await fetch(`/api/user/profile?email=${encodeURIComponent(email)}`)
      if (profileResponse.ok) {
        const profileData = await profileResponse.json()
        setProfile(profileData.user)
      }

      // Load medicines using the alerts source so dashboard counts stay aligned with Alerts page
      // Get thresholds from localStorage or use defaults
      const savedThresholds = localStorage.getItem('alertThresholds')
      const loadedThresholds = savedThresholds
        ? JSON.parse(savedThresholds)
        : { lowStockMin: 50, expiryDays: 365 }
      setThresholds(loadedThresholds)
      const lowStockThreshold = loadedThresholds.lowStockMin
      const expiryThresholdDays = loadedThresholds.expiryDays
      const medicinesResponse = await fetch(`/api/medicines/search?email=${encodeURIComponent(email)}&query=`)
      if (medicinesResponse.ok) {
        const medicinesData = await medicinesResponse.json()
        const medicines = medicinesData.medicines || []

        const lowStock = medicines.filter((m: any) => {
          if (typeof m?.quantity !== "number") return false
          return m.quantity < lowStockThreshold
        }).length

        const expiring = medicines.filter((m: any) => {
          if (!m?.expiryDate) return false
          const expiryDate = new Date(m.expiryDate)
          if (Number.isNaN(expiryDate.getTime())) return false
          const today = new Date()
          const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 3600 * 24))
          return daysUntilExpiry <= expiryThresholdDays && daysUntilExpiry > 0
        }).length

        setStats({
          totalMedicines: medicines.length,
          lowStockItems: lowStock,
          expiringSoon: expiring,
        })
      }

      // Load recent bills
      const billsRes = await fetch(`/api/billing/history?email=${encodeURIComponent(email)}&limit=6`)
      if (billsRes.ok) {
        const data = await billsRes.json()
        setRecentBills(data.bills || [])
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const buildInvoiceHtml = (payload: any) => {
    const invoiceDate = new Date(payload.invoiceDate)
    const formattedDate = invoiceDate.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    const invoiceNumber = payload.billId || `INV-${invoiceDate.getTime()}`
    const headerStoreName = payload.storeName || profile?.storeName || "Your Pharmacy"
    const headerStorePhone = payload.storePhone || profile?.phone || ""
    const headerStoreAddress = payload.storeAddress || profile?.address || ""

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
      invoiceDate: bill.date,
      storeName: bill.storeName,
      storePhone: profile?.phone,
      storeAddress: profile?.address,
    }
    const htmlContent = buildInvoiceHtml(payload)
    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(htmlContent)
      printWindow.document.close()
      printWindow.focus()
    }
  }

  return (
    <div className="space-y-5 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-balance mb-2">Welcome, {profile?.ownerName || "User"}</h1>
        <p className="text-muted-foreground text-pretty">{profile?.storeName || "Your medical store"}</p>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-3 md:grid-cols-3">
        <Card
          className="p-4 md:p-5 hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => router.push("/dashboard/billing")}
        >
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Receipt className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-base md:text-base mb-1">Search & Bill</h3>
              <p className="text-xs text-muted-foreground text-pretty">Search medicines and generate bills</p>
            </div>
          </div>
        </Card>

        <Card
          className="p-4 md:p-5 hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => router.push("/dashboard/ai-assist")}
        >
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-accent/10">
              <Sparkles className="h-6 w-6 text-accent" />
            </div>
            <div>
              <h3 className="font-semibold text-base md:text-base mb-1">Ask AI</h3>
              <p className="text-xs text-muted-foreground text-pretty">Get symptom-based recommendations</p>
            </div>
          </div>
        </Card>

        <Card
          className="p-4 md:p-5 hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => router.push("/dashboard/import")}
        >
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-secondary/10">
              <Upload className="h-6 w-6 text-secondary" />
            </div>
            <div>
              <h3 className="font-semibold text-base md:text-base mb-1">Import Stock</h3>
              <p className="text-xs text-muted-foreground text-pretty">Upload bill photos to add medicines</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card
          className="p-4 md:p-5 hover:shadow-lg transition-shadow cursor-pointer"
          role="button"
          tabIndex={0}
          onClick={() => router.push("/dashboard/products")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              router.push("/dashboard/products")
            }
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total Products</p>
              <p className="text-xl md:text-2xl font-bold mt-1">{stats?.totalMedicines || 0}</p>
            </div>
            <Package className="h-6 w-6 text-muted-foreground" />
          </div>
        </Card>

        <Card className="p-4 md:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Low Stock</p>
              <div className="flex">
                <p className="text-xl md:text-2xl font-bold mt-1 text-warning">{stats?.lowStockItems || 0}</p>
                <p className="text-xs mt-4 ml-1 text-muted-foreground mt-1">&lt;{thresholds.lowStockMin} units</p>
              </div>
            </div>
            <AlertTriangle className="h-6 w-6 text-warning" />
          </div>
        </Card>

        <Card className="p-4 md:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Expiring Soon</p>
              <div className="flex">
                <p className="text-xl md:text-2xl font-bold mt-1 text-destructive">{stats?.expiringSoon || 0}</p>
                <p className="text-xs mt-4 ml-1 text-muted-foreground mt-1">within {thresholds.expiryDays} days</p>
              </div>
            </div>
            <Clock className="h-6 w-6 text-destructive" />
          </div>
        </Card>

        <Card className="p-4 md:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <p className="text-xl md:text-2xl font-bold mt-1 text-success">Active</p>
            </div>
            <TrendingUp className="h-6 w-6 text-success" />
          </div>
        </Card>
      </div>

      {/* Recent Bills */}
      {recentBills.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent Bills</h2>
            <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/billing/history")}>
              View All
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {recentBills.map((bill) => (
              <Card key={bill.id} className="p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-sm">{bill.billId}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(bill.date).toLocaleString("en-IN", {
                        day: "2-digit", month: "short", year: "numeric",
                        hour: "2-digit", minute: "2-digit"
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-semibold ml-1 text-primary">₹{bill.total.toFixed(2)}</span>
                  <Badge className="ml-2 border-accent" variant="outline">{bill.itemCount} items</Badge>
                </div>
                {/* {bill.customerEmail && (
                  <p className="text-xs text-muted-foreground truncate">{bill.customerEmail}</p>
                )} */}
                <Button size="sm" variant="outline" className="w-full" onClick={() => previewInvoice(bill)}>
                  <Eye className="h-3 w-3 mr-1" />
                  Invoice
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Alerts */}
      <Card className="p-4 md:p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Alerts</h2>
          <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/alerts")}>
            View All
          </Button>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
            <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">Low Stock Alert</p>
              <p className="text-xs text-muted-foreground">Paracetamol 500mg - Only 15 strips remaining</p>
            </div>
            <Badge variant="outline">Low Stock</Badge>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <Clock className="h-5 w-5 text-destructive flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">Expiry Warning</p>
              <p className="text-xs text-muted-foreground">Amoxicillin 250mg - Expires in 12 days</p>
            </div>
            <Badge variant="outline" className="text-destructive border-destructive">
              Expiring
            </Badge>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
            <TrendingUp className="h-5 w-5 text-primary flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">Top Selling</p>
              <p className="text-xs text-muted-foreground">Cyclopam - 47 strips sold this week</p>
            </div>
            <Badge variant="outline" className="text-primary border-primary">
              Popular
            </Badge>
          </div>
        </div>
      </Card>
    </div>
  )
}
