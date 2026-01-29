import { NextRequest, NextResponse } from "next/server"
import { MongoClient } from "mongodb"

const mongoUri = process.env.DATABASE_URL || ""

interface BillItem {
  medicineId: string
  name: string
  batch: string
  price: number
  quantity: number
  subtotal: number
  description?: string
}

interface BillData {
  email: string
  items: BillItem[]
  subtotal: number
  gst: number
  total: number
  customerEmail?: string
  customerPhone?: string
}

export async function POST(req: NextRequest) {
  let client: MongoClient | null = null
  try {
    const body: BillData = await req.json()
    const { email, items, subtotal, gst, total, customerEmail, customerPhone } = body

    if (!email || !items || items.length === 0) {
      return NextResponse.json({ error: "Invalid bill data" }, { status: 400 })
    }

    const billId = `BILL-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`

    client = new MongoClient(mongoUri)
    await client.connect()

    const db = client.db("aushadhi360")
    const usersCollection = db.collection("users")
    const medicinesCollection = db.collection("medicines")
    const billsCollection = db.collection("bills")

    // Ensure user exists
    const user = await usersCollection.findOne({ email }, { projection: { _id: 1, storeName: 1 } })
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Preload medicines once to avoid multiple round trips and allow quantity math
    const batches = Array.from(new Set(items.map(item => item.batch)))
    const medicines = await medicinesCollection.find({ userId: email, Batch_ID: { $in: batches } }).toArray()
    const medicineMap = new Map(medicines.map(med => [med.Batch_ID, med]))

    const bulkOps = []
    for (const item of items) {
      const medicine = medicineMap.get(item.batch)
      if (!medicine) {
        // Skip missing batches silently; could be extended to error out if needed
        continue
      }

      const currentQty = Number(medicine.Total_Quantity ?? medicine.quantity ?? 0)
      const newQty = Math.max(0, currentQty - item.quantity)

      bulkOps.push({
        updateOne: {
          filter: { userId: email, Batch_ID: item.batch },
          update: {
            $set: {
              Total_Quantity: newQty,
              updatedAt: new Date()
            }
          }
        }
      })
    }

    if (bulkOps.length > 0) {
      await medicinesCollection.bulkWrite(bulkOps)
    }

    // Save bill to database synchronously so quantity changes are guaranteed
    const bill = {
      _id: billId,
      billId,
      userId: user._id,
      userEmail: email,
      storeName: user.storeName || "",
      customerEmail: customerEmail || null,
      customerPhone: customerPhone || null,
      items,
      subtotal,
      gst,
      total,
      createdAt: new Date(),
      status: "completed",
    }

    await billsCollection.insertOne(bill)

    return NextResponse.json({
      success: true,
      billId,
      message: "Bill processed successfully",
      status: "completed"
    })

  } catch (error) {
    console.error("Error processing bill:", error)
    return NextResponse.json({ error: "Failed to process bill" }, { status: 500 })
  } finally {
    if (client) await client.close()
  }
}
