"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertTriangle, Clock, TrendingUp, Download } from "lucide-react"

export function AlertsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-balance mb-2">Alerts & Notifications</h1>
          <p className="text-muted-foreground text-pretty">Monitor stock levels and expiry dates</p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export Report
        </Button>
      </div>

      <Tabs defaultValue="low-stock" className="space-y-4">
        <TabsList>
          <TabsTrigger value="low-stock">Low Stock (23)</TabsTrigger>
          <TabsTrigger value="expiring">Expiring Soon (8)</TabsTrigger>
          <TabsTrigger value="top-selling">Top Selling</TabsTrigger>
        </TabsList>

        <TabsContent value="low-stock" className="space-y-3">
          {Array.from({ length: 5 }).map((_, idx) => (
            <Card key={idx} className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">Paracetamol 500mg</p>
                  <p className="text-sm text-muted-foreground">Current stock: 15 strips | Minimum: 50 strips</p>
                </div>
                <Badge variant="outline" className="text-warning border-warning">
                  Low Stock
                </Badge>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="expiring" className="space-y-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <Card key={idx} className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-destructive flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">Amoxicillin 250mg</p>
                  <p className="text-sm text-muted-foreground">Expires on: 28 Jan 2025 (12 days remaining)</p>
                </div>
                <Badge variant="outline" className="text-destructive border-destructive">
                  Expiring
                </Badge>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="top-selling" className="space-y-3">
          {Array.from({ length: 5 }).map((_, idx) => (
            <Card key={idx} className="p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-primary flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">Cyclopam Tablet</p>
                  <p className="text-sm text-muted-foreground">Sold: 47 strips this week | Revenue: ₹2,115</p>
                </div>
                <Badge variant="outline" className="text-primary border-primary">
                  Top Seller
                </Badge>
              </div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}
