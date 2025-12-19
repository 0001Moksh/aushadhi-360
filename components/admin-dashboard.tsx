"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserPlus, Mail, Trash2, Shield, CheckCircle, XCircle, AlertCircle, UserCheck, Bell } from "lucide-react"

interface User {
  id: string | number
  email: string
  name: string
  storeName?: string
  ownerName?: string
  phone?: string
  address?: string
  approved: boolean
  role?: string
  createdAt?: string
  lastLogin?: string | null
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

export function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([])
  const [requests, setRequests] = useState<RegistrationRequest[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(true)
  const [isLoadingRequests, setIsLoadingRequests] = useState(true)

  const [newEmail, setNewEmail] = useState("")
  const [newName, setNewName] = useState("")
  const [newOwnerName, setNewOwnerName] = useState("")
  const [newPhone, setNewPhone] = useState("")
  const [newAddress, setNewAddress] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Load users and requests on mount
  useEffect(() => {
    loadUsers()
    loadRequests()
  }, [])

  const loadUsers = async () => {
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
            role: u.role,
            createdAt: u.createdAt,
            lastLogin: u.lastLogin,
          }))
        )
      }
    } catch (err) {
      console.error("Failed to load users:", err)
    } finally {
      setIsLoadingUsers(false)
    }
  }

  const loadRequests = async () => {
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
      }

      setUsers([...users, newUser])
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
            className={`p-4 rounded-lg border flex items-center gap-2 ${
              message.type === "success"
                ? "bg-success/10 border-success/20 text-success"
                : "bg-destructive/10 border-destructive/20 text-destructive"
            }`}
          >
            <AlertCircle className="h-5 w-5" />
            {message.text}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">Total Users</p>
            <p className="text-3xl font-bold mt-2">{users.length}</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">Active Users</p>
            <p className="text-3xl font-bold mt-2">{users.filter((u) => u.approved).length}</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">Pending Requests</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-lg px-3 py-1">
                {requests.length}
              </Badge>
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

          {/* Registration Requests Tab */}
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
              <h2 className="text-xl font-semibold mb-4">Manage Users</h2>
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
                          <TableHead>Role</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Last Login</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.storeName || user.name}</TableCell>
                            <TableCell>{user.ownerName || "-"}</TableCell>
                            <TableCell className="text-sm">{user.email}</TableCell>
                            <TableCell className="text-sm capitalize">{user.role || "user"}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {user.createdAt ? new Date(user.createdAt).toLocaleString() : "-"}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : "Never"}
                            </TableCell>
                            <TableCell className="text-sm">{user.phone || "-"}</TableCell>
                            <TableCell>
                              {user.approved ? (
                                <Badge variant="outline" className="text-success border-success">
                                  <CheckCircle className="mr-1 h-3 w-3" />
                                  Active
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-warning border-warning">
                                  <XCircle className="mr-1 h-3 w-3" />
                                  Pending Confirmation
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
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