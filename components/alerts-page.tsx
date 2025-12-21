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
  lowStock: Medicine[]
  expiringSoon: Medicine[]
  topSelling: TopSellingMedicine[]
}

export function AlertsPage() {
  const [data, setData] = useState<AlertsData>({
    lowStock: [],
    expiringSoon: [],
    topSelling: [],
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [thresholds, setThresholds] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('alertThresholds')
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch {
          return { lowStockMin: 50, expiryDays: 365 }
        }
      }
    }
    return { lowStockMin: 50, expiryDays: 365 }
  })
  const [topCount, setTopCount] = useState<number>(20) // Default to top 20
  const [filteredData, setFilteredData] = useState<AlertsData>({
    lowStock: [],
    expiringSoon: [],
    topSelling: [],
  })

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
        setIsLoading(false)
        return
      }

      const medicinesRes = await fetch(`/api/medicines/search?email=${encodeURIComponent(email)}&query=`)
      const topSellingRes = await fetch(`/api/billing/top-selling?email=${encodeURIComponent(email)}`)

      let medicines: Medicine[] = []
      let topSelling: TopSellingMedicine[] = []

      if (medicinesRes.ok) {
        const medicinesData = await medicinesRes.json()
        medicines = medicinesData.medicines || []
      } else {
        console.error("Failed to load medicines")
      }

      if (topSellingRes.ok) {
        const topSellingData = await topSellingRes.json()
        const rawTop = Array.isArray(topSellingData)
          ? topSellingData
          : topSellingData.topSelling || topSellingData.data?.topSelling || topSellingData.items || []
        topSelling = normalizeTopSelling(rawTop)
      } else {
        console.error("Failed to load top selling")
      }

      setData({
        lowStock: medicines,
        expiringSoon: medicines,
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

  const applyThresholds = () => {
    // Low Stock
    const lowStock = data.lowStock.filter((m) => m.quantity < thresholds.lowStockMin)

    // Expiring Soon
    const expiringSoon = data.expiringSoon.filter((m) => {
      if (!m.expiryDate) return false
      const expiry = new Date(m.expiryDate)
      const today = new Date()
      const daysUntil = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 3600 * 24))
      return daysUntil <= thresholds.expiryDays && daysUntil > 0
    })

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
      expiringSoon,
      topSelling,
    })
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  const getDaysRemaining = (expiryDate: string) => {
    const today = new Date()
    const expiry = new Date(expiryDate)
    return Math.floor((expiry.getTime() - today.getTime()) / (1000 * 3600 * 24))
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
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export Report
        </Button>
      </div>

      <Tabs defaultValue="low-stock" className="space-y-4">
        <TabsList>
          <TabsTrigger value="low-stock">Low Stock ({filteredData.lowStock.length})</TabsTrigger>
          <TabsTrigger value="expiring">Expiring Soon ({filteredData.expiringSoon.length})</TabsTrigger>
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
        <TabsContent value="expiring" className="space-y-3">
          <Card className="p-4 bg-muted/50">
            <div className="flex items-center gap-4">
              <Settings className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <Label htmlFor="expiryThreshold" className="text-sm font-medium">
                  Expiry Threshold
                </Label>
                <p className="text-xs text-muted-foreground mb-2">Show medicines expiring within this period</p>
                <div className="flex items-center gap-2">
                  <Input
                    id="expiryThreshold"
                    type="number"
                    min="1"
                    value={thresholds.expiryDays}
                    onChange={(e) => setThresholds((prev: typeof thresholds) => ({ ...prev, expiryDays: parseInt(e.target.value) || 365 }))}
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground">days</span>
                </div>
              </div>
            </div>
          </Card>

          {filteredData.expiringSoon.length > 0 ? (
            filteredData.expiringSoon.map((medicine) => (
              <Card key={medicine.id} className="p-4">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-red-500 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium">{medicine.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Expires on: {formatDate(medicine.expiryDate!)} ({getDaysRemaining(medicine.expiryDate!)} days)
                    </p>
                  </div>
                  <Badge variant="outline" className="text-red-500 border-red-500">
                    Expiring
                  </Badge>
                </div>
              </Card>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No medicines expiring soon
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
                      <SelectItem key={num} value={num.toString()}>
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
      </Tabs>
    </div>
  )
}