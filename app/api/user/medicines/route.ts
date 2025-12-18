import { MongoClient } from "mongodb"
import { NextRequest, NextResponse } from "next/server"

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
    const usersCollection = db.collection("users")
    const medicinesCollection = db.collection("medicines")

    // Find user
    const user = await usersCollection.findOne({ email })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get medicines for this user (prefer dedicated collection, fallback to embedded array)
    let medicines = await medicinesCollection.find({ userId: user._id.toString() }).toArray()

    if ((!medicines || medicines.length === 0) && Array.isArray(user.medicines)) {
      medicines = user.medicines
    }

    return NextResponse.json({ medicines: medicines || [] })
  } catch (error) {
    console.error("Error fetching medicines:", error)
    return NextResponse.json({ error: "Failed to fetch medicines" }, { status: 500 })
  } finally {
    if (client) await client.close()
  }
}
