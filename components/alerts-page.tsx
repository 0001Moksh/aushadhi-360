"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertTriangle, Clock, TrendingUp, Download, Loader2, Settings } from "lucide-react"
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
          // Backward-compatible defaults
          return {
            lowStockMin: parsed.lowStockMin ?? 50,
            expiryValue: parsed.expiryValue ?? (parsed.expiryDays ?? 365),
            expiryUnit: parsed.expiryUnit ?? 'days',
          }
        } catch {
          return { lowStockMin: 50, expiryValue: 365, expiryUnit: 'days' }
        }
      }
    }
    return { lowStockMin: 50, expiryValue: 365, expiryUnit: 'days' }
  })
  const [topCount, setTopCount] = useState<number>(20) // Default to top 20
  const [filteredData, setFilteredData] = useState({
    lowStock: [] as Medicine[],
    topSelling: [] as TopSellingMedicine[],
    expiringSoon: [] as Medicine[],
  })
  const [activeTab, setActiveTab] = useState("low-stock")

  useEffect(() => {
    loadAlertsData()
  }, [])

  useEffect(() => {
    applyThresholds()
  }, [data, thresholds, topCount])

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
      const topSellingRes = await fetch(`/api/billing/top-selling?email=${encodeURIComponent(email)}`)

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

      if (topSellingRes.ok) {
        const topSellingData = await topSellingRes.json()
        const rawTop = Array.isArray(topSellingData)
          ? topSellingData
          : topSellingData.topSelling || topSellingData.data?.topSelling || topSellingData.items || []
        topSelling = normalizeTopSelling(rawTop)
        console.debug("Alerts: Top selling fetched", { count: topSelling.length, sample: topSelling.slice(0, 3) })
      } else {
        const text = await topSellingRes.text().catch(() => "")
        console.error("Failed to load top selling", { status: topSellingRes.status, text })
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

    const expiryThresholdDays = toDays(thresholds.expiryValue, thresholds.expiryUnit)
    const expiringSoon = data.medicines
      .map((m) => {
        if (!m.expiryDate) return null
        const diff = daysUntil(m.expiryDate)
        if (diff === null) return null
        return { medicine: m, diff }
      })
      .filter((entry): entry is { medicine: Medicine; diff: number } => !!entry && entry.diff <= expiryThresholdDays)
      .sort((a, b) => a.diff - b.diff)
      .map((entry) => entry.medicine)

    // Top Selling: Sort by units sold desc, then revenue desc, then limit to top N
    const topSelling = [...data.topSelling]
      .filter((m) => m.totalUnitsSold > 0)
      .sort((a, b) => {
        if (b.totalUnitsSold !== a.totalUnitsSold) return b.totalUnitsSold - a.totalUnitsSold
        return b.totalRevenue - a.totalRevenue
      })
      .slice(0, topCount)

    setFilteredData({
      lowStock,
      topSelling,
      expiringSoon,
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
      const headers = ["Name", "Batch", "Units Sold", "Revenue", "Current Stock", "Price", "Category"]
      const rows = filteredData.topSelling.map(m => [m.name, m.batch, m.totalUnitsSold, m.totalRevenue.toFixed(2), m.currentStock, m.price, m.category || ""])
      downloadCSV(headers, rows, `top_selling_report_${dateStr}.csv`)
    } else if (activeTab === "expiring-soon") {
      const headers = ["Name", "Batch", "Quantity", "Expiry Date", "Days Remaining", "Category", "Form"]
      const rows = filteredData.expiringSoon.map(m => [
        m.name,
        m.batch,
        m.quantity,
        m.expiryDate ? formatDate(m.expiryDate) : "",
        m.expiryDate ? getDaysRemaining(m.expiryDate) : "",
        m.category || "",
        m.form || "",
      ])
      downloadCSV(headers, rows, `expiring_soon_report_${dateStr}.csv`)
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
          <TabsTrigger value="top-selling">Top Selling ({filteredData.topSelling.length})</TabsTrigger>
          <TabsTrigger value="expiring-soon">Expiring Soon ({filteredData.expiringSoon.length})</TabsTrigger>
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

        {/* Top Selling Tab - Fully Enhanced */}
        <TabsContent value="top-selling" className="space-y-4">
          <Card className="p-4 bg-muted/50">
            <div className="flex items-center gap-4">
              <Settings className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <Label className="text-sm font-medium">Show Top</Label>
                <p className="text-xs text-muted-foreground mb-2">Number of top-selling medicines to display</p>
                <Select value={topCount.toString()} onValueChange={(val) => setTopCount(parseInt(val))}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Top" />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 10, 20, 30, 50].map((num) => (
                      <SelectItem className="text-muted-foreground" key={num} value={num.toString()}>
                        Top {num}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {filteredData.topSelling.length > 0 ? (
            filteredData.topSelling.map((medicine) => (
              <Card key={medicine.medicineId} className="p-4 hover:shadow-md transition">
                <div className="flex items-start gap-3">
                  <TrendingUp className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-lg">{medicine.name}</p>
                      <Badge variant="secondary" className="text-green-600">
                        ₹{medicine.totalRevenue.toFixed(0)}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium text-foreground">{medicine.totalUnitsSold}</span> units sold
                      </div>
                      <div>
                        <span className="font-medium text-foreground">{medicine.peopleBought}</span> customers
                      </div>
                      <div>Stock: {medicine.currentStock}</div>
                      <div>Price: ₹{medicine.price.toFixed(2)}</div>
                      <div>Category: {medicine.category || "N/A"}</div>
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

        {/* Expiring Soon Tab */}
        <TabsContent value="expiring-soon" className="space-y-4">
          <Card className="p-4 bg-muted/50">
            <div className="flex items-center gap-4">
              <Settings className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="expiryValue" className="text-sm font-medium">Expiry Window</Label>
                    <p className="text-xs text-muted-foreground mb-2">Show medicines expiring within this window</p>
                    <Input
                      id="expiryValue"
                      type="number"
                      min="1"
                      value={thresholds.expiryValue}
                      onChange={(e) => setThresholds((prev: typeof thresholds) => ({ ...prev, expiryValue: parseInt(e.target.value) || 1 }))}
                      className="w-32"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Time Unit</Label>
                    <p className="text-xs text-muted-foreground mb-2">Choose the unit for the expiry window</p>
                    <Select value={thresholds.expiryUnit} onValueChange={(val) => setThresholds((prev: typeof thresholds) => ({ ...prev, expiryUnit: val as 'days' | 'months' | 'years' }))}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Unit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="days">Days</SelectItem>
                        <SelectItem value="months">Months</SelectItem>
                        <SelectItem value="years">Years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {filteredData.expiringSoon.length > 0 ? (
            filteredData.expiringSoon.map((medicine) => {
              const daysRemaining = medicine.expiryDate ? getDaysRemaining(medicine.expiryDate) : null
              const isExpired = daysRemaining !== null && daysRemaining < 0

              return (
                <Card key={`${medicine.id}-expiry`} className="p-4">
                  <div className="flex items-start gap-3">
                    <Clock className={`h-5 w-5 flex-shrink-0 mt-1 ${isExpired ? 'text-destructive' : 'text-orange-500'}`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold">{medicine.name}</p>
                        <Badge variant={isExpired ? "destructive" : "secondary"}>
                          {medicine.expiryDate ? (isExpired ? "Expired" : `${daysRemaining} days left`) : "No date"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Batch: {medicine.batch} • Quantity: {medicine.quantity} • Expiry: {medicine.expiryDate ? formatDate(medicine.expiryDate) : "N/A"}
                      </p>
                    </div>
                  </div>
                </Card>
              )
            })
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-40" />
              No medicines are nearing expiry
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}