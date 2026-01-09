'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface CacheConfig {
  key: string
  ttl?: number // Time to live in milliseconds (default: 5 minutes)
  staleTime?: number // How long data is considered fresh (default: 1 minute)
}

interface CacheEntry<T> {
  data: T
  timestamp: number
  fetchedAt: number
}

/**
 * Hook for cached data fetching with local storage persistence
 * - Loads from cache immediately
 * - Makes API call in background
 * - Prevents duplicate API calls within staleTime
 */
export function useCachedData<T>(
  fetchFn: () => Promise<T>,
  config: CacheConfig
) {
  const { key, ttl = 5 * 60 * 1000, staleTime = 60 * 1000 } = config
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const isFetchingRef = useRef(false)
  const lastFetchRef = useRef<number>(0)

  // Load from local storage on mount
  useEffect(() => {
    const cached = localStorage.getItem(key)
    if (cached) {
      try {
        const entry: CacheEntry<T> = JSON.parse(cached)
        const now = Date.now()
        
        // Check if cache is still valid
        if (now - entry.timestamp < ttl) {
          setData(entry.data)
          setIsLoading(false)
          lastFetchRef.current = entry.fetchedAt
          
          // If data is fresh, don't fetch
          if (now - entry.fetchedAt < staleTime) {
            return
          }
        }
      } catch (err) {
        console.error(`Failed to parse cached data for ${key}:`, err)
        localStorage.removeItem(key)
      }
    }

    // Fetch fresh data
    fetchData()
  }, [key])

  const fetchData = useCallback(async () => {
    const now = Date.now()
    
    // Prevent duplicate API calls within staleTime
    if (isFetchingRef.current || now - lastFetchRef.current < staleTime) {
      setIsLoading(false)
      return
    }

    isFetchingRef.current = true
    setError(null)

    try {
      const result = await fetchFn()
      const cacheEntry: CacheEntry<T> = {
        data: result,
        timestamp: Date.now(),
        fetchedAt: Date.now(),
      }

      // Save to local storage
      localStorage.setItem(key, JSON.stringify(cacheEntry))
      setData(result)
      lastFetchRef.current = Date.now()
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
    } finally {
      setIsLoading(false)
      isFetchingRef.current = false
    }
  }, [fetchFn, key, staleTime])

  // Manual refetch function
  const refetch = useCallback(() => {
    lastFetchRef.current = 0 // Force fetch
    return fetchData()
  }, [fetchData])

  // Clear cache function
  const clearCache = useCallback(() => {
    localStorage.removeItem(key)
    setData(null)
    setError(null)
    lastFetchRef.current = 0
  }, [key])

  return {
    data,
    isLoading,
    error,
    refetch,
    clearCache,
  }
}

/**
 * Hook for managing session-wide cache
 * Useful for sharing cached data across multiple components
 */
export function useGlobalCache<T>(key: string) {
  const [data, setData] = useState<T | null>(null)

  useEffect(() => {
    const cached = localStorage.getItem(key)
    if (cached) {
      try {
        const entry: CacheEntry<T> = JSON.parse(cached)
        setData(entry.data)
      } catch (err) {
        console.error(`Failed to parse global cache for ${key}:`, err)
      }
    }
  }, [key])

  const updateCache = useCallback(
    (newData: T) => {
      const cacheEntry: CacheEntry<T> = {
        data: newData,
        timestamp: Date.now(),
        fetchedAt: Date.now(),
      }
      localStorage.setItem(key, JSON.stringify(cacheEntry))
      setData(newData)
    },
    [key]
  )

  const clearCache = useCallback(() => {
    localStorage.removeItem(key)
    setData(null)
  }, [key])

  return { data, updateCache, clearCache }
}
