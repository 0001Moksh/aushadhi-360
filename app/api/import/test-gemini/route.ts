import { NextRequest, NextResponse } from "next/server"

// Simple test endpoint to debug Gemini API calls
export async function POST(request: NextRequest) {
  try {
    const { imageBase64, prompt } = await request.json()

    if (!imageBase64 || !prompt) {
      return NextResponse.json(
        { error: "imageBase64 and prompt required" },
        { status: 400 }
      )
    }

    const apiKey = process.env.GEMINI_DOCUMENT_EXTRACTION_API_KEY

    console.log("[Test] Calling Gemini API...")
    console.log("[Test] Base64 length:", imageBase64.length)
    console.log("[Test] Prompt:", prompt.substring(0, 100))

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
                  text: prompt,
                },
                {
                  inline_data: {
                    mime_type: "image/jpeg",
                    data: imageBase64,
                  },
                },
              ],
            },
          ],
        }),
      }
    )

    const data = await response.json()

    console.log("[Test] API Response status:", response.status)
    console.log("[Test] API Response:", JSON.stringify(data).substring(0, 500))

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "Gemini API error",
          status: response.status,
          details: data,
        },
        { status: 500 }
      )
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ""

    return NextResponse.json({
      success: true,
      rawResponse: text,
      parsed: tryParseJson(text),
    })
  } catch (error) {
    console.error("[Test] Error:", error)
    return NextResponse.json(
      {
        error: "Request failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

function tryParseJson(text: string) {
  try {
    const match = text.match(/\[[\s\S]*\]/)
    if (match) {
      return JSON.parse(match[0])
    }
    return null
  } catch {
    return null
  }
}
