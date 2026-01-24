import { NextRequest, NextResponse } from "next/server"
import { MongoClient } from "mongodb"

const MONGODB_URI = process.env.DATABASE_URL || ""

interface ManualMedicineRecord {
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
  feature_type?: 'manual' | 'ai' | 'image' | 'excel' | 'csv' | 'ocr'
  customFields?: Record<string, string>
}

async function getDatabase() {
  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  return { client, db: client.db("aushadhi360") }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, medicines, featureType = 'manual' } = body as { 
      email: string
      medicines: ManualMedicineRecord[]
      featureType?: 'manual' | 'ai' | 'image' | 'excel' | 'csv' | 'ocr'
    }

    if (!email || !Array.isArray(medicines)) {
      return NextResponse.json({ error: "email and medicines array required" }, { status: 400 })
    }

    const { client, db } = await getDatabase()

    try {
      const users = db.collection("users")
      const medicinesCollection = db.collection("medicines")
      
      const user = await users.findOne({ email }, { projection: { _id: 1 } })
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      let updatedCount = 0
      let newCount = 0
      let newColumnsDetected = false
      const bulkOps = []
      const newColumns: string[] = []

      // Get existing schema from one document
      const existingDoc = await medicinesCollection.findOne({ userId: email })
      const existingFields = new Set(Object.keys(existingDoc || {}))

      for (const rec of medicines) {
        // Check if medicine with this Batch_ID already exists
        const existing = await medicinesCollection.findOne({ 
          userId: email, 
          Batch_ID: rec.Batch_ID 
        })

        // Detect new columns
        const incomingFields = Object.keys(rec)
        for (const field of incomingFields) {
          if (!existingFields.has(field) && !newColumns.includes(field)) {
            newColumns.push(field)
            newColumnsDetected = true
          }
        }

        if (existing) {
          // Update existing medicine
          bulkOps.push({
            updateOne: {
              filter: { userId: email, Batch_ID: rec.Batch_ID },
              update: {
                $set: {
                  ...rec,
                  feature_type: featureType,
                  status_import: `updated via ${featureType}`,
                  updatedAt: new Date(),
                  // Add any new fields from this import
                  ...incomingFields.reduce((acc, field) => {
                    if (!existingFields.has(field)) {
                      acc[field] = rec[field as keyof ManualMedicineRecord]
                    }
                    return acc
                  }, {} as Record<string, any>)
                }
              }
            }
          })
          updatedCount += 1
        } else {
          // Insert new medicine with feature type
          bulkOps.push({
            insertOne: {
              document: {
                userId: email,
                ...rec,
                feature_type: featureType,
                status_import: `new item added via ${featureType}`,
                createdAt: new Date(),
                updatedAt: new Date()
              }
            }
          })
          newCount += 1
        }
      }

      // Execute bulk operations
      if (bulkOps.length > 0) {
        await medicinesCollection.bulkWrite(bulkOps)
      }

      // Update user's totalMedicines count
      const totalMedicines = await medicinesCollection.countDocuments({ userId: email })
      await users.updateOne({ email }, { $set: { totalMedicines } })

      // Log new columns if detected
      if (newColumnsDetected) {
        console.log(`New columns detected for ${email}: ${newColumns.join(', ')}`)
      }

      return NextResponse.json({
        message: "Manual import saved",
        summary: { 
          total: medicines.length, 
          updated: updatedCount, 
          new: newCount,
          featureType,
          newColumnsDetected,
          newColumns: newColumnsDetected ? newColumns : undefined
        },
      })
    } finally {
      await client.close()
    }
  } catch (error) {
    return NextResponse.json({ error: "Manual import failed" }, { status: 500 })
  }
}
