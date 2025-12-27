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
      const user = await users.findOne({ email })
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      const matchPredicates = buildMatchPredicates(ids)
      const idsSet = new Set(ids.map(String))

      // Attempt delete in shared medicines collection (if used)
      const medicinesCollection = db.collection("medicines")
      const deleteQuery = matchPredicates.length
        ? { userId: user._id.toString(), $or: matchPredicates }
        : { userId: user._id.toString() }
      const deleteResult = matchPredicates.length
        ? await medicinesCollection.deleteMany(deleteQuery)
        : { deletedCount: 0 }

      // Delete from embedded user.medicines array (legacy storage)
      const existing = (user.medicines as any[]) || []
      const filtered = existing.filter((m) => !matchesAnyId(m, idsSet))
      const embeddedDeleted = existing.length - filtered.length
      if (embeddedDeleted > 0) {
        await users.updateOne({ email }, { $set: { medicines: filtered } })
      }

      const totalDeleted = (deleteResult.deletedCount || 0) + embeddedDeleted
      return NextResponse.json({ deleted: totalDeleted })
    } finally {
      await client.close()
    }
  } catch (error) {
    console.error("Error deleting medicines", error)
    return NextResponse.json({ error: "Failed to delete medicines" }, { status: 500 })
  }
}
