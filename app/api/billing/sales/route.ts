import { NextRequest, NextResponse } from "next/server"
import { MongoClient } from "mongodb"

const MONGODB_URI = process.env.DATABASE_URL || ""

async function getDatabase() {
  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  return client.db("aushadhi360")
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")

    if (!email) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 })
    }

    const db = await getDatabase()
    const usersCollection = db.collection("users")

    // Find user
    const user = await usersCollection.findOne({ email })
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    const billsCollection = db.collection("bills")

    // Get sales data for the last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const bills = await billsCollection
      .find({
        userId: user._id.toString(),
        createdAt: { $gte: thirtyDaysAgo },
      })
      .sort({ createdAt: 1 })
      .toArray()

    // Aggregate by date
    const salesByDate = new Map<string, { sales: number; orders: number }>()

    bills.forEach((bill) => {
      const date = new Date(bill.createdAt).toISOString().split("T")[0]
      const existing = salesByDate.get(date) || { sales: 0, orders: 0 }
      salesByDate.set(date, {
        sales: existing.sales + (bill.totalAmount || 0),
        orders: existing.orders + 1,
      })
    })

    // Convert to array format
    const sales = Array.from(salesByDate.entries()).map(([date, data]) => ({
      date,
      sales: data.sales,
      orders: data.orders,
    }))

    return NextResponse.json({ sales }, { status: 200 })
  } catch (error) {
    console.error("Error fetching sales data:", error)
    return NextResponse.json({ message: "Error fetching sales data" }, { status: 500 })
  }
}
