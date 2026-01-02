import { NextRequest, NextResponse } from "next/server"
import { MongoClient } from "mongodb"

const MONGODB_URI = process.env.DATABASE_URL || ""

async function getDatabase() {
  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  return { client, db: client.db("aushadhi360") }
}

export async function PUT(request: NextRequest) {
  try {
    const { email, groqKeyImport, groqKeyAssist } = await request.json()

    if (!email) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 })
    }

    const { client, db } = await getDatabase()
    const usersCollection = db.collection("users")

    const update: Record<string, any> = {}
    if (groqKeyImport !== undefined) update.groqKeyImport = groqKeyImport
    if (groqKeyAssist !== undefined) update.groqKeyAssist = groqKeyAssist

    const result = await usersCollection.updateOne({ email }, { $set: update })
    await client.close()

    if (result.matchedCount === 0) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Groq keys updated" }, { status: 200 })
  } catch (error) {
    console.error("Failed to update Groq keys", error)
    return NextResponse.json({ message: "Failed to update Groq keys" }, { status: 500 })
  }
}
