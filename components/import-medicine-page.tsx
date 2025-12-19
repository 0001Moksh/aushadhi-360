"use client"

import { useState } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, Camera, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface PipelineStage {
  id: string
  name: string
  status: "pending" | "processing" | "completed" | "failed"
}

interface ImportResult {
  total: number
  updated: number
  new: number
}

export function ImportMedicinePage() {
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [currentStage, setCurrentStage] = useState(0)

  const stages: PipelineStage[] = [
    { id: "validate", name: "Validating image quality & structure", status: "pending" },
    { id: "extract", name: "Extracting medicine data (OCR)", status: "pending" },
    { id: "match", name: "Matching with existing inventory", status: "pending" },
    { id: "update", name: "Updating quantities & prices", status: "pending" },
    { id: "enrich", name: "Enriching new medicines with metadata", status: "pending" },
    { id: "sync", name: "Syncing to database", status: "pending" },
  ]

  const handleFileUpload = async (uploadedFile: File) => {
    setFile(uploadedFile)
    setIsProcessing(true)
    setSuccess(false)
    setError(null)
    setResult(null)
    setCurrentStage(0)

    try {
      // Get user email from localStorage or session
      const userEmail = localStorage.getItem("user_email") || ""

      if (!userEmail) {
        throw new Error("User email not found. Please log in again.")
      }

      const formData = new FormData()
      formData.append("file", uploadedFile)
      formData.append("email", userEmail)
      formData.append("type", uploadedFile.type.includes("image") ? "image" : "excel")

      // Simulate pipeline progress
      const progressInterval = setInterval(() => {
        setCurrentStage((prev) => Math.min(prev + 1, stages.length - 1))
      }, 2000)

      const response = await fetch("/api/import/pipeline", {
        method: "POST",
        body: formData,
      })

      clearInterval(progressInterval)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Import failed")
      }

      const data = await response.json()
      setResult(data.summary)
      setSuccess(true)
      setCurrentStage(stages.length)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-balance mb-2">Import Medicine</h1>
        <p className="text-muted-foreground text-pretty">
          Upload supplier bill photos to quickly add stock (max 10 items per bill)
        </p>
        <div className="flex items-center justify-end mt-4">
          <Link href="/dashboard/manual-import">
            <Button variant="outline" className="text-primary">
              Add medicines manually
            </Button>
          </Link>
        </div>

      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="p-6 md:p-8 text-center">
        <div className="max-w-2xl mx-auto space-y-6">
          {success && result ? (
            <>
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
              <h3 className="text-2xl font-semibold">Import Successful!</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 max-w-lg mx-auto">
                <Card className="p-4">
                  <div className="text-2xl font-bold text-blue-600">{result.total}</div>
                  <div className="text-sm text-muted-foreground">Total Processed</div>
                </Card>
                <Card className="p-4">
                  <div className="text-2xl font-bold text-orange-600">{result.updated}</div>
                  <div className="text-sm text-muted-foreground">Updated</div>
                </Card>
                <Card className="p-4">
                  <div className="text-2xl font-bold text-green-600">{result.new}</div>
                  <div className="text-sm text-muted-foreground">New Added</div>
                </Card>
              </div>
              <Button
                onClick={() => {
                  setFile(null)
                  setSuccess(false)
                  setResult(null)
                  setCurrentStage(0)
                }}
              >
                Upload Another Bill
              </Button>
            </>
          ) : (
            <>
              <div className="p-4 md:p-6 rounded-2xl bg-primary/5 border-2 border-dashed border-primary/20">
                <Upload className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Drop Bill Image Here</h3>
                <p className="text-sm text-muted-foreground mb-4">Supports JPG, PNG, PDF, Excel, CSV</p>
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
                  accept="image/*,.pdf,.xlsx,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const uploadedFile = e.target.files?.[0]
                    if (uploadedFile) handleFileUpload(uploadedFile)
                  }}
                />

              </div>

              {isProcessing && (
                <div className="space-y-4 mt-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Processing Pipeline</span>
                      <span className="font-medium">
                        {currentStage}/{stages.length}
                      </span>
                    </div>
                    <Progress value={(currentStage / stages.length) * 100} className="h-2" />
                  </div>

                  <div className="space-y-2 text-left">
                    {stages.map((stage, index) => (
                      <div key={stage.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          {index < currentStage ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : index === currentStage ? (
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          ) : (
                            <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/20" />
                          )}
                          <span className={index <= currentStage ? "font-medium" : "text-muted-foreground"}>
                            {stage.name}
                          </span>
                        </div>
                        {index < currentStage && <Badge variant="default">Complete</Badge>}
                        {index === currentStage && <Badge variant="secondary">Processing...</Badge>}
                      </div>
                    ))}
                  </div>
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
