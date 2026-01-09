"use client"

// Shows pending sync operations when offline

import { useEffect, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, Database } from "lucide-react"
import { databaseService } from "@/lib/api-services/database-service"

export function OfflineSyncIndicator() {
  const [pendingCount, setPendingCount] = useState(0)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    checkPendingOperations()
    const interval = setInterval(checkPendingOperations, 10000)
    return () => clearInterval(interval)
  }, [])

  function checkPendingOperations() {
    const queue = JSON.parse(localStorage.getItem("sync_queue") || "[]")
    setPendingCount(queue.length)
  }

  async function handleManualSync() {
    setSyncing(true)
    try {
      await databaseService.syncWithCloud()
      checkPendingOperations()
    } finally {
      setSyncing(false)
    }
  }

  if (pendingCount === 0) return null

  return (
    <Alert className="my-4">
      <Database className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2">
        Offline Data Pending
        <Badge variant="secondary">{pendingCount}</Badge>
      </AlertTitle>
      <AlertDescription className="space-y-2">
        <p>You have {pendingCount} operation(s) waiting to sync with the cloud.</p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleManualSync}
          disabled={syncing}
          className="gap-2 bg-transparent hover:text-primary"
        >
          <RefreshCw className={`h-3 w-3 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing..." : "Sync Now"}
        </Button>
      </AlertDescription>
    </Alert>
  )
}
