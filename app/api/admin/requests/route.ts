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
    const db = await getDatabase()
    const requestsCollection = db.collection("registration_requests")

    const requests = await requestsCollection
      .find({ status: "pending" })
      .sort({ createdAt: -1 })
      .toArray()

    return NextResponse.json({ requests }, { status: 200 })
  } catch (error) {
    console.error("Error fetching requests:", error)
    return NextResponse.json(
      { message: "Error fetching requests" },
      { status: 500 }
    )
  }
}
