# 🩺 Aushadhi 360

**Complete Medical Store Management Software**

**Project Owner:** Moksh Bhardwaj  
Full project docs are consolidated in [COMBINED_DOCS.md](COMBINED_DOCS.md).

---

## 🌐 Project Overview

**Aushadhi 360** is a pharmacist-first, trust-driven medical store management system that blends **offline reliability** with **responsible AI assistance**. The platform modernizes daily pharmacy operations—billing, inventory, alerts, and reporting—while ensuring that **all medical decisions remain under the pharmacist’s control**.

The system is designed for Indian medical stores, prioritizing safety, simplicity, and compliance without replacing professional medical judgment.

---

## 🔐 1. Login & Access Control

### 🧑‍⚕️ Store User (Pharmacist)

* Secure login using **email & password**
* Access enabled **only after admin approval**
* Passwords stored using **strong encryption**
* Role-restricted access to ensure safe usage

### 👑 Admin (System Owner)

Admin has full administrative authority:

* ✅ Create and approve store users
* ❌ Block, suspend, or delete users
* 🔐 Reset passwords (passwords are never visible)
* 📢 Send system-wide announcements & alerts

---

## 📊 Medical Store Dashboard

### 🏁 Entry Point

Upon login, users land on a **clean and intuitive dashboard** providing a real-time snapshot of store activity.

### 🔍 Core Dashboard Features

* **Manual Medicine Search (Offline)**
  Fast medicine lookup without internet or AI dependency

* **Ask AI (Online – Assisted Mode)**
  Symptom-based medicine suggestions under pharmacist supervision

* **Smart Alert Cards**

  * Low stock warnings
  * Expiry notifications
  * Top-selling and sold-out medicines

### 🧭 UI Layout

* **Top-Left:** User profile (name, email, photo)
* **Left Sidebar Navigation:**

  * Dashboard
  * Data Analytics
  * NYT Deva Chatbot
* **Bottom-Left:** Settings & preferences

### 📤 Import / Export Tools

* Filters: All Medicines / Low Stock / Expiring Soon
* Export reports in **PDF or Excel** format

---

## 🧾 2. Manual Medicine Search & Billing (Offline)

### Workflow

1. Enter or speak medicine name
2. Select medicine from available stock
3. Choose quantity (strip / tablet / unit)
4. Add to cart
5. Proceed to billing

### 💰 Billing Automation

* Automatic price calculation
* GST handling
* Discount application
* Clear final payable amount

### 📧 Optional Invoice Sharing

* Prompt to send bill via **email** or **print**

### 🗂️ Data Handling

* Every sale saved with date & time
* Cart auto-clears after successful billing
* Works fully offline

---

## 🤖 3. Ask AI – Symptom-Based Assistance (Online)

### Purpose

Helps pharmacists assist customers who describe **symptoms instead of medicine names**.

### Flow

1. Select **Ask AI**
2. Enter customer symptoms (e.g., stomach pain, gas)
3. AI processes input through a **safe recommendation engine**
4. System suggests **only OTC medicines available in store stock**

### 🛡️ Safety & Ethics

* Prescription medicines are **strictly blocked**
* Medical disclaimer always displayed
* Final medicine selection remains with the pharmacist

---

## 📷 4. Medicine Import via Bill (Image / PDF / Excel / CSV)

### Purpose

Rapid inventory updates using supplier bills or digital files.

### Supported Inputs

* Bill photo (camera upload)
* PDF invoice
* Excel file
* CSV file

### Smart Import Logic

* Existing medicine → **Quantity & price updated**
* New medicine → **Auto-added with AI-assisted details**

### Verification Step

* Editable preview shown before final save
* No data is saved without user confirmation

---

## 📉 5. Low Stock Alerts

* Continuous stock monitoring
* Threshold-based alerts
* Dashboard notifications
* Optional email alerts
* Export low-stock reports (PDF / Excel)

---

## ⏳ 6. Expiry Management & Alerts

* Daily expiry checks
* Medicines expiring within **30 days** flagged
* Expired items marked **DO NOT SELL**
* Automatically blocked from billing
* Expiry reports exportable (PDF / Excel)

---

## 💬 7. Chatbot-Based Medicine Query & Export

### Example Query

> Show medicines for stomach pain

### Output

* Disease-wise medicine list
* Filtered by current stock
* Exportable to Excel

### Use Cases

* Purchase planning
* Quick medical reference
* Inventory strategy

---

## 🔁 Workflow Summary

| Step | Action                     |
| ---: | -------------------------- |
|    1 | Login to system            |
|    2 | Manual search or AI assist |
|    3 | Add medicines to cart      |
|    4 | Confirm billing            |
|    5 | Send invoice (optional)    |
|    6 | Sale auto-saved            |
|    7 | Stock & expiry alerts      |
|    8 | Import stock via bill      |
|    9 | Export data via chatbot    |

---

## � Technical Architecture & Data Flow

### Technology Stack

**Frontend:**
- Next.js 16.0.10 (React framework)
- TypeScript (type-safe development)
- Tailwind CSS + shadcn/ui (modern UI components)
- React Hooks (state management)

**Backend:**
- Next.js API Routes (serverless functions)
- MongoDB (NoSQL database)
- Mongoose (ODM for MongoDB)
- JWT (JSON Web Tokens for authentication)

**Additional Services:**
- Nodemailer (email delivery)
- LocalStorage (client-side persistence for drafts/favorites)

### 📋 Detailed Billing Workflow

#### 1. Medicine Search Flow
```
User Input → Search API → MongoDB Query → Medicine Results
                                           ↓
                              [Name, Batch, Price, Quantity,
                               Category, Form, Description]
```

**API Endpoint:** `/api/medicines/search`
- Searches by name, batch, or category
- Returns medicine details including "Description in Hinglish"
- Includes stock availability check

#### 2. Cart Management Flow
```
Medicine Selected → Add to Cart → Cart State (React)
                                        ↓
                         [Items Array with Descriptions]
                                        ↓
                              Local State Management
```

**Features:**
- Real-time quantity validation
- Automatic price calculation
- Description propagation from API
- Out-of-stock prevention

#### 3. Draft Bill System Flow
```
Cart Items → Save Draft → LocalStorage
                              ↓
                    [DraftBill Interface]
              {id, createdAt, items, totals, customerEmail}
                              ↓
                    Drafts Tab Display
                              ↓
              [Restore] ← User Action → [Delete]
```

**Features:**
- Persistent draft storage using browser localStorage
- Multiple drafts support with unique IDs
- One-click restore to cart
- Draft metadata (timestamp, totals, customer info)

#### 4. Checkout & Invoice Generation Flow
```
Cart Items → Checkout → Bill Creation API → MongoDB Save
                             ↓                    ↓
                    Invoice HTML Generator    Bill Record
                             ↓                    ↓
                    [Invoice Template]      [History Entry]
                             ↓
                    Print Window / Email Service
```

**API Endpoint:** `/api/billing/create`
- Creates bill record in database
- Updates medicine inventory (reduces stock)
- Generates unique bill ID with timestamp
- Returns bill data for invoice generation

**Invoice Template Variables:**
- `payload.items` - Cart items with descriptions
- `payload.subtotal` - Pre-tax amount
- `payload.gst` - 18% tax amount
- `payload.total` - Final payable amount
- `payload.customerEmail` - Customer identifier
- `payload.billId` - Unique invoice number
- `payload.invoiceDate` - Transaction timestamp
- `payload.storeName`, `storePhone`, `storeAddress` - Store details

#### 5. Billing History Flow
```
User Request → History API → MongoDB Query (limit: 200)
                                  ↓
                          Sort by Date (Ascending)
                                  ↓
                          [All User Bills]
                                  ↓
                    Display in History Tab
                                  ↓
              View Invoice → Reuse Invoice Generator
                                  ↓
                          Preview in New Window
```

**API Endpoint:** `/api/billing/history`
- Fetches up to 200 recent bills (ascending order - oldest first)
- Includes full bill data (items, totals, customer info, store name)
- Supports invoice preview/reprint functionality

#### 6. Email Invoice Flow (Optional)
```
Customer Email Provided? → Yes → Email API → Nodemailer
                                       ↓
                              Generate HTML Invoice
                                       ↓
                              Send via SMTP
                                       ↓
                         Confirmation to User
```

**API Endpoint:** `/api/email/invoice`
- Sends invoice to customer email
- Uses same HTML template as print invoice
- Includes store branding and contact info

### 🗄️ Database Schema

#### Medicine Collection
```typescript
{
  _id: ObjectId,
  name: string,
  batch: string,
  price: number,
  quantity: number,
  category: string,
  form: string,
  "Description in Hinglish": string,  // Primary description field
  expiryDate?: Date,
  manufacturer?: string,
  // ... other fields
}
```

#### Bills Collection
```typescript
{
  _id: ObjectId,
  userId: ObjectId,  // Reference to user
  billId: string,    // Unique invoice number (format: BILL-YYYYMMDD-HHMMSS)
  items: [
    {
      medicineId: ObjectId,
      name: string,
      batch: string,
      quantity: number,
      price: number,
      subtotal: number,
      description?: string
    }
  ],
  subtotal: number,
  gst: number,
  total: number,
  customerEmail?: string,
  createdAt: Date
}
```

#### Users Collection
```typescript
{
  _id: ObjectId,
  email: string,
  passwordHash: string,  // Hashed password
  fullName: string,
  role: 'user' | 'admin',
  storeName?: string,
  storePhone?: string,
  storeAddress?: string,
  isApproved: boolean,   // Admin approval status
  createdAt: Date
}
```

### 🔐 Security & Authentication

**Password Security:**
- Passwords hashed using bcrypt
- Never stored or transmitted in plain text
- Admin can reset passwords but never view them

**API Security:**
- JWT-based authentication
- Protected routes require valid tokens
- Role-based access control (user vs admin)

**Data Validation:**
- Input sanitization on all API routes
- TypeScript type checking
- Mongoose schema validation

### 📱 Client-Side State Management

**React Hooks Used:**
- `useState` - Component state (cart, medicines, drafts, bills)
- `useEffect` - Side effects (API calls, localStorage sync)
- `useCallback` - Memoized functions (search, checkout)
- `useRef` - DOM references (search input focus)

**LocalStorage Keys:**
- `billing_drafts` - Draft bills array
- `billing_favorites` - Favorite medicine IDs

### 🎨 UI Component Structure

```
billing-page.tsx (Main Component)
  ├── Search Tab
  │   ├── Search Input (with debounce)
  │   ├── Medicine Cards
  │   └── Add to Cart Buttons
  ├── Drafts Tab
  │   ├── Draft Cards
  │   ├── Restore Draft Button
  │   └── Delete Draft Button
  ├── History Tab
  │   ├── Bill Cards
  │   └── View Invoice Button
  └── Cart Section
      ├── Cart Items List
      ├── Price Summary (Subtotal, GST, Total)
      ├── Customer Email Input
      ├── Save to Draft Button
      └── Generate Bill Button
```

---

## �🚀 Future Enhancements

* Barcode & QR scanning
* Voice-based medicine search
* Multi-role access (staff / manager)
* Advanced analytics & profit insights
* Customer history & loyalty program
* Offline-to-cloud sync
* Android & iOS mobile applications

---

## 🏁 Final Note

**Aushadhi 360** is built on a **safety-first and pharmacist-first philosophy**. The system enhances efficiency through automation and AI while ensuring that **medical authority, responsibility, and trust always remain with the pharmacist**.

This is not just software—it is a **digital assistant for responsible healthcare retail**.
