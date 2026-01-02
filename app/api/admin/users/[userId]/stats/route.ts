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
    const userIdStr = userId?.toString()
    if (!userIdStr) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    const db = await getDatabase()
    const medicinesCollection = db.collection("medicines")
    const billsCollection = db.collection("bills")
    const usersCollection = db.collection("users")

    // Get user info
    let userQuery: any = { _id: new ObjectId(userIdStr) }
    let user = await usersCollection.findOne(userQuery)

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    console.log(`[Stats] Fetching stats for userId: ${userIdStr}, email: ${user.email}`)

    // Query medicines by userId (as string)
    const medicines = await medicinesCollection
      .find({ userId: userIdStr })
      .toArray()

    console.log(`[Stats] Found ${medicines.length} medicines for userId: ${userIdStr}`)

    // Calculate total medicines
    const totalMedicines = medicines.length

    // Calculate expiry statistics from medicines
    let expired = 0
    let expiring = 0
    let fresh = 0
    let statusImportNew = 0

    medicines.forEach((medicine) => {
      // Parse expiry date
      const expiryRaw =
        medicine.expiryDate ||
        medicine.expiry_date ||
        medicine.expiry ||
        medicine.Expiry ||
        medicine.expiryDateString ||
        medicine.Expiry_Date ||
        medicine.Expiry_date ||
        medicine["Expiry Date"]

      let expiryDate: Date | null = null

      if (expiryRaw) {
        const expiryStr = String(expiryRaw).trim()

        // Try parsing "MMM-YYYY" format
        const monthYearMatch = expiryStr.match(/^([A-Za-z]{3})-(\d{4})$/)
        if (monthYearMatch) {
          const [, month, year] = monthYearMatch
          const monthNum = new Date(`${month} 1, ${year}`).getMonth()
          const lastDay = new Date(Number(year), monthNum + 1, 0).getDate()
          const monthDate = new Date(`${month} ${lastDay}, ${year}`)
          if (!isNaN(monthDate.getTime())) {
            expiryDate = monthDate
          }
        } else {
          // Try standard date
          const parsedDate = new Date(expiryStr)
          if (!isNaN(parsedDate.getTime())) {
            expiryDate = parsedDate
          }
        }
      }

      // Calculate days to expiry
      const daysToExpiry = expiryDate
        ? Math.floor((expiryDate.getTime() - Date.now()) / 86400000)
        : null

      // Categorize
      if (daysToExpiry === null) {
        // No expiry data - count as fresh
        fresh += 1
      } else if (daysToExpiry < 0) {
        expired += 1
      } else if (daysToExpiry <= 60) {
        expiring += 1
      } else {
        fresh += 1
      }

      // Check for new imports
      if (medicine.status_import && medicine.status_import.toLowerCase().includes("new")) {
        statusImportNew += 1
      }
    })

    // Calculate total customers from bills (unique customer emails for this user's store)
    const billsForUser = await billsCollection
      .find({ userId: new ObjectId(userIdStr) })
      .toArray()

    const uniqueCustomers = new Set(
      billsForUser.map((bill) => bill.customerEmail).filter(Boolean)
    )
    const totalCustomers = uniqueCustomers.size

    // Calculate total revenue from bills
    const totalRevenue = billsForUser.reduce((sum, bill) => {
      return sum + (Number(bill.total) || 0)
    }, 0)

    console.log(`[Stats] Calculated: medicines=${totalMedicines}, customers=${totalCustomers}, revenue=${totalRevenue}`)

    return NextResponse.json(
      {
        stats: {
          totalMedicines,
          totalCustomers,
          revenue: Math.round(totalRevenue),
          expired,
          expiring,
          fresh,
          statusImportNew,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error fetching user stats:", error)
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 }
    )
  }
}
