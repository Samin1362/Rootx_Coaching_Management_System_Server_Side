import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

/**
 * Migration Script: Single-Tenant to Multi-Tenant
 * 
 * This script migrates existing data from single-tenant structure
 * to multi-tenant structure by:
 * 1. Creating a default organization
 * 2. Adding organizationId to all existing records
 * 3. Updating user roles
 * 4. Creating subscription for default organization
 */

const user = encodeURIComponent(process.env.DB_USER);
const pass = encodeURIComponent(process.env.DB_PASS);
const uri = `mongodb+srv://${user}:${pass}@cluster0.l2cobj0.mongodb.net/rootxCMS?appName=Cluster0`;

const client = new MongoClient(uri);

async function migrate() {
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db("roots_coaching_management_users");

    // Collections
    const organizationsCollection = db.collection("organizations");
    const subscriptionsCollection = db.collection("subscriptions");
    const usersCollection = db.collection("users");
    const studentsCollection = db.collection("students");
    const admissionsCollection = db.collection("admissions");
    const batchesCollection = db.collection("batches");
    const feesCollection = db.collection("fees");
    const attendencesCollection = db.collection("attendence");
    const examsCollection = db.collection("exams");
    const resultsCollection = db.collection("results");
    const expensesCollection = db.collection("expenses");

    console.log("\n📦 Starting migration...\n");

    // Step 1: Create default organization
    console.log("1️⃣  Creating default organization...");
    
    const defaultOrg = {
      name: "Default Organization",
      slug: "default-org",
      logo: "",
      email: "admin@rootx.com",
      phone: "",
      address: {},
      subscriptionStatus: "active",
      subscriptionTier: "enterprise",
      limits: {
        maxStudents: -1,  // Unlimited
        maxBatches: -1,
        maxStaff: -1,
        maxStorage: -1,
        features: ["all_features"],
      },
      usage: {
        currentStudents: 0,
        currentBatches: 0,
        currentStaff: 0,
        storageUsed: 0,
      },
      settings: {
        timezone: "Asia/Dhaka",
        currency: "BDT",
        language: "en",
        dateFormat: "DD/MM/YYYY",
        fiscalYearStart: "01-01",
      },
      branding: {
        primaryColor: "#3B82F6",
        secondaryColor: "#10B981",
        customDomain: "",
      },
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const orgResult = await organizationsCollection.insertOne(defaultOrg);
    const defaultOrgId = orgResult.insertedId;
    console.log(`   ✓ Default organization created: ${defaultOrgId}`);

    // Step 2: Update all existing users
    console.log("\n2️⃣  Migrating users...");
    
    const usersUpdateResult = await usersCollection.updateMany(
      { organizationId: { $exists: false } },
      {
        $set: {
          organizationId: defaultOrgId,
          role: "admin",  // Convert existing users to admin
          permissions: [],
          isSuperAdmin: false,
          status: "active",
          emailVerified: false,
          lastActivity: new Date(),
          preferences: {
            language: "en",
            theme: "light",
            notifications: {
              email: true,
              sms: false,
              push: true,
            },
          },
          updatedAt: new Date(),
        },
      }
    );
    console.log(`   ✓ Updated ${usersUpdateResult.modifiedCount} users`);

    // Set first user as org_owner
    const firstUser = await usersCollection.findOne({});
    if (firstUser) {
      await usersCollection.updateOne(
        { _id: firstUser._id },
        { $set: { role: "org_owner" } }
      );
      
      await organizationsCollection.updateOne(
        { _id: defaultOrgId },
        { $set: { ownerId: firstUser._id } }
      );
      console.log(`   ✓ Set ${firstUser.email} as organization owner`);
    }

    // Step 3: Update students
    console.log("\n3️⃣  Migrating students...");
    
    const studentsUpdateResult = await studentsCollection.updateMany(
      { organizationId: { $exists: false } },
      {
        $set: {
          organizationId: defaultOrgId,
          createdBy: firstUser?._id || null,
          updatedBy: firstUser?._id || null,
          updatedAt: new Date(),
        },
      }
    );
    console.log(`   ✓ Updated ${studentsUpdateResult.modifiedCount} students`);

    // Update organization student count
    const activeStudentsCount = await studentsCollection.countDocuments({
      organizationId: defaultOrgId,
      status: "active",
    });
    
    await organizationsCollection.updateOne(
      { _id: defaultOrgId },
      { $set: { "usage.currentStudents": activeStudentsCount } }
    );

    // Step 4: Update admissions
    console.log("\n4️⃣  Migrating admissions...");
    
    const admissionsUpdateResult = await admissionsCollection.updateMany(
      { organizationId: { $exists: false } },
      {
        $set: {
          organizationId: defaultOrgId,
          createdBy: firstUser?._id || null,
          updatedBy: firstUser?._id || null,
          updatedAt: new Date(),
        },
      }
    );
    console.log(`   ✓ Updated ${admissionsUpdateResult.modifiedCount} admissions`);

    // Step 5: Update batches
    console.log("\n5️⃣  Migrating batches...");
    
    const batchesUpdateResult = await batchesCollection.updateMany(
      { organizationId: { $exists: false } },
      {
        $set: {
          organizationId: defaultOrgId,
          createdBy: firstUser?._id || null,
          updatedAt: new Date(),
        },
      }
    );
    console.log(`   ✓ Updated ${batchesUpdateResult.modifiedCount} batches`);

    // Update organization batch count
    const activeBatchesCount = await batchesCollection.countDocuments({
      organizationId: defaultOrgId,
      status: "active",
    });
    
    await organizationsCollection.updateOne(
      { _id: defaultOrgId },
      { $set: { "usage.currentBatches": activeBatchesCount } }
    );

    // Step 6: Update fees
    console.log("\n6️⃣  Migrating fees...");
    
    const feesUpdateResult = await feesCollection.updateMany(
      { organizationId: { $exists: false } },
      {
        $set: {
          organizationId: defaultOrgId,
          createdBy: firstUser?._id || null,
          updatedAt: new Date(),
        },
      }
    );
    console.log(`   ✓ Updated ${feesUpdateResult.modifiedCount} fee records`);

    // Step 7: Update attendance
    console.log("\n7️⃣  Migrating attendance...");
    
    const attendanceUpdateResult = await attendencesCollection.updateMany(
      { organizationId: { $exists: false } },
      {
        $set: {
          organizationId: defaultOrgId,
          takenBy: firstUser?._id || null,
        },
      }
    );
    console.log(`   ✓ Updated ${attendanceUpdateResult.modifiedCount} attendance records`);

    // Step 8: Update exams
    console.log("\n8️⃣  Migrating exams...");
    
    const examsUpdateResult = await examsCollection.updateMany(
      { organizationId: { $exists: false } },
      {
        $set: {
          organizationId: defaultOrgId,
          createdBy: firstUser?._id || null,
          updatedAt: new Date(),
        },
      }
    );
    console.log(`   ✓ Updated ${examsUpdateResult.modifiedCount} exams`);

    // Step 9: Update results
    console.log("\n9️⃣  Migrating results...");
    
    const resultsUpdateResult = await resultsCollection.updateMany(
      { organizationId: { $exists: false } },
      {
        $set: {
          organizationId: defaultOrgId,
          enteredBy: firstUser?._id || null,
          updatedAt: new Date(),
        },
      }
    );
    console.log(`   ✓ Updated ${resultsUpdateResult.modifiedCount} results`);

    // Step 10: Update expenses
    console.log("\n🔟 Migrating expenses...");
    
    const expensesUpdateResult = await expensesCollection.updateMany(
      { organizationId: { $exists: false } },
      {
        $set: {
          organizationId: defaultOrgId,
          status: "approved",
          createdBy: firstUser?._id || null,
          updatedAt: new Date(),
        },
      }
    );
    console.log(`   ✓ Updated ${expensesUpdateResult.modifiedCount} expenses`);

    // Step 11: Create subscription
    console.log("\n1️⃣1️⃣  Creating subscription...");
    
    const subscription = {
      organizationId: defaultOrgId,
      tier: "enterprise",
      status: "active",
      billingCycle: "yearly",
      amount: 0,  // Grandfathered
      currency: "BDT",
      trialStartDate: null,
      trialEndDate: null,
      isTrialUsed: false,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      nextBillingDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      lastPaymentDate: new Date(),
      lastPaymentAmount: 0,
      cancelAtPeriodEnd: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await subscriptionsCollection.insertOne(subscription);
    console.log(`   ✓ Subscription created`);

    // Update organization staff count
    const staffCount = await usersCollection.countDocuments({
      organizationId: defaultOrgId,
      status: "active",
    });
    
    await organizationsCollection.updateOne(
      { _id: defaultOrgId },
      { $set: { "usage.currentStaff": staffCount } }
    );

    console.log("\n✅ Migration completed successfully!\n");
    console.log("📊 Summary:");
    console.log(`   - Organization ID: ${defaultOrgId}`);
    console.log(`   - Users: ${usersUpdateResult.modifiedCount}`);
    console.log(`   - Students: ${studentsUpdateResult.modifiedCount}`);
    console.log(`   - Admissions: ${admissionsUpdateResult.modifiedCount}`);
    console.log(`   - Batches: ${batchesUpdateResult.modifiedCount}`);
    console.log(`   - Fees: ${feesUpdateResult.modifiedCount}`);
    console.log(`   - Attendance: ${attendanceUpdateResult.modifiedCount}`);
    console.log(`   - Exams: ${examsUpdateResult.modifiedCount}`);
    console.log(`   - Results: ${resultsUpdateResult.modifiedCount}`);
    console.log(`   - Expenses: ${expensesUpdateResult.modifiedCount}`);

  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await client.close();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

// Run migration
migrate().catch(console.error);
