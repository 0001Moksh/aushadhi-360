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
      subject: "Welcome to Aushadhi 360 - Your Account is Approved!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to Aushadhi 360!</h2>
          <p>Dear ${name},</p>
          
          <p>Your account has been approved! You can now login to Aushadhi 360 and start managing your medical store.</p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Your Login Credentials:</strong></p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Password:</strong> ${password}</p>
          </div>
          
          <p><strong>Important:</strong> Please change your password after your first login.</p>
          
          <a href="https://aushadhi-360.vercel.app/" style="display: inline-block; background: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">
            Login Now
          </a>
          <a href="http://localhost:3000/" style="display: inline-block; background: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">
            Login Now locally
          </a>
          
          <p style="margin-top: 20px; color: #666;">If you have any questions, please contact the administrator.</p>
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
