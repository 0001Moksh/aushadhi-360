"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { Receipt, Sparkles, Upload, AlertTriangle, TrendingUp, Package, Clock, DollarSign, Loader2 } from "lucide-react"

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

export function DashboardHome() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-balance mb-2">Welcome, {profile?.ownerName || "User"}</h1>
        <p className="text-muted-foreground text-pretty">{profile?.storeName || "Your medical store"}</p>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card
          className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => router.push("/dashboard/billing")}
        >
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Receipt className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-1">Search & Bill</h3>
              <p className="text-sm text-muted-foreground text-pretty">Search medicines and generate bills</p>
            </div>
          </div>
        </Card>

        <Card
          className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => router.push("/dashboard/ai-assist")}
        >
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-accent/10">
              <Sparkles className="h-6 w-6 text-accent" />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-1">Ask AI</h3>
              <p className="text-sm text-muted-foreground text-pretty">Get symptom-based recommendations</p>
            </div>
          </div>
        </Card>

        <Card
          className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => router.push("/dashboard/import")}
        >
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-secondary/10">
              <Upload className="h-6 w-6 text-secondary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-1">Import Stock</h3>
              <p className="text-sm text-muted-foreground text-pretty">Upload bill photos to add medicines</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card
          className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
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
              <p className="text-sm text-muted-foreground">Total Products</p>
              <p className="text-2xl font-bold mt-1">{stats?.totalMedicines || 0}</p>
            </div>
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Low Stock</p>
              <p className="text-2xl font-bold mt-1 text-warning">{stats?.lowStockItems || 0}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-warning" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Expiring Soon</p>
              <p className="text-2xl font-bold mt-1 text-destructive">{stats?.expiringSoon || 0}</p>
            </div>
            <Clock className="h-8 w-8 text-destructive" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="text-2xl font-bold mt-1 text-success">Active</p>
            </div>
            <TrendingUp className="h-8 w-8 text-success" />
          </div>
        </Card>
      </div>

      {/* Alerts */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Recent Alerts</h2>
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
