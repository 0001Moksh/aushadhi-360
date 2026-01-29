# NEXT_PUBLIC_FASTAPI_URL Integration Guide

## Overview
This guide explains how to configure and use the `NEXT_PUBLIC_FASTAPI_URL` environment variable to connect your Next.js frontend to the FastAPI backend API.

---

## 🔧 Setup

### 1. Create `.env.local` file
Create a `.env.local` file in your project root:

```bash
# Copy from example
cp .env.local.example .env.local
```

### 2. Configure NEXT_PUBLIC_FASTAPI_URL
Edit `.env.local` and set the FastAPI backend URL:

```env
NEXT_PUBLIC_FASTAPI_URL=http://localhost:8000
```

**Important Options:**
| Environment | URL | Notes |
|---|---|---|
| **Local Development** | `http://localhost:8000` | FastAPI running on your machine |
| **Docker Local** | `http://fastapi:8000` | FastAPI running in Docker container |
| **Vercel Production** | `https://api.aushadhi360.com` | Production FastAPI server |
| **Staging** | `https://staging-api.aushadhi360.com` | Staging FastAPI server |

### 3. Restart Next.js Development Server
```bash
npm run dev
# or
yarn dev
```

The environment variable will be available in your frontend code via:
```typescript
process.env.NEXT_PUBLIC_FASTAPI_URL
```

---

## 📝 Using FastAPI Service Module

### Import the Service
```typescript
import { 
  searchMedicines, 
  loginUser, 
  getEmbeddingStatus, 
  rebuildEmbeddings,
  FastAPIError 
} from "@/lib/fastapi-service"
```

### Example 1: Login User
```typescript
try {
  const response = await loginUser("user@example.com", "password123")
  console.log("Login successful:", response)
  // response.embedding_status will be "pending", "ready", or "failed"
} catch (error) {
  if (error instanceof FastAPIError) {
    console.error(`Error ${error.statusCode}: ${error.detail}`)
  }
}
```

### Example 2: Search Medicines
```typescript
try {
  const results = await searchMedicines(
    "fever and cough",  // query
    "user@example.com", // email
    "password123"       // password
  )
  
  console.log("AI Response:", results["AI Response"])
  console.log("Medicines:", results.Medicines)
} catch (error) {
  if (error instanceof FastAPIError) {
    if (error.statusCode === 503) {
      console.log("Embeddings still being prepared...")
    } else if (error.statusCode === 404) {
      console.log("No medicines found")
    }
  }
}
```

### Example 3: Check Embedding Status
```typescript
try {
  const status = await getEmbeddingStatus("user@example.com")
  
  if (status.status === "ready") {
    console.log("Ready for semantic search!")
  } else if (status.status === "pending") {
    console.log("Embeddings building...")
  }
} catch (error) {
  console.error("Failed to check status:", error)
}
```

### Example 4: Rebuild Embeddings
```typescript
try {
  const result = await rebuildEmbeddings("user@example.com")
  console.log(result.message)
  // Auto-detects if medicines changed
  // Skips if no changes, rebuilds if changed
} catch (error) {
  console.error("Rebuild failed:", error)
}
```

---

## 🛡️ Error Handling

All FastAPI service functions throw `FastAPIError` on failure:

```typescript
import { FastAPIError } from "@/lib/fastapi-service"

try {
  await searchMedicines(query, email, password)
} catch (error) {
  if (error instanceof FastAPIError) {
    // Handle known API errors
    switch (error.statusCode) {
      case 401:
        console.log("Invalid credentials")
        break
      case 404:
        console.log("User or medicines not found")
        break
      case 500:
        console.log("Server error:", error.detail)
        break
      case 503:
        console.log("Service temporarily unavailable")
        break
      default:
        console.log(`Error ${error.statusCode}: ${error.detail}`)
    }
  } else if (error instanceof Error) {
    // Network or other errors
    console.log("Network error:", error.message)
  }
}
```

### Common Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| **200** | Success | Continue normally |
| **400** | Bad Request | Check input parameters |
| **401** | Invalid Credentials | Ask user to re-login |
| **403** | Forbidden | User lacks permission |
| **404** | Not Found | User/medicines don't exist |
| **500** | Server Error | Show error message, retry later |
| **503** | Service Unavailable | Embeddings still building, ask user to wait |

---

## 🔍 Real-World Example: AI Medicine Recommendation

```typescript
async function getAIMedicineRecommendations(symptoms: string) {
  const email = localStorage.getItem("user_email")
  const password = localStorage.getItem("user_password")
  
  if (!email || !password) {
    throw new Error("User not authenticated")
  }

  try {
    // Search medicines using AI
    const result = await searchMedicines(symptoms, email, password)
    
    return {
      success: true,
      aiResponse: result["AI Response"],
      medicines: result.Medicines,
      instructions: result["overall instructions"]
    }
  } catch (error) {
    if (error instanceof FastAPIError) {
      if (error.statusCode === 503) {
        return {
          success: false,
          message: "AI is still loading. Please wait 30-60 seconds and try again.",
          retry: true
        }
      } else if (error.statusCode === 404) {
        return {
          success: false,
          message: "No medicines imported. Please import medicines first."
        }
      } else {
        return {
          success: false,
          message: error.detail
        }
      }
    } else {
      return {
        success: false,
        message: "Failed to connect to AI service"
      }
    }
  }
}

// Usage in React component
const handleAIAssist = async () => {
  setLoading(true)
  try {
    const result = await getAIMedicineRecommendations(symptoms)
    if (result.success) {
      setMedicines(result.medicines)
      setAIResponse(result.aiResponse)
    } else {
      setError(result.message)
      if (result.retry) {
        // Show retry button
      }
    }
  } finally {
    setLoading(false)
  }
}
```

---

## 🧪 Testing Your Configuration

### 1. Verify Environment Variable
```typescript
// In your component
useEffect(() => {
  const url = process.env.NEXT_PUBLIC_FASTAPI_URL
  console.log("FastAPI URL:", url)
  
  if (!url) {
    console.warn("⚠️ NEXT_PUBLIC_FASTAPI_URL not configured!")
  }
}, [])
```

### 2. Test Backend Connectivity
```typescript
async function testBackendConnection() {
  try {
    const url = `${process.env.NEXT_PUBLIC_FASTAPI_URL}/`
    const response = await fetch(url)
    const data = await response.json()
    console.log("✅ Backend is running:", data)
    return true
  } catch (error) {
    console.error("❌ Cannot connect to backend:", error)
    return false
  }
}
```

### 3. Test Login
```typescript
async function testLogin() {
  try {
    const result = await loginUser("demo@aushadhi360.com", "demo123")
    console.log("✅ Login successful:", result)
    return true
  } catch (error) {
    console.error("❌ Login failed:", error)
    return false
  }
}
```

---

## 🚀 Deployment

### Vercel / Production
```bash
# Set environment variable in Vercel dashboard
# Settings → Environment Variables → NEXT_PUBLIC_FASTAPI_URL

# Then rebuild and deploy
vercel deploy
```

### Docker
```dockerfile
FROM node:18-alpine

ENV NEXT_PUBLIC_FASTAPI_URL=http://fastapi:8000

WORKDIR /app
COPY . .
RUN npm install
RUN npm run build
CMD ["npm", "start"]
```

### Railway / Other Platforms
Set `NEXT_PUBLIC_FASTAPI_URL` in environment variables during deployment.

---

## 📊 Monitoring & Debugging

### Enable API Debugging
Add to your code:

```typescript
// Enable detailed logging for all FastAPI calls
const originalFetch = window.fetch
window.fetch = async (...args) => {
  console.log("[API Call]", args[0])
  const response = await originalFetch(...args)
  console.log("[API Response]", response.status, response.statusText)
  return response
}
```

### Check Network Tab
1. Open DevTools → Network tab
2. Filter by "fastapi" or your domain
3. Check request/response headers and body

### Monitor Errors
```typescript
// Global error handler
window.addEventListener('error', (event) => {
  if (event.message.includes('fastapi') || event.message.includes('fetch')) {
    console.error("FastAPI Error:", event)
    // Send to error tracking service
  }
})
```

---

## ⚠️ Common Issues & Solutions

### Issue: `NEXT_PUBLIC_FASTAPI_URL is not configured`
**Solution:**
```bash
# Create .env.local file
echo "NEXT_PUBLIC_FASTAPI_URL=http://localhost:8000" > .env.local

# Restart dev server
npm run dev
```

### Issue: `Cannot connect to FastAPI backend`
**Check:**
1. FastAPI server is running: `http://localhost:8000/docs`
2. CORS is configured correctly in FastAPI
3. Environment variable is set correctly
4. No proxy/firewall blocking the connection

### Issue: `Embeddings not ready (503 error)`
**Solution:**
- Wait 30-60 seconds for embeddings to build
- Check if medicines are imported
- Verify MongoDB connection in FastAPI

### Issue: `401 Invalid credentials`
**Solution:**
- Verify email and password are correct
- Check if user exists in database
- Clear browser cache and localStorage

### Issue: `Cross-Origin Request Blocked`
**In FastAPI backend**, ensure CORS is enabled:
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://yourdomain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 📚 Related Files

| File | Purpose |
|------|---------|
| `lib/fastapi-service.ts` | FastAPI service module with all endpoints |
| `components/billing-page.tsx` | Example usage of FastAPI service |
| `components/login-page.tsx` | Login flow with FastAPI integration |
| `.env.local.example` | Environment variable template |

---

## 🔗 Useful Links

- **FastAPI Documentation:** https://fastapi.tiangolo.com/
- **FastAPI Backend Code:** See `scripts/main.py` or your FastAPI server
- **Next.js Env Vars:** https://nextjs.org/docs/basic-features/environment-variables
- **Fetch API:** https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API

---

## ✅ Checklist

Before deploying:
- [ ] `NEXT_PUBLIC_FASTAPI_URL` is set in `.env.local`
- [ ] FastAPI backend is running and accessible
- [ ] CORS is configured in FastAPI
- [ ] All imports use `fastapi-service.ts`
- [ ] Error handling is implemented
- [ ] Environment variable is set in production/staging
- [ ] Tested login, search, and AI features
- [ ] Network requests show correct API URLs in DevTools

---

**Last Updated:** January 29, 2026  
**Version:** 1.0
