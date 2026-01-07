"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

interface UserGuardProps {
  children: React.ReactNode
}

export function UserGuard({ children }: UserGuardProps) {
  const router = useRouter()
  const [isUser, setIsUser] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAuth = () => {
      const userRole = localStorage.getItem("user_role")
      const authToken = localStorage.getItem("auth_token")

      if (authToken && (userRole === "user" || userRole === "admin")) {
        setIsUser(true)
      } else {
        // Clear any invalid auth data
        localStorage.removeItem("auth_token")
        localStorage.removeItem("user_email")
        localStorage.removeItem("user_role")
        // Redirect immediately
        router.replace("/login")
      }
      setIsLoading(false)
    }

    // Only run on client side
    if (typeof window !== "undefined") {
      checkAuth()
    }
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verifying account...</p>
        </div>
      </div>
    )
  }

  if (!isUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
          <p className="text-muted-foreground mt-2">You must be signed in to view this page.</p>
          <p className="text-muted-foreground text-sm mt-4">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
