# Aushadhi 360 - Database Architecture

**Database**: `aushadhi360` (MongoDB)  
**Version**: 1.0  
**Last Updated**: January 9, 2026

---

## Overview

Aushadhi 360 uses MongoDB as the primary database with the following collections:

```
aushadhi360 (Database)
├── users                    (User accounts & authentication)
├── medicines                (Medicine inventory per user)
├── bills                    (Billing & invoice history)
├── orders                   (Customer orders)
├── registration_requests    (Pending user registrations)
└── userDocuments           (User verification documents)
```

---

## 1. Users Collection

**Purpose**: Stores user accounts, authentication, and profile information.

### Schema

| Field | Type | Description | Index | Required |
|-------|------|-------------|-------|----------|
| `_id` | ObjectId | Auto-generated unique identifier | Primary | Yes |
| `email` | String | User email address | Unique, Indexed | Yes |
| `passwordHash` | String | Bcrypt hashed password | - | Yes |
| `ownerName` | String | Name of the store owner | - | Yes |
| `storeName` | String | Pharmacy/store name | - | Yes |
| `phone` | String | Contact phone number | - | Yes |
| `address` | String | Store physical address | - | Yes |
| `approved` | Boolean | Admin approval status | Indexed | Yes |
| `role` | String | User role (admin/user) | Indexed | Yes |
| `createdAt` | Date | Account creation timestamp | Indexed | Yes |
| `lastLogin` | Date | Last login timestamp | - | No |
| `groqKeyImport` | String | Groq API key for import | - | No |
| `groqKeyAssist` | String | Groq API key for AI assist | - | No |
| `totalMedicines` | Number | Total medicines in inventory | - | No |
| `photoUrl` | String | Profile photo URL | - | No |
| `passwordReset` | Object | Password reset token & expiry | - | No |

### Indexes

```javascript
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ approved: 1 })
db.users.createIndex({ role: 1 })
db.users.createIndex({ createdAt: -1 })
```

### Sample Document

```json
{
  "_id": ObjectId("6960b34221868eeec1485a7e"),
  "email": "mokshbhardwaj2333@gmail.com",
  "passwordHash": "$2a$10$...",
  "ownerName": "Moksh Bhardwaj",
  "storeName": "Health Plus Pharmacy",
  "phone": "+91-9876543210",
  "address": "123 Main Street, Delhi",
  "approved": true,
  "role": "user",
  "createdAt": ISODate("2026-01-05T10:30:00Z"),
  "lastLogin": ISODate("2026-01-09T08:15:00Z"),
  "groqKeyImport": "gsk_...",
  "groqKeyAssist": "gsk_...",
  "totalMedicines": 245,
  "photoUrl": "https://...",
  "passwordReset": {
    "token": "abc123...",
    "expiresAt": ISODate("2026-01-10T12:00:00Z")
  }
}
```

---

## 2. Medicines Collection

**Purpose**: Stores medicine inventory data for each user (multi-tenant).

### Schema

| Field | Type | Description | Index | Required |
|-------|------|-------------|-------|----------|
| `_id` | ObjectId | Auto-generated unique identifier | Primary | Yes |
| `userId` | String | User email/ID (tenant isolation) | Indexed | Yes |
| `Batch_ID` | String | Batch/lot number | Compound (userId+Batch_ID) | Yes |
| `Name of Medicine` | String | Medicine name | Text Indexed | Yes |
| `Category` | String | Medicine category | Compound (userId+Category) | Yes |
| `Medicine Forms` | String | Form (tablet, syrup, etc.) | Text Indexed | Yes |
| `Price_INR` | Number | Price in Indian Rupees | - | Yes |
| `Total_Quantity` | Number | Available quantity | Compound (userId+quantity) | Yes |
| `Expiry Date` | Date | Medicine expiry date | Compound (userId+expiry) | Yes |
| `Manufacturer` | String | Manufacturer name | - | No |
| `Cover Disease` | String | Disease coverage | - | No |
| `Symptoms` | String | Treated symptoms | - | No |
| `Side Effects` | String | Known side effects | - | No |
| `Instructions` | String | Usage instructions | - | No |
| `Description in Hinglish` | String | Hindi-English description | Text Indexed | No |
| `Quantity_per_pack` | String | Units per pack | - | No |
| `status_import` | String | Import status | - | No |
| `otherInfo` | Object | Additional metadata | - | No |

### Indexes

```javascript
// Compound indexes for multi-tenant queries
db.medicines.createIndex({ userId: 1, Batch_ID: 1 })
db.medicines.createIndex({ userId: 1, Category: 1 })
db.medicines.createIndex({ userId: 1, Total_Quantity: 1 })
db.medicines.createIndex({ userId: 1, "Expiry Date": 1 })

// Text search across name, form, description
db.medicines.createIndex({
  "Name of Medicine": "text",
  "Medicine Forms": "text",
  "Description in Hinglish": "text"
})

// Single field index for user isolation
db.medicines.createIndex({ userId: 1 })
```

### Sample Document

```json
{
  "_id": ObjectId("6960c12345678eeec1485b1a"),
  "userId": "mokshbhardwaj2333@gmail.com",
  "Batch_ID": "BATCH001",
  "Name of Medicine": "Paracetamol",
  "Category": "Analgesic",
  "Medicine Forms": "Tablet",
  "Price_INR": 25.50,
  "Total_Quantity": 500,
  "Expiry Date": ISODate("2027-06-30T00:00:00Z"),
  "Manufacturer": "Sun Pharma",
  "Cover Disease": "Fever, Pain",
  "Symptoms": "Headache, Body ache, Fever",
  "Side Effects": "Rare allergic reactions",
  "Instructions": "Take 1-2 tablets every 6 hours",
  "Description in Hinglish": "Bukhar aur dard ke liye dawai",
  "Quantity_per_pack": "10 tablets",
  "status_import": "active",
  "otherInfo": {
    "supplier": "MedDist Pvt Ltd",
    "importDate": "2026-01-05"
  }
}
```

---

## 3. Bills Collection

**Purpose**: Stores billing and invoice history for sales transactions.

### Schema

| Field | Type | Description | Index | Required |
|-------|------|-------------|-------|----------|
| `_id` | ObjectId | Auto-generated unique identifier | Primary | Yes |
| `userEmail` | String | Store owner email | Indexed | Yes |
| `createdAt` | Date | Bill creation timestamp | Compound (userEmail+createdAt) | Yes |
| `billId` | String | Unique invoice number | Unique | Yes |
| `items` | Array | Billed medicine items | - | Yes |
| `items[].medicineId` | ObjectId | Reference to medicine | - | Yes |
| `items[].name` | String | Medicine name | - | Yes |
| `items[].batch` | String | Batch ID | - | No |
| `items[].quantity` | Number | Quantity sold | - | Yes |
| `items[].price` | Number | Unit price | - | Yes |
| `items[].form` | String | Medicine form | - | No |
| `items[].qtyPerPack` | Number | Quantity per pack | - | No |
| `items[].description` | String | Item description | - | No |
| `subtotal` | Number | Subtotal before GST | - | Yes |
| `gst` | Number | GST amount | - | Yes |
| `total` | Number | Total amount (with GST) | - | Yes |
| `customerEmail` | String | Customer email | - | No |
| `customerName` | String | Customer name | - | No |

### Indexes

```javascript
db.bills.createIndex({ userEmail: 1, createdAt: -1 })
db.bills.createIndex({ billId: 1 }, { unique: true })
db.bills.createIndex({ userEmail: 1 })
db.bills.createIndex({ createdAt: -1 })
```

### Sample Document

```json
{
  "_id": ObjectId("6960d34567890eeec1485c2b"),
  "userEmail": "mokshbhardwaj2333@gmail.com",
  "createdAt": ISODate("2026-01-09T14:30:00Z"),
  "billId": "INV-1704812400000",
  "items": [
    {
      "medicineId": ObjectId("6960c12345678eeec1485b1a"),
      "name": "Paracetamol",
      "batch": "BATCH001",
      "quantity": 2,
      "price": 25.50,
      "form": "Tablet",
      "qtyPerPack": 10,
      "description": "Fever and pain relief"
    },
    {
      "medicineId": ObjectId("6960c12345678eeec1485b1b"),
      "name": "Crocin Advance",
      "batch": "BATCH002",
      "quantity": 1,
      "price": 35.00,
      "form": "Tablet",
      "qtyPerPack": 15,
      "description": "Fast fever relief"
    }
  ],
  "subtotal": 86.00,
  "gst": 10.32,
  "total": 96.32,
  "customerEmail": "customer@example.com",
  "customerName": "Rajesh Kumar"
}
```

---

## 4. Orders Collection

**Purpose**: Stores customer order details and fulfillment status.

### Schema

| Field | Type | Description | Index | Required |
|-------|------|-------------|-------|----------|
| `_id` | ObjectId | Auto-generated unique identifier | Primary | Yes |
| `userEmail` | String | Store owner email | Indexed | Yes |
| `createdAt` | Date | Order creation timestamp | Compound (userEmail+createdAt) | Yes |
| `orderId` | String | Unique order number | Unique | No |
| `customerName` | String | Customer name | - | No |
| `customerPhone` | String | Customer phone | - | No |
| `items` | Array | Ordered items | - | No |
| `status` | String | Order status | Indexed | No |
| `totalAmount` | Number | Total order amount | - | No |
| `paymentMethod` | String | Payment method | - | No |
| `deliveryAddress` | String | Delivery address | - | No |

### Indexes

```javascript
db.orders.createIndex({ userEmail: 1, createdAt: -1 })
db.orders.createIndex({ userEmail: 1 })
db.orders.createIndex({ status: 1 })
```

### Sample Document

```json
{
  "_id": ObjectId("6960e45678901eeec1485d3c"),
  "userEmail": "mokshbhardwaj2333@gmail.com",
  "createdAt": ISODate("2026-01-09T16:00:00Z"),
  "orderId": "ORD-1704819600000",
  "customerName": "Priya Sharma",
  "customerPhone": "+91-9988776655",
  "items": [
    {
      "medicineId": ObjectId("6960c12345678eeec1485b1a"),
      "name": "Paracetamol",
      "quantity": 3,
      "price": 25.50
    }
  ],
  "status": "pending",
  "totalAmount": 76.50,
  "paymentMethod": "cash",
  "deliveryAddress": "456 Park Road, Delhi"
}
```

---

## 5. Registration Requests Collection

**Purpose**: Stores pending user registration requests awaiting admin approval.

### Schema

| Field | Type | Description | Index | Required |
|-------|------|-------------|-------|----------|
| `_id` | ObjectId | Auto-generated unique identifier | Primary | Yes |
| `email` | String | Applicant email | Indexed | Yes |
| `status` | String | Request status (pending/approved/rejected) | Indexed | Yes |
| `name` | String | Applicant name | - | Yes |
| `storeName` | String | Store name | - | Yes |
| `phone` | String | Phone number | - | Yes |
| `address` | String | Store address | - | Yes |
| `createdAt` | Date | Request submission date | Indexed | Yes |
| `documents` | Array | Uploaded document IDs | - | No |

### Indexes

```javascript
db.registration_requests.createIndex({ email: 1 })
db.registration_requests.createIndex({ status: 1 })
db.registration_requests.createIndex({ createdAt: -1 })
```

### Sample Document

```json
{
  "_id": ObjectId("6960f56789012eeec1485e4d"),
  "email": "newpharmacy@example.com",
  "status": "pending",
  "name": "Amit Singh",
  "storeName": "City Care Pharmacy",
  "phone": "+91-9123456789",
  "address": "789 Mall Road, Mumbai",
  "createdAt": ISODate("2026-01-08T10:00:00Z"),
  "documents": [
    "doc_license_123",
    "doc_gst_456"
  ]
}
```

---

## 6. User Documents Collection

**Purpose**: Stores verification documents uploaded by users during registration.

### Schema

| Field | Type | Description | Index | Required |
|-------|------|-------------|-------|----------|
| `_id` | ObjectId | Auto-generated unique identifier | Primary | Yes |
| `userId` | String | User email or ObjectId | Indexed | Yes |
| `documentName` | String | Document name | - | Yes |
| `documentType` | String | Document type (license, gst, etc.) | - | Yes |
| `driveUrl` | String | Google Drive URL | - | Yes |
| `uploadedAt` | Date | Upload timestamp | Indexed | Yes |
| `status` | String | Verification status | - | No |
| `verifiedBy` | String | Admin who verified | - | No |

### Indexes

```javascript
db.userDocuments.createIndex({ userId: 1 })
db.userDocuments.createIndex({ uploadedAt: -1 })
db.userDocuments.createIndex({ userId: 1, documentType: 1 })
```

### Sample Document

```json
{
  "_id": ObjectId("6960g67890123eeec1485f5e"),
  "userId": "newpharmacy@example.com",
  "documentName": "Drug License",
  "documentType": "license",
  "driveUrl": "https://drive.google.com/file/d/abc123xyz",
  "uploadedAt": ISODate("2026-01-08T10:05:00Z"),
  "status": "verified",
  "verifiedBy": "admin@aushadhi360.com"
}
```

---

## Database Relationships

### Entity Relationship Diagram

```
┌─────────────┐         ┌──────────────┐
│    users    │────────>│  medicines   │
│  (1 user)   │  owns   │ (many items) │
└─────────────┘         └──────────────┘
      │
      │ creates
      ├────────────────┐
      │                │
      ▼                ▼
┌─────────┐      ┌──────────┐
│  bills  │      │  orders  │
│ (many)  │      │ (many)   │
└─────────┘      └──────────┘

┌────────────────────┐         ┌──────────────┐
│ registration_      │────────>│    users     │
│    requests        │ creates │  (approved)  │
└────────────────────┘         └──────────────┘
         │
         │ references
         ▼
┌──────────────────┐
│  userDocuments   │
│  (verification)  │
└──────────────────┘
```

### Key Relationships

1. **Users → Medicines**: One-to-Many
   - One user owns multiple medicines
   - `medicines.userId` references `users.email`

2. **Users → Bills**: One-to-Many
   - One user creates multiple bills
   - `bills.userEmail` references `users.email`

3. **Users → Orders**: One-to-Many
   - One user receives multiple orders
   - `orders.userEmail` references `users.email`

4. **Registration Requests → Users**: One-to-One
   - Approved request creates user account
   - `registration_requests.email` → `users.email`

5. **Registration Requests → User Documents**: One-to-Many
   - One request has multiple documents
   - `userDocuments.userId` references `registration_requests.email`

6. **Medicines → Bills.items**: Many-to-Many
   - Bills reference medicines via `items[].medicineId`

---

## Index Strategy

### Performance Optimization

1. **Compound Indexes** for multi-tenant queries:
   ```javascript
   { userId: 1, createdAt: -1 }  // Time-based queries per user
   { userId: 1, category: 1 }    // Category filtering per user
   { userId: 1, quantity: 1 }    // Low stock alerts per user
   ```

2. **Text Indexes** for search:
   ```javascript
   // Medicine search
   { "Name of Medicine": "text", "Description in Hinglish": "text" }
   ```

3. **Unique Indexes** for data integrity:
   ```javascript
   { email: 1 }     // Unique user emails
   { billId: 1 }    // Unique invoice numbers
   ```

### Index Usage Guidelines

- **Always query with `userId/userEmail`** for tenant isolation
- Use `.explain()` to verify index usage
- Monitor slow queries with profiling
- Keep indexes selective (high cardinality)

---

## Data Validation Rules

### MongoDB Schema Validation

```javascript
// Users collection validation
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "passwordHash", "ownerName", "storeName"],
      properties: {
        email: {
          bsonType: "string",
          pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
        },
        approved: { bsonType: "bool" },
        role: { enum: ["user", "admin"] }
      }
    }
  }
})

// Medicines collection validation
db.createCollection("medicines", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["userId", "Name of Medicine", "Total_Quantity"],
      properties: {
        Total_Quantity: { bsonType: "number", minimum: 0 },
        Price_INR: { bsonType: "number", minimum: 0 }
      }
    }
  }
})
```

---

## Backup & Maintenance

### Backup Strategy

```bash
# Daily backup (automated)
mongodump --uri="mongodb+srv://..." --out=/backup/$(date +%Y%m%d)

# Weekly full backup
mongodump --uri="mongodb+srv://..." --gzip --archive=aushadhi360_$(date +%Y%m%d).gz
```

### Maintenance Tasks

1. **Weekly**:
   - Analyze slow queries
   - Check index usage
   - Monitor collection sizes

2. **Monthly**:
   - Rebuild indexes if fragmented
   - Archive old bills/orders
   - Review unused indexes

3. **Quarterly**:
   - Full database audit
   - Performance tuning
   - Schema evolution planning

---

## Security & Access Control

### MongoDB User Roles

```javascript
// Application user (read/write on aushadhi360)
db.createUser({
  user: "aushadhi_app",
  pwd: "secure_password",
  roles: [
    { role: "readWrite", db: "aushadhi360" }
  ]
})

// Admin user (full access)
db.createUser({
  user: "aushadhi_admin",
  pwd: "admin_password",
  roles: [
    { role: "dbOwner", db: "aushadhi360" }
  ]
})
```

### Connection String

```
mongodb+srv://aushadhi_app:password@cluster.mongodb.net/aushadhi360?retryWrites=true&w=majority
```

---

## Performance Benchmarks

### Target Metrics

| Operation | Target Latency | Index Used |
|-----------|---------------|------------|
| User login | < 100ms | `email` |
| Medicine search | < 200ms | Text index |
| Bill creation | < 300ms | `userEmail` |
| Dashboard load | < 500ms | Compound indexes |
| Low stock query | < 150ms | `userId + quantity` |

### Monitoring Queries

```javascript
// Find slow queries (> 100ms)
db.system.profile.find({ millis: { $gt: 100 } }).sort({ ts: -1 })

// Check index usage
db.medicines.aggregate([
  { $indexStats: {} }
])

// Collection stats
db.medicines.stats()
```

---

## Migration & Evolution

### Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-09 | Initial schema design |

### Future Enhancements

- [ ] Add `prescriptions` collection for prescription tracking
- [ ] Add `notifications` collection for user alerts
- [ ] Add `auditLog` collection for action tracking
- [ ] Implement sharding for `medicines` collection (if > 10M docs)
- [ ] Add geospatial indexes for location-based queries

---

## Contact & Support

**Database Administrator**: admin@aushadhi360.com  
**Documentation**: [Database Wiki](https://wiki.aushadhi360.com/db)  
**Issue Tracker**: [GitHub Issues](https://github.com/aushadhi360/db/issues)

---

**Last Review**: January 9, 2026  
**Next Review**: April 9, 2026
