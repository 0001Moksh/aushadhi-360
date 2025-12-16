"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, Camera, FileText, CheckCircle } from "lucide-react"

export function ImportMedicinePage() {
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleFileUpload = async (uploadedFile: File) => {
    setFile(uploadedFile)
    setIsProcessing(true)
    setSuccess(false)

    try {
      const formData = new FormData()
      formData.append("file", uploadedFile)

      await fetch("http://localhost:8000/api/ocr/process", {
        method: "POST",
        body: formData,
      })

      setSuccess(true)
    } catch (error) {
      alert("OCR service unavailable. Please enter medicines manually.")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-balance mb-2">Import Medicine</h1>
        <p className="text-muted-foreground text-pretty">Upload supplier bill photos to quickly add stock</p>
      </div>

      <Card className="p-12 text-center">
        <div className="max-w-md mx-auto space-y-6">
          {success ? (
            <>
              <CheckCircle className="h-16 w-16 text-success mx-auto" />
              <h3 className="text-2xl font-semibold">Stock Updated Successfully!</h3>
              <p className="text-muted-foreground">Medicines have been added or updated in your inventory</p>
              <Button
                onClick={() => {
                  setFile(null)
                  setSuccess(false)
                }}
              >
                Upload Another Bill
              </Button>
            </>
          ) : (
            <>
              <div className="p-8 rounded-2xl bg-primary/5 border-2 border-dashed border-primary/20">
                <Upload className="h-16 w-16 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Drop Bill Image Here</h3>
                <p className="text-sm text-muted-foreground mb-4">Supports JPG, PNG, PDF formats</p>
                <div className="flex gap-3 justify-center">
                  <Button onClick={() => document.getElementById("file-upload")?.click()} disabled={isProcessing}>
                    <FileText className="mr-2 h-4 w-4" />
                    Choose File
                  </Button>
                  <Button variant="outline" disabled={isProcessing}>
                    <Camera className="mr-2 h-4 w-4" />
                    Take Photo
                  </Button>
                </div>
                <input
                  id="file-upload"
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const uploadedFile = e.target.files?.[0]
                    if (uploadedFile) handleFileUpload(uploadedFile)
                  }}
                />
              </div>

              {isProcessing && (
                <div className="space-y-3">
                  <div className="h-2 bg-primary/20 rounded-full overflow-hidden">
                    <div className="h-full bg-primary animate-pulse" style={{ width: "60%" }} />
                  </div>
                  <p className="text-sm text-muted-foreground">Processing image with OCR...</p>
                </div>
              )}
            </>
          )}
        </div>
      </Card>

      <Card className="p-6 bg-muted/50">
        <h3 className="font-semibold mb-3">How it works:</h3>
        <ol className="space-y-2 text-sm text-muted-foreground">
          <li>1. Upload or capture a photo of your supplier's bill</li>
          <li>2. OCR automatically extracts medicine details</li>
          <li>3. System updates quantities for existing medicines</li>
          <li>4. New medicines are added to your inventory</li>
          <li>5. Review and confirm the extracted data</li>
        </ol>
      </Card>
    </div>
  )
}
