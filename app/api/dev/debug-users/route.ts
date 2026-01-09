import { MongoClient } from "mongodb"
import { NextResponse } from "next/server"

const mongoUri = process.env.DATABASE_URL || ""

export async function GET() {
  let client: MongoClient | null = null
  try {
    client = new MongoClient(mongoUri)
    await client.connect()

    const db = client.db("aushadhi360")
    const usersCollection = db.collection("users")

    // Get all users
    const users = await usersCollection
      .find({})
      .project({ password: 0 })
      .toArray()

    return NextResponse.json({
      totalUsers: users.length,
      users: users.map((u) => ({
        _id: u._id,
        email: u.email,
        storeName: u.storeName,
        ownerName: u.ownerName,
        phone: u.phone,
        address: u.address,
        approved: u.approved,
        role: u.role,
      })),
    })
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  } finally {
    if (client) await client.close()
  }
}
