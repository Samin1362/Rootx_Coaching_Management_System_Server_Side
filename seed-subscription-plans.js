import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

/**
 * Seed Script: Subscription Plans
 * 
 * This script seeds the subscription_plans collection with
 * predefined subscription tiers
 */

const user = encodeURIComponent(process.env.DB_USER);
const pass = encodeURIComponent(process.env.DB_PASS);
const uri = `mongodb+srv://${user}:${pass}@cluster0.l2cobj0.mongodb.net/rootxCMS?appName=Cluster0`;

const client = new MongoClient(uri);

const subscriptionPlans = [
  {
    name: "Free Plan",
    tier: "free",
    description: "Perfect for getting started with basic features",
    monthlyPrice: 0,
    yearlyPrice: 0,
    currency: "BDT",
    limits: {
      maxStudents: 50,
      maxBatches: 3,
      maxStaff: 2,
      maxStorage: 100, // MB
      features: [
        "students",
        "batches",
        "basic_reports",
      ],
    },
    trialDays: 0,
    isPopular: false,
    displayOrder: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: "Basic Plan",
    tier: "basic",
    description: "Ideal for small coaching centers",
    monthlyPrice: 2000,
    yearlyPrice: 20000, // 2 months free
    currency: "BDT",
    limits: {
      maxStudents: 200,
      maxBatches: 10,
      maxStaff: 5,
      maxStorage: 500,
      features: [
        "students",
        "batches",
        "fees",
        "attendance",
        "basic_reports",
        "email_notifications",
      ],
    },
    trialDays: 14,
    isPopular: false,
    displayOrder: 2,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: "Professional Plan",
    tier: "professional",
    description: "Best for growing coaching centers",
    monthlyPrice: 5000,
    yearlyPrice: 50000, // 2 months free
    currency: "BDT",
    limits: {
      maxStudents: 1000,
      maxBatches: 50,
      maxStaff: 20,
      maxStorage: 2000,
      features: [
        "students",
        "batches",
        "fees",
        "attendance",
        "exams",
        "results",
        "advanced_reports",
        "analytics",
        "email_notifications",
        "sms_notifications",
        "bulk_operations",
      ],
    },
    trialDays: 14,
    isPopular: true,
    displayOrder: 3,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: "Enterprise Plan",
    tier: "enterprise",
    description: "For large institutions with advanced needs",
    monthlyPrice: 15000,
    yearlyPrice: 150000, // 2.5 months free
    currency: "BDT",
    limits: {
      maxStudents: -1, // Unlimited
      maxBatches: -1,
      maxStaff: -1,
      maxStorage: 10000,
      features: [
        "all_features",
        "api_access",
        "custom_domain",
        "white_label",
        "priority_support",
        "dedicated_account_manager",
        "custom_integrations",
        "advanced_analytics",
        "data_export",
      ],
    },
    trialDays: 30,
    isPopular: false,
    displayOrder: 4,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

async function seedPlans() {
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db("roots_coaching_management_users");
    const subscriptionPlansCollection = db.collection("subscription_plans");

    console.log("\n📦 Seeding subscription plans...\n");

    // Clear existing plans
    await subscriptionPlansCollection.deleteMany({});
    console.log("   ✓ Cleared existing plans");

    // Insert new plans
    const result = await subscriptionPlansCollection.insertMany(subscriptionPlans);
    console.log(`   ✓ Inserted ${result.insertedCount} subscription plans`);

    console.log("\n✅ Seeding completed successfully!\n");
    console.log("📊 Plans created:");
    subscriptionPlans.forEach((plan, index) => {
      console.log(`   ${index + 1}. ${plan.name} (${plan.tier})`);
      console.log(`      - Monthly: ৳${plan.monthlyPrice}`);
      console.log(`      - Yearly: ৳${plan.yearlyPrice}`);
      console.log(`      - Students: ${plan.limits.maxStudents === -1 ? 'Unlimited' : plan.limits.maxStudents}`);
      console.log(`      - Batches: ${plan.limits.maxBatches === -1 ? 'Unlimited' : plan.limits.maxBatches}`);
      console.log(`      - Features: ${plan.limits.features.length}`);
      console.log("");
    });

  } catch (error) {
    console.error("❌ Seeding failed:", error);
    throw error;
  } finally {
    await client.close();
    console.log("🔌 Disconnected from MongoDB");
  }
}

// Run seeding
seedPlans().catch(console.error);
