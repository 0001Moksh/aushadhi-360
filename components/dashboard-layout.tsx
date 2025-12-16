"use client"

import { type ReactNode, useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  LayoutDashboard,
  Receipt,
  Sparkles,
  Upload,
  BarChart3,
  AlertTriangle,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { SystemStatusIndicator } from "@/components/system-status-indicator"

interface DashboardLayoutProps {
  children: ReactNode
}

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Receipt, label: "Billing", href: "/dashboard/billing" },
  { icon: Sparkles, label: "AI Assist", href: "/dashboard/ai-assist" },
  { icon: Upload, label: "Import Medicine", href: "/dashboard/import" },
  { icon: BarChart3, label: "Analytics", href: "/dashboard/analytics" },
  { icon: AlertTriangle, label: "Alerts", href: "/dashboard/alerts" },
  { icon: Settings, label: "Settings", href: "/dashboard/settings" },
]

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profile, setProfile] = useState<{ email: string; storeName?: string; ownerName?: string } | null>(null)

  useEffect(() => {
    const loadProfile = async () => {
      if (typeof window === "undefined") return
      const email = localStorage.getItem("user_email")
      if (!email) return

      try {
        const response = await fetch(`/api/user/profile?email=${encodeURIComponent(email)}`)
        if (!response.ok) return
        const data = await response.json()
        if (data?.user) {
          setProfile({
            email: data.user.email,
            storeName: data.user.storeName || data.user.name,
            ownerName: data.user.ownerName || data.user.name,
          })
        }
      } catch (error) {
        console.error("Failed to load profile for sidebar:", error)
      }
    }

    loadProfile()
  }, [])

  const userEmail = profile?.email || (typeof window !== "undefined" ? localStorage.getItem("user_email") : null)
  const storeName = profile?.storeName || "____"
  const ownerName = profile?.ownerName || "____"
  const initials = `${ownerName?.charAt(0) || ""}${storeName?.charAt(0) || ""}`.toUpperCase()

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token")
      localStorage.removeItem("user_email")
      localStorage.removeItem("user_role")
    }
    router.push("/")
  }

  return (
    <div className="min-h-screen bg-background">
      <SystemStatusIndicator />

      {/* Mobile header */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b bg-card">
        <h1 className="text-xl font-bold">Aushadhi 360</h1>
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X /> : <Menu />}
        </Button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform lg:translate-x-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="p-6 border-b border-sidebar-border">
              <h1 className="text-2xl font-bold text-sidebar-primary text-balance">
                NYT
                <br />
                Aushadhi 360
              </h1>
            </div>

            {/* Navigation */}
            <ScrollArea className="flex-1 py-6">
              <nav className="px-3 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href
                  return (
                    <Button
                      key={item.href}
                      variant={isActive ? "secondary" : "ghost"}
                      className={cn(
                        "w-full justify-start",
                        isActive && "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90",
                      )}
                      onClick={() => {
                        router.push(item.href)
                        setSidebarOpen(false)
                      }}
                    >
                      <Icon className="mr-3 h-5 w-5" />
                      {item.label}
                    </Button>
                  )
                })}
              </nav>
            </ScrollArea>

            {/* User profile */}
            <div className="p-4 border-t border-sidebar-border">
              <div className="flex items-center gap-3 mb-3">
                <Avatar>
                  <AvatarImage src="/diverse-user-avatars.png" />
                  <AvatarFallback>{initials || "U"}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{ownerName}</p>
                  <p className="text-xs text-muted-foreground truncate">{storeName}</p>

                  {/* <p className="text-xs text-muted-foreground truncate">{userEmail}</p> */}
                </div>
              </div>
              <Button variant="outline" className="w-full bg-transparent" size="sm" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Main content */}
        <main className="flex-1 lg:ml-64">
          <div className="p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
