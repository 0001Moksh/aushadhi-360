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
      const user = await users.findOne({ email })
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      const existingMedicines = (user.medicines as ManualMedicineRecord[]) || []
      let updatedCount = 0
      let newCount = 0

      for (const rec of medicines) {
        const idx = existingMedicines.findIndex((m) => m.Batch_ID === rec.Batch_ID)
        if (idx !== -1) {
          existingMedicines[idx] = {
            ...existingMedicines[idx],
            ...rec,
            status_import: "updated manually",
          }
          updatedCount += 1
        } else {
          existingMedicines.push({
            ...rec,
            status_import: "new item added - manual",
          })
          newCount += 1
        }
      }

      await users.updateOne({ email }, { $set: { medicines: existingMedicines } })

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
