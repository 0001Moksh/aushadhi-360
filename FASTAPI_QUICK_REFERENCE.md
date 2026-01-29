# NEXT_PUBLIC_FASTAPI_URL - Quick Reference

## 🔧 Setup (2 minutes)

```bash
# 1. Create environment file
cp .env.local.example .env.local

# 2. Open and set FastAPI URL
# .env.local:
NEXT_PUBLIC_FASTAPI_URL=http://localhost:8000

# 3. Restart dev server
npm run dev
```

---

## 📝 Common Tasks

### Import Service
```typescript
import { 
  searchMedicines, 
  loginUser, 
  FastAPIError 
} from "@/lib/fastapi-service"
```

### Login User
```typescript
try {
  const response = await loginUser("user@example.com", "pass123")
  console.log(response.embedding_status) // "pending", "ready", "failed"
} catch (error) {
  if (error instanceof FastAPIError) {
    console.error(`${error.statusCode}: ${error.detail}`)
  }
}
```

### Search Medicines
```typescript
try {
  const results = await searchMedicines(
    "fever",              // query
    "user@example.com",   // email
    "password"            // password
  )
  console.log(results.Medicines)
} catch (error) {
  if (error instanceof FastAPIError) {
    if (error.statusCode === 503) alert("Please wait, embeddings loading...")
    if (error.statusCode === 404) alert("No medicines found")
  }
}
```

### Check Status
```typescript
const status = await getEmbeddingStatus("user@example.com")
// status.status === "ready" | "pending" | "failed" | "not_found"
```

### Rebuild Embeddings
```typescript
const result = await rebuildEmbeddings("user@example.com")
console.log(result.message) // Shows if skipped or rebuilt
```

---

## 🛠️ Environment Variables

```env
# REQUIRED - FastAPI backend URL
NEXT_PUBLIC_FASTAPI_URL=http://localhost:8000

# Optional - API routes prefix
NEXT_PUBLIC_API_URL=/api

# Optional - Other services
GROQ_API_KEY=your_key_here
DATABASE_URL=mongodb://...
```

---

## ⚠️ Error Handling

```typescript
import { FastAPIError } from "@/lib/fastapi-service"

try {
  await searchMedicines(query, email, password)
} catch (error) {
  if (error instanceof FastAPIError) {
    switch (error.statusCode) {
      case 401: // Invalid credentials
      case 404: // Not found
      case 500: // Server error
      case 503: // Embeddings building
      default:
        console.error(error.detail)
    }
  } else {
    console.error("Network error:", error.message)
  }
}
```

---

## 📋 Endpoints

| Function | URL |
|----------|-----|
| Login | `POST /login` |
| Search | `GET /get_medicines` |
| Status | `GET /embeddings/status/{user_id}` |
| Rebuild | `POST /embeddings/rebuild/{user_id}` |

---

## ✅ Checklist

- [ ] `.env.local` created
- [ ] `NEXT_PUBLIC_FASTAPI_URL` set
- [ ] Dev server restarted
- [ ] FastAPI backend running
- [ ] Login works
- [ ] Search works
- [ ] Error handling works

---

## 🔗 Files

- [Full Guide](./FASTAPI_INTEGRATION_GUIDE.md)
- [Summary](./FASTAPI_INTEGRATION_SUMMARY.md)
- [Service](./lib/fastapi-service.ts)
- [Example: billing-page.tsx](./components/billing-page.tsx)
- [Example: ai-assist-page.tsx](./components/ai-assist-page.tsx)

---

**Updated:** January 29, 2026
