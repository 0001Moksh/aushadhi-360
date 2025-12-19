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

      // Load medicines to calculate stats
      const medicinesResponse = await fetch(`/api/user/medicines?email=${encodeURIComponent(email)}`)
      if (medicinesResponse.ok) {
        const medicinesData = await medicinesResponse.json()
        const medicines = medicinesData.medicines || []

        const lowStock = medicines.filter((m: any) => m.quantity < 20).length
        const expiring = medicines.filter((m: any) => {
          const expiryDate = new Date(m.expiryDate)
          const today = new Date()
          const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 3600 * 24))
          return daysUntilExpiry <= 30 && daysUntilExpiry > 0
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
      year: "numeric", month: "long", day: "numeric",
    })
    const headerStoreName = payload.storeName || profile?.storeName || "Medical Store"
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Invoice - ${headerStoreName}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; padding: 30px; color: #333; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 20px; }
    .brand { font-size: 24px; font-weight: bold; color: #2563eb; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; }
    th { text-align: left; padding: 12px; background: #f8fafc; border-bottom: 2px solid #e2e8f0; }
    td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
    .right { text-align: right; }
    .totals { display: flex; justify-content: flex-end; margin-top: 20px; }
    .totals-box { width: 300px; }
    .row { display: flex; justify-content: space-between; padding: 8px 0; }
    .grand { font-weight: bold; font-size: 18px; border-top: 2px solid #e2e8f0; padding-top: 12px; margin-top: 8px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">${headerStoreName}</div>
      <div>${payload.storeAddress || profile?.address || ""}</div>
      <div>${payload.storePhone || profile?.phone || ""}</div>
    </div>
    <div style="text-align: right;">
      <h2 style="margin: 0 0 10px 0;">INVOICE</h2>
      <div>#${payload.billId}</div>
      <div>${formattedDate}</div>
    </div>
  </div>
  
  <table>
    <thead>
      <tr><th>Item</th><th>Batch</th><th class="right">Qty</th><th class="right">Price</th><th class="right">Total</th></tr>
    </thead>
    <tbody>
      ${payload.items.map((item: any) => `
        <tr>
          <td>${item.name}</td>
          <td>${item.batch}</td>
          <td class="right">${item.quantity}</td>
          <td class="right">₹${item.price}</td>
          <td class="right">₹${(item.price * item.quantity).toFixed(2)}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-box">
      <div class="row"><span>Subtotal</span><span>₹${payload.subtotal.toFixed(2)}</span></div>
      <div class="row"><span>GST (18%)</span><span>₹${payload.gst.toFixed(2)}</span></div>
      <div class="row grand"><span>Total</span><span>₹${payload.total.toFixed(2)}</span></div>
    </div>
  </div>
</body>
</html>`
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
              <p className="text-xl md:text-2xl font-bold mt-1 text-warning">{stats?.lowStockItems || 0}</p>
            </div>
            <AlertTriangle className="h-6 w-6 text-warning" />
          </div>
        </Card>

        <Card className="p-4 md:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Expiring Soon</p>
              <p className="text-xl md:text-2xl font-bold mt-1 text-destructive">{stats?.expiringSoon || 0}</p>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentBills.map((bill) => (
              <Card key={bill.id} className="p-3 md:p-3">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-sm">{bill.billId}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(bill.date).toLocaleString("en-IN", {
                        day: "2-digit", month: "short", year: "numeric",
                        hour: "2-digit", minute: "2-digit"
                      })}
                    </p>
                  </div>
                  <Badge variant="outline">{bill.itemCount} items</Badge>
                </div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-semibold text-primary">₹{bill.total.toFixed(2)}</span>
                </div>
                {bill.customerEmail && (
                  <p className="text-xs text-muted-foreground mb-2 truncate">{bill.customerEmail}</p>
                )}
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
