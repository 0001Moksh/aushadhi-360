"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { User, Bell, Shield, Database, Upload, Loader2, Download, Mail, KeyRound, Eye, X } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

interface UserProfile {
  email: string
  storeName: string
  ownerName: string
  phone: string
  address: string
  photoUrl?: string
}

type InvoiceTemplate = "detailed" | "compact" | "minimal"

interface Preferences {
  notifications: { emailAlerts: boolean }
  invoiceTemplate: InvoiceTemplate
  invoiceColumns: string[]
}

const defaultPreferences: Preferences = {
  notifications: { emailAlerts: true },
  invoiceTemplate: "detailed",
  invoiceColumns: ["name", "batch", "quantity", "price", "amount", "description"],
}

const invoiceColumnOptions = [
  { value: "name", label: "Medicine Name" },
  { value: "batch", label: "Batch" },
  { value: "quantity", label: "Quantity" },
  { value: "price", label: "Unit Price" },
  { value: "amount", label: "Line Total" },
  { value: "description", label: "Description" },
]

export function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isPrefSaving, setIsPrefSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [exportStatus, setExportStatus] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [formData, setFormData] = useState<UserProfile>({
    email: "",
    storeName: "",
    ownerName: "",
    phone: "",
    address: "",
    photoUrl: "",
  })
  const [originalProfile, setOriginalProfile] = useState<UserProfile | null>(null)
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences)
  const [originalPreferences, setOriginalPreferences] = useState<Preferences>(defaultPreferences)
  const [exportDataset, setExportDataset] = useState("billing")
  const [exporting, setExporting] = useState(false)
  const [otpCode, setOtpCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [otpSending, setOtpSending] = useState(false)
  const [otpVerifying, setOtpVerifying] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const hasLoadedProfile = useRef(false)

  useEffect(() => {
    if (hasLoadedProfile.current) return
    hasLoadedProfile.current = true
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
        photoUrl: data.user.photoUrl || "",
      })
      setOriginalProfile({
        email: data.user.email,
        storeName: data.user.storeName || "",
        ownerName: data.user.ownerName || "",
        phone: data.user.phone || "",
        address: data.user.address || "",
        photoUrl: data.user.photoUrl || "",
      })
      await loadPreferences(data.user.email)
    } catch (error) {
      console.error("Error loading profile:", error)
      setMessage({ type: "error", text: `Error: ${error instanceof Error ? error.message : "Unknown error"}` })
    } finally {
      setIsLoading(false)
    }
  }

  const loadPreferences = async (email: string) => {
    try {
      const res = await fetch(`/api/user/preferences?email=${encodeURIComponent(email)}`)
      if (!res.ok) {
        console.warn("Failed to load preferences", res.status)
        return
      }

      const data = await res.json()
      const merged = { ...defaultPreferences, ...(data.preferences || {}) }
      setPreferences(merged)
      setOriginalPreferences(merged)
    } catch (error) {
      console.warn("Error loading preferences", error)
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

      setProfile({ ...formData })
      setOriginalProfile({ ...formData })
      setMessage({ type: "success", text: "Profile updated successfully!" })
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      console.error("Error saving profile:", error)
      setMessage({ type: "error", text: `Error: ${error instanceof Error ? error.message : "Unknown error"}` })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSavePreferences = async () => {
    setIsPrefSaving(true)
    try {
      const res = await fetch("/api/user/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email, preferences }),
      })

      if (!res.ok) {
        setMessage({ type: "error", text: "Failed to save preferences" })
        return
      }

      setMessage({ type: "success", text: "Preferences saved" })
      setOriginalPreferences(preferences)
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      console.error("Error saving preferences", error)
      setMessage({ type: "error", text: "Error saving preferences" })
    } finally {
      setIsPrefSaving(false)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    setExportStatus(null)
    try {
      const res = await fetch(
        `/api/export?dataset=${encodeURIComponent(exportDataset)}&email=${encodeURIComponent(formData.email)}`,
      )

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        setExportStatus({ type: "error", text: errorData.message || "Export failed" })
        return
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      const safeDate = new Date().toISOString().replace(/[:]/g, "-")
      const isZip = exportDataset === "all"
      link.href = url
      link.download = `export-data-from-aushadhi360-${safeDate}-${exportDataset}.${isZip ? "zip" : "xlsx"}`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      setExportStatus({ type: "success", text: "Export ready. Download started." })
    } catch (error) {
      console.error("Error exporting data", error)
      setExportStatus({ type: "error", text: "Export failed" })
    } finally {
      setExporting(false)
    }
  }

  const isDemoAccount = formData.email?.toLowerCase() === "demo@aushadhi360.com"

  const isProfileDirty = useMemo(() => {
    return JSON.stringify(formData) !== JSON.stringify(originalProfile)
  }, [formData, originalProfile])

  const isPreferencesDirty = useMemo(() => {
    return JSON.stringify(preferences) !== JSON.stringify(originalPreferences)
  }, [preferences, originalPreferences])

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result?.toString()
      if (result) {
        setFormData((prev) => ({ ...prev, photoUrl: result }))
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSendOtp = async () => {
    setOtpSending(true)
    setMessage(null)
    try {
      const res = await fetch("/api/user/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email, action: "send-otp" }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage({ type: "error", text: data.message || "Failed to send OTP" })
        return
      }

      setMessage({ type: "success", text: data.message || "OTP sent" })
    } catch (error) {
      console.error("Error sending OTP", error)
      setMessage({ type: "error", text: "Failed to send OTP" })
    } finally {
      setOtpSending(false)
    }
  }

  const handleResetPassword = async () => {
    setOtpVerifying(true)
    setMessage(null)
    try {
      const res = await fetch("/api/user/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email, action: "reset", otp: otpCode, newPassword }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage({ type: "error", text: data.message || "Password update failed" })
        return
      }

      setMessage({ type: "success", text: data.message || "Password updated" })
      setNewPassword("")
      setOtpCode("")
    } catch (error) {
      console.error("Error updating password", error)
      setMessage({ type: "error", text: "Password update failed" })
    } finally {
      setOtpVerifying(false)
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
          className={`fixed top-6 left-1/2 -translate-x-1/2 z-10 p-4 rounded-lg border ${message.type === "success"
            ? "bg-success/50 border-success/20 text-foregrounf"
            : "bg-destructive/50 border-destructive/20 text-foreground"
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
              <AvatarImage src={formData.photoUrl || "/diverse-user-avatars.png"} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <Button variant="outline" className="hover:text-primary" size="sm" onClick={handleAvatarClick}>
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

          <Button onClick={handleSaveChanges} disabled={isSaving || !isProfileDirty}>
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

        {/* Invoice Template Preview Dialog */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader className="text-center justify-between flex">
              <DialogTitle>Invoice Email Preview</DialogTitle>
              <DialogDescription>
                Template: <span className="font-medium capitalize">{preferences.invoiceTemplate}</span>
              </DialogDescription>
            </DialogHeader>
            <div className="border rounded-lg p-6 bg-background text-foreground">
              <div className="space-y-4">
                {/* Email header */}
                <div className="border-b pb-4">
                  <h2 className="text-xl font-bold">{formData.storeName || "Your Medical Store"}</h2>
                  <p className="text-sm text-gray-600">Invoice for Customer</p>
                  <p className="text-xs text-gray-500">Date: {new Date().toLocaleDateString()}</p>
                </div>

                {/* Customer details (detailed & compact) */}
                {preferences.invoiceTemplate !== "minimal" && (
                  <div className="border-b pb-4">
                    <h3 className="font-semibold mb-2">Customer Information</h3>
                    <p className="text-sm text-gray-600">Name: Customer Name</p>
                    <p className="text-sm text-gray-600">Phone: +91 98765 43210</p>
                  </div>
                )}

                {/* Items table */}
                <div>
                  <h3 className="font-semibold mb-2">Items</h3>
                  <table className="w-full text-sm border">
                    <thead className="bg-background-100">
                      <tr>
                        {preferences.invoiceColumns.includes("name") && <th className="border p-2 text-left">Medicine</th>}
                        {preferences.invoiceColumns.includes("batch") && preferences.invoiceTemplate === "detailed" && <th className="border p-2">Batch</th>}
                        {preferences.invoiceColumns.includes("quantity") && <th className="border p-2">Qty</th>}
                        {preferences.invoiceColumns.includes("price") && <th className="border p-2">Price</th>}
                        {preferences.invoiceColumns.includes("amount") && <th className="border p-2">Total</th>}
                        {preferences.invoiceColumns.includes("description") && <th className="border p-2 text-left">Description</th>}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        {preferences.invoiceColumns.includes("name") && <td className="border p-2">Paracetamol 500mg</td>}
                        {preferences.invoiceColumns.includes("batch") && preferences.invoiceTemplate === "detailed" && <td className="border p-2 text-center">B123</td>}
                        {preferences.invoiceColumns.includes("quantity") && <td className="border p-2 text-center">2</td>}
                        {preferences.invoiceColumns.includes("price") && <td className="border p-2 text-center">₹50</td>}
                        {preferences.invoiceColumns.includes("amount") && <td className="border p-2 text-center">₹100</td>}
                        {preferences.invoiceColumns.includes("description") && <td className="border p-2">Pain relief tablets</td>}
                      </tr>
                      <tr>
                        {preferences.invoiceColumns.includes("name") && <td className="border p-2">Cough Syrup 100ml</td>}
                        {preferences.invoiceColumns.includes("batch") && preferences.invoiceTemplate === "detailed" && <td className="border p-2 text-center">B456</td>}
                        {preferences.invoiceColumns.includes("quantity") && <td className="border p-2 text-center">1</td>}
                        {preferences.invoiceColumns.includes("price") && <td className="border p-2 text-center">₹120</td>}
                        {preferences.invoiceColumns.includes("amount") && <td className="border p-2 text-center">₹120</td>}
                        {preferences.invoiceColumns.includes("description") && <td className="border p-2">Soothes cough and throat</td>}
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Total */}
                <div className="border-t pt-4">
                  <div className="flex justify-end">
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Subtotal: ₹220</p>
                      {preferences.invoiceTemplate === "detailed" && (
                        <>
                          <p className="text-sm text-gray-600">Tax (0%): ₹0</p>
                          <p className="text-sm text-gray-600">Discount: ₹0</p>
                        </>
                      )}
                      <p className="text-lg font-bold mt-2">Total: ₹220</p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                {preferences.invoiceTemplate !== "minimal" && (
                  <div className="text-center text-xs text-gray-500 pt-4 border-t">
                    <p>Thank you for your business!</p>
                    <p>{formData.address || "Store Address"} | {formData.phone || "Phone"}</p>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Quick Actions */}
        <div className="space-y-6">


          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5" />
              <h3 className="font-semibold">Data Management</h3>
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-sm">Export dataset</Label>
                <Select value={exportDataset} onValueChange={setExportDataset}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose dataset" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="billing">Billing (customer data)</SelectItem>
                    <SelectItem value="medicines">Medicine data</SelectItem>
                    <SelectItem value="users">User profile</SelectItem>
                    {/* <SelectItem value="all">Everything (profile + billing + medicines)</SelectItem> */}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                className="w-full justify-center"
                onClick={handleExport}
                disabled={exporting}
              >
                {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Export Data
              </Button>
              {exportStatus && (
                <p
                  className={`text-sm ${exportStatus.type === "success" ? "text-success" : "text-destructive"
                    }`}
                >
                  {exportStatus.text}
                </p>
              )}
            </div>
          </Card>

          <Card className="p-4 space-y-2">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5" />
              <h3 className="font-semibold">Security</h3>
              <Button
                variant="outline"
                className="flex-1 border-r-3 rounded-lg border-b-4 justify-center"
                onClick={handleSendOtp}
                disabled={otpSending || isDemoAccount}
              >
                {otpSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending OTP
                  </>
                ) : (
                  <>
                    <KeyRound className="mr-2 h-4 w-4" />
                    Send OTP
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-3">

              <div className="space-y-2">
                <Label htmlFor="otp">OTP Code</Label>
                <Input
                  id="otp"
                  placeholder="Enter 6-digit code"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  disabled={otpSending || otpVerifying || isDemoAccount}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={otpSending || otpVerifying || isDemoAccount}
                />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">

                <Button
                  className="flex-1 justify-center"
                  onClick={handleResetPassword}
                  disabled={otpVerifying || !otpCode || !newPassword || isDemoAccount}
                >
                  {otpVerifying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating
                    </>
                  ) : (
                    "Update Password"
                  )}
                </Button>
                {isDemoAccount && (
                  <p className="text-xs text-muted-foreground">
                    Password changes are disabled for demo@aushadhi360.com
                  </p>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5" />
              <h3 className="font-semibold">Notifications</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="email-alerts" className="text-sm flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Send Invoice Email 
                </Label>
                <Switch
                  id="email-alerts"
                  checked={preferences.notifications.emailAlerts}
                  onCheckedChange={(val) =>
                    setPreferences((prev) => ({
                      ...prev,
                      notifications: { ...prev.notifications, emailAlerts: Boolean(val) },
                    }))
                  }
                />
              </div>
            </div>

          </Card>
          <Card className="p-6 space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Invoice Email Template</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPreview(true)}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Preview
                  </Button>
                </div>
                <Select
                  value={preferences.invoiceTemplate}
                  onValueChange={(val) => setPreferences((prev) => ({ ...prev, invoiceTemplate: val as InvoiceTemplate }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="detailed">Detailed (all fields)</SelectItem>
                    <SelectItem value="compact">Compact (essentials only)</SelectItem>
                    <SelectItem value="minimal">Minimal (customer + totals)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Medicine table columns</Label>
                <div className="grid grid-cols-2 gap-2">
                  {invoiceColumnOptions.map((option) => (
                    <label key={option.value} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={preferences.invoiceColumns.includes(option.value)}
                        onCheckedChange={(checked) => {
                          setPreferences((prev) => {
                            const isChecked = checked === true
                            const nextColumns = isChecked
                              ? Array.from(new Set([...prev.invoiceColumns, option.value]))
                              : prev.invoiceColumns.filter((col) => col !== option.value)
                            return { ...prev, invoiceColumns: nextColumns }
                          })
                        }}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  These columns will appear in invoice emails and exports.
                </p>
              </div>

              <Button onClick={handleSavePreferences} disabled={isPrefSaving || !isPreferencesDirty} className="w-full">
                {isPrefSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Notification & Invoice Settings"
                )}
              </Button>
            </div>
          </Card>
        </div>
      </div>


    </div>
  )
}
