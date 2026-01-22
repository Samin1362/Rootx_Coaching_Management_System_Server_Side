const { MongoClient } = require("mongodb");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME;

async function migrateImageToPhotoURL() {
  if (!MONGODB_URI || !DB_NAME) {
    console.error("Error: MONGODB_URI or DB_NAME not found in environment variables");
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    console.log("Connecting to MongoDB...");
    await client.connect();
    console.log("Connected successfully");

    const db = client.db(DB_NAME);
    const usersCollection = db.collection("users");

    // Find users with 'image' field
    const usersWithImageField = await usersCollection.countDocuments({
      image: { $exists: true },
    });

    console.log(`Found ${usersWithImageField} users with 'image' field`);

    if (usersWithImageField === 0) {
      console.log("No migration needed - all users already use 'photoURL' field");
      return;
    }

    // Rename 'image' field to 'photoURL' for all users
    const result = await usersCollection.updateMany(
      { image: { $exists: true } },
      { $rename: { image: "photoURL" } }
    );

    console.log(`Migration completed successfully!`);
    console.log(`Updated ${result.modifiedCount} user records`);

    // Verify migration
    const remainingImageFields = await usersCollection.countDocuments({
      image: { $exists: true },
    });

    if (remainingImageFields === 0) {
      console.log("✓ Verification passed - no 'image' fields remaining");
    } else {
      console.warn(`⚠ Warning: ${remainingImageFields} users still have 'image' field`);
    }
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await client.close();
    console.log("Database connection closed");
  }
}

// Run migration
migrateImageToPhotoURL()
  .then(() => {
    console.log("Migration script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
