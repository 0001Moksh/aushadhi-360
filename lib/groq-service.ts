import Groq from "groq-sdk"

// Initialize Groq client
const groqClient = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export interface GroqImageContent {
  type: "image_url"
  image_url: {
    url: string
  }
}

export interface GroqTextContent {
  type: "text"
  text: string
}

export type GroqContentBlock = GroqTextContent | GroqImageContent

/**
 * Call Groq API with text and/or image content
 * Supports base64 encoded images by converting them to data URLs
 */
export async function callGroqAPI(
  prompt: string,
  imageBase64?: string,
  mimeType: string = "image/jpeg",
  model: string = "meta-llama/llama-4-scout-17b-16e-instruct"
): Promise<string> {
  try {
    const content: GroqContentBlock[] = [
      {
        type: "text",
        text: prompt,
      },
    ]

    // Add image if provided
    if (imageBase64) {
      content.push({
        type: "image_url",
        image_url: {
          url: `data:${mimeType};base64,${imageBase64}`,
        },
      })
    }

    const message = await groqClient.chat.completions.create({
      model,
      max_tokens: 2048,
      temperature: 0.2,
      top_p: 0.9,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt,
            },
            ...(imageBase64
              ? [
                  {
                    type: "image_url" as const,
                    image_url: {
                      url: `data:${mimeType};base64,${imageBase64}`,
                    },
                  },
                ]
              : []),
          ],
        },
      ],
    })

    // Extract text from response
    const textContent = message.choices[0]?.message?.content
    if (!textContent) {
      throw new Error("No text response from Groq API")
    }

    return textContent
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Groq API error: ${error.message}`)
    }
    throw error
  }
}

/**
 * Extract medicine data from image using Groq Vision
 */
export async function extractMedicineDataFromImage(
  imageBase64: string,
  mimeType: string = "image/jpeg"
): Promise<any[]> {
  const prompt = `You are a vision OCR agent. Inspect the image carefully.

1) If this image is NOT a clear bill/receipt/invoice with a table of medicines/items, quantities, and prices, return exactly:
{"error": "INVALID_IMAGE", "reason": "why the image is not a valid medicine bill"}

2) If it IS a valid bill/receipt, extract ONLY the table rows and return a strict JSON array (no markdown, no extra text):
[
  {
    "Batch_ID": "text from Batch column",
    "Name of Medicine": "item description text",
    "Manufacturer": "manufacturer name if present, else empty string",
    "Expiry": "expiry text (e.g., Sep-2026) if present, else empty string",
    "Price_INR": number (use the numeric Rate value, no currency symbols),
    "Total_Quantity": number (use Qty column)
  }
]

Rules:
- Output ONLY JSON. Do not wrap in code fences or add explanations.
- "Price_INR" must be numeric (parse the Rate column, e.g., 43.00 -> 43, 225.30 -> 225.3). No rupee symbols.
- "Total_Quantity" must be numeric from the Qty column.
- If Expiry is missing, use an empty string; same for Manufacturer.
- Ignore subtotal/taxes/paid stamps—only table line items.
- If any required columns are missing or unreadable, return the INVALID_IMAGE JSON above.`

  try {
    const response = await callGroqAPI(prompt, imageBase64, mimeType)

    // Check if Groq marked this as invalid
    if (response.includes('"error"') && response.includes("INVALID_IMAGE")) {
      const errorMatch = response.match(/\{[\s\S]*"error"[\s\S]*\}/)
      if (errorMatch) {
        try {
          const errorObj = JSON.parse(errorMatch[0])
          throw new Error(`INVALID_IMAGE: ${errorObj.reason || "Image is not a valid table/receipt"}`)
        } catch {
          throw new Error("INVALID_IMAGE: This image does not contain a valid table, bill, or receipt")
        }
      }
    }

    // Try to extract JSON array from response
    let jsonMatch = response.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0])
        return Array.isArray(parsed) ? parsed : [parsed]
      } catch {
        throw new Error("Failed to parse Groq response as JSON")
      }
    }

    throw new Error("No valid JSON array found in Groq response")
  } catch (error) {
    if (error instanceof Error && error.message.includes("INVALID_IMAGE")) {
      throw error
    }
    throw new Error(`Failed to extract data: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Validate if document is a medicine bill
 */
export async function validateMedicineBill(imageBase64: string): Promise<boolean> {
  const prompt = `Analyze this image and determine if it's a medicine bill, receipt, or prescription with medical items.

Answer with only: YES or NO`

  try {
    const response = await callGroqAPI(prompt, imageBase64)
    return response.toUpperCase().includes("YES")
  } catch (error) {
    console.error("Error validating document:", error)
    return false
  }
}

/**
 * Enrich medicine data with additional information
 */
export async function enrichMedicineData(
  medicineName: string,
  category?: string
): Promise<Record<string, any>> {
  const prompt = `For the medicine "${medicineName}"${category ? ` (Category: ${category})` : ""}, provide additional information in JSON format:
{
  "category": "string",
  "form": "string (tablet, syrup, injection, etc.)",
  "coverDisease": "string",
  "symptoms": "string",
  "sideEffects": "string",
  "instructions": "string",
  "descriptionHinglish": "string"
}

Return only valid JSON, no additional text.`

  try {
    const response = await callGroqAPI(prompt)
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    return {}
  } catch (error) {
    console.error("Error enriching medicine data:", error)
    return {}
  }
}

/**
 * Get Groq client instance for direct API calls if needed
 */
export function getGroqClient(): Groq {
  return groqClient
}
