# Manual Testing Guide - Medicine Import

## Quick Start (30 seconds)

### Step 1: Start the app
```bash
cd "c:\Users\renuk\Projects\Aushadhi 360"
pnpm dev
```
Open: `http://localhost:3000`

### Step 2: Login
- Email: `mokshbhardwaj2333@gmail.com`
- Password: Check `.env.local` for NEXT_PUBLIC_ADMIN_MAIL password

OR register a new user

### Step 3: Navigate to Import
Click: **Dashboard → Import Medicine**

### Step 4: Test with Excel (Easiest)
1. Create a file `test.xlsx` with columns:
   ```
   Batch_ID | Name of Medicine | Price_INR | Total_Quantity
   ------|---|---|---
   BATCH001 | Paracetamol 500mg | 45 | 100
   BATCH002 | Ibuprofen 200mg | 65 | 50
   BATCH003 | Aspirin 100mg | 25 | 200
   ```
2. Upload to import page
3. Should show: Updated/New summary

### Step 5: Test with Image (If Excel works)
1. Take photo of any bill/receipt
2. Upload to import page
3. Watch the 6-stage progress bar
4. Check results

---

## Expected Results

### Excel Upload (Should Always Work)
✅ **File accepted**
✅ **Extracts records**
✅ **Shows summary**: Total: 3, Updated: 0, New: 3
✅ **Data saved to MongoDB**

### Image Upload (May fail if poor quality)
⚠️ **File accepted** (basic validation)
⚠️ **Extraction** (depends on image quality)
  - If recognized as bill: ✅ Extracts records
  - If not recognized: ⚠️ Returns "No records extracted"

---

## Browser Console Debugging

Open DevTools (F12) → Console tab

You should see logs like:
```
[Import] Validated file: receipt.jpg (image/jpeg) 1048576
[OCR] Extracting from receipt.jpg (1048576 bytes)...
[OCR] Raw response: [{...}]
[OCR] Successfully extracted 3 records
[Pipeline] Extracted 3 records
```

### If you see errors:
```
[OCR] No JSON array found in response
[OCR] JSON parse error: ...
```

Then the Gemini API may be:
1. Rate limited
2. Returning malformed response
3. API key invalid

---

## Test Cases

### ✅ Test 1: New Excel Import
1. Create fresh Excel with NEW Batch_IDs
2. Upload
3. Verify medicines added to profile
4. Check enrichment (Category, Forms, etc added)

### ✅ Test 2: Update Existing Medicine
1. Note a Batch_ID already in database
2. Create Excel with same Batch_ID but different price/quantity
3. Upload
4. Verify: Price updated, Quantity added

### ✅ Test 3: Image with Clear Receipt
1. Use clear, well-lit pharmacy receipt
2. Max 5-10 items recommended
3. Upload
4. Should extract items

### ❌ Test 4: Intentional Failure - Blurred Image
1. Take blurry photo
2. Upload
3. Expected: "No records extracted"
4. NOT a 400 error - that's the expected behavior

### ❌ Test 5: Wrong File Type
1. Try uploading a .txt or .zip file
2. Should get: "Unsupported file type"

---

## Key Files to Monitor

### In MongoDB:
- Database: `aushadhi360`
- Collection: `users`
- Field: `medicines` array

Each medicine should have:
```json
{
  "_id": "...",
  "Batch_ID": "BATCH001",
  "Name of Medicine": "Paracetamol 500mg",
  "Price_INR": 45,
  "Total_Quantity": 100,
  "status_import": "new item added",
  "Category": "...",
  "Medicine Forms": "Tablet",
  ...
}
```

### In Logs:
- Look for `[Import]`, `[OCR]`, `[Pipeline]` tags
- Check error details in browser console
- Network tab shows POST to `/api/import/pipeline`

---

## What Changed (Fixes Applied)

### Before (Was Rejecting Valid Images)
```
Validation Layer (STRICT):
  1. Ask Gemini: "Is this a medicine bill?"
  2. If Gemini says NO → 400 error
  3. Problem: Gemini often wrong or API fails
```

### After (More Lenient)
```
Validation Layer (BASIC):
  1. Check file size < 10MB ✓
  2. Check file type is image/pdf/xlsx/csv ✓
  3. Skip Gemini check ✓
  4. Let extraction layer handle it ✓

Extraction Layer (SMARTER):
  1. Call Gemini with better prompt
  2. If image is not a bill → returns []
  3. User sees "No records extracted"
  4. No 400 error, no mystery ✓
```

---

## Troubleshooting: If Still Getting 400

### Check 1: Is the API running?
```bash
# In browser console
fetch('/api/import/pipeline', { method: 'POST' })
  .then(r => r.json())
  .then(d => console.log(d))
```
Should return: `"File and email required"` (not CORS error)

### Check 2: Is email in localStorage?
```bash
# In browser console
console.log(localStorage.getItem('user_email'))
```
Should output: user email (e.g., `user@example.com`)

If undefined, logout and login again

### Check 3: Is Gemini API key valid?
```bash
# In browser console, open Network tab
# Upload a file
# Find POST to /api/import/pipeline
# Click Response tab
# Look for Gemini API errors
```

### Check 4: File format issue?
```bash
# In browser console
const file = document.querySelector('input[type="file"]').files[0]
console.log(file.type)  // Should be image/jpeg, image/png, etc
console.log(file.size)  // Should be < 10MB
```

---

## Success Indicator

When everything works, you should see:

1. ✅ Upload progresses through 6 stages
2. ✅ Summary shows Total/Updated/New counts
3. ✅ Can upload multiple files in sequence
4. ✅ Data appears in user profile
5. ✅ No console errors (only [Import] logs)
