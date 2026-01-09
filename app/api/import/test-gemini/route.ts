import { NextRequest, NextResponse } from "next/server"
import { callGroqAPI } from "@/lib/groq-service"

// Simple test endpoint to debug Groq API calls
export async function POST(request: NextRequest) {
  try {
    const { imageBase64, prompt } = await request.json()

    if (!imageBase64 || !prompt) {
      return NextResponse.json(
        { error: "imageBase64 and prompt required" },
        { status: 400 }
      )
    }

    console.log("[Test] Calling Groq API...")
    console.log("[Test] Base64 length:", imageBase64.length)
    console.log("[Test] Prompt:", prompt.substring(0, 100))

    try {
      const response = await callGroqAPI(prompt, imageBase64, "image/jpeg")

      console.log("[Test] API Response:", response.substring(0, 500))

      return NextResponse.json({
        success: true,
        rawResponse: response,
        parsed: tryParseJson(response),
      })
    } catch (apiError) {
      return NextResponse.json(
        {
          error: "Groq API error",
          details: apiError instanceof Error ? apiError.message : String(apiError),
        },
        { status: 500 }
      )
    }
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
