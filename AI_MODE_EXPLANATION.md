# AI Mode Workflow - Aushadhi 360 Billing Page

## Overview
AI Mode is an intelligent medicine recommendation system that analyzes patient symptoms and suggests relevant medicines using AI embeddings and semantic search powered by a FastAPI backend.

---

## How AI Mode Works

### 1. **Initialization Phase**
When the component loads, it checks the embedding status:

```
┌─────────────────────────────────────────────┐
│ Check localStorage for embedding readiness   │
├─────────────────────────────────────────────┤
│ • embedding_ready: "true" | "false" | null  │
│ • embedding_attempts: number                 │
│ • Polls every 5 seconds if not ready        │
└─────────────────────────────────────────────┘
```

**States:**
- **Checking** 🟡: Embeddings are being generated (backend initialization)
- **Ready** 🟢: AI system ready for queries
- **Failed** 🔴: Embeddings failed to load (server issue)

---

### 2. **User Input Flow**

```
User enters symptoms
       ↓
[Textarea Input] - "Patient has severe headache, nasal congestion, mild fever..."
       ↓
Symptoms stored in state: `symptoms`
       ↓
Button enabled only if: 
  - symptoms.trim() is not empty
  - embeddings are ready
  - not currently loading
```

---

### 3. **AI Request & Response**

#### **Function: `handleAIAssist()`**

```
1. Validate embeddings are ready
2. Set loading state: isAILoading = true
3. Send GET request to FastAPI backend:
   
   GET /get_medicines?query=[encoded_symptoms]
   
   Example: /get_medicines?query=severe%20headache%20nasal%20congestion
   
4. Backend returns AIResponse with:
   {
     "AI Response": "Clinical analysis text...",
     "Medicines": [
       {
         "Name of Medicine": "Paracetamol",
         "Batch_ID": "PAR123",
         "Price_INR": 50.00,
         "Category": "Analgesic",
         "Medicine Forms": "Tablet",
         "Cover Disease": "Fever, Headache",
         "Instructions": "1 tablet twice daily",
         "Side Effects": "Rare allergic reactions",
         "Quantity": "100"
       },
       ...more medicines
     ],
     "Score": "85%",
     "overall instructions": "Rest well, stay hydrated..."
   }
```

---

### 4. **Display AI Results**

The response displays in sections:

#### **A. Safety Warning** ⚠️
```
"AI suggests OTC medicines only. Always verify with a pharmacist."
(Dismissible)
```

#### **B. Embedding Status Indicators**
- 🔄 Checking → "AI embeddings are being prepared..."
- ✅ Ready → "AI assistant is ready"
- ❌ Failed → "AI unavailable. Please check server status."

#### **C. AI Analysis Card**
```
┌─────────────────────────────────────┐
│ ✨ AI Analysis                      │
├─────────────────────────────────────┤
│ Clinical interpretation of symptoms  │
│ Confidence: [Score %]               │
└─────────────────────────────────────┘
```

#### **D. Recommended Medicines List**
For each medicine:
```
┌──────────────────────────────────────┐
│ Medicine Name                        │
│ Batch: BATCH_ID                      │
│ [Category Badge] [Form Badge]        │
│                              ₹Price  │
│ Treats: Disease                      │
│ Usage: Instructions                  │
│ Side Effects: (warning)              │
├──────────────────────────────────────┤
│ [+ Add to Cart] or [Qty in Cart]     │
└──────────────────────────────────────┘
```

#### **E. Lifestyle Advice Card**
```
┌─────────────────────────────────────┐
│ 💡 Lifestyle Advice                 │
├─────────────────────────────────────┤
│ General guidance on rest, diet, etc  │
└─────────────────────────────────────┘
```

---

### 5. **Adding Medicines to Cart**

#### **Function: `addAIMedicineToCart(medicine: AIMedicine)`**

```
Triggered by clicking [+ Add] button on a recommended medicine

1. Create CartItem from AIMedicine:
   {
     id: medicine["Batch_ID"],
     name: medicine["Name of Medicine"],
     batch: medicine["Batch_ID"],
     price: medicine.Price_INR || 0,
     quantity: 1,
     availableQty: parseInt(medicine.Quantity || "999"),
     description: medicine.Description
   }

2. Check if medicine already in cart (by batch_id)
   
   If EXISTS:
     → Increment quantity by 1
   
   If NEW:
     → Add to cart with quantity = 1

3. Display success toast: "Added [Medicine Name] to cart"
```

---

## State Variables

| Variable | Type | Purpose |
|----------|------|---------|
| `isAIMode` | boolean | Toggle between search and AI mode |
| `symptoms` | string | Patient symptoms text input |
| `aiResponse` | AIResponse \| null | API response data |
| `isAILoading` | boolean | Loading indicator during API call |
| `showAIWarning` | boolean | Display disclaimer warning |
| `embeddingStatus` | object | Track AI readiness status |
| - `ready` | boolean | Embeddings loaded successfully |
| - `attempts` | number | Number of loading attempts |
| - `checking` | boolean | Currently checking status |
| `dismissedAlerts` | string[] | Track dismissed notifications |

---

## API Endpoint

**Backend:** FastAPI Server
**Endpoint:** `GET /get_medicines`
**Base URL:** `process.env.NEXT_PUBLIC_FASTAPI_URL`

**Query Parameter:**
- `query`: Encoded symptom description

**Response Format:**
```typescript
{
  "AI Response": string,
  "Medicines": AIMedicine[],
  "Score": string,
  "overall instructions": string
}
```

---

## User Experience Flow

```
┌────────────────────────────────────────────────────────────┐
│                    USER ENTERS AI MODE                      │
└────────────────────────────────────────────────────────────┘
                              ↓
         ┌──────────────────────────────────────────┐
         │ Check Embedding Status                   │
         │ (From localStorage)                      │
         └──────────────────────────────────────────┘
                              ↓
        ┌─────────────────────────────────────────┐
        │ Display appropriate status indicator    │
        │ (Checking/Ready/Failed)                 │
        └─────────────────────────────────────────┘
                              ↓
     ┌──────────────────────────────────────────┐
     │ User enters symptom description           │
     │ in Textarea                              │
     └──────────────────────────────────────────┘
                              ↓
        ┌────────────────────────────────────┐
        │ Click "Get Recommendations" button  │
        └────────────────────────────────────┘
                              ↓
     ┌─────────────────────────────────────────┐
     │ Send query to FastAPI                   │
     │ /get_medicines?query=[symptoms]         │
     │ Display loading state                   │
     └─────────────────────────────────────────┘
                              ↓
        ┌─────────────────────────────────────┐
        │ Receive AI response with medicines   │
        │ Display:                             │
        │ • AI Analysis & Confidence           │
        │ • Medicine list with details         │
        │ • Lifestyle advice                   │
        └─────────────────────────────────────┘
                              ↓
    ┌──────────────────────────────────────┐
    │ User clicks [+ Add] on medicines     │
    │ → Adds to cart with quantity=1       │
    │ → Shows success toast                │
    │ → Can add multiple from same results │
    └──────────────────────────────────────┘
                              ↓
      ┌────────────────────────────────────┐
      │ User proceeds to Checkout           │
      │ Same billing flow as regular mode   │
      └────────────────────────────────────┘
```

---

## Key Features

✅ **Smart Embedding System** - Semantic search using embeddings  
✅ **Loading States** - Clear feedback during AI processing  
✅ **Safety Warnings** - Reminds users to verify with pharmacist  
✅ **Confidence Scores** - Shows how confident AI is about recommendations  
✅ **Side Effects Display** - Important safety information  
✅ **Usage Instructions** - Dosage and administration details  
✅ **One-Click Add** - Quick adding of medicines to cart  
✅ **Dismissible Alerts** - Users can clear notifications  
✅ **Offline Graceful Degradation** - Works with regular search if AI fails  

---

## Error Handling

```
Scenario 1: Embeddings not ready
→ Shows "Preparing AI..." button state
→ textarea is disabled until ready
→ If timeout, shows error alert

Scenario 2: API request fails
→ Catches error from FastAPI
→ Displays user-friendly error message
→ Clears after 5 seconds

Scenario 3: No medicines found
→ Shows "No suitable medicines found"
→ Suggests trying different symptoms
→ Maintains UI consistency
```

---

## Backend Dependency

The AI Mode requires a **FastAPI backend** running at `process.env.NEXT_PUBLIC_FASTAPI_URL`

**Backend Responsibilities:**
1. ✅ Generate/load medicine embeddings on startup
2. ✅ Implement semantic search using embeddings
3. ✅ Generate AI analysis of symptoms
4. ✅ Calculate confidence score
5. ✅ Return structured medicine recommendations
6. ✅ Provide lifestyle advice

**Frontend Notifications:**
- Frontend checks `localStorage.embedding_ready` to know backend status
- Backend must update localStorage when ready
- Frontend polls every 5 seconds while checking

