import { NextRequest, NextResponse } from "next/server"
import { MongoClient } from "mongodb"

const MONGODB_URI = process.env.DATABASE_URL || ""
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || ""
const SMTP_HOST = process.env.SMTP_HOST || ""
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587")
const SMTP_USER = process.env.SMTP_USER || ""
const SMTP_PASS = process.env.SMTP_PASS || ""

async function getDatabase() {
  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  return client.db("aushadhi360")
}

async function sendEmailNotification(userDetails: any) {
  try {
    const nodemailer = require("nodemailer")

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: false,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    })

    const mailOptions = {
      from: SMTP_USER,
      to: ADMIN_EMAIL,
      subject: "New User Registration Request - Aushadhi 360",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">New User Registration Request</h2>
          <p>A new user has requested access to Aushadhi 360:</p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Name:</strong> ${userDetails.name}</p>
            <p><strong>Store Name:</strong> ${userDetails.storeName}</p>
            <p><strong>Email:</strong> ${userDetails.email}</p>
            <p><strong>Phone:</strong> ${userDetails.phone || "Not provided"}</p>
            <p><strong>Address:</strong> ${userDetails.address || "Not provided"}</p>
            <p><strong>Request Date:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <p>Please login to the admin dashboard to review and approve this request.</p>
          
          <a href="http://localhost:3000/admin" style="display: inline-block; background: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">
            Go to Admin Dashboard
          </a>
        </div>
      `,
    }

    await transporter.sendMail(mailOptions)
    return true
  } catch (error) {
    console.error("Email send error:", error)
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, storeName, email, phone, address } = await request.json()

    // Validation
    if (!name || !storeName || !email) {
      return NextResponse.json(
        { message: "Name, store name, and email are required" },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const requestsCollection = db.collection("registration_requests")
    const usersCollection = db.collection("users")

    // Check if email already exists
    const existingUser = await usersCollection.findOne({ email })
    if (existingUser) {
      return NextResponse.json(
        { message: "An account with this email already exists" },
        { status: 400 }
      )
    }

    // Check if request already exists
    const existingRequest = await requestsCollection.findOne({ email })
    if (existingRequest) {
      return NextResponse.json(
        { message: "A registration request with this email already exists" },
        { status: 400 }
      )
    }

    // Create registration request
    const newRequest = {
      name,
      storeName,
      email,
      phone: phone || "",
      address: address || "",
      status: "pending",
      createdAt: new Date(),
    }

    await requestsCollection.insertOne(newRequest)

    // Send email notification to admin
    await sendEmailNotification(newRequest)

    return NextResponse.json(
      {
        message: "Registration request submitted successfully",
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error submitting registration request:", error)
    return NextResponse.json(
      { message: "Error submitting registration request" },
      { status: 500 }
    )
  }
}
