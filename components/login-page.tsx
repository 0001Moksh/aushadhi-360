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
        
        // Redirect based on role
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
        router.push("/dashboard")
      } else {
        setError("Unable to connect to server. Please check your internet connection.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Left side - Branding */}
        <div className="hidden lg:block">
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-primary/10 to-accent/10 p-12">
            <img
              src="/ayurvedic-herbs-mortar-pestle-medical-leaves-natur.jpg"
              alt="Aushadhi 360 Branding"
              className="w-full h-full object-cover rounded-xl"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/60 to-transparent flex items-end p-12">
              <div className="text-white">
                <h1 className="text-5xl font-bold mb-4 text-balance">
                  NYT
                  <br />
                  Aushadhi 360
                </h1>
                <p className="text-xl text-pretty opacity-90">Complete Medical Store Management</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Login form */}
        <Card className="p-8 lg:p-12 bg-card/80 backdrop-blur">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-balance mb-2">Welcome Back</h2>
            <p className="text-muted-foreground text-pretty">Sign in to access your medical store dashboard</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full h-12 text-base" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>

            <div className="pt-4 text-center text-sm text-muted-foreground">
              <p>Demo credentials: demo@aushadhi360.com / demo123</p>
              <p className="mt-2">
                Don't have an account?{" "}
                <a href="/register" className="text-primary hover:underline">
                  Request Access
                </a>
              </p>
              <p className="mt-2 text-xs">Admin: Use admin credentials for system administrator access</p>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}
