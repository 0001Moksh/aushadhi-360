# Billing Page - Feature Type Implementation

## Overview
The billing page now tracks how medicines enter the system using the `feature_type` field. This helps pharmacies understand which import method is most used and maintain better data quality control.

## Feature Types Tracked

| Feature Type | How Added | Example |
|---|---|---|
| `manual` | Manually added from Billing/Dashboard | User types in medicine details |
| `ai` | AI-assisted recommendations | Doctor AI suggests medicines |
| `excel` | Bulk import from Excel file | Upload medicines.xlsx |
| `csv` | Bulk import from CSV file | Upload medicines.csv |
| `ocr` | Image/Bill OCR extraction | Upload a bill photo |
| `image` | Image-based import | Photograph of invoice |

## Implementation in Billing Page

### How medicines are displayed
When a user searches or adds medicines in the billing page, the system tracks:
- When medicines were added (`createdAt`)
- How they were added (`feature_type`)
- When they were last updated (`updatedAt`)
- Their import status (`status_import`)

### Database Schema
```javascript
{
  Batch_ID: "BATCH123",
  "Name of Medicine": "Aspirin",
  Price_INR: 45,
  Total_Quantity: 100,
  feature_type: "excel",  // <- NEW FIELD
  status_import: "new item added via excel",  // <- UPDATED
  createdAt: 2024-01-16T10:30:00Z,
  updatedAt: 2024-01-16T10:30:00Z
}
```

## Using Feature Type Data

### In Frontend
Query medicines with feature type:
```javascript
// Get all medicines added manually
const medicines = data.medicines.filter(m => m.feature_type === 'manual');

// Get medicines by import method
const excelImports = data.medicines.filter(m => m.feature_type === 'excel');
const ocrImports = data.medicines.filter(m => m.feature_type === 'ocr');
```

### In Backend API
When calling `/api/medicines/search`, returned medicines include `feature_type`:
```json
{
  "medicines": [
    {
      "id": "BATCH123",
      "name": "Aspirin",
      "batch": "BATCH123",
      "price": 45,
      "quantity": 100,
      "category": "Analgesics",
      "form": "Tablet"
    }
  ]
}
```

## Manual Import Endpoint

### Endpoint
`POST /api/import/manual`

### Request Body
```javascript
{
  email: "user@pharmacy.com",
  medicines: [
    {
      Batch_ID: "BATCH123",
      "Name of Medicine": "Aspirin",
      Price_INR: 45,
      Total_Quantity: 100,
      Category: "Analgesics"
    }
  ],
  featureType: "manual" // Optional, defaults to 'manual'
}
```

### Response
```javascript
{
  message: "Manual import saved",
  summary: {
    total: 1,
    updated: 0,
    new: 1,
    featureType: "manual",
    newColumnsDetected: false,
    newColumns: undefined
  }
}
```

## Pipeline Import Endpoint

### Endpoint
`POST /api/import/pipeline` (Multipart form data)

### Supported Input Types
- `excel` - Excel/XLSX files
- `csv` - CSV files
- `ocr` - Image-based import (JPG, PNG)
- `image` - PDF files

### Automatic Feature Type Detection
```javascript
// Based on file input
if (file.name.endsWith('.xlsx')) featureType = 'excel'
if (file.name.endsWith('.csv')) featureType = 'csv'
if (file.type.includes('image') || inputType === 'ocr') featureType = 'ocr'
```

## Querying by Feature Type

### MongoDB Query Example
```javascript
// Find all medicines added via Excel
db.medicines.find({ userId: "user@pharmacy.com", feature_type: "excel" })

// Find all OC imported medicines
db.medicines.find({ userId: "user@pharmacy.com", feature_type: "ocr" })

// Count by feature type
db.medicines.aggregate([
  { $match: { userId: "user@pharmacy.com" } },
  { $group: { _id: "$feature_type", count: { $sum: 1 } } }
])
```

## Reports & Analytics

### Getting Import Statistics
```javascript
const methods = await db.collection('medicines')
  .aggregate([
    { $match: { userId: email } },
    { $group: { 
      _id: '$feature_type', 
      count: { $sum: 1 } 
    }},
    { $sort: { count: -1 } }
  ])
  .toArray();

// Result:
// [
//   { _id: 'excel', count: 150 },
//   { _id: 'manual', count: 45 },
//   { _id: 'ocr', count: 12 }
// ]
```

## Benefits

1. **Data Quality Tracking** - Know which import methods produce high-quality data
2. **Audit Trail** - See how each medicine entered the system
3. **Performance Analysis** - Identify which methods are most used
4. **Error Tracking** - Correlate data issues with import methods
5. **User Behavior** - Understand user preferences for data entry

## Billing Page Integration

The billing page automatically:
- Receives medicines with `feature_type` from API
- Displays them in search results
- Preserves feature type when updating quantities
- Tracks feature type in cart for audit purposes

### Example Flow
1. User searches for "Aspirin"
2. API returns medicines with `feature_type`
3. User sees results in search dropdown
4. User clicks to add to cart
5. Medicine added with feature_type preserved
6. When bill is created, feature_type is recorded

