import { NextRequest, NextResponse } from "next/server"
import { MongoClient, ObjectId } from "mongodb"

const MONGODB_URI = process.env.DATABASE_URL || ""
const SMTP_HOST = process.env.SMTP_HOST || ""
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587")
const SMTP_USER = process.env.SMTP_USER || ""
const SMTP_PASS = process.env.SMTP_PASS || ""

async function getDatabase() {
  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  return client.db("aushadhi360")
}

async function sendCredentialsEmail(email: string, name: string, password: string) {
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
      to: email,
      subject: "Welcome to Aushadhi 360 – Your Account Is Approved",
      html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color:#333;">
      
      <h2 style="color:#2E7D32;">Welcome to Aushadhi 360 🎉</h2>
      
      <p>Dear ${name},</p>
      
      <p>
        We’re happy to inform you that your account has been <strong>successfully approved</strong>.
        You can now access Aushadhi 360 and start managing your medical store efficiently.
      </p>
      
      <div style="background:#f7f7f7; padding:16px; border-radius:8px; margin:20px 0;">
        <p style="margin:0 0 10px;"><strong>Login Details</strong></p>
        <p style="margin:4px 0;"><strong>Email:</strong> ${email}</p>
        <p style="margin:4px 0;"><strong>Temporary Password:</strong> ${password}</p>
      </div>
      
      <p style="color:#B71C1C;">
        <strong>Security Notice:</strong> For your safety, please change your password immediately after logging in.
      </p>
      
      <a 
        href="https://aushadhi-360.vercel.app/" 
        style="
          display:inline-block;
          background:#2E7D32;
          color:#ffffff;
          padding:12px 24px;
          text-decoration:none;
          border-radius:6px;
          font-weight:bold;
          margin-top:10px;
        "
      >
        Login to Aushadhi 360
      </a>
      
      <p style="margin-top:24px; color:#666; font-size:14px;">
        If you did not expect this email or need assistance, please contact the administrator immediately.
      </p>
      
      <p style="margin-top:20px;">
        Regards,<br/>
        <strong>Aushadhi 360 Team</strong>
      </p>
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
    const { requestId, email, name, password } = await request.json()

    if (!requestId || !email || !name || !password) {
      return NextResponse.json(
        { message: "All fields are required" },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const requestsCollection = db.collection("registration_requests")
    const usersCollection = db.collection("users")

    // Check if user already exists
    const existingUser = await usersCollection.findOne({ email })
    if (existingUser) {
      return NextResponse.json(
        { message: "User already exists" },
        { status: 400 }
      )
    }

    // Get the request details
    const registrationRequest = await requestsCollection.findOne({ _id: new ObjectId(requestId) })

    if (!registrationRequest) {
      return NextResponse.json(
        { message: "Request not found" },
        { status: 404 }
      )
    }

    // Create new user with all details from request
    const newUser = {
      email,
      storeName: name, // Store name
      ownerName: registrationRequest.name, // Owner's actual name
      phone: registrationRequest.phone || "",
      address: registrationRequest.address || "",
      password, // In production, hash this!
      role: "user",
      approved: true,
      createdAt: new Date(),
      lastLogin: null,
      // Initialize empty medicine inventory for this user
      medicines: [],
    }

    const result = await usersCollection.insertOne(newUser)

    // Create a separate medicines collection for this user
    const userMedicinesCollection = db.collection(`medicines_${result.insertedId}`)
    await userMedicinesCollection.createIndex({ name: "text" })

    // Delete the request
    await requestsCollection.deleteOne({ _id: new ObjectId(requestId) })

    // Send credentials email
    await sendCredentialsEmail(email, name, password)

    return NextResponse.json(
      { message: "User created and credentials sent via email" },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating user from request:", error)
    return NextResponse.json(
      { message: "Error creating user from request" },
      { status: 500 }
    )
  }
}
