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

    // Find user
    const user = await usersCollection.findOne({ email })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const categories = new Set<string>()

    // 1) Embedded medicines array
    if (Array.isArray(user.medicines)) {
      user.medicines.forEach((medicine: any) => {
        if (medicine.Category) categories.add(String(medicine.Category))
      })
    }

    // 2) Dedicated medicines collection (if used)
    try {
      const medsCollection = db.collection("medicines")
      const medsFromCollection = await medsCollection
        .find({ userId: user._id?.toString?.() })
        .project({ Category: 1 })
        .toArray()

      medsFromCollection.forEach((m) => {
        if (m.Category) categories.add(String(m.Category))
      })
    } catch (err) {
      console.error("Category fetch from medicines collection failed", err)
    }

    return NextResponse.json({ categories: Array.from(categories).sort() })
  } catch (error) {
    console.error("Error fetching categories:", error)
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 })
  } finally {
    if (client) await client.close()
  }
}
