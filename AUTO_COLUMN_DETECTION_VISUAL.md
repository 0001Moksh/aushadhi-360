# Auto-Column Detection: Visual Flow

## Manual Import Flow

```
┌─────────────────────────────────────────────┐
│ User Uploads Excel File                     │
│ Columns: Batch_ID, Name, Price, Location   │
└────────────────┬────────────────────────────┘
                 │
                 ▼
        ┌────────────────────┐
        │  Parse Excel File  │
        │  Extract Records   │
        └────────┬───────────┘
                 │
                 ▼
    ┌────────────────────────────────────┐
    │ Identify Standard Columns:         │
    │ ✓ Batch_ID (known)                 │
    │ ✓ Name (known)                     │
    │ ✓ Price (known)                    │
    │ ✗ Location (UNKNOWN)               │
    └────────────┬───────────────────────┘
                 │
                 ▼
    ┌────────────────────────────────────┐
    │ Auto-Detect Unknown Columns        │
    │ • Location → otherInfo             │
    └────────────┬───────────────────────┘
                 │
                 ▼
    ┌────────────────────────────────────┐
    │ Create Row with otherInfo:         │
    │ {                                  │
    │   Batch_ID: "B001",                │
    │   name: "Aspirin",                 │
    │   price: "50",                     │
    │   otherInfo: {                     │
    │     Location: "Warehouse A2"       │
    │   }                                │
    │ }                                  │
    └────────────┬───────────────────────┘
                 │
                 ▼
    ┌────────────────────────────────────┐
    │ Show Preview with Auto-Detected    │
    │ Columns Ready for Review           │
    └────────────┬───────────────────────┘
                 │
                 ▼
    ┌────────────────────────────────────┐
    │ User Saves to Inventory            │
    │ otherInfo Persisted to MongoDB     │
    └────────────────────────────────────┘
```

## AI Import Flow

```
┌─────────────────────────────────────────────┐
│ User Uploads Excel/Image (AI Pipeline)      │
└────────────────┬────────────────────────────┘
                 │
                 ▼
    ┌────────────────────────────────────┐
    │ LAYER 1: Validation                │
    └────────────┬───────────────────────┘
                 │
                 ▼
    ┌────────────────────────────────────┐
    │ LAYER 2: Extract Document          │
    │ • For Excel: Parse & Auto-Detect   │
    │   Unknown Columns → otherInfo      │
    │ • For Images: OCR via Groq         │
    └────────────┬───────────────────────┘
                 │
                 ▼
    ┌────────────────────────────────────┐
    │ LAYER 3-4: Match & Categorize      │
    │ • Merge otherInfo with existing    │
    │   medicines                        │
    └────────────┬───────────────────────┘
                 │
                 ▼
    ┌────────────────────────────────────┐
    │ LAYER 5-6: Enrich New Medicines    │
    │ • Preserve otherInfo during        │
    │   enrichment process               │
    └────────────┬───────────────────────┘
                 │
                 ▼
    ┌────────────────────────────────────┐
    │ LAYER 7-8: Sync to Database        │
    │ • Save medicines with otherInfo    │
    └────────────┬───────────────────────┘
                 │
                 ▼
    ┌────────────────────────────────────┐
    │ Review & Confirm Page              │
    │ • Display auto-detected columns    │
    │ • User can edit values             │
    │ • Save to inventory                │
    └────────────────────────────────────┘
```

## Review Page Table Display

```
Before:
┌──────┬────────┬───────┬──────────┬─────┬──────┬──────────────────────┐
│ Stat │ Name   │ Batch │ Expiry   │ Qty │ Price│ Additional Info      │
├──────┼────────┼───────┼──────────┼─────┼──────┼──────────────────────┤
│ New  │Aspirin │ B001  │ 25-12-24 │ 100 │  50  │ [Mfg Location  ] ... │
│      │        │       │          │     │      │ [Storage Temp  ] ... │
└──────┴────────┴───────┴──────────┴─────┴──────┴──────────────────────┘

After (with Auto-Detection):
┌──────┬────────┬───────┬──────────┬─────┬──────┬──────────────────────┐
│ Stat │ Name   │ Batch │ Expiry   │ Qty │ Price│ Additional Info      │
├──────┼────────┼───────┼──────────┼─────┼──────┼──────────────────────┤
│ New  │Aspirin │ B001  │ 25-12-24 │ 100 │  50  │ [Mfg Location  ] ... │
│      │        │       │          │     │      │ [Storage Temp  ] ... │
│      │        │       │          │     │      │ [Location    ✓] ← Auto-Detected
│      │        │       │          │     │      │ [Supplier   ✓] ← Auto-Detected
└──────┴────────┴───────┴──────────┴─────┴──────┴──────────────────────┘
```

## Column Detection Logic

```
Excel Columns Scanned:
├── Batch_ID ──────► Known (Maps to Batch_ID field)
├── Name ──────────► Known (Maps to name field)
├── Price ─────────► Known (Maps to price field)
├── Location ──────► UNKNOWN (→ otherInfo.Location)
├── Supplier ──────► UNKNOWN (→ otherInfo.Supplier)
└── Qty ───────────► Known (Maps to qty field)

Known Variations Checked:
• Batch_ID: ["Batch_ID", "BatchID", "batch_id", "Batch No", ...]
• Name: ["Name of Medicine", "Medicine Name", "Name", ...]
• Price: ["Price (INR)", "Price_INR", "MRP", ...]
• (etc.)

Normalization Applied:
"Location" → normalized: "location" 
"Supplier Info" → normalized: "supplierinfo"
Check against known variations (all normalized)

Result:
• "location" NOT in known variations ─► otherInfo
• "supplierinfo" NOT in known variations ─► otherInfo
```

## Data Flow Through Pipeline

```
Excel File
    │
    ├─► Parse Excel
    │       │
    │       ├─► Extract Records
    │       │
    │       ├─► Detect Unknown Columns
    │       │       │
    │       │       ├─► "Location" → otherInfo
    │       │       └─► "Supplier" → otherInfo
    │       │
    │       └─► Add otherInfo to Records
    │
    ├─► Match Against Existing Medicines
    │       │
    │       ├─► Found: Merge otherInfo
    │       │
    │       └─► Not Found: Keep otherInfo
    │
    ├─► Enrich New Medicines (AI)
    │       │
    │       └─► Preserve otherInfo
    │
    └─► Save to MongoDB
            │
            └─► otherInfo Stored with Record
```

## Example Medicine Record

Before Auto-Detection:
```json
{
  "Batch_ID": "B12345",
  "Name of Medicine": "Aspirin",
  "Price_INR": 50,
  "Total_Quantity": 100,
  "Category": "Analgesic",
  "otherInfo": {}
}
```

After Auto-Detection from Excel with extra columns:
```json
{
  "Batch_ID": "B12345",
  "Name of Medicine": "Aspirin",
  "Price_INR": 50,
  "Total_Quantity": 100,
  "Category": "Analgesic",
  "otherInfo": {
    "Location": "Warehouse A2",
    "Supplier": "Global Pharma Ltd",
    "Last Reorder": "2025-01-15",
    "Batch Color": "White"
  }
}
```

## Key Benefits

```
BEFORE                          AFTER
─────────────────────────────────────────
❌ Extra columns ignored         ✅ Auto-detected
❌ Manual field definition       ✅ Automatic
❌ Data loss during import       ✅ All data preserved
❌ No visibility of unknown cols ✅ Review page shows all
❌ Hard to track custom fields   ✅ Centralized in otherInfo
```
