import { NextRequest, NextResponse } from "next/server"
import { MongoClient, ObjectId } from "mongodb"

const MONGODB_URI = process.env.DATABASE_URL || ""

async function getDatabase() {
  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  return client.db("aushadhi360")
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const requestId = searchParams.get("id")

    if (!requestId) {
      return NextResponse.json(
        { message: "Request ID is required" },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const requestsCollection = db.collection("registration_requests")

    const result = await requestsCollection.deleteOne({
      _id: new ObjectId(requestId),
    })

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { message: "Request not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { message: "Request rejected successfully" },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error rejecting request:", error)
    return NextResponse.json(
      { message: "Error rejecting request" },
      { status: 500 }
    )
  }
}
