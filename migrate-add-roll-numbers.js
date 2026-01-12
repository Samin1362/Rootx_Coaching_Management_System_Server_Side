import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

// MongoDB connection
const user = encodeURIComponent(process.env.DB_USER);
const pass = encodeURIComponent(process.env.DB_PASS);
const uri = `mongodb+srv://${user}:${pass}@cluster0.l2cobj0.mongodb.net/rootxCMS?appName=Cluster0`;

const client = new MongoClient(uri);

async function migrateRollNumbers() {
  try {
    console.log("🔄 Connecting to MongoDB...");
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db("roots_coaching_management_users");
    const studentsCollection = db.collection("students");

    // Get all unique batch IDs
    const batches = await studentsCollection.distinct("batchId");
    console.log(`\n📚 Found ${batches.length} unique batches`);

    let totalUpdated = 0;

    // Process each batch
    for (const batchId of batches) {
      console.log(`\n🔄 Processing batch: ${batchId}`);

      // Get all students in this batch that don't have a roll number
      const studentsInBatch = await studentsCollection
        .find({ 
          batchId,
          $or: [
            { roll: { $exists: false } },
            { roll: null }
          ]
        })
        .sort({ createdAt: 1 }) // Sort by creation date to maintain order
        .toArray();

      if (studentsInBatch.length === 0) {
        console.log(`   ✓ No students need roll numbers in this batch`);
        continue;
      }

      console.log(`   📝 Found ${studentsInBatch.length} students without roll numbers`);

      // Find the highest existing roll number in this batch
      const studentsWithRoll = await studentsCollection
        .find({ 
          batchId,
          roll: { $exists: true, $ne: null }
        })
        .sort({ roll: -1 })
        .limit(1)
        .toArray();

      let currentRoll = studentsWithRoll.length > 0 && studentsWithRoll[0].roll
        ? studentsWithRoll[0].roll
        : 0;

      // Assign roll numbers to students without them
      for (const student of studentsInBatch) {
        currentRoll++;
        
        await studentsCollection.updateOne(
          { _id: student._id },
          { $set: { roll: currentRoll } }
        );

        console.log(`   ✓ Assigned roll ${currentRoll} to ${student.name}`);
        totalUpdated++;
      }
    }

    console.log(`\n✅ Migration complete! Updated ${totalUpdated} students with roll numbers.`);

  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    await client.close();
    console.log("\n🔒 Database connection closed");
  }
}

// Run the migration
migrateRollNumbers();
