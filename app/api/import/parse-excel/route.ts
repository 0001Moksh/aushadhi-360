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

    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet) as any[]

    // Validate required columns
    const requiredColumns = ["Batch_ID", "Name of Medicine", "Price_INR", "Total_Quantity"]
    const missingColumns: string[] = []

    if (data.length > 0) {
      const sampleRow = data[0]
      for (const col of requiredColumns) {
        if (!(col in sampleRow)) {
          missingColumns.push(col)
        }
      }
    }

    if (missingColumns.length > 0) {
      return NextResponse.json(
        {
          error: `Missing required columns: ${missingColumns.join(", ")}`,
          details: "Excel/CSV must contain: Batch_ID, Name of Medicine, Price_INR, Total_Quantity",
        },
        { status: 400 }
      )
    }

    // Map to standard format
    const records: MedicineRecord[] = data.map((row: any) => ({
      Batch_ID: String(row.Batch_ID || ""),
      "Name of Medicine": String(row["Name of Medicine"] || row["Name"] || ""),
      Category: row.Category,
      "Medicine Forms": row["Medicine Forms"] || row.Form,
      Quantity_per_pack: row.Quantity_per_pack || row["Pack Size"],
      "Cover Disease": row["Cover Disease"] || row.Disease,
      Symptoms: row.Symptoms,
      "Side Effects": row["Side Effects"],
      Instructions: row.Instructions,
      "Description in Hinglish": row["Description in Hinglish"] || row.Description,
      Price_INR: Number(row.Price_INR || row.Price || 0),
      Total_Quantity: Number(row.Total_Quantity || row.Quantity || 0),
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
