// AI service with automatic Gemini failover to local processing

import { BaseAPIService, type ServiceResponse } from "./base-service"
import { ServiceType } from "../error-handler"
import type { APIProvider } from "../api-config"

export interface AIRequest {
  symptoms: string
  userAge?: number
  existingConditions?: string[]
}

export interface AIResponse {
  suggestions: Array<{
    medicineName: string
    usage: string
    quantity: string
    reason: string
  }>
  disclaimer: string
}

class AIService extends BaseAPIService<AIResponse> {
  protected serviceType = "ai" as const
  protected errorServiceType = ServiceType.GEMINI_AI
  protected timeout = 15000 // AI needs more time

  async getSuggestions(request: AIRequest, userId?: string): Promise<ServiceResponse<AIResponse>> {
    return this.executeWithFailover(async (provider) => {
      if (provider.name === "Gemini") {
        return this.callGeminiAPI(request, provider)
      } else {
        // Fallback to local rule-based system
        return this.localRuleBasedSuggestions(request)
      }
    }, userId)
  }

  private async callGeminiAPI(request: AIRequest, provider: APIProvider): Promise<AIResponse> {
    const response = await fetch(provider.endpoint || "/api/ai/gemini", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      throw new Error(`Gemini API failed: ${response.statusText}`)
    }

    return response.json()
  }

  private async localRuleBasedSuggestions(request: AIRequest): Promise<AIResponse> {
    // Simple rule-based fallback
    const suggestions = this.getRuleBased(request.symptoms.toLowerCase())

    return {
      suggestions,
      disclaimer:
        "These are basic suggestions. AI service is currently unavailable. Please consult a healthcare professional.",
    }
  }

  private getRuleBased(symptoms: string): AIResponse["suggestions"] {
    // Basic symptom matching
    const rules: Record<string, AIResponse["suggestions"]> = {
      "headache|head pain": [
        {
          medicineName: "Paracetamol 500mg",
          usage: "Take 1 tablet every 6 hours",
          quantity: "1 strip (10 tablets)",
          reason: "Common pain relief",
        },
      ],
      "fever|temperature": [
        {
          medicineName: "Paracetamol 650mg",
          usage: "Take 1 tablet every 8 hours",
          quantity: "1 strip (10 tablets)",
          reason: "Fever reduction",
        },
      ],
      "cold|cough": [
        {
          medicineName: "Cough Syrup",
          usage: "Take 2 teaspoons 3 times daily",
          quantity: "1 bottle (100ml)",
          reason: "Cold and cough relief",
        },
      ],
      "stomach|acidity|gas": [
        {
          medicineName: "Antacid",
          usage: "Take 1 tablet after meals",
          quantity: "1 strip (10 tablets)",
          reason: "Acidity relief",
        },
      ],
    }

    for (const [pattern, medicines] of Object.entries(rules)) {
      const regex = new RegExp(pattern, "i")
      if (regex.test(symptoms)) {
        return medicines
      }
    }

    return []
  }
}

export const aiService = new AIService()
