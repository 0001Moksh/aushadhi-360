import { NextRequest, NextResponse } from "next/server"

// Debug endpoint to see exactly what Gemini returns for your image
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString("base64")
    const apiKey = process.env.GEMINI_DOCUMENT_EXTRACTION_API_KEY

    console.log("[Debug] Testing extraction with your file:", file.name)

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Extract EVERY row from this table. Output as JSON array:
[{"Batch_ID":"X","Name of Medicine":"Y","Price_INR":Z,"Total_Quantity":W}]`,
                },
                {
                  inline_data: {
                    mime_type: file.type,
                    data: base64,
                  },
                },
              ],
            },
          ],
        }),
      }
    )

    const data = await response.json()
    const fullText = data.candidates?.[0]?.content?.parts?.[0]?.text || ""

    console.log("[Debug] Raw Gemini response:")
    console.log(fullText)

    return NextResponse.json({
      success: true,
      fileName: file.name,
      fileSize: file.size,
      geminiResponse: fullText,
      hasJsonArray: fullText.includes("[") && fullText.includes("]"),
      hasBatchKeyword: fullText.includes("Batch") || fullText.includes("BATCH"),
      hasMedicineKeyword: fullText.includes("Medicine") || fullText.includes("Calpol") || fullText.includes("Disprin"),
    })
  } catch (error) {
    console.error("[Debug] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
