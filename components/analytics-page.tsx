"use client"

import { Card } from "@/components/ui/card"
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

const salesData = [
  { month: "Jan", sales: 45000 },
  { month: "Feb", sales: 52000 },
  { month: "Mar", sales: 48000 },
  { month: "Apr", sales: 61000 },
  { month: "May", sales: 55000 },
  { month: "Jun", sales: 67000 },
]

const topProducts = [
  { name: "Paracetamol", sales: 450 },
  { name: "Cyclopam", sales: 380 },
  { name: "Amoxicillin", sales: 320 },
  { name: "Gelusil", sales: 290 },
  { name: "Dolo 650", sales: 270 },
]

export function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-balance mb-2">Analytics</h1>
        <p className="text-muted-foreground text-pretty">Track sales performance and inventory trends</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Total Revenue</p>
          <p className="text-3xl font-bold mt-2">₹3,28,000</p>
          <p className="text-sm text-success mt-1">+12.5% from last month</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Total Orders</p>
          <p className="text-3xl font-bold mt-2">1,247</p>
          <p className="text-sm text-success mt-1">+8.3% from last month</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Avg. Order Value</p>
          <p className="text-3xl font-bold mt-2">₹263</p>
          <p className="text-sm text-muted-foreground mt-1">+3.7% from last month</p>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Monthly Sales Trend</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={salesData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="sales" stroke="hsl(var(--primary))" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Top Selling Products</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={topProducts}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="sales" fill="hsl(var(--secondary))" />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  )
}
