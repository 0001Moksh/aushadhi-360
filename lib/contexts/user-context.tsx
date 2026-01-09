"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react"

interface UserProfile {
  email: string
  storeName: string
  ownerName: string
  phone: string
  address: string
  photoUrl?: string
  role: string
  status?: string
  approved?: boolean
}

interface UserContextType {
  user: UserProfile | null
  isLoading: boolean
  refreshUser: () => Promise<void>
  setUser: (user: UserProfile | null) => void
  clearUser: () => void
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const CACHE_KEY = "user_profile_cache"
  const CACHE_TIMESTAMP_KEY = "user_profile_cache_timestamp"
  const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

  const loadUserFromCache = (): UserProfile | null => {
    if (typeof window === "undefined") return null
    
    try {
      const cached = sessionStorage.getItem(CACHE_KEY)
      const timestamp = sessionStorage.getItem(CACHE_TIMESTAMP_KEY)
      
      if (cached && timestamp) {
        const age = Date.now() - parseInt(timestamp, 10)
        if (age < CACHE_DURATION) {
          return JSON.parse(cached)
        }
      }
    } catch (error) {
      console.error("Error loading user from cache:", error)
    }
    return null
  }

  const saveUserToCache = (userData: UserProfile) => {
    if (typeof window === "undefined") return
    
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(userData))
      sessionStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString())
    } catch (error) {
      console.error("Error saving user to cache:", error)
    }
  }

  const clearUserCache = () => {
    if (typeof window === "undefined") return
    
    try {
      sessionStorage.removeItem(CACHE_KEY)
      sessionStorage.removeItem(CACHE_TIMESTAMP_KEY)
    } catch (error) {
      console.error("Error clearing user cache:", error)
    }
  }

  const refreshUser = async () => {
    if (typeof window === "undefined") return
    
    const email = localStorage.getItem("user_email")
    if (!email) {
      setUser(null)
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch(`/api/user/profile?email=${encodeURIComponent(email)}`)
      if (!response.ok) {
        // Silently handle - cached data will be used if available
        setUser(null)
        setIsLoading(false)
        return
      }

      const data = await response.json()
      if (data?.user) {
        const userData: UserProfile = {
          email: data.user.email,
          storeName: data.user.storeName || data.user.name || "",
          ownerName: data.user.ownerName || data.user.name || "",
          phone: data.user.phone || "",
          address: data.user.address || "",
          photoUrl: data.user.photoUrl || undefined,
          role: data.user.role || "user",
          status: data.user.status,
          approved: data.user.approved,
        }
        setUser(userData)
        saveUserToCache(userData)
      }
    } catch (error) {
      console.error("Error fetching user profile:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const clearUser = () => {
    setUser(null)
    clearUserCache()
  }

  useEffect(() => {
    // Try to load from cache first
    const cachedUser = loadUserFromCache()
    if (cachedUser) {
      setUser(cachedUser)
      setIsLoading(false)
      // Refresh in background to ensure data is fresh
      refreshUser()
    } else {
      // No cache, fetch from API
      refreshUser()
    }
  }, [])

  return (
    <UserContext.Provider value={{ user, isLoading, refreshUser, setUser, clearUser }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider")
  }
  return context
}
