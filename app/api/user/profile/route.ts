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

    if (!email) {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const usersCollection = db.collection("users")

    const user = await usersCollection.findOne(
      { email },
      { projection: { password: 0, passwordReset: 0 } } // Don't return password
    )

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      user: {
        email: user.email,
        storeName: user.storeName || user.name || "",
        ownerName: user.ownerName || user.name || "",
        phone: user.phone || "",
        address: user.address || "",
        photoUrl: user.photoUrl || "",
        role: user.role,
        approved: user.approved,
        status: (user as any).status || (user.approved ? "active" : "pending"),
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      },
    })
  } catch (error) {
    console.error("Error fetching user profile:", error)
    return NextResponse.json(
      { message: "Error fetching user profile" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { email, storeName, ownerName, phone, address, photoUrl } = await request.json()

    if (!email) {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const usersCollection = db.collection("users")

    const updateData: any = {}
    if (storeName) updateData.storeName = storeName
    if (ownerName) updateData.ownerName = ownerName
    if (phone !== undefined) updateData.phone = phone
    if (address !== undefined) updateData.address = address
    if (photoUrl !== undefined) updateData.photoUrl = photoUrl

    const result = await usersCollection.updateOne(
      { email },
      { $set: updateData }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { message: "Profile updated successfully" },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error updating user profile:", error)
    return NextResponse.json(
      { message: "Error updating user profile" },
      { status: 500 }
    )
  }
}
