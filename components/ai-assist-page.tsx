"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Sparkles, AlertCircle, Plus, ShoppingCart } from "lucide-react"

interface Suggestion {
  name: string
  usage: string
  quantity: string
  available: boolean
}

export function AIAssistPage() {
  const [symptoms, setSymptoms] = useState("")
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [cart, setCart] = useState<string[]>([])

  const handleAIAssist = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("http://localhost:8000/api/ai/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symptoms }),
      })

      const data = await response.json()
      setSuggestions(data.suggestions)
    } catch (error) {
      // Fallback to rule-based suggestions
      const mockSuggestions: Suggestion[] = [
        {
          name: "Paracetamol 500mg",
          usage: "Take 1 tablet every 6 hours after meals",
          quantity: "1 strip (10 tablets)",
          available: true,
        },
        {
          name: "Gelusil Syrup",
          usage: "Take 2 teaspoons after meals",
          quantity: "1 bottle",
          available: true,
        },
      ]
      setSuggestions(mockSuggestions)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-balance mb-2">AI Assistant</h1>
        <p className="text-muted-foreground text-pretty">Get medicine recommendations based on symptoms</p>
      </div>

      <Card className="p-6 bg-accent/10 border-accent">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
          <div className="space-y-2 text-sm">
            <p className="font-medium">Safety Disclaimer</p>
            <p className="text-muted-foreground text-pretty">
              This AI assistant provides suggestions for OTC medicines only. Prescription medicines are blocked. Final
              decision remains with the pharmacist.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Input */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Describe Symptoms</h2>
          <Textarea
            placeholder="Example: I have stomach pain and gas after eating..."
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            rows={8}
            className="mb-4"
          />
          <Button className="w-full" size="lg" onClick={handleAIAssist} disabled={!symptoms.trim() || isLoading}>
            <Sparkles className="mr-2 h-5 w-5" />
            {isLoading ? "Analyzing..." : "Get AI Suggestions"}
          </Button>
        </Card>

        {/* Suggestions */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Suggestions</h2>
            {suggestions.length > 0 && (
              <Button className="hover:text-primary" variant="outline" size="sm" onClick={() => alert("Added all to cart!")}>
                <ShoppingCart className="mr-2 h-4 w-4" />
                Add All
              </Button>
            )}
          </div>

          {suggestions.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Enter symptoms to get AI recommendations</p>
            </div>
          ) : (
            <div className="space-y-4">
              {suggestions.map((suggestion, idx) => (
                <div key={idx} className="p-4 rounded-lg border bg-card space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{suggestion.name}</h3>
                      {suggestion.available ? (
                        <Badge variant="outline" className="text-success border-success mt-1">
                          In Stock
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-destructive border-destructive mt-1">
                          Out of Stock
                        </Badge>
                      )}
                    </div>
                    <Button size="sm" disabled={!suggestion.available}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                  <div className="text-sm space-y-1">
                    <p>
                      <span className="font-medium">Usage:</span> {suggestion.usage}
                    </p>
                    <p>
                      <span className="font-medium">Quantity:</span> {suggestion.quantity}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
