import { NextRequest, NextResponse } from "next/server"
import { MongoClient } from "mongodb"

const mongoUri = process.env.DATABASE_URL || ""

// Simple in-memory cache
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 10000 // 10 seconds for faster updates

function getCacheKey(email: string, query: string): string {
  return `${email}:${query}`
}

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email")
  const query = req.nextUrl.searchParams.get("query") || ""

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 })
  }

  // Check cache first
  const cacheKey = getCacheKey(email, query)
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data)
  }

  let client: MongoClient | null = null
  try {
    client = new MongoClient(mongoUri, {
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
    })
    await client.connect()

    const db = client.db("aushadhi360")
    const usersCollection = db.collection("users")
    const medicinesCollection = db.collection("medicines")

    // Verify user exists
    const user = await usersCollection.findOne({ email }, { projection: { _id: 1 } })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get medicines from dedicated medicines collection
    let medicines = await medicinesCollection.find({ userId: email }).toArray()

    // Pre-filter and format in one pass for better performance
    const searchLower = query.trim().toLowerCase()
    const formatted = medicines
      .filter((med: any) => {
        const qty = med?.Total_Quantity ?? med?.quantity ?? 0
        if (Number(qty) <= 0) return false

        if (!searchLower) return true

        const name = (med?.["Name of Medicine"] || med?.name || "").toLowerCase()
        const batch = (med?.Batch_ID || "").toLowerCase()
        const category = (med?.Category || "").toLowerCase()
        const form = (med?.["Medicine Forms"] || med?.form || "").toLowerCase()
        const disease = (med?.["Cover Disease"] || med?.Disease || "").toLowerCase()
        const symptoms = (med?.Symptoms || "").toLowerCase()
        const description = (med?.Description || med?.description || med?.["Description in Hinglish"] || med?.Notes || "").toLowerCase()
        const manufacturer = (med?.Manufacturer || med?.["Manufacturer Name"] || "").toLowerCase()
        const composition = (med?.Composition || med?.Salt || med?.["Salt Composition"] || "").toLowerCase()
        const genericName = (med?.["Generic Name"] || med?.generic || "").toLowerCase()
        const dosage = (med?.Dosage || med?.["Dosage Strength"] || "").toLowerCase()
        const packSize = (med?.["Pack Size"] || med?.packaging || "").toLowerCase()
        const therapeuticClass = (med?.["Therapeutic Class"] || med?.therapeutic || "").toLowerCase()

        return (
          name.includes(searchLower) ||
          batch.includes(searchLower) ||
          category.includes(searchLower) ||
          form.includes(searchLower) ||
          disease.includes(searchLower) ||
          symptoms.includes(searchLower) ||
          description.includes(searchLower) ||
          manufacturer.includes(searchLower) ||
          composition.includes(searchLower) ||
          genericName.includes(searchLower) ||
          dosage.includes(searchLower) ||
          packSize.includes(searchLower) ||
          therapeuticClass.includes(searchLower)
        )
      })
      .map((med: any) => ({
        id: med?.Batch_ID || med?.id || `med-${Date.now()}-${Math.random()}`,
        name: med?.["Name of Medicine"] || med?.name || "Unknown",
        batch: med?.Batch_ID || "",
        price: Number(med?.Price_INR || med?.price || 0),
        quantity: Number(med?.Total_Quantity || med?.quantity || 0),
        category: med?.Category || "",
        form: med?.["Medicine Forms"] || med?.form || "",
        description:
          med?.["Description in Hinglish"] ||
          med?.description ||
          med?.Description ||
          med?.Notes ||
          "Medicine sale",
      }))
      .slice(0, 100) // Limit results for better performance

    const response = { medicines: formatted }

    // Cache the result
    cache.set(cacheKey, { data: response, timestamp: Date.now() })

    // Clean old cache entries (keep cache size manageable)
    if (cache.size > 100) {
      const now = Date.now()
      for (const [key, value] of cache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
          cache.delete(key)
        }
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error searching medicines:", error)
    return NextResponse.json({ error: "Failed to search medicines" }, { status: 500 })
  } finally {
    if (client) await client.close()
  }
}
