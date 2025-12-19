"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Search, Plus, Trash2, ShoppingCart, Loader2, CheckCircle, AlertCircle, Package, Printer, History, Star, Keyboard, Download, Save, FileText, Eye, Trash } from "lucide-react"

interface Medicine {
  id: string
  name: string
  batch: string
  price: number
  quantity: number
  category: string
  form: string
  description?: string
}

interface CartItem {
  id: string
  name: string
  batch: string
  price: number
  quantity: number
  availableQty: number
  description?: string
}

interface DraftBill {
  id: string
  createdAt: number
  items: CartItem[]
  subtotal: number
  gst: number
  total: number
  customerEmail?: string
  storeName: string
}

interface BillHistory {
  id: string
  billId: string
  date: Date
  items: any[]
  subtotal: number
  gst: number
  total: number
  customerEmail?: string
  itemCount: number
  storeName?: string
}

export function BillingPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [customerEmail, setCustomerEmail] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [recentBills, setRecentBills] = useState<BillHistory[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  const [drafts, setDrafts] = useState<DraftBill[]>([])
  const [restoredDraftId, setRestoredDraftId] = useState<string | null>(null)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [storeName, setStoreName] = useState("Your Pharmacy")
  const [storePhone, setStorePhone] = useState<string | undefined>()
  const [storeAddress, setStoreAddress] = useState<string | undefined>()
  const searchInputRef = useRef<HTMLInputElement>(null)

  const loadMedicines = useCallback(async () => {
    setIsSearching(true)
    setError(null)
    try {
      const email = localStorage.getItem("user_email")
      if (!email) {
        setError("Please log in to access billing")
        setIsSearching(false)
        return
      }

      const res = await fetch(`/api/medicines/search?email=${encodeURIComponent(email)}&query=${encodeURIComponent(searchQuery)}`)
      if (!res.ok) throw new Error("Failed to load medicines")

      const data = await res.json()
      setMedicines(data.medicines || [])
    } catch (err) {
      setError("Could not load medicines. Please try again.")
      console.error(err)
    } finally {
      setIsSearching(false)
    }
  }, [searchQuery])

  // Load recent bills
  const loadRecentBills = useCallback(async () => {
    try {
      const email = localStorage.getItem("user_email")
      if (!email) return

      const res = await fetch(`/api/billing/history?email=${encodeURIComponent(email)}&limit=50`)
      if (res.ok) {
        const data = await res.json()
        setRecentBills(data.bills || [])
      }
    } catch (err) {
      console.error("Failed to load recent bills:", err)
    }
  }, [])

  // Load favorites from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("billing_favorites")
    if (saved) {
      try {
        setFavorites(JSON.parse(saved))
      } catch (e) {
        console.error("Failed to parse favorites")
      }
    }

    const savedDrafts = localStorage.getItem("billing_drafts")
    if (savedDrafts) {
      try {
        setDrafts(JSON.parse(savedDrafts))
      } catch (e) {
        console.error("Failed to parse drafts")
      }
    }
  }, [])

  // Load store profile for invoice header
  useEffect(() => {
    const loadStoreProfile = async () => {
      if (typeof window === "undefined") return
      const email = localStorage.getItem("user_email")
      if (!email) return

      try {
        const response = await fetch(`/api/user/profile?email=${encodeURIComponent(email)}`)
        if (!response.ok) return
        const data = await response.json()
        if (data?.user) {
          setStoreName(data.user.storeName || data.user.name || "Your Pharmacy")
          setStorePhone(data.user.phone || undefined)
          setStoreAddress(data.user.address || undefined)
        }
      } catch (error) {
        console.error("Failed to load store profile for billing header:", error)
      }
    }

    loadStoreProfile()
  }, [])

  // Save favorites to localStorage
  const toggleFavorite = (medicineId: string) => {
    setFavorites((prev) => {
      const newFavorites = prev.includes(medicineId)
        ? prev.filter((id) => id !== medicineId)
        : [...prev, medicineId]
      localStorage.setItem("billing_favorites", JSON.stringify(newFavorites))
      return newFavorites
    })
  }

  const saveDraft = () => {
    if (cart.length === 0) {
      setError("Add items to cart before saving a draft")
      setTimeout(() => setError(null), 3000)
      return
    }

    const draft: DraftBill = {
      id: `draft-${Date.now()}`,
      createdAt: Date.now(),
      items: cart,
      subtotal,
      gst,
      total,
      customerEmail: customerEmail || undefined,
      storeName,
    }

    setDrafts((prev) => {
      const updated = [draft, ...prev].slice(0, 20)
      localStorage.setItem("billing_drafts", JSON.stringify(updated))
      return updated
    })
    // Clear cart after saving draft as requested
    setCart([])
    setSuccess("Draft saved and cart cleared")
    setTimeout(() => setSuccess(null), 3000)
  }

  const restoreDraft = (id: string) => {
    const draft = drafts.find((d) => d.id === id)
    if (!draft) return
    setCart(draft.items)
    setCustomerEmail(draft.customerEmail || "")
    setRestoredDraftId(id)
    setSuccess("Draft loaded - edit or checkout to remove from drafts")
    setTimeout(() => setSuccess(null), 3000)
  }

  const deleteDraft = (id: string) => {
    setDrafts((prev) => {
      const updated = prev.filter((d) => d.id !== id)
      localStorage.setItem("billing_drafts", JSON.stringify(updated))
      return updated
    })
  }

  const previewInvoice = (bill: BillHistory) => {
    const payload = {
      items: bill.items,
      subtotal: bill.subtotal,
      gst: bill.gst,
      total: bill.total,
      customerEmail: bill.customerEmail,
      billId: bill.billId,
      invoiceDate: new Date(bill.date),
      storeName: bill.storeName || storeName,
      storePhone,
      storeAddress,
    }
    const htmlContent = buildInvoiceHtml(payload)
    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(htmlContent)
      printWindow.document.close()
      printWindow.focus()
    }
  }

  // Load medicines on mount
  useEffect(() => {
    loadMedicines()
    loadRecentBills()
  }, [])

  // Debounced search when user types
  useEffect(() => {
    if (searchQuery === "") {
      loadMedicines()
      return
    }
    const timer = setTimeout(() => {
      loadMedicines()
    }, 200)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K: Focus search
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
      // Ctrl/Cmd + Enter: Checkout
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && cart.length > 0) {
        e.preventDefault()
        handleCheckout()
      }
      // Escape: Clear cart
      if (e.key === "Escape" && cart.length > 0 && !isCheckingOut) {
        setCart([])
      }
      // Ctrl/Cmd + /: Show shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault()
        setShowShortcuts(true)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [cart, isCheckingOut])

  const addToCart = (medicine: Medicine) => {
    const existing = cart.find((item) => item.id === medicine.id && item.batch === medicine.batch)
    if (existing) {
      const newQty = existing.quantity + 1
      if (newQty > medicine.quantity) {
        setError(`Only ${medicine.quantity} units available in stock`)
        setTimeout(() => setError(null), 3000)
        return
      }
      setCart(
        cart.map((item) =>
          item.id === medicine.id && item.batch === medicine.batch
            ? { ...item, quantity: newQty }
            : item
        )
      )
    } else {
      if (medicine.quantity < 1) {
        setError("Out of stock")
        setTimeout(() => setError(null), 3000)
        return
      }
      setCart([...cart, {
        id: medicine.id,
        name: medicine.name,
        batch: medicine.batch,
        price: medicine.price,
        quantity: 1,
        availableQty: medicine.quantity,
        description: medicine.description || [medicine.category, medicine.form].filter(Boolean).join(" • ") || "Medicine sale",
      }])
    }
    // Delete restored draft when cart is modified
    if (restoredDraftId) {
      deleteDraft(restoredDraftId)
      setRestoredDraftId(null)
    }
    setSuccess("Added to cart")
    setTimeout(() => setSuccess(null), 2000)
  }

  const removeFromCart = (id: string, batch: string) => {
    setCart(cart.filter((item) => !(item.id === id && item.batch === batch)))
    // Delete restored draft when cart is modified
    if (restoredDraftId) {
      deleteDraft(restoredDraftId)
      setRestoredDraftId(null)
    }
  }

  const updateQuantity = (id: string, batch: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id, batch)
      return
    }

    const item = cart.find((i) => i.id === id && i.batch === batch)
    if (item && quantity > item.availableQty) {
      setError(`Only ${item.availableQty} units available`)
      setTimeout(() => setError(null), 3000)
      return
    }

    setCart(cart.map((item) =>
      item.id === id && item.batch === batch ? { ...item, quantity } : item
    ))
    // Delete restored draft when cart is modified
    if (restoredDraftId) {
      deleteDraft(restoredDraftId)
      setRestoredDraftId(null)
    }
  }

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const gst = subtotal * 0.18
  const total = subtotal + gst

  const handleCheckout = async () => {
    if (cart.length === 0) {
      setError("Cart is empty")
      setTimeout(() => setError(null), 3000)
      return
    }

    if (customerEmail && !customerEmail.includes("@")) {
      setError("Please enter a valid email address")
      setTimeout(() => setError(null), 3000)
      return
    }

    setIsCheckingOut(true)
    setError(null)

    try {
      const email = localStorage.getItem("user_email")
      if (!email) {
        setError("Session expired. Please log in again.")
        setIsCheckingOut(false)
        return
      }

      // Create bill and update inventory
      const billRes = await fetch("/api/billing/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          items: cart.map(item => ({
            medicineId: item.id,
            name: item.name,
            batch: item.batch,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.price * item.quantity,
            description: item.description,
          })),
          subtotal,
          gst,
          total,
          customerEmail: customerEmail || undefined,
        }),
      })

      if (!billRes.ok) {
        const errorData = await billRes.json()
        throw new Error(errorData.error || "Failed to create bill")
      }

      const billData = await billRes.json()

      // Send invoice email if customer email provided
      if (customerEmail) {
        await fetch("/api/email/invoice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerEmail,
            billId: billData.billId,
            storeName,
            storePhone,
            storeAddress,
            items: cart,
            subtotal,
            gst,
            total,
          }),
        })
      }

      setSuccess(customerEmail
        ? "Bill generated successfully! Invoice sent to customer email."
        : "Bill generated successfully!"
      )
      // Delete restored draft after bill generation
      if (restoredDraftId) {
        deleteDraft(restoredDraftId)
        setRestoredDraftId(null)
      }
      setCart([])
      setCustomerEmail("")
      await loadMedicines() // Refresh inventory
      await loadRecentBills() // Refresh bill history

      setTimeout(() => setSuccess(null), 5000)
    } catch (err: any) {
      setError(err.message || "An error occurred during checkout")
      console.error("Checkout error:", err)
    } finally {
      setIsCheckingOut(false)
    }
  }

  const buildInvoiceHtml = (payload: {
    items: CartItem[]
    subtotal: number
    gst: number
    total: number
    customerEmail?: string
    billId?: string
    invoiceDate?: Date
    storeName?: string
    storePhone?: string
    storeAddress?: string
  }) => {
    const invoiceDate = payload.invoiceDate || new Date()
    const formattedDate = invoiceDate.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    const invoiceNumber = payload.billId || `INV-${invoiceDate.getTime()}`
    const headerStoreName = payload.storeName || storeName
    const headerStorePhone = payload.storePhone || storePhone
    const headerStoreAddress = payload.storeAddress || storeAddress

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Invoice - ${headerStoreName}</title>

  <style>
    * { box-sizing: border-box; }
    body {
      font-family: "Segoe UI", Roboto, Arial, sans-serif;
      background: #f7f9fc;
      padding: 30px;
      color: #1f2937;
    }

    .invoice {
      max-width: 900px;
      margin: auto;
      background: #ffffff;
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.08);
      border: 1px solid #e5e7eb;
    }

    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 12px;
      gap: 12px;
    }

    .brand {
      font-size: 26px;
      font-weight: 700;
      color: #111827;
    }

    .brand span {
      font-size: 13px;
      font-weight: 500;
      display: block;
      color: #6b7280;
      margin-top: 4px;
    }

    .contact {
      text-align: right;
      font-size: 13px;
      color: #475569;
      line-height: 1.4;
    }

    .invoice-badge {
      background: #2563eb;
      color: white;
      padding: 8px 16px;
      border-radius: 999px;
      font-size: 14px;
      font-weight: 600;
    }

    /* Info */
    .info {
      display: flex;
      justify-content: space-between;
      margin-top: 20px;
      font-size: 14px;
      gap: 12px;
      flex-wrap: wrap;
    }

    .info div p {
      margin: 4px 0;
    }

    /* Table */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 24px;
      font-size: 14px;
    }

    thead th {
      text-align: left;
      padding: 12px;
      background: #f1f5f9;
      color: #334155;
      font-weight: 600;
      border-bottom: 2px solid #e5e7eb;
    }

    tbody td {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
      vertical-align: top;
    }

    tbody tr:last-child td {
      border-bottom: none;
    }

    .right { text-align: right; }
    .muted { color: #6b7280; font-size: 12px; }

    /* Totals */
    .totals {
      margin-top: 24px;
      display: flex;
      justify-content: flex-end;
    }

    .totals-box {
      width: 320px;
      font-size: 14px;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      overflow: hidden;
    }

    .totals-box div {
      display: flex;
      justify-content: space-between;
      padding: 10px 12px;
      border-bottom: 1px solid #e5e7eb;
      background: #fff;
    }

    .totals-box div:last-child { border-bottom: none; }

    .totals-box .grand {
      font-size: 18px;
      font-weight: 700;
      color: #2563eb;
      border-top: 2px solid #e5e7eb;
      padding-top: 10px;
      margin-top: 8px;
      background: #f8fafc;
    }

    /* Notes */
    .notes {
      margin-top: 24px;
      padding: 16px;
      border-radius: 12px;
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      color: #475569;
      font-size: 13px;
    }

    /* Footer */
    .footer {
      margin-top: 28px;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
    }

    @media print {
      body { padding: 0; background: #fff; }
      .invoice { box-shadow: none; border: 1px solid #e5e7eb; border-radius: 0; }
      @page { size: A4; margin: 12mm; }
    }
  </style>
</head>

<body>
  <div class="invoice">

    <!-- Header -->
    <div class="header">
      <div class="brand">
        ${headerStoreName}
        <span>Powered by Aushadhi 360 (software)</span>
      </div>
      <div class="contact">
        <div class="invoice-badge" style="float:right; margin-bottom:8px;">INVOICE</div>
        ${headerStorePhone ? `<div><strong>Phone:</strong> ${headerStorePhone}</div>` : ""}
        ${headerStoreAddress ? `<div><strong>Address:</strong> ${headerStoreAddress}</div>` : ""}
      </div>
    </div>

    <!-- Info -->
    <div class="info">
      <div>
        <p><strong>Date:</strong> ${formattedDate}</p>
        <p><strong>Invoice No:</strong> ${invoiceNumber}</p>
      </div>
      <div>
        ${payload.customerEmail ? `<p><strong>Customer:</strong> ${payload.customerEmail}</p>` : `<p><strong>Customer:</strong> Walk-in</p>`}
        <p class="muted">This is a system generated invoice.</p>
      </div>
    </div>

    <!-- Table -->
    <table>
      <thead>
        <tr>
          <th>Medicine</th>
          <th>Batch</th>
          <th class="right">Qty</th>
          <th class="right">Price</th>
          <th class="right">Amount</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        ${payload.items.map(item => `
          <tr>
            <td>${item.name}</td>
            <td>${item.batch}</td>
            <td class="right">${item.quantity}</td>
            <td class="right">₹${item.price.toFixed(2)}</td>
            <td class="right">₹${(item.price * item.quantity).toFixed(2)}</td>
            <td>${item.description || "Medicine sale"}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>

    <!-- Totals -->
    <div class="totals">
      <div class="totals-box">
        <div>
          <span>Subtotal</span>
          <span>₹${payload.subtotal.toFixed(2)}</span>
        </div>
        <div>
          <span>GST (18%)</span>
          <span>₹${payload.gst.toFixed(2)}</span>
        </div>
        <div class="grand">
          <span>Total</span>
          <span>₹${payload.total.toFixed(2)}</span>
        </div>
      </div>
    </div>

    <!-- Notes -->
    <div class="notes">
      <strong>Notes & Guidance</strong><br/>
      • Medicines once sold will not be returned.<br/>
      • Please consult physician before use.<br/>
      • For support, contact your pharmacist.<br/>
      ${headerStorePhone ? `• Store Phone: ${headerStorePhone}<br/>` : ""}
      ${headerStoreAddress ? `• Address: ${headerStoreAddress}` : ""}
    </div>
 
    <!-- Footer -->
    <div class="footer">
      Thank you for choosing ${headerStoreName}<br />
</body>
</html>
    `
  }

  const printBill = () => {
    if (cart.length === 0) return

    const printWindow = window.open("", "_blank")
    if (!printWindow) return
    const payload = {
      items: cart,
      subtotal,
      gst,
      total,
      customerEmail,
      billId: `BILL-${Date.now()}`,
      invoiceDate: new Date(),
      storeName,
      storePhone,
      storeAddress,
    }
    const html = buildInvoiceHtml(payload)

    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => printWindow.print(), 150)
  }

  const downloadInvoicePdf = () => {
    if (cart.length === 0) return

    const pdfWindow = window.open("", "_blank")
    if (!pdfWindow) return

    const payload = {
      items: cart,
      subtotal,
      gst,
      total,
      customerEmail,
      billId: `BILL-${Date.now()}`,
      invoiceDate: new Date(),
      storeName,
      storePhone,
      storeAddress,
    }
    const html = buildInvoiceHtml(payload)
    pdfWindow.document.write(html)
    pdfWindow.document.close()
    pdfWindow.focus()
    setTimeout(() => pdfWindow.print(), 200)
  }

  return (
    <div className="space-y-4 md:space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-balance mb-1">Manual Billing</h1>
          {/* <p className="text-sm text-muted-foreground text-pretty">Search medicines and generate bills with real-time inventory updates</p> */}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowShortcuts(true)}
            className="gap-2"
          >
            <Keyboard className="h-4 w-4" />
            Shortcuts
          </Button>
          {cart.length > 0 && (
            <>
              {/* <Button
                variant="outline"
                size="sm"
                onClick={downloadInvoicePdf}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Save PDF
              </Button> */}
              <Button
                variant="outline"
                size="sm"
                onClick={printBill}
                className="gap-2"
              >
                <Printer className="h-4 w-4" />
                Print
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Status Messages (float above layout to avoid shift) */}
      {(error || success) && (
        <div className="fixed top-4 right-4 z-50 space-y-3 w-[min(420px,calc(100%-1.5rem))] pointer-events-none">
          {error && (
            <Alert variant="destructive" className="pointer-events-auto shadow-lg">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-500 text-green-700 dark:text-green-400 pointer-events-auto shadow-lg">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Keyboard Shortcuts Dialog */}
      <Dialog open={showShortcuts} onOpenChange={setShowShortcuts}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="h-5 w-5" />
              Keyboard Shortcuts
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2 rounded hover:bg-accent">
              <span>Focus search</span>
              <Badge variant="outline">Ctrl + K</Badge>
            </div>
            <div className="flex items-center justify-between p-2 rounded hover:bg-accent">
              <span>Generate bill</span>
              <Badge variant="outline">Ctrl + Enter</Badge>
            </div>
            <div className="flex items-center justify-between p-2 rounded hover:bg-accent">
              <span>Clear cart</span>
              <Badge variant="outline">Esc</Badge>
            </div>
            <div className="flex items-center justify-between p-2 rounded hover:bg-accent">
              <span>Show shortcuts</span>
              <Badge variant="outline">Ctrl + /</Badge>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid lg:grid-cols-2 gap-4 md:gap-6">
        {/* Search & Add */}
        <Card className="p-4 md:p-6">
          <Tabs defaultValue="search" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="search" className="gap-2">
                <Search className="h-4 w-4" />
                Search
              </TabsTrigger>
              <TabsTrigger value="drafts" className="gap-2">
                <FileText className="h-4 w-4" />
                Drafts
                <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary/10 px-2 text-xs font-medium text-primary">
                  {drafts.length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <History className="h-4 w-4" />
                Recent Bills
                <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary/10 px-2 text-xs font-medium text-primary">
                  {recentBills.length}
                </span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="search" className="mt-0">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Search Medicine
                </h2>
                {!isSearching && medicines.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {medicines.length} found
                  </Badge>
                )}
              </div>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  placeholder="Search by name, batch, or category... (Ctrl+K)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10"
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />
                )}
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                {isSearching && medicines.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                    Loading medicines...
                  </div>
                ) : medicines.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No medicines found</p>
                    <p className="text-xs mt-1">Try a different search term</p>
                  </div>
                ) : (
                  medicines.map((medicine) => (
                    <div
                      key={`${medicine.id}-${medicine.batch}`}
                      className="flex items-center justify-between p-2 rounded-lg border hover:border-accent transition-colors group"
                    >
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => toggleFavorite(medicine.id)}
                        >
                          <Star
                            className={`h-4 w-4 ${favorites.includes(medicine.id)
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-muted-foreground"
                              }`}
                          />
                        </Button>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate text-sm">{medicine.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                            <span>₹{medicine.price.toFixed(2)}</span>
                            <span>•</span>
                            <span>Batch: {medicine.batch}</span>
                            <span>•</span>
                            <Badge variant={medicine.quantity > 10 ? "secondary" : "destructive"} className="text-xs">
                              {medicine.quantity} left
                            </Badge>
                          </div>
                          {medicine.category && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {medicine.category} • {medicine.form}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => addToCart(medicine)}
                        disabled={medicine.quantity === 0}
                        className="ml-2 flex-shrink-0"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="drafts" className="mt-0">
              <div className="space-y-3 max-h-[580px] overflow-y-auto pr-2 scrollbar-thin">
                {drafts.length === 0 ? (
                  <div className="text-center text-muted-foreground py-12">
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No draft bills</p>
                    <p className="text-xs mt-1">Saved drafts will appear here</p>
                  </div>
                ) : (
                  drafts.map((draft) => {
                    const names = draft.items.map(i => i.name).join(", ")
                    const createdStr = new Date(draft.createdAt).toLocaleString("en-IN", {
                      day: "2-digit", month: "short", year: "numeric",
                      hour: "2-digit", minute: "2-digit"
                    })
                    return (
                      <Card key={draft.id} className="p-3 hover:border-accent transition-colors">
                        <div className="mb-2">
                          <p className="font-semibold text-sm truncate" title={names}>{names}</p>
                          <p className="text-xs text-muted-foreground">{createdStr}</p>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                          <div>
                            <span className="text-muted-foreground">Items:</span>
                            <span className="ml-1 font-medium">{draft.items.length}</span>
                          </div>
                          <div className="col-span-2 flex justify-end">
                            <span className="text-muted-foreground mr-1">Total:</span>
                            <span className="font-semibold text-primary">₹{draft.total.toFixed(2)}</span>
                          </div>
                        </div>
                        {draft.customerEmail && (
                          <p className="text-xs text-muted-foreground mb-3 truncate" title={draft.customerEmail}>
                            {draft.customerEmail}
                          </p>
                        )}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => restoreDraft(draft.id)}
                            disabled={isCheckingOut}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Restore
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteDraft(draft.id)}
                            disabled={isCheckingOut}
                            aria-label="Delete draft"
                            title="Delete draft"
                          >
                            <Trash className="h-3 w-3" />
                          </Button>
                        </div>
                      </Card>
                    )
                  })
                )}
              </div>
            </TabsContent>

            <TabsContent value="history" className="mt-0">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold">Recent Bills</h2>
                <Link href="/dashboard/billing/history" className="text-xs text-primary hover:underline">View all Bills</Link>
              </div>
              <div className="space-y-3 max-h-[550px] overflow-y-auto pr-2 scrollbar-thin">
                {recentBills.length === 0 ? (
                  <div className="text-center text-muted-foreground py-12">
                    <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No recent bills</p>
                    <p className="text-xs mt-1">Your billing history will appear here</p>
                  </div>
                ) : (
                  recentBills.map((bill) => (
                    <Card key={bill.id} className="p-3 hover:border-accent transition-colors">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-sm">{bill.billId}</p>
                          <p className="text-sm text-foreground">
                            {new Date(bill.date).toLocaleDateString("en-IN", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center text-sm">
                        <span className="text-muted-foreground">Total: </span>
                        <span className="font-semibold ml-2 text-primary"> ₹{bill.total.toFixed(2)}</span>
                        <Badge className="ml-2 border-accent" variant="outline">{bill.itemCount} items</Badge>
                      </div>
                      {bill.customerEmail && (
                        <p className="text-xs text-muted-foreground truncate">
                          Customer: {bill.customerEmail}
                        </p>
                      )}
                      {/* {bill.storeName && (
                        <p className="text-xs text-muted-foreground truncate">
                          Store: {bill.storeName}
                        </p>
                      )} */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => previewInvoice(bill)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View Invoice
                      </Button>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </Card>

        {/* Cart */}
        <Card className="p-4 md:p-4">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Cart ({cart.length} items)</h2>
          </div>

          {cart.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <ShoppingCart className="h-16 w-16 mx-auto mb-3 opacity-30" />
              <p>Cart is empty</p>
              <p className="text-xs mt-1">Add medicines to get started</p>
            </div>
          ) : (
            <>
              <div className="space-y-2 mb-6 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                {cart.map((item) => (
                  <div key={`${item.id}-${item.batch}`} className="flex items-start gap-2 p-2 rounded-lg border bg-card">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-sm">{item.name}</p>
                      {/* <p className="text-xs text-muted-foreground">
                        Batch: {item.batch}
                      </p> */}
                      <p className="text-xs text-muted-foreground">
                        ₹{item.price.toFixed(2)} × {item.quantity} = ₹{(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">

                      <Badge variant="outline" className="text-xs mt-1">
                        {item.availableQty} available
                      </Badge>

                      <Input
                        type="number"
                        min="1"
                        max={item.availableQty}
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.id, item.batch, Number.parseInt(e.target.value) || 0)}
                        className="w-16 h-9 text-center"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeFromCart(item.id, item.batch)}
                        className="h-9 w-9"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2 border-t pt-4">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span className="font-medium">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>GST (18%):</span>
                  <span className="font-medium">₹{gst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
                  <span>Total:</span>
                  <span className="text-primary">₹{total.toFixed(2)}</span>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <div>
                  <Label htmlFor="customer-email" className="text-sm">
                    Customer Email (Optional)
                  </Label>
                  <Input
                    id="customer-email"
                    type="email"
                    placeholder="customer@example.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="mt-1.5"
                    disabled={isCheckingOut}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Invoice will be emailed if provided
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={saveDraft}
                    disabled={isCheckingOut || cart.length === 0}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save to Draft
                  </Button>
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleCheckout}
                    disabled={isCheckingOut || cart.length === 0}
                  >
                    {isCheckingOut ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Generate Bill
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
