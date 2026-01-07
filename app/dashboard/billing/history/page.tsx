"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Eye, History, Search, X } from "lucide-react"
import { useEffect, useState, useMemo } from "react"
import { format, subDays, startOfMonth } from "date-fns"
import { buildInvoiceHtml, type InvoiceTemplateOptions } from "@/lib/invoice-template"

interface BillHistory {
  id: string
  billId: string
  date: string
  items: any[]
  subtotal: number
  gst: number
  total: number
  customerEmail?: string
  customerPhone?: string
  itemCount: number
  storeName?: string
}

export default function BillingHistoryPage() {
  const [bills, setBills] = useState<BillHistory[]>([])
  const [search, setSearch] = useState("")
  const [quickFilter, setQuickFilter] = useState<"all" | "today" | "7days" | "month">("all")
  const [groupByCustomer, setGroupByCustomer] = useState(false)
  const [invoiceOptions, setInvoiceOptions] = useState<InvoiceTemplateOptions>({})

  useEffect(() => {
    const load = async () => {
      const email = localStorage.getItem("user_email")
      if (!email) return

      const res = await fetch(`/api/billing/history?email=${encodeURIComponent(email)}&limit=500`)
      if (res.ok) {
        const data = await res.json()
        setBills(data.bills || [])
      }

      const prefRes = await fetch(`/api/user/preferences?email=${encodeURIComponent(email)}`)
      if (prefRes.ok) {
        const prefData = await prefRes.json()
        setInvoiceOptions({
          layout: prefData.preferences?.invoiceTemplate,
          columns: prefData.preferences?.invoiceColumns,
        })
      }
    }
    load()
  }, [])

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
    const htmlContent = buildInvoiceHtml(payload, invoiceOptions)
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
        b.customerPhone?.toLowerCase().includes(q) ||
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

  // Group bills by customer (email or phone)
  const groupedByCustomer = useMemo(() => {
    if (!groupByCustomer) return null

    const groups: Record<string, BillHistory[]> = {}
    filteredBills.forEach(bill => {
      const key = bill.customerEmail || bill.customerPhone || "Walk-in Customer"
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(bill)
    })
    return groups
  }, [filteredBills, groupByCustomer])

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
              className="pl-9 pr-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearch("")}
                className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex gap-2 flex-wrap items-center">
            {["all", "today", "7days", "month"].map((f) => (
              <Button
                key={f}
                size="sm"
                variant={quickFilter === f ? "default" : "outline"}
                className="hover:text-foreground/60"
                onClick={() => setQuickFilter(f as any)}
              > 
                {f === "all" ? "All" : f === "today" ? "Today" : f === "7days" ? "Last 7 Days" : "This Month"}
              </Button>
            ))}
            <div className="border-l pl-2">
              <Button
                size="sm"
                variant={groupByCustomer ? "default" : "outline"}
                onClick={() => setGroupByCustomer(!groupByCustomer)}
              >
                {groupByCustomer ? "Ungroup" : "Group by Customer"}
              </Button>
            </div>
          </div>
        </div>

      </Card>
        <div className="text-sm text-foreground py-2 ml-1">
          Showing <b>{filteredBills.length}</b> of {bills.length} bills
          {groupByCustomer && groupedByCustomer && ` • ${Object.keys(groupedByCustomer).length} customers`}
        </div>

      {/* Bills */}
      {filteredBills.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <History className="h-12 w-12 mx-auto mb-4 opacity-40" />
          No billing records found
        </div>
      ) : groupByCustomer && groupedByCustomer ? (
        // Grouped by Customer View
        <div className="space-y-6">
          {Object.entries(groupedByCustomer).map(([customer, customerBills]) => {
            const totalRevenue = customerBills.reduce((sum, bill) => sum + bill.total, 0)
            return (
              <Card key={customer} className="p-4">
                <div className="flex items-center justify-between mb-3 border-b pb-2">
                  <div>
                    <h3 className="font-semibold text-lg">{customer}</h3>
                    <p className="text-xs text-muted-foreground">
                      {customerBills.length} {customerBills.length === 1 ? 'bill' : 'bills'} • Total: ₹{totalRevenue.toFixed(2)}
                    </p>
                  </div>
                  <Badge variant="secondary">{customerBills.length}</Badge>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {customerBills.map((bill) => (
                    <Card key={bill.id} className="p-3 hover:shadow-lg hover:border-accent transition">
                      <div className="flex justify-between">
                        <div>
                          <p className="font-semibold text-sm">{bill.billId}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(bill.date), "dd MMM, hh:mm a")}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">{bill.itemCount} items</Badge>
                      </div>

                      <div className="text-lg font-bold text-primary mt-2">
                        ₹{bill.total.toFixed(2)}
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full hover:text-primary mt-2"
                        onClick={() => previewInvoice(bill)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </Card>
                  ))}
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        // Standard List View
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredBills.map((bill) => (
            <Card key={bill.id} className="p-3 hover:shadow-lg hover:border-accent transition">
              <div className="flex justify-between">
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

              <div className="text-xl font-bold text-primary">
                ₹{bill.total.toFixed(2)}
              </div>

              <Button
                size="sm"
                variant="outline"
                className="w-full hover:text-primary"
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
