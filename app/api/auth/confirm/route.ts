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
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")
    const token = searchParams.get("token")

    if (!email || !token) {
      return NextResponse.json({ message: "Missing email or token" }, { status: 400 })
    }

    const db = await getDatabase()
    const usersCollection = db.collection("users")

    const user = await usersCollection.findOne({ email })
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    if (user.approved) {
      return NextResponse.json({ message: "Account already confirmed" }, { status: 200 })
    }

    if (user.confirmationToken !== token) {
      return NextResponse.json({ message: "Invalid token" }, { status: 400 })
    }

    if (user.confirmationTokenExpires && new Date(user.confirmationTokenExpires) < new Date()) {
      return NextResponse.json({ message: "Token expired" }, { status: 400 })
    }

    await usersCollection.updateOne(
      { email },
      {
        $set: { approved: true, status: "active" },
        $unset: { confirmationToken: "", confirmationTokenExpires: "" },
      }
    )

    return NextResponse.json({ message: "Account confirmed successfully" }, { status: 200 })
  } catch (error) {
    console.error("Error confirming account:", error)
    return NextResponse.json({ message: "Error confirming account" }, { status: 500 })
  }
}
