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

// LAYER 1: File & Content Validation (Basic - strict checks skipped for now)
async function validateInput(file: File, inputType: string): Promise<ValidationResult> {
  try {
    // Basic file size check (max 10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return {
        isValid: false,
        isMedicineBill: true,
        hasCommercialStructure: true,
        isTextReadable: true,
        recordCount: 0,
        errors: ["File size exceeds 10MB"],
      }
    }

    // Check file type
    const validTypes = ["image/jpeg", "image/png", "image/pdf", "application/pdf", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/csv"]
    if (!validTypes.includes(file.type) && !file.name.endsWith(".xlsx") && !file.name.endsWith(".csv")) {
      return {
        isValid: false,
        isMedicineBill: true,
        hasCommercialStructure: true,
        isTextReadable: true,
        recordCount: 0,
        errors: ["Unsupported file type. Use JPG, PNG, PDF, XLSX, or CSV"],
      }
    }

    // For now, skip strict Gemini validation and let extraction handle it
    // This avoids rejection due to API issues
    console.log(`[Import] Validated file: ${file.name} (${file.type})`, file.size)
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
      isValid: true, // Allow to proceed to extraction layer
      isMedicineBill: true,
      hasCommercialStructure: true,
      isTextReadable: true,
      recordCount: 0,
      errors: [],
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

    console.log(`[OCR] Extracting from ${file.name} (${file.size} bytes)...`)
    console.log(`[OCR] API Key available: ${apiKey ? "YES" : "NO"}`)

    // First attempt: Try to extract structured data
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Look at this image carefully.

First, determine if this image contains a valid table, bill, or receipt with products/items and prices.

If YES - Extract data and return JSON array:
[{"Batch_ID":"X","Name of Medicine":"Y","Price_INR":Z,"Total_Quantity":W}]

If NO (not a valid document) - Return exactly:
{"error": "INVALID_IMAGE", "reason": "about the image in short and issue brief explanation"}

Be strict - only accept images with clear items, prices, and quantities.`,
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
    
    console.log(`[OCR] Response status: ${response.status}`)
    
    if (!response.ok) {
      console.error("[OCR] API Error response:", JSON.stringify(data).substring(0, 500))
      throw new Error(`Gemini API error: ${data.error?.message || response.statusText}`)
    }

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error("[OCR] No content in Gemini response")
      throw new Error("INVALID_IMAGE: Gemini could not process this image")
    }

    const text = data.candidates[0].content.parts[0].text
    
    console.log(`[OCR] Raw response:`, text)
    
    // Check if Gemini explicitly marked this as invalid
    if (text.includes('"error"') && text.includes('INVALID_IMAGE')) {
      const errorMatch = text.match(/\{[\s\S]*"error"[\s\S]*\}/)
      if (errorMatch) {
        try {
          const errorObj = JSON.parse(errorMatch[0])
          console.error(`[OCR] Image rejected by AI: ${errorObj.reason}`)
          throw new Error(`INVALID_IMAGE: ${errorObj.reason || "Image is not a valid table/receipt"}`)
        } catch {
          throw new Error("INVALID_IMAGE: This image does not contain a valid table, bill, or receipt")
        }
      }
    }
    
    // Try to extract JSON array from response
    let jsonMatch = text.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0])
        console.log(`[OCR] Successfully extracted ${parsed.length} records`)
        
        // If extracted but empty, it's an invalid image
        if (parsed.length === 0) {
          console.error("[OCR] No items found in image")
          throw new Error("INVALID_IMAGE: No items with prices and quantities found in this image")
        }
        
        return parsed
      } catch (parseError) {
        if (parseError instanceof Error && parseError.message.includes("INVALID_IMAGE")) {
          throw parseError
        }
        console.error("[OCR] JSON parse error:", parseError)
      }
    }
    
    // If no valid data found after all attempts, reject immediately
    console.error("[OCR] No valid data structure found")
    throw new Error("INVALID_IMAGE: This image does not contain extractable table data")
    
  } catch (error) {
    console.error("[OCR] Extraction error:", error instanceof Error ? error.message : error)
    // Re-throw invalid image errors so they stop the pipeline
    if (error instanceof Error && error.message.includes("INVALID_IMAGE")) {
      throw error
    }
    throw new Error("INVALID_IMAGE: Unable to process this image")
  }
}

// Fallback extraction with different prompt
async function extractTableWithSecondPass(file: File, base64: string): Promise<MedicineRecord[]> {
  const apiKey = process.env.GEMINI_DOCUMENT_EXTRACTION_API_KEY

  try {
    console.log("[OCR-2ndPass] Attempting alternative extraction...")
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Read this table or image and extract EVERY single row.

Return EXACTLY like this format (JSON array):
[
{"Batch_ID":"VALUE","Name of Medicine":"VALUE","Price_INR":NUMBER,"Total_Quantity":NUMBER},
{"Batch_ID":"VALUE","Name of Medicine":"VALUE","Price_INR":NUMBER,"Total_Quantity":NUMBER}
]

If 2 rows exist, return 2 objects. If 5 rows, return 5 objects.
MUST be valid JSON.`,
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
    
    console.log("[OCR-2ndPass] Response:", text.substring(0, 300))
    
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      console.log(`[OCR-2ndPass] Extracted ${parsed.length} records on second attempt`)
      return parsed
    }
    
    return []
  } catch (error) {
    console.error("[OCR-2ndPass] Error:", error)
    return []
  }
}

// Helper: Try to extract text first, then show it to user
async function extractTextOnly(file: File, base64: string): Promise<string> {
  const apiKey = process.env.GEMINI_DOCUMENT_EXTRACTION_API_KEY

  try {
    console.log("[OCR-TextExtract] Extracting all text from image...")
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Extract ALL text from this image. Return exactly what you see, line by line.`,
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
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ""
    console.log("[OCR-TextExtract] Extracted text:", text.substring(0, 200))
    return text
  } catch (error) {
    console.error("[OCR-TextExtract] Error:", error)
    return ""
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
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
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

    console.log(`[Pipeline] Received request - File: ${file?.name}, Email: ${userEmail}, Type: ${inputType}`)

    if (!file || !userEmail) {
      return NextResponse.json({ error: "File and email required" }, { status: 400 })
    }

    // LAYER 1: Validation
    console.log("[Pipeline] Layer 1: Validating input...")
    const validation = await validateInput(file, inputType)
    
    if (!validation.isValid) {
      console.log("[Pipeline] Validation failed:", validation)
      return NextResponse.json(
        {
          error:
            "The uploaded image does not meet the required criteria. Please ensure the bill clearly contains item name, quantity, and price, is not blurred, and includes no more than 10 items.",
          validation,
        },
        { status: 400 }
      )
    }
    
    console.log("[Pipeline] Validation passed")

    // LAYER 2: Extract data from image/document
    console.log(`[Pipeline] Starting extraction for ${file.name}...`)
    
    let extractedRecords
    try {
      extractedRecords = await extractDocument(file, inputType)
    } catch (error) {
      // If extraction throws INVALID_IMAGE error, stop immediately and return detailed error
      if (error instanceof Error && error.message.includes("INVALID_IMAGE")) {
        console.error(`[Pipeline] INVALID IMAGE detected - stopping immediately`)
        return NextResponse.json(
          { 
            error: "Invalid Image", 
            details: error.message.replace("INVALID_IMAGE: ", ""),
            suggestions: [
              "Upload a clear photo of a bill, receipt, or invoice",
              "Make sure the image contains a table with medicine names and prices",
              "Ensure the text is readable and not blurry",
              "Try uploading an Excel file instead for better accuracy"
            ],
            stage: "validation"
          },
          { status: 400 }
        )
      }
      // For other errors, show generic extraction failure
      console.error(`[Pipeline] Extraction error:`, error)
      return NextResponse.json(
        { 
          error: "Extraction Failed", 
          details: error instanceof Error ? error.message : "Unable to extract data from this file",
          stage: "extraction"
        },
        { status: 500 }
      )
    }

    console.log(`[Pipeline] Extracted ${extractedRecords.length} records`)
    
    if (extractedRecords.length === 0) {
      console.log("[Pipeline] No records extracted - returning detailed error")
      
      // This shouldn't happen now since we throw errors, but keep as safeguard
      return NextResponse.json(
        { 
          error: "No items could be extracted from your file.",
          details: "The file appears to be empty or the format could not be recognized.",
          suggestions: [
            "Try using a clearer, better-lit photo",
            "Use an Excel/CSV file instead for 100% accuracy",
            "Ensure text is readable (not blurry or cut off)"
          ],
          stage: "extraction"
        }, 
        { status: 400 }
      )
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
