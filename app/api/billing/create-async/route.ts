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

// Background processing function
async function processBillInBackground(billData: BillData, billId: string) {
  let client: MongoClient | null = null
  try {
    client = new MongoClient(mongoUri)
    await client.connect()

    const db = client.db("aushadhi360")
    const usersCollection = db.collection("users")
    const medicinesCollection = db.collection("medicines")
    const billsCollection = db.collection("bills")

    // Find user
    const user = await usersCollection.findOne({ email: billData.email }, { projection: { _id: 1, storeName: 1 } })
    if (!user) {
      console.error(`Background bill processing: User not found for email ${billData.email}`)
      return
    }

    // Update medicine quantities in bulk
    const bulkOps = []
    
    for (const item of billData.items) {
      const medicine = await medicinesCollection.findOne({ 
        userId: billData.email, 
        Batch_ID: item.batch 
      })
      
      if (medicine) {
        const currentQty = Number(medicine.Total_Quantity || 0)
        const newQty = Math.max(0, currentQty - item.quantity)
        
        bulkOps.push({
          updateOne: {
            filter: { userId: billData.email, Batch_ID: item.batch },
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

    // Save bill to database
    const bill = {
      _id: billId, // Use the pre-generated ID
      userId: user._id,
      userEmail: billData.email,
      storeName: user.storeName || "",
      customerEmail: billData.customerEmail || null,
      customerPhone: billData.customerPhone || null,
      items: billData.items,
      subtotal: billData.subtotal,
      gst: billData.gst,
      total: billData.total,
      createdAt: new Date(),
      status: "completed", // Mark as completed after processing
    }

    await billsCollection.insertOne(bill)
    console.log(`Bill ${billId} processed successfully in background`)

  } catch (error) {
    console.error("Background bill processing error:", error)
    // In production, you'd want to retry or store in a dead-letter queue
  } finally {
    if (client) await client.close()
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: BillData = await req.json()
    const { email, items, subtotal, gst, total, customerEmail, customerPhone } = body

    if (!email || !items || items.length === 0) {
      return NextResponse.json({ error: "Invalid bill data" }, { status: 400 })
    }

    // Generate bill ID immediately
    const billId = `BILL-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`

    // Respond immediately with success
    const response = NextResponse.json({
      success: true,
      billId,
      message: "Bill queued for processing",
      status: "pending"
    })

    // Process bill in background (non-blocking)
    // Note: In production, use a proper job queue (Bull, BullMQ, etc.)
    processBillInBackground(body, billId).catch(error => {
      console.error("Failed to process bill in background:", error)
    })

    return response

  } catch (error) {
    console.error("Error queueing bill:", error)
    return NextResponse.json({ error: "Failed to queue bill" }, { status: 500 })
  }
}
