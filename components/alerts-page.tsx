"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertTriangle, Clock, TrendingUp, Download, Loader2, Settings, Calendar, AlertCircle } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { normalizeExpiryDate } from "@/lib/date-parser"

interface Medicine {
  id: string
  name: string
  batch: string
  price: number
  quantity: number
  category: string
  form: string
  description?: string
  expiryDate?: string
}

interface TopSellingMedicine {
  medicineId: string
  name: string
  batch: string
  totalUnitsSold: number
  peopleBought: number
  totalRevenue: number
  currentStock: number
  price: number
  category?: string
  lastSoldDate: string // ISO date string
}

interface AlertsData {
  medicines: Medicine[]
  topSelling: TopSellingMedicine[]
}

export function AlertsPage() {
  const [data, setData] = useState<AlertsData>({
    medicines: [],
    topSelling: [],
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [thresholds, setThresholds] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('alertThresholds')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          return { lowStockMin: parsed.lowStockMin ?? 50 }
        } catch {
          return { lowStockMin: 50 }
        }
      }
    }
    return { lowStockMin: 50 }
  })
  const [filteredData, setFilteredData] = useState({
    lowStock: [] as Medicine[],
    topSelling: [] as TopSellingMedicine[],
    expiringSoon: [] as Medicine[],
    expired: [] as Medicine[],
  })
  const [activeTab, setActiveTab] = useState("low-stock")

  useEffect(() => {
    loadAlertsData()
  }, [])

  useEffect(() => {
    applyThresholds()
  }, [data, thresholds])

  useEffect(() => {
    // Save thresholds to localStorage whenever they change
    if (typeof window !== 'undefined') {
      localStorage.setItem('alertThresholds', JSON.stringify(thresholds))
    }
  }, [thresholds])

  const normalizeTopSelling = (items: any[]): TopSellingMedicine[] => {
    if (!Array.isArray(items)) return []
    return items.map((item) => ({
      medicineId: item.medicineId || item.id || item.medicine_id || item.medicineID || "unknown",
      name: item.name || item.medicineName || item.title || "Unknown",
      batch: item.batch || item.batchNumber || item.batch_number || "N/A",
      totalUnitsSold: item.totalUnitsSold ?? item.total_units_sold ?? item.unitsSold ?? 0,
      peopleBought: item.peopleBought ?? item.people_bought ?? item.customers ?? 0,
      totalRevenue: item.totalRevenue ?? item.total_revenue ?? item.revenue ?? 0,
      currentStock: item.currentStock ?? item.current_stock ?? item.stock ?? 0,
      price: item.price ?? item.unitPrice ?? item.unit_price ?? 0,
      category: item.category,
      lastSoldDate: item.lastSoldDate ?? item.last_sold_date ?? item.lastSold ?? new Date().toISOString(),
    }))
  }

  const loadAlertsData = async () => {
    try {
      const email = localStorage.getItem("user_email")
      if (!email) {
        console.warn("Alerts: No user_email in localStorage; skipping fetch.")
        setIsLoading(false)
        return
      }

      const medicinesRes = await fetch(`/api/medicines/search?email=${encodeURIComponent(email)}&query=`)
      const billsRes = await fetch(`/api/billing/history?email=${encodeURIComponent(email)}&limit=500`)

      let medicines: Medicine[] = []
      let topSelling: TopSellingMedicine[] = []

      if (medicinesRes.ok) {
        const medicinesData = await medicinesRes.json()
        const rawMedicines = Array.isArray(medicinesData)
          ? medicinesData
          : medicinesData.medicines || medicinesData.items || medicinesData.data || []

        medicines = rawMedicines.map((item: any) => {
          const id = item.id || item._id || item.medicineId || item.medicine_id || Math.random().toString(36).slice(2)
          const name = item.name || item.medicineName || item.MedicineName || item["Name of Medicine"] || item.title || "Unknown"
          const batch = item.batch || item.batchNumber || item.batch_number || item.Batch_ID || item.batchId || "N/A"
          const price = Number(
            item.price ?? item.Price_INR ?? item.Price ?? item.unitPrice ?? item.unit_price ?? item.MRP ?? 0
          ) || 0
          const quantity = Number(
            item.quantity ?? item.currentStock ?? item.current_stock ?? item.Total_Quantity ?? item.qty ?? item.total_quantity ?? 0
          ) || 0
          const category = item.category || item.Category || ""
          const form = item.form || item.Form || item["Medicine Forms"] || ""

          const expiryRaw =
            item.expiryDate ||
            item.expiry_date ||
            item.expiry ||
            item.expDate ||
            item.exp_date ||
            item.exp ||
            item.expirationDate ||
            item.expiration_date ||
            item.Expiry ||
            item.ExpiryDate ||
            item.expiryDateString ||
            item.Expiry_Date ||
            item.Expiry_date ||
            item["Expiry Date"] ||
            (item.expiryDate instanceof Date ? item.expiryDate.toISOString() : null)

          let expiryDate: string | undefined = undefined
          if (expiryRaw) {
            const rawValue = expiryRaw instanceof Date ? expiryRaw.toISOString().split("T")[0] : expiryRaw
            const { normalized, raw } = normalizeExpiryDate(rawValue)
            expiryDate = normalized || (typeof raw === 'string' && raw.trim() ? raw : undefined)
          }

          return { id, name, batch, price, quantity, category, form, expiryDate } as Medicine
        })

        console.debug("Alerts: Medicines fetched", {
          count: medicines.length,
          sample: medicines.slice(0, 3)
        })
      } else {
        const text = await medicinesRes.text().catch(() => "")
        console.error("Failed to load medicines", { status: medicinesRes.status, text })
      }

      if (billsRes.ok) {
        const billsData = await billsRes.json()
        const bills = Array.isArray(billsData) ? billsData : billsData.bills || billsData.data || []
        
        // Analyze frequency from bills: user > bill > medicine
        const medicineFrequency: Record<string, any> = {}
        
        bills.forEach((bill: any) => {
          const items = Array.isArray(bill.items) ? bill.items : []
          items.forEach((item: any) => {
            const medName = item.medicineName || item.name || ""
            const medBatch = item.batchId || item.batch || "N/A"
            const medKey = `${medName}|${medBatch}`
            const qty = Number(item.quantity || item.qty || 0)
            const price = Number(item.price || item.unitPrice || 0)
            const revenue = qty * price
            
            if (medName) {
              if (!medicineFrequency[medKey]) {
                medicineFrequency[medKey] = {
                  name: medName,
                  batch: medBatch,
                  totalUnitsSold: 0,
                  peopleBought: 0,
                  totalRevenue: 0,
                  price: price,
                  currentStock: 0,
                  category: item.category || "",
                  lastSoldDate: new Date().toISOString(),
                  medicineId: item.medicineId || medKey,
                }
              }
              medicineFrequency[medKey].totalUnitsSold += qty
              medicineFrequency[medKey].totalRevenue += revenue
              medicineFrequency[medKey].lastSoldDate = new Date(bill.date || Date.now()).toISOString()
            }
          })
        })
        
        // Count unique customers per medicine
        const customerSet: Record<string, Set<string>> = {}
        bills.forEach((bill: any) => {
          const billUser = bill.userEmail || bill.user || ""
          const items = Array.isArray(bill.items) ? bill.items : []
          items.forEach((item: any) => {
            const medName = item.medicineName || item.name || ""
            const medBatch = item.batchId || item.batch || "N/A"
            const medKey = `${medName}|${medBatch}`
            if (!customerSet[medKey]) customerSet[medKey] = new Set()
            if (billUser) customerSet[medKey].add(billUser)
          })
        })
        
        // Update people bought count
        Object.entries(medicineFrequency).forEach(([key, med]) => {
          med.peopleBought = customerSet[key]?.size || 0
        })
        
        topSelling = Object.values(medicineFrequency)
        console.debug("Alerts: Top selling analyzed from bills", { count: topSelling.length })
      } else {
        const text = await billsRes.text().catch(() => "")
        console.error("Failed to load billing data", { status: billsRes.status, text })
      }

      setData({
        medicines,
        topSelling,
      })
      setError(null)
    } catch (err) {
      console.error("Error loading alerts data:", err)
      setError("Failed to load alerts data")
    } finally {
      setIsLoading(false)
    }
  }

  const toDays = (value: number, unit: 'days' | 'months' | 'years') => {
    if (unit === 'days') return value
    if (unit === 'months') return Math.round(value * 30)
    return Math.round(value * 365)
  }

  const daysUntil = (dateStr: string) => {
    const parsed = new Date(dateStr)
    if (Number.isNaN(parsed.getTime())) return null
    // Normalize to local midnight to avoid timezone drift between today/expiry
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    const startOfExpiry = new Date(parsed)
    startOfExpiry.setHours(0, 0, 0, 0)
    return Math.floor((startOfExpiry.getTime() - startOfToday.getTime()) / 86400000)
  }

  const applyThresholds = () => {
    // Low Stock
    const lowStock = data.medicines.filter((m) => m.quantity < thresholds.lowStockMin)

    // Expiring Soon: Show medicines expiring within 180 days, sorted by closest expiry date (soonest first)
    const expiringSoon = data.medicines
      .filter((m) => {
        if (!m.expiryDate) return false
        const diff = daysUntil(m.expiryDate)
        return diff !== null && diff >= 0 && diff <= 180 // Next 6 months
      })
      .sort((a, b) => {
        const daysA = daysUntil(a.expiryDate || "")
        const daysB = daysUntil(b.expiryDate || "")
        if (daysA === null) return 1
        if (daysB === null) return -1
        return daysA - daysB // Closest expiry first (ascending)
      })

    // Expired: Show medicines that have already expired (daysUntil < 0)
    const expired = data.medicines
      .filter((m) => {
        if (!m.expiryDate) return false
        const diff = daysUntil(m.expiryDate)
        return diff !== null && diff < 0 // Already expired
      })
      .sort((a, b) => {
        const daysA = daysUntil(a.expiryDate || "")
        const daysB = daysUntil(b.expiryDate || "")
        if (daysA === null) return 1
        if (daysB === null) return -1
        return daysA - daysB // Most recently expired first (ascending, closest to 0)
      })

    // Top Selling: Analyze purchase frequency from bills
    const topSelling = [...data.topSelling]
      .filter((m) => m.totalUnitsSold > 0)
      .sort((a, b) => {
        // Primary sort: units sold (frequency of purchasing)
        if (b.totalUnitsSold !== a.totalUnitsSold) return b.totalUnitsSold - a.totalUnitsSold
        // Secondary sort: number of unique customers
        if (b.peopleBought !== a.peopleBought) return b.peopleBought - a.peopleBought
        // Tertiary sort: total revenue
        return b.totalRevenue - a.totalRevenue
      })
      .slice(0, 10) // Top 10

    setFilteredData({
      lowStock,
      topSelling,
      expiringSoon,
      expired,
    })
  }

  const formatDate = (dateStr: string) => {
    const parsed = new Date(dateStr)
    if (Number.isNaN(parsed.getTime())) return "" 
    return parsed.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  const getDaysRemaining = (expiryDate: string) => {
    const diff = daysUntil(expiryDate)
    return diff === null ? 0 : diff
  }

  const handleExport = () => {
    const downloadCSV = (headers: string[], rows: (string | number)[][], filename: string) => {
      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      ].join("\n")

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement("a")
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob)
        link.setAttribute("href", url)
        link.setAttribute("download", filename)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    }

    const dateStr = new Date().toISOString().split('T')[0]

    if (activeTab === "low-stock") {
      const headers = ["Name", "Batch", "Quantity", "Price", "Category", "Form"]
      const rows = filteredData.lowStock.map(m => [m.name, m.batch, m.quantity, m.price, m.category || "", m.form || ""])
      downloadCSV(headers, rows, `low_stock_report_${dateStr}.csv`)
    } else if (activeTab === "top-selling") {
      const headers = ["Name", "Batch", "Units Sold", "Revenue", "Current Stock", "Price"]
      const rows = filteredData.topSelling.map(m => [m.name, m.batch, m.totalUnitsSold, m.totalRevenue.toFixed(2), m.currentStock, m.price, m.category || ""])
      downloadCSV(headers, rows, `top_selling_report_${dateStr}.csv`)
    } else if (activeTab === "expired") {
      const headers = ["Name", "Batch", "Quantity", "Price", "Expiry Date", "Days Overdue", "Category", "Form"]
      const rows = filteredData.expired.map(m => {
        const daysOverdue = m.expiryDate ? Math.abs(getDaysRemaining(m.expiryDate)) : 0
        return [m.name, m.batch, m.quantity, m.price, formatDate(m.expiryDate || ""), daysOverdue, m.category || "", m.form || ""]
      })
      downloadCSV(headers, rows, `expired_medicines_report_${dateStr}.csv`)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return <div className="text-center py-8 text-destructive">{error}</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Alerts & Notifications</h1>
          <p className="text-muted-foreground">Monitor stock, expiry dates, and top-selling medicines</p>
        </div>
        <Button variant="outline" className="hover:text-primary" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export Report
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="low-stock">Low Stock ({filteredData.lowStock.length})</TabsTrigger>
          <TabsTrigger value="expiring-soon">Expiring Soon ({filteredData.expiringSoon.length})</TabsTrigger>
          <TabsTrigger value="expired">Expired ({filteredData.expired.length})</TabsTrigger>
          <TabsTrigger value="top-selling">Top Selling ({filteredData.topSelling.length})</TabsTrigger>
        </TabsList>

        {/* Low Stock Tab */}
        <TabsContent value="low-stock" className="space-y-3">
          <Card className="p-4 bg-muted/50">
            <div className="flex items-center gap-4">
              <Settings className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <Label htmlFor="lowStockThreshold" className="text-sm font-medium">
                  Low Stock Threshold
                </Label>
                <p className="text-xs text-muted-foreground mb-2">Show medicines with quantity below this value</p>
                <div className="flex items-center gap-2">
                  <Input
                    id="lowStockThreshold"
                    type="number"
                    min="1"
                    value={thresholds.lowStockMin}
                    onChange={(e) => setThresholds((prev: typeof thresholds) => ({ ...prev, lowStockMin: parseInt(e.target.value) || 50 }))}
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground">units</span>
                </div>
              </div>
            </div>
          </Card>

          {filteredData.lowStock.length > 0 ? (
            filteredData.lowStock.map((medicine) => (
              <Card key={medicine.id} className="p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium">{medicine.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Stock: {medicine.quantity} | Batch: {medicine.batch}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-yellow-500 border-yellow-500">
                    Low Stock
                  </Badge>
                </div>
              </Card>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No low stock items detected
            </div>
          )}
        </TabsContent>

        {/* Expiring Soon Tab */}
        <TabsContent value="expiring-soon" className="space-y-4">
          {filteredData.expiringSoon.length > 0 ? (
            filteredData.expiringSoon.map((medicine) => {
              const daysLeft = daysUntil(medicine.expiryDate || "")
              const isExpired = daysLeft !== null && daysLeft < 0
              const isUrgent = daysLeft !== null && daysLeft <= 7
              const isWarning = daysLeft !== null && daysLeft <= 30

              return (
                <Card key={medicine.id} className={`p-4 ${
                  isExpired ? 'border-destructive/50 bg-destructive/5' :
                  isUrgent ? 'border-warning/50 bg-warning/5' :
                  isWarning ? 'border-yellow-500/30 bg-yellow-500/5' : ''
                }`}>
                  <div className="flex items-center gap-3">
                    <Clock className={`h-5 w-5 flex-shrink-0 ${
                      isExpired ? 'text-destructive' :
                      isUrgent ? 'text-warning' :
                      isWarning ? 'text-yellow-500' : 'text-muted-foreground'
                    }`} />
                    <div className="flex-1">
                      <p className="font-medium">{medicine.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Batch: {medicine.batch} | Quantity: {medicine.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge className={`${
                        isExpired ? 'bg-destructive/20 text-destructive border-destructive' :
                        isUrgent ? 'bg-warning/20 text-warning border-warning' :
                        isWarning ? 'bg-yellow-500/20 text-yellow-600 border-yellow-500' :
                        'bg-green-500/20 text-green-600 border-green-500'
                      } border`}>
                        {isExpired ? 'Expired' :
                         daysLeft === 0 ? 'Today' :
                         daysLeft === 1 ? 'Tomorrow' :
                         `${daysLeft} days`}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">{formatDate(medicine.expiryDate || "")}</p>
                    </div>
                  </div>
                </Card>
              )
            })
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No medicines expiring soon
            </div>
          )}
        </TabsContent>

        {/* Expired Tab */}
        <TabsContent value="expired" className="space-y-4">
          <Card className="p-4 bg-destructive/5 border-destructive/30">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-sm font-medium text-destructive">Expired Medicines</p>
                <p className="text-xs text-muted-foreground">These medicines have passed their expiry date and should not be sold</p>
              </div>
            </div>
          </Card>

          {filteredData.expired.length > 0 ? (
            filteredData.expired.map((medicine) => {
              const daysOverdue = medicine.expiryDate ? Math.abs(getDaysRemaining(medicine.expiryDate)) : 0

              return (
                <Card key={medicine.id} className="p-4 border-destructive/50 bg-destructive/5">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 flex-shrink-0 text-destructive" />
                    <div className="flex-1">
                      <p className="font-medium">{medicine.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Batch: {medicine.batch} | Quantity: {medicine.quantity}
                      </p>
                      {medicine.category && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Category: {medicine.category}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <Badge className="bg-destructive/20 text-destructive border-destructive border">
                        Expired {daysOverdue} {daysOverdue === 1 ? 'day' : 'days'} ago
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">{formatDate(medicine.expiryDate || "")}</p>
                    </div>
                  </div>
                </Card>
              )
            })
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No expired medicines found
            </div>
          )}
        </TabsContent>

        <TabsContent value="top-selling" className="space-y-4">
          {filteredData.topSelling.length > 0 ? (
            filteredData.topSelling.map((medicine) => (
              <Card key={medicine.medicineId} className="p-4 hover:shadow-md transition">
                <div className="flex items-start gap-3">
                  <TrendingUp className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-lg">{medicine.name}</p>
                      <Badge variant="secondary">
                        ₹{medicine.totalRevenue.toFixed(0)}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium text-foreground">{medicine.totalUnitsSold}</span> units sold
                      </div>
                      {/* <div>
                        <span className="font-medium text-foreground">{medicine.peopleBought}</span> customers
                      </div> */}
                      <div>Stock: {medicine.currentStock}</div>
                      <div>Price: ₹{medicine.price.toFixed(2)}</div>
                      {/* <div>Category: {medicine.category || "N/A"}</div> */}
                      <div>Batch: {medicine.batch}</div>
                      <div>Last Sold: {formatDate(medicine.lastSoldDate)}</div>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-40" />
              No sales data available yet
            </div>
          )}
        </TabsContent>

      </Tabs>
    </div>
  )
}