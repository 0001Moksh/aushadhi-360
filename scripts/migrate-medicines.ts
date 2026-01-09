/**
 * Database Migration Script
 * Migrates medicines from embedded users.medicines[] array to separate medicines collection
 * 
 * RUN THIS ONCE BEFORE DEPLOYING NEW CODE
 * 
 * Steps:
 * 1. Reads all users with embedded medicines
 * 2. Creates medicines collection with proper structure
 * 3. Migrates data with userId reference
 * 4. Creates indexes for performance
 * 5. Optionally removes medicines array from users
 */

import { MongoClient, ObjectId } from "mongodb"

const MONGODB_URI = process.env.DATABASE_URL || ""
const DRY_RUN = process.env.DRY_RUN === "true" // Set to true for testing

async function migrateDatabase() {
  console.log("🚀 Starting database migration...")
  console.log(`Mode: ${DRY_RUN ? "DRY RUN (no changes)" : "LIVE MIGRATION"}`)
  
  const client = new MongoClient(MONGODB_URI)
  
  try {
    await client.connect()
    console.log("✅ Connected to MongoDB")
    
    const db = client.db("aushadhi360")
    const usersCollection = db.collection("users")
    const medicinesCollection = db.collection("medicines")
    
    // Step 1: Get all users with medicines
    const users = await usersCollection.find({ medicines: { $exists: true, $ne: [] } }).toArray()
    console.log(`📊 Found ${users.length} users with medicines`)
    
    let totalMedicines = 0
    let migratedCount = 0
    let errorCount = 0
    
    // Step 2: Migrate medicines for each user
    for (const user of users) {
      const userEmail = user.email
      const medicines = user.medicines || []
      
      console.log(`\n👤 Processing user: ${userEmail} (${medicines.length} medicines)`)
      totalMedicines += medicines.length
      
      // Step 3: Transform and insert medicines
      const medicinesToInsert = medicines.map((med: any) => {
        // Parse expiry date
        let expiryDate = null
        if (med.Expiry || med.expiryDate || med.Expiry_date || med["Expiry Date"]) {
          const expStr = med.Expiry || med.expiryDate || med.Expiry_date || med["Expiry Date"]
          try {
            // Handle various date formats
            if (expStr.includes("-")) {
              // Format: "Sep-2026" or "2026-09-30"
              const parts = expStr.split("-")
              if (parts.length === 2 && parts[0].length <= 3) {
                // Month-Year format
                const monthMap: Record<string, number> = {
                  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
                  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
                }
                const month = monthMap[parts[0]]
                const year = parseInt(parts[1])
                expiryDate = new Date(year, month, 1)
              } else {
                expiryDate = new Date(expStr)
              }
            } else {
              expiryDate = new Date(expStr)
            }
            
            if (isNaN(expiryDate.getTime())) {
              expiryDate = null
            }
          } catch (e) {
            console.warn(`  ⚠️  Invalid expiry date: ${expStr}`)
            expiryDate = null
          }
        }
        
        return {
          userId: userEmail,
          Batch_ID: med.Batch_ID || med.batch_id || `BATCH_${new ObjectId().toString().slice(-8)}`,
          "Name of Medicine": med["Name of Medicine"] || med.name || med.medicine || "Unknown",
          Category: med.Category || med.category || "General",
          "Medicine Forms": med["Medicine Forms"] || med.form || med.medicineForm || "Tablet",
          Price_INR: parseFloat(med.Price_INR || med.price || med.Price || 0),
          Total_Quantity: parseInt(med.Total_Quantity || med.quantity || med.qty || 0),
          "Expiry Date": expiryDate,
          Manufacturer: med.Manufacturer || med.manufacturer || null,
          "Cover Disease": med["Cover Disease"] || med.disease || null,
          Symptoms: med.Symptoms || med.symptoms || null,
          "Side Effects": med["Side Effects"] || med.sideEffects || null,
          Instructions: med.Instructions || med.instructions || null,
          "Description in Hinglish": med["Description in Hinglish"] || med.description || null,
          Quantity_per_pack: med.Quantity_per_pack || med.qtyPerPack || null,
          status_import: med.status_import || "migrated",
          otherInfo: {
            originalId: med._id || null,
            migratedAt: new Date(),
            sourceCollection: "users.medicines"
          },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
      
      // Step 4: Insert medicines (if not dry run)
      if (!DRY_RUN && medicinesToInsert.length > 0) {
        try {
          const result = await medicinesCollection.insertMany(medicinesToInsert, { ordered: false })
          migratedCount += result.insertedCount
          console.log(`  ✅ Migrated ${result.insertedCount} medicines`)
        } catch (error: any) {
          if (error.code === 11000) {
            // Duplicate key error - some medicines already exist
            console.warn(`  ⚠️  Some medicines already exist, skipping duplicates`)
            errorCount++
          } else {
            console.error(`  ❌ Error migrating medicines:`, error.message)
            errorCount++
          }
        }
      } else {
        console.log(`  🔍 Would migrate ${medicinesToInsert.length} medicines`)
      }
      
      // Step 5: Update user's totalMedicines count
      if (!DRY_RUN) {
        await usersCollection.updateOne(
          { email: userEmail },
          { 
            $set: { 
              totalMedicines: medicines.length,
              medicinesMigrated: true,
              medicinesMigratedAt: new Date()
            } 
          }
        )
      }
    }
    
    // Step 6: Create indexes on medicines collection
    console.log("\n📑 Creating indexes on medicines collection...")
    
    if (!DRY_RUN) {
      await medicinesCollection.createIndex({ userId: 1 })
      await medicinesCollection.createIndex({ userId: 1, Batch_ID: 1 })
      await medicinesCollection.createIndex({ userId: 1, Category: 1 })
      await medicinesCollection.createIndex({ userId: 1, Total_Quantity: 1 })
      await medicinesCollection.createIndex({ userId: 1, "Expiry Date": 1 })
      await medicinesCollection.createIndex({ 
        "Name of Medicine": "text", 
        "Medicine Forms": "text",
        "Description in Hinglish": "text"
      })
      console.log("✅ Indexes created successfully")
    } else {
      console.log("🔍 Would create indexes")
    }
    
    // Step 7: Summary
    console.log("\n" + "=".repeat(50))
    console.log("📊 Migration Summary:")
    console.log("=".repeat(50))
    console.log(`Users processed: ${users.length}`)
    console.log(`Total medicines found: ${totalMedicines}`)
    console.log(`Medicines migrated: ${migratedCount}`)
    console.log(`Errors: ${errorCount}`)
    console.log("=".repeat(50))
    
    if (DRY_RUN) {
      console.log("\n⚠️  DRY RUN MODE - No actual changes were made")
      console.log("Set DRY_RUN=false to perform actual migration")
    } else {
      console.log("\n✅ Migration completed successfully!")
      console.log("\n⚠️  IMPORTANT: Next steps:")
      console.log("1. Verify data in medicines collection")
      console.log("2. Deploy updated API code")
      console.log("3. Optionally remove users.medicines array:")
      console.log("   db.users.updateMany({}, { $unset: { medicines: '' } })")
    }
    
  } catch (error) {
    console.error("❌ Migration failed:", error)
    throw error
  } finally {
    await client.close()
    console.log("\n🔌 Disconnected from MongoDB")
  }
}

// Run migration
if (require.main === module) {
  migrateDatabase()
    .then(() => {
      console.log("\n✅ Script completed")
      process.exit(0)
    })
    .catch((error) => {
      console.error("\n❌ Script failed:", error)
      process.exit(1)
    })
}

export { migrateDatabase }
