"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sparkles, AlertCircle, PlusCircle, ShoppingCart, Stethoscope, Pill, Info, Activity, AlertTriangle, Lightbulb, CheckCircle, Clock, X, Download, Printer, Trash2 } from "lucide-react"

interface Medicine {
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

interface CartItem {
  id: string
  name: string
  batch: string
  price: number
  quantity: number
  description?: string
}

interface AIResponse {
  "AI Response": string
  Medicines: Medicine[]
  Score: string
  "overall instructions": string
}

export function AIAssistPage() {
  const [symptoms, setSymptoms] = useState("")
  const [response, setResponse] = useState<AIResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showWarning, setShowWarning] = useState(true)
  const [cart, setCart] = useState<CartItem[]>([])
  const [customerEmail, setCustomerEmail] = useState("")
  const [storeName, setStoreName] = useState("Your Pharmacy")
  const [storePhone, setStorePhone] = useState<string | undefined>()
  const [storeAddress, setStoreAddress] = useState<string | undefined>()
  const [activeTab, setActiveTab] = useState<"symptoms" | "cart">("symptoms")
  const [embeddingStatus, setEmbeddingStatus] = useState<{
    ready: boolean
    attempts: number
    checking: boolean
  }>({
    ready: false,
    attempts: 0,
    checking: true,
  })

  // Load store profile
  useEffect(() => {
    const loadStoreProfile = async () => {
      try {
        const email = localStorage.getItem("user_email")
        if (!email) return
        const res = await fetch(`/api/user/profile?email=${encodeURIComponent(email)}`)
        if (!res.ok) return
        const data = await res.json()
        if (data.storeName) setStoreName(data.storeName)
        if (data.storePhone) setStorePhone(data.storePhone)
        if (data.storeAddress) setStoreAddress(data.storeAddress)
      } catch (err) {
        console.warn("Could not load store profile:", err)
      }
    }
    loadStoreProfile()
  }, [])

  // Check embedding status on mount
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
      // Check if explicitly failed
      const failed = localStorage.getItem("embedding_ready") === "false"
      if (failed) {
        setEmbeddingStatus({
          ready: false,
          attempts: embeddingAttempts,
          checking: false,
        })
      } else {
        // Still in progress - poll for updates
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

  const handleAIAssist = async () => {
    if (!embeddingStatus.ready) {
      setError("AI embeddings are still being prepared. Please wait...")
      return
    }

    setIsLoading(true)
    setError(null)
    setResponse(null)

    try {
      const apiResponse = await fetch(`${process.env.NEXT_PUBLIC_FASTAPI_URL}/get_medicines?query=` + encodeURIComponent(symptoms), {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      })

      if (!apiResponse.ok) {
        throw new Error("Failed to get AI suggestions")
      }

      const data = await apiResponse.json()
      setResponse(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred while fetching suggestions")
      console.error("AI Assistant Error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const addToCart = (medicine: Medicine) => {
    const existing = cart.find(
      (item) => item.batch === medicine["Batch_ID"]
    )

    if (existing) {
      setCart(
        cart.map((item) =>
          item.batch === medicine["Batch_ID"]
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      )
    } else {
      setCart([
        ...cart,
        {
          id: `${medicine["Name of Medicine"]}-${Date.now()}`,
          name: medicine["Name of Medicine"],
          batch: medicine["Batch_ID"],
          price: medicine.Price_INR || 0,
          quantity: 1,
          description: medicine.Description,
        },
      ])
    }

    // Switch to cart tab
    setActiveTab("cart")
  }

  const removeFromCart = (batchId: string) => {
    setCart(cart.filter((item) => item.batch !== batchId))
  }

  const updateQuantity = (batchId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(batchId)
      return
    }
    setCart(
      cart.map((item) =>
        item.batch === batchId ? { ...item, quantity } : item
      )
    )
  }

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const gst = subtotal * 0.18
  const total = subtotal + gst

  const buildInvoiceHtml = (payload: {
    items: CartItem[]
    subtotal: number
    gst: number
    total: number
    customerEmail?: string
    billId?: string
    invoiceDate?: Date
  }) => {
    const invoiceDate = payload.invoiceDate || new Date()
    const formattedDate = invoiceDate.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    const invoiceNumber = payload.billId || `INV-AI-${invoiceDate.getTime()}`

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Invoice - ${storeName}</title>
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
      display: inline-block;
      margin-bottom: 8px;
    }
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
    .right { text-align: right; }
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
    .totals-box .grand {
      font-size: 18px;
      font-weight: 700;
      color: #2563eb;
      border-top: 2px solid #e5e7eb;
      padding-top: 10px;
      margin-top: 8px;
      background: #f8fafc;
    }
    .notes {
      margin-top: 24px;
      padding: 16px;
      border-radius: 12px;
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      color: #475569;
      font-size: 13px;
    }
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
    <div class="header">
      <div class="brand">
        ${storeName}
        <span>AI Assisted Pharmacy (Aushadhi 360)</span>
      </div>
      <div class="contact">
        <div class="invoice-badge">AI INVOICE</div>
        ${storePhone ? `<div><strong>Phone:</strong> ${storePhone}</div>` : ""}
        ${storeAddress ? `<div><strong>Address:</strong> ${storeAddress}</div>` : ""}
      </div>
    </div>
    <div class="info">
      <div>
        <p><strong>Date:</strong> ${formattedDate}</p>
        <p><strong>Invoice No:</strong> ${invoiceNumber}</p>
      </div>
      <div>
        ${payload.customerEmail ? `<p><strong>Customer:</strong> ${payload.customerEmail}</p>` : `<p><strong>Customer:</strong> Walk-in</p>`}
        <p style="font-size:12px; color:#6b7280;">AI-Assisted Medicine Recommendation Invoice</p>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Medicine</th>
          <th>Batch</th>
          <th class="right">Qty</th>
          <th class="right">Price</th>
          <th class="right">Amount</th>
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
          </tr>
        `).join("")}
      </tbody>
    </table>
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
    <div class="notes">
      <strong>AI Recommendation Notice</strong><br/>
      • These medicines were recommended by AI based on symptoms.<br/>
      • Please consult a pharmacist or doctor before use.<br/>
      • This is not a substitute for professional medical advice.<br/>
      • Follow dosage instructions carefully.
    </div>
    <div class="footer">
      Thank you for choosing ${storeName} | Powered by Aushadhi 360<br />
    </div>
  </div>
</body>
</html>
    `
  }

  const printInvoice = () => {
    if (cart.length === 0) {
      alert("Cart is empty. Please add medicines first.")
      return
    }

    const printWindow = window.open("", "_blank")
    if (!printWindow) {
      alert("Could not open print window")
      return
    }

    const payload = {
      items: cart,
      subtotal,
      gst,
      total,
      customerEmail,
      billId: `AI-${Date.now()}`,
      invoiceDate: new Date(),
    }

    const html = buildInvoiceHtml(payload)
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => printWindow.print(), 150)
  }

  const downloadInvoicePdf = () => {
    if (cart.length === 0) {
      alert("Cart is empty. Please add medicines first.")
      return
    }

    const pdfWindow = window.open("", "_blank")
    if (!pdfWindow) {
      alert("Could not open print window")
      return
    }

    const payload = {
      items: cart,
      subtotal,
      gst,
      total,
      customerEmail,
      billId: `AI-${Date.now()}`,
      invoiceDate: new Date(),
    }

    const html = buildInvoiceHtml(payload)
    pdfWindow.document.write(html)
    pdfWindow.document.close()
    pdfWindow.focus()
    setTimeout(() => pdfWindow.print(), 200)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold tracking-tight flex items-center justify-center gap-3">
            <Stethoscope className="h-10 w-10 text-primary" />
            AI Medicine Assistant
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Describe your symptoms to receive personalized OTC medicine recommendations powered by AI
          </p>
        </div>

        {/* Embedding Status Alert */}
        {embeddingStatus.checking && (
          <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
            <Clock className="h-5 w-5 text-blue-600 animate-spin" />
            <AlertTitle className="text-blue-900 dark:text-blue-100">Preparing AI Model</AlertTitle>
            <AlertDescription className="text-blue-800 dark:text-blue-200">
              The AI embeddings are being prepared in the background. This may take a minute. You'll be able to use the assistant once it's ready.
            </AlertDescription>
          </Alert>
        )}

        {embeddingStatus.ready && (
          <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <AlertTitle className="text-green-900 dark:text-green-100">Online</AlertTitle>
            <AlertDescription className="text-green-800 dark:text-green-200">
              {embeddingStatus.attempts > 1 && (
                <span className="text-muted-foreground">
                  (in {embeddingStatus.attempts} attempts)
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {!embeddingStatus.checking && !embeddingStatus.ready && embeddingStatus.attempts >= 30 && (
          <div className="min-h-[320px] flex flex-col items-center justify-center text-center gap-4 bg-card/60 border rounded-xl p-6">
            <div className="relative w-48 h-48 sm:w-64 sm:h-64">
              <img src="/error.png" alt="Base" className="w-full h-full opacity-90" />
              <img
                src="/error1.png"
                alt="Rotating"
                className="absolute inset-0 w-full h-full"
                style={{ animation: "rotateWobble 5s ease-in-out infinite", transformOrigin: "50% 50%" }}
              />
            </div>
            <h2 className="text-xl font-semibold">We're Upgrading!</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              Everything's under control. The team has been notified and is working on it right now.          </p>
            <style jsx>{`
              @keyframes rotateWobble {
                0% { transform: rotate(30deg); }
                25% { transform: rotate(55deg); }
                50% { transform: rotate(90deg); }
                75% { transform: rotate(55deg); }
                100% { transform: rotate(30deg); }
              }
            `}</style>
          </div>
        )}

        {!embeddingStatus.checking && !embeddingStatus.ready && embeddingStatus.attempts < 30 && (
          <Alert className="border-red-200 bg-red-50 dark:bg-red-950/20">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <AlertTitle className="text-red-900 dark:text-red-100">AI Preparation Failed</AlertTitle>
            <AlertDescription className="text-red-800 dark:text-red-200">
              ⚠️ Could not prepare embeddings after {embeddingStatus.attempts} attempts. FastAPI server may be down. Please check the server status or try logging in again.
            </AlertDescription>
          </Alert>
        )}

        {/* Safety Disclaimer */}
        {showWarning && (
          <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 relative">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <AlertTitle className="text-amber-900 dark:text-amber-100">Important Safety Notice</AlertTitle>
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              This tool suggests over-the-counter (OTC) medicines only. Prescription drugs are not recommended. Always consult a pharmacist or doctor before use. This is not a substitute for professional medical advice.
            </AlertDescription>
            <button
              onClick={() => setShowWarning(false)}
              className="absolute top-4 right-4 text-amber-600 hover:text-amber-800 dark:hover:text-amber-400 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </Alert>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b">
          <button
            onClick={() => setActiveTab("symptoms")}
            className={`px-4 py-2 font-medium transition-colors ${activeTab === "symptoms"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
              }`}
          >
            AI Recommendations
          </button>
          <button
            onClick={() => setActiveTab("cart")}
            className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${activeTab === "cart"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <ShoppingCart className="h-4 w-4" />
            Cart
            {cart.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {cart.length}
              </Badge>
            )}
          </button>
        </div>

        {/* Symptoms Tab */}
        {activeTab === "symptoms" && (
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Symptom Input Card */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Describe Your Symptoms
                </CardTitle>
                <CardDescription>
                  Provide as much detail as possible for accurate recommendations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Textarea
                  placeholder="E.g., I have been experiencing severe headache, nasal congestion, and mild fever for the past 2 days..."
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  rows={10}
                  className="resize-none"
                  disabled={!embeddingStatus.ready}
                />
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleAIAssist}
                  disabled={!symptoms.trim() || isLoading || !embeddingStatus.ready}
                >
                  {isLoading ? (
                    <>Analyzing Symptoms...</>
                  ) : !embeddingStatus.ready ? (
                    <>Preparing AI...</>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-5 w-5" />
                      Generate Recommendations
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Results Card */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Pill className="h-5 w-5" />
                    AI Recommendations
                  </span>
                </CardTitle>
                <CardDescription>
                  Personalized suggestions based on your symptoms
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!response ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                    <Sparkles className="h-16 w-16 mb-4 opacity-40" />
                    <p className="text-lg">
                      {embeddingStatus.ready
                        ? "Enter your symptoms to view AI-powered recommendations"
                        : "Waiting for AI model to be ready..."}
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-[600px] pr-4">
                    <div className="space-y-6">
                      {/* AI Summary */}
                      {response["AI Response"] && (
                        <Card className="border-primary/20 bg-primary/5">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Sparkles className="h-5 w-5 text-primary" />
                              AI Analysis Summary
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <p className="text-base">{response["AI Response"]}</p>
                            {response["Score"] && (
                              <Badge variant="secondary" className="text-lg py-1 px-3">
                                {response["Score"]} Confidence
                              </Badge>
                            )}
                          </CardContent>
                        </Card>
                      )}

                      {/* Recommended Medicines */}
                      {response.Medicines?.length > 0 ? (
                        <div className="space-y-5">
                          {response.Medicines.map((medicine, idx) => (
                            <Card key={idx} className="hover:shadow-xl transition-shadow duration-300">
                              <CardHeader>
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h3 className="text-xl font-semibold flex items-center gap-3">
                                      {medicine["Name of Medicine"]}
                                      {medicine["S.no"] && <Badge>#S{medicine["S.no"]}</Badge>}
                                    </h3>
                                    {medicine.Category && (
                                      <p className="text-sm text-muted-foreground mt-1">{medicine.Category}</p>
                                    )}
                                  </div>
                                  <Button onClick={() => addToCart(medicine)}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Add to Cart
                                  </Button>
                                </div>
                              </CardHeader>
                              <CardContent className="space-y-5">
                                {/* Key Info Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                  <div className="space-y-1">
                                    <p className="font-medium text-muted-foreground">Batch ID</p>
                                    <p className="font-mono">{medicine["Batch_ID"]}</p>
                                  </div>
                                  {medicine["Medicine Forms"] && (
                                    <div className="space-y-1">
                                      <p className="font-medium text-muted-foreground">Form</p>
                                      <p>{medicine["Medicine Forms"]}</p>
                                    </div>
                                  )}
                                  {medicine.Quantity_per_pack && (
                                    <div className="space-y-1">
                                      <p className="font-medium text-muted-foreground">Pack Size</p>
                                      <p>{medicine.Quantity_per_pack}</p>
                                    </div>
                                  )}
                                  {medicine.Price_INR !== undefined && (
                                    <div className="space-y-1">
                                      <p className="font-medium text-muted-foreground">Price</p>
                                      <p className="text-lg font-bold text-primary">₹{medicine.Price_INR}</p>
                                    </div>
                                  )}
                                </div>

                                <Separator />

                                {/* Detailed Sections */}
                                <div className="grid md:grid-cols-2 gap-5">
                                  {medicine.Description && (
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2 text-sm font-medium">
                                        <Info className="h-4 w-4" />
                                        Description
                                      </div>
                                      <p className="text-sm">{medicine.Description}</p>
                                    </div>
                                  )}

                                  {medicine["Cover Disease"] && (
                                    <div className="space-y-2 bg-purple-50 dark:bg-purple-950/30 p-4 rounded-lg">
                                      <div className="flex items-center gap-2 text-sm font-medium text-purple-900 dark:text-purple-100">
                                        Treats
                                      </div>
                                      <p className="text-sm font-medium">{medicine["Cover Disease"]}</p>
                                    </div>
                                  )}

                                  {medicine.Symptoms && (
                                    <div className="space-y-2 bg-green-50 dark:bg-green-950/30 p-4 rounded-lg">
                                      <div className="flex items-center gap-2 text-sm font-medium text-green-900 dark:text-green-100">
                                        Relevant Symptoms
                                      </div>
                                      <p className="text-sm">{medicine.Symptoms}</p>
                                    </div>
                                  )}

                                  {medicine.Quantity && (
                                    <div className="space-y-2 bg-orange-50 dark:bg-orange-950/30 p-4 rounded-lg">
                                      <div className="flex items-center gap-2 text-sm font-medium text-orange-900 dark:text-orange-100">
                                        Suggested Dosage
                                      </div>
                                      <p className="text-sm font-mono">{medicine.Quantity}</p>
                                    </div>
                                  )}
                                </div>

                                {medicine.Instructions && (
                                  <div className="space-y-2 bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg">
                                    <div className="flex items-center gap-2 text-sm font-medium text-blue-900 dark:text-blue-100">
                                      <Lightbulb className="h-4 w-4" />
                                      Usage Instructions
                                    </div>
                                    <p className="text-sm leading-relaxed">{medicine.Instructions}</p>
                                  </div>
                                )}

                                {medicine["Side Effects"] && (
                                  <div className="space-y-2 bg-red-50 dark:bg-red-950/30 p-4 rounded-lg border border-red-200 dark:border-red-800">
                                    <div className="flex items-center gap-2 text-sm font-medium text-red-900 dark:text-red-100">
                                      <AlertTriangle className="h-4 w-4" />
                                      Possible Side Effects
                                    </div>
                                    <p className="text-sm">{medicine["Side Effects"]}</p>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center text-muted-foreground py-8">
                          No suitable OTC medicines found for the described symptoms.
                        </p>
                      )}

                      {/* Lifestyle Advice */}
                      {response["overall instructions"] && (
                        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Lightbulb className="h-5 w-5 text-green-600" />
                              Additional Lifestyle Advice
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-base">{response["overall instructions"]}</p>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Cart Tab */}
        {activeTab === "cart" && (
          <div className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Cart Items */}
              <div className="lg:col-span-2 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5" />
                      Cart Items ({cart.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {cart.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        Your cart is empty. Add medicines from the recommendations.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {cart.map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex-1">
                              <h4 className="font-semibold">{item.name}</h4>
                              <p className="text-sm text-muted-foreground">Batch: {item.batch}</p>
                              <p className="text-sm font-medium mt-1">₹{item.price} x {item.quantity} = ₹{(item.price * item.quantity).toFixed(2)}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateQuantity(item.batch, parseInt(e.target.value) || 1)}
                                className="w-16"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFromCart(item.batch)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Billing Summary */}
              <Card className="lg:col-span-1 h-fit">
                <CardHeader>
                  <CardTitle>Billing Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span>₹{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>GST (18%)</span>
                      <span>₹{gst.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span>₹{total.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t">
                    <Label htmlFor="email">Customer Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="customer@example.com"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2 pt-4">
                    <Button onClick={printInvoice} variant="outline" className="w-full">
                      <Printer className="mr-2 h-4 w-4" />
                      Print Invoice
                    </Button>
                    <Button onClick={downloadInvoicePdf} variant="outline" className="w-full">
                      <Download className="mr-2 h-4 w-4" />
                      Download PDF
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}