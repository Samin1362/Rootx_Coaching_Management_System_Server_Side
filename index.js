import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ServerApiVersion, ObjectId } from "mongodb";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// ==================== MIDDLEWARE ====================
app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://rootx-cms-firebase-project.web.app",
    ],
    credentials: true,
  })
);

// ==================== DATABASE CONNECTION ====================
const user = encodeURIComponent(process.env.DB_USER);
const pass = encodeURIComponent(process.env.DB_PASS);
const uri = `mongodb+srv://${user}:${pass}@cluster0.l2cobj0.mongodb.net/rootxCMS?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Database collections
let db;

// NEW COLLECTIONS (Multi-tenant)
let organizationsCollection;
let subscriptionsCollection;
let subscriptionPlansCollection;
let paymentsCollection;
let activityLogsCollection;
let notificationsCollection;

// EXISTING COLLECTIONS (Updated for multi-tenancy)
let usersCollection;
let studentsCollection;
let admissionsCollection;
let batchesCollection;
let feesCollection;
let attendencesCollection;
let examsCollection;
let resultsCollection;
let expensesCollection;

let isConnected = false;

// ==================== DATABASE INITIALIZATION ====================
async function connectDB() {
  if (isConnected && db) {
    return;
  }

  try {
    await client.connect();
    db = client.db("roots_coaching_management_users");

    // Initialize NEW collections
    organizationsCollection = db.collection("organizations");
    subscriptionsCollection = db.collection("subscriptions");
    subscriptionPlansCollection = db.collection("subscription_plans");
    paymentsCollection = db.collection("payments");
    activityLogsCollection = db.collection("activity_logs");
    notificationsCollection = db.collection("notifications");

    // Initialize EXISTING collections
    usersCollection = db.collection("users");
    studentsCollection = db.collection("students");
    admissionsCollection = db.collection("admissions");
    batchesCollection = db.collection("batches");
    feesCollection = db.collection("fees");
    attendencesCollection = db.collection("attendence");
    examsCollection = db.collection("exams");
    resultsCollection = db.collection("results");
    expensesCollection = db.collection("expenses");

    isConnected = true;
    console.log("✅ Connected to MongoDB");

    // Create indexes
    await createIndexes();
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    isConnected = false;
    throw err;
  }
}

// ==================== CREATE INDEXES ====================
async function createIndexes() {
  try {
    // Organizations indexes
    await organizationsCollection.createIndex({ slug: 1 }, { unique: true });
    await organizationsCollection.createIndex({ email: 1 }, { unique: true });
    await organizationsCollection.createIndex({ subscriptionStatus: 1 });
    await organizationsCollection.createIndex({ ownerId: 1 });

    // Subscriptions indexes
    await subscriptionsCollection.createIndex(
      { organizationId: 1 },
      { unique: true }
    );
    await subscriptionsCollection.createIndex({ status: 1 });
    await subscriptionsCollection.createIndex({ nextBillingDate: 1 });

    // Subscription Plans indexes
    await subscriptionPlansCollection.createIndex({ tier: 1 }, { unique: true });

    // Payments indexes
    await paymentsCollection.createIndex({ organizationId: 1 });
    await paymentsCollection.createIndex({ subscriptionId: 1 });
    await paymentsCollection.createIndex({ status: 1 });
    await paymentsCollection.createIndex(
      { invoiceNumber: 1 },
      { unique: true, sparse: true }
    );
    await paymentsCollection.createIndex({ createdAt: -1 });

    // Users indexes (UPDATED)
    await usersCollection.createIndex({ email: 1 }, { unique: true });
    await usersCollection.createIndex(
      { firebaseUid: 1 },
      { unique: true, sparse: true }
    );
    await usersCollection.createIndex({ organizationId: 1 });
    await usersCollection.createIndex({ role: 1 });

    // Students indexes (UPDATED)
    await studentsCollection.createIndex({ organizationId: 1 });
    await studentsCollection.createIndex(
      { organizationId: 1, studentId: 1 },
      { unique: true }
    );
    await studentsCollection.createIndex({ organizationId: 1, batchId: 1 });
    await studentsCollection.createIndex({ organizationId: 1, status: 1 });

    // Admissions indexes (UPDATED)
    await admissionsCollection.createIndex({ organizationId: 1 });
    await admissionsCollection.createIndex({ organizationId: 1, status: 1 });

    // Batches indexes (UPDATED)
    await batchesCollection.createIndex({ organizationId: 1 });
    await batchesCollection.createIndex({ organizationId: 1, status: 1 });

    // Fees indexes (UPDATED)
    await feesCollection.createIndex({ organizationId: 1 });
    await feesCollection.createIndex({ organizationId: 1, studentId: 1 });
    await feesCollection.createIndex({ organizationId: 1, status: 1 });

    // Attendance indexes (UPDATED)
    await attendencesCollection.createIndex({ organizationId: 1 });
    await attendencesCollection.createIndex(
      { organizationId: 1, batchId: 1, date: 1 },
      { unique: true }
    );

    // Exams indexes (UPDATED)
    await examsCollection.createIndex({ organizationId: 1 });
    await examsCollection.createIndex({ organizationId: 1, batchId: 1 });

    // Results indexes (UPDATED)
    await resultsCollection.createIndex({ organizationId: 1 });
    await resultsCollection.createIndex(
      { organizationId: 1, examId: 1, studentId: 1 },
      { unique: true }
    );

    // Expenses indexes (UPDATED)
    await expensesCollection.createIndex({ organizationId: 1 });
    await expensesCollection.createIndex({ organizationId: 1, category: 1 });
    await expensesCollection.createIndex({ organizationId: 1, date: -1 });

    // Activity Logs indexes
    await activityLogsCollection.createIndex({ organizationId: 1, createdAt: -1 });
    await activityLogsCollection.createIndex({ userId: 1 });
    await activityLogsCollection.createIndex({ resource: 1, resourceId: 1 });

    // Notifications indexes
    await notificationsCollection.createIndex({ userId: 1, isRead: 1 });
    await notificationsCollection.createIndex({ organizationId: 1, createdAt: -1 });

    console.log("✅ Indexes created successfully");
  } catch (error) {
    console.error("⚠️  Error creating indexes:", error.message);
  }
}

// ==================== MIDDLEWARE FUNCTIONS ====================

// Ensure DB connection
const ensureDBConnection = async (req, res, next) => {
  try {
    if (!isConnected) {
      await connectDB();
    }
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Database connection failed",
      error: error.message,
    });
  }
};

// Simple authentication middleware (checks if user exists)
// Note: For production, implement Firebase Admin SDK token verification
const authenticateUser = async (req, res, next) => {
  try {
    const email = req.headers["x-user-email"]; // Temporary: get from header
    
    if (!email) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const user = await usersCollection.findOne({ email });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    // Attach user to request
    req.user = user;
    req.userId = user._id;
    req.organizationId = user.organizationId;
    req.userRole = user.role;

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Authentication failed",
      error: error.message,
    });
  }
};

// Authorization middleware - check permissions
const requirePermission = (permission) => {
  return (req, res, next) => {
    const { userRole } = req;

    // Super admin has all permissions
    if (userRole === "super_admin") {
      return next();
    }

    // Define role permissions
    const rolePermissions = {
      org_owner: ["all"],
      admin: [
        "view_students",
        "create_student",
        "update_student",
        "delete_student",
        "view_batches",
        "create_batch",
        "update_batch",
        "delete_batch",
        "view_fees",
        "create_fee",
        "collect_payment",
        "view_attendance",
        "mark_attendance",
        "view_exams",
        "create_exam",
        "enter_results",
        "view_reports",
        "export_data",
        "manage_users",
      ],
      manager: [
        "view_students",
        "create_student",
        "update_student",
        "view_batches",
        "create_batch",
        "update_batch",
        "view_fees",
        "create_fee",
        "collect_payment",
        "view_attendance",
        "mark_attendance",
        "view_exams",
        "view_reports",
      ],
      teacher: [
        "view_students",
        "view_batches",
        "view_attendance",
        "mark_attendance",
        "view_exams",
        "create_exam",
        "enter_results",
        "view_reports",
      ],
      staff: [
        "view_students",
        "view_batches",
        "view_attendance",
        "view_reports",
      ],
    };

    const userPermissions = rolePermissions[userRole] || [];

    if (
      userPermissions.includes("all") ||
      userPermissions.includes(permission)
    ) {
      return next();
    }

    res.status(403).json({
      success: false,
      message: "Insufficient permissions",
      required: permission,
    });
  };
};

// Organization isolation middleware
const enforceOrganizationIsolation = (req, res, next) => {
  // Skip for super_admin
  if (req.userRole === "super_admin") {
    return next();
  }

  // Ensure organizationId is set
  if (!req.organizationId) {
    return res.status(403).json({
      success: false,
      message: "Organization context required",
    });
  }

  next();
};

// Log activity
async function logActivity(userId, organizationId, action, resource, resourceId, changes = null) {
  try {
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
    
    await activityLogsCollection.insertOne({
      organizationId: new ObjectId(organizationId),
      userId: new ObjectId(userId),
      userName: user?.name || "Unknown",
      action,
      resource,
      resourceId,
      changes,
      ipAddress: null, // Can be extracted from req
      userAgent: null,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("Error logging activity:", error);
  }
}

// Initialize database connection
connectDB().catch(console.dir);

// ==================== API ROUTES ====================

// Health check
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is healthy",
    timestamp: new Date().toISOString(),
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Rootx Coaching Management System API - Multi-Tenant",
    version: "2.0.0",
    status: "Running",
  });
});

// ==================== ORGANIZATIONS API ====================

// Create organization (Public signup)
app.post("/organizations", ensureDBConnection, async (req, res) => {
  try {
    const {
      name,
      slug,
      email,
      phone,
      address,
      ownerName,
      ownerEmail,
      ownerPassword,
      ownerPhotoURL,
      ownerFirebaseUid,
    } = req.body;

    // Validation
    if (!name || !slug || !email || !ownerEmail) {
      return res.status(400).json({
        success: false,
        message: "Required fields missing",
      });
    }

    // Check if slug or email already exists
    const existing = await organizationsCollection.findOne({
      $or: [{ slug }, { email }],
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Organization with this slug or email already exists",
      });
    }

    // Create organization
    const organization = {
      name,
      slug,
      logo: "",
      email,
      phone: phone || "",
      address: address || {},
      subscriptionStatus: "trial",
      subscriptionTier: "free",
      limits: {
        maxStudents: 50,
        maxBatches: 3,
        maxStaff: 2,
        maxStorage: 100,
        features: ["students", "batches", "basic_reports"],
      },
      usage: {
        currentStudents: 0,
        currentBatches: 0,
        currentStaff: 1, // Owner
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

    const orgResult = await organizationsCollection.insertOne(organization);
    const organizationId = orgResult.insertedId;

    // Check if owner user already exists (they might have registered via /register)
    let existingUser = await usersCollection.findOne({ email: ownerEmail });
    let ownerId;

    if (existingUser) {
      // User exists - update their record to make them owner of this organization
      await usersCollection.updateOne(
        { _id: existingUser._id },
        {
          $set: {
            organizationId,
            role: "org_owner",
            permissions: ["all"],
            photoURL: ownerPhotoURL || existingUser.photoURL || "",
            firebaseUid: ownerFirebaseUid || existingUser.firebaseUid || "",
            status: "active",
            updatedAt: new Date(),
          },
        }
      );
      ownerId = existingUser._id;
    } else {
      // Create new owner user
      const owner = {
        name: ownerName || "Owner",
        email: ownerEmail,
        phone: phone || "",
        password: ownerPassword || "", // Should be hashed (kept for backward compatibility)
        photoURL: ownerPhotoURL || "",
        firebaseUid: ownerFirebaseUid || "",
        organizationId,
        role: "org_owner",
        permissions: ["all"],
        isSuperAdmin: false,
        status: "active",
        emailVerified: false,
        lastLogin: null,
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
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const userResult = await usersCollection.insertOne(owner);
      ownerId = userResult.insertedId;
    }

    // Update organization with ownerId
    await organizationsCollection.updateOne(
      { _id: organizationId },
      { $set: { ownerId: ownerId } }
    );

    // Create trial subscription
    const subscription = {
      organizationId,
      tier: "free",
      status: "trial",
      billingCycle: "monthly",
      amount: 0,
      currency: "BDT",
      trialStartDate: new Date(),
      trialEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
      isTrialUsed: true,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      nextBillingDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      cancelAtPeriodEnd: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await subscriptionsCollection.insertOne(subscription);

    res.status(201).json({
      success: true,
      message: "Organization created successfully",
      data: {
        organizationId,
        slug,
        ownerId: ownerId,
      },
    });
  } catch (error) {
    console.error("Error creating organization:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create organization",
      error: error.message,
    });
  }
});

// Get organization details
app.get(
  "/organizations/:id",
  ensureDBConnection,
  authenticateUser,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Check permission
      if (
        req.userRole !== "super_admin" &&
        req.organizationId.toString() !== id
      ) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      const organization = await organizationsCollection.findOne({
        _id: new ObjectId(id),
      });

      if (!organization) {
        return res.status(404).json({
          success: false,
          message: "Organization not found",
        });
      }

      res.json({
        success: true,
        data: organization,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch organization",
        error: error.message,
      });
    }
  }
);

// Update organization
app.patch(
  "/organizations/:id",
  ensureDBConnection,
  authenticateUser,
  requirePermission("manage_organization"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Check permission
      if (
        req.userRole !== "super_admin" &&
        req.userRole !== "org_owner" &&
        req.organizationId.toString() !== id
      ) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      // Remove fields that shouldn't be updated directly
      delete updates._id;
      delete updates.ownerId;
      delete updates.subscriptionStatus;
      delete updates.subscriptionTier;
      delete updates.usage;

      updates.updatedAt = new Date();

      const result = await organizationsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updates }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({
          success: false,
          message: "Organization not found",
        });
      }

      // Log activity
      await logActivity(
        req.userId,
        id,
        "update",
        "organization",
        id,
        updates
      );

      res.json({
        success: true,
        message: "Organization updated successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to update organization",
        error: error.message,
      });
    }
  }
);

// Get organization statistics
app.get(
  "/organizations/:id/stats",
  ensureDBConnection,
  authenticateUser,
  async (req, res) => {
    try {
      const { id } = req.params;
      const orgId = new ObjectId(id);

      // Check permission
      if (
        req.userRole !== "super_admin" &&
        req.organizationId.toString() !== id
      ) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      // Get counts
      const totalStudents = await studentsCollection.countDocuments({
        organizationId: orgId,
        status: "active",
      });

      const totalBatches = await batchesCollection.countDocuments({
        organizationId: orgId,
        status: "active",
      });

      const totalStaff = await usersCollection.countDocuments({
        organizationId: orgId,
        status: "active",
      });

      const totalAdmissions = await admissionsCollection.countDocuments({
        organizationId: orgId,
      });

      // Get financial stats
      const feeStats = await feesCollection
        .aggregate([
          { $match: { organizationId: orgId } },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: "$paidAmount" },
              totalDue: { $sum: "$dueAmount" },
            },
          },
        ])
        .toArray();

      const stats = {
        students: {
          total: totalStudents,
        },
        batches: {
          total: totalBatches,
        },
        staff: {
          total: totalStaff,
        },
        admissions: {
          total: totalAdmissions,
        },
        finance: {
          totalRevenue: feeStats[0]?.totalRevenue || 0,
          totalDue: feeStats[0]?.totalDue || 0,
        },
      };

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch statistics",
        error: error.message,
      });
    }
  }
);

// ==================== SUBSCRIPTION PLANS API ====================

// Get all subscription plans
app.get("/subscriptions/plans", ensureDBConnection, async (req, res) => {
  try {
    const plans = await subscriptionPlansCollection
      .find({ isActive: true })
      .sort({ displayOrder: 1 })
      .toArray();

    res.json({
      success: true,
      data: plans,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch subscription plans",
      error: error.message,
    });
  }
});

// Get subscription details
app.get(
  "/subscriptions/:id",
  ensureDBConnection,
  authenticateUser,
  async (req, res) => {
    try {
      const { id } = req.params;

      const subscription = await subscriptionsCollection.findOne({
        _id: new ObjectId(id),
      });

      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: "Subscription not found",
        });
      }

      // Check permission
      if (
        req.userRole !== "super_admin" &&
        req.organizationId.toString() !== subscription.organizationId.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      res.json({
        success: true,
        data: subscription,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch subscription",
        error: error.message,
      });
    }
  }
);

// Get subscription by organizationId
app.get(
  "/subscriptions/organization/:organizationId",
  ensureDBConnection,
  authenticateUser,
  async (req, res) => {
    try {
      const { organizationId } = req.params;

      // Check permission
      if (
        req.userRole !== "super_admin" &&
        req.organizationId.toString() !== organizationId
      ) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      const subscription = await subscriptionsCollection.findOne({
        organizationId: new ObjectId(organizationId),
      });

      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: "Subscription not found",
          data: null,
        });
      }

      res.json({
        success: true,
        data: subscription,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch subscription",
        error: error.message,
      });
    }
  }
);

// Get billing history for an organization
app.get(
  "/subscriptions/payments",
  ensureDBConnection,
  authenticateUser,
  enforceOrganizationIsolation,
  async (req, res) => {
    try {
      const payments = await paymentsCollection
        .find({
          organizationId: req.organizationId,
          type: "subscription",
        })
        .sort({ date: -1 })
        .toArray();

      res.json({
        success: true,
        data: payments,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch billing history",
        error: error.message,
      });
    }
  }
);

// Upgrade/Change subscription plan
app.post(
  "/subscriptions/upgrade",
  ensureDBConnection,
  authenticateUser,
  enforceOrganizationIsolation,
  async (req, res) => {
    try {
      const { planId, billingCycle } = req.body;

      if (!planId) {
        return res.status(400).json({
          success: false,
          message: "Plan selection is required",
        });
      }

      // Find the new plan
      const plan = await subscriptionPlansCollection.findOne({
        _id: new ObjectId(planId),
      });

      if (!plan) {
        return res.status(404).json({
          success: false,
          message: "Plan not found",
        });
      }

      const amount = billingCycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
      const nextBillingDate = new Date();
      if (billingCycle === "yearly") {
        nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
      } else {
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
      }

      // Update or create subscription
      const subscriptionData = {
        organizationId: req.organizationId,
        planId: plan._id,
        tier: plan.tier,
        status: "active",
        billingCycle: billingCycle || "monthly",
        amount,
        nextBillingDate,
        updatedAt: new Date(),
      };

      await subscriptionsCollection.updateOne(
        { organizationId: req.organizationId },
        { $set: subscriptionData },
        { upsert: true }
      );

      // Update organization limits
      await organizationsCollection.updateOne(
        { _id: req.organizationId },
        {
          $set: {
            subscriptionStatus: "active",
            limits: plan.limits,
            updatedAt: new Date(),
          },
        }
      );

      // Record payment
      const paymentRecord = {
        organizationId: req.organizationId,
        type: "subscription",
        planTier: plan.tier,
        amount,
        billingCycle: billingCycle || "monthly",
        method: "online_payment",
        status: "paid",
        date: new Date(),
        invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
        createdBy: req.userId,
      };

      await paymentsCollection.insertOne(paymentRecord);

      // Log activity
      await logActivity(
        req.userId,
        req.organizationId,
        "upgrade",
        "subscription",
        plan.tier
      );

      res.json({
        success: true,
        message: `Plan upgraded to ${plan.name} successfully`,
        data: subscriptionData,
      });
    } catch (error) {
      console.error("Upgrade error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to upgrade plan",
        error: error.message,
      });
    }
  }
);

// ==================== USERS API (UPDATED) ====================

// Register/Create user (Public endpoint - no auth required)
app.post(
  "/users/register",
  ensureDBConnection,
  async (req, res) => {
    try {
      const { name, email, firebaseUid, photoURL, organizationId, role = "admin" } = req.body;

      // Validation
      if (!name || !email || !firebaseUid) {
        return res.status(400).json({
          success: false,
          message: "Name, email, and firebaseUid are required",
        });
      }

      // Check if user already exists
      const existingUser = await usersCollection.findOne({ email });
      if (existingUser) {
        return res.status(200).json({
          success: true,
          data: existingUser,
          message: "User already exists",
        });
      }

      // Create new user
      const newUser = {
        name,
        email,
        firebaseUid,
        photoURL: photoURL || null,
        organizationId: organizationId ? new ObjectId(organizationId) : null,
        role: role,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await usersCollection.insertOne(newUser);
      const user = await usersCollection.findOne({ _id: result.insertedId });

      res.status(201).json({
        success: true,
        data: user,
        message: "User registered successfully",
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to register user",
        error: error.message,
      });
    }
  }
);

// Get current user (me) - No organization isolation needed
app.get(
  "/users/me",
  ensureDBConnection,
  authenticateUser,
  async (req, res) => {
    try {
      // req.user is already populated by authenticateUser middleware
      const user = { ...req.user };
      delete user.password; // Remove password field for security

      // Add organization status flag
      const hasOrganization = user.organizationId ? true : false;

      res.json({
        success: true,
        data: {
          ...user,
          hasOrganization,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch user data",
        error: error.message,
      });
    }
  }
);

// Get all users (organization-scoped)
app.get(
  "/users",
  ensureDBConnection,
  authenticateUser,
  enforceOrganizationIsolation,
  requirePermission("manage_users"),
  async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query;

      const users = await usersCollection
        .find({
          organizationId: req.organizationId,
          status: { $ne: "deleted" },
        })
        .project({ password: 0 }) // Exclude password field
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .toArray();

      const total = await usersCollection.countDocuments({
        organizationId: req.organizationId,
        status: { $ne: "deleted" },
      });

      res.json({
        success: true,
        data: users,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch users",
        error: error.message,
      });
    }
  }
);

// Invite user to organization
app.post(
  "/users/invite",
  ensureDBConnection,
  authenticateUser,
  enforceOrganizationIsolation,
  requirePermission("manage_users"),
  async (req, res) => {
    try {
      const { email, role } = req.body;

      // Validation
      if (!email || !role) {
        return res.status(400).json({
          success: false,
          message: "Email and role are required",
        });
      }

      // Check if user exists
      const existingUser = await usersCollection.findOne({ email });

      if (!existingUser) {
        return res.status(404).json({
          success: false,
          message: "User must register first at /register",
        });
      }

      // Check if user already belongs to an organization
      if (existingUser.organizationId) {
        const isSameOrg = existingUser.organizationId.equals(req.organizationId);
        return res.status(409).json({
          success: false,
          message: isSameOrg
            ? "User is already a member of your organization"
            : "User already belongs to another organization",
        });
      }

      // Check staff limit before assigning
      const org = await organizationsCollection.findOne({
        _id: req.organizationId,
      });

      if (org.usage.currentStaff >= org.limits.maxStaff) {
        return res.status(403).json({
          success: false,
          message: "Staff limit reached. Upgrade your plan to add more users.",
        });
      }

      // Assign user to organization
      await usersCollection.updateOne(
        { _id: existingUser._id },
        {
          $set: {
            organizationId: req.organizationId,
            role: role,
            updatedAt: new Date(),
          },
        }
      );

      // Update organization staff count
      await organizationsCollection.updateOne(
        { _id: req.organizationId },
        { $inc: { "usage.currentStaff": 1 } }
      );

      // Log activity
      await logActivity(
        req.userId,
        req.organizationId,
        "assign",
        "user",
        existingUser._id.toString()
      );

      res.status(200).json({
        success: true,
        message: "User added to organization successfully",
        data: {
          userId: existingUser._id,
          wasExisting: true,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to invite user",
        error: error.message,
      });
    }
  }
);

// Update user role
app.patch(
  "/users/:id/role",
  ensureDBConnection,
  authenticateUser,
  enforceOrganizationIsolation,
  requirePermission("manage_users"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;

      if (!role) {
        return res.status(400).json({
          success: false,
          message: "Role is required",
        });
      }

      // Check if user belongs to organization
      const user = await usersCollection.findOne({
        _id: new ObjectId(id),
        organizationId: req.organizationId,
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Cannot change org_owner role
      if (user.role === "org_owner") {
        return res.status(403).json({
          success: false,
          message: "Cannot change organization owner role",
        });
      }

      const result = await usersCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            role,
            updatedAt: new Date(),
          },
        }
      );

      // Log activity
      await logActivity(
        req.userId,
        req.organizationId,
        "update",
        "user",
        id,
        { role }
      );

      res.json({
        success: true,
        message: "User role updated successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to update user role",
        error: error.message,
      });
    }
  }
);

// Remove user from organization
app.delete(
  "/users/:id",
  ensureDBConnection,
  authenticateUser,
  enforceOrganizationIsolation,
  requirePermission("manage_users"),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Check if user belongs to organization
      const user = await usersCollection.findOne({
        _id: new ObjectId(id),
        organizationId: req.organizationId,
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Cannot delete org_owner
      if (user.role === "org_owner") {
        return res.status(403).json({
          success: false,
          message: "Cannot delete organization owner",
        });
      }

      // Soft delete
      await usersCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            status: "deleted",
            deletedAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );

      // Update organization staff count
      await organizationsCollection.updateOne(
        { _id: req.organizationId },
        { $inc: { "usage.currentStaff": -1 } }
      );

      // Log activity
      await logActivity(
        req.userId,
        req.organizationId,
        "delete",
        "user",
        id
      );

      res.json({
        success: true,
        message: "User removed successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to remove user",
        error: error.message,
      });
    }
  }
);

// ==================== STUDENTS API (UPDATED) ====================

// Get all students (organization-scoped)
app.get(
  "/students",
  ensureDBConnection,
  authenticateUser,
  enforceOrganizationIsolation,
  requirePermission("view_students"),
  async (req, res) => {
    try {
      const { email, page = 1, limit = 10 } = req.query;

      const query = { organizationId: req.organizationId };

      if (email) {
        query.email = { $regex: email, $options: "i" };
      }

      const students = await studentsCollection
        .find(query)
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .toArray();

      const total = await studentsCollection.countDocuments(query);

      res.json({
        success: true,
        data: students,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch students",
        error: error.message,
      });
    }
  }
);

// Create student (organization-scoped)
app.post(
  "/students",
  ensureDBConnection,
  authenticateUser,
  enforceOrganizationIsolation,
  requirePermission("create_student"),
  async (req, res) => {
    try {
      const {
        name,
        image,
        gender,
        dob,
        phone,
        email,
        address,
        guardianName,
        guardianPhone,
        previousInstitute,
        batchId,
        status,
        admissionDate,
        documents,
      } = req.body;

      // Validation
      if (!name || !phone || !batchId) {
        return res.status(400).json({
          success: false,
          message: "Required fields missing",
        });
      }

      // Check student limit
      const org = await organizationsCollection.findOne({
        _id: req.organizationId,
      });

      if (
        org.limits.maxStudents !== -1 &&
        org.usage.currentStudents >= org.limits.maxStudents
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Student limit reached. Upgrade your plan to add more students.",
        });
      }

      // Auto-generate roll number
      const studentsInBatch = await studentsCollection
        .find({ organizationId: req.organizationId, batchId })
        .sort({ roll: -1 })
        .limit(1)
        .toArray();

      const nextRoll =
        studentsInBatch.length > 0 && studentsInBatch[0].roll
          ? studentsInBatch[0].roll + 1
          : 1;

      const newStudent = {
        organizationId: req.organizationId,
        studentId: `STD-${Date.now()}`,
        roll: nextRoll,
        name,
        image: image || "",
        gender: gender || "",
        dob: dob || null,
        phone,
        email: email || "",
        address: address || "",
        guardianName: guardianName || "",
        guardianPhone: guardianPhone || "",
        previousInstitute: previousInstitute || "",
        batchId,
        status: status || "active",
        documents: documents || [],
        admissionDate: admissionDate ? new Date(admissionDate) : new Date(),
        createdBy: req.userId,
        updatedBy: req.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await studentsCollection.insertOne(newStudent);

      // Update organization student count
      await organizationsCollection.updateOne(
        { _id: req.organizationId },
        { $inc: { "usage.currentStudents": 1 } }
      );

      // Log activity
      await logActivity(
        req.userId,
        req.organizationId,
        "create",
        "student",
        result.insertedId.toString()
      );

      res.status(201).json({
        success: true,
        message: "Student added successfully",
        data: {
          insertedId: result.insertedId,
          roll: nextRoll,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to add student",
        error: error.message,
      });
    }
  }
);

// Update student (organization-scoped)
app.patch(
  "/students/:id",
  ensureDBConnection,
  authenticateUser,
  enforceOrganizationIsolation,
  requirePermission("update_student"),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid student ID",
        });
      }

      // Check if student belongs to organization
      const student = await studentsCollection.findOne({
        _id: new ObjectId(id),
        organizationId: req.organizationId,
      });

      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Student not found",
        });
      }

      const updates = { ...req.body };
      delete updates._id;
      delete updates.organizationId;
      delete updates.createdBy;
      delete updates.createdAt;

      updates.updatedBy = req.userId;
      updates.updatedAt = new Date();

      // Handle batch change
      if (updates.batchId && updates.batchId !== student.batchId) {
        const studentsInNewBatch = await studentsCollection
          .find({ organizationId: req.organizationId, batchId: updates.batchId })
          .sort({ roll: -1 })
          .limit(1)
          .toArray();

        const nextRoll =
          studentsInNewBatch.length > 0 && studentsInNewBatch[0].roll
            ? studentsInNewBatch[0].roll + 1
            : 1;

        updates.roll = nextRoll;
      }

      const result = await studentsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updates }
      );

      // Log activity
      await logActivity(
        req.userId,
        req.organizationId,
        "update",
        "student",
        id,
        updates
      );

      res.json({
        success: true,
        message: "Student updated successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to update student",
        error: error.message,
      });
    }
  }
);

// Delete student (organization-scoped)
app.delete(
  "/students/:id",
  ensureDBConnection,
  authenticateUser,
  enforceOrganizationIsolation,
  requirePermission("delete_student"),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid student ID",
        });
      }

      // Check if student belongs to organization
      const student = await studentsCollection.findOne({
        _id: new ObjectId(id),
        organizationId: req.organizationId,
      });

      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Student not found",
        });
      }

      // Soft delete
      await studentsCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            status: "deleted",
            deletedAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );

      // Update organization student count
      await organizationsCollection.updateOne(
        { _id: req.organizationId },
        { $inc: { "usage.currentStudents": -1 } }
      );

      // Log activity
      await logActivity(
        req.userId,
        req.organizationId,
        "delete",
        "student",
        id
      );

      res.json({
        success: true,
        message: "Student deleted successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to delete student",
        error: error.message,
      });
    }
  }
);

// ==================== BATCHES API (UPDATED) ====================

// Get all batches (organization-scoped)
app.get(
  "/batches",
  ensureDBConnection,
  authenticateUser,
  enforceOrganizationIsolation,
  requirePermission("view_batches"),
  async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query;

      const batches = await batchesCollection
        .find({ organizationId: req.organizationId })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .toArray();

      const total = await batchesCollection.countDocuments({
        organizationId: req.organizationId,
      });

      res.json({
        success: true,
        data: batches,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch batches",
        error: error.message,
      });
    }
  }
);

// Create batch (organization-scoped)
app.post(
  "/batches",
  ensureDBConnection,
  authenticateUser,
  enforceOrganizationIsolation,
  requirePermission("create_batch"),
  async (req, res) => {
    try {
      const {
        name,
        course,
        schedule,
        startDate,
        endDate,
        capacity,
        instructor,
        status,
        fees,
      } = req.body;

      // Validation
      if (!name || !course) {
        return res.status(400).json({
          success: false,
          message: "Batch name and course are required",
        });
      }

      // Check batch limit
      const org = await organizationsCollection.findOne({
        _id: req.organizationId,
      });

      if (
        org.limits.maxBatches !== -1 &&
        org.usage.currentBatches >= org.limits.maxBatches
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Batch limit reached. Upgrade your plan to add more batches.",
        });
      }

      const newBatch = {
        organizationId: req.organizationId,
        name,
        course,
        schedule: schedule || "",
        fees: Number(fees) || 0,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        capacity: capacity || 0,
        instructor: instructor || "",
        status: status || "active",
        createdBy: req.userId,
        updatedBy: req.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await batchesCollection.insertOne(newBatch);

      // Update organization batch count
      await organizationsCollection.updateOne(
        { _id: req.organizationId },
        { $inc: { "usage.currentBatches": 1 } }
      );

      // Log activity
      await logActivity(
        req.userId,
        req.organizationId,
        "create",
        "batch",
        result.insertedId.toString()
      );

      res.status(201).json({
        success: true,
        message: "Batch created successfully",
        data: {
          insertedId: result.insertedId,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to create batch",
        error: error.message,
      });
    }
  }
);

// ==================== FEES API (ADDED) ====================

// Get all fees (organization-scoped)
app.get(
  "/fees",
  ensureDBConnection,
  authenticateUser,
  enforceOrganizationIsolation,
  requirePermission("view_fees"),
  async (req, res) => {
    try {
      const { search, status, page = 1, limit = 1000 } = req.query; // Default limit 1000 to avoid pagination issues for now
      const query = { organizationId: req.organizationId };

      if (search) {
        query.$or = [
          { studentName: { $regex: search, $options: "i" } },
          { batchName: { $regex: search, $options: "i" } }
        ];
      }
      if (status) query.status = status;

      let fees = await feesCollection
        .find(query)
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .toArray();

      // Ensure all fee records have proper structure
      fees = fees.map(fee => ({
        ...fee,
        fees: Number(fee.fees) || 0,
        paidAmount: Number(fee.paidAmount) || 0,
        dueAmount: Number(fee.dueAmount) || 0,
        payments: Array.isArray(fee.payments) ? fee.payments : [],
        status: fee.status || (fee.dueAmount > 0 ? 'due' : 'clear')
      }));

      res.json({
        success: true,
        data: fees,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: fees.length, // Approximate for now, or use countDocuments
        }
      });
    } catch (error) {
       res.status(500).json({ success: false, message: error.message });
    }
  }
);


// Create fee (organization-scoped)
app.post(
  "/fees",
  ensureDBConnection,
  authenticateUser,
  enforceOrganizationIsolation,
  requirePermission("create_fee"),
  async (req, res) => {
    try {
      const fee = req.body;
      fee.organizationId = req.organizationId;
      fee.createdAt = new Date();
      fee.updatedAt = new Date();
      fee.createdBy = req.userId;

      // Ensure numeric values
      if (fee.fees) fee.fees = Number(fee.fees);
      if (fee.paidAmount) fee.paidAmount = Number(fee.paidAmount);

      // Calculate due amount if not provided or ensure it's correct
      if (fee.dueAmount === undefined || fee.dueAmount === null) {
          fee.dueAmount = (fee.fees || 0) - (fee.paidAmount || 0);
      } else {
          fee.dueAmount = Number(fee.dueAmount);
      }

      // Determine status dynamically
      // If due amount is 0 or less, it's cleared.
      fee.status = fee.dueAmount <= 0 ? "clear" : "due";

      // Initialize payments array
      fee.payments = [];

      // If there's an initial payment, add it to payments array
      if (fee.paidAmount && fee.paidAmount > 0) {
        fee.payments.push({
          amount: fee.paidAmount,
          method: fee.paymentMethod || "cash",
          date: new Date(),
          recordedBy: req.userId
        });
      }

      const result = await feesCollection.insertOne(fee);

      await logActivity(req.userId, req.organizationId, "create", "fee", result.insertedId.toString());

      // Return insertedId at root level to match NewFeeEntry.jsx expectation
      res.status(201).json({
          success: true,
          message: "Fee created successfully",
          insertedId: result.insertedId
      });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to create fee", error: error.message });
    }
  }
);

// Update fee payment (organization-scoped)
app.patch(
  "/fees/:id",
  ensureDBConnection,
  authenticateUser,
  enforceOrganizationIsolation,
  requirePermission("collect_payment"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { amount, paymentMethod } = req.body;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "Invalid fee ID" });
      }

      const fee = await feesCollection.findOne({
        _id: new ObjectId(id),
        organizationId: req.organizationId,
      });

      if (!fee) {
        return res.status(404).json({ success: false, message: "Fee entry not found" });
      }

      const paymentAmount = Number(amount);
      if (isNaN(paymentAmount) || paymentAmount <= 0) {
        return res.status(400).json({ success: false, message: "Invalid payment amount" });
      }

      // Calculate new amounts
      const currentPaidAmount = Number(fee.paidAmount) || 0;
      const totalFee = Number(fee.fees) || 0;
      const newPaidAmount = currentPaidAmount + paymentAmount;
      const newDueAmount = Math.max(0, totalFee - newPaidAmount);
      const newStatus = newDueAmount <= 0 ? "clear" : "due";

      // Validate payment doesn't exceed due amount
      const currentDueAmount = Number(fee.dueAmount) || 0;
      if (paymentAmount > currentDueAmount) {
        return res.status(400).json({
          success: false,
          message: "Payment amount cannot exceed due amount"
        });
      }

      // Create payment history entry
      const paymentHistoryEntry = {
        amount: paymentAmount,
        method: paymentMethod || "cash",
        date: new Date(),
        recordedBy: req.userId
      };

      // Prepare updates
      const updates = {
        paidAmount: newPaidAmount,
        dueAmount: newDueAmount,
        status: newStatus,
        updatedAt: new Date(),
        updatedBy: req.userId
      };

      // Update the Fee record with payment history
      await feesCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: updates,
          $push: { payments: paymentHistoryEntry }
        }
      );

      // Log the payment in paymentsCollection for audit trail
      if (typeof paymentsCollection !== 'undefined') {
        const paymentRecord = {
          organizationId: req.organizationId,
          studentId: fee.studentId,
          feeId: new ObjectId(id),
          amount: paymentAmount,
          method: paymentMethod || "cash",
          date: new Date(),
          createdBy: req.userId,
        };
        await paymentsCollection.insertOne(paymentRecord);
      }

      // Log activity
      await logActivity(
        req.userId,
        req.organizationId,
        "update",
        "fee",
        id,
        { payment: paymentAmount, method: paymentMethod }
      );

      // Return response matching frontend expectations
      res.json({
        success: true,
        message: "Payment recorded successfully",
        updatedStatus: newStatus,
        dueAmount: newDueAmount,
        paidAmount: newPaidAmount,
        data: {
          _id: fee._id,
          studentId: fee.studentId,
          batchId: fee.batchId,
          fees: totalFee,
          paidAmount: newPaidAmount,
          dueAmount: newDueAmount,
          status: newStatus,
          updatedAt: updates.updatedAt
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to record payment",
        error: error.message
      });
    }
  }
);

// Update batch (organization-scoped)
app.patch(
  "/batches/:id",
  ensureDBConnection,
  authenticateUser,
  enforceOrganizationIsolation,
  requirePermission("update_batch"),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid batch ID",
        });
      }

      // Check if batch belongs to organization
      const batch = await batchesCollection.findOne({
        _id: new ObjectId(id),
        organizationId: req.organizationId,
      });

      if (!batch) {
        return res.status(404).json({
          success: false,
          message: "Batch not found",
        });
      }

      const updates = { ...req.body };
      delete updates._id;
      delete updates.organizationId;
      delete updates.createdBy;
      delete updates.createdAt;

      updates.updatedBy = req.userId;
      updates.updatedAt = new Date();

      const result = await batchesCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updates }
      );

      // Log activity
      await logActivity(
        req.userId,
        req.organizationId,
        "update",
        "batch",
        id,
        updates
      );

      res.json({
        success: true,
        message: "Batch updated successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to update batch",
        error: error.message,
      });
    }
  }
);

// Delete batch (organization-scoped)
app.delete(
  "/batches/:id",
  ensureDBConnection,
  authenticateUser,
  enforceOrganizationIsolation,
  requirePermission("delete_batch"),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid batch ID",
        });
      }

      // Check if batch belongs to organization
      const batch = await batchesCollection.findOne({
        _id: new ObjectId(id),
        organizationId: req.organizationId,
      });

      if (!batch) {
        return res.status(404).json({
          success: false,
          message: "Batch not found",
        });
      }

      // Soft delete
      await batchesCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            status: "deleted",
            deletedAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );

      // Update organization batch count
      await organizationsCollection.updateOne(
        { _id: req.organizationId },
        { $inc: { "usage.currentBatches": -1 } }
      );

      // Log activity
      await logActivity(
        req.userId,
        req.organizationId,
        "delete",
        "batch",
        id
      );

      res.json({
        success: true,
        message: "Batch deleted successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to delete batch",
        error: error.message,
      });
    }
  }
);

// ==================== ADMISSIONS API (UPDATED) ====================

// Get all admissions (organization-scoped)
app.get(
  "/admissions",
  ensureDBConnection,
  authenticateUser,
  enforceOrganizationIsolation,
  requirePermission("view_students"),
  async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query;

      const admissions = await admissionsCollection
        .find({
          organizationId: req.organizationId,
          status: { $ne: "deleted" },
        })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .toArray();

      const total = await admissionsCollection.countDocuments({
        organizationId: req.organizationId,
        status: { $ne: "deleted" },
      });

      res.json({
        success: true,
        data: admissions,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch admissions",
        error: error.message,
      });
    }
  }
);

// Create admission (organization-scoped)
app.post(
  "/admissions",
  ensureDBConnection,
  authenticateUser,
  enforceOrganizationIsolation,
  requirePermission("create_student"),
  async (req, res) => {
    try {
      const { name, phone, email, interestedBatchId, status } = req.body;

      // Validation
      if (!name || !phone || !interestedBatchId) {
        return res.status(400).json({
          success: false,
          message: "Name, phone, and interested batch are required",
        });
      }

      const newAdmission = {
        organizationId: req.organizationId,
        name,
        phone,
        email: email || "",
        interestedBatchId: ObjectId.isValid(interestedBatchId)
          ? new ObjectId(interestedBatchId)
          : interestedBatchId,
        status: status || "inquiry",
        followUps: [],
        createdBy: req.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await admissionsCollection.insertOne(newAdmission);

      // Log activity
      await logActivity(
        req.userId,
        req.organizationId,
        "create",
        "admission",
        result.insertedId.toString()
      );

      res.status(201).json({
        success: true,
        message: "Admission created successfully",
        data: {
          insertedId: result.insertedId,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to create admission",
        error: error.message,
      });
    }
  }
);

// Delete admission (organization-scoped)
app.delete(
  "/admissions/:id",
  ensureDBConnection,
  authenticateUser,
  enforceOrganizationIsolation,
  requirePermission("delete_student"),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid admission ID",
        });
      }

      // Check if admission belongs to organization
      const admission = await admissionsCollection.findOne({
        _id: new ObjectId(id),
        organizationId: req.organizationId,
      });

      if (!admission) {
        return res.status(404).json({
          success: false,
          message: "Admission not found",
        });
      }

      // Soft delete
      await admissionsCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            status: "deleted",
            deletedAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );

      // Log activity
      await logActivity(
        req.userId,
        req.organizationId,
        "delete",
        "admission",
        id
      );

      res.json({
        success: true,
        message: "Admission deleted successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to delete admission",
        error: error.message,
      });
    }
  }
);

// Update admission (organization-scoped)
app.patch(
  "/admissions/:id",
  ensureDBConnection,
  authenticateUser,
  enforceOrganizationIsolation,
  requirePermission("update_student"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { followUpNote, followUpDate, followUps, status } = req.body;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid admission ID",
        });
      }

      // Check if admission belongs to organization
      const admission = await admissionsCollection.findOne({
        _id: new ObjectId(id),
        organizationId: req.organizationId,
      });

      if (!admission) {
        return res.status(404).json({
          success: false,
          message: "Admission not found",
        });
      }

      let updateOperation = {};
      const updates = { updatedAt: new Date(), updatedBy: req.userId };

      // Scenario 1: Add Follow-up
      if (followUpNote) {
        // Auto-update status to 'follow-up' if it's currently 'inquiry'
        if (admission.status === "inquiry") {
          updates.status = "follow-up";
        }

        updateOperation = {
          $set: updates,
          $push: {
            followUps: {
              note: followUpNote,
              date: followUpDate ? new Date(followUpDate) : new Date(),
              addedBy: req.userId,
              addedAt: new Date(),
            },
          },
        };
      }
      // Scenario 2: Update Follow-ups (e.g., delete)
      else if (followUps) {
        updates.followUps = followUps;
        updateOperation = { $set: updates };
      }
      // Scenario 3: Update Status
      else if (status) {
        updates.status = status;
        updateOperation = { $set: updates };
      } else {
        // Fallback for other updates
        Object.assign(updates, req.body);
        delete updates._id;
        delete updates.organizationId;
        delete updates.createdAt;
        delete updates.createdBy;
        updateOperation = { $set: updates };
      }

      await admissionsCollection.updateOne(
        { _id: new ObjectId(id) },
        updateOperation
      );

      // Log activity
      await logActivity(
        req.userId,
        req.organizationId,
        "update",
        "admission",
        id,
        req.body
      );

      res.json({
        success: true,
        message: "Admission updated successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to update admission",
        error: error.message,
      });
    }
  }
);

// ==================== FEES API (UPDATED) ====================

// Get all fees (organization-scoped)
app.get(
  "/fees",
  ensureDBConnection,
  authenticateUser,
  enforceOrganizationIsolation,
  requirePermission("view_fees"),
  async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query;

      const fees = await feesCollection
        .find({ organizationId: req.organizationId })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .toArray();

      const total = await feesCollection.countDocuments({
        organizationId: req.organizationId,
      });

      res.json({
        success: true,
        data: fees,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch fees",
        error: error.message,
      });
    }
  }
);

// ==================== ATTENDANCE API (UPDATED) ====================

// Get all attendances (organization-scoped)
app.get(
  "/attendences",
  ensureDBConnection,
  authenticateUser,
  enforceOrganizationIsolation,
  requirePermission("view_attendance"),
  async (req, res) => {
    try {
      const { page = 1, limit = 10, batchId, date } = req.query;

      const query = { organizationId: req.organizationId };
      if (batchId) query.batchId = batchId;
      if (date) query.date = date; // Expecting string format matching frontend

      const attendances = await attendencesCollection
        .find(query)
        .sort({ date: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .toArray();

      const total = await attendencesCollection.countDocuments(query);

      res.json({
        success: true,
        data: attendances,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch attendances",
        error: error.message,
      });
    }
  }
);

// Create or update attendance (organization-scoped)
app.post(
  "/attendences",
  ensureDBConnection,
  authenticateUser,
  enforceOrganizationIsolation,
  requirePermission("manage_attendance"),
  async (req, res) => {
    try {
      const { date, batchId, records, takenBy } = req.body;
      
      if (!date || !batchId || !records) {
        return res.status(400).json({
          success: false,
          message: "Date, batchId, and records are required",
        });
      }

      const attendanceData = {
        date,
        batchId,
        records,
        takenBy,
        organizationId: req.organizationId,
        updatedAt: new Date(),
      };

      // Upsert attendance for this batch and date
      const result = await attendencesCollection.updateOne(
        { date, batchId, organizationId: req.organizationId },
        { 
          $set: attendanceData,
          $setOnInsert: { createdAt: new Date() }
        },
        { upsert: true }
      );

      // Log activity
      await logActivity(
        req.userId,
        req.organizationId,
        result.upsertedCount > 0 ? "create" : "update",
        "attendance",
        (result.upsertedId || result.upsertedId?.toString()) || "existing",
        attendanceData
      );

      res.status(201).json({
        success: true,
        message: "Attendance recorded successfully",
        data: attendanceData,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to record attendance",
        error: error.message,
      });
    }
  }
);

// ==================== EXAMS API (UPDATED) ====================

// Get all exams (organization-scoped)
app.get(
  "/exams",
  ensureDBConnection,
  authenticateUser,
  enforceOrganizationIsolation,
  requirePermission("view_exams"),
  async (req, res) => {
    try {
      const { page = 1, limit = 10, batchId, name } = req.query;
      
      const query = { organizationId: req.organizationId };
      if (batchId) query.batchId = batchId;
      if (name) query.name = { $regex: name, $options: "i" };

      const exams = await examsCollection
        .find(query)
        .sort({ date: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .toArray();

      const total = await examsCollection.countDocuments(query);

      res.json({
        success: true,
        data: exams,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch exams",
        error: error.message,
      });
    }
  }
);

// Create exam (organization-scoped)
app.post(
  "/exams",
  ensureDBConnection,
  authenticateUser,
  enforceOrganizationIsolation,
  requirePermission("manage_exams"),
  async (req, res) => {
    try {
      const exam = req.body;
      exam.organizationId = req.organizationId;
      exam.createdBy = req.userId;
      exam.createdAt = new Date();
      exam.updatedAt = new Date();
      
      if (exam.totalMarks) exam.totalMarks = Number(exam.totalMarks);
      if (exam.date) exam.date = new Date(exam.date);

      const result = await examsCollection.insertOne(exam);

      // Log activity
      await logActivity(
        req.userId,
        req.organizationId,
        "create",
        "exam",
        result.insertedId.toString(),
        exam
      );

      res.status(201).json({
        success: true,
        message: "Exam created successfully",
        data: { ...exam, _id: result.insertedId },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to create exam",
        error: error.message,
      });
    }
  }
);

// Update exam (organization-scoped)
app.patch(
  "/exams/:id",
  ensureDBConnection,
  authenticateUser,
  enforceOrganizationIsolation,
  requirePermission("manage_exams"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      if (updates.totalMarks) updates.totalMarks = Number(updates.totalMarks);
      if (updates.date) updates.date = new Date(updates.date);
      updates.updatedAt = new Date();

      const result = await examsCollection.updateOne(
        { _id: new ObjectId(id), organizationId: req.organizationId },
        { $set: updates }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({
          success: false,
          message: "Exam not found",
        });
      }

      // Log activity
      await logActivity(req.userId, req.organizationId, "update", "exam", id, updates);

      res.json({
        success: true,
        message: "Exam updated successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to update exam",
        error: error.message,
      });
    }
  }
);

// Delete exam (organization-scoped)
// Supports both /exams/:id and /exams?id=... (as used by frontend)
app.delete(
  "/exams",
  ensureDBConnection,
  authenticateUser,
  enforceOrganizationIsolation,
  requirePermission("manage_exams"),
  async (req, res) => {
    try {
      const id = req.query.id;
      if (!id) {
        return res.status(400).json({ success: false, message: "Exam ID is required" });
      }

      // Check if results exist for this exam
      const resultsCount = await resultsCollection.countDocuments({
        examId: id,
        organizationId: req.organizationId,
      });

      if (resultsCount > 0) {
        return res.status(400).json({
          success: false,
          message: "Cannot delete exam because results already exist for it.",
        });
      }

      const result = await examsCollection.deleteOne({
        _id: new ObjectId(id),
        organizationId: req.organizationId,
      });

      if (result.deletedCount === 0) {
        return res.status(404).json({
          success: false,
          message: "Exam not found",
        });
      }

      // Log activity
      await logActivity(req.userId, req.organizationId, "delete", "exam", id);

      res.json({
        success: true,
        message: "Exam deleted successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to delete exam",
        error: error.message,
      });
    }
  }
);

// ==================== RESULTS API (UPDATED) ====================

// Get all results (organization-scoped)
app.get(
  "/results",
  ensureDBConnection,
  authenticateUser,
  enforceOrganizationIsolation,
  requirePermission("view_exams"),
  async (req, res) => {
    try {
      const { page = 1, limit = 10, examId, studentId } = req.query;

      const query = { organizationId: req.organizationId };
      if (examId) query.examId = examId;
      if (studentId) query.studentId = studentId;

      const results = await resultsCollection
        .find(query)
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .toArray();

      const total = await resultsCollection.countDocuments(query);

      res.json({
        success: true,
        data: results,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch results",
        error: error.message,
      });
    }
  }
);

// Create result (organization-scoped)
app.post(
  "/results",
  ensureDBConnection,
  authenticateUser,
  enforceOrganizationIsolation,
  requirePermission("manage_exams"),
  async (req, res) => {
    try {
      const resultData = req.body;
      resultData.organizationId = req.organizationId;
      resultData.createdBy = req.userId;
      resultData.createdAt = new Date();
      resultData.updatedAt = new Date();

      if (resultData.marks) resultData.marks = Number(resultData.marks);

      // Check for existing result for this student and exam
      const existing = await resultsCollection.findOne({
        examId: resultData.examId,
        studentId: resultData.studentId,
        organizationId: req.organizationId,
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: "Result already exists for this student and exam",
        });
      }

      const result = await resultsCollection.insertOne(resultData);

      // Log activity
      await logActivity(
        req.userId,
        req.organizationId,
        "create",
        "result",
        result.insertedId.toString(),
        resultData
      );

      res.status(201).json({
        success: true,
        message: "Result created successfully",
        data: { ...resultData, _id: result.insertedId },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to create result",
        error: error.message,
      });
    }
  }
);

// ==================== EXPENSES API (UPDATED) ====================

// Get all expenses (organization-scoped)
app.get(
  "/expenses",
  ensureDBConnection,
  authenticateUser,
  enforceOrganizationIsolation,
  async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query;

      const expenses = await expensesCollection
        .find({ organizationId: req.organizationId })
        .sort({ date: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .toArray();

      const total = await expensesCollection.countDocuments({
        organizationId: req.organizationId,
      });

      res.json({
        success: true,
        data: expenses,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch expenses",
        error: error.message,
      });
    }
  }
);

// Create expense (organization-scoped)
app.post(
  "/expenses",
  ensureDBConnection,
  authenticateUser,
  enforceOrganizationIsolation,
  async (req, res) => {
    try {
      const expense = req.body;
      expense.organizationId = req.organizationId;
      expense.createdBy = req.userId;
      expense.createdAt = new Date();
      expense.updatedAt = new Date();
      
      // Ensure amount is a number
      if (expense.amount) expense.amount = Number(expense.amount);
      if (expense.date) expense.date = new Date(expense.date);

      const result = await expensesCollection.insertOne(expense);

      // Log activity
      await logActivity(
        req.userId,
        req.organizationId,
        "create",
        "expense",
        result.insertedId.toString(),
        expense
      );

      res.status(201).json({
        success: true,
        message: "Expense created successfully",
        data: { ...expense, _id: result.insertedId },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to create expense",
        error: error.message,
      });
    }
  }
);

// Update expense (organization-scoped)
app.patch(
  "/expenses/:id",
  ensureDBConnection,
  authenticateUser,
  enforceOrganizationIsolation,
  async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Ensure amount is a number if being updated
      if (updates.amount) updates.amount = Number(updates.amount);
      if (updates.date) updates.date = new Date(updates.date);
      
      updates.updatedAt = new Date();

      const result = await expensesCollection.updateOne(
        { _id: new ObjectId(id), organizationId: req.organizationId },
        { $set: updates }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({
          success: false,
          message: "Expense not found",
        });
      }

      // Log activity
      await logActivity(
        req.userId,
        req.organizationId,
        "update",
        "expense",
        id,
        updates
      );

      res.json({
        success: true,
        message: "Expense updated successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to update expense",
        error: error.message,
      });
    }
  }
);

// Delete expense (organization-scoped)
app.delete(
  "/expenses/:id",
  ensureDBConnection,
  authenticateUser,
  enforceOrganizationIsolation,
  async (req, res) => {
    try {
      const { id } = req.params;

      const result = await expensesCollection.deleteOne({
        _id: new ObjectId(id),
        organizationId: req.organizationId,
      });

      if (result.deletedCount === 0) {
        return res.status(404).json({
          success: false,
          message: "Expense not found",
        });
      }

      // Log activity
      await logActivity(
        req.userId,
        req.organizationId,
        "delete",
        "expense",
        id
      );

      res.json({
        success: true,
        message: "Expense deleted successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to delete expense",
        error: error.message,
      });
    }
  }
);

// ==================== SERVER START ====================

// Start server only in non-Vercel environment
if (process.env.NODE_ENV !== "production") {
  app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
  });
}

// Export for Vercel serverless functions
export default app;
