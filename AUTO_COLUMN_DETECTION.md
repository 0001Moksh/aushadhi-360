# Auto-Detection of Unknown Excel Columns → otherInfo

## Overview
Implemented **automatic detection and storage of unknown/custom columns** from Excel files into the `otherInfo` JSON field without requiring manual field definition.

## Problem Solved
Previously, when uploading Excel files with extra columns (e.g., "Location", "Supplier Info"), these columns were ignored during import. Users had to manually add custom fields to capture this data.

**Now**: Unknown columns are automatically detected and stored in `otherInfo` as key-value pairs.

## Changes Made

### 1. Manual Import (`components/manual-import-table.tsx`)

#### Added `knownColumnVariations` Map
- Centralized list of all standard field name variations (Batch_ID, Name of Medicine, Price, Qty, etc.)
- Normalized for fuzzy matching

#### Added `getOtherInfo()` Function
```typescript
const getOtherInfo = (record: any): Record<string, string | number | boolean> => {
  const otherInfo: Record<string, string | number | boolean> = {}
  const recordKeys = Object.keys(record)
  
  recordKeys.forEach(key => {
    const normalizedKey = normalize(key)
    // Skip if this column is a known standard field
    if (!allKnownVariations.has(normalizedKey)) {
      const val = record[key]
      // Store non-empty values
      if (val !== null && val !== undefined && val !== "") {
        otherInfo[key] = typeof val === "string" ? val.trim() : val
      }
    }
  })
  return otherInfo
}
```

#### Enhanced `uploadCSV()` Function
- Detects all columns in uploaded Excel/CSV file
- Separates standard fields from unknown columns
- Auto-populates `otherInfo` during Row creation
- Unknown columns like "Location" are automatically captured

#### Flow
```
Excel Upload
    ↓
Parse Records
    ↓
Identify Standard Columns (Batch_ID, Name, Price, etc.)
    ↓
Identify Unknown Columns (Location, Supplier Info, etc.)
    ↓
Auto-populate otherInfo with Unknown Columns
    ↓
Display in Preview
```

### 2. AI Import Pipeline (`app/api/import/pipeline/route.ts`)

#### Enhanced `extractDocument()` Function
- Added same column detection logic for Excel/CSV files processed through the pipeline
- Auto-detects unknown columns before enrichment
- Preserves `otherInfo` throughout the pipeline

#### Updated `enrichMedicineData()` Function
```typescript
enriched.push({
  // ... standard fields ...
  otherInfo: record.otherInfo || {},  // ← Preserve auto-detected columns
})
```

#### Updated `matchAndUpdateRecords()` Function
```typescript
// Merge otherInfo from new import with existing record
if (record.otherInfo && Object.keys(record.otherInfo).length > 0) {
  existing.otherInfo = { ...existing.otherInfo, ...record.otherInfo }
}
```

### 3. Review Page (`components/import-medicine-page.tsx`)

#### Added Dynamic Column Detection
```typescript
const getAutoDetectedColumns = () => {
  const autoColumns = new Set<string>()
  extractedItems.forEach(item => {
    if (item.otherInfo) {
      Object.keys(item.otherInfo).forEach(key => {
        autoColumns.add(key)
      })
    }
  })
  return Array.from(autoColumns)
}

const getAllMetadataFields = () => {
  const autoColumns = getAutoDetectedColumns()
  return [...new Set([...metadataFields, ...autoColumns])]
}
```

#### Updated Review Table
- Changed from hardcoded `metadataFields` to dynamic `getAllMetadataFields()`
- Table header now shows all metadata columns (manual + auto-detected)
- Users can see and edit auto-detected column values in the review screen
- Unknown columns like "Location" appear alongside manual fields

## Example Usage

### Before (Manual Process)
1. Upload Excel with "Location" column
2. "Location" data is ignored
3. User manually adds "Location" to metadata fields
4. User manually enters location data in UI

### After (Automatic)
1. Upload Excel with "Location" column
2. System auto-detects "Location" as unknown column
3. Location data automatically stored in `otherInfo`
4. Review page displays "Location" field with pre-filled values
5. User can edit/confirm and save

## Data Storage

### MongoDB Structure
```json
{
  "medicines": [
    {
      "Batch_ID": "B001",
      "Name of Medicine": "Aspirin",
      "Price_INR": 50,
      "Total_Quantity": 100,
      "Category": "Analgesic",
      "otherInfo": {
        "Location": "Warehouse A2",
        "Supplier Info": "Global Pharma",
        "Last Reorder": "2025-01-15"
      }
    }
  ]
}
```

## API Integration

### Manual Import API (`/api/import/manual`)
- Already handles `otherInfo` ✓
- Merges unknown columns into existing records ✓

### AI Pipeline API (`/api/import/pipeline`)
- Excel parsing auto-detects columns ✓
- Enrichment preserves `otherInfo` ✓
- Database sync merges unknown columns ✓

### Commit API (`/api/import/commit`)
- Already handles `otherInfo` ✓
- Persists unknown columns to MongoDB ✓

## Testing Checklist

- [x] Manual import with extra columns (Location, etc.)
- [x] AI pipeline with extra columns
- [x] Excel file parsing preserves unknown columns
- [x] Review page displays auto-detected columns
- [x] User can edit auto-detected values
- [x] otherInfo saved to MongoDB
- [x] Updated medicines merge otherInfo correctly
- [x] No compilation errors

## Feature Highlights

✅ **Automatic Detection**: No manual configuration needed  
✅ **Backward Compatible**: Existing manual fields still work  
✅ **Flexible**: Any column name supported  
✅ **Editable**: Users can review/modify auto-detected values  
✅ **Persistent**: Stored in MongoDB with medicine records  
✅ **Merge-Safe**: New imports merge with existing otherInfo  

## Known Considerations

- Unknown columns are trimmed and non-empty values only
- Column names are preserved as-is (e.g., "Location" stays "Location")
- otherInfo values are stored as string | number | boolean
- Auto-detection runs on both manual and AI imports
- Review page now shows ALL metadata (manual + auto-detected)

## Future Enhancements

1. Option to define "protected" standard fields
2. Custom normalization rules for column names
3. Bulk edit auto-detected columns
4. Export otherInfo to reports
5. Search/filter by otherInfo fields
