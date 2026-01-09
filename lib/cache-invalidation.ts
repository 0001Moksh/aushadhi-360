/**
 * Cache Invalidation Utility
 * Handles timestamp-based cache invalidation for multi-user scenarios
 * where medicine data changes frequently.
 * 
 * The backend tracks medicine update timestamps and recomputes embeddings
 * on first query after invalidation.
 */

interface InvalidateCacheOptions {
  onStart?: () => void
  onSuccess?: () => void
  onError?: (error: string) => void
}

/**
 * Invalidates the medicine cache for the current user.
 * This tells the backend to recompute embeddings on the next query.
 * 
 * @param email User email address
 * @param password User password (from login)
 * @param options Callbacks for UI feedback
 * @returns True if invalidation succeeded, false otherwise
 */
export async function invalidateUserCache(
  email: string,
  password: string,
  options?: InvalidateCacheOptions
): Promise<boolean> {
  // Validate inputs
  if (!email || !password) {
    const error = "Email and password required for cache invalidation"
    options?.onError?.(error)
    console.warn("[Cache Invalidation]", error)
    return false
  }

  try {
    options?.onStart?.()

    const response = await fetch("/api/invalidate-cache", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      const error = data.error || `Cache invalidation failed (${response.status})`
      options?.onError?.(error)
      console.error("[Cache Invalidation] Error:", error)
      return false
    }

    const data = await response.json()
    console.log("[Cache Invalidation] Success:", {
      message: data.message || "Cache invalidated",
      timestamp: data.timestamp,
    })

    options?.onSuccess?.()
    return true
  } catch (err) {
    const error = err instanceof Error ? err.message : "Network error during cache invalidation"
    options?.onError?.(error)
    console.error("[Cache Invalidation] Exception:", error)
    return false
  }
}

/**
 * Invalidates cache and shows user feedback.
 * If invalidation fails, still allows user to proceed (graceful degradation).
 * 
 * @param email User email
 * @param password User password
 * @param onFeedback Callback to show feedback message to user
 */
export async function invalidateCacheWithFeedback(
  email: string,
  password: string,
  onFeedback: (message: string, type: "loading" | "success" | "error") => void
): Promise<void> {
  const success = await invalidateUserCache(email, password, {
    onStart: () => {
      onFeedback("Medicine index refreshing...", "loading")
    },
    onSuccess: () => {
      onFeedback("✓ Index updated", "success")
    },
    onError: (error) => {
      onFeedback(`Warning: ${error} - proceeding with search anyway`, "error")
    },
  })

  // Give UI time to show feedback before continuing
  if (success) {
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
}

/**
 * Batch invalidate cache (for multiple operations).
 * Calls invalidate-cache once instead of multiple times.
 * 
 * @param email User email
 * @param password User password
 * @param operationCount Number of operations performed
 */
export async function invalidateCacheAfterBatch(
  email: string,
  password: string,
  operationCount: number
): Promise<boolean> {
  console.log(
    `[Cache Invalidation] Batch invalidation for ${operationCount} medicine operations`
  )
  return invalidateUserCache(email, password)
}

/**
 * Schedule cache invalidation for later.
 * Useful when you want to batch multiple operations before invalidating.
 * 
 * @param email User email
 * @param password User password
 * @param delayMs Delay in milliseconds before invalidation
 * @returns Abort function to cancel scheduled invalidation
 */
export function scheduleInvalidation(
  email: string,
  password: string,
  delayMs: number = 2000
): () => void {
  let timeoutId: NodeJS.Timeout | null = null

  const abort = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      console.log("[Cache Invalidation] Scheduled invalidation cancelled")
    }
  }

  timeoutId = setTimeout(() => {
    invalidateUserCache(email, password)
  }, delayMs)

  return abort
}
