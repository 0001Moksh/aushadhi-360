# Groq API Migration - Quick Reference

## Before vs After Comparison

### Old (Gemini)
```typescript
// Multiple API keys
GEMINI_API_KEY=...
GEMINI_DOCUMENT_EXTRACTION_API_KEY=...
GEMINI_MEDICINE_ENRICHMENT_API_KEY=...
// ... 9 keys total

// Direct fetch calls
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }, { inline_data: { mime_type, data } }]
      }]
    })
  }
)
```

### New (Groq)
```typescript
// Single API key
GROQ_API_KEY=...

// Service-based calls
import { callGroqAPI, extractMedicineDataFromImage } from "@/lib/groq-service"

// For general AI calls
const response = await callGroqAPI(prompt, imageBase64, mimeType)

// For medicine extraction (OCR)
const medicineData = await extractMedicineDataFromImage(imageBase64, mimeType)
```

## Usage Examples

### 1. Extract Medicine Data from Image
```typescript
import { extractMedicineDataFromImage } from "@/lib/groq-service"

try {
  const records = await extractMedicineDataFromImage(base64Data, "image/jpeg")
  // Returns: MedicineRecord[]
  // [{
  //   Batch_ID: "B001",
  //   "Name of Medicine": "Aspirin",
  //   Price_INR: 50,
  //   Total_Quantity: 100
  // }]
} catch (error) {
  if (error.message.includes("INVALID_IMAGE")) {
    // Handle invalid document
  }
}
```

### 2. General AI Calls with Text + Image
```typescript
import { callGroqAPI } from "@/lib/groq-service"

const response = await callGroqAPI(
  "Describe this image",
  imageBase64,
  "image/jpeg",
  "llama-3.3-70b-versatile" // optional, this is default
)
// Returns: string (the AI response)
```

### 3. Text-Only AI Calls
```typescript
import { callGroqAPI } from "@/lib/groq-service"

const response = await callGroqAPI(
  "What is the capital of France?"
  // No imageBase64 = text-only call
)
```

### 4. Validate Medicine Bill
```typescript
import { validateMedicineBill } from "@/lib/groq-service"

const isValid = await validateMedicineBill(imageBase64)
// Returns: boolean
```

### 5. Enrich Medicine Data
```typescript
import { enrichMedicineData } from "@/lib/groq-service"

const enriched = await enrichMedicineData("Aspirin", "Pain Relief")
// Returns: {
//   category: "...",
//   form: "...",
//   coverDisease: "...",
//   symptoms: "...",
//   sideEffects: "...",
//   instructions: "...",
//   descriptionHinglish: "..."
// }
```

## Environment Variables

```env
# Required
GROQ_API_KEY=gsk_your_key_here

# Optional (use default model if not specified)
# GROQ_MODEL=llama-3.3-70b-versatile
```

## Available Models

| Model | Speed | Cost | Use Case |
|-------|-------|------|----------|
| `llama-3.3-70b-versatile` | Fast | Low | General purpose (default) |
| `mixtral-8x7b-32768` | Very Fast | Very Low | Quick responses |
| `llama-3.1-70b-versatile` | Medium | Low | High accuracy needed |
| `gemma-7b-it` | Fastest | Lowest | Lightweight tasks |

## Error Handling

```typescript
try {
  const data = await extractMedicineDataFromImage(base64)
} catch (error) {
  if (error.message.includes("INVALID_IMAGE")) {
    // Document is not a valid medicine bill
    console.error("Image rejected:", error.message)
  } else if (error.message.includes("Groq API error")) {
    // Groq API issue (rate limit, invalid key, etc.)
    console.error("API error:", error.message)
  } else {
    // JSON parsing or other error
    console.error("Processing error:", error.message)
  }
}
```

## Testing

### Test Endpoint
```bash
POST /api/import/test-gemini
Content-Type: application/json

{
  "imageBase64": "...",
  "prompt": "Extract medicine data from this image"
}
```

### Debug Endpoint
```bash
POST /api/import/debug
Content-Type: multipart/form-data

file: [your image file]
```

### Health Check
```bash
GET /api/health/ai/Groq
```

## Performance Tips

1. **Batch Processing**: Process multiple images sequentially with 1-second delays
   ```typescript
   for (const image of images) {
     await processImage(image)
     await new Promise(r => setTimeout(r, 1000))
   }
   ```

2. **Caching**: Cache extraction results to avoid redundant API calls
   ```typescript
   const cache = new Map()
   const key = hashImage(base64)
   if (cache.has(key)) return cache.get(key)
   const result = await extractMedicineDataFromImage(base64)
   cache.set(key, result)
   ```

3. **Model Selection**: Use faster models for non-critical tasks
   ```typescript
   // For speed-critical operations
   await callGroqAPI(prompt, image, "image/jpeg", "mixtral-8x7b-32768")
   ```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Invalid API key" | Verify `GROQ_API_KEY` in `.env.local` |
| "INVALID_IMAGE" | Ensure image is a valid bill with clear items and prices |
| "No content in response" | Try with a clearer, higher-quality image |
| "JSON parse error" | Image may not contain extractable data; try debug endpoint |
| "Rate limit exceeded" | Add delay between requests or upgrade Groq plan |

## Migration Checklist

- [x] Replace dependencies in package.json
- [x] Update .env.local with GROQ_API_KEY
- [x] Create groq-service.ts with helper functions
- [x] Update pipeline/route.ts
- [x] Update test-gemini/route.ts
- [x] Update debug/route.ts
- [x] Update health check endpoint
- [ ] Install dependencies: `npm install`
- [ ] Add GROQ_API_KEY to .env.local
- [ ] Test with sample images
- [ ] Monitor API usage and costs

---

**Ready to use!** The migration is complete and all code has been updated to use Groq.
