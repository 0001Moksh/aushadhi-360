"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, Plus, Trash2 } from "lucide-react"

interface Row {
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

const emptyRow: Row = { Batch_ID: "", name: "", price: "", qty: "" }

export function ManualImportTable() {
  const [rows, setRows] = useState<Row[]>([emptyRow])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const addRow = () => setRows([...rows, { ...emptyRow }])
  const removeRow = (i: number) => setRows(rows.filter((_, idx) => idx !== i))

  const update = (i: number, key: keyof Row, value: string) => {
    const next = [...rows]
    next[i][key] = value
    setRows(next)
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
        Batch_ID: r.Batch_ID || "",
        name: r["Name of Medicine"] || "",
        price: String(r.Price_INR ?? ""),
        qty: String(r.Total_Quantity ?? ""),
      }))
      setRows(parsed.length ? parsed : [emptyRow])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed")
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

    // Basic validation
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
    setRows([emptyRow])
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={addRow}>
            <Plus className="h-4 w-4 mr-2" /> Add Row
          </Button>
          <label className="inline-flex items-center gap-2">
            <Upload className="h-4 w-4" />
            <input
              type="file"
              accept=".csv,.xlsx"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && uploadCSV(e.target.files[0])}
            />
            <span className="text-sm">Upload CSV/Excel</span>
          </label>
        </div>
      </Card>

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

      <Card className="p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="p-2">Batch_ID</th>
                <th className="p-2">Name of Medicine</th>
                <th className="p-2">Price (INR)</th>
                <th className="p-2">Total Quantity</th>
                <th className="p-2">Category</th>
                <th className="p-2">Medicine Forms</th>
                <th className="p-2">Quantity per pack</th>
                <th className="p-2">Cover Disease</th>
                <th className="p-2">Symptoms</th>
                <th className="p-2">Side Effects</th>
                <th className="p-2">Instructions</th>
                <th className="p-2">Description (Hinglish)</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="p-2"><Input value={r.Batch_ID} onChange={(e) => update(i, "Batch_ID", e.target.value)} /></td>
                  <td className="p-2"><Input value={r.name} onChange={(e) => update(i, "name", e.target.value)} /></td>
                  <td className="p-2"><Input value={r.price} onChange={(e) => update(i, "price", e.target.value)} /></td>
                  <td className="p-2"><Input value={r.qty} onChange={(e) => update(i, "qty", e.target.value)} /></td>
                  <td className="p-2"><Input value={r.category || ""} onChange={(e) => update(i, "category", e.target.value)} /></td>
                  <td className="p-2"><Input value={r.form || ""} onChange={(e) => update(i, "form", e.target.value)} /></td>
                  <td className="p-2"><Input value={r.qtyPerPack || ""} onChange={(e) => update(i, "qtyPerPack", e.target.value)} /></td>
                  <td className="p-2"><Input value={r.coverDisease || ""} onChange={(e) => update(i, "coverDisease", e.target.value)} /></td>
                  <td className="p-2"><Input value={r.symptoms || ""} onChange={(e) => update(i, "symptoms", e.target.value)} /></td>
                  <td className="p-2"><Input value={r.sideEffects || ""} onChange={(e) => update(i, "sideEffects", e.target.value)} /></td>
                  <td className="p-2"><Input value={r.instructions || ""} onChange={(e) => update(i, "instructions", e.target.value)} /></td>
                  <td className="p-2"><Input value={r.hinglish || ""} onChange={(e) => update(i, "hinglish", e.target.value)} /></td>
                  <td className="p-2">
                    <Button variant="ghost" size="icon" onClick={() => removeRow(i)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save}>Save to Database</Button>
      </div>
    </div>
  )
}
