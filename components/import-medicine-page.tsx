"use client"
import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { invalidateCacheWithFeedback } from "@/lib/cache-invalidation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, Camera, FileText, CheckCircle, AlertCircle, Loader2, Eye, RotateCw, List } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface PipelineStage {
  id: string
  name: string
  status: "pending" | "processing" | "completed" | "failed"
}

interface ImportResult {
  total: number
  updated: number
  new: number
}

interface ExtractedItem {
  name: string
  quantity: number
  price: number
  batch?: string
  expiryDate?: string
  isExisting?: boolean
}

export function ImportMedicinePage() {
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [currentStage, setCurrentStage] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [extractedItems, setExtractedItems] = useState<ExtractedItem[]>([])
  const [isReviewing, setIsReviewing] = useState(false)
  const [lastImportId, setLastImportId] = useState<string | null>(null)
  const [gridPreview, setGridPreview] = useState<string[][] | null>(null)
  const [gridPreviewMeta, setGridPreviewMeta] = useState<{ sheet?: string; rows?: number; cols?: number } | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const logsRef = useRef<HTMLDivElement | null>(null)
  const [excludedItems, setExcludedItems] = useState<ExtractedItem[]>([])
  const [userPassword, setUserPassword] = useState<string>("")
  const [hasGroqKeyImport, setHasGroqKeyImport] = useState<boolean | null>(null)

  const appendLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`])
  }

  const stages: PipelineStage[] = [
    { id: "validate", name: "Validating image quality & structure", status: "pending" },
    { id: "extract", name: "Extracting medicine data (OCR)", status: "pending" },
    { id: "match", name: "Matching with existing inventory", status: "pending" },
    { id: "update", name: "Updating quantities & prices", status: "pending" },
    { id: "enrich", name: "Enriching new medicines with metadata", status: "pending" },
    { id: "sync", name: "Syncing to database", status: "pending" },
  ]

  const handleFileSelect = (uploadedFile: File) => {
    appendLog(`[Pipeline] Selected file: ${uploadedFile.name}`)
    setFile(uploadedFile)
    setPreviewUrl(URL.createObjectURL(uploadedFile))
    setSuccess(false)
    setError(null)
    setResult(null)
    setExtractedItems([])
    setIsReviewing(false)
    setLastImportId(null)
    setCurrentStage(0)
    setGridPreview(null)
    setGridPreviewMeta(null)
    setExcludedItems([])

    const type = uploadedFile.type || ""
    const name = uploadedFile.name.toLowerCase()
    const isExcel = type.includes("spreadsheet") || name.endsWith(".xlsx") || name.endsWith(".xls")
    const isCsv = type.includes("csv") || name.endsWith(".csv")

    if (isExcel || isCsv) {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const data = e.target?.result
          if (!data) return

          // Dynamically import to avoid SSR issues
          const XLSX = await import("xlsx")

          if (isCsv) {
            appendLog(`[Pipeline] Rendering CSV preview...`)
            const text = typeof data === "string" ? data : new TextDecoder().decode(data as ArrayBuffer)
            const wb = XLSX.read(text, { type: "string" })
            const sheetName = wb.SheetNames[0]
            const ws = wb.Sheets[sheetName]
            const json = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[]
            const rows = (json || []).slice(0, 10).map((r) => (Array.isArray(r) ? r.map(String) : [String(r)]))
            setGridPreview(rows as string[][])
            setGridPreviewMeta({ sheet: sheetName, rows: json.length, cols: (json[0] || []).length })
            appendLog(`[Preview] Sheet: ${sheetName}, Rows: ${json.length}, Cols: ${(json[0] || []).length}`)
          } else {
            appendLog(`[Pipeline] Rendering Excel preview...`)
            const wb = XLSX.read(data as ArrayBuffer, { type: "array" })
            const sheetName = wb.SheetNames[0]
            const ws = wb.Sheets[sheetName]
            const json = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[]
            const rows = (json || []).slice(0, 10).map((r) => (Array.isArray(r) ? r.map(String) : [String(r)]))
            setGridPreview(rows as string[][])
            setGridPreviewMeta({ sheet: sheetName, rows: json.length, cols: (json[0] || []).length })
            appendLog(`[Preview] Sheet: ${sheetName}, Rows: ${json.length}, Cols: ${(json[0] || []).length}`)
          }
        } catch (err) {
          console.error("Failed to parse preview:", err)
          setError("Could not render preview for this file")
          appendLog(`[Error] Could not render preview for this file`)
        }
      }
      // For Excel we need ArrayBuffer; CSV can be read as text, but we unify with ArrayBuffer
      if (isCsv) reader.readAsText(uploadedFile)
      else reader.readAsArrayBuffer(uploadedFile)
    }
  }

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  // Auto-scroll logs
  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight
    }
  }, [logs])

  // Check if user has GROQ API key configured for import
  useEffect(() => {
    const checkGroqKey = async () => {
      try {
        const email = localStorage.getItem("user_email")
        if (!email) return

        const response = await fetch(`/api/user/groq-keys?email=${encodeURIComponent(email)}`)
        if (response.ok) {
          const data = await response.json()
          setHasGroqKeyImport(!!data.groqKeyImport)
        } else {
          setHasGroqKeyImport(false)
        }
      } catch (error) {
        console.error("Failed to check GROQ key:", error)
        setHasGroqKeyImport(false)
      }
    }

    checkGroqKey()
  }, [])

  // Convert Excel serial date to readable format
  const convertExcelDate = (value: any): string => {
    if (!value) return ""
    const num = Number(value)
    // Excel serial date: number > 1000 and < 100000 is likely a serial date
    if (!isNaN(num) && num > 1000 && num < 100000) {
      try {
        // Excel epoch is 1900-01-01, but it has a bug with leap year
        const date = new Date((num - 25569) * 86400 * 1000)
        return date.toLocaleDateString("en-GB") // DD/MM/YYYY format
      } catch {
        return String(value)
      }
    }
    return String(value)
  }

  const startProcessing = async () => {
    if (!file) return

    // Check if user has GROQ API key configured
    if (hasGroqKeyImport === false) {
      setError(
        "Medicine Import Service Disabled\n\n" +
        "The medicine import service has been disabled by your administrator.\n\n" +
        "Please contact support to enable this feature for your account."
      )
      return
    }

    setIsProcessing(true)
    setSuccess(false)
    setError(null)
    setResult(null)
    setCurrentStage(0)
    appendLog(`[Pipeline] Received request - File: ${file.name}, Type: ${file.type.includes("image") ? "image" : "excel"}`)
    appendLog(`[Pipeline] Layer 1: Validating input...`)

    try {
      const userEmail = localStorage.getItem("user_email") || ""
      if (!userEmail) throw new Error("User email not found. Please log in again.")

      const formData = new FormData()
      formData.append("file", file)
      formData.append("email", userEmail)
      formData.append("type", file.type.includes("image") ? "image" : "excel")
      formData.append("mode", "review")

      const progressInterval = setInterval(() => {
        setCurrentStage((prev) => Math.min(prev + 1, stages.length - 1))
      }, 1200)

      const response = await fetch("/api/import/pipeline", {
        method: "POST",
        body: formData,
      })

      clearInterval(progressInterval)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Import failed")
      }

      const data = await response.json()
      appendLog(`[Pipeline] Extracted ${(data?.items || []).length} records`)
      // Parse summary with defensive access
      const summary = data.summary ? {
        total: Number(data.summary.total) || 0,
        updated: Number(data.summary.updated) || 0,
        new: Number(data.summary.new) || 0,
      } : null

      const allItems: ExtractedItem[] = (data.items as ExtractedItem[] | undefined)?.map((item) => ({
        name: item?.name || "",
        quantity: Number(item?.quantity) || 0,
        price: Number(item?.price) || 0,
        batch: item?.batch || "",
        expiryDate: item?.expiryDate || "",
        isExisting: item?.isExisting || false,
      })) || []

      // Separate existing and new medicines
      const existingItems = allItems.filter(item => item.isExisting)
      const newItems = allItems.filter(item => !item.isExisting)

      // Limit new medicines to max 10
      const allowedNewItems = newItems.slice(0, 10)
      const excludedNewItems = newItems.slice(10)

      // Combine: all existing + max 10 new
      const items = [...existingItems, ...allowedNewItems]

      appendLog(`[Review] Existing: ${existingItems.length}, New: ${allowedNewItems.length}, Excluded: ${excludedNewItems.length}`)
      setExcludedItems(excludedNewItems)

      // If backend committed (no items but has summary), show success immediately
      // Otherwise, show review table
      if (!items.length && summary) {
        appendLog(`[Sync] Import committed by backend. Total: ${summary.total}, Updated: ${summary.updated}, New: ${summary.new}`)
        // Auto-committed by backend—show success card
        setResult(summary)
        setSuccess(true)
        setIsReviewing(false)
        setLastImportId(data.importId || null)
      } else if (items.length > 0) {
        appendLog(`[Review] Items ready for review before saving.`)
        // Items returned—show review table before final commit
        setExtractedItems(items)
        setResult(summary)
        setIsReviewing(true)
      } else {
        // No items and no summary—error or empty result
        throw new Error("No data returned from processing")
      }
      setCurrentStage(stages.length)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed. Please try again.")
      appendLog(`[Error] ${err instanceof Error ? err.message : "Import failed. Please try again."}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const updateItem = (index: number, field: keyof ExtractedItem, value: string | number) => {
    setExtractedItems((prev) => {
      const copy = [...prev]
      const item = { ...copy[index] }
      if (field === "quantity" || field === "price") {
        (item[field] as number) = Number(value) || 0
      } else {
        (item[field] as string) = String(value)
      }
      copy[index] = item
      return copy
    })
  }

  const handleSaveToInventory = async () => {
    if (!extractedItems.length || !file) return
    setIsProcessing(true)
    setError(null)
    appendLog(`[Commit] Committing ${extractedItems.length} items to inventory...`)

    try {
      const userEmail = localStorage.getItem("user_email") || ""
      if (!userEmail) throw new Error("User email not found. Please log in again.")

      const response = await fetch("/api/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail,
          items: extractedItems,
          sourceFileName: file.name,
        }),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || "Failed to save to inventory")
      }

      const data = await response.json()
      setResult(data.summary || result)
      setSuccess(true)
      setIsReviewing(false)
      setLastImportId(data.importId || null)
      appendLog(`[Commit] ✓ Saved. ImportId: ${data.importId || "unknown"}`)

      // Invalidate cache after successful import
      if (userPassword) {
        appendLog(`[Cache] Refreshing search index for medicines...`)
        invalidateCacheWithFeedback(userEmail, userPassword, (msg, type) => {
          if (type === "success") {
            appendLog(`[Cache] ✓ Search index refreshed`)
          } else if (type === "error") {
            appendLog(`[Cache] ⚠ Index refresh warning: ${msg}`)
          }
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save to inventory")
      appendLog(`[Error] Could not save to inventory`)
    } finally {
      setIsProcessing(false)
    }
  }

  const undoLastImport = async () => {
    if (!lastImportId) return
    setIsProcessing(true)
    setError(null)
    try {
      const response = await fetch("/api/import/rollback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ importId: lastImportId }),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || "Rollback failed")
      }

      setSuccess(true)
      setResult(null)
      setExtractedItems([])
      setIsReviewing(false)
      setLastImportId(null)
      appendLog(`[Rollback] ✓ Last import undone`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not undo last import")
      appendLog(`[Error] Could not undo last import`)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-balance mb-2">Import Medicine</h1>
        <p className="text-muted-foreground text-pretty">
          Upload supplier bill photos to quickly add stock (max 10 items per bill)
        </p>


      </div>
      {error && (
        <Alert
          variant="destructive"
          className="fixed top-5 right-5 z-50 w-[90%] max-w-md flex items-center gap-2 shadow-lg"
        >
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && !isReviewing && result && (
        <div className="fixed top-5 right-5 z-50 w-[90%] max-w-md flex items-center justify-between gap-3 p-4 rounded-lg bg-green-50 border border-green-200 text-green-800 shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            <span className="text-sm font-medium">
              Import saved to inventory.
            </span>
          </div>

          {lastImportId && (
            <Button
              size="sm"
              variant="outline"
              onClick={undoLastImport}
              disabled={isProcessing}
              className="whitespace-nowrap"
            >
              <RotateCw className="h-4 w-4 mr-1" />
              Undo
            </Button>
          )}
        </div>
      )}

      <Card className="p-6 md:p-8 text-center">
        <div className="max-w-2xl mx-auto space-y-6">
          {success && result ? (
            <>
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
              <h3 className="text-2xl font-semibold">Import Successful!</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 max-w-lg mx-auto">
                <Card className="p-4">
                  <div className="text-2xl font-bold text-blue-600">{result.total}</div>
                  <div className="text-sm text-muted-foreground">Total Processed</div>
                </Card>
                <Card className="p-4">
                  <div className="text-2xl font-bold text-orange-600">{result.updated}</div>
                  <div className="text-sm text-muted-foreground">Updated</div>
                </Card>
                <Card className="p-4">
                  <div className="text-2xl font-bold text-green-600">{result.new}</div>
                  <div className="text-sm text-muted-foreground">New Added</div>
                </Card>
              </div>
              <Button
                onClick={() => {
                  setFile(null)
                  setSuccess(false)
                  setResult(null)
                  setCurrentStage(0)
                }}
              >
                Upload Another Bill
              </Button>
            </>
          ) : (
            <>
              <div className="p-4 md:p-6 rounded-2xl bg-primary/5 border-2 border-dashed border-primary/20">
                <Upload className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Drop Bill Image Here</h3>
                <p className="text-sm text-muted-foreground mb-4">Supports JPG, PNG, PDF, Excel, CSV</p>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex gap-3 justify-center">
                      <Button
                        onClick={() => document.getElementById("file-upload")?.click()}
                        disabled={isProcessing || hasGroqKeyImport === false}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        {hasGroqKeyImport === false ? "Service Disabled" : "Choose File"}
                      </Button>
                      <Button variant="outline" disabled={isProcessing || hasGroqKeyImport === false}>
                        <Camera className="mr-2 h-4 w-4" />
                        Take Photo
                      </Button>
                    </div>
                  </TooltipTrigger>
                  {hasGroqKeyImport === false && (
                    <TooltipContent side="top" align="center" className="max-w-sm text-left">
                      <p className="font-medium">⚠️ AI Service Disabled</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        This AI assistance service has been disabled by your administrator. Please contact support to enable this feature for your account.
                      </p>
                    </TooltipContent>
                  )}
                </Tooltip>
                <input
                  id="file-upload"
                  type="file"
                  accept="image/*,.pdf,.xlsx,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const uploadedFile = e.target.files?.[0]
                    if (uploadedFile) handleFileSelect(uploadedFile)
                  }}
                />

                {file && !success && (
                  <div className="mt-4 p-3 rounded-lg shadow-sm border-2 border-dashed border-primary/20">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm px-4">{file.name}</p>
                        <p className="text-xs">{(file.size / 1024).toFixed(1)} KB • {file.type || "Unknown"}</p>
                      </div>
                      <Badge variant="secondary">Ready to preview</Badge>
                    </div>
                    {previewUrl && file.type.startsWith("image") && (
                      <div className="relative w-full h-48 overflow-hidden rounded-md border mb-3">
                        <img src={previewUrl} alt="Bill preview" className="object-contain w-full h-full bg-muted" />
                      </div>
                    )}
                    {!file.type.startsWith("image") && (
                      <div className="mt-2">
                        {gridPreview ? (
                          <div className="text-left">
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-xs text-muted-foreground">
                                {gridPreviewMeta?.sheet ? `Sheet: ${gridPreviewMeta.sheet}` : "Preview"} •
                                {gridPreviewMeta?.rows ? ` Rows: ${gridPreviewMeta.rows}` : " Rows: ?"} •
                                {gridPreviewMeta?.cols ? ` Cols: ${gridPreviewMeta.cols}` : " Cols: ?"}
                              </div>
                              <Badge variant="outline">Top 10 rows</Badge>
                            </div>
                            <div className="overflow-x-auto border rounded-md">
                              <table className="min-w-full text-xs">
                                <tbody>
                                  {gridPreview.map((row, rIdx) => (
                                    <tr key={rIdx} className="border-t">
                                      {row.map((cell, cIdx) => {
                                        const header = gridPreview[0]?.[cIdx]?.toString().toLowerCase() || ""
                                        const isDateColumn = header.includes("expiry") || header.includes("exp") || (header.includes("date") && rIdx > 0)
                                        const displayValue = isDateColumn ? convertExcelDate(cell) : cell
                                        return (
                                          <td key={cIdx} className="px-2 py-1 whitespace-nowrap">
                                            {displayValue}
                                          </td>
                                        )
                                      })}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Eye className="h-4 w-4" /> Generating preview...
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex justify-end gap-2 mt-3">
                      <Button className="hover:text-destructive" variant="outline" onClick={() => { setFile(null); setPreviewUrl(null); setExtractedItems([]); }} size="sm">
                        Clear
                      </Button>
                      <Button onClick={startProcessing} disabled={isProcessing} size="sm">
                        {isProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                        Process & Extract
                      </Button>
                    </div>
                  </div>
                )}

              </div>
              <div className="flex items-center justify-center space-x-4">
                <Link href="/dashboard/manual-import">
                  <Button variant="outline" className="border-2 hover:text-primary ">
                    Add medicines manually
                  </Button>
                </Link>
              </div>
              {isProcessing && (
                <div className="space-y-4 mt-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Processing Pipeline</span>
                      <span className="font-medium">
                        {currentStage}/{stages.length}
                      </span>
                    </div>
                    <Progress value={(currentStage / stages.length) * 100} className="h-2" />
                  </div>

                  <div className="space-y-2 text-left">
                    {stages.map((stage, index) => (
                      <div key={stage.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          {index < currentStage ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : index === currentStage ? (
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          ) : (
                            <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/20" />
                          )}
                          <span className={index <= currentStage ? "font-medium" : "text-muted-foreground"}>
                            {stage.name}
                          </span>
                        </div>
                        {index < currentStage && <Badge variant="default">Complete</Badge>}
                        {index === currentStage && <Badge variant="secondary">Processing...</Badge>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Live Logs Panel */}
              {/* {logs.length > 0 && (
                <Card className="mt-6 p-4 text-left">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">Import Logs</h4>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(logs.join("\n"))}>Copy</Button>
                      <Button variant="ghost" size="sm" onClick={() => setLogs([])}>Clear</Button>
                    </div>
                  </div>
                  <div ref={logsRef} className="max-h-56 overflow-auto bg-muted/30 border rounded p-2 text-xs leading-5">
                    {logs.map((line, idx) => (
                      <div key={idx} className="font-mono whitespace-pre-wrap">{line}</div>
                    ))}
                  </div>
                </Card>
              )} */}

              {isReviewing && extractedItems.length > 0 && (
                <div className="mt-6 space-y-3 text-left">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">Review & edit before saving</h4>
                    <div className="flex gap-2">
                      <Badge variant="outline">Existing: {extractedItems.filter(i => i.isExisting).length}</Badge>
                      <Badge variant="default">New: {extractedItems.filter(i => !i.isExisting).length}</Badge>
                      {excludedItems.length > 0 && <Badge variant="destructive">Excluded: {excludedItems.length}</Badge>}
                    </div>
                  </div>
                  {excludedItems.length > 0 && (
                    <Alert className="bg-orange-50 border-orange-200">
                      <AlertCircle className="h-4 w-4 text-orange-600" />
                      <AlertDescription className="text-orange-800">
                        <strong>Limit reached:</strong> Only 10 new medicines can be added per import. {excludedItems.length} new medicine(s) excluded. Existing medicines have no limit.
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="min-w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-3 py-2 text-left">Status</th>
                          <th className="px-3 py-2 text-left">Name</th>
                          <th className="px-3 py-2 text-left">Batch</th>
                          <th className="px-3 py-2 text-left">Expiry Date</th>
                          <th className="px-3 py-2 text-right">Qty</th>
                          <th className="px-3 py-2 text-right">Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {extractedItems.map((item, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="px-3 py-2">
                              <Badge variant={item.isExisting ? "outline" : "default"} className="text-xs">
                                {item.isExisting ? "Update" : "New"}
                              </Badge>
                            </td>
                            <td className="px-3 py-2">
                              <input
                                className="w-full rounded border px-2 py-1 text-sm"
                                value={item.name}
                                onChange={(e) => updateItem(idx, "name", e.target.value)}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                className="w-full rounded border px-2 py-1 text-sm"
                                value={item.batch || ""}
                                onChange={(e) => updateItem(idx, "batch", e.target.value)}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                className="w-full rounded border px-2 py-1 text-sm"
                                type="text"
                                placeholder="DD-MM-YYYY"
                                value={item.expiryDate || ""}
                                onChange={(e) => updateItem(idx, "expiryDate", e.target.value)}
                              />
                            </td>
                            <td className="px-3 py-2 text-right">
                              <input
                                className="w-24 text-right rounded border px-2 py-1 text-sm"
                                type="number"
                                min={0}
                                value={item.quantity}
                                onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                              />
                            </td>
                            <td className="px-3 py-2 text-right">
                              <input
                                className="w-24 text-right rounded border px-2 py-1 text-sm"
                                type="number"
                                min={0}
                                step="0.01"
                                value={item.price}
                                onChange={(e) => updateItem(idx, "price", e.target.value)}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button className="hover:text-destructive" variant="outline" size="sm" onClick={() => { setExtractedItems([]); setIsReviewing(false); }}>
                      Cancel review
                    </Button>
                    <Link href="/dashboard/products">
                      <Button variant="outline" size="sm">
                        <List className="h-4 w-4 mr-2" />
                        View All Products
                      </Button>
                    </Link>
                    <Button size="sm" onClick={handleSaveToInventory} disabled={isProcessing}>
                      {isProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                      Save to inventory
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Card>

      <Card className="p-6 bg-muted/50">
        <h3 className="font-semibold mb-3">How it works:</h3>
        <ol className="space-y-2 text-sm text-muted-foreground">
          <li>1. Upload or capture a photo of your supplier's bill</li>
          <li>2. OCR automatically extracts medicine details</li>
          <li>3. System updates quantities for existing medicines</li>
          <li>4. New medicines are added to your inventory</li>
          <li>5. Review and confirm the extracted data</li>
        </ol>
      </Card>
    </div>
  )
}
