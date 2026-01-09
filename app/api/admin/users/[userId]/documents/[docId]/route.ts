import { NextRequest, NextResponse } from "next/server"
import { MongoClient, ObjectId } from "mongodb"

const MONGODB_URI = process.env.DATABASE_URL || ""

async function getDatabase() {
  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  return client.db("aushadhi360")
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string; docId: string } }
) {
  try {
    const db = await getDatabase()
    const documentsCollection = db.collection("userDocuments")

    const result = await documentsCollection.deleteOne({
      _id: new ObjectId(params.docId),
      userId: params.userId,
    })

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ message: "Document deleted" }, { status: 200 })
  } catch (error) {
    console.error("Error deleting document:", error)
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    )
  }
}
