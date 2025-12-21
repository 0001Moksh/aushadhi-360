import { NextRequest, NextResponse } from "next/server"
import { MongoClient } from "mongodb"

const mongoUri = process.env.DATABASE_URL || ""

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email")

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 })
  }

  let client: MongoClient | null = null
  try {
    client = new MongoClient(mongoUri)
    await client.connect()

    const db = client.db("aushadhi360")
    const ordersCollection = db.collection("orders")
    const usersCollection = db.collection("users")

    // Get user to verify
    const user = await usersCollection.findOne({ email })
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Fetch all orders for this user
    const orders = await ordersCollection.find({ userEmail: email }).toArray()

    // Aggregate data: Group by medicineId
    const medicineStats = new Map<
      string,
      {
        medicineId: string
        name: string
        batch: string
        totalUnitsSold: number
        uniqueCustomers: Set<string>
        totalRevenue: number
        lastSoldDate: Date
      }
    >()

    for (const order of orders) {
      const customerEmail = order.customerEmail || "walk-in"
      const items = order.items || []

      for (const item of items) {
        const medicineId = item.medicineId || item.batch
        if (!medicineId) continue

        if (!medicineStats.has(medicineId)) {
          medicineStats.set(medicineId, {
            medicineId,
            name: item.name || "Unknown",
            batch: item.batch || medicineId,
            totalUnitsSold: 0,
            uniqueCustomers: new Set<string>(),
            totalRevenue: 0,
            lastSoldDate: new Date(order.createdAt),
          })
        }

        const stats = medicineStats.get(medicineId)!
        stats.totalUnitsSold += item.quantity || 0
        stats.uniqueCustomers.add(customerEmail)
        stats.totalRevenue += item.subtotal || item.price * item.quantity || 0
        
        const orderDate = new Date(order.createdAt)
        if (orderDate > stats.lastSoldDate) {
          stats.lastSoldDate = orderDate
        }
      }
    }

    // Convert to array format with customer count
    const topSelling = Array.from(medicineStats.values()).map((stats) => ({
      medicineId: stats.medicineId,
      name: stats.name,
      batch: stats.batch,
      totalUnitsSold: stats.totalUnitsSold,
      peopleBought: stats.uniqueCustomers.size,
      totalRevenue: stats.totalRevenue,
      lastSoldDate: stats.lastSoldDate,
    }))

    // Get current stock info from user's medicines
    const medicines = user.medicines || []
    const enrichedTopSelling = topSelling.map((item) => {
      const medicine = medicines.find(
        (m: any) => m.Batch_ID === item.medicineId || m.Batch_ID === item.batch
      )
      return {
        ...item,
        currentStock: medicine?.Total_Quantity || 0,
        price: medicine?.Price_INR || 0,
        category: medicine?.Category || "",
      }
    })

    return NextResponse.json({ topSelling: enrichedTopSelling })
  } catch (error) {
    console.error("Error fetching top-selling data:", error)
    return NextResponse.json({ error: "Failed to fetch top-selling data" }, { status: 500 })
  } finally {
    if (client) await client.close()
  }
}
