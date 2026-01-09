import { MongoClient, ObjectId } from "mongodb"
import { NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"
import * as JSZip from "jszip"

const mongoUri = process.env.DATABASE_URL || ""

async function getDb() {
  const client = new MongoClient(mongoUri)
  await client.connect()
  return client.db("aushadhi360")
}

async function getUser(db: any, email: string) {
  return db.collection("users").findOne({ email }, { projection: { password: 0, passwordReset: 0 } })
}

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email")
  const dataset = (req.nextUrl.searchParams.get("dataset") || "").toLowerCase()

  if (!email || !dataset) {
    return NextResponse.json({ message: "email and dataset are required" }, { status: 400 })
  }

  try {
    const db = await getDb()
    const user = await getUser(db, email)

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    let data: unknown = null

    if (dataset === "billing" || dataset === "bills") {
      const bills = await db
        .collection("bills")
        .find({
          $or: [
            { userId: user._id },
            { userId: user._id instanceof ObjectId ? user._id.toString() : user._id },
            { userEmail: email },
          ],
        })
        .sort({ createdAt: -1 })
        .limit(2000)
        .toArray()

      data = bills.map((bill) => ({
        id: bill._id?.toString?.() || bill._id,
        billId: bill.billId,
        createdAt: bill.createdAt,
        storeName: bill.storeName,
        customerEmail: bill.customerEmail,
        items: bill.items,
        itemsJson: JSON.stringify(bill.items || []),
        subtotal: bill.subtotal,
        gst: bill.gst,
        total: bill.total,
      }))
    } else if (dataset === "medicines") {
      const medicinesCollection = db.collection("medicines")
      const medicines = await medicinesCollection.find({ userId: email }).toArray()

      data = medicines
    } else if (dataset === "users" || dataset === "profile") {
      // Strip fields not requested for export
      const { _id, medicines, groqKeyAssist, groqKeyImport, embeddings, passwordReset, ...rest } = user as any
      data = rest
    } else if (dataset === "all") {
      const [bills, medicines] = await Promise.all([
        db
          .collection("bills")
          .find({
            $or: [
              { userId: user._id },
              { userId: user._id?.toString?.() },
              { userEmail: email },
            ],
          })
          .sort({ createdAt: -1 })
          .limit(2000)
          .toArray(),
        db.collection("medicines").find({ userId: email }).toArray(),
      ])

      data = {
        profile: (() => {
          const { _id, medicines: m, groqKeyAssist, groqKeyImport, embeddings, passwordReset, ...rest } = user as any
          return rest
        })(),
        bills: bills.map((bill) => ({
          id: bill._id?.toString?.() || bill._id,
          billId: bill.billId,
          createdAt: bill.createdAt,
          storeName: bill.storeName,
          customerEmail: bill.customerEmail,
          items: bill.items,
          itemsJson: JSON.stringify(bill.items || []),
          subtotal: bill.subtotal,
          gst: bill.gst,
          total: bill.total,
        })),
        medicines: medicines,
      }
    }

    const sanitized = JSON.parse(JSON.stringify(data))

    const safeDate = new Date().toISOString().replace(/[:]/g, "-")
    const baseName = `export-data-from-aushadhi360-${safeDate}-${dataset}`

    const createWorkbook = (sheetName: string, rows: any[]) => {
      const wb = XLSX.utils.book_new()
      const normalized = Array.isArray(rows) ? rows : [rows]
      const sheet = XLSX.utils.json_to_sheet(normalized)
      XLSX.utils.book_append_sheet(wb, sheet, sheetName)
      return XLSX.write(wb, { bookType: "xlsx", type: "buffer" })
    }

    if (dataset === "all" && typeof sanitized === "object" && sanitized !== null) {
      const allData: any = sanitized
      const zip = new JSZip()

      const profileBuffer = createWorkbook("Profile", [allData.profile])
      const billsBuffer = createWorkbook("Bills", allData.bills || [])
      const medicinesBuffer = createWorkbook("Medicines", allData.medicines || [])

      zip.file(`profile-${safeDate}.xlsx`, profileBuffer)
      zip.file(`billing-${safeDate}.xlsx`, billsBuffer)
      zip.file(`medicines-${safeDate}.xlsx`, medicinesBuffer)

      const docs = [
        "Aushadhi 360 Export",
        `Generated: ${safeDate}`,
        "",
        "Included files:",
        "- profile: profile-*.xlsx (user profile without internal IDs/keys)",
        "- billing: billing-*.xlsx (one row per bill; itemsJson column contains full items)",
        "- medicines: medicines-*.xlsx",
        "",
        "Notes:",
        "- itemsJson is a JSON array of line items for that bill.",
        "- Timestamps are ISO formatted.",
      ].join("\n")
      zip.file(`export-notes-${safeDate}.txt`, docs)

      const zipBuffer = await zip.generateAsync({ type: "nodebuffer" })

      return new NextResponse(zipBuffer, {
        status: 200,
        headers: {
          "content-type": "application/zip",
          "content-disposition": `attachment; filename=${baseName}.zip`,
        },
      })
    }

    if (Array.isArray(sanitized)) {
      const buffer = createWorkbook(dataset === "bills" ? "Bills" : dataset.charAt(0).toUpperCase() + dataset.slice(1), sanitized)
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "content-disposition": `attachment; filename=${baseName}.xlsx`,
        },
      })
    }

    if (sanitized) {
      const buffer = createWorkbook(dataset.charAt(0).toUpperCase() + dataset.slice(1), [sanitized])
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "content-disposition": `attachment; filename=${baseName}.xlsx`,
        },
      })
    }

    return NextResponse.json({ message: "No data to export" }, { status: 404 })
  } catch (error) {
    console.error("Error exporting data", error)
    return NextResponse.json({ message: "Export failed" }, { status: 500 })
  }
}
