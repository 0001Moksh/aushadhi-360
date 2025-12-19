"use client"

import { useEffect, useMemo, useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, RefreshCcw, PackageSearch } from "lucide-react"
import { Button } from "@/components/ui/button"

interface NormalizedMedicine {
  id: string
  name: string
  batch: string
  quantity: number
  price?: number | null
  expiryDate?: Date | null
  expiryLabel: string
  daysToExpiry: number | null
  status: "fresh" | "expiring" | "expired" | "unknown"
  statusLabel: string
  tone: "success" | "warning" | "destructive" | "muted"
  category?: string
}

const toneStyles = {
  success: {
    badge: "text-success border-success/30 bg-success/10",
    row: "",
  },
  warning: {
    badge: "text-warning border-warning/30 bg-warning/10",
    row: "bg-warning/5",
  },
  destructive: {
    badge: "text-destructive border-destructive/30 bg-destructive/10",
    row: "bg-destructive/5",
  },
  muted: {
    badge: "text-muted-foreground border-border bg-muted/30",
    row: "",
  },
}

function getStatus(days: number | null) {
  if (days === null) return { status: "unknown" as const, label: "No expiry data", tone: "muted" as const }
  if (days < 0) return { status: "expired" as const, label: "Expired", tone: "destructive" as const }
  if (days <= 7) return { status: "expiring" as const, label: "Expiring in ≤7 days", tone: "warning" as const }
  if (days <= 30) return { status: "expiring" as const, label: "Expiring in ≤30 days", tone: "warning" as const }
  return { status: "fresh" as const, label: "Fresh stock", tone: "success" as const }
}

function normalizeMedicine(raw: any, index: number): NormalizedMedicine {
  const name =
    raw?.name ||
    raw?.medicineName ||
    raw?.MedicineName ||
    raw?.["Name of Medicine"] ||
    `Medicine ${index + 1}`

  const batch = raw?.batchNumber || raw?.Batch_ID || raw?.batchId || raw?.batch || "—"

  const quantityRaw = raw?.quantity ?? raw?.Total_Quantity ?? raw?.qty ?? raw?.total_quantity
  const quantity = Number.isFinite(Number(quantityRaw)) ? Number(quantityRaw) : 0

  const priceRaw = raw?.price ?? raw?.Price_INR ?? raw?.Price ?? raw?.rate
  const price = priceRaw !== undefined && priceRaw !== null && !Number.isNaN(Number(priceRaw)) ? Number(priceRaw) : null

  const expiryRaw =
    raw?.expiryDate ||
    raw?.expiry_date ||
    raw?.expiry ||
    raw?.expiryDateString ||
    raw?.Expiry_Date ||
    raw?.Expiry_date ||
    raw?.["Expiry Date"]
  const expiryDate = expiryRaw ? new Date(expiryRaw) : null
  const daysToExpiry = expiryDate ? Math.floor((expiryDate.getTime() - Date.now()) / 86400000) : null

  const { status, label, tone } = getStatus(daysToExpiry)

  return {
    id: String(raw?._id || raw?.id || batch || `${name}-${index}`),
    name,
    batch,
    quantity,
    price,
    expiryDate,
    expiryLabel: expiryDate ? expiryDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—",
    daysToExpiry,
    status,
    statusLabel: label,
    tone,
    category: raw?.Category || raw?.category,
  }
}

export function ProductsPage() {
  const [medicines, setMedicines] = useState<NormalizedMedicine[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")

  const loadMedicines = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const email = localStorage.getItem("user_email")
      if (!email) {
        setError("User email not found. Please log in again.")
        setIsLoading(false)
        return
      }

      const res = await fetch(`/api/user/medicines?email=${encodeURIComponent(email)}`)
      if (!res.ok) {
        setError("Could not fetch medicines right now.")
        setIsLoading(false)
        return
      }

      const data = await res.json()
      const rawMedicines: any[] = data.medicines || []
      setMedicines(rawMedicines.map((m, idx) => normalizeMedicine(m, idx)))
    } catch (err) {
      console.error("Failed to load medicines", err)
      setError("Something went wrong while loading products.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadMedicines()
  }, [])

  const filteredMedicines = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return medicines
    return medicines.filter((m) =>
      [m.name, m.batch, m.category, m.statusLabel]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q))
    )
  }, [medicines, query])

  const summary = useMemo(() => {
    return medicines.reduce(
      (acc, m) => {
        acc.total += 1
        if (m.status === "expired") acc.expired += 1
        if (m.status === "expiring") acc.expiring += 1
        if (m.status === "fresh") acc.fresh += 1
        return acc
      },
      { total: 0, expired: 0, expiring: 0, fresh: 0 }
    )
  }, [medicines])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-balance mb-1">All Products</h1>
          <p className="text-muted-foreground text-sm md:text-base text-pretty">Complete list of medicines with expiry-aware status colors.</p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full md:w-[260px]"
          />
          <Button variant="outline" size="icon" className="shrink-0 md:w-auto md:px-4" onClick={loadMedicines} disabled={isLoading}>
            <RefreshCcw className="h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Refresh</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Total Products</p>
          <p className="text-xl font-bold mt-1">{summary.total}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Fresh Stock</p>
          <p className="text-xl font-bold mt-1 text-success">{summary.fresh}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Expiring Soon</p>
          <p className="text-xl font-bold mt-1 text-warning">{summary.expiring}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Expired</p>
          <p className="text-xl font-bold mt-1 text-destructive">{summary.expired}</p>
        </Card>
      </div>


      {error && (
        <Alert variant="destructive">
          <AlertTitle>Unable to load products</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Fetching your medicines…</p>
        </div>
      ) : (
        <>
          {filteredMedicines.length === 0 ? (
            <Card className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <PackageSearch className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No medicines match your filters yet.</p>
            </Card>
          ) : (
            <>
              {/* Mobile View: Cards */}
              <div className="grid grid-cols-1 gap-2 md:hidden">
                {filteredMedicines.map((m) => {
                  const tone = toneStyles[m.tone]
                  return (
                    <Card key={m.id} className={`p-3 flex flex-col gap-3 ${tone.row}`}>
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex flex-col">
                          <span className="font-medium text-sm line-clamp-1">{m.name}</span>
                          {m.category && <span className="text-[10px] text-muted-foreground line-clamp-1">{m.category}</span>}
                        </div>
                        <Badge variant="outline" className={`${tone.badge} text-[10px] px-1.5 h-5 whitespace-nowrap shrink-0`}>
                          {m.statusLabel}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-y-1 text-xs">
                        <div className="text-muted-foreground">Batch: <span className="text-foreground font-medium">{m.batch}</span></div>
                        <div className="text-muted-foreground text-right">Qty: <span className="text-foreground font-medium">{m.quantity}</span></div>
                        <div className="text-muted-foreground">Price: <span className="text-foreground font-medium">{m.price ? `₹${m.price.toFixed(2)}` : "—"}</span></div>
                        {/* <div className="text-muted-foreground text-right">Exp: <span className="text-foreground font-medium">{m.expiryLabel}</span></div> */}
                      </div>
                    </Card>
                  )
                })}
              </div>

              {/* Desktop View: Table */}
              <Card className="hidden md:block p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMedicines.map((m) => {
                      const tone = toneStyles[m.tone]
                      return (
                        <TableRow key={m.id} className={tone.row}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">{m.name}</span>
                              {m.category && <span className="text-xs text-muted-foreground">{m.category}</span>}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{m.batch}</TableCell>
                          <TableCell className="text-sm">{m.quantity}</TableCell>
                          <TableCell className="text-sm">{m.price ? `₹${m.price.toFixed(2)}` : "—"}</TableCell>
                          {/* <TableCell className="text-sm">{m.expiryLabel}</TableCell> */}
                          <TableCell>
                            <Badge variant="outline" className={tone.badge}>
                              {m.statusLabel}
                              {m.daysToExpiry !== null && (
                                <span className="ml-2 text-xs text-muted-foreground">{m.daysToExpiry}d</span>
                              )}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  )
}
