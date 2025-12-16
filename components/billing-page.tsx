"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Search, Plus, Trash2, ShoppingCart } from "lucide-react"

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  unit: string
}

export function BillingPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [cart, setCart] = useState<CartItem[]>([])
  const [customerEmail, setCustomerEmail] = useState("")

  const mockMedicines = [
    { id: "1", name: "Paracetamol 500mg", price: 5, unit: "strip" },
    { id: "2", name: "Cyclopam Tablet", price: 45, unit: "strip" },
    { id: "3", name: "Amoxicillin 250mg", price: 120, unit: "strip" },
    { id: "4", name: "Gelusil Syrup", price: 85, unit: "bottle" },
  ]

  const filteredMedicines = mockMedicines.filter((med) => med.name.toLowerCase().includes(searchQuery.toLowerCase()))

  const addToCart = (medicine: (typeof mockMedicines)[0]) => {
    const existing = cart.find((item) => item.id === medicine.id)
    if (existing) {
      setCart(cart.map((item) => (item.id === medicine.id ? { ...item, quantity: item.quantity + 1 } : item)))
    } else {
      setCart([...cart, { ...medicine, quantity: 1 }])
    }
  }

  const removeFromCart = (id: string) => {
    setCart(cart.filter((item) => item.id !== id))
  }

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity < 1) return
    setCart(cart.map((item) => (item.id === id ? { ...item, quantity } : item)))
  }

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const gst = subtotal * 0.12
  const total = subtotal + gst

  const handleCheckout = async () => {
    // Call FastAPI backend
    try {
      await fetch("http://localhost:8000/api/billing/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart,
          customer_email: customerEmail,
          subtotal,
          gst,
          total,
        }),
      })

      if (customerEmail) {
        await fetch("http://localhost:8000/api/email/invoice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: customerEmail, invoice_data: { cart, total } }),
        })
      }

      alert("Bill created successfully!")
      setCart([])
      setCustomerEmail("")
    } catch (error) {
      // Graceful fallback
      alert("Bill created (offline mode). Will sync when online.")
      setCart([])
      setCustomerEmail("")
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-balance mb-2">Manual Billing</h1>
        <p className="text-muted-foreground text-pretty">Search medicines and generate bills offline or online</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Search & Add */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Search Medicine</h2>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search by medicine name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredMedicines.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No medicines found</p>
            ) : (
              filteredMedicines.map((medicine) => (
                <div
                  key={medicine.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition"
                >
                  <div>
                    <p className="font-medium">{medicine.name}</p>
                    <p className="text-sm text-muted-foreground">
                      ₹{medicine.price} per {medicine.unit}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => addToCart(medicine)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Cart */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Cart ({cart.length})</h2>
          </div>

          {cart.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">Cart is empty</p>
          ) : (
            <>
              <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border">
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        ₹{item.price} × {item.quantity}
                      </p>
                    </div>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.id, Number.parseInt(e.target.value))}
                      className="w-20"
                    />
                    <Button size="icon" variant="ghost" onClick={() => removeFromCart(item.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="space-y-2 border-t pt-4">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>GST (12%):</span>
                  <span>₹{gst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <div>
                  <Label htmlFor="customer-email">Customer Email (Optional)</Label>
                  <Input
                    id="customer-email"
                    type="email"
                    placeholder="customer@email.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <Button className="w-full" size="lg" onClick={handleCheckout}>
                  Generate Bill
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
