"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { UserPlus, Mail, Trash2, Shield, CheckCircle, XCircle, AlertCircle, UserCheck, Bell, FileText, Link as LinkIcon, Plus, Download, RefreshCw, PauseCircle, PlayCircle, MoreHorizontal } from "lucide-react"

interface User {
  id: string | number
  email: string
  name: string
  storeName?: string
  ownerName?: string
  phone?: string
  address?: string
  approved: boolean
  status?: "active" | "paused" | "pending"
  role?: string
  createdAt?: string
  lastLogin?: string | null
  groqKeyImport?: string
  groqKeyAssist?: string
  totalMedicines?: number
  totalCustomers?: number
  revenue?: number
}

interface RegistrationRequest {
  _id: string
  name: string
  storeName: string
  email: string
  phone: string
  address: string
  status: string
  createdAt: string
}

interface UserDocument {
  _id?: string
  userId: string | number
  documentName: string
  documentType: string
  driveUrl: string
  uploadedAt?: string
}

interface UserStats {
  totalMedicines: number
  totalCustomers: number
  revenue: number
  expired?: number
  expiring?: number
  fresh?: number
  statusImportNew?: number
}

export function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([])
  const [requests, setRequests] = useState<RegistrationRequest[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(true)
  const [isLoadingRequests, setIsLoadingRequests] = useState(true)
  const [keyDrafts, setKeyDrafts] = useState<Record<string | number, { importKey: string; assistKey: string }>>({})

  // User Lookup & Documents States
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [userDocuments, setUserDocuments] = useState<UserDocument[]>([])
  const [isLoadingStats, setIsLoadingStats] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  // Document form states
  const [newDocumentName, setNewDocumentName] = useState("")
  const [newDocumentType, setNewDocumentType] = useState("")
  const [newDocumentUrl, setNewDocumentUrl] = useState("")
  const [isAddingDocument, setIsAddingDocument] = useState(false)

  const [newEmail, setNewEmail] = useState("")
  const [newName, setNewName] = useState("")
  const [newOwnerName, setNewOwnerName] = useState("")
  const [newPhone, setNewPhone] = useState("")
  const [newAddress, setNewAddress] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const normalizeStatus = (status?: string, approved?: boolean): "active" | "paused" | "pending" => {
    if (status === "active" || status === "paused" || status === "pending") return status
    return approved ? "active" : "pending"
  }

  const getStatusMeta = (status?: string) => {
    const normalized = normalizeStatus(status)
    const meta = {
      active: { label: "Active", className: "text-success border-success", icon: PlayCircle },
      paused: { label: "Paused", className: "text-warning border-warning", icon: PauseCircle },
      pending: { label: "Pending", className: "text-muted-foreground border-border", icon: AlertCircle },
    } as const
    return meta[normalized]
  }

  // Load users and requests on mount
  useEffect(() => {
    loadUsers()
    loadRequests()
  }, [])

  const loadUsers = async () => {
    setIsLoadingUsers(true)
    try {
      const response = await fetch("/api/admin/users")
      if (response.ok) {
        const data = await response.json()
        setUsers(
          data.users.map((u: any) => ({
            id: u._id,
            email: u.email,
            name: u.storeName || u.name,
            storeName: u.storeName,
            ownerName: u.ownerName,
            phone: u.phone,
            address: u.address,
            approved: u.approved,
            status: normalizeStatus((u as any).status, u.approved),
            role: u.role,
            createdAt: u.createdAt,
            lastLogin: u.lastLogin,
            groqKeyImport: u.groqKeyImport || "",
            groqKeyAssist: u.groqKeyAssist || "",
          }))
        )
        setKeyDrafts(
          data.users.reduce((acc: any, u: any) => {
            acc[u._id] = {
              importKey: u.groqKeyImport || "",
              assistKey: u.groqKeyAssist || "",
            }
            return acc
          }, {})
        )
      }
    } catch (err) {
      console.error("Failed to load users:", err)
    } finally {
      setIsLoadingUsers(false)
    }
  }

  const loadRequests = async () => {
    setIsLoadingRequests(true)
    try {
      const response = await fetch("/api/admin/requests")
      if (response.ok) {
        const data = await response.json()
        setRequests(data.requests)
      }
    } catch (err) {
      console.error("Failed to load requests:", err)
    } finally {
      setIsLoadingRequests(false)
    }
  }

  const handleApproveRequest = async (requestId: string, request: RegistrationRequest) => {
    try {
      // Generate random password
      const randomPassword = Math.random().toString(36).slice(-8)

      // Create user from request
      const response = await fetch("/api/admin/users/from-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          email: request.email,
          name: request.storeName,
          password: randomPassword,
        }),
      })

      if (!response.ok) {
        setMessage({ type: "error", text: "Failed to approve request" })
        return
      }

      setMessage({ type: "success", text: "Request approved! User credentials sent via email." })
      loadUsers()
      loadRequests()
      setTimeout(() => setMessage(null), 3000)
    } catch (err) {
      setMessage({ type: "error", text: "Failed to approve request" })
    }
  }

  const handleRejectRequest = async (requestId: string) => {
    try {
      const response = await fetch(`/api/admin/requests/reject?id=${requestId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        setMessage({ type: "error", text: "Failed to reject request" })
        return
      }

      setMessage({ type: "success", text: "Request rejected" })
      loadRequests()
      setTimeout(() => setMessage(null), 3000)
    } catch (err) {
      setMessage({ type: "error", text: "Failed to reject request" })
    }
  }

  const handleSendEmail = async (userEmail: string, userName: string) => {
    try {
      const response = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: userEmail,
          subject: "Important Notification from Aushadhi 360",
          message: `Dear ${userName},\n\nThis is an important notification from Aushadhi 360.\n\nBest regards,\nAdmin Team`,
        }),
      })

      if (response.ok) {
        setMessage({ type: "success", text: `Email sent to ${userEmail}` })
      } else {
        setMessage({ type: "error", text: "Failed to send email" })
      }
      setTimeout(() => setMessage(null), 3000)
    } catch (err) {
      setMessage({ type: "error", text: "Failed to send email" })
    }
  }

  const handleCreateUser = async () => {
    // Validation
    if (!newEmail || !newName || !newOwnerName || !newPhone || !newPassword) {
      setMessage({ type: "error", text: "Please fill all required fields" })
      return
    }

    if (!newEmail.includes("@")) {
      setMessage({ type: "error", text: "Please enter a valid email" })
      return
    }

    if (users.some((u) => u.email === newEmail)) {
      setMessage({ type: "error", text: "This email already exists" })
      return
    }

    setIsCreating(true)

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail,
          name: newName,
          ownerName: newOwnerName,
          phone: newPhone,
          address: newAddress,
          password: newPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setMessage({ type: "error", text: data.message || "Failed to create user" })
        setIsCreating(false)
        return
      }

      // Add new user to list
      const newUser = {
        id: data.user._id || Math.random(),
        email: newEmail,
        name: newName,
        storeName: newName,
        ownerName: newOwnerName,
        phone: newPhone,
        address: newAddress,
        approved: false,
        groqKeyImport: "",
        groqKeyAssist: "",
      }

      setUsers([...users, newUser])
      setKeyDrafts((prev) => ({ ...prev, [newUser.id]: { importKey: "", assistKey: "" } }))
      setMessage({ type: "success", text: `User "${newName}" created successfully! Pending admin approval.` })

      // Reset form
      setNewEmail("")
      setNewName("")
      setNewOwnerName("")
      setNewPhone("")
      setNewAddress("")
      setNewPassword("")

      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000)
    } catch (err) {
      setMessage({ type: "error", text: "Failed to create user. Please try again." })
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteUser = async (userId: number | string) => {
    try {
      const response = await fetch(`/api/admin/users/delete?id=${userId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        setMessage({ type: "error", text: "Failed to delete user" })
        return
      }

      setUsers(users.filter((u) => u.id !== userId))
      setMessage({ type: "success", text: "User deleted successfully!" })
      setTimeout(() => setMessage(null), 3000)
    } catch (err) {
      setMessage({ type: "error", text: "Failed to delete user" })
    }
  }

  const handleApproveUser = async (userId: number | string) => {
    try {
      const response = await fetch("/api/admin/users/approve", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })

      if (!response.ok) {
        setMessage({ type: "error", text: "Failed to approve user" })
        return
      }

      setUsers(
        users.map((u) => (u.id === userId ? { ...u, approved: true } : u))
      )
      setMessage({ type: "success", text: "User approved!" })
      setTimeout(() => setMessage(null), 3000)
    } catch (err) {
      setMessage({ type: "error", text: "Failed to approve user" })
    }
  }

  const handleGroqKeyChange = (
    userId: string | number,
    field: "importKey" | "assistKey",
    value: string
  ) => {
    setKeyDrafts((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], [field]: value },
    }))
  }

  const updateUserStatus = async (userId: string | number, status: "active" | "paused" | "pending") => {
    try {
      const response = await fetch("/api/admin/users/status", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status }),
      })

      const data = await response.json()
      if (!response.ok) {
        setMessage({ type: "error", text: data.message || "Failed to update status" })
        setTimeout(() => setMessage(null), 3000)
        return
      }

      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status } : u)))
      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser({ ...selectedUser, status })
      }
      setMessage({ type: "success", text: `Status set to ${status}` })
      setTimeout(() => setMessage(null), 3000)
    } catch (err) {
      setMessage({ type: "error", text: "Failed to update status" })
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const handleSaveGroqKeys = async (user: User) => {
    const draft = keyDrafts[user.id] || { importKey: "", assistKey: "" }

    try {
      const response = await fetch("/api/admin/users/keys", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          groqKeyImport: draft.importKey.trim(),
          groqKeyAssist: draft.assistKey.trim(),
        }),
      })

      if (!response.ok) {
        setMessage({ type: "error", text: "Failed to save Groq keys" })
        setTimeout(() => setMessage(null), 3000)
        return
      }

      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id
            ? { ...u, groqKeyImport: draft.importKey.trim(), groqKeyAssist: draft.assistKey.trim() }
            : u
        )
      )

      setMessage({ type: "success", text: "Groq keys updated" })
      setTimeout(() => setMessage(null), 3000)
    } catch (err) {
      setMessage({ type: "error", text: "Failed to save Groq keys" })
      setTimeout(() => setMessage(null), 3000)
    }
  }

  // User Lookup Functions
  const handleLookupUser = async (user: User) => {
    setSelectedUser(user)
    setIsLoadingStats(true)
    setUserDocuments([])
    setUserStats(null)

    console.log(`Admin: Looking up user ${user.id} (${user.email})`)

    try {
      // Load user statistics from actual medicines data
      const statsResponse = await fetch(`/api/admin/users/${user.id}/stats`)
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setUserStats(statsData.stats)
      } else {
        console.error(`Failed to load stats for user ${user.id}`)
        // Fallback if endpoint fails
        setUserStats({
          totalMedicines: 0,
          totalCustomers: 0,
          revenue: 0,
          expired: 0,
          expiring: 0,
          fresh: 0,
          statusImportNew: 0,
        })
      }

      // Load user documents
      const docResponse = await fetch(`/api/admin/users/${user.id}/documents`)
      if (docResponse.ok) {
        const docData = await docResponse.json()
        console.log(`Admin: Loaded ${docData.documents?.length || 0} documents for user ${user.id}`)
        setUserDocuments(docData.documents || [])
      } else {
        console.error(`Failed to load documents for user ${user.id}`)
        setUserDocuments([])
      }
    } catch (err) {
      console.error("Failed to load user information:", err)
      setMessage({ type: "error", text: "Failed to load user information" })
    } finally {
      setIsLoadingStats(false)
    }
  }

  const handleAddDocument = async () => {
    if (!selectedUser || !newDocumentName || !newDocumentType || !newDocumentUrl) {
      setMessage({ type: "error", text: "Please fill all document fields" })
      return
    }

    setIsAddingDocument(true)

    console.log(`Admin: Adding document for user ${selectedUser.id}`)

    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentName: newDocumentName,
          documentType: newDocumentType,
          driveUrl: newDocumentUrl,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("Failed to add document:", errorData)
        setMessage({ type: "error", text: "Failed to add document" })
        setIsAddingDocument(false)
        return
      }

      const data = await response.json()
      const newDoc: UserDocument = {
        _id: data.document?._id,
        userId: selectedUser.id,
        documentName: newDocumentName,
        documentType: newDocumentType,
        driveUrl: newDocumentUrl,
        uploadedAt: new Date().toISOString(),
      }

      console.log(`Admin: Document added successfully for user ${selectedUser.id}`)
      setUserDocuments([...userDocuments, newDoc])
      setMessage({ type: "success", text: "Document added successfully!" })

      // Reset form
      setNewDocumentName("")
      setNewDocumentType("")
      setNewDocumentUrl("")

      setTimeout(() => setMessage(null), 3000)
    } catch (err) {
      console.error("Error adding document:", err)
      setMessage({ type: "error", text: "Failed to add document" })
    } finally {
      setIsAddingDocument(false)
    }
  }

  const handleDeleteDocument = async (docId: string | undefined) => {
    if (!selectedUser || !docId) return

    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}/documents/${docId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        setMessage({ type: "error", text: "Failed to delete document" })
        return
      }

      setUserDocuments(userDocuments.filter((d) => d._id !== docId))
      setMessage({ type: "success", text: "Document deleted successfully!" })
      setTimeout(() => setMessage(null), 3000)
    } catch (err) {
      setMessage({ type: "error", text: "Failed to delete document" })
    }
  }

  return (
    <div className="min-h-screen bg-background p-3 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-6 w-6 md:h-8 md:w-8 text-primary" />
          <div>
            <h1 className="text-2xl md:text-4xl font-bold text-balance">Admin Dashboard</h1>
            <p className="text-xs md:text-sm text-muted-foreground">Moksh Bhardwaj - System Administrator</p>
          </div>
        </div>

        {/* Message Alert */}
        {message && (
          <div
            className={`fixed top-2 left-1/2 -translate-x-1/2 p-2 rounded-lg border flex items-center gap-2 ${
              message.type === "success"
                ? "bg-success/50 border-success/20 text-foreground"
                : "bg-destructive/50 border-destructive/20 text-foreground"
            }`}
          >
            <AlertCircle className="h-5 w-5" />
            {message.text}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-6">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm text-muted-foreground">Total Users</p>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={loadUsers}>
                <RefreshCw className={`h-4 w-4 ${isLoadingUsers ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <p className="text-3xl font-bold">{users.length}</p>
          </Card>
          <Card className="p-6">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm text-muted-foreground">Active Users</p>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={loadUsers}>
                <RefreshCw className={`h-4 w-4 ${isLoadingUsers ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <p className="text-3xl font-bold">{users.filter((u) => u.approved).length}</p>
          </Card>
          <Card className="p-6">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm text-muted-foreground">Pending Requests</p>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={loadRequests}>
                <RefreshCw className={`h-4 w-4 ${isLoadingRequests ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <div className="text-3xl font-bold flex items-center gap-2">
                {requests.length}
              {requests.length > 0 && <Bell className="h-5 w-5 text-warning animate-pulse" />}
            </div>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">System Health</p>
            <div className="flex items-center gap-2 mt-2">
              <CheckCircle className="h-6 w-6 text-success" />
              <p className="text-xl font-bold">Online</p>
            </div>
          </Card>
        </div>

        {/* Tabs for different sections */}
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="h-auto flex-wrap justify-start">
            <TabsTrigger value="users">
              <UserCheck className="mr-2 h-4 w-4" />
              Manage Users
            </TabsTrigger>
            <TabsTrigger value="lookup">
              <UserCheck className="mr-2 h-4 w-4" />
              User Lookup
            </TabsTrigger>
            <TabsTrigger value="requests">
              <Bell className="mr-2 h-4 w-4" />
              Registration Requests
              {requests.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {requests.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="add-user">
              <UserPlus className="mr-2 h-4 w-4" />
              Add User
            </TabsTrigger>
          </TabsList>

          {/* User Lookup Tab */}
          <TabsContent value="lookup" className="space-y-4">
            <Card className="p-2 md:p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">User Lookup & Information</h2>
                <Button variant="outline" size="sm" onClick={loadUsers}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingUsers ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>

              {/* User Search */}
              <div className="mb-2">
                <Label htmlFor="search-user">Search User by Name or Email</Label>
                <Input
                  id="search-user"
                  placeholder="Enter store name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="mt-2"
                />
              </div>

              {/* Users List */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {users
                  .filter(
                    (u) =>
                      u.storeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      u.email?.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((user) => (
                    <Card
                      key={user.id}
                      className={`p-2 cursor-pointer transition-all border-2 ${
                        selectedUser?.id === user.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => handleLookupUser(user)}
                    >
                      <h3 className="font-semibold">{user.storeName || user.name}</h3>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                      <p className="text-xs text-muted-foreground">{user.ownerName}</p>
                      {(() => { const meta = getStatusMeta(user.status); const Icon = meta.icon; return (
                        <Badge variant="outline" className={`text-xs ${meta.className}`}>
                          <Icon className="mr-1 h-3 w-3" /> {meta.label}
                        </Badge>
                      )})()}
                    </Card>
                  ))}
              </div>
              <hr className="border-primary/20 border-2 rounded-full" />

              {/* Selected User Details */}
              {selectedUser && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* User Information */}
                  <Card className="p-6 lg:col-span-1">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <UserCheck className="h-5 w-5" />
                      User Info
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Store Name</p>
                        <p className="font-medium">{selectedUser.storeName || selectedUser.name}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Owner Name</p>
                        <p className="font-medium">{selectedUser.ownerName || "-"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Email</p>
                        <p className="font-medium">{selectedUser.email}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Phone</p>
                        <p className="font-medium">{selectedUser.phone || "-"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Address</p>
                        <p className="font-medium">{selectedUser.address || "-"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Status</p>
                        {(() => { const meta = getStatusMeta(selectedUser.status); const Icon = meta.icon; return (
                          <Badge variant="outline" className={`mt-1 ${meta.className}`}>
                            <Icon className="mr-1 h-3 w-3" /> {meta.label}
                          </Badge>
                        )})()}
                      </div>
                    </div>
                  </Card>

                  {/* User Statistics */}
                  <Card className="p-6 bg-background lg:col-span-2">
                    <h3 className="text-lg font-semibold mb-4">Business Statistics</h3>
                    {isLoadingStats ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                        <p className="ml-3 text-muted-foreground">Loading statistics...</p>
                      </div>
                    ) : userStats ? (
                      <div className="space-y-4">
                        {/* Top Row: Main Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <Card className="p-4 bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
                            <p className="text-xs text-muted-foreground font-medium">Total Medicines</p>
                            <p className="text-2xl md:text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1">{userStats.totalMedicines}</p>
                          </Card>
                          <Card className="p-4 bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
                            <p className="text-xs text-muted-foreground font-medium">Total Customers</p>
                            <p className="text-2xl md:text-3xl font-bold text-green-600 dark:text-green-400 mt-1">{userStats.totalCustomers}</p>
                          </Card>
                          <Card className="p-4 bg-purple-50 border-purple-200 dark:bg-purple-950 dark:border-purple-800">
                            <p className="text-xs text-muted-foreground font-medium">Total Revenue</p>
                            <p className="text-2xl md:text-3xl font-bold text-purple-600 dark:text-purple-400 mt-1">₹{userStats.revenue.toLocaleString("en-IN")}</p>
                          </Card>
                          <Card className="p-4 bg-orange-50 border-orange-200 dark:bg-orange-950 dark:border-orange-800">
                            <p className="text-xs text-muted-foreground font-medium">New Imports</p>
                            <p className="text-2xl md:text-3xl font-bold text-orange-600 dark:text-orange-400 mt-1">{userStats.statusImportNew || 0}</p>
                          </Card>
                        </div>

                        {/* Expiry Status Breakdown */}
                        <div className="grid grid-cols-3 gap-3">
                          <Card className="p-3 bg-emerald-50 border-emerald-200 dark:bg-emerald-950 dark:border-emerald-800">
                            <p className="text-xs text-muted-foreground font-medium">Fresh Stock</p>
                            <p className="text-xl md:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{userStats.fresh || 0}</p>
                          </Card>
                          <Card className="p-3 bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800">
                            <p className="text-xs text-muted-foreground font-medium">Expiring Soon</p>
                            <p className="text-xl md:text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{userStats.expiring || 0}</p>
                          </Card>
                          <Card className="p-3 bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800">
                            <p className="text-xs text-muted-foreground font-medium">Expired</p>
                            <p className="text-xl md:text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{userStats.expired || 0}</p>
                          </Card>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">No statistics available</p>
                    )}

                    {/* Documents Section */}
                    <div className="pt-6 border-t">
                      <h4 className="font-semibold mb-4 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        User Documents
                      </h4>

                      {/* Add Document Form */}
                      <div className="bg-muted/50 p-4 rounded-lg mb-4 space-y-3">
                        <div className="grid md:grid-cols-3 gap-3">
                          <div>
                            <Label htmlFor="doc-name" className="text-xs font-medium">
                              Document Name *
                            </Label>
                            <Input
                              id="doc-name"
                              placeholder="e.g., Aadhaar Card"
                              value={newDocumentName}
                              onChange={(e) => setNewDocumentName(e.target.value)}
                              disabled={isAddingDocument}
                              className="text-xs mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor="doc-type" className="text-xs font-medium">
                              Document Type *
                            </Label>
                            <Input
                              id="doc-type"
                              placeholder="e.g., ID, License"
                              value={newDocumentType}
                              onChange={(e) => setNewDocumentType(e.target.value)}
                              disabled={isAddingDocument}
                              className="text-xs mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor="doc-url" className="text-xs font-medium">
                              Google Drive URL *
                            </Label>
                            <Input
                              id="doc-url"
                              placeholder="https://drive.google.com/..."
                              value={newDocumentUrl}
                              onChange={(e) => setNewDocumentUrl(e.target.value)}
                              disabled={isAddingDocument}
                              className="text-xs mt-1"
                            />
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={handleAddDocument}
                          disabled={isAddingDocument}
                          className="w-full"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          {isAddingDocument ? "Adding..." : "Add Document"}
                        </Button>
                      </div>

                      {/* Documents List */}
                      {userDocuments.length > 0 ? (
                        <div className="md:space-y-1 md:space-x-4 grid md:grid-cols-3 max-h-100 overflow-y-auto">
                          {userDocuments.map((doc) => (
                            <Card key={doc._id} className="p-3 flex items-center justify-between hover:bg-muted/50 transition-colors">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <FileText className="h-20 w-20 md:h-10 md:w-10 text-primary/50 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">{doc.documentName}</p>
                                  <p className="text-xs text-muted-foreground">{doc.documentType}</p>
                                  {doc.uploadedAt && (
                                    <p className="text-xs text-muted-foreground">
                                      {new Date(doc.uploadedAt).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-2 flex-shrink-0 ml-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => window.open(doc.driveUrl, "_blank")}
                                  title="Open Document"
                                  className="h-8 w-8 p-0"
                                >
                                  <LinkIcon className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-destructive hover:text-destructive h-8 w-8 p-0"
                                  onClick={() => handleDeleteDocument(doc._id)}
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 border border-dashed rounded-lg bg-muted/20">
                          <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                          <p className="text-xs text-muted-foreground">No documents added yet</p>
                          <p className="text-xs text-muted-foreground mt-1">Add documents using the form above</p>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              )}


              {!selectedUser && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Select a user from the list above to view details and manage documents</p>
                </div>
              )}
            </Card>
          </TabsContent>
          <TabsContent value="requests" className="space-y-4">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Pending Registration Requests</h2>
              {isLoadingRequests ? (
                <p className="text-muted-foreground">Loading requests...</p>
              ) : requests.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No pending requests</p>
              ) : (
                <div className="space-y-4">
                  {requests.map((request) => (
                    <Card key={request._id} className="p-4 border-2">
                      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                        <div className="space-y-2 flex-1 w-full">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">{request.storeName}</h3>
                            <Badge variant="outline" className="text-warning border-warning">
                              Pending
                            </Badge>
                          </div>
                          <div className="grid md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                            <p>
                              <strong>Owner:</strong> {request.name}
                            </p>
                            <p>
                              <strong>Email:</strong> {request.email}
                            </p>
                            <p>
                              <strong>Phone:</strong> {request.phone || "Not provided"}
                            </p>
                            <p>
                              <strong>Address:</strong> {request.address || "Not provided"}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Requested: {new Date(request.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                          <Button
                            size="sm"
                            onClick={() => handleApproveRequest(request._id, request)}
                            className="bg-success hover:bg-success/90"
                          >
                            <CheckCircle className="mr-1 h-4 w-4" />
                            Approve & Create
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRejectRequest(request._id)}
                            className="text-destructive"
                          >
                            <XCircle className="mr-1 h-4 w-4" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Add User Tab */}
          <TabsContent value="add-user">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Add New Store User Manually
              </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="new-email">Email *</Label>
              <Input
                id="new-email"
                type="email"
                placeholder="store@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                disabled={isCreating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-name">Store Name *</Label>
              <Input
                id="new-name"
                placeholder="Medical Store Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                disabled={isCreating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-owner">Owner Name *</Label>
              <Input
                id="new-owner"
                placeholder="Owner full name"
                value={newOwnerName}
                onChange={(e) => setNewOwnerName(e.target.value)}
                disabled={isCreating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-phone">Phone *</Label>
              <Input
                id="new-phone"
                placeholder="10-digit phone"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                disabled={isCreating}
              />
            </div>
            <div className="space-y-2 md:col-span-2 lg:col-span-2">
              <Label htmlFor="new-address">Address</Label>
              <Input
                id="new-address"
                placeholder="Store address"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                disabled={isCreating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Password *</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Enter password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isCreating}
              />
            </div>
            <div className="flex items-end">
              <Button
                className="w-full"
                onClick={handleCreateUser}
                disabled={isCreating}
              >
                {isCreating ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-foreground" />
                    Creating...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create User
                  </>
                )}
              </Button>
            </div>
          </div>
            </Card>
          </TabsContent>

          {/* User Management Tab */}
          <TabsContent value="users">
            <Card className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Manage Users</h2>
                <Button variant="outline" size="sm" onClick={loadUsers}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingUsers ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
              {isLoadingUsers ? (
                <p className="text-muted-foreground">Loading users...</p>
              ) : users.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No users found</p>
              ) : (
                <>
                  {/* Mobile View: Cards */}
                  <div className="grid gap-4 md:hidden">
                    {users.map((user) => (
                      <Card key={user.id} className="p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold">{user.storeName || user.name}</h3>
                            <p className="text-sm text-muted-foreground">{user.ownerName}</p>
                          </div>
                          {user.approved ? (
                            <Badge variant="outline" className="text-success border-success">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-warning border-warning">
                              Pending
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm space-y-1">
                          <div className="flex items-center gap-2">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            {user.email}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="capitalize text-muted-foreground">{user.role || "user"}</span>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-muted-foreground">{user.phone || "No phone"}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleSendEmail(user.email, user.name)}
                          >
                            <Mail className="h-4 w-4 mr-2" /> Email
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>

                  {/* Desktop View: Table */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Store Name</TableHead>
                          <TableHead>Owner</TableHead>
                          <TableHead>Email</TableHead>
                          {/* <TableHead>Role</TableHead> */}
                          <TableHead>Created</TableHead>
                          <TableHead>Last Login</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>LLM API (Import/Assist)</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.storeName || user.name}</TableCell>
                            <TableCell>{user.ownerName || "-"}</TableCell>
                            <TableCell className="text-sm">{user.email}</TableCell>
                            {/* <TableCell className="text-sm capitalize">{user.role || "user"}</TableCell> */}
                            <TableCell className="text-xs text-muted-foreground">
                              {user.createdAt ? new Date(user.createdAt).toLocaleString() : "-"}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : "Never"}
                            </TableCell>
                            <TableCell className="text-sm">{user.phone || "-"}</TableCell>
                            <TableCell>
                              {(() => { const meta = getStatusMeta(user.status); const Icon = meta.icon; return (
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className={`${meta.className}`}>
                                    <Icon className="mr-1 h-3 w-3" /> {meta.label}
                                  </Badge>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Change status">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuLabel>Set Status</DropdownMenuLabel>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => updateUserStatus(user.id, "active")}>
                                        <PlayCircle className="mr-2 h-4 w-4" /> Active
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => updateUserStatus(user.id, "paused")}>
                                        <PauseCircle className="mr-2 h-4 w-4" /> Paused
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => updateUserStatus(user.id, "pending")}>
                                        <AlertCircle className="mr-2 h-4 w-4" /> Pending
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              )})()}
                            </TableCell>
                            <TableCell>
                              <div className="w-15 space-x-3">
                                <Input
                                  placeholder="Import API Key"
                                  value={keyDrafts[user.id]?.importKey ?? ""}
                                  onChange={(e) => handleGroqKeyChange(user.id, "importKey", e.target.value)}
                                />
                                <Input
                                  className="mr-6"
                                  placeholder="Assist API Key"
                                  value={keyDrafts[user.id]?.assistKey ?? ""}
                                  onChange={(e) => handleGroqKeyChange(user.id, "assistKey", e.target.value)}
                                />
                                <Button size="sm" onClick={() => handleSaveGroqKeys(user)}>
                                  Save Keys
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex ml-15 px-10 gap-2">
                                {/* No manual approve; user confirms via email */}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleSendEmail(user.email, user.name)}
                                  title="Send Email"
                                >
                                  <Mail className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-destructive"
                                  onClick={() => handleDeleteUser(user.id)}
                                  title="Delete User"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}