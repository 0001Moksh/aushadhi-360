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
import { User, Bell, Shield, Database, Upload, Loader2, Download, Mail, KeyRound, Eye, FileText } from "lucide-react"

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
  invoiceColumns: ["name", "batch", "form", "qtyPerPack", "quantity", "price", "amount", "description"],
}

const invoiceColumnOptions = [
  { value: "name", label: "Medicine Name" },
  { value: "batch", label: "Batch" },
  { value: "form", label: "Form" },
  { value: "qtyPerPack", label: "Qty/Pack" },
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

  // Sample invoice data for preview
  const sampleInvoiceData = {
    invoiceNumber: "INV-2026-001",
    date: new Date().toLocaleDateString(),
    customerName: "Sample Customer",
    customerPhone: "+91 98765 43210",
    items: [
      { name: "Paracetamol 500mg", batch: "B123", form: "Tablet", qtyPerPack: "10", quantity: 10, price: 5, amount: 50, description: "Fever relief" },
      { name: "Amoxicillin 250mg", batch: "B456", form: "Capsule", qtyPerPack: "20", quantity: 20, price: 8, amount: 160, description: "Antibiotic" },
      { name: "Vitamin D3", batch: "B789", form: "Syrup", qtyPerPack: "100ml", quantity: 5, price: 15, amount: 75, description: "Supplement" },
    ],
    subtotal: 285,
    tax: 28.5,
    total: 313.5,
  }

  return (
    <div className="w-full space-y-4 sm:space-y-5 md:space-y-6">
      <div className="px-1">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-balance mb-1 sm:mb-2">Settings</h1>
        <p className="text-xs sm:text-sm text-muted-foreground text-pretty">Manage your account and application preferences</p>
      </div>

      {message && (
        <div
          className={`p-3 sm:p-4 rounded-lg border text-sm ${message.type === "success"
            ? "bg-success/10 border-success/20 text-success"
            : "bg-destructive/10 border-destructive/20 text-destructive"
            }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
        {/* Profile */}
        <Card className="p-3 sm:p-4 md:p-6 lg:col-span-2 space-y-4 sm:space-y-5 md:space-y-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <User className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
            <h2 className="text-base sm:text-lg md:text-xl font-semibold">Profile Settings</h2>
          </div>

          <div className="flex flex-col sm:flex-row items-center sm:items-center gap-3 sm:gap-4">
            <Avatar className="h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0">
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
            <Button variant="outline" className="hover:text-primary text-xs sm:text-sm w-full sm:w-auto" size="sm" onClick={handleAvatarClick}>
              <Upload className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Change Photo
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="store-name" className="text-xs sm:text-sm">Store Name</Label>
              <Input
                id="store-name"
                value={formData.storeName}
                onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="owner-name" className="text-xs sm:text-sm">Owner Name</Label>
              <Input
                id="owner-name"
                value={formData.ownerName}
                onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="email" className="text-xs sm:text-sm">Email</Label>
              <Input id="email" type="email" value={formData.email} disabled className="text-sm" />
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="phone" className="text-xs sm:text-sm">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5 sm:space-y-2 sm:col-span-2">
              <Label htmlFor="address" className="text-xs sm:text-sm">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="text-sm"
              />
            </div>
          </div>

          <Button onClick={handleSaveChanges} disabled={isSaving || !isProfileDirty} className="w-full sm:w-auto text-sm">
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
        <div className="space-y-4 sm:space-y-5 md:space-y-6">
          <Card className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5" />
                <h3 className="font-semibold">Invoice & Notifications</h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
                className="gap-2 w-full sm:w-auto"
              >
                <Eye className="h-4 w-4" />
                {showPreview ? "Hide" : "Preview"}
              </Button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="email-alerts" className="text-sm flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Alerts
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

              <div className="space-y-2">
                <Label className="text-sm">Invoice Email Template</Label>
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

              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-xs sm:text-sm">Medicine table columns</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
                  {invoiceColumnOptions.map((option) => (
                    <label key={option.value} className="flex items-center gap-2 text-xs sm:text-sm cursor-pointer hover:text-primary transition-colors">
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
                        className="flex-shrink-0"
                      />
                      <span className="truncate">{option.label}</span>
                    </label>
                  ))}
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  These columns will appear in invoice emails and exports.
                </p>
              </div>

              {/* Invoice Preview */}
              {showPreview && (
                <Card className="p-3 sm:p-4 bg-muted/30 space-y-3 border-2 border-primary/20">
                  {/* Title */}
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <FileText className="h-4 w-4" />
                    Live Preview
                  </div>

                  {/* Preview Box */}
                  <div className="bg-background p-3 sm:p-4 rounded-lg text-xs space-y-4 border">

                    {/* Header */}
                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-start pb-2 border-b">
                      <div>
                        <h4 className="font-bold text-sm">
                          {formData.storeName || "Your Store Name"}
                        </h4>

                        {preferences.invoiceTemplate !== "minimal" && (
                          <>
                            <p className="text-muted-foreground">
                              {formData.ownerName || "Owner Name"}
                            </p>
                            <p className="text-muted-foreground">
                              {formData.phone || "Phone"}
                            </p>
                          </>
                        )}
                      </div>

                      <div className="w-full sm:w-auto flex justify-between sm:flex-col sm:items-end text-xs">
                        <p className="font-semibold">
                          Invoice #{sampleInvoiceData.invoiceNumber}
                        </p>
                        <p className="text-muted-foreground">
                          {sampleInvoiceData.date}
                        </p>
                      </div>
                    </div>

                    {/* Customer Info */}
                    {preferences.invoiceTemplate !== "minimal" ? (
                      <div className="space-y-1">
                        <p className="font-semibold">Bill To:</p>
                        <p>{sampleInvoiceData.customerName}</p>
                        <p className="text-muted-foreground">
                          {sampleInvoiceData.customerPhone}
                        </p>
                      </div>
                    ) : (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Customer</span>
                        <span className="font-medium">
                          {sampleInvoiceData.customerName}
                        </span>
                      </div>
                    )}

                    {/* ================= MOBILE ITEM CARDS ================= */}
                    <div className="block sm:hidden space-y-2">
                      {sampleInvoiceData.items.slice(0, 2).map((item, idx) => (
                        <div key={idx} className="border rounded p-2">
                          <p className="font-medium">{item.name}</p>
                          <div className="flex justify-between text-muted-foreground text-xs">
                            <span>Qty: {item.quantity}</span>
                            <span>₹{item.amount}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* ================= DESKTOP / TABLET TABLE ================= */}
                    <div className="hidden sm:block space-y-2">
                      <p className="font-semibold text-xs">Items</p>

                      <div className="border rounded overflow-x-auto -mx-3 sm:mx-0">
                        <table className="w-full text-xs min-w-[600px]">
                          <thead className="bg-muted">
                            <tr>
                              {preferences.invoiceColumns.includes("name") && (
                                <th className="text-left p-2">Medicine</th>
                              )}

                              {preferences.invoiceColumns.includes("batch") &&
                                preferences.invoiceTemplate === "detailed" && (
                                  <th className="hidden md:table-cell text-left p-2">
                                    Batch
                                  </th>
                                )}

                              {preferences.invoiceColumns.includes("form") &&
                                preferences.invoiceTemplate !== "minimal" && (
                                  <th className="hidden sm:table-cell text-left p-2">
                                    Form
                                  </th>
                                )}

                              {preferences.invoiceColumns.includes("qtyPerPack") &&
                                preferences.invoiceTemplate !== "minimal" && (
                                  <th className="hidden lg:table-cell text-center p-2">
                                    Qty/Pack
                                  </th>
                                )}

                              {preferences.invoiceColumns.includes("quantity") && (
                                <th className="text-center p-2">Qty</th>
                              )}

                              {preferences.invoiceColumns.includes("price") && (
                                <th className="hidden sm:table-cell text-right p-2">
                                  Price
                                </th>
                              )}

                              {preferences.invoiceColumns.includes("amount") && (
                                <th className="text-right p-2">Amount</th>
                              )}

                              {preferences.invoiceColumns.includes("description") &&
                                preferences.invoiceTemplate !== "minimal" && (
                                  <th className="hidden lg:table-cell text-left p-2">
                                    Description
                                  </th>
                                )}
                            </tr>
                          </thead>

                          <tbody>
                            {sampleInvoiceData.items
                              .slice(0, preferences.invoiceTemplate === "minimal" ? 2 : 3)
                              .map((item, idx) => (
                                <tr key={idx} className="border-t">
                                  {preferences.invoiceColumns.includes("name") && (
                                    <td className="p-2">{item.name}</td>
                                  )}

                                  {preferences.invoiceColumns.includes("batch") &&
                                    preferences.invoiceTemplate === "detailed" && (
                                      <td className="hidden md:table-cell p-2 text-muted-foreground">
                                        {item.batch}
                                      </td>
                                    )}

                                  {preferences.invoiceColumns.includes("form") &&
                                    preferences.invoiceTemplate !== "minimal" && (
                                      <td className="hidden sm:table-cell p-2 text-muted-foreground">
                                        {item.form}
                                      </td>
                                    )}

                                  {preferences.invoiceColumns.includes("qtyPerPack") &&
                                    preferences.invoiceTemplate !== "minimal" && (
                                      <td className="hidden lg:table-cell p-2 text-center text-muted-foreground">
                                        {item.qtyPerPack}
                                      </td>
                                    )}

                                  {preferences.invoiceColumns.includes("quantity") && (
                                    <td className="p-2 text-center">
                                      {item.quantity}
                                    </td>
                                  )}

                                  {preferences.invoiceColumns.includes("price") && (
                                    <td className="hidden sm:table-cell p-2 text-right">
                                      ₹{item.price}
                                    </td>
                                  )}

                                  {preferences.invoiceColumns.includes("amount") && (
                                    <td className="p-2 text-right font-medium">
                                      ₹{item.amount}
                                    </td>
                                  )}

                                  {preferences.invoiceColumns.includes("description") &&
                                    preferences.invoiceTemplate !== "minimal" && (
                                      <td className="hidden lg:table-cell p-2 text-muted-foreground">
                                        {item.description}
                                      </td>
                                    )}
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Totals */}
                    <div className="space-y-1 pt-3 border-t text-sm">
                      {preferences.invoiceTemplate === "detailed" && (
                        <>
                          <div className="flex justify-between text-muted-foreground">
                            <span>Subtotal</span>
                            <span>₹{sampleInvoiceData.subtotal}</span>
                          </div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>Tax (10%)</span>
                            <span>₹{sampleInvoiceData.tax}</span>
                          </div>
                        </>
                      )}

                      <div className="flex justify-between font-bold text-base pt-1 border-t">
                        <span>Total</span>
                        <span>₹{sampleInvoiceData.total}</span>
                      </div>
                    </div>

                    {/* Footer */}
                    {preferences.invoiceTemplate === "detailed" && (
                      <div className="pt-2 border-t text-center text-muted-foreground">
                        Thank you for your business!
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground italic">
                    This preview updates in real-time as you change settings above.
                  </p>
                </Card>
              )}


              <Button onClick={handleSavePreferences} disabled={isPrefSaving || !isPreferencesDirty} className="w-full">
                {isPrefSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Invoice & Notification Settings"
                )}
              </Button>
            </div>
          </Card>

          <Card className="p-4 sm:p-6 space-y-4">
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

          <Card className="p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5" />
                <h3 className="font-semibold">Security</h3>
              </div>
              <Button
                variant="outline"
                className="w-full sm:flex-1 border-r-3 rounded-lg border-b-4 justify-center"
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
              {isDemoAccount && (
                <p className="text-xs text-muted-foreground">
                  Password changes are disabled for demo@aushadhi360.com
                </p>
              )}
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
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
