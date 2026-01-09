import { NextRequest, NextResponse } from "next/server"
import { MongoClient, ObjectId } from "mongodb"

const mongoUri = process.env.DATABASE_URL || ""

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email")
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "200")

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 })
  }

  let client: MongoClient | null = null
  try {
    client = new MongoClient(mongoUri)
    await client.connect()

    const db = client.db("aushadhi360")
    const usersCollection = db.collection("users")
    const billsCollection = db.collection("bills")

    // Find user
    const user = await usersCollection.findOne({ email }, { projection: { _id: 1 } })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get recent bills (handle both ObjectId and string stored userId, and fallback to userEmail)
    const query = {
      $or: [
        { userId: user._id },
        { userId: user._id.toString() },
        { userEmail: email }
      ]
    }

    const bills = await billsCollection
      .find(query)
      .sort({ createdAt: 1 })
      .limit(limit)
      .toArray()

    const formatted = bills.map((bill) => ({
      id: bill._id.toString(),
      billId: bill.billId,
      date: bill.createdAt,
      storeName: bill.storeName,
      items: bill.items,
      subtotal: bill.subtotal,
      gst: bill.gst,
      total: bill.total,
      customerEmail: bill.customerEmail,
      itemCount: bill.items?.length || 0,
    }))

    return NextResponse.json({ bills: formatted })
  } catch (error) {
    console.error("Error fetching bill history:", error)
    return NextResponse.json({ error: "Failed to fetch bill history" }, { status: 500 })
  } finally {
    if (client) await client.close()
  }
}
