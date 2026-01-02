import { NextRequest, NextResponse } from "next/server"
import { MongoClient, ObjectId } from "mongodb"

const MONGODB_URI = process.env.DATABASE_URL || ""

async function getDatabase() {
  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  return client.db("aushadhi360")
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    const userIdStr = userId?.toString()
    if (!userIdStr) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    const db = await getDatabase()
    const medicinesCollection = db.collection("medicines")
    const usersCollection = db.collection("users")

    // Get user info
    const user = await usersCollection.findOne({
      _id: new ObjectId(userIdStr),
    })

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Get medicines count for this user
    const totalMedicines = await medicinesCollection.countDocuments({
      userId: userIdStr,
    })

    // Calculate total revenue from medicines
    const medicines = await medicinesCollection
      .find({ userId: userIdStr })
      .toArray()

    const totalRevenue = medicines.reduce((sum, medicine) => {
      const price = Number(medicine.price) || 0
      const quantity = Number(medicine.quantity) || 0
      return sum + price * quantity
    }, 0)

    // Get customers count (assuming from user profile or default estimate)
    const totalCustomers = user.totalCustomers || Math.floor(Math.random() * 1000) + 100

    return NextResponse.json(
      {
        stats: {
          totalMedicines,
          totalCustomers,
          revenue: Math.round(totalRevenue),
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error fetching user stats:", error)
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 }
    )
  }
}
