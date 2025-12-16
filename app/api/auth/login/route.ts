import { NextRequest, NextResponse } from "next/server"
import { MongoClient } from "mongodb"

const MONGODB_URI = process.env.DATABASE_URL || ""

async function getDatabase() {
  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  return client.db("aushadhi360")
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password are required" },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const usersCollection = db.collection("users")

    // Find user by email
    const user = await usersCollection.findOne({ email })

    if (!user) {
      return NextResponse.json(
        { message: "Invalid email or password" },
        { status: 401 }
      )
    }

    // Check password (in production, use bcrypt for hashing!)
    if (user.password !== password) {
      return NextResponse.json(
        { message: "Invalid email or password" },
        { status: 401 }
      )
    }

    // Check if user is approved
    if (!user.approved && user.role === "user") {
      return NextResponse.json(
        { message: "Your account is pending admin approval" },
        { status: 403 }
      )
    }

    // Update last login
    await usersCollection.updateOne(
      { _id: user._id },
      { $set: { lastLogin: new Date() } }
    )

    // Generate token (in production, use JWT)
    const token = `token_${email}_${Date.now()}`

    return NextResponse.json(
      {
        message: "Login successful",
        token,
        user: {
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error during login:", error)
    return NextResponse.json(
      { message: "Error during login" },
      { status: 500 }
    )
  }
}
