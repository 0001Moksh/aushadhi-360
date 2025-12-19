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

  const filteredBills = useMemo(() => {
    let data = [...bills]

    // 🔍 Search
    if (search.trim()) {
      const q = search.toLowerCase()
      data = data.filter(b =>
        b.billId.toLowerCase().includes(q) ||
        b.customerEmail?.toLowerCase().includes(q) ||
        b.items.some((i: any) => i.name.toLowerCase().includes(q))
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
          <Button variant="outline">Back to Billing</Button>
        </Link>
      </div>

      {/* Controls */}
      <Card className="p-3 mb-4">
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

        <div className="text-sm text-muted-foreground mt-3">
          Showing <b>{filteredBills.length}</b> of {bills.length} bills
        </div>
      </Card>

      {/* Bills */}
      {filteredBills.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <History className="h-12 w-12 mx-auto mb-4 opacity-40" />
          No billing records found
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredBills.map((bill) => (
            <Card key={bill.id} className="p-3 hover:shadow-lg transition">
              <div className="flex justify-between mb-2">
                <div>
                  <p className="font-semibold">{bill.billId}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(bill.date), "dd MMM yyyy, hh:mm a")}
                  </p>
                </div>
                <Badge variant="secondary">{bill.itemCount} items</Badge>
              </div>

              {bill.customerEmail && (
                <p className="text-xs text-muted-foreground truncate mb-2">
                  {bill.customerEmail}
                </p>
              )}

              <div className="text-xl font-bold text-primary mb-4">
                ₹{bill.total.toFixed(2)}
              </div>

              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => window.open(`/invoice/${bill.billId}`, "_blank")}
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
