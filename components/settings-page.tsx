"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { User, Bell, Shield, Database, Upload, Loader2 } from "lucide-react"

interface UserProfile {
  email: string
  storeName: string
  ownerName: string
  phone: string
  address: string
}

export function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [formData, setFormData] = useState<UserProfile>({
    email: "",
    storeName: "",
    ownerName: "",
    phone: "",
    address: "",
  })

  useEffect(() => {
    loadUserProfile()
  }, [])

  const loadUserProfile = async () => {
    try {
      const email = localStorage.getItem("user_email")
      if (!email) {
        console.log("No user email in localStorage")
        setMessage({ type: "error", text: "Not logged in. Please login first." })
        setIsLoading(false)
        return
      }

      console.log("Loading profile for:", email)
      const response = await fetch(`/api/user/profile?email=${encodeURIComponent(email)}`)
      
      if (!response.ok) {
        console.error("Profile API response:", response.status, response.statusText)
        const errorData = await response.json().catch(() => ({}))
        console.error("Error data:", errorData)
        setMessage({ type: "error", text: `Failed to load profile: ${response.statusText}` })
        setIsLoading(false)
        return
      }

      const data = await response.json()
      console.log("Profile data loaded:", data)
      
      if (!data.user) {
        setMessage({ type: "error", text: "Invalid profile data received" })
        setIsLoading(false)
        return
      }
      
      setProfile(data.user)
      setFormData({
        email: data.user.email,
        storeName: data.user.storeName || "",
        ownerName: data.user.ownerName || "",
        phone: data.user.phone || "",
        address: data.user.address || "",
      })
    } catch (error) {
      console.error("Error loading profile:", error)
      setMessage({ type: "error", text: `Error: ${error instanceof Error ? error.message : "Unknown error"}` })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveChanges = async () => {
    setIsSaving(true)
    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        setMessage({ type: "error", text: `Failed to save: ${response.statusText}` })
        return
      }

      setMessage({ type: "success", text: "Profile updated successfully!" })
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      console.error("Error saving profile:", error)
      setMessage({ type: "error", text: `Error: ${error instanceof Error ? error.message : "Unknown error"}` })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const initials = (
    (formData.ownerName?.charAt(0) || "") + (formData.storeName?.charAt(0) || "")
  ).toUpperCase()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-balance mb-2">Settings</h1>
        <p className="text-muted-foreground text-pretty">Manage your account and application preferences</p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg border ${
            message.type === "success"
              ? "bg-success/10 border-success/20 text-success"
              : "bg-destructive/10 border-destructive/20 text-destructive"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Profile */}
        <Card className="p-6 lg:col-span-2 space-y-6">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Profile Settings</h2>
          </div>

          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src="/diverse-user-avatars.png" />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <Button variant="outline" size="sm">
              <Upload className="mr-2 h-4 w-4" />
              Change Photo
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="store-name">Store Name</Label>
              <Input
                id="store-name"
                value={formData.storeName}
                onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="owner-name">Owner Name</Label>
              <Input
                id="owner-name"
                value={formData.ownerName}
                onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={formData.email} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
          </div>

          <Button onClick={handleSaveChanges} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </Card>

        {/* Quick Actions */}
        <div className="space-y-6">
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5" />
              <h3 className="font-semibold">Notifications</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="email-alerts" className="text-sm">
                  Email Alerts
                </Label>
                <Switch id="email-alerts" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="low-stock" className="text-sm">
                  Low Stock Alerts
                </Label>
                <Switch id="low-stock" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="expiry" className="text-sm">
                  Expiry Alerts
                </Label>
                <Switch id="expiry" defaultChecked />
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5" />
              <h3 className="font-semibold">Data Management</h3>
            </div>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                Export All Data
              </Button>
              <Button variant="outline" className="w-full justify-start bg-transparent">
                Backup Database
              </Button>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5" />
              <h3 className="font-semibold">Security</h3>
            </div>
            <Button variant="outline" className="w-full justify-start bg-transparent">
              Change Password
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}
