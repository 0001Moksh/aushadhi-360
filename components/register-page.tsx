"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { Loader2, UserPlus, CheckCircle } from "lucide-react"
import Link from "next/link"

export function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: "",
    storeName: "",
    email: "",
    phone: "",
    address: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    // Validation
    if (!formData.name || !formData.storeName || !formData.email) {
      setError("Please fill in all required fields")
      setIsLoading(false)
      return
    }

    if (!formData.email.includes("@")) {
      setError("Please enter a valid email address")
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(true)
        setTimeout(() => {
          router.push("/")
        }, 3000)
      } else {
        setError(data.message || "Registration failed. Please try again.")
      }
    } catch (err) {
      setError("Unable to submit request. Please check your connection.")
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
        <Card className="p-8 max-w-md w-full text-center bg-card/80 backdrop-blur">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-2">Request Submitted!</h2>
          <p className="text-muted-foreground mb-4">
            Your registration request has been sent to the admin. You will receive an email with your login credentials
            once your account is approved.
          </p>
          <p className="text-sm text-muted-foreground">Redirecting to login page...</p>
        </Card>
      </div>
    )
  }

return (
  <div
    className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-cover bg-center bg-no-repeat"
    style={{ backgroundImage: "url('/login_bg_img.png')" }}
  >
    {/* Overlay */}
    <div className="absolute inset-0 bg-black/50" />

    {/* Register Card */}
    <Card
      className="
        relative z-10 w-full max-w-md
        p-6 sm:p-8 lg:p-10
        bg-card/80 backdrop-blur-xl
        shadow-2xl rounded-2xl
      "
    >
      {/* Header */}
      <div className="mb-6 sm:mb-2 text-center">
        <img
          src="/logo2.png"
          alt="Aushadhi 360 Logo"
          className="h-14 sm:h-16 mx-auto mb-3 sm:mb-2 object-contain"
        />
        <h2 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">
          Request Access
        </h2>
        {/* <p className="text-sm sm:text-base text-muted-foreground">
          Register your medical store to get started
        </p> */}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">
            Your Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            placeholder="John Doe"
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="storeName">
            Medical Store Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="storeName"
            placeholder="ABC Medical Store"
            value={formData.storeName}
            onChange={(e) =>
              setFormData({ ...formData, storeName: e.target.value })
            }
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">
            Email Address <span className="text-destructive">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="your@email.com"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            placeholder="+91 9876543210"
            value={formData.phone}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="address">Store Address</Label>
          <Input
            id="address"
            placeholder="123 Main Street, City"
            value={formData.address}
            onChange={(e) =>
              setFormData({ ...formData, address: e.target.value })
            }
          />
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
              Submitting Request...
            </>
          ) : (
            <>
              <UserPlus className="mr-2 h-5 w-5" />
              Submit Request
            </>
          )}
        </Button>

        <div className="pt-3 text-center text-xs sm:text-sm text-muted-foreground">
          <p>
            Already have an account?{" "}
            <Link href="/" className="text-primary hover:underline">
              Login here
            </Link>
          </p>
        </div>
      </form>
    </Card>
  </div>
)

}
