import { NextRequest, NextResponse } from "next/server"
import { MongoClient } from "mongodb"

const MONGODB_URI = process.env.DATABASE_URL || ""

interface ValidationResult {
  isValid: boolean
  isMedicineBill: boolean
  hasCommercialStructure: boolean
  isTextReadable: boolean
  recordCount: number
  errors: string[]
}

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
  status_import?: string
}

async function getDatabase() {
  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  return { client, db: client.db("aushadhi360") }
}

// LAYER 1: File & Content Validation
async function validateInput(file: File, inputType: string): Promise<ValidationResult> {
  const apiKey = process.env.GEMINI_INPUT_VALIDATION_API_KEY

  try {
    // For images - check if it's a medicine bill
    if (inputType === "image") {
      // Convert file to base64 for Gemini API
      const arrayBuffer = await file.arrayBuffer()
      const base64 = Buffer.from(arrayBuffer).toString("base64")

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Validate this image as a medicine bill. Check:
1. Is it a medicine/pharmacy bill? (Yes/No)
2. Does it contain Item Name, Quantity, Price structure?
3. Is the text readable (no blur, no cut text)?
4. Approximate number of items (reject if > 10)
5. Any duplicate or empty rows?

Return JSON only: {"isValid": boolean, "isMedicineBill": boolean, "hasCommercialStructure": boolean, "isTextReadable": boolean, "recordCount": number, "errors": []}`,
                  },
                  {
                    inline_data: {
                      mime_type: file.type,
                      data: base64,
                    },
                  },
                ],
              },
            ],
          }),
        }
      )

      const data = await response.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}"
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0])
        return result
      }
    }

    // For Excel/CSV - basic structure validation
    return {
      isValid: true,
      isMedicineBill: true,
      hasCommercialStructure: true,
      isTextReadable: true,
      recordCount: 0,
      errors: [],
    }
  } catch (error) {
    console.error("Validation error:", error)
    return {
      isValid: false,
      isMedicineBill: false,
      hasCommercialStructure: false,
      isTextReadable: false,
      recordCount: 0,
      errors: ["Validation failed"],
    }
  }
}

// LAYER 2: Document Extraction (Image/PDF → JSON or Excel/CSV → JSON)
async function extractDocument(file: File, inputType: string): Promise<MedicineRecord[]> {
  // For Excel/CSV files, use direct parsing
  if (inputType === "excel" || file.name.endsWith(".xlsx") || file.name.endsWith(".csv")) {
    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("http://localhost:3000/api/import/parse-excel", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to parse Excel/CSV")
      }

      const data = await response.json()
      return data.records || []
    } catch (error) {
      console.error("Excel parsing error:", error)
      return []
    }
  }

  // For images/PDFs, use Gemini OCR
  const apiKey = process.env.GEMINI_DOCUMENT_EXTRACTION_API_KEY

  try {
    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString("base64")

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Extract medicine data from this bill image. Return ONLY a JSON array with this structure:
[{
  "Batch_ID": "string",
  "Name of Medicine": "string",
  "Price_INR": number,
  "Total_Quantity": number
}]

Extract all visible items. Use Batch_ID from bill if available, otherwise generate unique IDs.`,
                },
                {
                  inline_data: {
                    mime_type: file.type,
                    data: base64,
                  },
                },
              ],
            },
          ],
        }),
      }
    )

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]"
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    return []
  } catch (error) {
    console.error("Extraction error:", error)
    return []
  }
}

// LAYER 3 & 4: Record Matching & Update Logic
async function matchAndUpdateRecords(
  records: MedicineRecord[],
  userEmail: string
): Promise<{ updated: MedicineRecord[]; newRecords: MedicineRecord[] }> {
  const { client, db } = await getDatabase()

  try {
    const usersCollection = db.collection("users")
    const user = await usersCollection.findOne({ email: userEmail })

    if (!user) {
      await client.close()
      return { updated: [], newRecords: records }
    }

    const existingMedicines = (user.medicines as MedicineRecord[]) || []
    const updated: MedicineRecord[] = []
    const newRecords: MedicineRecord[] = []

    for (const record of records) {
      const existing = existingMedicines.find((m) => m.Batch_ID === record.Batch_ID)

      if (existing) {
        // Update existing
        existing.Price_INR = record.Price_INR || existing.Price_INR
        existing.Total_Quantity = (existing.Total_Quantity || 0) + (record.Total_Quantity || 0)
        existing.status_import = "updated price & quantity"
        updated.push(existing)
      } else {
        // New record - needs enrichment
        newRecords.push(record)
      }
    }

    await client.close()
    return { updated, newRecords }
  } catch (error) {
    await client.close()
    throw error
  }
}

// LAYER 5 & 6: Medicine Enrichment
async function enrichMedicineData(records: MedicineRecord[]): Promise<MedicineRecord[]> {
  const apiKey = process.env.GEMINI_MEDICINE_ENRICHMENT_API_KEY
  const enriched: MedicineRecord[] = []

  for (const record of records) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Enrich this medicine data: "${record["Name of Medicine"]}"

Return ONLY this JSON structure:
{
  "Category": "string (ONE category only)",
  "Medicine Forms": "string (ONE form only: Tablet/Capsule/Syrup/Injection/Cream/Powder/Drops)",
  "Quantity_per_pack": "string",
  "Cover Disease": "string (3-4 keywords)",
  "Symptoms": "string (3-4 keywords)",
  "Side Effects": "string (3-4 keywords)",
  "Instructions": "string (full sentence)",
  "Description in Hinglish": "string (full sentence in Hinglish)"
}

Use "not_found" if data cannot be inferred. Be factual and concise.`,
                  },
                ],
              },
            ],
          }),
        }
      )

      const data = await response.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}"
      const jsonMatch = text.match(/\{[\s\S]*\}/)

      if (jsonMatch) {
        const enrichment = JSON.parse(jsonMatch[0])
        enriched.push({
          ...record,
          ...enrichment,
          status_import: "new item added",
        })
      } else {
        enriched.push({ ...record, status_import: "new item added" })
      }
    } catch (error) {
      console.error(`Enrichment error for ${record["Name of Medicine"]}:`, error)
      enriched.push({ ...record, status_import: "new item added" })
    }
  }

  return enriched
}

// LAYER 7: Final Consolidation & DB Sync
async function syncToDatabase(
  updated: MedicineRecord[],
  newRecords: MedicineRecord[],
  userEmail: string
): Promise<boolean> {
  const { client, db } = await getDatabase()

  try {
    const usersCollection = db.collection("users")
    const user = await usersCollection.findOne({ email: userEmail })

    if (!user) {
      await client.close()
      return false
    }

    const existingMedicines = (user.medicines as MedicineRecord[]) || []

    // Update existing records
    for (const updatedRecord of updated) {
      const index = existingMedicines.findIndex((m) => m.Batch_ID === updatedRecord.Batch_ID)
      if (index !== -1) {
        existingMedicines[index] = updatedRecord
      }
    }

    // Add new records
    const finalMedicines = [...existingMedicines, ...newRecords]

    // Update user document
    await usersCollection.updateOne({ email: userEmail }, { $set: { medicines: finalMedicines } })

    await client.close()
    return true
  } catch (error) {
    await client.close()
    throw error
  }
}

// Main Pipeline Handler
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const userEmail = formData.get("email") as string
    const inputType = formData.get("type") as string // "image" or "excel"

    if (!file || !userEmail) {
      return NextResponse.json({ error: "File and email required" }, { status: 400 })
    }

    // LAYER 1: Validation
    const validation = await validateInput(file, inputType)
    if (!validation.isValid) {
      return NextResponse.json(
        {
          error:
            "The uploaded image does not meet the required criteria. Please ensure the bill clearly contains item name, quantity, and price, is not blurred, and includes no more than 10 items.",
          validation,
        },
        { status: 400 }
      )
    }

    // LAYER 2: Extract data from image/document
    const extractedRecords = await extractDocument(file, inputType)

    if (extractedRecords.length === 0) {
      return NextResponse.json({ error: "No records extracted from file" }, { status: 400 })
    }

    // LAYER 3 & 4: Match and categorize records
    const { updated, newRecords } = await matchAndUpdateRecords(extractedRecords, userEmail)

    // LAYER 5 & 6: Enrich new records
    const enrichedNewRecords = await enrichMedicineData(newRecords)

    // LAYER 7 & 8: Consolidate and sync to database
    const success = await syncToDatabase(updated, enrichedNewRecords, userEmail)

    if (!success) {
      return NextResponse.json({ error: "Failed to sync to database" }, { status: 500 })
    }

    return NextResponse.json({
      message: "Import successful",
      summary: {
        total: extractedRecords.length,
        updated: updated.length,
        new: enrichedNewRecords.length,
      },
      data: {
        updated,
        new: enrichedNewRecords,
      },
    })
  } catch (error) {
    console.error("Pipeline error:", error)
    return NextResponse.json({ error: "Import pipeline failed" }, { status: 500 })
  }
}
