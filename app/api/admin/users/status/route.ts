import { NextRequest, NextResponse } from "next/server"
import { MongoClient, ObjectId } from "mongodb"

const MONGODB_URI = process.env.DATABASE_URL || ""

async function getDatabase() {
  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  return client.db("aushadhi360")
}

const ALLOWED_STATUSES = ["active", "paused", "pending"] as const

export async function PUT(request: NextRequest) {
  try {
    const { userId, status } = await request.json()

    if (!userId || !status) {
      return NextResponse.json({ message: "userId and status are required" }, { status: 400 })
    }

    if (!ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json({ message: "Invalid status value" }, { status: 400 })
    }

    const db = await getDatabase()
    const usersCollection = db.collection("users")

    const approved = status === "active"

    const result = await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { $set: { status, approved, updatedAt: new Date() } }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Status updated", status, approved }, { status: 200 })
  } catch (error) {
    console.error("Error updating user status:", error)
    return NextResponse.json({ message: "Error updating user status" }, { status: 500 })
  }
}
