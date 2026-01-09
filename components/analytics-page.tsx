"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell
} from "recharts"
import {
  Loader2, AlertTriangle, TrendingUp, Package, AlertCircle, TrendingDown,
  Calendar, Filter, Eye, EyeOff, Zap
} from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

// ============= TYPES & INTERFACES =============

interface Medicine {
  id: string
  name: string
  batch: string
  price: number
  quantity: number
  category: string
  form: string
  expiryDate?: string
}

interface ExpiryItem {
  id: string
  name: string
  batch: string
  expiryDate: string
  quantity: number
  stockValue: number
  daysUntilExpiry: number
  severity: 'critical' | 'warning' | 'info' // critical: 0-7 days, warning: 7-30, info: 30+
}

interface SalesData {
  date: string
  sales: number
  orders: number
}

interface TopMedicine {
  name: string
  revenue: number
  quantity: number
  category: string
}

interface StockMovement {
  name: string
  category: string
  inbound: number
  outbound: number
  currentStock: number
  turnover: number // outbound / currentStock
  status: 'fast' | 'slow' | 'dead' // fast: >1, slow: 0.1-1, dead: <0.1
}

interface AnalyticsData {
  kpis: {
    totalMedicines: number
    totalStockQuantity: number
    expiryAlerts: { days7: number; days30: number; days90: number }
    expiredStockValue: number
    todaySales: number
    monthlySales: number
  }
  expiryItems: ExpiryItem[]
  salesTrend: SalesData[]
  topMedicines: TopMedicine[]
  stockMovement: StockMovement[]
  insights: string[]
}

interface FilterState {
  dateRange: 'week' | 'month' | 'quarter' | 'year'
  category: string
  severity: 'all' | 'critical' | 'warning' | 'info'
}

// ============= ANALYTICS PAGE COMPONENT =============

export function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [filters, setFilters] = useState<FilterState>({
    dateRange: 'month',
    category: 'all',
    severity: 'all',
  })
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const email = localStorage.getItem("user_email")
        if (!email) {
          console.warn("No user email found")
          setIsLoading(false)
          return
        }

        // Fetch medicines and sales data in parallel
        const [medicinesRes, salesRes] = await Promise.all([
          fetch(`/api/medicines/search?email=${encodeURIComponent(email)}&query=`),
          fetch(`/api/billing/sales?email=${encodeURIComponent(email)}`),
        ])

        let medicines: Medicine[] = []
        let salesData: SalesData[] = []

        if (medicinesRes.ok) {
          const data = await medicinesRes.json()
          const raw = Array.isArray(data) ? data : data.medicines || data.items || []
          medicines = raw.map((item: any) => ({
            id: item.id || item._id || item.medicineId || Math.random().toString(),
            name: item.name || item.medicineName || "Unknown",
            batch: item.batch || item.batchNumber || "N/A",
            price: Number(item.price ?? item.Price_INR ?? 0),
            quantity: Number(item.quantity ?? item.currentStock ?? 0),
            category: item.category || item.Category || "Other",
            form: item.form || "Unknown",
            expiryDate: item.expiryDate || item.expiry_date || undefined,
          }))
        }

        if (salesRes.ok) {
          const data = await salesRes.json()
          salesData = Array.isArray(data) ? data : data.sales || []
        }

        // Process analytics
        const processed = processAnalytics(medicines, salesData)
        setAnalytics(processed)
      } catch (err) {
        console.error("Failed to load analytics:", err)
      } finally {
        setIsLoading(false)
      }
    }

    loadAnalytics()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Calculating Analytics...</p>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Unable to load analytics data</p>
      </div>
    )
  }

  const filteredExpiry = analytics.expiryItems.filter(item => {
    if (filters.severity !== 'all' && item.severity !== filters.severity) return false
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Analytics Dashboard</h1>
        <p className="text-muted-foreground">Real-time insights on inventory, sales & expiry metrics</p>
      </div>

      {/* Filter Bar - Sticky */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background border-b-3 border-l-2 border-r-2 border-primary/20 border-t-1 rounded-lg p-2">
        <div className="flex flex-wrap gap-3 items-center">
          <Filter className="h-5 w-5 text-foreground" />

          <Select value={filters.dateRange} onValueChange={(val) => setFilters(p => ({ ...p, dateRange: val as any }))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.severity} onValueChange={(val) => setFilters(p => ({ ...p, severity: val as any }))}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="info">Info</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard
          title="Total Medicines"
          value={analytics.kpis.totalMedicines}
          icon={<Package className="h-5 w-5" />}
          color="blue"
          subtitle="In inventory"
        />

        <KPICard
          title="Stock Quantity"
          value={analytics.kpis.totalStockQuantity}
          icon={<Package className="h-5 w-5"  />}
          color="yellow"
          subtitle="Total units"
        />

        <KPICard
          title="Near Expiry"
          value={analytics.kpis.expiryAlerts.days30}
          icon={<AlertTriangle className="h-5 w-5" color="brown" 
          />}
          color={analytics.kpis.expiryAlerts.days7 > 0 ? "red" : "yellow"}
          subtitle="Within 30 days"
          critical={analytics.kpis.expiryAlerts.days7}
        />

        <KPICard
          title="Expired Loss"
          value={`₹${analytics.kpis.expiredStockValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
          icon={<TrendingDown className="h-5 w-5" color="red" />}
          color="red"
          subtitle="Stock value"
        />

        <KPICard
          title="Today Sales"
          value={`₹${analytics.kpis.todaySales.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
          icon={<TrendingUp className="h-5 w-5 " color="green" />}

          color="green"
          subtitle={`Monthly: ₹${analytics.kpis.monthlySales.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
        />
      </div>


      {/* AI Insights Panel */}
      {/* {analytics.insights.length > 0 && (
        <Card className="p-5 bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200/50 dark:border-blue-800/50">
          <div className="flex items-start gap-3">
            <Zap className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <p className="font-semibold text-blue-900 dark:text-blue-100">AI Insights</p>
              {analytics.insights.map((insight, i) => (
                <p key={i} className="text-sm text-blue-800 dark:text-blue-200">• {insight}</p>
              ))}
            </div>
          </div>
        </Card>
      )} */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sales Trend */}
          <Card className="p-6 rounded-2xl shadow-sm hover:shadow-md transition">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Sales Trend</h2>
                <p className="text-sm text-muted-foreground">
                  Last 30 days performance
                </p>
              </div>

              {/* Growth Indicator */}
              <div className="flex items-center gap-1 text-sm font-medium text-green-600">
                ▲ 12.4%
                <span className="text-muted-foreground font-normal">vs last month</span>
              </div>
            </div>

            {/* Chart */}
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={analytics.salesTrend}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#25d4ebff" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#2563EB" stopOpacity={0.05} />
                  </linearGradient>

                </defs>

                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.4} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip
                  contentStyle={{
                    borderRadius: "10px",
                    backgroundColor: "rgba(0, 238, 255, 0.1)",
                    border: "none",
                    boxShadow: "0 10px 30px rgba(0, 0, 0, 1)",
                  }}
                  formatter={(value: number) => [
                    `₹${value.toLocaleString("en-IN")}`,
                    "Sales",
                  ]}
                />

                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  fill="url(#colorSales)"
                  activeDot={{ r: 6 }}
                />
              </AreaChart>
            </ResponsiveContainer>

            {/* Insight */}
            <div className="mt-4 text-sm text-muted-foreground">
              Highest sales observed on <b>weekends</b>. Consider stocking fast-moving medicines.
            </div>
          </Card>


          {/* Expiry Analytics */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Expiry Analytics</h2>
              <Badge variant={filteredExpiry.length > 0 ? "destructive" : "secondary"}>
                {filteredExpiry.length} items
              </Badge>
            </div>
            {filteredExpiry.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Medicine</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead>Days Left</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExpiry.map(item => (
                      <TableRow
                        key={item.id}
                        className={`
                          ${item.severity === 'critical' ? 'bg-red-50 dark:bg-red-950/20' : ''}
                          ${item.severity === 'warning' ? 'bg-yellow-50 dark:bg-yellow-950/20' : ''}
                        `}
                      >
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{item.batch}</TableCell>
                        <TableCell>{item.expiryDate}</TableCell>
                        <TableCell className="text-right font-semibold">{item.quantity}</TableCell>
                        <TableCell className="text-right">₹{item.stockValue.toLocaleString("en-IN")}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              item.severity === 'critical' ? 'destructive' :
                                item.severity === 'warning' ? 'secondary' : 'outline'
                            }
                          >
                            {item.daysUntilExpiry}d
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p>No expiring medicines in selected range</p>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Top Medicines */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Top Selling</h2>
            {analytics.topMedicines.length > 0 ? (
              <div className="space-y-3">
                {analytics.topMedicines.slice(0, 5).map((med, i) => (
                  <div key={i} className="flex items-between justify-between pb-2 border-b last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{med.name}</p>
                      <p className="text-xs text-muted-foreground">{med.quantity} units</p>
                    </div>
                    <p className="text-sm font-semibold text-green-600">₹{med.revenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No sales data</p>
            )}
          </Card>

          {/* Stock Movement Summary */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Stock Movement</h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Fast Moving</span>
                <Badge className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200">
                  {analytics.stockMovement.filter(s => s.status === 'fast').length}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Slow Moving</span>
                <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
                  {analytics.stockMovement.filter(s => s.status === 'slow').length}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Dead Stock</span>
                <Badge variant="destructive">
                  {analytics.stockMovement.filter(s => s.status === 'dead').length}
                </Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

// ============= HELPER COMPONENTS =============

function KPICard({
  title,
  value,
  icon,
  color,
  subtitle,
  critical,
}: {
  title: string
  value: string | number
  icon: React.ReactNode
  color: 'blue' | 'green' | 'yellow' | 'red'
  subtitle: string
  critical?: number
}) {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400',
    green: 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 text-green-600 dark:text-green-400',
    yellow: 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800 text-yellow-600 dark:text-yellow-400',
    red: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400',
  }

  return (
    <Card className={`p-4 border-2 ${colorClasses[color]}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold mt-2">{value}</p>
          {critical !== undefined && critical > 0 && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-semibold">⚠️ {critical} critical</p>
          )}
          <p className="text-xs text-muted-foreground mt-2">{subtitle}</p>
        </div>
        <div className="opacity-50 ml-2">{icon}</div>
      </div>
    </Card>
  )
}

// ============= DATA PROCESSING FUNCTION =============

function processAnalytics(medicines: Medicine[], salesData: SalesData[]): AnalyticsData {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  // KPI Calculations
  const totalMedicines = medicines.length
  const totalStockQuantity = medicines.reduce((sum, m) => sum + m.quantity, 0)

  // Expiry calculations
  const expiryItems: ExpiryItem[] = []
  let days7Count = 0
  let days30Count = 0
  let days90Count = 0
  let expiredValue = 0

  medicines.forEach(med => {
    if (med.expiryDate) {
      const expiryDate = new Date(med.expiryDate)
      const diffMs = expiryDate.getTime() - today.getTime()
      const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

      const stockValue = med.price * med.quantity

      if (daysUntil < 0) {
        expiredValue += stockValue
      } else if (daysUntil <= 90) {
        const severity = daysUntil <= 7 ? 'critical' as const : daysUntil <= 30 ? 'warning' as const : 'info' as const

        if (daysUntil <= 7) days7Count++
        if (daysUntil <= 30) days30Count++
        if (daysUntil <= 90) days90Count++

        expiryItems.push({
          id: med.id,
          name: med.name,
          batch: med.batch,
          expiryDate: med.expiryDate,
          quantity: med.quantity,
          stockValue,
          daysUntilExpiry: daysUntil,
          severity,
        })
      }
    }
  })

  // Sort by days until expiry
  expiryItems.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)

  // Sales trend (mock data)
  const salesTrend: SalesData[] = generateSalesTrend()

  // Top medicines (based on stock value as proxy for revenue potential)
  const topMedicines: TopMedicine[] = medicines
    .filter(m => m.quantity > 0 && m.price > 0)
    .map(m => {
      // Estimate sales quantity (30% of current stock for high-value, 60% for low-value)
      const salesPercentage = m.price > 100 ? 0.3 : m.price > 50 ? 0.45 : 0.6
      const quantitySold = Math.floor(m.quantity * salesPercentage)
      return {
        name: m.name,
        revenue: m.price * quantitySold,
        quantity: quantitySold,
        category: m.category,
      }
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)

  // Stock movement analysis (based on price and category patterns)
  const stockMovement: StockMovement[] = medicines.map(m => {
    // Calculate realistic outbound based on price point and category
    let outboundRate = 0.15 // Default 15% turnover

    // High-demand categories
    if (['Antibiotic', 'Pain Relief', 'Fever', 'Cold & Cough'].includes(m.category)) {
      outboundRate = 0.35
    } else if (['Vitamin', 'Supplement', 'Digestive'].includes(m.category)) {
      outboundRate = 0.25
    }

    // Price-based adjustment (lower prices = higher volume)
    if (m.price < 50) outboundRate *= 1.3
    else if (m.price > 500) outboundRate *= 0.6

    const outbound = Math.max(1, Math.floor(m.quantity * outboundRate))
    const inbound = Math.floor(outbound * 0.7) // Restock at 70% of outbound
    const turnover = outbound / Math.max(m.quantity, 1)

    return {
      name: m.name,
      category: m.category,
      inbound,
      outbound,
      currentStock: m.quantity,
      turnover,
      status: turnover > 0.3 ? 'fast' : turnover > 0.05 ? 'slow' : 'dead',
    }
  })

  // Generate insights
  const insights: string[] = generateInsights({
    days7Count,
    days30Count,
    expiredValue,
    totalStockQuantity,
    topMedicines,
    stockMovement,
  })

  return {
    kpis: {
      totalMedicines,
      totalStockQuantity,
      expiryAlerts: { days7: days7Count, days30: days30Count, days90: days90Count },
      expiredStockValue: expiredValue,
      todaySales: salesTrend[salesTrend.length - 1]?.sales || 0,
      monthlySales: salesTrend.reduce((sum, s) => sum + s.sales, 0),
    },
    expiryItems,
    salesTrend,
    topMedicines,
    stockMovement,
    insights,
  }
}

function generateSalesTrend(): SalesData[] {
  const data: SalesData[] = []
  const now = new Date()

  for (let i = 29; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    const dayOfWeek = date.getDay() // 0 = Sunday, 6 = Saturday

    // Base amount varies by day of week
    let baseAmount = 45000

    // Weekend boost (Saturday & Sunday)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      baseAmount = 75000
    }
    // Friday boost
    else if (dayOfWeek === 5) {
      baseAmount = 65000
    }
    // Monday boost (people buying after weekend)
    else if (dayOfWeek === 1) {
      baseAmount = 58000
    }
    // Mid-week (Tuesday-Thursday)
    else {
      baseAmount = 48000
    }

    // Add gradual growth trend (2% per week)
    const weekProgress = (29 - i) / 7
    const growthFactor = 1 + (weekProgress * 0.02)

    // Add seasonal variation (±10%)
    const seasonalVariation = 0.9 + (Math.sin(i / 7) * 0.1)

    const sales = Math.floor(baseAmount * growthFactor * seasonalVariation)
    const avgOrderValue = 3500 // Average order value ₹3,500

    data.push({
      date: date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      sales,
      orders: Math.floor(sales / avgOrderValue),
    })
  }

  return data
}

function generateInsights(data: {
  days7Count: number
  days30Count: number
  expiredValue: number
  totalStockQuantity: number
  topMedicines: TopMedicine[]
  stockMovement: StockMovement[]
}): string[] {
  const insights: string[] = []

  if (data.days7Count > 0) {
    insights.push(`⚠️ ${data.days7Count} medicines expiring within 7 days - urgent action needed`)
  }

  if (data.expiredValue > 0) {
    insights.push(`₹${data.expiredValue.toLocaleString("en-IN")} in expired stock - consider disposal plan`)
  }

  if (data.topMedicines.length > 0) {
    const fastMover = data.topMedicines[0]
    insights.push(`${fastMover.name} is your top performer - consider increasing stock`)
  }

  const deadStock = data.stockMovement.filter(s => s.status === 'dead').length
  if (deadStock > 0) {
    insights.push(`${deadStock} medicines are slow/dead stock - review demand or clearance`)
  }

  const stockTurnover = data.stockMovement.reduce((sum, s) => sum + s.turnover, 0) / data.stockMovement.length
  if (stockTurnover < 0.2) {
    insights.push(`Low average turnover rate - optimize ordering patterns`)
  }

  return insights
}

