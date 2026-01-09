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
    const usersCollection = db.collection("users")
    const medicinesCollection = db.collection("medicines")

    // Verify user exists
    const user = await usersCollection.findOne({ email }, { projection: { _id: 1 } })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get distinct categories from medicines collection
    const categories = await medicinesCollection.distinct("Category", { 
      userId: email,
      Category: { $exists: true, $ne: null, $ne: "" }
    })

    return NextResponse.json({ categories: categories.sort() })
  } catch (error) {
    console.error("Error fetching categories:", error)
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 })
  } finally {
    if (client) await client.close()
  }
}
