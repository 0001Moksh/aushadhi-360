"use client"

import { useState, useRef, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Upload, Plus, Trash2, Copy, GripVertical, RotateCcw,
  RotateCw, Clipboard, Download, Eye
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Row {
  id: string
  Batch_ID: string
  name: string
  price: string
  qty: string
  category?: string
  form?: string
  qtyPerPack?: string
  coverDisease?: string
  symptoms?: string
  sideEffects?: string
  instructions?: string
  hinglish?: string
}

const emptyRow = (): Row => ({
  id: crypto.randomUUID(),
  Batch_ID: "",
  name: "",
  price: "",
  qty: ""
})

export function ManualImportTable() {
  const [rows, setRows] = useState<Row[]>([emptyRow()])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [history, setHistory] = useState<Row[][]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [draggedRow, setDraggedRow] = useState<number | null>(null)
  const [previewData, setPreviewData] = useState<Row[] | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [categories, setCategories] = useState<string[]>([])
  const [customCategories, setCustomCategories] = useState<string[]>([])
  const [showCustomInput, setShowCustomInput] = useState<number | null>(null)
  const [customCategoryValue, setCustomCategoryValue] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load categories from user's medicines and custom categories from localStorage
  useEffect(() => {
    const loadCategories = async () => {
      const email = localStorage.getItem("user_email")
      if (!email) return

      try {
        // Fetch unique categories from user's medicines
        const res = await fetch(`/api/medicines/categories?email=${encodeURIComponent(email)}`)
        if (res.ok) {
          const data = await res.json()
          setCategories(data.categories || [])
        }
      } catch (e) {
        console.error("Failed to load categories:", e)
      }

      // Load custom categories from localStorage
      const stored = localStorage.getItem(`custom_categories_${email}`)
      if (stored) {
        try {
          setCustomCategories(JSON.parse(stored))
        } catch (e) {
          console.error("Failed to parse custom categories:", e)
        }
      }
    }

    loadCategories()
  }, [])

  // Save custom categories to localStorage
  const saveCustomCategories = (newCategories: string[]) => {
    const email = localStorage.getItem("user_email")
    if (!email) return
    localStorage.setItem(`custom_categories_${email}`, JSON.stringify(newCategories))
    setCustomCategories(newCategories)
  }

  const addCustomCategory = (rowIndex: number) => {
    const trimmed = customCategoryValue.trim()
    if (!trimmed) return

    // Add to custom categories if not already exists
    if (!categories.includes(trimmed) && !customCategories.includes(trimmed)) {
      const newCustom = [...customCategories, trimmed]
      saveCustomCategories(newCustom)
    }

    // Update the row
    update(rowIndex, "category", trimmed)
    setShowCustomInput(null)
    setCustomCategoryValue("")
  }

  const allCategories = [...new Set([...categories, ...customCategories])].sort()

  const saveToHistory = (newRows: Row[]) => {
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(JSON.parse(JSON.stringify(newRows)))
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  const addRow = () => {
    const newRows = [...rows, emptyRow()]
    setRows(newRows)
    saveToHistory(newRows)
  }

  const removeRow = (i: number) => {
    const newRows = rows.filter((_, idx) => idx !== i)
    setRows(newRows)
    saveToHistory(newRows)
  }

  const duplicateRow = (i: number) => {
    const newRow = { ...rows[i], id: crypto.randomUUID(), Batch_ID: rows[i].Batch_ID + "_copy" }
    const newRows = [...rows.slice(0, i + 1), newRow, ...rows.slice(i + 1)]
    setRows(newRows)
    saveToHistory(newRows)
  }

  const update = (i: number, key: keyof Row, value: string) => {
    const next = [...rows]
    next[i][key] = value
    setRows(next)
  }

  const handleBlur = () => {
    saveToHistory(rows)
  }

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1)
      setRows(JSON.parse(JSON.stringify(history[historyIndex - 1])))
    }
  }

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1)
      setRows(JSON.parse(JSON.stringify(history[historyIndex + 1])))
    }
  }

  const handleDragStart = (i: number) => {
    setDraggedRow(i)
  }

  const handleDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault()
    if (draggedRow === null || draggedRow === i) return

    const newRows = [...rows]
    const draggedItem = newRows[draggedRow]
    newRows.splice(draggedRow, 1)
    newRows.splice(i, 0, draggedItem)

    setRows(newRows)
    setDraggedRow(i)
  }

  const handleDragEnd = () => {
    setDraggedRow(null)
    saveToHistory(rows)
  }

  const copyToClipboard = () => {
    const csv = [
      ["Batch_ID", "Name", "Price", "Quantity", "Category", "Form", "Qty/Pack", "Disease", "Symptoms", "Side Effects", "Instructions", "Hinglish"],
      ...rows.map(r => [
        r.Batch_ID, r.name, r.price, r.qty, r.category || "", r.form || "",
        r.qtyPerPack || "", r.coverDisease || "", r.symptoms || "",
        r.sideEffects || "", r.instructions || "", r.hinglish || ""
      ])
    ].map(row => row.join("\t")).join("\n")

    navigator.clipboard.writeText(csv)
    setSuccess("Copied to clipboard!")
    setTimeout(() => setSuccess(null), 3000)
  }

  const uploadCSV = async (file: File) => {
    setError(null)
    try {
      const form = new FormData()
      form.append("file", file)
      const res = await fetch("/api/import/parse-excel", { method: "POST", body: form })
      if (!res.ok) throw new Error("Failed to parse file")
      const data = await res.json()
      const parsed = (data.records || []).map((r: any) => ({
        id: crypto.randomUUID(),
        Batch_ID: r.Batch_ID || "",
        name: r["Name of Medicine"] || "",
        price: String(r.Price_INR ?? ""),
        qty: String(r.Total_Quantity ?? ""),
        category: r.Category,
        form: r["Medicine Forms"],
        qtyPerPack: r.Quantity_per_pack,
        coverDisease: r["Cover Disease"],
        symptoms: r.Symptoms,
        sideEffects: r["Side Effects"],
        instructions: r.Instructions,
        hinglish: r["Description in Hinglish"],
      }))
      setPreviewData(parsed.length ? parsed : [emptyRow()])
      setShowPreview(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed")
    }
  }

  const confirmPreview = () => {
    if (previewData) {
      setRows(previewData)
      saveToHistory(previewData)
      setShowPreview(false)
      setPreviewData(null)
    }
  }

  const save = async () => {
    setError(null)
    setSuccess(null)

    const email = localStorage.getItem("user_email") || ""
    if (!email) {
      setError("User email not found. Please log in again.")
      return
    }

    const invalid = rows.find(
      (r) => !r.Batch_ID || !r.name || isNaN(Number(r.price)) || isNaN(Number(r.qty))
    )
    if (invalid) {
      setError("Please fill Batch_ID, Name, numeric Price and Quantity for all rows.")
      return
    }

    const medicines = rows.map((r) => ({
      Batch_ID: r.Batch_ID,
      "Name of Medicine": r.name,
      Price_INR: Number(r.price),
      Total_Quantity: Number(r.qty),
      Category: r.category,
      "Medicine Forms": r.form,
      Quantity_per_pack: r.qtyPerPack,
      "Cover Disease": r.coverDisease,
      Symptoms: r.symptoms,
      "Side Effects": r.sideEffects,
      Instructions: r.instructions,
      "Description in Hinglish": r.hinglish,
    }))

    const res = await fetch("/api/import/manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, medicines }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || "Failed to save")
      return
    }

    const data = await res.json()
    setSuccess(`Saved: ${data.summary.total} (Updated: ${data.summary.updated}, New: ${data.summary.new})`)
    setRows([emptyRow()])
    setHistory([])
    setHistoryIndex(-1)
  }

  return (
    <div className="space-y-4">
      {/* Fixed Header Controls */}
      <Card className="p-4 sticky top-0 z-10 bg-background">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={addRow}>
              <Plus className="h-4 w-4 mr-2" /> Add Row
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-2" /> Upload CSV/Excel
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && uploadCSV(e.target.files[0])}
            />
            <Button variant="outline" size="sm" onClick={copyToClipboard}>
              <Clipboard className="h-4 w-4 mr-2" /> Copy All
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={undo}
              disabled={historyIndex <= 0}
            >
              <RotateCcw className="h-4 w-4 mr-2" /> Undo
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
            >
              <RotateCw className="h-4 w-4 mr-2" /> Redo
            </Button>
            <Button onClick={save}>
              <Download className="h-4 w-4 mr-2" /> Save to Database
            </Button>
          </div>
        </div>
      </Card>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Scrollable Table */}
      <Card className="p-0">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 bg-muted z-10">
              <tr className="text-left">
                <th className="p-2 border-b w-10"></th>
                <th className="p-2 border-b whitespace-nowrap min-w-[120px]">Batch_ID</th>
                <th className="p-2 border-b whitespace-nowrap min-w-[180px]">Name of Medicine</th>
                <th className="p-2 border-b whitespace-nowrap min-w-[100px]">Price (INR)</th>
                <th className="p-2 border-b whitespace-nowrap min-w-[100px]">Total Quantity</th>
                <th className="p-2 border-b whitespace-nowrap min-w-[150px]">Category</th>
                <th className="p-2 border-b whitespace-nowrap min-w-[120px]">Medicine Forms</th>
                <th className="p-2 border-b whitespace-nowrap min-w-[100px]">Qty/Pack</th>
                <th className="p-2 border-b whitespace-nowrap min-w-[200px]">Cover Disease</th>
                <th className="p-2 border-b whitespace-nowrap min-w-[200px]">Symptoms</th>
                <th className="p-2 border-b whitespace-nowrap min-w-[200px]">Side Effects</th>
                <th className="p-2 border-b whitespace-nowrap min-w-[200px]">Instructions</th>
                <th className="p-2 border-b whitespace-nowrap min-w-[200px]">Description (Hinglish)</th>
                <th className="p-2 border-b w-[120px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={r.id}
                  className="border-b hover:bg-muted/50 transition-colors"
                  draggable
                  onDragStart={() => handleDragStart(i)}
                  onDragOver={(e) => handleDragOver(e, i)}
                  onDragEnd={handleDragEnd}
                  style={{ opacity: draggedRow === i ? 0.5 : 1 }}
                >
                  <td className="p-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                  </td>
                  <td className="p-2">
                    <Input
                      value={r.Batch_ID}
                      onChange={(e) => update(i, "Batch_ID", e.target.value)}
                      onBlur={handleBlur}
                      className="min-w-[120px]"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      value={r.name}
                      onChange={(e) => update(i, "name", e.target.value)}
                      onBlur={handleBlur}
                      className="min-w-[180px]"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      value={r.price}
                      onChange={(e) => update(i, "price", e.target.value)}
                      onBlur={handleBlur}
                      className="min-w-[100px]"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      value={r.qty}
                      onChange={(e) => update(i, "qty", e.target.value)}
                      onBlur={handleBlur}
                      className="min-w-[100px]"
                    />
                  </td>
                  <td className="p-2">
                    {showCustomInput === i ? (
                      <div className="flex gap-1">
                        <Input
                          value={customCategoryValue}
                          onChange={(e) => setCustomCategoryValue(e.target.value)}
                          placeholder="New category"
                          className="min-w-[100px]"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              addCustomCategory(i)
                            } else if (e.key === "Escape") {
                              setShowCustomInput(null)
                              setCustomCategoryValue("")
                            }
                          }}
                          autoFocus
                        />
                        <Button
                          size="sm"
                          onClick={() => addCustomCategory(i)}
                        >
                          Add
                        </Button>
                      </div>
                    ) : (
                      <Select
                        value={r.category || ""}
                        onValueChange={(value) => {
                          if (value === "__other__") {
                            setShowCustomInput(i)
                            setCustomCategoryValue("")
                          } else {
                            update(i, "category", value)
                            handleBlur()
                          }
                        }}
                      >
                        <SelectTrigger className="min-w-[150px]">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {allCategories.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                          <SelectItem value="__other__">+ Add New Category</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </td>
                  <td className="p-2">
                    <Input
                      value={r.form || ""}
                      onChange={(e) => update(i, "form", e.target.value)}
                      onBlur={handleBlur}
                      className="min-w-[120px]"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      value={r.qtyPerPack || ""}
                      onChange={(e) => update(i, "qtyPerPack", e.target.value)}
                      onBlur={handleBlur}
                      className="min-w-[100px]"
                    />
                  </td>
                  <td className="p-2">
                    <Textarea
                      value={r.coverDisease || ""}
                      onChange={(e) => update(i, "coverDisease", e.target.value)}
                      onBlur={handleBlur}
                      className="min-w-[200px] min-h-[60px]"
                      rows={2}
                    />
                  </td>
                  <td className="p-2">
                    <Textarea
                      value={r.symptoms || ""}
                      onChange={(e) => update(i, "symptoms", e.target.value)}
                      onBlur={handleBlur}
                      className="min-w-[200px] min-h-[60px]"
                      rows={2}
                    />
                  </td>
                  <td className="p-2">
                    <Textarea
                      value={r.sideEffects || ""}
                      onChange={(e) => update(i, "sideEffects", e.target.value)}
                      onBlur={handleBlur}
                      className="min-w-[200px] min-h-[60px]"
                      rows={2}
                    />
                  </td>
                  <td className="p-2">
                    <Textarea
                      value={r.instructions || ""}
                      onChange={(e) => update(i, "instructions", e.target.value)}
                      onBlur={handleBlur}
                      className="min-w-[200px] min-h-[60px]"
                      rows={2}
                    />
                  </td>
                  <td className="p-2">
                    <Textarea
                      value={r.hinglish || ""}
                      onChange={(e) => update(i, "hinglish", e.target.value)}
                      onBlur={handleBlur}
                      className="min-w-[200px] min-h-[60px]"
                      rows={2}
                    />
                  </td>
                  <td className="p-2">
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Duplicate Row"
                        onClick={() => duplicateRow(i)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Delete Row"
                        onClick={() => removeRow(i)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Preview</DialogTitle>
            <DialogDescription>
              Review the imported data before adding to the table. Found {previewData?.length || 0} rows.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted">
                <tr className="text-left">
                  <th className="p-2">Batch_ID</th>
                  <th className="p-2">Name</th>
                  <th className="p-2">Price</th>
                  <th className="p-2">Quantity</th>
                  <th className="p-2">Category</th>
                </tr>
              </thead>
              <tbody>
                {previewData?.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-2">{r.Batch_ID}</td>
                    <td className="p-2">{r.name}</td>
                    <td className="p-2">{r.price}</td>
                    <td className="p-2">{r.qty}</td>
                    <td className="p-2">{r.category || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Cancel
            </Button>
            <Button onClick={confirmPreview}>
              <Eye className="h-4 w-4 mr-2" /> Confirm & Import
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
