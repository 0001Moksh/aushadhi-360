// OCR service with automatic failover to manual entry

import { BaseAPIService, type ServiceResponse } from "./base-service"
import { ServiceType } from "../error-handler"
import type { APIProvider } from "../api-config"

export interface OCRRequest {
  imageData: string // base64 or URL
  imageType: "base64" | "url"
}

export interface OCRResponse {
  medicines: Array<{
    name: string
    quantity: number
    expiryDate: string
    confidence: number
  }>
  requiresReview: boolean
}

class OCRService extends BaseAPIService<OCRResponse> {
  protected serviceType = "ocr" as const
  protected errorServiceType = ServiceType.OCR
  protected timeout = 20000 // OCR needs more time

  async processImage(request: OCRRequest, userId?: string): Promise<ServiceResponse<OCRResponse>> {
    return this.executeWithFailover(async (provider) => {
      if (provider.name === "Tesseract") {
        return this.callTesseractOCR(request, provider)
      } else {
        // Fallback to manual entry mode
        return this.manualEntryMode()
      }
    }, userId)
  }

  private async callTesseractOCR(request: OCRRequest, provider: APIProvider): Promise<OCRResponse> {
    const response = await fetch(provider.endpoint || "/api/ocr/process", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      throw new Error(`OCR failed: ${response.statusText}`)
    }

    return response.json()
  }

  private async manualEntryMode(): Promise<OCRResponse> {
    // Return empty result indicating manual entry needed
    return {
      medicines: [],
      requiresReview: true,
    }
  }
}

export const ocrService = new OCRService()
