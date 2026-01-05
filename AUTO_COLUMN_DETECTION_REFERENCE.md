# Auto-Column Detection: Implementation Reference

## Files Modified

### 1. `components/manual-import-table.tsx`
**Changes**: Enhanced `uploadCSV()` function to auto-detect unknown columns

**Key Code**:
```typescript
// Define all known standard columns
const knownColumnVariations: Record<string, string[]> = {
  Batch_ID: ["Batch_ID", "BatchID", "batch_id", "Batch No", ...],
  name: ["Name of Medicine", "Medicine Name", "Name", ...],
  price: ["Price (INR)", "Price_INR", "Price", ...],
  qty: ["Total Quantity", "Total_Quantity", "Quantity", ...],
  // ... more fields
}

// Build set of all known variations (normalized)
const allKnownVariations = new Set<string>()

// Auto-detect unknown columns
const getOtherInfo = (record: any): Record<string, string | number | boolean> => {
  const otherInfo: Record<string, string | number | boolean> = {}
  Object.keys(record).forEach(key => {
    const normalizedKey = normalize(key)
    if (!allKnownVariations.has(normalizedKey)) {
      // This column is unknown, add to otherInfo
      otherInfo[key] = record[key]
    }
  })
  return otherInfo
}

// During parsing, populate otherInfo
const parsed = (data.records || []).map((r: any) => {
  const otherInfo = getOtherInfo(r)
  return {
    // ... standard fields ...
    otherInfo: Object.keys(otherInfo).length > 0 ? otherInfo : undefined,
  }
})
```

**Lines Changed**: 373-572

---

### 2. `app/api/import/pipeline/route.ts`
**Changes**: 
- Enhanced `extractDocument()` to auto-detect columns in Excel/CSV
- Updated `enrichMedicineData()` to preserve `otherInfo`
- Updated `matchAndUpdateRecords()` to merge `otherInfo`

**Key Changes**:

#### A. extractDocument() - Add Column Detection
```typescript
// After parsing Excel records
if (records.length > 0) {
  // Build known columns map (same as manual import)
  const knownColumnVariations: Record<string, string[]> = {
    Batch_ID: [...],
    "Name of Medicine": [...],
    // ... etc
  }
  
  // Process each record
  records.forEach((record: any) => {
    const otherInfo: Record<string, string | number | boolean> = {}
    Object.keys(record).forEach(key => {
      const normalizedKey = normalize(key)
      if (!allKnownVariations.has(normalizedKey)) {
        otherInfo[key] = record[key]
      }
    })
    if (Object.keys(otherInfo).length > 0) {
      record.otherInfo = otherInfo
    }
  })
}

return records
```

#### B. enrichMedicineData() - Preserve otherInfo
```typescript
enriched.push({
  Batch_ID: data.Batch_ID,
  // ... other fields ...
  status_import: "new item added",
  otherInfo: record.otherInfo || {},  // ← Preserve from extraction
})
```

#### C. matchAndUpdateRecords() - Merge otherInfo
```typescript
if (existing) {
  existing.Price_INR = record.Price_INR || existing.Price_INR
  existing.Total_Quantity = (existing.Total_Quantity || 0) + (record.Total_Quantity || 0)
  // ... merge other fields ...
  
  // Merge otherInfo
  if (record.otherInfo && Object.keys(record.otherInfo).length > 0) {
    existing.otherInfo = { ...existing.otherInfo, ...record.otherInfo }
  }
  
  existing.status_import = "updated price & quantity"
  updated.push(existing)
}
```

**Lines Changed**: 103-163, 191-264, 155-164

---

### 3. `components/import-medicine-page.tsx`
**Changes**:
- Added `getAutoDetectedColumns()` function
- Added `getAllMetadataFields()` function
- Updated review table to display auto-detected columns

**Key Code**:
```typescript
// Get unique otherInfo keys from all extracted items
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

// Combine manual metadata fields with auto-detected columns
const getAllMetadataFields = () => {
  const autoColumns = getAutoDetectedColumns()
  return [...new Set([...metadataFields, ...autoColumns])]
}
```

**Updated Review Table**:
```typescript
// Changed from:
{metadataFields.length > 0 && (
  <th className="px-3 py-2 text-left border-l">Additional Info</th>
)}

// To:
{getAllMetadataFields().length > 0 && (
  <th className="px-3 py-2 text-left border-l">Additional Info</th>
)}

// And in table body:
{getAllMetadataFields().map(field => (
  <input
    value={String(item.otherInfo?.[field] || "")}
    onChange={(e) => {
      newItems[idx].otherInfo![field] = e.target.value
    }}
  />
))}
```

**Lines Changed**: 50-70 (new functions), 689-741 (table header & body)

---

## Data Flow Summary

### Manual Import
1. User uploads Excel → `uploadCSV()`
2. Parse records and auto-detect unknown columns
3. Create Row objects with `otherInfo` populated
4. Display preview with all columns visible
5. User saves → `/api/import/manual` API
6. API merges `otherInfo` with existing medicines
7. MongoDB persists complete record with `otherInfo`

### AI Import Pipeline
1. User uploads Excel/Image → `/api/import/pipeline`
2. Extract layer auto-detects unknown columns (Excel) or uses OCR (Image)
3. Match & Update layer merges `otherInfo` with existing records
4. Enrich layer preserves `otherInfo` during enrichment
5. Sync layer saves to MongoDB with `otherInfo`
6. Review page displays auto-detected columns
7. User confirms and saves

---

## Testing Scenarios

### Scenario 1: Excel with Extra Column
```
Input: Excel with columns [Batch_ID, Name, Price, Location]
Expected:
  - Location auto-detected as unknown
  - otherInfo.Location populated
  - Review shows Location field with values
  - MongoDB stores otherInfo.Location
```

### Scenario 2: Multiple Unknown Columns
```
Input: Excel with columns [Batch_ID, Name, Price, Location, Supplier, BatchColor]
Expected:
  - All three unknown columns detected
  - otherInfo has 3 key-value pairs
  - Review shows all fields editable
  - All preserved in MongoDB
```

### Scenario 3: Updating Existing Medicine
```
Input: Manual import with updated Batch_ID + new Location column
Expected:
  - Existing medicine found
  - otherInfo merged: new Location added to existing metadata
  - MongoDB record updated with combined otherInfo
```

### Scenario 4: AI Import with Unknown Columns
```
Input: Excel upload through AI pipeline with Location column
Expected:
  - Extraction detects Location as unknown
  - Enrichment preserves otherInfo
  - Review displays Location with auto-populated values
  - Save commits with otherInfo intact
```

---

## Normalization Rules

### Column Name Normalization
```
Input: "Mfg. Location (Optional)"
Normalized: "mfglocationoptional"
Compared against: All variations in knownColumnVariations
Result: Unknown (not in list) → otherInfo
```

### Value Handling
```
// Skipped (not stored):
- null values
- undefined values
- Empty strings ""

// Stored (as-is or trimmed):
- Non-empty strings → trimmed
- Numbers → as-is
- Booleans → as-is
```

---

## API Contracts

### Manual Import API
```typescript
interface ManualMedicineRecord {
  Batch_ID: string
  "Name of Medicine": string
  Price_INR: number
  Total_Quantity: number
  Category?: string
  otherInfo?: Record<string, string | number | boolean>  // ← Auto-populated
  // ... other optional fields
}
```

### Commit API
```typescript
interface ExtractedItem {
  name: string
  quantity: number
  price: number
  batch?: string
  expiryDate?: string
  isExisting?: boolean
  otherInfo?: Record<string, string | number | boolean>  // ← From extraction
}
```

### Pipeline API (Internal)
```typescript
interface MedicineRecord {
  Batch_ID: string
  "Name of Medicine": string
  Price_INR: number
  Total_Quantity: number
  otherInfo?: Record<string, string | number | boolean>  // ← Preserved
  status_import?: string
  // ... other fields
}
```

---

## Backward Compatibility

✅ **Old Code Works**:
- Medicines without `otherInfo` still load
- Empty `otherInfo: {}` treated as no metadata
- Review page handles missing `otherInfo` gracefully

✅ **New Features Don't Break Old Data**:
- Merging handles undefined `otherInfo`
- Normalization is case-insensitive
- Unknown columns optional

✅ **Existing Manual Fields Still Work**:
- Predefined `metadataFields` array preserved
- Auto-detected columns merged with manual fields
- Users can mix both approaches

---

## Performance Considerations

- **Column Detection**: O(n*m) where n=records, m=columns
  - Minimal impact (thousands of records, <100 columns typical)
  
- **Unknown Column Storage**: Marginal increase
  - Depends on number of unknown columns
  - Usually 1-5 extra fields per medicine
  
- **Review Page Rendering**: 
  - Dynamic field generation from `otherInfo`
  - No significant performance impact
  
---

## Future Enhancement Ideas

1. **Column Type Inference**
   - Detect numeric vs string columns
   - Apply appropriate input types in review

2. **Column Mapping UI**
   - Visual editor to map unknown columns to standard fields
   - Persistent mapping rules per user

3. **Bulk Unknown Column Operations**
   - Rename unknown columns across all medicines
   - Merge similar columns (e.g., "Mfg Location" + "Location")
   - Convert to standard field

4. **Export Support**
   - Include otherInfo in CSV/Excel exports
   - Map back to original column names

5. **Search/Filter by otherInfo**
   - Find medicines by unknown column values
   - Full-text search including otherInfo

6. **Column Statistics**
   - Show which columns are most commonly unknown
   - Suggest adding as standard fields if popular

---

## Debugging Tips

### Check Auto-Detection
1. Upload Excel with unknown column
2. Check browser console for normalization logs
3. Inspect Row object in preview - should have `otherInfo`

### Verify Storage
```javascript
// In MongoDB query
db.users.findOne({ email: "user@example.com" }, 
  { "medicines.otherInfo": 1 })
```

### Review Table Issues
- Ensure `extractedItems` has `otherInfo` populated
- Check `getAutoDetectedColumns()` returns expected keys
- Verify form inputs are reading from `item.otherInfo?.[field]`

### API Debugging
- Add console.logs in `extractDocument()` to see detected columns
- Check pipeline logs for `otherInfo` preservation
- Verify MongoDB document has `otherInfo` field after commit
