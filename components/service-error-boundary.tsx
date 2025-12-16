"use client"

// Error boundary for service failures with user-friendly fallback UI

import { Component, type ReactNode } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw } from "lucide-react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
  serviceName?: string
}

interface State {
  hasError: boolean
  error?: Error
}

export class ServiceErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: unknown) {
    console.error("[ServiceErrorBoundary]", error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <Alert variant="destructive" className="my-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Service Temporarily Unavailable</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              {this.props.serviceName || "This feature"} is experiencing issues. You can continue using other features
              normally.
            </p>
            <Button variant="outline" size="sm" onClick={this.handleReset} className="gap-2 bg-transparent">
              <RefreshCw className="h-3 w-3" />
              Try Again
            </Button>
          </AlertDescription>
        </Alert>
      )
    }

    return this.props.children
  }
}
