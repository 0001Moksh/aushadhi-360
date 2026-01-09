"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

interface UserGuardProps {
  children: React.ReactNode
}

export function UserGuard({ children }: UserGuardProps) {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is authenticated
    const authToken = localStorage.getItem("auth_token")
    const userEmail = localStorage.getItem("user_email")
    const userRole = localStorage.getItem("user_role")

    if (authToken && userEmail) {
      // Allow both admin and regular users
      if (userRole === "admin" || userRole === "user") {
        setIsAuthenticated(true)
      } else {
        // Invalid role, redirect to login
        router.push("/login")
      }
      setIsLoading(false)
    } else {
      // Not authenticated, redirect to login
      router.push("/login")
      setIsLoading(false)
    }
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verifying authentication...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
          <p className="text-muted-foreground mt-2">Please login to access this page.</p>
          <p className="text-muted-foreground text-sm mt-4">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
