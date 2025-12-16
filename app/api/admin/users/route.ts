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
    const { email, name, password } = await request.json()

    // Validation
    if (!email || !name || !password) {
      return NextResponse.json(
        { message: "Email, name, and password are required" },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const usersCollection = db.collection("users")

    // Check if user already exists
    const existingUser = await usersCollection.findOne({ email })
    if (existingUser) {
      return NextResponse.json(
        { message: "User with this email already exists" },
        { status: 400 }
      )
    }

    // Create new user
    const newUser = {
      email,
      name,
      password, // In production, hash this!
      role: "user",
      approved: false,
      createdAt: new Date(),
      lastLogin: null,
    }

    const result = await usersCollection.insertOne(newUser)

    return NextResponse.json(
      {
        message: "User created successfully",
        userId: result.insertedId,
        user: newUser,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json(
      { message: "Error creating user" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase()
    const usersCollection = db.collection("users")

    const users = await usersCollection
      .find({ role: "user" })
      .project({ password: 0 }) // Don't return passwords
      .toArray()

    return NextResponse.json({ users }, { status: 200 })
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json(
      { message: "Error fetching users" },
      { status: 500 }
    )
  }
}
