import { NextRequest, NextResponse } from "next/server"
import { MongoClient } from "mongodb"
import { getEnrichmentService } from "@/lib/services/medicine-enrichment.service"
import type { EnrichedMedicineData } from "@/lib/services/medicine-enrichment.service"
import { extractMedicineDataFromImage } from "@/lib/groq-service"

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
  Manufacturer?: string
  Expiry?: string
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

// For images/PDFs, use Groq Vision
  try {
    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString("base64")

    console.log(`[OCR] Extracting from ${file.name} (${file.size} bytes)...`)
    console.log(`[OCR] Using Groq API...`)

    // Extract using Groq Vision
    const text = await extractMedicineDataFromImage(base64, file.type)

    console.log(`[OCR] Raw response:`, typeof text)

    // Groq service already parsed and validated the response
    // Convert to array if single record
    let parsed: MedicineRecord[] = Array.isArray(text) ? text : [text]

    if (parsed.length > 0) {
      console.log(`[OCR] Successfully extracted ${parsed.length} records`)
      return parsed
    } else {
      console.error("[OCR] No items found in image")
      throw new Error("INVALID_IMAGE: No items with prices and quantities found in this image")
    }
    
  } catch (error) {
    console.error("[OCR] Extraction error:", error instanceof Error ? error.message : error)
    // Re-throw invalid image errors so they stop the pipeline
    if (error instanceof Error && error.message.includes("INVALID_IMAGE")) {
      throw error
    }
    throw new Error("INVALID_IMAGE: Unable to process this image")
  }
}

// LAYER 3 & 4: Match and categorize records
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
        existing.Manufacturer = record.Manufacturer || existing.Manufacturer
        existing.Expiry = record.Expiry || existing.Expiry
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

// LAYER 5 & 6: Medicine Enrichment (fail-fast via shared 2-layer service)
async function enrichMedicineData(records: MedicineRecord[]): Promise<MedicineRecord[]> {
  console.log(`[Enrichment] Starting enrichment for ${records.length} new records...`)

  let service: any
  try {
    service = getEnrichmentService()
    console.log(`[Enrichment] Service initialized successfully`)
  } catch (initError) {
    console.error(`[Enrichment] CRITICAL: Failed to initialize service:`, initError instanceof Error ? initError.message : initError)
    throw new Error("ENRICHMENT_INIT_FAILED: AI enrichment service not available")
  }

  const enriched: MedicineRecord[] = []

  for (const record of records) {
    try {
      console.log(`[Enrichment] Processing: ${record.Batch_ID} - ${record["Name of Medicine"]}`)

      const data: EnrichedMedicineData = await service.enrichMedicine(
        record.Batch_ID,
        record["Name of Medicine"]
      )

      console.log(`[Enrichment] ✓ Successfully enriched: ${record["Name of Medicine"]}`)

      enriched.push({
        Batch_ID: data.Batch_ID,
        "Name of Medicine": data["Name of Medicine"],
        Category: data.Category,
        "Medicine Forms": data["Medicine Forms"],
        Quantity_per_pack: data.Quantity_per_pack,
        "Cover Disease": data["Cover Disease"],
        Symptoms: data.Symptoms,
        "Side Effects": data["Side Effects"],
        Instructions: data.Instructions,
        "Description in Hinglish": data["Description in Hinglish"],
        Manufacturer: record.Manufacturer || data.Manufacturer,
        Expiry: record.Expiry || data.Expiry,
        Price_INR: record.Price_INR,
        Total_Quantity: record.Total_Quantity,
        status_import: "new item added",
      })

      await new Promise((r) => setTimeout(r, 1000))
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error(`[Enrichment] ✗ FAILED for ${record["Name of Medicine"]}:`, msg)
      // Fail-fast: propagate with clear marker
      if (/429|Too Many Requests|quota/i.test(msg)) {
        throw new Error(`ENRICHMENT_RATE_LIMIT: ${msg}`)
      }
      throw new Error(`ENRICHMENT_FAILED: ${msg}`)
    }
  }

  console.log(`[Enrichment] Complete. Enriched: ${enriched.length}`)
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

    // LAYER 5 & 6: Enrich new records (fail-fast)
    let enrichedNewRecords: MedicineRecord[] = []
    try {
      enrichedNewRecords = await enrichMedicineData(newRecords)
    } catch (enrichError) {
      const message = enrichError instanceof Error ? enrichError.message : String(enrichError)
      console.error(`[Pipeline] Enrichment aborted:`, message)
      const isRateLimit = /ENRICHMENT_RATE_LIMIT|429|Too Many Requests|quota/i.test(message)
      return NextResponse.json(
        {
          error: isRateLimit ? "AI rate limit exceeded" : "AI enrichment failed",
          details: message,
          stage: "enrichment",
          action_required: "Please add these medicines manually",
          reason:
            isRateLimit
              ? "Gemini free-tier limit (20 requests/day for gemini-2.5-flash) was exceeded."
              : "AI enrichment encountered an error.",
          tips: [
            "Open Dashboard → Import → Add manually",
            "Enable billing on Google AI Studio to increase Gemini quota",
            "Re-try later when quota resets (daily)",
          ],
          affected_new_records: newRecords,
        },
        { status: 429 }
      )
    }

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
