"use client"

import { useEffect, useState, useRef } from "react"
import { useTheme } from "next-themes"
import { Monitor, Moon, Sun } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Prevent hydration mismatch
  useEffect(() => setMounted(true), [])

  // Handle click outside to close menu (for mobile)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  if (!mounted) return null

  const options = [
    { key: "light", label: "Light", icon: Sun },
    { key: "system", label: "System", icon: Monitor },
    { key: "dark", label: "Dark", icon: Moon },
  ] as const

  return (
    <TooltipProvider delayDuration={100}>
      <motion.div 
        ref={ref}
        layout
        className={cn(
          "relative flex items-center p-1.5 rounded-full border border-transparent hover:md:border-border hover:md:bg-foreground/5 hover:shadow-sm",
          className
        )}
        onPointerEnter={(e) => e.pointerType === "mouse" && setIsOpen(true)}
        onPointerLeave={(e) => e.pointerType === "mouse" && setIsOpen(false)}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {options.map(({ key, label, icon: Icon }) => {
            const isActive = theme === key
            
            if (!isOpen && !isActive) return null

            return (
              <motion.div
                key={key}
                layout
                initial={{ opacity: 0, scale: 0.8, width: 0 }}
                animate={{ opacity: 1, scale: 1, width: "auto" }}
                exit={{ opacity: 0, scale: 0.8, width: 0 }}
                transition={{ duration: 0.2, type: "spring", bounce: 0, stiffness: 300, damping: 25 }}
                className="overflow-hidden"
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                  onClick={() => {
                    if (isActive) setIsOpen((prev) => !prev)
                    else {
                      setTheme(key)
                      setIsOpen(false)
                    }
                  }}
                      className={cn(
                        "relative flex h-9 w-9 items-center justify-center rounded-full transition-colors border hover:border-foreground focus-visible:outline-none",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )}
                      aria-label={`Switch to ${label} theme`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeThemeHighlight"
                          className="absolute inset-0 rounded-full border border-foreground/10 border-background shadow-sm"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                      <Icon className="h-[1.1rem] w-[1.1rem]" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs font-medium">
                    {label} Mode
                  </TooltipContent>
                </Tooltip>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </motion.div>
    </TooltipProvider>
  )
}