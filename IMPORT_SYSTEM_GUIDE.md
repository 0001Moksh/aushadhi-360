# Medicine Import System - Architecture & Usage Guide

## Overview
Enterprise-grade medicine import pipeline with 8-layer validation, AI-powered enrichment, and intelligent product matching using Google Gemini AI.

## System Architecture

### Pipeline Layers

#### **Layer 1: Input Validation** (API Key: `GEMINI_INPUT_VALIDATION_API_KEY`)
- **Image Quality Check**: Detects blur, cut text, or poor image quality
- **Bill Structure Validation**: Verifies presence of Item Name, Quantity, Price
- **Item Limit**: Enforces maximum 10 items per image bill
- **Stop Condition**: Pipeline halts if validation fails with user-friendly error

#### **Layer 2: Document Extraction** (API Key: `GEMINI_DOCUMENT_EXTRACTION_API_KEY`)
- **Image/PDF → JSON**: OCR extraction using Gemini Vision API
- **Excel/CSV → JSON**: Direct parsing with xlsx library
- **Schema Validation**: Checks for required columns (Batch_ID, Name of Medicine, Price_INR, Total_Quantity)
- **Output**: Structured JSON array of medicine records

#### **Layer 3: Record Matching** (API Key: `GEMINI_RECORD_MATCHING_API_KEY`)
- **Batch_ID Lookup**: Queries MongoDB for existing products
- **Categorization**: Classifies records as "existing" or "new"
- **Logic**: Batch_ID is the authoritative primary key

#### **Layer 4: Existing Product Updates** (API Key: `GEMINI_RECORD_UPDATE_API_KEY`)
- **Price Override**: New price replaces old price
- **Quantity Addition**: `existing_quantity + new_quantity`
- **Status**: `status_import = "updated price & quantity"`

#### **Layer 5: New Medicine Enrichment** (API Key: `GEMINI_MEDICINE_ENRICHMENT_API_KEY`)
- **Metadata Generation**: Category, Medicine Forms, Cover Disease, Symptoms, Side Effects, Instructions
- **Hinglish Description**: User-friendly description in Hinglish
- **External Search**: Uses `GEMINI_MEDICINE_SEARCH_API_KEY` for accurate medical data
- **Status**: `status_import = "new item added"`

#### **Layer 6: Final Consolidation** (API Key: `GEMINI_RECORD_CONSOLIDATION_API_KEY`)
- **Merge**: Combines updated + new records
- **Sort**: Orders by Batch_ID
- **Deduplication**: Removes duplicate entries
- **Column Cleanup**: Ensures consistent schema

#### **Layer 7-8: Database Sync** (API Key: `GEMINI_DB_SYNC_API_KEY`)
- **Final Validation**: Pre-insert data quality check
- **MongoDB Update**: Updates existing records, inserts new records
- **User Association**: Links medicines to user's email/account

## API Endpoints

### Main Pipeline: `/api/import/pipeline`
**Method**: POST  
**Content-Type**: multipart/form-data

**Request Body**:
```javascript
{
  file: File,           // Image, PDF, Excel, or CSV
  email: string,        // User email
  type: "image" | "excel"
}
```

**Response (Success)**:
```json
{
  "message": "Import successful",
  "summary": {
    "total": 10,
    "updated": 6,
    "new": 4
  },
  "data": {
    "updated": [...],
    "new": [...]
  }
}
```

**Response (Validation Failure)**:
```json
{
  "error": "The uploaded image does not meet the required criteria...",
  "validation": {
    "isValid": false,
    "isMedicineBill": false,
    "hasCommercialStructure": true,
    "isTextReadable": true,
    "recordCount": 15,
    "errors": ["Item count exceeds 10"]
  }
}
```

### Excel/CSV Parser: `/api/import/parse-excel`
**Method**: POST  
**Content-Type**: multipart/form-data

**Request Body**:
```javascript
{
  file: File  // .xlsx or .csv
}
```

**Response**:
```json
{
  "success": true,
  "count": 25,
  "records": [...]
}
```

## Data Schema

### Required Columns (Must be present in Excel/CSV or extracted from images)
```typescript
{
  Batch_ID: string              // Primary key, authoritative
  "Name of Medicine": string    // Medicine name
  Price_INR: number            // Price in Indian Rupees
  Total_Quantity: number       // Quantity in stock
}
```

### Optional Enriched Fields (Added by AI for new medicines)
```typescript
{
  Category?: string              // ONE category only
  "Medicine Forms"?: string      // Tablet/Capsule/Syrup/Injection/Cream/Powder/Drops
  Quantity_per_pack?: string    // Pack size
  "Cover Disease"?: string      // 3-4 keywords
  Symptoms?: string             // 3-4 keywords
  "Side Effects"?: string       // 3-4 keywords
  Instructions?: string         // Full sentence
  "Description in Hinglish"?: string  // User-friendly Hinglish description
  status_import?: string        // "new item added" | "updated price & quantity"
}
```

## Frontend Integration

### Import Medicine Page (`/dashboard/import`)
**Features**:
- Drag & drop file upload
- Real-time pipeline progress (6 stages)
- Visual stage indicators (Pending → Processing → Complete)
- Summary cards showing Total/Updated/New counts
- Error alerts with validation details

**Supported File Types**:
- Images: JPG, PNG
- Documents: PDF
- Spreadsheets: XLSX, CSV

**User Flow**:
1. User uploads bill image or Excel file
2. System shows progress through 6 stages:
   - Validating image quality & structure
   - Extracting medicine data (OCR)
   - Matching with existing inventory
   - Updating quantities & prices
   - Enriching new medicines with metadata
   - Syncing to database
3. Success screen shows import summary
4. Option to upload another bill

## Environment Configuration

Add these to `.env.local`:

```bash
# Medicine Import Pipeline - Gemini APIs
GEMINI_INPUT_VALIDATION_API_KEY=your_api_key_here
GEMINI_DOCUMENT_EXTRACTION_API_KEY=your_api_key_here
GEMINI_SCHEMA_VALIDATION_API_KEY=your_api_key_here
GEMINI_RECORD_MATCHING_API_KEY=your_api_key_here
GEMINI_RECORD_UPDATE_API_KEY=your_api_key_here
GEMINI_MEDICINE_ENRICHMENT_API_KEY=your_api_key_here
GEMINI_MEDICINE_SEARCH_API_KEY=your_api_key_here
GEMINI_RECORD_CONSOLIDATION_API_KEY=your_api_key_here
GEMINI_DB_SYNC_API_KEY=your_api_key_here
```

**Note**: You can use the same Gemini API key for all 9 keys initially, then separate them for rate limiting and monitoring as needed.

## Business Logic

### Existing Product Update
```
When Batch_ID matches existing record:
  - Price_INR = new_price (override)
  - Total_Quantity = existing_quantity + new_quantity (addition)
  - status_import = "updated price & quantity"
```

### New Product Enrichment
```
When Batch_ID not found:
  1. Extract basic fields from bill (Batch_ID, Name, Price, Quantity)
  2. Call Gemini enrichment API
  3. Search external sources for accurate medicine data
  4. Generate Category, Forms, Diseases, Symptoms, Side Effects, Instructions
  5. Create Hinglish description for user-friendly interface
  6. status_import = "new item added"
```

## Error Handling

### Validation Failures
- **Blur Detection**: "Image is too blurred to process"
- **Not a Medicine Bill**: "Uploaded image is not a medicine bill"
- **Item Limit**: "Bill contains more than 10 items (max allowed)"
- **Missing Columns**: "Excel missing required columns: Batch_ID, Price_INR"

### Pipeline Failures
- **Extraction Error**: Falls back to empty array, shows "No records extracted"
- **Enrichment Error**: Proceeds with basic fields, marks enrichment as failed
- **Database Error**: Returns 500 error with detailed message

## Performance Optimization

1. **Parallel Processing**: Multiple Gemini API calls can run concurrently
2. **Caching**: Consider caching medicine metadata for common drugs
3. **Batch Processing**: For large Excel files, process in chunks of 50 records
4. **Rate Limiting**: Separate API keys allow independent rate limit pools

## Testing Checklist

- [ ] Upload image with 5 medicines (new batch)
- [ ] Upload image with existing Batch_IDs (update flow)
- [ ] Upload Excel with 20 medicines (enrichment test)
- [ ] Upload blurred image (validation failure)
- [ ] Upload non-medicine bill (validation failure)
- [ ] Upload bill with 15 items (item limit failure)
- [ ] Upload Excel missing Batch_ID column (schema failure)

## Monitoring & Analytics

Track these metrics:
- Import success rate
- Average processing time per layer
- Validation failure reasons
- Enrichment accuracy
- User adoption (imports per day)

## Future Enhancements

1. **Duplicate Detection**: Advanced fuzzy matching for medicine names
2. **Expiry Date Extraction**: Add expiry date field from bill images
3. **Supplier Management**: Track which supplier each batch came from
4. **Historical Pricing**: Store price history for trend analysis
5. **Bulk Edit**: Allow manual corrections before final import
6. **Image Preprocessing**: Auto-rotate, enhance contrast, remove noise

## Support

For issues or questions, check:
- Pipeline logs in browser console (detailed error messages)
- MongoDB user document (verify medicines array structure)
- Gemini API quota (check rate limits on Google Cloud Console)
