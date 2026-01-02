import { NextRequest, NextResponse } from "next/server"
import { callGroqAPI } from "@/lib/groq-service"

// Debug endpoint to see exactly what Groq returns for your image
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString("base64")

    console.log("[Debug] Testing extraction with your file:", file.name)

    const prompt = `Extract EVERY row from this table. Output as JSON array:
[{"Batch_ID":"X","Name of Medicine":"Y","Price_INR":Z,"Total_Quantity":W}]`

    const response = await callGroqAPI(prompt, base64, file.type)

    console.log("[Debug] Raw Groq response:")
    console.log(response)

    return NextResponse.json({
      success: true,
      fileName: file.name,
      fileSize: file.size,
      groqResponse: response,
      hasJsonArray: response.includes("[") && response.includes("]"),
      hasBatchKeyword: response.includes("Batch") || response.includes("BATCH"),
      hasMedicineKeyword: response.includes("Medicine") || response.includes("Calpol") || response.includes("Disprin"),
    })
  } catch (error) {
    console.error("[Debug] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
