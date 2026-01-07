"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import type React from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Plus, Trash2, ShoppingCart, Loader2, CheckCircle, AlertCircle, Package, Printer, History, Star, Keyboard, Download, Save, FileText, Eye, Trash, Zap, RefreshCw, Stethoscope, Activity, Sparkles, Pill, Clock, X, Lightbulb } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"

interface Medicine {
  id: string
  name: string
  batch: string
  price: number
  quantity: number
  category: string
  form: string
  description?: string
  expiryDate?: Date | null
  daysToExpiry?: number | null
  status?: "fresh" | "expiring" | "expired" | "unknown"
}

interface CartItem {
  id: string
  name: string
  batch: string
  price: number
  quantity: number
  availableQty: number
  description?: string
  isAIRecommended?: boolean
  aiInstructions?: string
  aiUsage?: string
  aiSideEffects?: string
  aiCoverDisease?: string
}

interface DraftBill {
  id: string
  createdAt: number
  items: CartItem[]
  subtotal: number
  gst: number
  total: number
  customerEmail?: string
  customerPhone?: string
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
  customerPhone?: string
  itemCount: number
  storeName?: string
}

interface AIResponse {
  "AI Response": string
  Medicines: AIMedicine[]
  Score: string
  "overall instructions": string
}

interface AIMedicine {
  S?: number
  "S.no"?: number
  "Name of Medicine": string
  "Batch_ID": string
  Description?: string
  Quantity?: string
  Instructions?: string
  "Cover Disease"?: string
  Symptoms?: string
  Price_INR?: number
  Category?: string
  "Medicine Forms"?: string
  Quantity_per_pack?: string
  "Side Effects"?: string
}

export function BillingPage() {
  const [mounted, setMounted] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [formFilter, setFormFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [allMedicines, setAllMedicines] = useState<Medicine[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [customerEmail, setCustomerEmail] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
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
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [isOnline, setIsOnline] = useState(true)
  const [syncingOfflineQueue, setSyncingOfflineQueue] = useState(false)
  const [offlineQueueCount, setOfflineQueueCount] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  const [activeTab, setActiveTab] = useState("search")
  const [viewMedicineId, setViewMedicineId] = useState<string | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const draggingFavorite = useRef<string | null>(null)

  // AI Assist Mode States
  const [isAIMode, setIsAIMode] = useState(false)
  const [symptoms, setSymptoms] = useState("")
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null)
  const [isAILoading, setIsAILoading] = useState(false)
  const [showAIWarning, setShowAIWarning] = useState(true)
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([])
  const [hasGroqKeyAssist, setHasGroqKeyAssist] = useState<boolean | null>(null)
  const [embeddingStatus, setEmbeddingStatus] = useState<{
    ready: boolean
    attempts: number
    checking: boolean
  }>({
    ready: false,
    attempts: 0,
    checking: true,
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  // Calculate expiry status for medicines
  const calculateExpiryStatus = (medicine: any): Medicine => {
    let expiryDate: Date | null = null
    let daysToExpiry: number | null = null
    let status: "fresh" | "expiring" | "expired" | "unknown" = "unknown"

    const expiryRaw = medicine.expiryDate || medicine.expiry_date || medicine.Expiry_Date || medicine.Expiry_date

    if (expiryRaw) {
      const expiryStr = String(expiryRaw).trim()

      // Try parsing "MMM-YYYY" format (e.g., "Sep-2026")
      const monthYearMatch = expiryStr.match(/^([A-Za-z]{3})-(\d{4})$/)
      if (monthYearMatch) {
        const [, month, year] = monthYearMatch
        const monthNum = new Date(`${month} 1, ${year}`).getMonth()
        const lastDay = new Date(Number(year), monthNum + 1, 0).getDate()
        expiryDate = new Date(`${month} ${lastDay}, ${year}`)
      } else {
        expiryDate = new Date(expiryStr)
        if (isNaN(expiryDate.getTime())) {
          expiryDate = null
        }
      }

      if (expiryDate) {
        daysToExpiry = Math.floor((expiryDate.getTime() - Date.now()) / 86400000)

        if (daysToExpiry < 0) {
          status = "expired"
        } else if (daysToExpiry <= 60) {
          status = "expiring"
        } else {
          status = "fresh"
        }
      }
    }

    return {
      ...medicine,
      expiryDate,
      daysToExpiry,
      status,
    }
  }

  if (!mounted) return null

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

      const res = await fetch(`/api/medicines/search?email=${encodeURIComponent(email)}&query=`)
      if (!res.ok) throw new Error("Failed to load medicines")

      const data = await res.json()
      const medicinesWithExpiry = (data.medicines || []).map(calculateExpiryStatus)
      setAllMedicines(medicinesWithExpiry)
    } catch (err) {
      setError("Could not load medicines. Please try again.")
      console.error(err)
    } finally {
      setIsSearching(false)
    }
  }, [])

  // Load recent bills
  const loadRecentBills = useCallback(async () => {
    try {
      const email = localStorage.getItem("user_email")
      if (!email) return

      const res = await fetch(`/api/billing/history?email=${encodeURIComponent(email)}&limit=50`)
      if (res.ok) {
        const data = await res.json()
        const allBills = data.bills || []
        const today = new Date().toDateString()
        const todaysBills = allBills
          .filter((bill: any) => new Date(bill.date).toDateString() === today)
          .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
        setRecentBills(todaysBills)
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

  // Check if user has GROQ API key configured for AI mode
  useEffect(() => {
    const checkGroqKey = async () => {
      try {
        const email = localStorage.getItem("user_email")
        if (!email) return

        const response = await fetch(`/api/user/groq-keys?email=${encodeURIComponent(email)}`)
        if (response.ok) {
          const data = await response.json()
          setHasGroqKeyAssist(!!data.groqKeyAssist)
        } else {
          setHasGroqKeyAssist(false)
        }
      } catch (error) {
        console.error("Failed to check GROQ key:", error)
        setHasGroqKeyAssist(false)
      }
    }

    checkGroqKey()
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

  const reorderFavorites = (sourceId: string, targetId: string) => {
    setFavorites((prev) => {
      const sourceIndex = prev.indexOf(sourceId)
      const targetIndex = prev.indexOf(targetId)
      if (sourceIndex === -1 || targetIndex === -1) return prev
      const updated = [...prev]
      updated.splice(sourceIndex, 1)
      updated.splice(targetIndex, 0, sourceId)
      localStorage.setItem("billing_favorites", JSON.stringify(updated))
      return updated
    })
  }

  const toggleViewDetails = (id: string) => {
    setViewMedicineId((prev) => (prev === id ? null : id))
  }

  const handleFavoriteDragStart = (id: string) => {
    draggingFavorite.current = id
  }

  const handleFavoriteDrop = (targetId: string) => {
    if (draggingFavorite.current && draggingFavorite.current !== targetId) {
      reorderFavorites(draggingFavorite.current, targetId)
    }
    draggingFavorite.current = null
  }

  const getFieldValue = (medicine: any, keys: string[]) => {
    for (const key of keys) {
      const path = key.split(".")
      let value: any = medicine
      for (const part of path) {
        if (value && Object.prototype.hasOwnProperty.call(value, part)) {
          value = value[part]
        } else {
          value = undefined
          break
        }
      }
      if (value !== undefined && value !== null) {
        if (typeof value === "string") {
          if (value.trim() !== "") return value
        } else if (!(Array.isArray(value) && value.length === 0)) {
          return value
        }
      }
    }
    return undefined
  }

  const renderDetailRow = (label: string, value: React.ReactNode, fullWidth = false) => {
    if (value === undefined || value === null || value === "") return null
    return (
      <div className={`flex items-start justify-between gap-2 ${fullWidth ? "col-span-2" : ""}`}>
        <span className="text-muted-foreground whitespace-nowrap">{label}</span>
        <span className={`ml-2 font-medium text-foreground ${fullWidth ? "text-left" : "text-right"} flex-1 min-w-0 break-words`}>
          {value}
        </span>
      </div>
    )
  }

  const dismissAlert = (key: string) => {
    setDismissedAlerts((prev) => (prev.includes(key) ? prev : [...prev, key]))
  }

  const isAlertDismissed = (key: string) => dismissedAlerts.includes(key)

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
      customerPhone: customerPhone || undefined,
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
    setCustomerPhone(draft.customerPhone || "")
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
      customerPhone: bill.customerPhone,
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

  // Extract unique forms and categories for filters
  const uniqueForms = useMemo(() => {
    const forms = new Set(allMedicines.map(m => m.form).filter(Boolean) as string[])
    return Array.from(forms).sort()
  }, [allMedicines])

  const uniqueCategories = useMemo(() => {
    const categories = new Set(allMedicines.map(m => m.category).filter(Boolean) as string[])
    return Array.from(categories).sort()
  }, [allMedicines])

  // Enhanced filtering logic like products page
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase()
    // Exclude expired medicines from billing
    let filtered = allMedicines.filter(m => m.status !== "expired")

    // Apply search filter across multiple fields
    if (q) {
      filtered = filtered.filter((m) =>
        [
          m.name,
          m.batch,
          m.category,
          m.form,
          m.description,
        ]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(q))
      )
    }

    // Apply form filter
    if (formFilter !== "all") {
      filtered = filtered.filter(m => m.form === formFilter)
    }

    // Apply category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter(m => m.category === categoryFilter)
    }

    setMedicines(filtered)
  }, [allMedicines, searchQuery, formFilter, categoryFilter])

  // Load medicines on mount
  useEffect(() => {
    loadMedicines()
    loadRecentBills()
  }, [])

  // Online/offline state and offline queue sync
  useEffect(() => {
    const updateOnline = () => setIsOnline(navigator.onLine)
    updateOnline()
    setOfflineQueueCount(getOfflineQueue().length)

    const handleOnline = () => {
      updateOnline()
      syncOfflineQueue()
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", updateOnline)
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", updateOnline)
    }
  }, [])

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)")
    const handleMq = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(e.matches)
    handleMq(mq)
    mq.addEventListener("change", handleMq)
    return () => mq.removeEventListener("change", handleMq)
  }, [])

  const getOfflineQueue = () => {
    try {
      return JSON.parse(localStorage.getItem("offline_bills_queue") || "[]") as any[]
    } catch {
      return []
    }
  }

  const setOfflineQueue = (queue: any[]) => {
    localStorage.setItem("offline_bills_queue", JSON.stringify(queue))
    setOfflineQueueCount(queue.length)
  }

  const enqueueOfflineBill = (payload: any) => {
    const queue = getOfflineQueue()
    queue.push({ ...payload, queuedAt: Date.now() })
    setOfflineQueue(queue)
  }

  const syncOfflineQueue = async () => {
    const queue = getOfflineQueue()
    if (!navigator.onLine || queue.length === 0) return
    setSyncingOfflineQueue(true)
    try {
      const email = localStorage.getItem("user_email")
      if (!email) return
      const remaining: any[] = []
      for (const job of queue) {
        try {
          const res = await fetch("/api/billing/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(job),
          })
          if (!res.ok) throw new Error("sync failed")
        } catch (err) {
          console.error("Offline sync failed for a bill", err)
          remaining.push(job)
        }
      }
      setOfflineQueue(remaining)
      if (remaining.length === 0) {
        setSuccess("Offline bills synced")
        setTimeout(() => setSuccess(null), 3000)
      }
    } finally {
      setSyncingOfflineQueue(false)
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K: Focus search
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        setActiveTab("search")
        setTimeout(() => searchInputRef.current?.focus(), 10)
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
      // Ctrl + S: Save Draft
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault()
        saveDraft()
      }
      // Ctrl + P: Print
      if ((e.ctrlKey || e.metaKey) && e.key === "p") {
        e.preventDefault()
        printBill()
      }
      // Alt + 1: Search Tab
      if (e.altKey && e.key === "1") {
        e.preventDefault()
        setActiveTab("search")
        setTimeout(() => searchInputRef.current?.focus(), 10)
      }
      // Alt + 2: Drafts Tab
      if (e.altKey && e.key === "2") {
        e.preventDefault()
        setActiveTab("drafts")
      }
      // Alt + 3: History Tab
      if (e.altKey && e.key === "3") {
        e.preventDefault()
        setActiveTab("history")
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [cart, isCheckingOut, activeTab])

  useEffect(() => {
    setHighlightedIndex(0)
  }, [medicines, favorites])

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

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, orderedMedicines: Medicine[]) => {
    if (orderedMedicines.length === 0) return

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setHighlightedIndex((prev) => Math.min(prev + 1, orderedMedicines.length - 1))
    }
    if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlightedIndex((prev) => Math.max(prev - 1, 0))
    }
    if (e.key === "Enter") {
      e.preventDefault()
      const target = orderedMedicines[highlightedIndex] || orderedMedicines[0]
      if (target) addToCart(target)
    }
  }

  // AI Assist Mode Functions
  useEffect(() => {
    const embeddingReady = localStorage.getItem("embedding_ready") === "true"
    const embeddingAttempts = parseInt(localStorage.getItem("embedding_attempts") || "0")

    if (embeddingReady) {
      setEmbeddingStatus({
        ready: true,
        attempts: embeddingAttempts,
        checking: false,
      })
    } else {
      const failed = localStorage.getItem("embedding_ready") === "false"
      if (failed) {
        setEmbeddingStatus({
          ready: false,
          attempts: embeddingAttempts,
          checking: false,
        })
      } else {
        const interval = setInterval(() => {
          const isReady = localStorage.getItem("embedding_ready") === "true"
          const isFailed = localStorage.getItem("embedding_ready") === "false"
          const attempts = parseInt(localStorage.getItem("embedding_attempts") || "0")

          if (isReady) {
            setEmbeddingStatus({
              ready: true,
              attempts,
              checking: false,
            })
            clearInterval(interval)
          } else if (isFailed) {
            setEmbeddingStatus({
              ready: false,
              attempts,
              checking: false,
            })
            clearInterval(interval)
          }
        }, 5000)

        return () => clearInterval(interval)
      }
    }
  }, [])

  useEffect(() => {
    setDismissedAlerts((prev) => prev.filter((key) => !key.startsWith("embedding-")))
  }, [embeddingStatus.checking, embeddingStatus.ready])

  const handleAIAssist = async () => {
    // Check if user has GROQ API key configured
    if (hasGroqKeyAssist === false) {
      setError(
        "AI Service Disabled\n\n" +
        "This AI assistance service has been disabled by your administrator.\n\n" +
        "Please contact support to enable this feature for your account."
      )
      setTimeout(() => setError(null), 5000)
      return
    }

    if (!embeddingStatus.ready) {
      setError("AI embeddings are still being prepared. Please wait...")
      setTimeout(() => setError(null), 3000)
      return
    }

    setIsAILoading(true)
    setError(null)
    setAiResponse(null)

    try {
      const email = localStorage.getItem("user_email")
      const password = localStorage.getItem("user_password")

      if (!email || !password) {
        setError("Authentication required. Please log in again.")
        setTimeout(() => setError(null), 3000)
        setIsAILoading(false)
        return
      }

      // Check if user has medicines imported
      const medicinesCheckResponse = await fetch(
        `/api/medicines/search?email=${encodeURIComponent(email)}&query=`,
        { method: "GET" }
      )

      if (medicinesCheckResponse.ok) {
        const medicinesData = await medicinesCheckResponse.json()
        if (!medicinesData.medicines || medicinesData.medicines.length === 0) {
          setError(
            "❌ No medicines imported yet in this system.\n\n" +
            "Please import medicines first from the 'Import' section before using AI recommendations."
          )
          setTimeout(() => setError(null), 5000)
          setIsAILoading(false)
          return
        }
      }

      const apiResponse = await fetch(
        `${process.env.NEXT_PUBLIC_FASTAPI_URL}/get_medicines?query=${encodeURIComponent(symptoms)}&mail=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      )

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json().catch(() => ({ detail: "Unknown error" }))

        // Handle specific error cases
        if (apiResponse.status === 404) {
          setError(
            "❌ No medicines found for AI recommendations.\n\n" +
            "Please import medicines from the 'Import' section first."
          )
        } else if (apiResponse.status === 403) {
          setError(
            "❌ AI Service Not Available for Admin.\n\n" +
            "Admin accounts cannot use AI recommendations. Please log in with a regular user account."
          )
        } else if (apiResponse.status === 500) {
          setError(
            "⚠️ AI Service Error: Check if GROQ API Key is configured.\n\n" +
            "The AI service encountered an error. Please ensure:\n" +
            "1. GROQ_API_KEY is set in environment variables\n" +
            "2. FastAPI backend is running correctly"
          )
        } else {
          setError(errorData.detail || `API error: ${apiResponse.status}`)
        }
        setTimeout(() => setError(null), 6000)
        setIsAILoading(false)
        return
      }

      const data = await apiResponse.json()
      setAiResponse(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred while fetching suggestions"

      // Check if it's a connection error
      if (errorMessage.includes("fetch") || errorMessage.includes("Failed")) {
        setError(
          "❌ Cannot connect to AI Service.\n\n" +
          "Make sure:\n" +
          "1. FastAPI backend is running\n" +
          "2. GROQ_API_KEY is available\n" +
          "3. Medicines are imported in the system"
        )
      } else {
        setError(errorMessage)
      }

      console.error("AI Assistant Error:", err)
      setTimeout(() => setError(null), 6000)
    } finally {
      setIsAILoading(false)
    }
  }

  const addAIMedicineToCart = (medicine: AIMedicine) => {
    const cartItem: CartItem = {
      id: medicine["Batch_ID"],
      name: medicine["Name of Medicine"],
      batch: medicine["Batch_ID"],
      price: medicine.Price_INR || 0,
      quantity: 1,
      availableQty: Number.parseInt(medicine.Quantity || "999"),
      description: medicine.Description,
      isAIRecommended: true,
      aiInstructions: medicine.Instructions,
      aiUsage: medicine["Cover Disease"],
      aiSideEffects: medicine["Side Effects"],
      aiCoverDisease: medicine["Cover Disease"],
    }

    const existing = cart.find((item) => item.batch === cartItem.batch)

    if (existing) {
      setCart(
        cart.map((item) =>
          item.batch === cartItem.batch
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      )
    } else {
      setCart([...cart, cartItem])
    }
    setSuccess(`Added ${medicine["Name of Medicine"]} to cart`)
    setTimeout(() => setSuccess(null), 2000)
  }

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const gst = subtotal * 0.18
  const total = subtotal + gst

  const favoriteMedicines = favorites
    .map((id) => medicines.find((m) => m.id === id))
    .filter(Boolean) as Medicine[]
  const otherMedicines = medicines.filter((m) => !favorites.includes(m.id))
  const orderedMedicines = [...favoriteMedicines, ...otherMedicines]

  const truncateName = (name: string, maxLength = 22) => {
    if (name.length <= maxLength) return name
    return name.slice(0, maxLength) + "…"
  }

  const getCartQuantity = (id: string, batch?: string) => {
    return cart.reduce((sum, item) => {
      if (item.id === id && (!batch || item.batch === batch)) {
        return sum + item.quantity
      }
      return sum
    }, 0)
  }

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

      const payload = {
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
        customerPhone: customerPhone || undefined,
      }

      // If offline, queue and exit early
      if (!navigator.onLine) {
        enqueueOfflineBill(payload)
        setSuccess("Offline: bill queued and will sync when you are online")
        setCart([])
        setCustomerEmail("")
        setCustomerPhone("")
        setIsCheckingOut(false)
        return
      }

      // Create bill and update inventory
      const billRes = await fetch("/api/billing/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
            customerPhone,
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
      setCustomerPhone("")
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
    customerPhone?: string
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
        ${payload.customerPhone ? `<p><strong>Phone:</strong> ${payload.customerPhone}</p>` : ""}
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
            <td>
              ${item.name}
              ${item.isAIRecommended ? '<span style="background: #3b82f6; color: white; font-size: 10px; padding: 2px 6px; border-radius: 4px; margin-left: 4px;">AI</span>' : ''}
            </td>
            <td>${item.batch}</td>
            <td class="right">${item.quantity}</td>
            <td class="right">₹${item.price.toFixed(2)}</td>
            <td class="right">₹${(item.price * item.quantity).toFixed(2)}</td>
            <td>${item.description || "Medicine sale"}</td>
          </tr>
          ${item.isAIRecommended && (item.aiInstructions || item.aiUsage || item.aiSideEffects) ? `
          <tr style="background: #f0f9ff;">
            <td colspan="6" style="padding: 8px 12px;">
              <div style="font-size: 12px; color: #1e40af;">
                <strong>AI Recommended Guidelines:</strong><br/>
                ${item.aiUsage ? `<strong>Usage:</strong> ${item.aiUsage}<br/>` : ''}
                ${item.aiInstructions ? `<strong>Instructions:</strong> ${item.aiInstructions}<br/>` : ''}
                ${item.aiSideEffects ? `<strong>Side Effects:</strong> ${item.aiSideEffects}` : ''}
              </div>
            </td>
          </tr>
          ` : ''}
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
      customerPhone,
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
      customerPhone,
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
    <div className="w-full space-y-3 sm:space-y-4 md:space-y-4">
      <div className="relative flex flex-col gap-3 sm:gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-balance break-words">
            {isAIMode ? "AI-Assisted Billing" : "Manual Billing"}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={isOnline ? "secondary" : "destructive"} className="flex items-center gap-1 text-xs sm:text-sm">
              {isOnline ? "Online" : "Offline"}
              {offlineQueueCount > 0 && <span className="text-xs">• {offlineQueueCount} queued</span>}
            </Badge>
            {offlineQueueCount > 0 && isOnline && (
              <Button
                variant="outline"
                size="sm"
                onClick={syncOfflineQueue}
              disabled={syncingOfflineQueue}
              className="gap-2 hover:text-primary text-xs"
            >
              {syncingOfflineQueue ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" /> : <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4" />}
              <span className="hidden sm:inline">Sync queued</span>
              <span className="sm:hidden">Sync</span>
            </Button>
          )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full">
          {/* AI Mode Toggle */}
          <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-2 border rounded-lg bg-card text-xs sm:text-sm flex-shrink-0">
            <Label htmlFor="ai-mode" className="font-medium cursor-pointer flex items-center gap-1.5 flex-shrink-0">
              {isAIMode ? <Stethoscope className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" /> : <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
              <span className="hidden sm:inline">{isAIMode ? "AI Mode" : "Static Mode"}</span>
            </Label>
            <Switch
              id="ai-mode"
              checked={isAIMode}
              onCheckedChange={setIsAIMode}
              className="scale-75 sm:scale-100 origin-left"
            />
          </div>

          {/* Shortcuts Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowShortcuts(true)}
            title="View Shortcuts (Ctrl+/)"
            className="hidden md:flex items-center gap-2 transition-all hover:text-primary text-xs">
            <Keyboard className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="font-medium">Shortcuts</span>
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
                title="Print Bill (Ctrl+P)"
                className="gap-2 hover:text-primary"
              >
                <Printer className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Status Messages (float above layout to avoid shift) */}
      {(error || success) && (
        <div className="fixed top-4 right-4 z-50 space-y-3 w-[min(420px,calc(100%-1.5rem))] pointer-events-none">
          {error && (
            <Alert variant="destructive" className="relative pointer-events-auto shadow-lg pr-10">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
              <button
                aria-label="Dismiss error"
                onClick={() => setError(null)}
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </Alert>
          )}

          {success && (
            <Alert className="relative border-green-500 text-green-700 dark:text-green-400 pointer-events-auto shadow-lg pr-10">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
              <button
                aria-label="Dismiss success"
                onClick={() => setSuccess(null)}
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
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
            <div className="flex items-center justify-between p-2 rounded border hover:border-accent">
              <span>Focus search</span>
              <Badge variant="outline">Ctrl + K</Badge>
            </div>
            <div className="flex items-center justify-between p-2 rounded border hover:border-accent">
              <span>Toggle Quick Mode</span>
              <Badge variant="outline">Ctrl + Q</Badge>
            </div>
            <div className="flex items-center justify-between p-2 rounded border hover:border-accent">
              <span>Generate bill</span>
              <Badge variant="outline">Ctrl + Enter</Badge>
            </div>
            <div className="flex items-center justify-between p-2 rounded border hover:border-accent">
              <span>Save Draft</span>
              <Badge variant="outline">Ctrl + S</Badge>
            </div>
            <div className="flex items-center justify-between p-2 rounded border hover:border-accent">
              <span>Print Bill</span>
              <Badge variant="outline">Ctrl + P</Badge>
            </div>
            <div className="flex items-center justify-between p-2 rounded border hover:border-accent">
              <span>Clear cart</span>
              <Badge variant="outline">Esc</Badge>
            </div>
            <div className="flex items-center justify-between p-2 rounded border hover:border-accent">
              <span>Switch Tabs</span>
              <Badge variant="outline">Alt + 1/2/3</Badge>
            </div>
            <div className="flex items-center justify-between p-2 rounded border hover:border-accent">
              <span>Show shortcuts</span>
              <Badge variant="outline">Ctrl + /</Badge>
            </div>
            <div className="flex items-center justify-between p-2 rounded border hover:border-accent">
              <span>NavBar shortcuts</span>
              <Badge variant="outline">Ctrl + B</Badge>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Mode Content */}
      {isAIMode ? (
        <div className={`grid gap-3 sm:gap-4 md:gap-6 lg:grid-cols-2`}>
          {/* AI Symptom Input & Recommendations with tabs */}
          <Card className="p-3 sm:p-4 md:p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-3 sm:mb-4 h-auto">
                <TabsTrigger value="search" className="gap-1 sm:gap-2 py-2 text-xs sm:text-sm flex-col sm:flex-row">
                  <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Search</span>
                </TabsTrigger>
                <TabsTrigger value="drafts" className="gap-1 py-2 text-xs sm:text-sm flex-col sm:flex-row">
                  <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Drafts</span>
                  <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary/10 text-[10px] sm:text-xs font-medium text-primary px-1">
                    {drafts.length}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-1 py-2 text-xs sm:text-sm flex-col sm:flex-row">
                  <History className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Bills</span>
                  <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary/10 text-[10px] sm:text-xs font-medium text-primary px-1">
                    {recentBills.length}
                  </span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="search" className="mt-0">
                <div className="space-y-3 sm:space-y-4">
                  {/* Symptom Input Section */}
                  <div>
                    {/* Embedding Status */}
                    {embeddingStatus.checking && !isAlertDismissed("embedding-checking") && (
                      <Alert className="relative border-blue-200 bg-blue-50 dark:bg-blue-950/20 mb-3 pr-9">
                        <Clock className="h-4 w-4 text-blue-600 animate-spin" />
                        <AlertDescription className="text-xs">
                          AI embeddings are being prepared...
                        </AlertDescription>
                        <button
                          aria-label="Dismiss embedding preparation"
                          onClick={() => dismissAlert("embedding-checking")}
                          className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Alert>
                    )}

                    {embeddingStatus.ready && !isAlertDismissed("embedding-ready") && (
                      <Alert className="relative border-green-200 bg-green-50 dark:bg-green-950/20 mb-3 pr-9">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-xs">
                          AI assistant is ready
                        </AlertDescription>
                        <button
                          aria-label="Dismiss AI ready status"
                          onClick={() => dismissAlert("embedding-ready")}
                          className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Alert>
                    )}

                    {!embeddingStatus.checking && !embeddingStatus.ready && !isAlertDismissed("embedding-unavailable") && (
                      <Alert className="relative border-red-200 bg-red-50 dark:bg-red-950/20 mb-3 pr-9">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-xs">
                          AI unavailable. Please check server status.
                        </AlertDescription>
                        <button
                          aria-label="Dismiss AI unavailable status"
                          onClick={() => dismissAlert("embedding-unavailable")}
                          className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Alert>
                    )}

                    {/* Safety Warning */}
                    {showAIWarning && (
                      <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 relative mb-3">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <AlertDescription className="text-xs">
                          AI suggests OTC medicines only. Always verify with a pharmacist.
                        </AlertDescription>
                        <button
                          onClick={() => setShowAIWarning(false)}
                          className="absolute top-3 right-3 text-amber-600 hover:text-amber-800"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Alert>
                    )}

                    <Textarea
                      placeholder="E.g., Patient has severe headache, nasal congestion, and mild fever for 2 days..."
                      value={symptoms}
                      onChange={(e) => setSymptoms(e.target.value)}
                      rows={6}
                      className="resize-none mb-3"
                      disabled={!embeddingStatus.ready}
                    />

                    <div className="flex gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex-1">
                            <Button
                              size="lg"
                              className="w-full relative"
                              onClick={handleAIAssist}
                              disabled={!symptoms.trim() || isAILoading || !embeddingStatus.ready || hasGroqKeyAssist === false}
                            >
                              {isAILoading ? (
                                <>

                                  Analyzing...
                                </>
                              ) : !embeddingStatus.ready ? (
                                <>Preparing AI...</>
                              ) : hasGroqKeyAssist === false ? (
                                <>
                                  <AlertCircle className="mr-2 h-5 w-5" />
                                  Service Disabled
                                </>
                              ) : (
                                <>
                                  <Sparkles className="mr-2 h-5 w-5" />
                                  Get Recommendations
                                </>
                              )}
                            </Button>
                          </div>
                        </TooltipTrigger>
                        {hasGroqKeyAssist === false && (
                          <TooltipContent side="top" align="center" className="max-w-sm text-left">
                            <p className="font-medium">⚠️ AI Service Disabled</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              This AI assistance service has been disabled by your administrator. Please contact support to enable this feature for your account.
                            </p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="lg"
                            variant="outline"
                            onClick={async () => {
                              try {
                                const email = localStorage.getItem("user_email")
                                const password = localStorage.getItem("user_password")
                                if (!email || !password) {
                                  setError("Authentication credentials not found. Please log in again.")
                                  setTimeout(() => setError(null), 3000)
                                  return
                                }
                                const response = await fetch(
                                  `${process.env.NEXT_PUBLIC_FASTAPI_URL}/login?mail=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`,
                                  { method: "POST" }
                                )
                                if (response.ok) {
                                  setSuccess("AI Doctor authentication successful!")
                                  setTimeout(() => setSuccess(null), 3000)
                                } else {
                                  setError("Authentication failed. Please check credentials.")
                                  setTimeout(() => setError(null), 3000)
                                }
                              } catch (err) {
                                setError("Failed to connect to AI Doctor service")
                                setTimeout(() => setError(null), 3000)
                              }
                            }}
                            disabled={isAILoading}
                          >
                            <Stethoscope className="h-5 w-5 mr-2" />
                            Call AI Doctor
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-sm text-left">
                          <p className="font-medium">🩺 Call AI Doctor</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Authenticate with FastAPI backend for AI recommendations
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>

                  {/* AI Recommendations List */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      {aiResponse?.Medicines && (
                        <Badge variant="secondary" className="text-xs">
                          <Package className="h-3 w-3 mr-1" />
                          {aiResponse.Medicines.length} found
                        </Badge>
                      )}
                    </div>

                    {/* AI Summary */}
                    {aiResponse?.["AI Response"] && (
                      <Card className="border-primary/20 bg-primary/5 mb-2">
                        <CardContent>
                          <div className="flex items-start gap-2">
                            <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium mb-1">AI Analysis</p>
                              <p className="text-xs">{aiResponse["AI Response"]}</p>
                              {aiResponse.Score && (
                                <Badge variant="outline" className="mt-2 text-xs">
                                  Confidence: {aiResponse.Score}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                      {isAILoading ? (
                        <div className="relative flex justify-center items-center h-48 overflow-hidden">
                          {/* Small floating sparkles */}
                          {[...Array(6)].map((_, i) => (
                            <svg
                              key={i}
                              className={`absolute w-6 h-6 sparkle sparkle-${i}`}
                              viewBox="0 0 24 24"
                              fill="none"
                            >
                              <path
                                d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z"
                                stroke="url(#tinyGradient)"
                                strokeWidth="1.5"
                              />
                            </svg>
                          ))}

                          {/* Main sparkle */}
                          <svg
                            width="90"
                            height="100"
                            viewBox="0 0 24 24"
                            fill="none"
                            className="relative z-10 animate-pulse"
                          >
                            <defs>
                              <linearGradient id="mainGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%">
                                  <animate
                                    attributeName="stop-color"
                                    values="#3b82f6;#22c55e;#a855f7;#f97316;#3b82f6"
                                    dur="4s"
                                    repeatCount="indefinite"
                                  />
                                </stop>
                                <stop offset="100%">
                                  <animate
                                    attributeName="stop-color"
                                    values="#a855f7;#f97316;#3b82f6;#22c55e;#a855f7"
                                    dur="4s"
                                    repeatCount="indefinite"
                                  />
                                </stop>
                              </linearGradient>

                              <linearGradient id="tinyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop stopColor="#ffffffaa" />
                                <stop stopColor="#ffffff33" />
                              </linearGradient>

                              {/* Glow */}
                              <filter id="glow">
                                <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                                <feMerge>
                                  <feMergeNode in="coloredBlur" />
                                  <feMergeNode in="SourceGraphic" />
                                </feMerge>
                              </filter>
                            </defs>

                            <Sparkles
                              stroke="url(#mainGradient)"
                              strokeWidth={2}
                              filter="url(#glow)"
                              className="w-20 h-20 opacity-90"
                            />
                          </svg>

                          <style jsx>{`
    .sparkle {
      opacity: 0.6;
      animation: float 4s ease-in-out infinite;
    }

    .sparkle-0 { top: 20%; left: 35%; animation-delay: 0s; }
    .sparkle-1 { top: 30%; right: 30%; animation-delay: 1s; }
    .sparkle-2 { bottom: 25%; left: 30%; animation-delay: 2s; }
    .sparkle-3 { bottom: 30%; right: 35%; animation-delay: 1.5s; }
    .sparkle-4 { top: 15%; left: 55%; animation-delay: 0.8s; }
    .sparkle-5 { bottom: 15%; right: 50%; animation-delay: 2.3s; }

    @keyframes float {
      0%, 100% {
        transform: translateY(0) scale(1);
        opacity: 0.4;
      }
      50% {
        transform: translateY(-6px) scale(1.15);
        opacity: 0.8;
      }
    }
  `}</style>
                        </div>


                      ) : !aiResponse ? (
                        <div className="text-center text-muted-foreground py-8">
                          <Sparkles className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>No recommendations yet</p>
                          <p className="text-xs mt-1">Enter symptoms and click Get Recommendations</p>
                        </div>
                      ) : aiResponse.Medicines?.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                          <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>No suitable medicines found</p>
                          <p className="text-xs mt-1">Try describing different symptoms</p>
                        </div>
                      ) : (
                        aiResponse.Medicines?.map((medicine, idx) => (
                          <Card key={idx} className="p-3 hover:border-accent transition-colors relative">
                            <Badge variant="outline" className="absolute top-2 left-2 text-xs font-bold">
                              #{idx + 1}
                            </Badge>
                            <div className="flex items-start justify-between gap-2 mt-6">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm truncate">{medicine["Name of Medicine"]}</p>
                                <p className="text-xs text-muted-foreground">Batch: {medicine["Batch_ID"]}</p>

                                <div className="flex flex-wrap gap-1 mt-1">
                                  {medicine.Category && (
                                    <Badge variant="outline" className="text-xs">{medicine.Category}</Badge>
                                  )}
                                  {medicine["Medicine Forms"] && (
                                    <Badge variant="outline" className="text-xs">{medicine["Medicine Forms"]}</Badge>
                                  )}
                                </div>

                                {medicine["Cover Disease"] && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    <strong>Treats:</strong> {medicine["Cover Disease"]}
                                  </p>
                                )}

                                {medicine.Instructions && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    <strong>Usage:</strong> {medicine.Instructions}
                                  </p>
                                )}
                              </div>

                              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                <Badge variant="secondary" className="font-bold">
                                  ₹{medicine.Price_INR?.toFixed(2) || "0.00"}
                                </Badge>
                                {getCartQuantity(medicine["Batch_ID"]) > 0 ? (
                                  <Button
                                    size="sm"
                                    onClick={() => addAIMedicineToCart(medicine)}
                                    className="h-8 px-3 border"
                                  >
                                    {getCartQuantity(medicine["Batch_ID"])} Added
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    onClick={() => addAIMedicineToCart(medicine)}
                                    className="h-8 px-3"
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Add
                                  </Button>
                                )}
                              </div>
                            </div>

                            {medicine["Side Effects"] && (
                              <p className="text-xs text-amber-600 mt-2 pt-2 border-t">
                                <strong>Side Effects:</strong> {medicine["Side Effects"]}
                              </p>
                            )}
                          </Card>
                        ))
                      )}
                    </div>

                    {/* Overall Instructions */}
                    {aiResponse?.["overall instructions"] && (
                      <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 mt-3">
                        <CardContent className="p-3">
                          <div className="flex items-start gap-2">
                            <Lightbulb className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium mb-1">Lifestyle Advice</p>
                              <p className="text-xs">{aiResponse["overall instructions"]}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="drafts" className="mt-0">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-semibold">Customer Information</h2>
                  <Badge variant="secondary" className="text-xs">{drafts.length}</Badge>
                </div>
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin">
                  {drafts.length === 0 ? (
                    <div className="text-center text-muted-foreground py-12">
                      <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No drafts saved</p>
                      <p className="text-xs mt-1">Save a bill to see it here</p>
                    </div>
                  ) : (
                    drafts.map((draft) => {
                      const date = new Date(draft.createdAt)
                      return (
                        <Card key={draft.id} className="p-3 hover:border-accent transition-colors">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold text-sm">Draft: {draft.id.replace("draft-", "")}</p>
                              <p className="text-xs text-muted-foreground">
                                {date.toLocaleDateString("en-IN")} • {draft.items.length} items
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-2 text-sm">
                            <span className="text-muted-foreground">Total:</span>
                            <span className="font-semibold text-primary">₹{draft.total.toFixed(2)}</span>
                          </div>
                          {(draft.customerEmail || draft.customerPhone) && (
                            <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                              {draft.customerEmail && <p className="truncate">Customer: {draft.customerEmail}</p>}
                              {draft.customerPhone && <p className="truncate">Phone: {draft.customerPhone}</p>}
                            </div>
                          )}
                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 hover:text-primary"
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
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin">
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
                        {bill.customerPhone && (
                          <p className="text-xs text-muted-foreground truncate">
                            Phone: {bill.customerPhone}
                          </p>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full hover:text-primary"
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

          {/* Cart (Same as Static Mode) */}
          <Card className="p-4 md:p-4">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                <h2 className="text-lg font-semibold">Cart ({cart.length} items)</h2>
              </div>
              {cart.length > 0 && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setCart([])}
                  className="gap-2"
                  title="Clear all items from cart"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear All
                </Button>
              )}
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
                        <p className="font-medium text-sm break-words">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          ₹{item.price.toFixed(2)} × {item.quantity} = ₹{(item.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant="outline" className="text-xs mt-1">
                          {item.availableQty} <br />
                          instock
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
                  <div>
                    <Label htmlFor="customer-phone" className="text-sm">
                      Customer Phone (Optional)
                    </Label>
                    <Input
                      id="customer-phone"
                      type="tel"
                      placeholder="98765 43210"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="mt-1.5"
                      disabled={isCheckingOut}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      className="hover:text-primary"
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
                          Payment Done
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </Card>
        </div>
      ) : (
        // Static Mode Content
        <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
          {/* Search & Add */}
          <Card className="p-1 md:p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="search" className="gap-2" title="Search (Alt+1)">
                  <Search className="h-4 w-4" />
                  Search
                </TabsTrigger>
                <TabsTrigger value="drafts" className="gap-1" title="Drafts (Alt+2)">
                  <FileText className="h-4 w-4" />
                  Drafts
                  <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                    {drafts.length}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-1" title="History (Alt+3)">
                  <History className="h-4 w-4" />
                  Recent Bills
                  <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                    {recentBills.length}
                  </span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="search" className="mt-0">

                <div className="space-y-3 mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />

                    <Input
                      ref={searchInputRef}
                      placeholder="Search by name, batch, category, form... (Ctrl+K)"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => handleSearchKeyDown(e, orderedMedicines)}
                      className="pl-10 pr-16"
                    />

                    {searchQuery && (
                      <button
                        type="button"
                        aria-label="Clear search"
                        onClick={() => {
                          setSearchQuery("")
                          searchInputRef.current?.focus()
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}

                    {isSearching && (
                      <Loader2 className="absolute right-9 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />
                    )}
                  </div>

                  {/* Filter dropdowns */}
                  <div className="flex gap-2">
                    <Select value={formFilter} onValueChange={setFormFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by form" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Forms</SelectItem>
                        {uniqueForms.map((form) => (
                          <SelectItem key={form} value={form}>
                            {form}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {uniqueCategories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {(formFilter !== "all" || categoryFilter !== "all") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setFormFilter("all")
                          setCategoryFilter("all")
                        }}
                        className="gap-1"
                      >
                        <X className="h-4 w-4" />
                        Clear filters
                      </Button>
                    )}
                  </div>
                </div>
                {/* <div className="flex items-center justify-end mb-2">
                {!isSearching && orderedMedicines.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    <Package className="h-5 w-5" />
                    {orderedMedicines.length} found
                  </Badge>
                )}
              </div> */}
                {favoriteMedicines.length > 0 && (
                  <div className="mb-4">
                    <div className="flex gap-2 flex-wrap">
                      {favoriteMedicines.map((fav) => (
                        <div
                          key={fav.id}
                          draggable
                          onDragStart={() => handleFavoriteDragStart(fav.id)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => handleFavoriteDrop(fav.id)}
                          className="px-3 py-2 rounded-full border bg-card shadow-sm flex items-center gap-2 cursor-move"
                          title={fav.name}
                        >
                          <span className="text-sm truncate max-w-[160px]">{fav.name}</span>
                          <Badge variant="outline" className="text-[11px]">₹{fav.price.toFixed(2)}</Badge>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => addToCart(fav)}>
                            <Plus className="h-3 w-3" />
                            {getCartQuantity(fav.id, fav.batch) > 0 && (
                              <span className="text-[10px] font-bold text-primary ml-0.5">{getCartQuantity(fav.id, fav.batch)}</span>
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-end">
                      {!isSearching && orderedMedicines.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          <Package className="h-5 w-5" />
                          {orderedMedicines.length} found
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                  {isSearching && orderedMedicines.length === 0 ? (
                    <div className="text-center text-muted-foreground py-2">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                      Loading medicines...
                    </div>
                  ) : orderedMedicines.length === 0 ? (
                    <div className="text-center text-muted-foreground py-2">
                      <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No medicines found</p>
                      <p className="text-xs mt-1">Try a different search term</p>
                    </div>
                  ) : (
                    orderedMedicines.map((medicine, idx) => {
                      const cardId = `${medicine.id}-${medicine.batch}`
                      const isViewing = viewMedicineId === cardId
                      const descriptionText = medicine.description?.trim() || [medicine.category, medicine.form].filter(Boolean).join(" • ") || "No description available"
                      const quantityPerPack = getFieldValue(medicine, ["Quantity_per_pack", "quantity_per_pack"])
                      const coverDisease = getFieldValue(medicine, ["Cover Disease", "cover_disease"])
                      const symptoms = getFieldValue(medicine, ["Symptoms", "symptoms"])
                      const sideEffects = getFieldValue(medicine, ["Side Effects", "side_effects"])
                      const instructions = getFieldValue(medicine, ["Instructions", "instruction", "usage"])
                      const descriptionDetail = getFieldValue(medicine, ["Description in Hinglish", "description_hinglish", "description"]) || medicine.description
                      const manufacturer = getFieldValue(medicine, ["Manufacturer", "manufacturer", "otherInfo.Manufacture", "otherInfo.Manufacturer"])
                      const expiryRaw = getFieldValue(medicine, ["Expiry", "expiry", "expiry_date", "Expiry_date", "Expiry_Date"])
                      const expiryDisplay = medicine.expiryDate ? medicine.expiryDate.toLocaleDateString() : expiryRaw
                      const priceImport = getFieldValue(medicine, ["Price_INR"])
                      const priceImportDisplay = typeof priceImport === "number" ? `₹${priceImport.toFixed(2)}` : priceImport
                      const totalQuantity = getFieldValue(medicine, ["Total_Quantity", "total_quantity"])
                      const formValue = getFieldValue(medicine, ["Medicine Forms", "form"]) || medicine.form
                      const batchId = getFieldValue(medicine, ["Batch_ID", "batch"]) || medicine.batch
                      const importStatus = getFieldValue(medicine, ["status_import", "status"])
                      const daysToExpiryText = typeof medicine.daysToExpiry === "number" ? `${medicine.daysToExpiry} days` : undefined

                      return (
                        <div
                          key={cardId}
                          className={`p-2 rounded-xl border transition-all hover:shadow-sm group ${idx === highlightedIndex ? "border-primary bg-primary/5" : "hover:border-accent"}`}>
                          <div className="flex items-center justify-between">
                            {/* Left Content */}
                            <div className="flex gap-3 flex-1 min-w-0">
                              {/* Favorite */}
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 opacity-50 group-hover:opacity-100 transition"
                                onClick={() => toggleFavorite(medicine.id)}
                              >
                                <Star
                                  className={`h-4 w-4 ${favorites.includes(medicine.id)
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-muted-foreground"
                                    }`}
                                />
                              </Button>

                              {/* Medicine Info */}
                              <div className="flex-1 min-w-0 space-y-1">
                                {/* Name */}
                                <p className="flex font-semibold text-sm truncate" title={medicine.name}>
                                  {isMobile ? truncateName(medicine.name) : medicine.name}
                                </p>
                                {/* Meta info */}
                                {/* <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <Badge variant="outline" className="text-[10px]">
                                  {medicine.category}
                                </Badge>
                                <Badge variant="outline" className="border-primary ml-1 text-[10px]">
                                  {medicine.form}
                                </Badge>
                              </div> */}

                                {/* Price + Stock */}
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="font-medium text-foreground">
                                    ₹{medicine.price.toFixed(2)}
                                  </span>
                                  <Badge
                                    variant={medicine.quantity > 10 ? "secondary" : "destructive"}
                                    className="text-[10px]"
                                  >
                                    {medicine.quantity} left
                                  </Badge>
                                </div>

                                {/* Description with hover */}

                              </div>
                            </div>

                            {/* Action Buttons */}
                            <Tooltip delayDuration={150}>
                              <TooltipTrigger asChild>

                                <div className="flex items-center gap-2 ml-1 flex-shrink-0">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => toggleViewDetails(cardId)}
                                    className="gap-1"
                                  >
                                    <Eye className="h-4 w-4" />
                                    <span className="md:visible hidden">
                                      {isViewing ? "Hide" : "View"}
                                    </span>
                                  </Button>

                                  {getCartQuantity(medicine.id, medicine.batch) > 0 ? (
                                    <Button
                                      size="sm"
                                      onClick={() => addToCart(medicine)}
                                      disabled={medicine.quantity === 0}
                                      className="flex-shrink-0 bg-card text-foreground border"
                                    >
                                      {getCartQuantity(medicine.id, medicine.batch)}
                                      <div>Add</div>
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      onClick={() => addToCart(medicine)}
                                      disabled={medicine.quantity === 0}
                                      className="flex-shrink-0"
                                    >
                                      <Plus className="h-4 w-4 mr-1" />
                                      Add
                                    </Button>
                                  )}
                                </div>

                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="max-w-sm whitespace-pre-line">
                                {descriptionText}
                              </TooltipContent>
                            </Tooltip>
                          </div>

                          {isViewing && (
                            <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                              {renderDetailRow("Name", <span title={medicine.name}>{isMobile ? truncateName(medicine.name) : medicine.name}</span>)}
                              {renderDetailRow("Price", `₹${medicine.price.toFixed(2)}`)}
                              {renderDetailRow("Available", medicine.quantity)}
                              {renderDetailRow("Batch", <span title={medicine.batch}>{medicine.batch}</span>)}
                              {renderDetailRow("Batch ID", batchId)}
                              {renderDetailRow("Category", medicine.category)}
                              {renderDetailRow("Form", formValue)}
                              {renderDetailRow("Quantity / Pack", quantityPerPack)}
                              {renderDetailRow("Total Quantity", totalQuantity)}
                              {renderDetailRow("Import Price", priceImportDisplay)}
                              {renderDetailRow("Cover Disease", coverDisease, true)}
                              {renderDetailRow("Symptoms", symptoms, true)}
                              {renderDetailRow("Instructions", instructions, true)}
                              {renderDetailRow("Side Effects", sideEffects, true)}
                              {renderDetailRow("Description", descriptionDetail, true)}
                              {renderDetailRow("Manufacturer", manufacturer)}
                              {renderDetailRow("Expiry", expiryDisplay)}
                              {renderDetailRow("Days to Expiry", daysToExpiryText)}
                              {renderDetailRow("Import Status", importStatus)}
                            </div>
                          )}
                        </div>

                      )
                    })
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
                      const names = draft.items
                        .map(i => i.name)
                        .join(", ")
                        .split(" ")
                        .slice(0, 3)
                        .join(" ") + "..."
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
                          {draft.customerPhone && (
                            <p className="text-xs text-muted-foreground mb-3 truncate" title={draft.customerPhone}>
                              {draft.customerPhone}
                            </p>
                          )}
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 hover:text-primary"
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
                        {bill.customerPhone && (
                          <p className="text-xs text-muted-foreground truncate">
                            Phone: {bill.customerPhone}
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
                          className="w-full hover:text-primary"
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
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                <h2 className="text-lg font-semibold">Cart ({cart.length} items)</h2>
              </div>
              {cart.length > 0 && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setCart([])}
                  className="gap-2"
                  title="Clear all items from cart"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear All
                </Button>
              )}
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
                        <p className="font-medium text-sm break-words">{item.name}</p>
                        {/* <p className="text-xs text-muted-foreground">
                        Batch: {item.batch}
                      </p> */}
                        <p className="text-xs text-muted-foreground">
                          ₹{item.price.toFixed(2)} × {item.quantity}
                          <br /> -&gt; ₹{(item.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center gap-0 md:gap-2 flex-shrink-0">

                        <Badge variant="outline" className="text-xs mt-1">
                          {item.availableQty} <br />
                          instock
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
                  <Label htmlFor="customer-email" className="text-sm">
                    Customer Info (Optional)
                  </Label>
                  <div className="md:grid md:grid-cols-2 gap-3">
                    <Input
                      id="customer-email"
                      type="email"
                      placeholder="Mail ID - invoice send on it"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="mt-1.5"
                      disabled={isCheckingOut}
                    />
                    <Input
                      id="customer-phone"
                      type="tel"
                      placeholder="Phone Number"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="mt-1.5"
                      disabled={isCheckingOut}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      className="hover:text-primary"
                      size="lg"
                      onClick={saveDraft}
                      title="Save Draft (Ctrl+S)"
                      disabled={isCheckingOut || cart.length === 0}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save to Draft
                    </Button>
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={handleCheckout}
                      title="Generate Bill (Ctrl+Enter)"
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
                          Payment Done
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={printBill}
                      title="Print Bill (Ctrl+P)"
                      className="gap-2 hover:text-primary"
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
