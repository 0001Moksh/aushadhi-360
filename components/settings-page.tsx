"use client"

import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { User, Bell, Shield, Database, Upload } from "lucide-react"

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-balance mb-2">Settings</h1>
        <p className="text-muted-foreground text-pretty">Manage your account and application preferences</p>
      </div>

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
              <AvatarFallback>MK</AvatarFallback>
            </Avatar>
            <Button variant="outline" size="sm">
              <Upload className="mr-2 h-4 w-4" />
              Change Photo
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="store-name">Store Name</Label>
              <Input id="store-name" defaultValue="NYT Medical Store" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="owner-name">Owner Name</Label>
              <Input id="owner-name" defaultValue="Moksh Bhardwaj" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" defaultValue="demo@aushadhi360.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" defaultValue="+91 98765 43210" />
            </div>
          </div>

          <Button>Save Changes</Button>
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
