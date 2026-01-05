import { MongoClient } from "mongodb"
import { NextRequest, NextResponse } from "next/server"

const DATABASE_URL = process.env.DATABASE_URL

export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get("email")

    if (!email) {
      return NextResponse.json(
        { error: "Email parameter is required" },
        { status: 400 }
      )
    }

    const client = new MongoClient(DATABASE_URL!)
    await client.connect()
    const db = client.db("aushadhi360")
    const users = db.collection("users")

    const user = await users.findOne({ email })
    await client.close()

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Return the user's GROQ API keys
    return NextResponse.json({
      groqKeyImport: user.groqKeyImport || null,
      groqKeyAssist: user.groqKeyAssist || null,
      hasKeys: !!(user.groqKeyImport || user.groqKeyAssist),
    })
  } catch (error) {
    console.error("Failed to fetch GROQ keys:", error)
    return NextResponse.json(
      { error: "Failed to fetch GROQ keys" },
      { status: 500 }
    )
  }
}
