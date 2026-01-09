# Aushadhi 360 - Feature Updates & Improvements

**Date**: January 9, 2026  
**Status**: Planning Phase  
**Priority**: High

---

## 📋 Feature Requests Summary

### 🎨 **1. Invoice System Unification**
**Priority**: HIGH  
**Status**: 🔴 Todo

**Requirements**:
- Create unified invoice template in settings
- Use same invoice everywhere: billing, print, customer review
- Make invoice customizable per user
- Settings should allow:
  - Logo upload
  - Store details customization
  - Color scheme selection
  - Invoice layout options

**Files to Modify**:
- `app/dashboard/settings/page.tsx` - Add invoice settings section
- `components/settings-page.tsx` - Invoice customization UI
- `lib/invoice-template.ts` - NEW: Unified template system
- `components/dashboard-home.tsx` - Use unified template
- `components/billing-page.tsx` - Use unified template

**Implementation Steps**:
1. Create invoice settings schema in database
2. Build invoice customization UI
3. Create reusable invoice component
4. Replace all invoice generation code
5. Add preview functionality

---

### 📧 **2. Email Templates Improvement**
**Priority**: HIGH  
**Status**: 🔴 Todo

**Requirements**:
- Improve OTP email template
- Better approval email design
- Add more template types:
  - Welcome email
  - Password reset
  - Invoice email
  - Low stock alerts
  - Expiry alerts

**Files to Modify**:
- `lib/email-service.ts` - Add template functions
- `app/api/email/send/route.ts` - Use new templates
- `app/api/auth/confirm/route.ts` - OTP email
- `app/api/admin/users/approve/route.ts` - Approval email

**Template Types Needed**:
```
1. OTP Confirmation Email
2. Registration Approval Email
3. Registration Rejection Email
4. Welcome Email
5. Password Reset Email
6. Invoice Email (with PDF)
7. Low Stock Alert Email
8. Expiry Alert Email
9. Monthly Report Email
```

---

### 👥 **3. Customer Management System**
**Priority**: HIGH  
**Status**: 🔴 Todo

**Requirements**:
- Each user has their own customer list
- Group bills by customer (email or phone)
- Customer profile with purchase history
- Customer insights (total spent, items purchased)

**Database Changes**:
```javascript
// New collection: customers
{
  _id: ObjectId,
  userId: String,              // Store owner
  email: String,               // Customer email
  phone: String,               // Customer phone
  name: String,                // Customer name
  totalPurchases: Number,      // Total amount spent
  visitCount: Number,          // Number of visits
  lastVisit: Date,
  createdAt: Date,
  billIds: [ObjectId]          // Reference to bills
}
```

**Files to Create**:
- `app/api/customers/route.ts` - Customer CRUD
- `app/api/customers/[customerId]/route.ts` - Individual customer
- `app/dashboard/customers/page.tsx` - Customer list page
- `components/customer-profile.tsx` - Customer details

---

### 🧾 **4. Billing History - Customer Grouping**
**Priority**: HIGH  
**Status**: 🔴 Todo

**Requirements**:
- In billing history page, add customer filter
- Group bills by same email OR same phone
- Show customer-wise purchase summary
- Click on customer → see all their bills

**Files to Modify**:
- `components/billing-page.tsx` - Add customer grouping view
- `app/api/billing/history/route.ts` - Add customer aggregation
- `app/api/billing/customers/route.ts` - NEW: Customer bill summary

**UI Features**:
- Customer filter dropdown
- Customer card with:
  - Name
  - Email/Phone
  - Total bills
  - Total amount spent
  - Last purchase date
- Click customer → Filter bills

---

### 🤖 **5. AI Doctor Call - FastAPI Authentication**
**Priority**: MEDIUM  
**Status**: 🔴 Todo

**Requirements**:
- In AI billing mode, add "Call AI Doctor" button
- Button triggers FastAPI `/login` endpoint
- Only show when authentication needed
- Handle authentication flow

**Files to Modify**:
- `components/billing-page.tsx` - Add AI Doctor call button
- `lib/api-config.ts` - Add FastAPI endpoints
- `app/api/ai/authenticate/route.ts` - NEW: Handle FastAPI auth

**Implementation**:
```typescript
// When AI mode authentication fails
if (response.status === 401) {
  showAIDoctorButton = true
}

// On button click
async function callAIDoctor() {
  const response = await fetch('/api/ai/authenticate', {
    method: 'POST',
    body: JSON.stringify({ email, apiKey })
  })
  // Handle response and retry AI recommendation
}
```

---

### 🔗 **6. Import Pages - Redirect to Products**
**Priority**: LOW  
**Status**: 🔴 Todo

**Requirements**:
- In both import pages (AI & Manual), add "View Products" button
- After successful import, show option to redirect
- Quick navigation to products page

**Files to Modify**:
- `components/import-medicine-page.tsx` - Add redirect button
- `components/manual-import-table-updated.tsx` - Add redirect button

**Implementation**:
```tsx
// After successful import
<Button onClick={() => router.push('/dashboard/products')}>
  View Imported Products →
</Button>
```

---

### ⚠️ **7. Error/Warning UI Improvements**
**Priority**: HIGH  
**Status**: 🔴 Todo

**Requirements**:
- All errors/warnings should have close (X) button
- Position: top-10, center, fixed
- Consistent styling across all pages
- Auto-dismiss after 5 seconds (optional)

**Files to Modify**:
- `components/ui/alert.tsx` - Add close button variant
- `lib/notification-manager.ts` - Update notification system
- All pages with error handling

**Component Update**:
```tsx
<Alert variant="destructive" className="fixed top-10 left-1/2 -translate-x-1/2 z-50 w-96">
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>{message}</AlertDescription>
  <Button 
    variant="ghost" 
    size="sm" 
    onClick={onClose}
    className="absolute top-2 right-2"
  >
    <X className="h-4 w-4" />
  </Button>
</Alert>
```

---

### 📊 **8. AI Import - Show New vs Updated Medicines**
**Priority**: MEDIUM  
**Status**: 🔴 Todo

**Requirements**:
- After AI import completes, show summary
- Separate lists:
  - New medicines (green badge)
  - Updated medicines (blue badge)
- Show all fields for each medicine
- Expandable/collapsible lists

**Files to Modify**:
- `components/import-medicine-page.tsx` - Add result summary UI
- `app/api/import/pipeline/route.ts` - Return categorized results

**UI Design**:
```
✅ Import Complete!

📦 New Medicines Added (15)
[Expandable list with medicine cards]

🔄 Updated Medicines (8)
[Expandable list with medicine cards]

[View All Products] [Import More]
```

---

### 🖼️ **9. File Preview - Adjustable Width**
**Priority**: LOW  
**Status**: 🔴 Todo

**Requirements**:
- File preview cards should have adjustable width
- Drag handle to resize
- Remember size preference (localStorage)
- Responsive on mobile

**Files to Modify**:
- `components/import-medicine-page.tsx` - Add resizable preview
- `components/manual-import-table-updated.tsx` - Add resizable preview

**Implementation**:
```tsx
<ResizablePanel defaultSize={50} minSize={30} maxSize={70}>
  <FilePreview file={uploadedFile} />
</ResizablePanel>
```

---

### ✅ **10. Manual Import - Required Fields**
**Priority**: MEDIUM  
**Status**: 🔴 Todo

**Requirements**:
Make the following fields REQUIRED in manual import:
- ✅ Expiry Date
- ✅ Category
- ✅ Medicine Forms
- ✅ Qty/Pack
- ✅ Cover Disease
- ✅ Symptoms
- ✅ Side Effects
- ✅ Instructions
- ✅ Description (Hinglish)

**Files to Modify**:
- `components/manual-import-table-updated.tsx` - Add validation
- `app/api/import/manual/route.ts` - Server-side validation

**Validation**:
```typescript
const requiredFields = [
  'Expiry Date', 'Category', 'Medicine Forms', 
  'Qty/Pack', 'Cover Disease', 'Symptoms', 
  'Side Effects', 'Instructions', 'Description in Hinglish'
]

// Check before save
if (!allFieldsPresent) {
  showError('Please fill all required fields')
}
```

---

### 🧾 **11. Billing - Customer Information Card**
**Priority**: MEDIUM  
**Status**: 🔴 Todo

**Requirements**:
- Replace "Draft" card with "Customer Information" card
- Show:
  - Customer name (input)
  - Customer email (input)
  - Customer phone (input)
  - Previous purchases count
  - Last purchase date
- Auto-fill if customer exists

**Files to Modify**:
- `components/billing-page.tsx` - Redesign draft card section

**UI Design**:
```
┌─────────────────────────────┐
│  Customer Information       │
├─────────────────────────────┤
│  Name:    [Input]          │
│  Email:   [Input]          │
│  Phone:   [Input]          │
│                             │
│  📊 Previous Purchases: 5   │
│  📅 Last Visit: 2 days ago  │
└─────────────────────────────┘
```

---

### ✨ **12. AI Loading Animation - Spark Icon**
**Priority**: LOW  
**Status**: 🔴 Todo

**Requirements**:
- Spark icon below "Get Recommendation" button
- During loading, change colors in animated manner
- Rainbow/gradient effect during API call
- Smooth transition

**Files to Modify**:
- `components/billing-page.tsx` - Add animated spark icon
- `components/ui/animated-spark.tsx` - NEW: Animated component

**Animation**:
```tsx
<Sparkles 
  className={cn(
    "h-6 w-6 transition-colors duration-300",
    isLoading && "animate-rainbow"
  )}
/>

// CSS
@keyframes rainbow {
  0% { color: #ff0000; }
  20% { color: #ff7f00; }
  40% { color: #ffff00; }
  60% { color: #00ff00; }
  80% { color: #0000ff; }
  100% { color: #8b00ff; }
}
```

---

### 🔢 **13. AI Mode - Serial Number on Cards**
**Priority**: LOW  
**Status**: 🔴 Todo

**Requirements**:
- After AI recommendation, show S.No on medicine cards
- Position: top-left of card
- Badge style with circle background
- Sequential numbering (1, 2, 3...)

**Files to Modify**:
- `components/billing-page.tsx` - Add S.No badge to AI cards

**UI Design**:
```
┌─────────────────────────┐
│ ①                       │
│  Paracetamol            │
│  500mg Tablet           │
│  ₹25.00                 │
└─────────────────────────┘
```

---

### 📄 **14. AI Invoice - Detailed Medicine Info**
**Priority**: MEDIUM  
**Status**: 🔴 Todo

**Requirements**:
- For AI-suggested medicines in invoice, show:
  - Usage instructions
  - Dosage information
  - Lifecycle (morning/evening/night)
  - Side effects (brief)
  - Precautions
- Different invoice section for AI medicines

**Files to Modify**:
- `components/dashboard-home.tsx` - buildInvoiceHtml function
- `components/billing-page.tsx` - Mark AI-suggested items

**Invoice Section**:
```html
<div class="ai-medicines">
  <h3>AI Recommended Medicines</h3>
  <table>
    <tr>
      <td>Medicine Name</td>
      <td>Dosage</td>
      <td>Usage</td>
      <td>Instructions</td>
    </tr>
    <!-- AI medicine rows with details -->
  </table>
</div>
```

---

### 🗑️ **15. Remove Quick Mode**
**Priority**: LOW  
**Status**: 🔴 Todo

**Requirements**:
- Remove "Quick Mode" option from billing page
- Clean up related code
- Remove UI components
- Update documentation

**Files to Modify**:
- `components/billing-page.tsx` - Remove quick mode toggle/section
- Remove any quick-mode-specific functions

---

## 🗓️ Implementation Timeline

### **Phase 1: High Priority (Week 1-2)**
- [ ] Invoice System Unification
- [ ] Email Templates Improvement
- [ ] Customer Management System
- [ ] Billing History - Customer Grouping
- [ ] Error/Warning UI Improvements

### **Phase 2: Medium Priority (Week 3-4)**
- [ ] AI Import - Show Results
- [ ] Manual Import - Required Fields
- [ ] Billing - Customer Information Card
- [ ] AI Invoice Details
- [ ] AI Doctor Call

### **Phase 3: Low Priority (Week 5)**
- [ ] Import Pages - Redirect Button
- [ ] File Preview - Adjustable Width
- [ ] AI Loading Animation
- [ ] AI Mode Serial Numbers
- [ ] Remove Quick Mode

---

## 📊 Progress Tracking

| Feature | Priority | Status | Assigned | ETA |
|---------|----------|--------|----------|-----|
| Invoice Unification | HIGH | 🔴 Todo | - | - |
| Email Templates | HIGH | 🔴 Todo | - | - |
| Customer Management | HIGH | 🔴 Todo | - | - |
| Billing History | HIGH | 🔴 Todo | - | - |
| AI Doctor Call | MEDIUM | 🔴 Todo | - | - |
| Import Redirect | LOW | 🔴 Todo | - | - |
| Error UI | HIGH | 🔴 Todo | - | - |
| AI Import Results | MEDIUM | 🔴 Todo | - | - |
| Preview Resize | LOW | 🔴 Todo | - | - |
| Required Fields | MEDIUM | 🔴 Todo | - | - |
| Customer Card | MEDIUM | 🔴 Todo | - | - |
| AI Loading | LOW | 🔴 Todo | - | - |
| AI Serial Numbers | LOW | 🔴 Todo | - | - |
| AI Invoice Details | MEDIUM | 🔴 Todo | - | - |
| Remove Quick Mode | LOW | 🔴 Todo | - | - |

---

## 🚀 Getting Started

### For Developers:
1. Review this document thoroughly
2. Pick a feature from Phase 1
3. Create a feature branch: `git checkout -b feature/invoice-system`
4. Implement and test
5. Create PR with detailed description
6. Update progress in this document

### Testing Checklist:
- [ ] Unit tests pass
- [ ] Manual testing completed
- [ ] Mobile responsive
- [ ] Performance acceptable
- [ ] No console errors
- [ ] Accessibility checked

---

## 📝 Notes

- All database changes require migration scripts
- UI changes should maintain current design language
- Performance impact should be minimal
- Backward compatibility where possible
- Document all new APIs

---

**Status Legend**:
- 🔴 Todo
- 🟡 In Progress
- 🟢 Completed
- 🔵 Testing
- ⚫ Blocked

---

**Last Updated**: January 9, 2026  
**Next Review**: January 16, 2026
