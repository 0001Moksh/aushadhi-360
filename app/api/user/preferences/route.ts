import { NextRequest, NextResponse } from "next/server"
import { MongoClient } from "mongodb"

const mongoUri = process.env.DATABASE_URL || ""

async function getDatabase() {
  const client = new MongoClient(mongoUri)
  await client.connect()
  return client.db("aushadhi360")
}

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get("email")

    if (!email) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 })
    }

    const db = await getDatabase()
    const users = db.collection("users")
    const user = await users.findOne({ email }, { projection: { preferences: 1 } })

    const preferences = user?.preferences || {
      notifications: { emailAlerts: true },
      invoiceTemplate: "detailed",
      invoiceColumns: ["name", "batch", "quantity", "price", "amount", "description"],
    }

    return NextResponse.json({ preferences })
  } catch (error) {
    console.error("Error fetching preferences", error)
    return NextResponse.json({ message: "Failed to fetch preferences" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, preferences } = body || {}

    if (!email) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 })
    }

    const db = await getDatabase()
    const users = db.collection("users")

    const result = await users.updateOne({ email }, { $set: { preferences } })

    if (result.matchedCount === 0) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Preferences saved" })
  } catch (error) {
    console.error("Error saving preferences", error)
    return NextResponse.json({ message: "Failed to save preferences" }, { status: 500 })
  }
}
