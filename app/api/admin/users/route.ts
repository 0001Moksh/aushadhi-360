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
    const { email, name, ownerName, phone, address, password, groqKeyImport, groqKeyAssist } = await request.json()

    // Validation
    if (!email || !name || !ownerName || !phone || !password) {
      return NextResponse.json(
        { message: "Email, store name, owner name, phone, and password are required" },
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
    const confirmationToken = Math.random().toString(36).slice(2) + Date.now().toString(36)

    const newUser = {
      email,
      storeName: name,
      ownerName: ownerName || name,
      phone: phone || "",
      address: address || "",
      password, // In production, hash this!
      role: "user",
      approved: false,
      groqKeyImport: groqKeyImport || "",
      groqKeyAssist: groqKeyAssist || "",
      confirmationToken,
      confirmationTokenExpires: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24h
      createdAt: new Date(),
      lastLogin: null,
      // Initialize empty medicine inventory
      medicines: [],
    }

    const result = await usersCollection.insertOne(newUser)

    // Create a separate medicines collection for this user
    const userMedicinesCollection = db.collection(`medicines_${result.insertedId}`)
    await userMedicinesCollection.createIndex({ name: "text" })

    // Send confirmation email
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    const confirmUrl = `${baseUrl}/api/auth/confirm?token=${encodeURIComponent(confirmationToken)}&email=${encodeURIComponent(email)}`

    try {
      await fetch(`${baseUrl}/api/email/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: email,
          subject: "Confirm Your Aushadhi 360 Account",
          text: `
Hello ${newUser.ownerName || newUser.storeName},

Thank you for registering with Aushadhi 360.

Please confirm your account by clicking the link below:
${confirmUrl}

This confirmation link will expire in 24 hours.

If you did not create this account, you can safely ignore this email.

Regards,
Aushadhi 360 Team
  `,
          html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color:#333;">
      <h2 style="color:#2E7D32;">Confirm Your Aushadhi 360 Account</h2>

      <p>Hello ${newUser.ownerName || newUser.storeName},</p>

      <p>
        Thank you for registering with <strong>Aushadhi 360</strong>.
        Please confirm your account to complete the registration process.
      </p>

      <a
        href="${confirmUrl}"
        style="
          display:inline-block;
          background:#2E7D32;
          color:#ffffff;
          padding:12px 24px;
          text-decoration:none;
          border-radius:6px;
          font-weight:bold;
          margin:16px 0;
        "
      >
        Confirm Account
      </a>

      <p>This confirmation link will expire in <strong>24 hours</strong>.</p>

      <p style="color:#666; font-size:14px;">
        If you did not create this account, you can safely ignore this email.
      </p>

      <p style="margin-top:20px;">
        Regards,<br/>
        <strong>Aushadhi 360 Team</strong>
      </p>
    </div>
  `,
        }),
      })
    } catch (e) {
      console.error("Failed to send confirmation email:", e)
    }

    return NextResponse.json(
      {
        message: "User created. Confirmation email sent.",
        userId: result.insertedId,
        user: {
          _id: result.insertedId,
          email: newUser.email,
          storeName: newUser.storeName,
          ownerName: newUser.ownerName,
          phone: newUser.phone,
          address: newUser.address,
          approved: newUser.approved,
        },
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

    // Map to correct format for frontend
    const formattedUsers = users.map((u) => ({
      _id: u._id,
      email: u.email,
      name: u.storeName || u.name, // Use storeName, fallback to name
      storeName: u.storeName || u.name,
      ownerName: u.ownerName || u.name,
      phone: u.phone || "",
      address: u.address || "",
      approved: u.approved,
      role: u.role || "user",
      createdAt: u.createdAt,
      lastLogin: u.lastLogin,
      groqKeyImport: u.groqKeyImport || "",
      groqKeyAssist: u.groqKeyAssist || "",
    }))

    return NextResponse.json({ users: formattedUsers }, { status: 200 })
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json(
      { message: "Error fetching users" },
      { status: 500 }
    )
  }
}
