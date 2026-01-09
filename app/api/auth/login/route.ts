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

    // Check if admin credentials (server-side env vars)
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_MAIL
    const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD

    if (email === adminEmail && password === adminPassword) {
      return NextResponse.json(
        {
          message: "Login successful",
          token: `admin_token_${Date.now()}`,
          role: "admin",
          user: {
            email: adminEmail,
            name: "Admin",
            role: "admin",
          },
        },
        { status: 200 }
      )
    }

    // Regular user login from database
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

    const status = (user as any).status || (user.approved ? "active" : "pending")

    // Check if user is approved / active
    if (status === "paused" && user.role === "user") {
      return NextResponse.json(
        { message: "Your account is paused. Please contact your administrator." },
        { status: 403 }
      )
    }

    if (!user.approved && user.role === "user") {
      return NextResponse.json(
        { message: "Your account is pending confirmation. Please check your email." },
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
        role: user.role || "user",
        user: {
          email: user.email,
          name: user.storeName || user.name,
          role: user.role || "user",
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
