import { NextRequest, NextResponse } from "next/server"
import { MongoClient, ObjectId } from "mongodb"

const MONGODB_URI = process.env.DATABASE_URL || ""

async function getDatabase() {
  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  return { client, db: client.db("aushadhi360") }
}

function buildMatchPredicates(id: string) {
  const predicates: any[] = []
  if (!id) return predicates
  try {
    predicates.push({ _id: new ObjectId(id) })
  } catch {
    /* ignore */
  }
  predicates.push({ id })
  predicates.push({ Batch_ID: id })
  return predicates
}

function mergeRecord(existing: any, payload: any) {
  // Normalize incoming payload keys to match stored structure
  const updated = { ...existing }
  if (payload.Batch_ID !== undefined) updated.Batch_ID = payload.Batch_ID
  if (payload["Name of Medicine"] !== undefined) updated["Name of Medicine"] = payload["Name of Medicine"]
  if (payload.Price_INR !== undefined) updated.Price_INR = Number(payload.Price_INR)
  if (payload.Total_Quantity !== undefined) updated.Total_Quantity = Number(payload.Total_Quantity)
  if (payload.Expiry_date !== undefined) updated.Expiry_date = payload.Expiry_date
  if (payload.Category !== undefined) updated.Category = payload.Category
  if (payload["Medicine Forms"] !== undefined) updated["Medicine Forms"] = payload["Medicine Forms"]
  if (payload.Quantity_per_pack !== undefined) updated.Quantity_per_pack = payload.Quantity_per_pack
  if (payload["Cover Disease"] !== undefined) updated["Cover Disease"] = payload["Cover Disease"]
  if (payload.Symptoms !== undefined) updated.Symptoms = payload.Symptoms
  if (payload["Side Effects"] !== undefined) updated["Side Effects"] = payload["Side Effects"]
  if (payload.Instructions !== undefined) updated.Instructions = payload.Instructions
  if (payload["Description in Hinglish"] !== undefined) updated["Description in Hinglish"] = payload["Description in Hinglish"]
  if (payload.status_import !== undefined) updated.status_import = payload.status_import
  return updated
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const email = body?.email as string
    const id = String(body?.id || "")

    if (!email || !id) {
      return NextResponse.json({ error: "email and id are required" }, { status: 400 })
    }

    const { client, db } = await getDatabase()
    try {
      const users = db.collection("users")
      const medicinesCollection = db.collection("medicines")
      
      const user = await users.findOne({ email }, { projection: { _id: 1 } })
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      const predicates = buildMatchPredicates(id)
      const updatePayload = { ...body }
      delete updatePayload.email
      delete updatePayload.id
      
      // Add updatedAt timestamp
      updatePayload.updatedAt = new Date()

      // Build query for medicines collection
      const query: any = { userId: email }
      if (predicates.length > 0) {
        query.$or = predicates.map(p => {
          if (p._id) return { _id: p._id }
          if (p.id) return { Batch_ID: p.id }
          if (p.Batch_ID) return { Batch_ID: p.Batch_ID }
          return {}
        }).filter(q => Object.keys(q).length > 0)
      }

      // Update in medicines collection
      const result = await medicinesCollection.updateOne(query, { $set: updatePayload })

      if (result.matchedCount === 0) {
        return NextResponse.json({ error: "Medicine not found" }, { status: 404 })
      }

      return NextResponse.json({ updated: true, modifiedCount: result.modifiedCount })
    } finally {
      await client.close()
    }
  } catch (error) {
    console.error("Error updating medicine", error)
    return NextResponse.json({ error: "Failed to update medicine" }, { status: 500 })
  }
}
