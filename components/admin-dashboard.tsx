"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { UserPlus, Mail, Trash2, Shield, CheckCircle, XCircle } from "lucide-react"

export function AdminDashboard() {
  const [users, setUsers] = useState([
    { id: 1, email: "store1@example.com", name: "Medical Store 1", approved: true },
    { id: 2, email: "store2@example.com", name: "Medical Store 2", approved: true },
    { id: 3, email: "pending@example.com", name: "New Store", approved: false },
  ])

  return (
    <div className="min-h-screen bg-background p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-4xl font-bold text-balance">Admin Dashboard</h1>
            <p className="text-muted-foreground">Moksh Bhardwaj - System Administrator</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">Total Users</p>
            <p className="text-3xl font-bold mt-2">{users.length}</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">Active Users</p>
            <p className="text-3xl font-bold mt-2">{users.filter((u) => u.approved).length}</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">Pending Approval</p>
            <p className="text-3xl font-bold mt-2">{users.filter((u) => !u.approved).length}</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">System Health</p>
            <div className="flex items-center gap-2 mt-2">
              <CheckCircle className="h-6 w-6 text-success" />
              <p className="text-xl font-bold">All Systems Online</p>
            </div>
          </Card>
        </div>

        {/* Add User */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add New Store User
          </h2>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="new-email">Email</Label>
              <Input id="new-email" type="email" placeholder="store@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-name">Store Name</Label>
              <Input id="new-name" placeholder="Medical Store Name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Password</Label>
              <Input id="new-password" type="password" placeholder="Auto-generated" />
            </div>
            <div className="flex items-end">
              <Button className="w-full">
                <UserPlus className="mr-2 h-4 w-4" />
                Create User
              </Button>
            </div>
          </div>
        </Card>

        {/* User Management */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Manage Users</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Store Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>
                    {user.approved ? (
                      <Badge variant="outline" className="text-success border-success">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Approved
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-warning border-warning">
                        <XCircle className="mr-1 h-3 w-3" />
                        Pending
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Mail className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        Reset Password
                      </Button>
                      <Button size="sm" variant="outline" className="text-destructive bg-transparent">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  )
}
