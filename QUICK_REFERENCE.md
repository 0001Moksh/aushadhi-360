# Quick Reference Card - All Features

## 🎤 Voice Search
**Where**: Billing page search bar  
**How**: Click microphone icon, speak medicine name  
**File**: `hooks/use-voice-search.ts`, `components/billing-page.tsx`  

## 📱 Mobile Images
**Where**: Landing page feature section  
**What**: Images now display on mobile devices  
**File**: `components/landing-page.tsx`  

## 🔗 Social Media
**Where**: Landing page footer  
**Links**: Facebook, Twitter, Instagram, LinkedIn  
**File**: `components/landing-page.tsx`  

## 🏷️ Feature Type Field
**Where**: All medicines in database  
**Values**: manual, ai, excel, csv, ocr, image  
**File**: `app/api/import/manual/route.ts`, `app/api/import/pipeline/route.ts`  

## 🆕 New Columns Detection
**Where**: Import endpoints  
**Response**: `newColumnsDetected`, `newColumns` array  
**File**: `app/api/import/manual/route.ts`, `app/api/import/pipeline/route.ts`  

---

## API Examples

### Manual Import with Feature Type
```bash
curl -X POST http://localhost:3000/api/import/manual \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@pharmacy.com",
    "featureType": "manual",
    "medicines": [{
      "Batch_ID": "B123",
      "Name of Medicine": "Aspirin",
      "Price_INR": 45,
      "Total_Quantity": 100
    }]
  }'
```

### Response with New Columns
```json
{
  "message": "Manual import saved",
  "summary": {
    "total": 1,
    "new": 1,
    "updated": 0,
    "featureType": "manual",
    "newColumnsDetected": true,
    "newColumns": ["Manufacturer", "ExpiryDate"]
  }
}
```

---

## Database Queries

### Get medicines by feature type
```javascript
db.medicines.find({ 
  userId: "user@pharmacy.com", 
  feature_type: "excel" 
})
```

### Get import statistics
```javascript
db.medicines.aggregate([
  { $match: { userId: "user@pharmacy.com" } },
  { $group: { _id: "$feature_type", count: { $sum: 1 } } }
])
```

### Find medicines with new columns
```javascript
db.medicines.find({ 
  userId: "user@pharmacy.com",
  Manufacturer: { $exists: true }
})
```

---

## Testing Commands

### Voice Search
1. Go to `/dashboard/billing`
2. Click microphone icon in search
3. Say "Aspirin"
4. Should auto-populate search

### Feature Type
```javascript
// In browser console
fetch('/api/medicines/search?email=test@test.com&query=aspirin')
  .then(r => r.json())
  .then(d => console.log(d.medicines[0].feature_type))
```

### New Columns
1. Import Excel with new columns
2. Check response for `newColumnsDetected: true`
3. Verify in database: `db.medicines.findOne().NewColumnName`

---

## Troubleshooting

### Voice Search Not Working
- Check browser support (Chrome, Firefox, Safari)
- Ensure microphone permissions granted
- Check browser console for errors
- Mobile: Voice works on Android Chrome, iOS Safari

### Mobile Images Not Showing
- Clear browser cache
- Hard refresh (Ctrl+Shift+R)
- Check dark/light mode setting
- Verify images exist in `/public/` folder

### Feature Type Not Saving
- Check MongoDB connection
- Verify email parameter in API request
- Check user exists in database
- Look for errors in server logs

---

## Support Files
- `FEATURES_IMPLEMENTED.md` - Full documentation
- `BILLING_FEATURE_TYPE_GUIDE.md` - Technical reference
- `IMPLEMENTATION_COMPLETE.md` - Implementation summary

