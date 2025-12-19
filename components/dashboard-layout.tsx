"use client"

import { type ReactNode, useEffect, useState } from "react"
import Image from "next/image"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  LayoutDashboard,
  Receipt,
  Sparkles,
  Upload,
  Package,
  BarChart3,
  AlertTriangle,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { SystemStatusIndicator } from "@/components/system-status-indicator"

interface DashboardLayoutProps {
  children: ReactNode
}

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  // { icon: Package, label: "Products", href: "/dashboard/products" },
  { icon: Receipt, label: "Billing", href: "/dashboard/billing" },
  { icon: Sparkles, label: "AI Assist", href: "/dashboard/ai-assist" },
  { icon: Upload, label: "Import Medicine", href: "/dashboard/import" },
  // { icon: Upload, label: "Manual Import", href: "/dashboard/manual-import" },
  { icon: BarChart3, label: "Analytics", href: "/dashboard/analytics" },
  { icon: AlertTriangle, label: "Alerts", href: "/dashboard/alerts" },
  { icon: Settings, label: "Settings", href: "/dashboard/settings" },
]

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true) // Expanded by default
  const [profile, setProfile] = useState<{ email: string; storeName?: string; ownerName?: string } | null>(null)

  useEffect(() => {
    const savedState = localStorage.getItem("sidebarExpanded")
    if (savedState !== null) {
      setIsExpanded(savedState === "true")
    }
  }, [])

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

  const toggleSidebar = (expanded: boolean) => {
    setIsExpanded(expanded)
    localStorage.setItem("sidebarExpanded", String(expanded))
  }

  const showFullSidebar = isExpanded || sidebarOpen

  return (
    <div className="min-h-screen bg-background">
      <SystemStatusIndicator />
      {/* Mobile header */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b bg-card">
        <Image
          src="/logo1.png"
          alt="Aushadhi 360"
          width={60}
          height={60}
          className="object-contain"
          priority
        />

        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X /> : <Menu />}
        </Button>
      </div>
      <div className="flex">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 bg-sidebar border-r border-sidebar-border transform transition-all duration-300 ease-in-out",
            "lg:translate-x-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-full",
            showFullSidebar ? "w-64" : "w-20"
          )}
        >
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="h-[113px] p-4 border-b border-sidebar-border flex items-center justify-center relative">
              <img
                src={showFullSidebar ? "/logo2.png" : "/logo1.png"}
                alt="Aushadhi 360 Logo"
                className={cn(
                  "w-auto object-contain transition-all duration-300",
                  showFullSidebar ? "h-20" : "h-10"
                )}
              />
            </div>
            <div className="absolute top-21 -right-3 hidden lg:block">
              {isExpanded ? (
                <Button
                  size="icon"
                  variant="outline"
                  className="rounded-full w-6 h-15 border-primary/50 bg-background hover:bg-primary/10 hover:border-primary hover:text-primary"
                  onClick={() => toggleSidebar(false)}
                  aria-label="Collapse sidebar"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  size="icon"
                  variant="outline"
                  className="rounded-full w-6 h-15 border-primary/50 bg-background hover:bg-primary/10 hover:border-primary hover:text-primary"
                  onClick={() => toggleSidebar(true)}
                  aria-label="Expand sidebar"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Navigation */}
            <ScrollArea className="flex-1 py-1">
              <TooltipProvider disableHoverableContent delayDuration={50} skipDelayDuration={0}>
                <nav
                  className={cn(
                    showFullSidebar ? "space-y-1 px-3" : "grid grid-cols-1 justify-items-center"
                  )}
                >
                  {navItems.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href
                    const button = (
                      <Button
                        key={item.href}
                        variant={isActive ? "secondary" : "ghost"}
                        size={showFullSidebar ? "default" : "icon"}
                        aria-label={item.label}
                        className={cn(
                          showFullSidebar ? "w-full justify-start" : "w-10 h-10",
                          !showFullSidebar && "py-1",
                          isActive && "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90",
                        )}
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(item.href)
                          setSidebarOpen(false)
                        }}
                      >
                        <Icon className={cn("h-5 w-5", showFullSidebar && "mr-3")} />
                        <span className={cn("truncate", !showFullSidebar && "hidden")}>{item.label}</span>
                      </Button>
                    )

                    if (showFullSidebar) return button

                    return (
                      <Tooltip key={item.href} disableHoverableContent delayDuration={50}>
                        <TooltipTrigger asChild>{button}</TooltipTrigger>
                        <TooltipContent side="right" className="shadow-md rounded-md">
                          {item.label}
                        </TooltipContent>
                      </Tooltip>
                    )
                  })}
                </nav>
              </TooltipProvider>
            </ScrollArea>

            {/* User profile */}
            <div className={cn("p-4 border-t border-sidebar-border", !showFullSidebar && "p-2")}>
              <div className={cn("flex items-center gap-3 mb-3", !showFullSidebar && "justify-center")}>
                <Avatar>
                  <AvatarImage src="/diverse-user-avatars.png" />
                  <AvatarFallback>{initials || "U"}</AvatarFallback>
                </Avatar>
                <div className={cn("flex-1 min-w-0", !showFullSidebar && "hidden")}>
                  <p className="text-sm font-medium truncate">{ownerName}</p>
                  <p className="text-xs text-muted-foreground truncate">{storeName}</p>
                </div>
              </div>
              <Button
                variant="outline"
                className={cn("w-full text-aceent-500", !showFullSidebar && "w-10 h-10 p-6")}
                size={showFullSidebar ? "sm" : "icon"}
                onClick={handleLogout}
              >
                <LogOut className={cn("h-4 w-4", showFullSidebar && "mr-2")} />
                <span className={cn(!showFullSidebar && "hidden")}>Logout</span>
              </Button>
            </div>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Main content */}
        <main className={cn("flex-1 transition-all duration-300 ease-in-out", isExpanded ? "lg:ml-64" : "lg:ml-20")}>
          <div className="relative p-4 lg:p-6">
            {children}

            <footer className="mt-6 border-t pt-4 text-center text-[10px] text-muted-foreground flex flex-col gap-1">
              <p>&copy; {new Date().getFullYear()} Aushadhi 360. All rights reserved.</p>
              <p>
                Powered by{" "}
                <a
                  href="https://mokshbhardwaj.netlify.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium hover:text-primary transition-colors"
                >
                  Moksh Bhardwaj
                </a>
              </p>
              <p className="opacity-50">v1.0.0</p>
            </footer>
          </div>
        </main>
      </div>
    </div>
  )
}
