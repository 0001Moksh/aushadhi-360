# Password Management Examples for Cache Invalidation

This document shows practical examples of how to provide the `userPassword` to components that need cache invalidation.

---

## Option 1: Store Password in SessionStorage During Login

**Where:** Login component

```typescript
// login-page.tsx or login context
import { useRouter } from "next/navigation"

export function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      })

      if (response.ok) {
        // Store in session (cleared when tab closes)
        sessionStorage.setItem("user_email", email)
        sessionStorage.setItem("user_password", password)
        
        // Also store in localStorage for page refresh persistence
        localStorage.setItem("user_email", email)
        // Note: Don't store password in localStorage for security
        
        router.push("/dashboard")
      }
    } catch (error) {
      console.error("Login failed:", error)
    }
  }

  return (
    <form onSubmit={handleLogin}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <button type="submit">Login</button>
    </form>
  )
}
```

**Usage in Component:**

```typescript
// products-page.tsx
export function ProductsPage() {
  useEffect(() => {
    // Retrieve password from sessionStorage when component mounts
    const storedPassword = sessionStorage.getItem("user_password")
    if (storedPassword) {
      setUserPassword(storedPassword)
    }
  }, [])

  // Rest of component...
}
```

---

## Option 2: Use Context API (Recommended)

**Create a Password Context:**

```typescript
// lib/password-context.tsx
"use client"

import { createContext, useContext, useState, ReactNode } from "react"

interface PasswordContextType {
  userPassword: string
  setUserPassword: (pwd: string) => void
  clearPassword: () => void
}

const PasswordContext = createContext<PasswordContextType | undefined>(undefined)

export function PasswordProvider({ children }: { children: ReactNode }) {
  const [userPassword, setUserPassword] = useState<string>("")

  const clearPassword = () => {
    setUserPassword("")
    sessionStorage.removeItem("user_password")
  }

  return (
    <PasswordContext.Provider value={{ userPassword, setUserPassword, clearPassword }}>
      {children}
    </PasswordContext.Provider>
  )
}

export function usePassword() {
  const context = useContext(PasswordContext)
  if (!context) {
    throw new Error("usePassword must be used within PasswordProvider")
  }
  return context
}
```

**Wrap your app:**

```typescript
// app/layout.tsx
import { PasswordProvider } from "@/lib/password-context"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <PasswordProvider>
          {children}
        </PasswordProvider>
      </body>
    </html>
  )
}
```

**Use in Login:**

```typescript
// components/login-page.tsx
import { usePassword } from "@/lib/password-context"

export function LoginPage() {
  const { setUserPassword } = usePassword()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      })

      if (response.ok) {
        localStorage.setItem("user_email", email)
        setUserPassword(password) // Store in context
        router.push("/dashboard")
      }
    } catch (error) {
      console.error("Login failed:", error)
    }
  }

  return (
    <form onSubmit={handleLogin}>
      {/* form fields */}
    </form>
  )
}
```

**Use in Components:**

```typescript
// components/products-page.tsx
import { usePassword } from "@/lib/password-context"

export function ProductsPage() {
  const { userPassword } = usePassword()
  // userPassword is automatically available!
  
  // Rest of component...
}
```

---

## Option 3: Ask User for Password When Needed

**For secure operations, prompt user to re-enter password:**

```typescript
// components/password-confirm-dialog.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useState } from "react"

interface PasswordConfirmDialogProps {
  open: boolean
  onConfirm: (password: string) => void
  onCancel: () => void
}

export function PasswordConfirmDialog({
  open,
  onConfirm,
  onCancel,
}: PasswordConfirmDialogProps) {
  const [password, setPassword] = useState("")

  const handleConfirm = () => {
    if (password) {
      onConfirm(password)
      setPassword("")
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Password</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Enter your password to refresh the medicine search index.
          </p>
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
          />
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={!password}>
              Confirm
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

**Use when deleting medicines:**

```typescript
// In products-page.tsx
const [showPasswordDialog, setShowPasswordDialog] = useState(false)
const [pendingDelete, setPendingDelete] = useState<string[] | null>(null)

const openDeleteDialog = (ids: string[]) => {
  setPendingDelete(ids)
  setShowPasswordDialog(true) // Ask for password
}

const handlePasswordConfirmed = async (password: string) => {
  if (!pendingDelete) return
  
  setUserPassword(password)
  setShowPasswordDialog(false)
  
  // Now proceed with delete
  await confirmDelete()
  setPendingDelete(null)
}

// In render:
return (
  <>
    {/* ... */}
    <PasswordConfirmDialog
      open={showPasswordDialog}
      onConfirm={handlePasswordConfirmed}
      onCancel={() => setShowPasswordDialog(false)}
    />
  </>
)
```

---

## Option 4: Pass Password as Props

**If you have a parent component managing authentication:**

```typescript
// components/dashboard-layout.tsx
export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [userPassword, setUserPassword] = useState<string>("")

  // Retrieve password from sessionStorage
  useEffect(() => {
    const pwd = sessionStorage.getItem("user_password")
    if (pwd) setUserPassword(pwd)
  }, [])

  return (
    <div>
      <ProductsPage userPassword={userPassword} />
      <ManualImportTable userPassword={userPassword} />
      {children}
    </div>
  )
}
```

**Receive in child component:**

```typescript
interface ProductsPageProps {
  userPassword: string
}

export function ProductsPage({ userPassword }: ProductsPageProps) {
  // Use userPassword directly
  
  // Rest of component...
}
```

---

## Option 5: Hybrid Approach (Recommended for Security)

**Use sessionStorage + Context:**

```typescript
// Create a secure hook
export function useSecurePassword() {
  const [password, setPassword] = useState<string>("")
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Only on client side
    const pwd = sessionStorage.getItem("user_password")
    if (pwd) {
      setPassword(pwd)
    }
    setIsReady(true)
  }, [])

  const updatePassword = (newPwd: string) => {
    setPassword(newPwd)
    sessionStorage.setItem("user_password", newPwd)
  }

  const clearPassword = () => {
    setPassword("")
    sessionStorage.removeItem("user_password")
  }

  return { password, updatePassword, clearPassword, isReady }
}
```

**Use in any component:**

```typescript
export function ProductsPage() {
  const { password: userPassword } = useSecurePassword()

  // Rest of component...
}
```

---

## Best Practices Summary

| Approach | Security | Ease | When to Use |
|----------|----------|------|------------|
| SessionStorage | ⭐⭐⭐ | ⭐⭐⭐⭐ | Default choice |
| Context API | ⭐⭐⭐⭐ | ⭐⭐⭐ | Large apps with state management |
| Password Dialog | ⭐⭐⭐⭐⭐ | ⭐⭐ | Sensitive operations only |
| Props | ⭐⭐⭐ | ⭐⭐⭐⭐ | Small component trees |
| Hybrid | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Production applications |

---

## Implementation Checklist

- [ ] Choose password management approach
- [ ] Implement password storage in login
- [ ] Ensure HTTPS in production
- [ ] Add password to components using cache invalidation
  - [ ] products-page.tsx
  - [ ] manual-import-table.tsx
  - [ ] import-medicine-page.tsx
- [ ] Test cache invalidation end-to-end
- [ ] Add security audit (no password logging)
- [ ] Handle session timeout gracefully
- [ ] Clear password on logout

---

## Security Checklist

```typescript
// ✅ DO:
sessionStorage.setItem("user_password", pwd)  // Session only
// Automatic cleanup when tab closes

invalidateCacheWithFeedback(email, pwd, ...)  // Use for invalidation
// Graceful degradation if it fails

// ❌ DON'T:
localStorage.setItem("password", pwd)         // Persistent = risky!
console.log(password)                         // NEVER log
window.password = pwd                         // Global = risky!
```

---

## Testing Password Storage

```typescript
// Test in browser console:

// Check sessionStorage
sessionStorage.getItem("user_password")  // Should show password after login

// Check it's cleared on logout
sessionStorage.removeItem("user_password")
sessionStorage.getItem("user_password")  // Should be null

// Check it's cleared when tab closes
// (Open devtools → Application → SessionStorage)
// Close the tab → sessionStorage is cleared
```

