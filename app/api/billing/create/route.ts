import { NextRequest, NextResponse } from "next/server"
import { MongoClient } from "mongodb"

const mongoUri = process.env.DATABASE_URL || ""

interface BillItem {
  id: string
  name: string
  batch: string
  price: number
  quantity: number
  description?: string
}

interface BillData {
  email: string
  items: BillItem[]
  subtotal: number
  gst: number
  total: number
  customerEmail?: string
}

export async function POST(req: NextRequest) {
  let client: MongoClient | null = null
  try {
    const body: BillData = await req.json()
    const { email, items, subtotal, gst, total, customerEmail } = body

    if (!email || !items || items.length === 0) {
      return NextResponse.json({ error: "Invalid bill data" }, { status: 400 })
    }

    client = new MongoClient(mongoUri)
    await client.connect()

    const db = client.db("aushadhi360")
    const usersCollection = db.collection("users")
    const medicinesCollection = db.collection("medicines")
    const billsCollection = db.collection("bills")

    // Find user
    const user = await usersCollection.findOne({ email }, { projection: { _id: 1, storeName: 1 } })
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Update medicine quantities
    const bulkOps = []
    
    for (const item of items) {
      const medicine = await medicinesCollection.findOne({ 
        userId: email, 
        Batch_ID: item.batch 
      })
      
      if (medicine) {
        const currentQty = Number(medicine.Total_Quantity || 0)
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
    }

    // Execute bulk operations
    if (bulkOps.length > 0) {
      await medicinesCollection.bulkWrite(bulkOps)
    }

    // Save bill
    const bill = {
      userId: user._id,
      userEmail: email,
      storeName: user.storeName || "",
      customerEmail: customerEmail || null,
      items,
      subtotal,
      gst,
      total,
      createdAt: new Date(),
    }

    const result = await billsCollection.insertOne(bill)

    return NextResponse.json({
      success: true,
      billId: result.insertedId,
      message: "Bill created successfully",
    })
  } catch (error) {
    console.error("Error creating bill:", error)
    return NextResponse.json({ error: "Failed to create bill" }, { status: 500 })
  } finally {
    if (client) await client.close()
  }
}
