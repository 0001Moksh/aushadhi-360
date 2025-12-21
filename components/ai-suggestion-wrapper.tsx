"use client"

// Wrapper for AI features with graceful degradation

import { useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Brain, AlertCircle, Search } from "lucide-react"
import { aiService } from "@/lib/api-services/ai-service"
import type { AIRequest } from "@/lib/api-services/ai-service"

interface Props {
  onSuggestionSelect: (medicines: string[]) => void
  onManualSearch: () => void
}

export function AISuggestionWrapper({ onSuggestionSelect, onManualSearch }: Props) {
  const [symptoms, setSymptoms] = useState("")
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [fallbackUsed, setFallbackUsed] = useState(false)

  async function handleGetSuggestions() {
    if (!symptoms.trim()) return

    setLoading(true)
    setError(null)

    try {
      const request: AIRequest = {
        symptoms: symptoms.trim(),
      }

      const result = await aiService.getSuggestions(request)

      if (result.success && result.data) {
        setSuggestions(result.data.suggestions.map((s) => s.medicineName))
        setFallbackUsed(result.fallbackUsed)

        if (result.fallbackUsed) {
          setError("AI service is currently unavailable. Showing basic suggestions based on medical rules.")
        }
      } else {
        setError(result.error || "Unable to get suggestions. Please use manual search.")
      }
    } catch {
      setError("AI service is temporarily unavailable. Please use manual search.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          AI Medicine Suggestions
        </CardTitle>
        <CardDescription>Describe symptoms to get medicine recommendations</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant={fallbackUsed ? "default" : "destructive"}>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{fallbackUsed ? "Limited Mode" : "Service Unavailable"}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <textarea
            className="min-h-24 w-full rounded-md border p-2"
            placeholder="Example: headache and fever since yesterday..."
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
          />

          <div className="flex gap-2">
            <Button onClick={handleGetSuggestions} disabled={loading || !symptoms.trim()} className="gap-2">
              <Brain className="h-4 w-4" />
              {loading ? "Getting Suggestions..." : "Get AI Suggestions"}
            </Button>

            <Button variant="outline" onClick={onManualSearch} className="gap-2 bg-transparent hover:text-primary">
              <Search className="h-4 w-4" />
              Manual Search Instead
            </Button>
          </div>
        </div>

        {suggestions.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Suggested Medicines:</h4>
            <div className="space-y-2">
              {suggestions.map((medicine, index) => (
                <div key={index} className="flex items-center justify-between rounded-lg border p-2">
                  <span>{medicine}</span>
                  <Button size="sm" className="hover:text-primary" variant="outline" onClick={() => onSuggestionSelect([medicine])}>
                    Add to Cart
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
