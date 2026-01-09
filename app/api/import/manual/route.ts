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
    const { email, medicines } = body as { email: string; medicines: ManualMedicineRecord[] }

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
      const bulkOps = []

      for (const rec of medicines) {
        // Check if medicine with this Batch_ID already exists
        const existing = await medicinesCollection.findOne({ 
          userId: email, 
          Batch_ID: rec.Batch_ID 
        })

        if (existing) {
          // Update existing medicine
          bulkOps.push({
            updateOne: {
              filter: { userId: email, Batch_ID: rec.Batch_ID },
              update: {
                $set: {
                  ...rec,
                  status_import: "updated manually",
                  updatedAt: new Date()
                }
              }
            }
          })
          updatedCount += 1
        } else {
          // Insert new medicine
          bulkOps.push({
            insertOne: {
              document: {
                userId: email,
                ...rec,
                status_import: "new item added - manual",
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

      return NextResponse.json({
        message: "Manual import saved",
        summary: { total: medicines.length, updated: updatedCount, new: newCount },
      })
    } finally {
      await client.close()
    }
  } catch (error) {
    return NextResponse.json({ error: "Manual import failed" }, { status: 500 })
  }
}
