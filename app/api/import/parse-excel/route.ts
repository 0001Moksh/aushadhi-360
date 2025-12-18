import { NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"

interface MedicineRecord {
  Batch_ID: string
  "Name of Medicine": string
  Category?: string
  "Medicine Forms"?: string
  Quantity_per_pack?: string
  "Cover Disease"?: string
  Symptoms?: string
  "Side Effects"?: string
  Instructions?: string
  "Description in Hinglish"?: string
  Price_INR: number
  Total_Quantity: number
}

// Parse Excel/CSV files
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Parse with xlsx
    const workbook = XLSX.read(buffer, { type: "buffer" })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]

    // Helper to normalize column names for flexible matching
    const normalize = (val: string) => val.toLowerCase().replace(/[^a-z0-9]/g, "")

    // Read raw rows to capture header row exactly as-is
    const rows2d = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 }) as string[][]
    const headerRow = (rows2d[0] || []).map((h) => (h ?? "").toString().trim())
    const headerNorms = headerRow.map(normalize).filter(Boolean)

    // Convert to JSON with default values so missing cells still appear as empty strings
    const data = XLSX.utils.sheet_to_json(worksheet, { defval: "" }) as any[]

    if (data.length === 0) {
      return NextResponse.json(
        { error: "No data found in file" },
        { status: 400 }
      )
    }

    // Helper to get value by flexible column matching (accepts 0 as valid)
    const getFieldValue = (record: any, fieldNames: string[]): any => {
      const recordKeys = Object.keys(record)
      for (const fieldName of fieldNames) {
        const target = normalize(fieldName)
        const matchedKey = recordKeys.find((key) => normalize(key) === target)
        if (matchedKey !== undefined && record[matchedKey] !== null && record[matchedKey] !== "") {
          return record[matchedKey]
        }
      }
      return null
    }

    // Validate required columns based on headers (not cell values)
    const requiredColumns = [
      { names: ["Batch_ID", "BatchID", "batch_id"], label: "Batch_ID" },
      { names: ["Name of Medicine", "Name", "Medicine Name", "medicine_name"], label: "Name of Medicine" },
      { names: ["Price (INR)", "Price_INR", "Price", "price_inr", "Price INR"], label: "Price (INR)" },
      { names: ["Total Quantity", "Total_Quantity", "Quantity", "quantity", "Total qty", "Total_qty"], label: "Total Quantity" },
    ]

    const missingColumns = requiredColumns
      .filter((col) => !col.names.some((name) => headerNorms.includes(normalize(name))))
      .map((col) => col.label)

    if (missingColumns.length > 0) {
      return NextResponse.json(
        {
          error: `Missing required columns: ${missingColumns.join(", ")}`,
          details: "Excel/CSV must contain: Batch_ID, Name of Medicine, Price (INR), Total Quantity",
        },
        { status: 400 }
      )
    }

    // Map to standard format with flexible column matching
    const records: MedicineRecord[] = data.map((row: any) => ({
      Batch_ID: String(getFieldValue(row, ["Batch_ID", "BatchID", "batch_id"]) || ""),
      "Name of Medicine": String(getFieldValue(row, ["Name of Medicine", "Name", "Medicine Name", "medicine_name"]) || ""),
      Category: getFieldValue(row, ["Category", "category"]),
      "Medicine Forms": getFieldValue(row, ["Medicine Forms", "Medicine_Forms", "Form", "form"]),
      Quantity_per_pack: getFieldValue(row, ["Quantity_per_pack", "Quantity per pack", "Qty/Pack", "qty_per_pack", "Pack Size"]),
      "Cover Disease": getFieldValue(row, ["Cover Disease", "Cover_Disease", "Disease", "disease"]),
      Symptoms: getFieldValue(row, ["Symptoms", "symptoms"]),
      "Side Effects": getFieldValue(row, ["Side Effects", "Side_Effects", "SideEffects", "side_effects"]),
      Instructions: getFieldValue(row, ["Instructions", "instructions"]),
      "Description in Hinglish": getFieldValue(row, ["Description in Hinglish", "Description_in_Hinglish", "Hinglish", "hinglish", "Description"]),
      Price_INR: Number(getFieldValue(row, ["Price (INR)", "Price_INR", "Price", "price_inr"]) || 0),
      Total_Quantity: Number(getFieldValue(row, ["Total Quantity", "Total_Quantity", "Quantity", "quantity"]) || 0),
    }))

    // Filter out empty rows
    const validRecords = records.filter((r) => r.Batch_ID && r["Name of Medicine"])

    return NextResponse.json({
      success: true,
      count: validRecords.length,
      records: validRecords,
    })
  } catch (error) {
    console.error("Excel/CSV parsing error:", error)
    return NextResponse.json(
      {
        error: "Failed to parse file",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
