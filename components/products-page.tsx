"use client"

import { useEffect, useMemo, useState, useRef } from "react"
import { useToast } from "@/hooks/use-toast"
import { invalidateCacheWithFeedback } from "@/lib/cache-invalidation"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, RefreshCcw, PackageSearch, Pencil, Trash2, Download, Filter, X, Check, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"

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
  status_import?: string
  category?: string
  form?: string
  qtyPerPack?: string
  coverDisease?: string
  symptoms?: string
  sideEffects?: string
  instructions?: string
  hinglish?: string
  manufacturer?: string
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
  if (days <= 60) return { status: "expiring" as const, label: "Expiring in ≤60 days", tone: "warning" as const }
  // if (days <= 900) return { status: "expiring" as const, label: "Expiring in ≤900 days", tone: "warning" as const }
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
    raw?.Expiry ||
    raw?.expiryDateString ||
    raw?.Expiry_Date ||
    raw?.Expiry_date ||
    raw?.["Expiry Date"]
  
  // Parse expiry date - handle formats like "Sep-2026", "Mar-2027", or standard dates
  let expiryDate: Date | null = null
  let expiryLabel = "—"
  
  if (expiryRaw) {
    const expiryStr = String(expiryRaw).trim()
    
    // Debug logging
    console.log('[Expiry Parse]', { expiryStr, rawValue: expiryRaw })
    
    // Try parsing "MMM-YYYY" format FIRST (e.g., "Sep-2026")
    const monthYearMatch = expiryStr.match(/^([A-Za-z]{3})-(\d{4})$/)
    if (monthYearMatch) {
      const [, month, year] = monthYearMatch
      // Use last day of the month for expiry calculation
      const monthNum = new Date(`${month} 1, ${year}`).getMonth()
      const lastDay = new Date(Number(year), monthNum + 1, 0).getDate()
      const monthDate = new Date(`${month} ${lastDay}, ${year}`)
      
      console.log('[Expiry Parse] Month-Year format detected', { month, year, monthDate, daysToExpiry: Math.floor((monthDate.getTime() - Date.now()) / 86400000) })
      
      if (!isNaN(monthDate.getTime())) {
        expiryDate = monthDate
        expiryLabel = `${month}-${year}`
      }
    } else {
      // Try parsing as standard date
      const parsedDate = new Date(expiryStr)
      
      if (!isNaN(parsedDate.getTime())) {
        // Valid date object
        expiryDate = parsedDate
        expiryLabel = expiryDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
        console.log('[Expiry Parse] Standard date format', { parsedDate, expiryLabel })
      } else {
        // Keep original string if we can't parse it
        expiryLabel = expiryStr
        console.log('[Expiry Parse] Could not parse, using raw string', { expiryStr })
      }
    }
  }
  
  const daysToExpiry = expiryDate ? Math.floor((expiryDate.getTime() - Date.now()) / 86400000) : null

  const { status, label, tone } = getStatus(daysToExpiry)

  return {
    id: String(raw?._id || raw?.id || batch || `${name}-${index}`),
    name,
    batch,
    quantity,
    price,
    expiryDate,
    expiryLabel,
    daysToExpiry,
    status,
    statusLabel: label,
    tone,
    status_import: raw?.status_import,
    category: raw?.Category || raw?.category,
    form: raw?.["Medicine Forms"] || raw?.form || raw?.medicineForm,
    qtyPerPack: raw?.Quantity_per_pack || raw?.qtyPerPack || raw?.quantity_per_pack,
    coverDisease: raw?.["Cover Disease"] || raw?.coverDisease || raw?.cover_disease,
    symptoms: raw?.Symptoms || raw?.symptoms,
    sideEffects: raw?.["Side Effects"] || raw?.sideEffects || raw?.side_effects,
    instructions: raw?.Instructions || raw?.instructions,
    hinglish: raw?.["Description in Hinglish"] || raw?.hinglish || raw?.description,
    manufacturer: raw?.Manufacturer || raw?.manufacturer,
  }
}

export function ProductsPage() {
  const { toast } = useToast()
  const [medicines, setMedicines] = useState<NormalizedMedicine[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const hasLoadedMedicines = useRef(false)
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sortField, setSortField] = useState<keyof NormalizedMedicine | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<NormalizedMedicine>>({})
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; ids: string[] }>({ open: false, ids: [] })
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [isProcessing, setIsProcessing] = useState(false)
  const [detailView, setDetailView] = useState<NormalizedMedicine | null>(null)
  const [userPassword, setUserPassword] = useState<string>("")

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
    if (hasLoadedMedicines.current) return
    hasLoadedMedicines.current = true
    loadMedicines()
  }, [])

  const handleSort = (field: keyof NormalizedMedicine) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredMedicines.map(m => m.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds)
    if (checked) {
      newSet.add(id)
    } else {
      newSet.delete(id)
    }
    setSelectedIds(newSet)
  }

  const startEdit = (medicine: NormalizedMedicine) => {
    setEditingId(medicine.id)
    setEditForm({
      name: medicine.name,
      batch: medicine.batch,
      quantity: medicine.quantity,
      price: medicine.price || undefined,
      expiryLabel: medicine.expiryLabel !== "—" ? medicine.expiryLabel : "",
      category: medicine.category,
      form: medicine.form,
      qtyPerPack: medicine.qtyPerPack,
      coverDisease: medicine.coverDisease,
      symptoms: medicine.symptoms,
      sideEffects: medicine.sideEffects,
      instructions: medicine.instructions,
      hinglish: medicine.hinglish
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({})
  }

  const saveEdit = async () => {
    if (!editingId) return
    setIsProcessing(true)
    setError(null)

    try {
      const email = localStorage.getItem("user_email")
      if (!email) throw new Error("User email not found")

      const medicine = medicines.find(m => m.id === editingId)
      if (!medicine) throw new Error("Medicine not found")

      const res = await fetch("/api/medicines/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          id: editingId,
          Batch_ID: editForm.batch || medicine.batch,
          "Name of Medicine": editForm.name || medicine.name,
          Price_INR: editForm.price !== undefined ? Number(editForm.price) : medicine.price,
          Total_Quantity: editForm.quantity !== undefined ? Number(editForm.quantity) : medicine.quantity,
          Expiry_date: editForm.expiryLabel || null,
          Category: editForm.category || medicine.category,
          "Medicine Forms": editForm.form || medicine.form,
          Quantity_per_pack: editForm.qtyPerPack || medicine.qtyPerPack,
          "Cover Disease": editForm.coverDisease || medicine.coverDisease,
          Symptoms: editForm.symptoms || medicine.symptoms,
          "Side Effects": editForm.sideEffects || medicine.sideEffects,
          Instructions: editForm.instructions || medicine.instructions,
          "Description in Hinglish": editForm.hinglish || medicine.hinglish
        })
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to update")
      }

      // Invalidate cache after successful update
      if (userPassword) {
        invalidateCacheWithFeedback(email, userPassword, (msg, type) => {
          if (type === "error") {
            console.warn("[Products] Cache invalidation warning:", msg)
          }
        })
      }

      await loadMedicines()
      cancelEdit()
      toast({
        title: "Medicine updated",
        description: "Changes saved and search index refreshed"
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes")
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to save changes",
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const openDeleteDialog = (ids: string[]) => {
    setDeleteDialog({ open: true, ids })
  }

  const confirmDelete = async () => {
    const { ids } = deleteDialog
    if (!ids.length) return

    setIsProcessing(true)
    setError(null)

    try {
      const email = localStorage.getItem("user_email")
      if (!email) throw new Error("User email not found")

      const res = await fetch("/api/medicines/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, ids })
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to delete")
      }

      // Invalidate cache after successful deletion
      if (userPassword) {
        invalidateCacheWithFeedback(email, userPassword, (msg, type) => {
          if (type === "error") {
            console.warn("[Products] Cache invalidation warning:", msg)
          }
        })
      }

      await loadMedicines()
      setSelectedIds(new Set())
      setDeleteDialog({ open: false, ids: [] })
      toast({
        title: "Medicines deleted",
        description: `${ids.length} medicine(s) removed and search index refreshed`
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete medicines")
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete medicines",
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const exportToCSV = () => {
    const headers = ["Name", "Batch", "Quantity", "Price", "Expiry", "Status", "Category", "Form", "Qty/Pack", "Cover Disease", "Symptoms", "Side Effects", "Instructions", "Description (Hinglish)"]
    const rows = filteredMedicines.map(m => [
      m.name,
      m.batch,
      m.quantity,
      m.price || "",
      m.expiryLabel,
      m.statusLabel,
      m.category || "",
      m.form || "",
      m.qtyPerPack || "",
      m.coverDisease || "",
      m.symptoms || "",
      m.sideEffects || "",
      m.instructions || "",
      m.hinglish || ""
    ])

    const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `medicines-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filteredMedicines = useMemo(() => {
    const q = query.trim().toLowerCase()
    let filtered = medicines

    // Apply search filter
    if (q) {
      filtered = filtered.filter((m) =>
        [m.name, m.batch, m.category, m.statusLabel]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(q))
      )
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(m => m.status === statusFilter)
    }

    // Apply sorting
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[sortField]
        const bVal = b[sortField]

        if (aVal === null || aVal === undefined) return 1
        if (bVal === null || bVal === undefined) return -1

        let comparison = 0
        if (typeof aVal === "string" && typeof bVal === "string") {
          comparison = aVal.localeCompare(bVal)
        } else if (typeof aVal === "number" && typeof bVal === "number") {
          comparison = aVal - bVal
        }

        return sortDirection === "asc" ? comparison : -comparison
      })
    }

    return filtered
  }, [medicines, query, statusFilter, sortField, sortDirection])

  const summary = useMemo(() => {
    return medicines.reduce(
      (acc, m) => {
        acc.total += 1
        if (m.status === "expired") acc.expired += 1
        if (m.status === "expiring") acc.expiring += 1
        if (m.status === "fresh") acc.fresh += 1
        if (m.status_import && m.status_import.toLowerCase().includes("new")) acc.statusImportNew += 1
        return acc
      },
      { total: 0, expired: 0, expiring: 0, fresh: 0, statusImportNew: 0 }
    )
  }, [medicines])

  const paginatedMedicines = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredMedicines.slice(start, start + pageSize)
  }, [filteredMedicines, currentPage, pageSize])

  const totalPages = Math.ceil(filteredMedicines.length / pageSize)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-balance mb-1">All Products</h1>
          <p className="text-muted-foreground text-sm md:text-base text-pretty">Complete list of medicines with expiry-aware status colors.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-full md:w-[260px]">
            <Input
              placeholder="Search..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pr-10"
            />
            {query && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0">
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="p-2">
                <Label className="text-xs text-muted-foreground mb-2">Filter by Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="fresh">Fresh</SelectItem>
                    <SelectItem value="expiring">Expiring</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="unknown">Unknown</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="icon" className="shrink-0 md:w-auto md:px-4 hover:text-primary" onClick={loadMedicines} disabled={isLoading}>
            <RefreshCcw className="h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <Card className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{selectedIds.size} selected</Badge>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
              <X className="h-4 w-4 mr-1" /> Clear
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-1" /> Export Selected
            </Button>
            <Button variant="destructive" size="sm" onClick={() => openDeleteDialog(Array.from(selectedIds))}>
              <Trash2 className="h-4 w-4 mr-1" /> Delete
            </Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Total Products</p>
          <p className="text-xl font-bold mt-1">{summary.total}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Fresh Stock (new imports)</p>
          <p className="text-xl font-bold mt-1 text-success">{summary.statusImportNew}</p>
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
                {paginatedMedicines.map((m) => {
                  const tone = toneStyles[m.tone]
                  const isEditing = editingId === m.id
                  return (
                    <Card key={m.id} className={`p-3 flex flex-col gap-3 ${tone.row}`}>
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-2 flex-1">
                          <Checkbox
                            checked={selectedIds.has(m.id)}
                            onCheckedChange={(checked) => handleSelectOne(m.id, checked as boolean)}
                          />
                          {isEditing ? (
                            <Input
                              value={editForm.name || ""}
                              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                              className="h-8 text-sm flex-1"
                            />
                          ) : (
                            <div className="flex flex-col flex-1">
                              <span className="font-medium text-sm line-clamp-1">{m.name}</span>
                              {m.category && <span className="text-[10px] text-muted-foreground line-clamp-1">{m.category}</span>}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1">
                          {isEditing ? (
                            <>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveEdit} disabled={isProcessing}>
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEdit}>
                                <X className="h-3 w-3" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(m)}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => openDeleteDialog([m.id])}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      {!isEditing && (
                        <Badge variant="outline" className={`${tone.badge} text-[10px] px-1.5 h-5 whitespace-nowrap self-start`}>
                          {m.statusLabel}
                        </Badge>
                      )}

                      <div className="grid grid-cols-2 gap-y-1 text-xs">
                        <div className="text-muted-foreground">
                          Batch: {isEditing ? (
                            <Input
                              value={editForm.batch || ""}
                              onChange={(e) => setEditForm({ ...editForm, batch: e.target.value })}
                              className="h-7 text-xs mt-1"
                            />
                          ) : (
                            <span className="text-foreground font-medium">{m.batch}</span>
                          )}
                        </div>
                        <div className="text-muted-foreground text-right">
                          Qty: {isEditing ? (
                            <Input
                              type="number"
                              value={editForm.quantity || 0}
                              onChange={(e) => setEditForm({ ...editForm, quantity: Number(e.target.value) })}
                              className="h-7 text-xs mt-1"
                            />
                          ) : (
                            <span className="text-foreground font-medium">{m.quantity}</span>
                          )}
                        </div>
                        <div className="text-muted-foreground">
                          Price: {isEditing ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={editForm.price || ""}
                              onChange={(e) => setEditForm({ ...editForm, price: Number(e.target.value) })}
                              className="h-7 text-xs mt-1"
                            />
                          ) : (
                            <span className="text-foreground font-medium">{m.price ? `₹${m.price.toFixed(2)}` : "—"}</span>
                          )}
                        </div>
                        <div className="text-muted-foreground text-right">
                          Form: <span className="text-foreground font-medium">{m.form || "—"}</span>
                        </div>
                        <div className="text-muted-foreground col-span-2">
                          Qty/Pack: <span className="text-foreground font-medium">{m.qtyPerPack || "—"}</span>
                        </div>
                        {m.coverDisease && (
                          <div className="text-muted-foreground col-span-2">
                            Disease: <span className="text-foreground font-medium text-xs">{m.coverDisease}</span>
                          </div>
                        )}
                        {m.symptoms && (
                          <div className="text-muted-foreground col-span-2">
                            Symptoms: <span className="text-foreground font-medium text-xs line-clamp-2">{m.symptoms}</span>
                          </div>
                        )}
                      </div>
                    </Card>
                  )
                })}
              </div>
              {/* Pagination */}
              {!isLoading && filteredMedicines.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Rows per page</span>
                    <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1) }}>
                      <SelectTrigger className="h-8 w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredMedicines.length)} of {filteredMedicines.length}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-xs">Page {currentPage} of {totalPages}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
              {/* Desktop View: Table */}
              <Card className="hidden md:block p-0 overflow-hidden">
                <div className="overflow-x-auto max-h-[240px] overflow-y-auto">
                  <Table className="min-w-max">
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <TableHead className="w-10 min-w-10 h-9 px-2">
                          <Checkbox
                            checked={selectedIds.size === filteredMedicines.length && filteredMedicines.length > 0}
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>
                        <TableHead className="cursor-pointer hover:bg-muted/50 min-w-[200px] h-9 px-2 text-xs" onClick={() => handleSort("name")}>
                          <div className="flex items-center gap-1">
                            Product
                            {sortField === "name" && (sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                          </div>
                        </TableHead>
                        <TableHead className="cursor-pointer hover:bg-muted/50 min-w-[120px] h-9 px-2 text-xs" onClick={() => handleSort("batch")}>
                          <div className="flex items-center gap-1">
                            Batch
                            {sortField === "batch" && (sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                          </div>
                        </TableHead>
                        <TableHead className="cursor-pointer hover:bg-muted/50 min-w-[100px] h-9 px-2 text-xs" onClick={() => handleSort("quantity")}>
                          <div className="flex items-center gap-1">
                            Quantity
                            {sortField === "quantity" && (sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                          </div>
                        </TableHead>
                        <TableHead className="cursor-pointer hover:bg-muted/50 min-w-[100px] h-9 px-2 text-xs" onClick={() => handleSort("price")}>
                          <div className="flex items-center gap-1">
                            Price
                            {sortField === "price" && (sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                          </div>
                        </TableHead>
                        <TableHead className="cursor-pointer hover:bg-muted/50 min-w-[150px] h-9 px-2 text-xs" onClick={() => handleSort("daysToExpiry")}>
                          <div className="flex items-center gap-1">
                            Status
                            {sortField === "daysToExpiry" && (sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                          </div>
                        </TableHead>
                        <TableHead className="min-w-[120px] h-9 px-2 text-xs">Form</TableHead>
                        <TableHead className="min-w-[100px] h-9 px-2 text-xs">Qty/Pack</TableHead>
                        <TableHead className="w-16 min-w-16 sticky right-0 bg-background h-9 px-2 text-xs">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                  <TableBody>
                    {paginatedMedicines.map((m) => {
                      const tone = toneStyles[m.tone]
                      const isEditing = editingId === m.id
                      return (
                        <TableRow key={m.id} className={tone.row}>
                          <TableCell className="p-2">
                            <Checkbox
                              checked={selectedIds.has(m.id)}
                              onCheckedChange={(checked) => handleSelectOne(m.id, checked as boolean)}
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            {isEditing ? (
                              <Input
                                value={editForm.name || ""}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                className="h-7 text-xs"
                              />
                            ) : (
                              <div className="flex flex-col">
                                <span className="font-medium text-xs">{m.name}</span>
                                {m.category && <span className="text-[10px] text-muted-foreground">{m.category}</span>}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="p-2">
                            {isEditing ? (
                              <Input
                                value={editForm.batch || ""}
                                onChange={(e) => setEditForm({ ...editForm, batch: e.target.value })}
                                className="h-7 text-xs"
                              />
                            ) : (
                              <span className="text-xs text-muted-foreground">{m.batch}</span>
                            )}
                          </TableCell>
                          <TableCell className="p-2">
                            {isEditing ? (
                              <Input
                                type="number"
                                value={editForm.quantity || 0}
                                onChange={(e) => setEditForm({ ...editForm, quantity: Number(e.target.value) })}
                                className="h-7 text-xs w-20"
                              />
                            ) : (
                              <span className="text-xs">{m.quantity}</span>
                            )}
                          </TableCell>
                          <TableCell className="p-2">
                            {isEditing ? (
                              <Input
                                type="number"
                                step="0.01"
                                value={editForm.price || ""}
                                onChange={(e) => setEditForm({ ...editForm, price: Number(e.target.value) })}
                                className="h-7 text-xs w-24"
                              />
                            ) : (
                              <span className="text-xs">{m.price ? `₹${m.price.toFixed(2)}` : "—"}</span>
                            )}
                          </TableCell>
                          <TableCell className="p-2">
                            <Badge variant="outline" className={tone.badge}>
                              {m.statusLabel}
                              {m.daysToExpiry !== null && (
                                <span className="ml-2 text-[10px] text-muted-foreground">{m.daysToExpiry}d</span>
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell className="p-2">
                            {isEditing ? (
                              <Input
                                value={editForm.form || ""}
                                onChange={(e) => setEditForm({ ...editForm, form: e.target.value })}
                                className="h-7 text-xs w-32"
                              />
                            ) : (
                              <span className="text-xs text-muted-foreground">{m.form || "—"}</span>
                            )}
                          </TableCell>
                          <TableCell className="p-2">
                            {isEditing ? (
                              <Input
                                value={editForm.qtyPerPack || ""}
                                onChange={(e) => setEditForm({ ...editForm, qtyPerPack: e.target.value })}
                                className="h-7 text-xs w-24"
                              />
                            ) : (
                              <span className="text-xs text-muted-foreground">{m.qtyPerPack || "—"}</span>
                            )}
                          </TableCell>
                          <TableCell className="sticky right-0 bg-background border-l p-2">
                            {isEditing ? (
                              <div className="flex gap-1">
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={saveEdit} disabled={isProcessing}>
                                  <Check className="h-3 w-3" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={cancelEdit}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="icon" variant="ghost" className="h-6 w-6">
                                    <ChevronDown className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => startEdit(m)}>
                                    <Pencil className="h-3 w-3 mr-2" /> Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setDetailView(m)}>
                                    <PackageSearch className="h-3 w-3 mr-2" /> View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-destructive" onClick={() => openDeleteDialog([m.id])}>
                                    <Trash2 className="h-3 w-3 mr-2" /> Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
            </>
          )}
        </>
      )}



      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, ids: [] })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Medicine{deleteDialog.ids.length > 1 ? "s" : ""}</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {deleteDialog.ids.length} medicine{deleteDialog.ids.length > 1 ? "s" : ""}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, ids: [] })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isProcessing}>
              {isProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail View Dialog */}
      <Dialog open={!!detailView} onOpenChange={(open) => !open && setDetailView(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailView?.name}</DialogTitle>
            <DialogDescription>Complete medicine information</DialogDescription>
          </DialogHeader>
          {detailView && (
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Batch ID</Label>
                  <p className="text-sm font-medium mt-1">{detailView.batch}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Category</Label>
                  <p className="text-sm font-medium mt-1">{detailView.category || "—"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Quantity</Label>
                  <p className="text-sm font-medium mt-1">{detailView.quantity}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Price</Label>
                  <p className="text-sm font-medium mt-1">{detailView.price ? `₹${detailView.price.toFixed(2)}` : "—"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Form</Label>
                  <p className="text-sm font-medium mt-1">{detailView.form || "—"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Quantity per Pack</Label>
                  <p className="text-sm font-medium mt-1">{detailView.qtyPerPack || "—"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Manufacturer</Label>
                  <p className="text-sm font-medium mt-1">{detailView.manufacturer || "—"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Expiry Date</Label>
                  <p className="text-sm font-medium mt-1">{detailView.expiryLabel}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <div className="mt-1">
                    <Badge variant="outline" className={toneStyles[detailView.tone].badge}>
                      {detailView.statusLabel}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 space-y-3">
                {detailView.coverDisease && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Cover Disease</Label>
                    <p className="text-sm mt-1">{detailView.coverDisease}</p>
                  </div>
                )}
                {detailView.symptoms && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Symptoms</Label>
                    <p className="text-sm mt-1">{detailView.symptoms}</p>
                  </div>
                )}
                {detailView.sideEffects && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Side Effects</Label>
                    <p className="text-sm mt-1">{detailView.sideEffects}</p>
                  </div>
                )}
                {detailView.instructions && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Instructions</Label>
                    <p className="text-sm mt-1">{detailView.instructions}</p>
                  </div>
                )}
                {detailView.hinglish && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Description (Hinglish)</Label>
                    <p className="text-sm mt-1">{detailView.hinglish}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailView(null)}>Close</Button>
            <Button onClick={() => { detailView && startEdit(detailView); setDetailView(null); }}>
              <Pencil className="h-4 w-4 mr-2" /> Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
