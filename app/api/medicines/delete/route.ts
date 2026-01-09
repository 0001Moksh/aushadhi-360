import { NextRequest, NextResponse } from "next/server"
import { MongoClient, ObjectId } from "mongodb"

const MONGODB_URI = process.env.DATABASE_URL || ""

async function getDatabase() {
  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  return { client, db: client.db("aushadhi360") }
}

function buildMatchPredicates(ids: string[]) {
  const stringIds = ids.map((id) => String(id))
  const objectIds = stringIds
    .map((id) => {
      try {
        return new ObjectId(id)
      } catch {
        return null
      }
    })
    .filter(Boolean) as ObjectId[]

  const predicates = [] as any[]
  if (objectIds.length) predicates.push({ _id: { $in: objectIds } })
  if (stringIds.length) {
    predicates.push({ id: { $in: stringIds } })
    predicates.push({ Batch_ID: { $in: stringIds } })
  }
  return predicates
}

function matchesAnyId(doc: any, ids: Set<string>) {
  const candidates = [doc?._id?.toString?.(), doc?.id, doc?.Batch_ID]
  return candidates.some((v) => v && ids.has(String(v)))
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json()
    const email = body?.email as string
    const ids = Array.isArray(body?.ids) ? body.ids.map(String) : []

    if (!email || ids.length === 0) {
      return NextResponse.json({ error: "email and ids are required" }, { status: 400 })
    }

    const { client, db } = await getDatabase()
    try {
      const users = db.collection("users")
      const medicinesCollection = db.collection("medicines")
      
      const user = await users.findOne({ email }, { projection: { _id: 1 } })
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      const matchPredicates = buildMatchPredicates(ids)

      // Build delete query for medicines collection
      const deleteQuery: any = { userId: email }
      if (matchPredicates.length > 0) {
        deleteQuery.$or = matchPredicates
      }

      // Delete from medicines collection
      const deleteResult = await medicinesCollection.deleteMany(deleteQuery)

      // Update totalMedicines count in user
      const remainingCount = await medicinesCollection.countDocuments({ userId: email })
      await users.updateOne({ email }, { $set: { totalMedicines: remainingCount } })

      return NextResponse.json({ 
        deleted: deleteResult.deletedCount || 0,
        remaining: remainingCount
      })
    } finally {
      await client.close()
    }
  } catch (error) {
    console.error("Error deleting medicines", error)
    return NextResponse.json({ error: "Failed to delete medicines" }, { status: 500 })
  }
}
