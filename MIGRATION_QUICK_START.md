# 🔄 Database Migration Quick Start

## Current Status

✅ **All API routes updated** (10/10 routes modified)
✅ **Build successful** - no compilation errors
✅ **Migration script ready** - `scripts/migrate-medicines.ts`
✅ **Ready for testing and deployment**

---

## Quick Commands

### 1. Test Migration (DRY RUN - No Changes)
```bash
cd "c:\Users\renuk\Projects\Aushadhi 360"
npm run migrate -- --dry-run
```
- **What it does:** Simulates the migration, shows what would happen
- **Safety:** 100% safe, makes no database changes
- **Duration:** ~30 seconds for 1000 medicines

### 2. Run Actual Migration
```bash
npm run migrate
```
- **What it does:** Migrates all medicines from users array to medicines collection
- **Safety:** Idempotent (safe to run multiple times)
- **Duration:** ~1-2 minutes for typical dataset

### 3. Verify Migration Success
```bash
# Connect to MongoDB
mongosh --uri="mongodb+srv://user:pass@host/aushadhi360"

# Check medicines collection
aushadhi360> db.medicines.countDocuments()
aushadhi360> db.medicines.findOne()
aushadhi360> db.users.findOne() // Should still have medicines array (not deleted yet)
```

---

## What Gets Migrated

### Data Moved From
```javascript
users.medicines = [
  {Batch_ID, Name_of_Medicine, Category, Total_Quantity, Price_INR, ...}
]
```

### Data Moved To
```javascript
medicines = {
  userId: "user@example.com",
  Batch_ID, Name_of_Medicine, Category, Total_Quantity, Price_INR,
  createdAt, updatedAt
}
```

---

## Timeline

| Step | Status | Action |
|------|--------|--------|
| API Routes | ✅ Done | Already updated in code |
| Build Test | ✅ Done | npm run build passed |
| **Migration Test** | 🟡 Next | Run with `--dry-run` |
| **Backup** | 🟡 Next | Export users collection |
| **Live Migration** | 🟡 Next | Run without `--dry-run` |
| **Verify APIs** | 🟡 Next | Test all 10 routes |
| Feature Updates | ⏳ After | Implement Phase 1 features |

---

## API Routes Updated

All these routes now query the `medicines` collection:

1. **GET** `/api/user/medicines` - Get user's medicines
2. **GET** `/api/medicines/search` - Search medicines
3. **PUT** `/api/medicines/update` - Update medicine
4. **DELETE** `/api/medicines/delete` - Delete medicine
5. **GET** `/api/medicines/categories` - Get categories
6. **POST** `/api/import/manual` - Manual import
7. **POST** `/api/import/pipeline` - AI image/Excel import
8. **POST** `/api/billing/create` - Create bill (updates quantities)
9. **GET** `/api/billing/top-selling` - Top selling stats
10. **GET** `/api/export` - Export medicines

---

## Rollback Plan

If anything goes wrong:

```bash
# Restore from backup
mongorestore --uri="mongodb+srv://..." users-backup.json

# Delete migrated data (optional)
mongosh --uri="mongodb+srv://..."
aushadhi360> db.medicines.deleteMany({})
```

---

## Next Steps

1. **[TODAY]** Run `npm run migrate -- --dry-run` to test
2. **[TODAY]** Backup production database
3. **[TOMORROW]** Run actual migration: `npm run migrate`
4. **[TOMORROW]** Test APIs in production
5. **[THIS WEEK]** Implement Phase 1 feature updates

---

**Questions?** Check `MIGRATION_COMPLETE.md` for detailed guide.
