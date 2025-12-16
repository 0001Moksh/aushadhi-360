// Health check endpoints for all services

import { type NextRequest, NextResponse } from "next/server"

export const runtime = "edge"

export async function GET(request: NextRequest, { params }: { params: { service: string; provider: string } }) {
  const { service, provider } = params

  try {
    const isHealthy = await checkProviderHealth(service, provider)

    return NextResponse.json({
      service,
      provider,
      healthy: isHealthy,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        service,
        provider,
        healthy: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    )
  }
}

async function checkProviderHealth(service: string, provider: string): Promise<boolean> {
  switch (service) {
    case "ai":
      if (provider === "Gemini") {
        return checkGeminiHealth()
      }
      return true // LocalFallback always healthy

    case "smtp":
      if (provider === "Gmail") {
        return checkGmailHealth()
      }
      return true // Queue always healthy

    case "database":
      if (provider === "MongoDB Atlas") {
        return checkMongoDBHealth()
      }
      return true // LocalStorage always healthy

    case "ocr":
      return true // OCR services

    default:
      return false
  }
}

async function checkGeminiHealth(): Promise<boolean> {
  try {
    // Simple ping to Gemini API
    const response = await fetch(process.env.GEMINI_API_ENDPOINT || "", {
      method: "GET",
      signal: AbortSignal.timeout(3000),
    })
    return response.ok
  } catch {
    return false
  }
}

async function checkGmailHealth(): Promise<boolean> {
  // Check if Gmail SMTP credentials are configured
  return !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD)
}

async function checkMongoDBHealth(): Promise<boolean> {
  try {
    // Try to connect to MongoDB
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ""}/api/database/ping`, {
      method: "GET",
      signal: AbortSignal.timeout(3000),
    })
    return response.ok
  } catch {
    return false
  }
}
