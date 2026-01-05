import { NextRequest, NextResponse } from "next/server"
import { MongoClient } from "mongodb"

const MONGODB_URI = process.env.DATABASE_URL || ""

interface ExtractedItem {
  name: string
  quantity: number
  price: number
  batch?: string
  expiryDate?: string
  isExisting?: boolean
  otherInfo?: Record<string, string | number | boolean>
}

async function getDatabase() {
  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  return { client, db: client.db("aushadhi360") }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, items, sourceFileName } = body as {
      email: string
      items: ExtractedItem[]
      sourceFileName?: string
    }

    if (!email || !Array.isArray(items)) {
      return NextResponse.json(
        { error: "email and items array required" },
        { status: 400 }
      )
    }

    const { client, db } = await getDatabase()

    try {
      const users = db.collection("users")
      const user = await users.findOne({ email })
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      const existingMedicines = (user.medicines as any[]) || []
      let updatedCount = 0
      let newCount = 0
      const importId = `import-${Date.now()}`

      for (const item of items) {
        const batchId = item.batch || `AUTO-${item.name}-${Date.now()}`
        const idx = existingMedicines.findIndex((m) => m.Batch_ID === batchId)

        const medicineData = {
          Batch_ID: batchId,
          "Name of Medicine": item.name,
          Price_INR: Number(item.price) || 0,
          Total_Quantity: Number(item.quantity) || 0,
          Expiry_date: item.expiryDate || "",
          otherInfo: item.otherInfo || {},
          status_import: "import-pipeline",
          importId,
          importedAt: new Date().toISOString(),
          sourceFileName: sourceFileName || "manual",
        }

        if (idx !== -1) {
          // Update existing
          existingMedicines[idx] = {
            ...existingMedicines[idx],
            ...medicineData,
            status_import: "updated from import",
          }
          updatedCount += 1
        } else {
          // Add new
          existingMedicines.push({
            ...medicineData,
            status_import: "new from import",
          })
          newCount += 1
        }
      }

      await users.updateOne({ email }, { $set: { medicines: existingMedicines } })

      return NextResponse.json({
        message: "Import committed successfully",
        importId,
        summary: { total: items.length, updated: updatedCount, new: newCount },
      })
    } finally {
      await client.close()
    }
  } catch (error) {
    console.error("Commit import error:", error)
    return NextResponse.json(
      { error: "Failed to commit import" },
      { status: 500 }
    )
  }
}
