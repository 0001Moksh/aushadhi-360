"use client"

// OCR upload component with manual entry fallback

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card } from "@/components/ui/card"
import { Camera, Upload, AlertCircle, Edit } from "lucide-react"
import { ocrService } from "@/lib/api-services/ocr-service"
import type { OCRRequest, OCRResponse } from "@/lib/api-services/ocr-service"

interface Props {
  onMedicinesDetected: (medicines: OCRResponse["medicines"]) => void
  onManualEntry: () => void
}

export function OCRUploadWrapper({ onMedicinesDetected, onManualEntry }: Props) {
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [requiresReview, setRequiresReview] = useState(false)

  async function handleFileUpload(file: File) {
    setProcessing(true)
    setError(null)

    try {
      // Convert to base64
      const base64 = await fileToBase64(file)

      const request: OCRRequest = {
        imageData: base64,
        imageType: "base64",
      }

      const result = await ocrService.processImage(request)

      if (result.success && result.data) {
        if (result.data.requiresReview || result.data.medicines.length === 0) {
          setRequiresReview(true)
          setError(
            "Image could not be read clearly. Please use manual entry mode or try a clearer photo with better lighting.",
          )
        } else {
          onMedicinesDetected(result.data.medicines)

          if (result.fallbackUsed) {
            setRequiresReview(true)
            setError("OCR service is limited. Please review all entries carefully before saving.")
          }
        }
      } else {
        setError("Unable to process image. Please use manual entry.")
      }
    } catch {
      setError("Image processing failed. Please use manual entry.")
    } finally {
      setProcessing(false)
    }
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = (error) => reject(error)
    })
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Upload Bill Photo</h3>

        {error && (
          <Alert variant={requiresReview ? "default" : "destructive"}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-3">
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            />
            <Button className="w-full gap-2" disabled={processing} asChild>
              <span>
                <Camera className="h-4 w-4" />
                {processing ? "Processing..." : "Take Photo"}
              </span>
            </Button>
          </label>

          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            />
            <Button variant="outline" className="w-full gap-2 bg-transparent" disabled={processing} asChild>
              <span>
                <Upload className="h-4 w-4" />
                Upload from Gallery
              </span>
            </Button>
          </label>

          <Button variant="secondary" onClick={onManualEntry} className="gap-2">
            <Edit className="h-4 w-4" />
            Manual Entry Instead
          </Button>
        </div>
      </div>
    </Card>
  )
}
