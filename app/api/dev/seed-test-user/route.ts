import { MongoClient } from "mongodb"
import { NextResponse } from "next/server"

const mongoUri = process.env.DATABASE_URL || ""

export async function POST() {
  let client: MongoClient | null = null
  try {
    client = new MongoClient(mongoUri)
    await client.connect()

    const db = client.db("aushadhi360")
    const usersCollection = db.collection("users")

    // Check if target user already exists
    const targetEmail = "mokshbhardwaj23@gmail.com"
    const existingUser = await usersCollection.findOne({ email: targetEmail })

    if (existingUser) {
      return NextResponse.json({ message: "User already exists", user: existingUser })
    }

    // Create test user
    const testUser = {
      email: targetEmail,
      password: "tyzuk8u7", // In production, hash this password
      storeName: "ABC Medical Store",
      ownerName: "ABC Medical Store",
      phone: "9876543210",
      address: "123 Test Street, Test City",
      role: "user",
      approved: true,
      medicines: [],
      createdAt: new Date("2025-12-16T16:11:14.776Z"),
      lastLogin: new Date("2025-12-16T17:09:45.143Z"),
    }

    const result = await usersCollection.insertOne(testUser)

    return NextResponse.json({
      message: "Seed user created successfully",
      userId: result.insertedId,
      user: { ...testUser, _id: result.insertedId },
    })
  } catch (error) {
    console.error("Error creating test user:", error)
    return NextResponse.json({ error: "Failed to create test user" }, { status: 500 })
  } finally {
    if (client) await client.close()
  }
}
