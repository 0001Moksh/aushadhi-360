import { NextRequest, NextResponse } from "next/server"
import { MongoClient, ObjectId } from "mongodb"

const MONGODB_URI = process.env.DATABASE_URL || ""

async function getDatabase() {
  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  return client.db("aushadhi360")
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    const db = await getDatabase()
    const documentsCollection = db.collection("userDocuments")

    // Ensure userId is properly formatted
    const userIdStr = userId?.toString()
    if (!userIdStr) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }
    
    console.log(`Fetching documents for userId: ${userId}`)

    // Fetch documents for the user
    const documents = await documentsCollection
      .find({ userId: userIdStr })
      .toArray()

    console.log(`Found ${documents.length} documents for user ${userIdStr}`)

    return NextResponse.json({ documents: documents || [] }, { status: 200 })
  } catch (error) {
    console.error("Error fetching documents:", error)
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { documentName, documentType, driveUrl } = await request.json()
    const { userId } = await params

    if (!documentName || !documentType || !driveUrl) {
      return NextResponse.json(
        { error: "Document name, type, and URL are required" },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const documentsCollection = db.collection("userDocuments")

    // Ensure userId is properly formatted
    const userIdStr = userId?.toString()
    if (!userIdStr) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }
    
    console.log(`Adding document for userId: ${userIdStr}`)

    const newDocument = {
      userId: userIdStr,
      documentName,
      documentType,
      driveUrl,
      uploadedAt: new Date(),
    }

    const result = await documentsCollection.insertOne(newDocument)

    console.log(`Document added for user ${userIdStr}, docId: ${result.insertedId}`)

    return NextResponse.json(
      { document: { _id: result.insertedId, ...newDocument } },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error adding document:", error)
    return NextResponse.json(
      { error: "Failed to add document" },
      { status: 500 }
    )
  }
}
