# Medicine Import - Troubleshooting Guide

## Issue: POST /api/import/pipeline 400 Error

### Root Causes & Solutions

#### Problem 1: Image Validation Rejecting Valid Bills
**Status**: ✅ FIXED

**What was happening**: The system was calling Gemini API to validate images as medicine bills, which often failed or returned unclear responses.

**Solution Applied**:
- Removed strict Gemini-based image validation
- Switched to basic file checks only (size, type)
- Let extraction layer handle the actual reading
- Extraction layer is more forgiving and will return empty array if not a bill

**New Validation Logic**:
```
1. Check file size (< 10MB) ✓
2. Check file type (JPG, PNG, PDF, XLSX, CSV) ✓
3. Skip Gemini validation - proceed to extraction ✓
4. Extraction layer will return [] if not a medicine bill ✓
```

#### Problem 2: Extraction Layer Failing
**Symptoms**: File passes validation but says "No records extracted from file"

**Debug Steps**:
1. Check browser console for full error
2. Check MongoDB logs for connection issues
3. Verify Gemini API key is valid
4. Check API rate limits on Google Cloud Console

**Test with simple image**:
```
- Use a clear, well-lit pharmacy receipt
- Minimum 2-3 items visible
- Text should be readable (no blur)
- Should show: Item Name, Price, Quantity
```

#### Problem 3: Wrong File Type
**Symptoms**: Error says "Unsupported file type"

**Supported Types**:
- ✓ JPG / JPEG images
- ✓ PNG images
- ✓ PDF documents
- ✓ XLSX (Excel)
- ✓ CSV files

**Not Supported**:
- ✗ BMP, GIF, WebP
- ✗ DOC, DOCX
- ✗ Images > 10MB

#### Problem 4: Email Not Found
**Symptoms**: Error says "User email not found"

**Solution**:
1. Make sure you're logged in
2. Check localStorage: `localStorage.getItem("user_email")`
3. Verify email is set during login (already implemented in login-page.tsx)

#### Problem 5: No Records Extracted
**Symptoms**: File passes validation but extraction returns empty array

**Possible Causes**:
- Image is not a medicine bill (test image)
- Image quality too poor (blurred, cut off)
- Gemini API key is invalid or rate limited
- Text not visible (handwritten, faded)

**Test Steps**:
1. Try with a different image
2. Try a screenshot of a bill
3. Try an Excel file instead
4. Check Gemini API console for errors

---

## Debugging Commands

### Check if file is being received correctly
```bash
# In browser console
const file = document.querySelector('input[type="file"]').files[0]
console.log('File:', file.name, file.type, file.size)
```

### Check localStorage
```bash
# In browser console
console.log('User email:', localStorage.getItem("user_email"))
console.log('User role:', localStorage.getItem("user_role"))
console.log('Auth token:', localStorage.getItem("auth_token"))
```

### Test Gemini API directly
```bash
# Send test request to /api/import/test-gemini
# Include base64 image and prompt
```

---

## New Extraction Prompt

The system now uses this improved prompt for OCR:

```
You are a medicine bill OCR system. Extract ALL items from this bill image.

Return ONLY valid JSON array (NO markdown, NO backticks, JUST JSON):
[{
  "Batch_ID": "unique_id_or_from_bill",
  "Name of Medicine": "medicine_name",
  "Price_INR": price_as_number,
  "Total_Quantity": quantity_as_number
}]

Rules:
- Extract every visible medicine/item
- If Batch_ID not visible, generate one (e.g., ITEM_1, ITEM_2)
- Price and Quantity must be numbers
- If not a medicine bill, return empty array []
- Do NOT include markdown formatting
```

---

## Server Logs to Check

When debugging, look for these log messages:

```
[Import] Validated file: filename.jpg (image/jpeg) 5242880
[OCR] Extracting from filename.jpg (5242880 bytes)...
[OCR] Raw response: [{...}]
[OCR] Successfully extracted 5 records
[Pipeline] Extracted 5 records
```

**If you see**:
- `[OCR] Raw response: [] undefined` → Image not recognized as bill
- `[OCR] JSON parse error` → Gemini returned malformed JSON
- `[OCR] No JSON array found` → Gemini returned text instead of JSON

---

## Next Steps to Test

1. **Start dev server**:
   ```bash
   pnpm dev
   ```

2. **Navigate to import page**:
   ```
   http://localhost:3000/dashboard/import
   ```

3. **Try uploading**:
   - Start with a clear medicine bill image
   - Watch console for [OCR] logs
   - Report exact error message

---

## Quick Test with Excel

If images aren't working, try Excel first:

1. Create file with columns: `Batch_ID, Name of Medicine, Price_INR, Total_Quantity`
2. Add 3-5 rows of test data
3. Upload to import page

Excel parsing uses `xlsx` library (not Gemini), so it's more reliable for testing.

---

## Rollback to Strict Validation (if needed)

If you want to re-enable strict validation, restore the original `validateInput` function:

**Location**: `app/api/import/pipeline/route.ts` line 16

The function is currently lenient. Original strict validation checked:
- Is it a medicine bill?
- Does it have commercial structure?
- Is text readable (no blur)?
- Max 10 items?

---

## Common Error Messages & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| "File size exceeds 10MB" | Upload is too large | Compress image or use Excel |
| "Unsupported file type" | Wrong format | Use JPG, PNG, PDF, XLSX, or CSV |
| "No records extracted" | Image not a bill or poor quality | Use clear, well-lit receipt or Excel |
| "User email not found" | Not logged in | Log in again |
| "Failed to parse Excel/CSV" | Missing required columns | Add: Batch_ID, Name of Medicine, Price_INR, Total_Quantity |

---

## Next Build After Fixes

Run:
```bash
pnpm build
```

Should show: ✓ Compiled successfully
