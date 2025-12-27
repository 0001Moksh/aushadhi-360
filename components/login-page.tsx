"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { Loader2, Eye, EyeOff } from "lucide-react"

export function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    // 🔥 Clear previous embedding status
    localStorage.removeItem("embedding_ready")
    localStorage.removeItem("embedding_attempts")

    try {
      // Try login via API (handles both admin and regular users)
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (response.ok) {
        localStorage.setItem("auth_token", data.token)
        localStorage.setItem("user_email", email)
        localStorage.setItem("user_role", data.role || "user")

        // 🔥 Trigger FastAPI embedding preparation with retry logic
        let attempts = 0
        const maxAttempts = 30 // 30 retries
        const retryInterval = 3000 // 3 seconds
        let embeddingReady = false

        const triggerEmbedding = async () => {
          while (attempts < maxAttempts && !embeddingReady) {
            try {
              attempts++
              console.log(`Attempting to prepare embeddings... (Attempt ${attempts}/${maxAttempts})`)
              
              const fastApiResponse = await fetch(
                `${process.env.NEXT_PUBLIC_FASTAPI_URL}/login?mail=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`,
                { method: "POST" }
              )

              if (fastApiResponse.ok) {
                const fastApiData = await fastApiResponse.json()
                if (fastApiData.status === "success") {
                  embeddingReady = true
                  localStorage.setItem("embedding_attempts", attempts.toString())
                  localStorage.setItem("embedding_ready", "true")
                  console.log(`✅ Embeddings ready! (Attempts: ${attempts})`)
                  break
                }
              }

              // If not ready, wait before retrying
              if (!embeddingReady && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, retryInterval))
              }
            } catch (err) {
              console.warn(`Attempt ${attempts} failed, retrying...`)
              if (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, retryInterval))
              }
            }
          }

          if (!embeddingReady) {
            console.warn(`⚠️ Embeddings not ready after ${attempts} attempts - FastAPI may be down`)
            localStorage.setItem("embedding_attempts", attempts.toString())
            localStorage.setItem("embedding_ready", "false")
          }
        }

        // Start embedding preparation in background
        triggerEmbedding()

        // Redirect based on role (don't wait for embedding)
        if (data.role === "admin") {
          router.push("/admin")
        } else {
          router.push("/dashboard")
        }
      } else {
        setError(data.message || "Login failed. Please check your credentials.")
      }
    } catch (err) {
      // Graceful fallback: allow demo login
      if (email === "demo@aushadhi360.com" && password === "demo123") {
        localStorage.setItem("auth_token", "demo_token")
        localStorage.setItem("user_email", email)
        localStorage.setItem("user_role", "user")

        // 🔥 Trigger FastAPI embedding preparation with retry logic for demo
        let attempts = 0
        const maxAttempts = 30
        const retryInterval = 3000
        let embeddingReady = false

        const triggerEmbedding = async () => {
          while (attempts < maxAttempts && !embeddingReady) {
            try {
              attempts++
              console.log(`Attempting to prepare embeddings... (Attempt ${attempts}/${maxAttempts})`)
              
              const fastApiResponse = await fetch(
                `${process.env.NEXT_PUBLIC_FASTAPI_URL}/login?mail=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`,
                { method: "POST" }
              )

              if (fastApiResponse.ok) {
                const fastApiData = await fastApiResponse.json()
                if (fastApiData.status === "success") {
                  embeddingReady = true
                  localStorage.setItem("embedding_attempts", attempts.toString())
                  localStorage.setItem("embedding_ready", "true")
                  console.log(`✅ Embeddings ready! (Attempts: ${attempts})`)
                  break
                }
              }

              if (!embeddingReady && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, retryInterval))
              }
            } catch (err) {
              console.warn(`Attempt ${attempts} failed, retrying...`)
              if (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, retryInterval))
              }
            }
          }

          if (!embeddingReady) {
            console.warn(`⚠️ Embeddings not ready after ${attempts} attempts - FastAPI may be down`)
            localStorage.setItem("embedding_attempts", attempts.toString())
            localStorage.setItem("embedding_ready", "false")
          }
        }

        triggerEmbedding()
        router.push("/dashboard")
      } else {
        setError("Unable to connect to server. Please check your internet connection.")
      }
    } finally {
      setIsLoading(false)
    }
  }

return (
  <div
    className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-cover bg-center bg-no-repeat"
    style={{ backgroundImage: "url('/login_bg_img.png')" }}
  >
    {/* Overlay */}
    <div className="absolute inset-0 bg-black/50" />

    {/* Login Card */}
    <Card
      className="
        relative z-10 w-full max-w-sm sm:max-w-md
        p-6 sm:p-8 lg:p-10
        bg-card/80 backdrop-blur-xl
        shadow-2xl rounded-2xl
      "
    >
      {/* Logo + Heading */}
      <div className="mb-6 sm:mb-8 text-center">
        <img
          src="/logo2.png"
          alt="Aushadhi 360 Logo"
          className="h-14 sm:h-16 mx-auto mb-3 sm:mb-4 object-contain"
        />
        <h2 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">
          Welcome Back
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground">
          Sign in to access your medical store dashboard
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleLogin} className="space-y-5 sm:space-y-6">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-11 sm:h-12"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-11 sm:h-12 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {error}
          </div>
        )}

        <Button
          type="submit"
          className="w-full h-11 sm:h-12 text-base"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign In"
          )}
        </Button>

        <div className="pt-3 text-center text-xs sm:text-sm text-muted-foreground">
          <p>Demo: demo@aushadhi360.com / demo123</p>
          <p className="mt-2">
            Don’t have an account?{" "}
            <a href="/register" className="text-primary hover:underline">
              Request Access
            </a>
          </p>
        </div>
      </form>
    </Card>
  </div>
)

}
