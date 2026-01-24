"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

interface AdminGuardProps {
  children: React.ReactNode
}

export function AdminGuard({ children }: AdminGuardProps) {
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [redirected, setRedirected] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userRole = localStorage.getItem("user_role")
        const authToken = localStorage.getItem("auth_token")
        const userEmail = localStorage.getItem("user_email")

        // Check if user is properly authenticated as admin
        if (userRole === "admin" && authToken && userEmail) {
          setIsAuthorized(true)
        } else {
          // Admin not authenticated - redirect to login
          setRedirected(true)
          router.push("/login")
        }
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router])

  // Show loading state while checking
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    )
  }

  // If not authorized and redirected, show access denied message
  if (redirected || !isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
          <p className="text-muted-foreground mt-2">You do not have permission to access this page.</p>
          <p className="text-muted-foreground text-sm mt-4">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  // Only render children if authorized
  return isAuthorized ? <>{children}</> : null
}
