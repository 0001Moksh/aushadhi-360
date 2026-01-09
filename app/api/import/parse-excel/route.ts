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
  Manufacturer?: string
  Expiry?: string
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

    // Parse with xlsx, prevent auto date parsing and keep raw values
    const workbook = XLSX.read(buffer, {
      type: "buffer",
      cellDates: false,   // keep dates as numbers, not Date objects
      cellNF: false,      // do not generate cell number formats
      cellText: false     // do not generate formatted text
    })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]

    // Helper to normalize column names for flexible matching
    const normalize = (val: string) => val.toLowerCase().replace(/[^a-z0-9]/g, "")

    // Read raw rows to capture header row exactly as-is
    const rows2d = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1, raw: true, defval: "" }) as string[][]
    const headerRow = (rows2d[0] || []).map((h) => (h ?? "").toString().trim())
    const headerNorms = headerRow.map(normalize).filter(Boolean)

    // Convert to JSON with raw values to avoid implicit parsing (e.g., date formatting)
    const data = XLSX.utils.sheet_to_json(worksheet, { raw: true, defval: "", blankrows: false }) as any[]

    if (data.length === 0) {
      return NextResponse.json(
        { error: "No data found in file" },
        { status: 400 }
      )
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

    // Return RAW records so client can handle flexible parsing (including dates)
    return NextResponse.json({ success: true, count: data.length, records: data })
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
