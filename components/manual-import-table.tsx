"use client"

import { useState, useRef, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { normalizeExpiryDate } from "@/lib/date-parser"

// (No transform here) Client will normalize fields like Expiry using shared utils
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Upload, Plus, Trash2, Copy, GripVertical, RotateCcw,
  RotateCw, Clipboard, Download, Eye, MoreVertical, ChevronDown, ChevronUp, Columns
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

interface Row {
  id: string
  Batch_ID: string
  name: string
  price: string
  qty: string
  manufacture?: string
  expiryDate?: string
  category?: string
  form?: string
  qtyPerPack?: string
  coverDisease?: string
  symptoms?: string
  sideEffects?: string
  instructions?: string
  hinglish?: string
  customFields?: Record<string, string>
}

interface CustomColumn {
  id: string
  name: string
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
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
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
  const [isMobile, setIsMobile] = useState(false)
  const [customColumns, setCustomColumns] = useState<CustomColumn[]>([])
  const [showAddColumnDialog, setShowAddColumnDialog] = useState(false)
  const [newColumnName, setNewColumnName] = useState("")
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      const email = localStorage.getItem("user_email")
      if (!email) return

      try {
        const res = await fetch(`/api/medicines/categories?email=${encodeURIComponent(email)}`)
        if (res.ok) {
          const data = await res.json()
          setCategories(data.categories || [])
        }
      } catch (e) {
        console.error("Failed to load categories:", e)
      }

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

  const saveCustomCategories = (newCategories: string[]) => {
    const email = localStorage.getItem("user_email")
    if (!email) return
    localStorage.setItem(`custom_categories_${email}`, JSON.stringify(newCategories))
    setCustomCategories(newCategories)
  }

  const addCustomCategory = (rowIndex: number) => {
    const trimmed = customCategoryValue.trim()
    if (!trimmed) return

    if (!categories.includes(trimmed) && !customCategories.includes(trimmed)) {
      const newCustom = [...customCategories, trimmed]
      saveCustomCategories(newCustom)
    }

    update(rowIndex, "category", trimmed)
    setShowCustomInput(null)
    setCustomCategoryValue("")
  }

  const addCustomColumn = () => {
    const trimmed = newColumnName.trim()
    if (!trimmed) return

    const newColumn: CustomColumn = {
      id: crypto.randomUUID(),
      name: trimmed
    }
    setCustomColumns([...customColumns, newColumn])

    // Initialize the new field in all existing rows
    const updatedRows = rows.map(row => ({
      ...row,
      customFields: { ...row.customFields, [newColumn.id]: "" }
    }))
    setRows(updatedRows)
    saveToHistory(updatedRows)

    setNewColumnName("")
    setShowAddColumnDialog(false)
    setSuccess(`Column "${trimmed}" added successfully!`)
    setTimeout(() => setSuccess(null), 3000)
  }

  const removeCustomColumn = (columnId: string) => {
    setCustomColumns(customColumns.filter(col => col.id !== columnId))

    // Remove the field from all rows
    const updatedRows = rows.map(row => {
      const newCustomFields = { ...row.customFields }
      delete newCustomFields[columnId]
      return { ...row, customFields: newCustomFields }
    })
    setRows(updatedRows)
    saveToHistory(updatedRows)
  }

  const updateCustomField = (rowIndex: number, columnId: string, value: string) => {
    const updatedRows = [...rows]
    if (!updatedRows[rowIndex].customFields) {
      updatedRows[rowIndex].customFields = {}
    }
    updatedRows[rowIndex].customFields![columnId] = value
    setRows(updatedRows)
  }

  const toggleRowExpansion = (rowId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(rowId)) {
      newExpanded.delete(rowId)
    } else {
      newExpanded.add(rowId)
    }
    setExpandedRows(newExpanded)
  }

  const categoryValuesInRows = rows
    .map((r) => r.category)
    .filter((c): c is string => Boolean(c && c.trim()))

  const allCategories = [...new Set([...categories, ...customCategories, ...categoryValuesInRows])].sort()

  const saveToHistory = (newRows: Row[]) => {
    const newHistory = history.slice(0, historyIndex + 1)
    // Cap history length to avoid heavy memory usage with large datasets
    const snapshot = JSON.parse(JSON.stringify(newRows))
    newHistory.push(snapshot)
    const MAX_HISTORY = 10
    const trimmed = newHistory.length > MAX_HISTORY ? newHistory.slice(newHistory.length - MAX_HISTORY) : newHistory
    setHistory(trimmed)
    setHistoryIndex(trimmed.length - 1)
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

  type EditableKey =
    | "Batch_ID"
    | "name"
    | "price"
    | "qty"
    | "manufacture"
    | "expiryDate"
    | "category"
    | "form"
    | "qtyPerPack"
    | "coverDisease"
    | "symptoms"
    | "sideEffects"
    | "instructions"
    | "hinglish"

  const update = (i: number, key: EditableKey, value: string) => {
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
      ["Batch_ID", "Name", "Price", "Quantity", "Manufacture", "Expiry Date", "Category", "Form", "Qty/Pack", "Disease", "Symptoms", "Side Effects", "Instructions", "Hinglish"],
      ...rows.map(r => [
        r.Batch_ID, r.name, r.price, r.qty, r.manufacture || "", r.expiryDate || "", r.category || "", r.form || "",
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

      const requiredColumns = ["Batch_ID", "Name of Medicine", "Price_INR", "Total_Quantity"]

      if (!data.records || data.records.length === 0) {
        throw new Error("No data found in the uploaded file")
      }

      const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "")
      const firstRecord = data.records[0]
      const firstRecordKeys = Object.keys(firstRecord).map(normalize)

      const missingColumns = requiredColumns.filter(col => {
        const target = normalize(col)
        return !firstRecordKeys.includes(target)
      })

      if (missingColumns.length > 0) {
        throw new Error(
          `Missing required columns: ${missingColumns.join(", ")}.\n\n` +
          `Required: Batch_ID, Name of Medicine, Price (INR), Total Quantity\n` +
          `Other columns are optional.`
        )
      }

      const getFieldValue = (record: any, fieldNames: string[]) => {
        const recordKeys = Object.keys(record)
        for (const fieldName of fieldNames) {
          const matchedKey = recordKeys.find(key =>
            key === fieldName ||
            key.toLowerCase() === fieldName.toLowerCase() ||
            key.replace(/[_\s]/g, "") === fieldName.replace(/[_\s]/g, "")
          )
          if (matchedKey !== undefined && record[matchedKey] !== null && record[matchedKey] !== "") {
            const val = record[matchedKey]
            return typeof val === "string" ? val.trim() : val
          }
        }
        return null
      }

      /**
       * Locate the raw expiry date value in the record using multiple column name variations
       * This extracts the VALUE before normalization (which happens in the mapping below)
       */
      const getExpiryRawValue = (record: any): any => {
        // 1. Strict matches – now includes your exact column name with priority
        const strict = getFieldValue(record, [
          "Expiry_date",           // YOUR EXACT COLUMN NAME – PRIORITY MATCH
          "Expiry_Date",
          "expiry_date",
          "EXPIRY_DATE",
          "Expiry Date",
          "ExpiryDate",
          "expirydate",
          "Exp Date", 
          "Exp_Date",
          "exp_date",
          "Expiry",
          "expiry",
          "Exp.",
          "Exp"
        ])

        if (strict !== null && strict !== undefined && strict !== "") {
          return strict
        }

        // 2. Aggressive fallback: any column containing "exp" or "expiry" (case-insensitive)
        const keys = Object.keys(record)
        const fallbackKey = keys.find(k => {
          const lower = k.toLowerCase()
          return lower.includes("exp") || lower.includes("expiry")
        })

        if (fallbackKey) {
          return record[fallbackKey]
        }

        // 3. Last resort: scan all values for date patterns like 01-11-25
        for (const key of keys) {
          const val = record[key]
          if (typeof val === "string") {
            const trimmed = val.trim()
            if (
              /^\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}$/.test(trimmed) ||  // 01-11-25 or 01/11/2025
              /^\d{4}[-\/]\d{1,2}[-\/]\d{1,2}$/.test(trimmed) ||     // 2025-11-01
              /^\d{6,8}$/.test(trimmed.replace(/[-\/]/g, ""))       // 011125 or 01112025
            ) {
              return trimmed
            }
          }
        }
        return null
      }

      const parsed = (data.records || []).map((r: any) => {
        // Extract raw expiry value and normalize it
        const rawExpiryValue = getExpiryRawValue(r)
        const expiryParseResult = normalizeExpiryDate(rawExpiryValue)

        // Log expiry date processing for debugging (check browser console)
        if (process.env.NODE_ENV === "development" || rawExpiryValue !== null) {
          console.log(
            `Expiry date processing: [RAW: "${rawExpiryValue}"] → [PARSED: "${expiryParseResult.normalized}"] | ${expiryParseResult.debugLog}`
          )
        }

        return {
          id: crypto.randomUUID(),
          Batch_ID: getFieldValue(r, ["Batch_ID", "BatchID", "batch_id", "Batch No", "Batch_No", "Batch Number", "batch_number"]) || "",
          name: getFieldValue(r, ["Name of Medicine", "Medicine Name", "Name", "medicine_name", "Drug Name", "drug_name", "Product Name", "product_name"]) || "",
          price: String(getFieldValue(r, ["Price (INR)", "Price_INR", "Price", "price_inr", "MRP", "mrp", "Cost", "cost", "Unit Price", "unit_price"]) ?? ""),
          qty: String(getFieldValue(r, ["Total Quantity", "Total_Quantity", "Quantity", "quantity", "Stock", "stock", "Available Quantity", "available_qty", "Balance"]) ?? ""),
          manufacture: getFieldValue(r, ["Manufacture", "manufacture", "Manufacturer", "manufacturer", "Mfg", "mfg", "Made By", "made_by"]) || "",
          // Use normalized date if available, otherwise use raw string (not null or "-")
          expiryDate: expiryParseResult.normalized || expiryParseResult.raw || "",
          category: getFieldValue(r, ["Category", "category", "Medicine Category", "medicine_category", "Drug Category", "drug_category", "Type"]) || "",
          form: getFieldValue(r, ["Medicine Forms", "Medicine_Forms", "Form", "form", "Dosage Form", "dosage_form", "Drug Form", "drug_form"]) || "",
          qtyPerPack: getFieldValue(r, ["Quantity_per_pack", "Quantity per pack", "Qty/Pack", "qty_per_pack", "Pack Size", "pack_size", "Packing", "pack"]) || "",
          coverDisease: getFieldValue(r, ["Cover Disease", "Cover_Disease", "Disease", "disease", "Used For", "used_for", "Indication", "indications", "Treats"]) || "",
          symptoms: getFieldValue(r, ["Symptoms", "symptoms", "Symptom Covered", "symptom", "Signs"]) || "",
          sideEffects: getFieldValue(r, ["Side Effects", "Side_Effects", "SideEffects", "side_effects", "Adverse Effects", "adverse_effects", "Reactions"]) || "",
          instructions: getFieldValue(r, ["Instructions", "instructions", "Dosage", "dosage", "How to Use", "how_to_use", "Usage Instructions", "usage"]) || "",
          hinglish: getFieldValue(r, ["Description in Hinglish", "Description_in_Hinglish", "Hinglish", "hinglish", "Hindi Description", "Hindi+English", "Local Language Description"]) || "",
        }
      })

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
      Manufacture: r.manufacture,
      Expiry_date: r.expiryDate,
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

  const renderDesktopTable = () => (
    <div className="overflow-x-auto max-h-[350px] border-2 border-muted rounded-lg overflow-y-auto w-full max-w-[calc(100vw-150px)] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-primary/50 [&::-webkit-scrollbar-thumb]:rounded-full">
      <table className="w-full text-xs md:text-sm border-collapse">
        <thead className="sticky top-0 bg-muted z-10">
          <tr className="text-center">
            <th className="h-9 px-2 text-xs font-medium text-muted-foreground border-b w-10"></th>
            <th className="h-9 px-2 text-xs font-medium text-muted-foreground border-b whitespace-nowrap min-w-[120px]">Batch_ID</th>
            <th className="h-9 px-2 text-xs font-medium text-muted-foreground border-b whitespace-nowrap min-w-[180px]">Name of Medicine</th>
            <th className="h-9 px-2 text-xs font-medium text-muted-foreground border-b whitespace-nowrap min-w-[100px]">Price (INR)</th>
            <th className="h-9 px-2 text-xs font-medium text-muted-foreground border-b whitespace-nowrap min-w-[100px]">Total Quantity</th>
            <th className="h-9 px-2 text-xs font-medium text-muted-foreground border-b whitespace-nowrap min-w-[140px]">Manufacture</th>
            <th className="h-9 px-2 text-xs font-medium text-muted-foreground border-b whitespace-nowrap min-w-[120px]">Expiry Date</th>
            <th className="h-9 px-2 text-xs font-medium text-muted-foreground border-b whitespace-nowrap min-w-[150px]">Category</th>
            <th className="h-9 px-2 text-xs font-medium text-muted-foreground border-b whitespace-nowrap min-w-[120px]">Medicine Forms</th>
            <th className="h-9 px-2 text-xs font-medium text-muted-foreground border-b whitespace-nowrap min-w-[100px]">Qty/Pack</th>
            <th className="h-9 px-2 text-xs font-medium text-muted-foreground border-b whitespace-nowrap min-w-[200px]">Cover Disease</th>
            <th className="h-9 px-2 text-xs font-medium text-muted-foreground border-b whitespace-nowrap min-w-[200px]">Symptoms</th>
            <th className="h-9 px-2 text-xs font-medium text-muted-foreground border-b whitespace-nowrap min-w-[200px]">Side Effects</th>
            <th className="h-9 px-2 text-xs font-medium text-muted-foreground border-b whitespace-nowrap min-w-[200px]">Instructions</th>
            <th className="h-9 px-2 text-xs font-medium text-muted-foreground border-b whitespace-nowrap min-w-[200px]">Description (Hinglish)</th>
            {customColumns.map(col => (
              <th key={col.id} className="h-9 px-2 text-xs font-medium text-muted-foreground border-b whitespace-nowrap min-w-[150px]">
                <div className="flex items-center justify-between gap-2">
                  <span>{col.name}</span>
                  <Button
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => removeCustomColumn(col.id)}
                    title="Remove column"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </th>
            ))}
            <th className="h-9 px-2 text-xs font-medium text-muted-foreground border-b w-[60px]">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((r, idx) => {
            const i = (currentPage - 1) * pageSize + idx
            return (
              <tr
                key={r.id}
                className="border-b hover:bg-muted/50 transition-colors"
                draggable={!isMobile}
                onDragStart={() => handleDragStart(i)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDragEnd={handleDragEnd}
                style={{ opacity: draggedRow === i ? 0.5 : 1 }}
              >
                <td className="p-2">
                  {!isMobile && <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />}
                </td>
                <td className="p-2">
                  <Input
                    value={r.Batch_ID}
                    onChange={(e) => update(i, "Batch_ID", e.target.value)}
                    onBlur={handleBlur}
                    className="h-7 text-xs"
                  />
                </td>
                <td className="p-2">
                  <Input
                    value={r.name}
                    onChange={(e) => update(i, "name", e.target.value)}
                    onBlur={handleBlur}
                    className="h-7 text-xs"
                  />
                </td>
                <td className="p-2">
                  <Input
                    type="number"
                    value={r.price}
                    onChange={(e) => update(i, "price", e.target.value)}
                    onBlur={handleBlur}
                    className="h-7 text-xs"
                  />
                </td>
                <td className="p-2">
                  <Input
                    type="number"
                    value={r.qty}
                    onChange={(e) => update(i, "qty", e.target.value)}
                    onBlur={handleBlur}
                    className="h-7 text-xs"
                  />
                </td>
                <td className="p-2">
                  <Input
                    type="text"
                    value={r.manufacture || ""}
                    onChange={(e) => update(i, "manufacture", e.target.value)}
                    onBlur={handleBlur}
                    className="h-7 text-xs"
                  />
                </td>
                <td className="p-2">
                  <Input
                    type="text"
                    value={r.expiryDate || ""}
                    onChange={(e) => update(i, "expiryDate", e.target.value)}
                    onBlur={handleBlur}
                    className="h-7 text-xs"
                  />
                </td>
                <td className="p-2">
                  {showCustomInput === i ? (
                    <div className="flex gap-1">
                      <Input
                        value={customCategoryValue}
                        onChange={(e) => setCustomCategoryValue(e.target.value)}
                        placeholder="New category"
                        className="h-7 text-xs"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") addCustomCategory(i)
                          if (e.key === "Escape") {
                            setShowCustomInput(null)
                            setCustomCategoryValue("")
                          }
                        }}
                        autoFocus
                      />
                      <Button size="sm" className="h-7 text-xs" onClick={() => addCustomCategory(i)}>
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
                      <SelectTrigger className="h-7 text-xs">
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
                    className="h-7 text-xs"
                  />
                </td>
                <td className="p-2">
                  <Input
                    value={r.qtyPerPack || ""}
                    onChange={(e) => update(i, "qtyPerPack", e.target.value)}
                    onBlur={handleBlur}
                    className="h-7 text-xs"
                  />
                </td>
                <td className="p-2">
                  <Textarea
                    value={r.coverDisease || ""}
                    onChange={(e) => update(i, "coverDisease", e.target.value)}
                    onBlur={handleBlur}
                    className="min-h-[36px] h-9 text-xs resize-none py-1"
                    rows={1}
                  />
                </td>
                <td className="p-2">
                  <Textarea
                    value={r.symptoms || ""}
                    onChange={(e) => update(i, "symptoms", e.target.value)}
                    onBlur={handleBlur}
                    className="min-h-[36px] h-9 text-xs resize-none py-1"
                    rows={1}
                  />
                </td>
                <td className="p-2">
                  <Textarea
                    value={r.sideEffects || ""}
                    onChange={(e) => update(i, "sideEffects", e.target.value)}
                    onBlur={handleBlur}
                    className="min-h-[36px] h-9 text-xs resize-none py-1"
                    rows={1}
                  />
                </td>
                <td className="p-2">
                  <Textarea
                    value={r.instructions || ""}
                    onChange={(e) => update(i, "instructions", e.target.value)}
                    onBlur={handleBlur}
                    className="min-h-[36px] h-9 text-xs resize-none py-1"
                    rows={1}
                  />
                </td>
                <td className="p-2">
                  <Textarea
                    value={r.hinglish || ""}
                    onChange={(e) => update(i, "hinglish", e.target.value)}
                    onBlur={handleBlur}
                    className="min-h-[36px] h-9 text-xs resize-none py-1"
                    rows={1}
                  />
                </td>
                {customColumns.map(col => (
                  <td key={col.id} className="p-2">
                    <Input
                      value={r.customFields?.[col.id] || ""}
                      onChange={(e) => updateCustomField(i, col.id, e.target.value)}
                      onBlur={handleBlur}
                      className="min-w-[150px] h-7 text-xs"
                    />
                  </td>
                ))}
                <td className="p-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-6 w-6 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setShowAddColumnDialog(true)}>
                        <Columns className="h-4 w-4 mr-2" />
                        Add Column
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => duplicateRow(i)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Row
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => removeRow(i)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Row
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )

  const renderMobileView = () => (
    <div className="space-y-4 p-4">
      {rows.map((r, i) => {
        const isExpanded = expandedRows.has(r.id)
        return (
          <Card key={r.id} className="p-4">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1 pr-2">
                <div className="font-medium">{r.Batch_ID || "Batch ID"}</div>
                <div className="text-sm mt-1">{r.name || "Item Name"}</div>
              </div>
              <div className="flex gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleRowExpansion(r.id)}
                  title={isExpanded ? "Collapse" : "Expand details"}
                >
                  {isExpanded ? <ChevronUp className="h-4 w-4 rounded-full border-2 border-primary" /> : <ChevronDown className="h-4 w-4 rounded-full border-2 text-primary" />}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setShowAddColumnDialog(true)}>
                      <Columns className="h-4 w-4 mr-2" />
                      Add Column
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => duplicateRow(i)}>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => removeRow(i)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <Label className="text-xs">Batch ID</Label>
                <Input
                  value={r.Batch_ID}
                  onChange={(e) => update(i, "Batch_ID", e.target.value)}
                  onBlur={handleBlur}
                  className="mt-1 h-9"
                />
              </div>
              <div>
                <Label className="text-xs">Name of Medicine</Label>
                <Input
                  value={r.name}
                  onChange={(e) => update(i, "name", e.target.value)}
                  onBlur={handleBlur}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Price (₹)</Label>
                <Input
                  type="number"
                  value={r.price}
                  onChange={(e) => update(i, "price", e.target.value)}
                  onBlur={handleBlur}
                  className="mt-1 h-9"
                />
              </div>
              <div>
                <Label className="text-xs">Quantity</Label>
                <Input
                  type="number"
                  value={r.qty}
                  onChange={(e) => update(i, "qty", e.target.value)}
                  onBlur={handleBlur}
                  className="mt-1 h-9"
                />
              </div>
              <div>
                <Label className="text-xs">Manufacture</Label>
                <Input
                  type="text"
                  placeholder="Enter manufacturer"
                  value={r.manufacture || ""}
                  onChange={(e) => update(i, "manufacture", e.target.value)}
                  onBlur={handleBlur}
                  className="mt-1 h-9"
                />
              </div>
              <div>
                <Label className="text-xs">Expiry Date</Label>
                <Input
                  type="text"
                  placeholder="DD-MM-YYYY or any format"
                  value={r.expiryDate || ""}
                  onChange={(e) => update(i, "expiryDate", e.target.value)}
                  onBlur={handleBlur}
                  className="mt-1 h-9"
                />
              </div>
            </div>

            {isExpanded && (
              <div className="space-y-3 pt-3 border-t">
                <div>
                  <Label className="text-xs">Category</Label>
                  {showCustomInput === i ? (
                    <div className="flex gap-1 mt-1">
                      <Input
                        value={customCategoryValue}
                        onChange={(e) => setCustomCategoryValue(e.target.value)}
                        placeholder="New category"
                        className="h-9"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") addCustomCategory(i)
                          if (e.key === "Escape") {
                            setShowCustomInput(null)
                            setCustomCategoryValue("")
                          }
                        }}
                        autoFocus
                      />
                      <Button size="sm" onClick={() => addCustomCategory(i)}>OK</Button>
                      <Button size="sm" variant="ghost" onClick={() => {
                        setShowCustomInput(null)
                        setCustomCategoryValue("")
                      }}>✕</Button>
                    </div>
                  ) : (
                    <Select
                      value={r.category || ""}
                      onValueChange={(value) => {
                        if (value === "__add_new__") {
                          setShowCustomInput(i)
                        } else {
                          update(i, "category", value)
                        }
                      }}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {allCategories.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                        <SelectItem value="__add_new__">+ Add New Category</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div>
                  <Label className="text-xs">Medicine Forms</Label>
                  <Input
                    value={r.form || ""}
                    onChange={(e) => update(i, "form", e.target.value)}
                    onBlur={handleBlur}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Qty/Pack</Label>
                  <Input
                    value={r.qtyPerPack || ""}
                    onChange={(e) => update(i, "qtyPerPack", e.target.value)}
                    onBlur={handleBlur}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Cover Disease</Label>
                  <Textarea
                    value={r.coverDisease || ""}
                    onChange={(e) => update(i, "coverDisease", e.target.value)}
                    onBlur={handleBlur}
                    className="mt-1 min-h-[60px]"
                    rows={2}
                  />
                </div>
                <div>
                  <Label className="text-xs">Symptoms</Label>
                  <Textarea
                    value={r.symptoms || ""}
                    onChange={(e) => update(i, "symptoms", e.target.value)}
                    onBlur={handleBlur}
                    className="mt-1 min-h-[60px]"
                    rows={2}
                  />
                </div>
                <div>
                  <Label className="text-xs">Side Effects</Label>
                  <Textarea
                    value={r.sideEffects || ""}
                    onChange={(e) => update(i, "sideEffects", e.target.value)}
                    onBlur={handleBlur}
                    className="mt-1 min-h-[60px]"
                    rows={2}
                  />
                </div>
                <div>
                  <Label className="text-xs">Instructions</Label>
                  <Textarea
                    value={r.instructions || ""}
                    onChange={(e) => update(i, "instructions", e.target.value)}
                    onBlur={handleBlur}
                    className="mt-1 min-h-[60px]"
                    rows={2}
                  />
                </div>
                <div>
                  <Label className="text-xs">Description (Hinglish)</Label>
                  <Textarea
                    value={r.hinglish || ""}
                    onChange={(e) => update(i, "hinglish", e.target.value)}
                    onBlur={handleBlur}
                    className="mt-1 min-h-[60px]"
                    rows={2}
                  />
                </div>
                {customColumns.map(col => (
                  <div key={col.id}>
                    <Label className="text-xs">{col.name}</Label>
                    <Input
                      value={r.customFields?.[col.id] || ""}
                      onChange={(e) => updateCustomField(i, col.id, e.target.value)}
                      onBlur={handleBlur}
                      className="mt-1"
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )

  return (
    <div className="space-y-4 pb-4">
      {/* Header Controls */}
      <Card className="p-3 sticky top-0 z-10 bg-background border-b">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="hover:text-primary" size="sm" onClick={addRow}>
              <Plus className="h-4 w-4 mr-1" /> Add Row
            </Button>
            <Button
              variant="outline"
              className="hover:text-primary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-1" /> Upload
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && uploadCSV(e.target.files[0])}
            />
            <Button variant="outline" className="hover:text-primary" size="sm" onClick={copyToClipboard}>
              <Clipboard className="h-4 w-4 mr-1" /> Copy All
            </Button>
            <Button variant="outline" className="hover:text-primary" size="sm" onClick={() => setShowAddColumnDialog(true)}>
              <Columns className="h-4 w-4 mr-1" /> Add Column
            </Button>
            <div className="flex items-center gap-2 ml-2">
              <span className="text-xs text-muted-foreground">Rows per page</span>
              <select
                className="h-8 rounded border px-2 text-xs"
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1) }}
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={undo} disabled={historyIndex <= 0}>
              <RotateCcw className="h-4 w-4 mr-1" /> Undo
            </Button>
            <Button variant="ghost" size="sm" onClick={redo} disabled={historyIndex >= history.length - 1}>
              <RotateCw className="h-4 w-4 mr-1" /> Redo
            </Button>
            <Button size="sm" onClick={save}>
              <Download className="h-4 w-4 mr-1" /> Save
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

      {/* Content */}
      <Card className="p-0 border-none shadow-none">
        {isMobile ? renderMobileView() : renderDesktopTable()}
      </Card>

      {!isMobile && (
        <div className="flex items-center justify-between px-2">
          <div className="text-xs text-muted-foreground">
            Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, rows.length)} of {rows.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="h-8 px-2 rounded border text-xs disabled:opacity-50"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Prev
            </button>
            <span className="text-xs">Page {currentPage}</span>
            <button
              className="h-8 px-2 rounded border text-xs disabled:opacity-50"
              onClick={() => setCurrentPage((p) => (p * pageSize < rows.length ? p + 1 : p))}
              disabled={currentPage * pageSize >= rows.length}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-[95vw] w-full max-h-[90vh] p-0 flex flex-col">
          <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle>Import Preview</DialogTitle>
            <DialogDescription>
              Review the imported data. Found {previewData?.length || 0} rows.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full w-full">
              <div className="overflow-x-auto">
                <table className="w-full min-w-max text-sm border-collapse">
                  <thead className="sticky top-0 bg-muted z-10">
                    <tr className="text-left border-b">
                      <th className="p-3 font-medium min-w-[100px]">Batch_ID</th>
                      <th className="p-3 font-medium min-w-[150px]">Name</th>
                      <th className="p-3 font-medium min-w-[100px]">Price</th>
                      <th className="p-3 font-medium min-w-[100px]">Quantity</th>
                      <th className="p-3 font-medium min-w-[140px]">Manufacture</th>
                      <th className="p-3 font-medium min-w-[120px]">Expiry Date</th>
                      <th className="p-3 font-medium min-w-[120px]">Category</th>
                      <th className="p-3 font-medium min-w-[120px]">Form</th>
                      <th className="p-3 font-medium min-w-[100px]">Qty/Pack</th>
                      <th className="p-3 font-medium min-w-[150px]">Cover Disease</th>
                      <th className="p-3 font-medium min-w-[150px]">Symptoms</th>
                      <th className="p-3 font-medium min-w-[150px]">Side Effects</th>
                      <th className="p-3 font-medium min-w-[150px]">Instructions</th>
                      <th className="p-3 font-medium min-w-[150px]">Hinglish</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData?.map((r, i) => (
                      <tr key={i} className="border-b hover:bg-muted/50">
                        <td className="p-3">{r.Batch_ID}</td>
                        <td className="p-3">{r.name}</td>
                        <td className="p-3">{r.price}</td>
                        <td className="p-3">{r.qty}</td>
                        <td className="p-3">{r.manufacture || "-"}</td>
                        <td className="p-3">{r.expiryDate || "-"}</td>
                        <td className="p-3">{r.category || "-"}</td>
                        <td className="p-3">{r.form || "-"}</td>
                        <td className="p-3">{r.qtyPerPack || "-"}</td>
                        <td className="p-3">{r.coverDisease || "-"}</td>
                        <td className="p-3">{r.symptoms || "-"}</td>
                        <td className="p-3">{r.sideEffects || "-"}</td>
                        <td className="p-3">{r.instructions || "-"}</td>
                        <td className="p-3">{r.hinglish || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ScrollBar orientation="horizontal" />
              <ScrollBar orientation="vertical" />
            </ScrollArea>
          </div>

          <div className="flex justify-end gap-3 p-6 border-t">
            <Button variant="outline" className="hover:text-destructive" onClick={() => setShowPreview(false)}>
              Cancel
            </Button>
            <Button onClick={confirmPreview}>
              <Eye className="h-4 w-4 mr-2" /> Confirm & Import
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Column Dialog */}
      <Dialog open={showAddColumnDialog} onOpenChange={setShowAddColumnDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Custom Column</DialogTitle>
            <DialogDescription>
              Create a new column with a custom name. This column will be added to all rows.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="columnName">Column Name</Label>
              <Input
                id="columnName"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                placeholder="e.g., Supplier, Location, Notes"
                className="mt-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newColumnName.trim()) {
                    addCustomColumn()
                  }
                }}
                autoFocus
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" className="hover:text-primary" onClick={() => {
              setShowAddColumnDialog(false)
              setNewColumnName("")
            }}>
              Cancel
            </Button>
            <Button
              onClick={addCustomColumn}
              disabled={!newColumnName.trim()}
            >
              Add Column
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}