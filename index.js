import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ServerApiVersion, ObjectId } from "mongodb";
import logger from "./utils/logger.js";

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
// const uri = `mongodb+srv://${user}:${pass}@cluster0.l2cobj0.mongodb.net/rootxCMS?appName=Cluster0`;
// const uri = "mongodb+srv://rootxsoftwares_db_user:voPN1VTLymeQafA3@saas.rt8bii9.mongodb.net/coachingsaasrtx";
// mongodb database from rootxmanagement@gmail.com 
const uri = "mongodb+srv://rootx_coaching_management_db:G86XRd3YtnlHEqkk@cluster0.izyiyn6.mongodb.net/?appName=Cluster0"

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
let platformSettingsCollection;
let subscriptionRequestsCollection;
let reactivationRequestsCollection;

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
    platformSettingsCollection = db.collection("platform_settings");
    subscriptionRequestsCollection = db.collection("subscription_requests");
    reactivationRequestsCollection = db.collection("reactivation_requests");

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
    logger.info("✅ Connected to MongoDB");

    // Create indexes
    await createIndexes();
  } catch (err) {
    logger.error("❌ MongoDB connection error:", { error: err.message, stack: err.stack });
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

    // Platform Settings indexes (Super Admin)
    await platformSettingsCollection.createIndex({ key: 1 }, { unique: true });
    await platformSettingsCollection.createIndex({ category: 1 });

    // Additional Super Admin indexes
    await organizationsCollection.createIndex({ createdAt: -1 });
    await organizationsCollection.createIndex({ status: 1 });
    await usersCollection.createIndex({ isSuperAdmin: 1 });
    await activityLogsCollection.createIndex({ createdAt: -1 });
    await activityLogsCollection.createIndex({ action: 1 });
    await paymentsCollection.createIndex({ paymentDate: -1 });

    // Subscription Requests indexes (Approval Workflow)
    await subscriptionRequestsCollection.createIndex({ organizationId: 1 });
    await subscriptionRequestsCollection.createIndex({ status: 1 });
    await subscriptionRequestsCollection.createIndex({ createdAt: -1 });
    await subscriptionRequestsCollection.createIndex({ status: 1, createdAt: -1 });

    // Reactivation Requests indexes
    await reactivationRequestsCollection.createIndex({ organizationId: 1 });
    await reactivationRequestsCollection.createIndex({ status: 1 });
    await reactivationRequestsCollection.createIndex({ createdAt: -1 });
    await reactivationRequestsCollection.createIndex({ status: 1, createdAt: -1 });

    logger.info("✅ Indexes created successfully");
  } catch (error) {
    logger.error("⚠️  Error creating indexes:", { error: error.message });
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
  if (req.userRole === "super_admin" || req.user?.isSuperAdmin) {
    req.isSuperAdmin = true;
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

// Check if organization is suspended
const checkOrganizationSuspension = async (req, res, next) => {
  try {
    // Skip for super admins
    if (req.isSuperAdmin || req.userRole === "super_admin") {
      return next();
    }

    // Skip if no organization context
    if (!req.organizationId) {
      return next();
    }

    // Check organization status
    const organization = await organizationsCollection.findOne({
      _id: req.organizationId
    });

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found"
      });
    }

    // Block access if organization is suspended
    if (organization.status === "suspended") {
      return res.status(403).json({
        success: false,
        suspended: true,
        message: "Your organization has been suspended. Please contact support.",
        suspensionData: {
          reason: organization.suspensionReason || "No reason provided",
          suspendedAt: organization.suspendedAt,
          organizationName: organization.name
        }
      });
    }

    next();
  } catch (error) {
    logger.error("Error checking organization suspension:", { error: error.message });
    return res.status(500).json({
      success: false,
      message: "Error checking organization status"
    });
  }
};

// Super Admin verification middleware
const requireSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  if (req.user.role !== "super_admin" && !req.user.isSuperAdmin) {
    return res.status(403).json({
      success: false,
      message: "Super admin access required",
    });
  }

  // Super admins bypass organization isolation
  req.isSuperAdmin = true;
  next();
};

// Log activity for super admin actions
async function logSuperAdminActivity(userId, action, resource, resourceId, targetOrgId = null, changes = null, req = null) {
  try {
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

    await activityLogsCollection.insertOne({
      organizationId: targetOrgId ? new ObjectId(targetOrgId) : null,
      userId: new ObjectId(userId),
      userName: user?.name || "Super Admin",
      action: `super_admin_${action}`,
      resource,
      resourceId,
      changes,
      ipAddress: req?.ip || req?.headers?.['x-forwarded-for'] || null,
      userAgent: req?.headers?.['user-agent'] || null,
      isSuperAdminAction: true,
      createdAt: new Date(),
    });
  } catch (error) {
    logger.error("Error logging super admin activity:", { error: error.message });
  }
}

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
    logger.error("Error logging activity:", { error: error.message });
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
    logger.error("Error creating organization:", { error: error.message, stack: error.stack });
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

// ==================== ORGANIZATION REACTIVATION REQUESTS API ====================

// Create reactivation request (for suspended organizations)
app.post(
  "/organizations/reactivation-request",
  ensureDBConnection,
  authenticateUser,
  enforceOrganizationIsolation,
  // NOTE: DO NOT add checkOrganizationSuspension here - we need suspended orgs to access this
  async (req, res) => {
    try {
      const { requestMessage } = req.body;

      // Get organization
      const organization = await organizationsCollection.findOne({
        _id: req.organizationId
      });

      if (!organization) {
        return res.status(404).json({
          success: false,
          message: "Organization not found"
        });
      }

      // Check if organization is actually suspended
      if (organization.status !== "suspended") {
        return res.status(400).json({
          success: false,
          message: "Your organization is not suspended"
        });
      }

      // Check for existing pending request
      const existingRequest = await reactivationRequestsCollection.findOne({
        organizationId: req.organizationId,
        status: "pending"
      });

      if (existingRequest) {
        return res.status(400).json({
          success: false,
          message: "You already have a pending reactivation request",
          existingRequestId: existingRequest._id
        });
      }

      // Get user info
      const user = await usersCollection.findOne({
        _id: new ObjectId(req.userId)
      });

      // Create reactivation request
      const request = {
        organizationId: req.organizationId,
        organizationName: organization.name,
        requestedBy: new ObjectId(req.userId),
        requestedByName: user?.name || "Unknown",
        requestedByEmail: user?.email || "",
        requestMessage: requestMessage || "Please reactivate our organization account.",
        status: "pending",
        suspensionReason: organization.suspensionReason || "Unknown",
        suspendedAt: organization.suspendedAt,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await reactivationRequestsCollection.insertOne(request);

      // Update organization with pending request reference
      await organizationsCollection.updateOne(
        { _id: req.organizationId },
        {
          $set: {
            pendingReactivationRequest: result.insertedId,
            updatedAt: new Date()
          }
        }
      );

      res.json({
        success: true,
        message: "Your reactivation request has been submitted. An administrator will review it shortly.",
        data: {
          requestId: result.insertedId,
          status: "pending"
        }
      });
    } catch (error) {
      logger.error("Reactivation request error:", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to submit reactivation request",
        error: error.message
      });
    }
  }
);

// Get organization's pending reactivation request
app.get(
  "/organizations/reactivation-request/pending",
  ensureDBConnection,
  authenticateUser,
  enforceOrganizationIsolation,
  // NOTE: DO NOT add checkOrganizationSuspension here - suspended orgs need to check their requests
  async (req, res) => {
    try {
      const pendingRequest = await reactivationRequestsCollection.findOne({
        organizationId: req.organizationId,
        status: "pending"
      });

      res.json({
        success: true,
        data: pendingRequest || null
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch request",
        error: error.message
      });
    }
  }
);

// Cancel pending reactivation request
app.delete(
  "/organizations/reactivation-request/:requestId",
  ensureDBConnection,
  authenticateUser,
  enforceOrganizationIsolation,
  // NOTE: DO NOT add checkOrganizationSuspension here - suspended orgs need to cancel requests
  async (req, res) => {
    try {
      const { requestId } = req.params;

      const request = await reactivationRequestsCollection.findOne({
        _id: new ObjectId(requestId),
        organizationId: req.organizationId,
        status: "pending"
      });

      if (!request) {
        return res.status(404).json({
          success: false,
          message: "Pending request not found"
        });
      }

      await reactivationRequestsCollection.deleteOne({
        _id: new ObjectId(requestId)
      });

      await organizationsCollection.updateOne(
        { _id: req.organizationId },
        {
          $unset: { pendingReactivationRequest: "" },
          $set: { updatedAt: new Date() }
        }
      );

      res.json({
        success: true,
        message: "Reactivation request cancelled"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to cancel request",
        error: error.message
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

      // First, try to find a subscription document
      let subscription = await subscriptionsCollection.findOne({
        organizationId: new ObjectId(organizationId),
      });

      // If no subscription document exists, create one from organization data
      if (!subscription) {
        const organization = await organizationsCollection.findOne({
          _id: new ObjectId(organizationId),
        });

        if (!organization) {
          return res.status(404).json({
            success: false,
            message: "Organization not found",
            data: null,
          });
        }

        // Build subscription from organization data
        subscription = {
          _id: new ObjectId(),
          organizationId: organization._id,
          tier: organization.subscriptionTier || "free",
          status: organization.subscriptionStatus || "active",
          amount: 0,
          billingCycle: "monthly",
          nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          createdAt: organization.createdAt,
          updatedAt: organization.updatedAt,
        };
      }

      res.json({
        success: true,
        data: subscription,
      });
    } catch (error) {
      logger.error("Error fetching subscription:", { error: error.message });
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
  async (req, res) => {
    try {
      // Return empty array if no organizationId (don't require organization isolation)
      if (!req.organizationId) {
        return res.json({
          success: true,
          data: [],
        });
      }

      // Convert to ObjectId safely
      let orgId;
      try {
        orgId = typeof req.organizationId === 'string'
          ? new ObjectId(req.organizationId)
          : req.organizationId;
      } catch (e) {
        // Invalid ObjectId format, return empty
        return res.json({
          success: true,
          data: [],
        });
      }

      const payments = await paymentsCollection
        .find({ organizationId: orgId })
        .sort({ paymentDate: -1, createdAt: -1 })
        .limit(50)
        .toArray();

      // Format payments for frontend
      const formattedPayments = payments.map((payment) => ({
        _id: payment._id,
        invoiceNumber: payment.invoiceNumber || payment.transactionId || `INV-${payment._id.toString().slice(-8)}`,
        date: payment.paymentDate || payment.createdAt,
        amount: payment.amount || 0,
        status: payment.status || "paid",
        method: payment.paymentMethod || "N/A",
        currency: payment.currency || "BDT",
        notes: payment.notes,
      }));

      res.json({
        success: true,
        data: formattedPayments,
      });
    } catch (error) {
      logger.error("Error in /subscriptions/payments:", { error: error.message });
      // Always return success with empty array to prevent UI crashes
      res.json({
        success: true,
        data: [],
      });
    }
  }
);

// Request subscription upgrade/downgrade (requires admin approval)
app.post(
  "/subscriptions/upgrade",
  ensureDBConnection,
  authenticateUser,
  enforceOrganizationIsolation,
  checkOrganizationSuspension,
  async (req, res) => {
    try {
      const { planId, billingCycle } = req.body;

      if (!planId) {
        return res.status(400).json({
          success: false,
          message: "Plan selection is required",
        });
      }

      // Check for existing pending request
      const existingRequest = await subscriptionRequestsCollection.findOne({
        organizationId: req.organizationId,
        status: "pending"
      });

      if (existingRequest) {
        return res.status(400).json({
          success: false,
          message: "You already have a pending subscription request. Please wait for admin approval or cancel the existing request.",
          existingRequestId: existingRequest._id
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

      // Get current subscription
      const currentSubscription = await subscriptionsCollection.findOne({
        organizationId: req.organizationId
      });

      // Get organization details
      const organization = await organizationsCollection.findOne({
        _id: req.organizationId
      });

      // Get user details
      const user = await usersCollection.findOne({
        _id: new ObjectId(req.userId)
      });

      const amount = billingCycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;

      // Determine request type (upgrade or downgrade)
      const tierOrder = { free: 0, basic: 1, professional: 2, enterprise: 3 };
      const currentTierIndex = tierOrder[currentSubscription?.tier || "free"] || 0;
      const newTierIndex = tierOrder[plan.tier] || 0;
      const requestType = newTierIndex > currentTierIndex ? "upgrade" : "downgrade";

      // Create approval request
      const request = {
        organizationId: req.organizationId,
        requestedBy: new ObjectId(req.userId),
        requestedByName: user?.name || "Unknown",
        requestedByEmail: user?.email || "",

        requestType,

        currentPlanId: currentSubscription?.planId || null,
        currentTier: currentSubscription?.tier || "free",
        currentBillingCycle: currentSubscription?.billingCycle || "monthly",
        currentAmount: currentSubscription?.amount || 0,

        requestedPlanId: plan._id,
        requestedTier: plan.tier,
        requestedBillingCycle: billingCycle || "monthly",
        requestedAmount: amount,

        status: "pending",

        organizationName: organization?.name || "Unknown Organization",

        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await subscriptionRequestsCollection.insertOne(request);

      // Update organization with pending request reference
      await organizationsCollection.updateOne(
        { _id: req.organizationId },
        {
          $set: {
            pendingSubscriptionRequest: result.insertedId,
            updatedAt: new Date()
          }
        }
      );

      // Log activity
      await logActivity(
        req.userId,
        req.organizationId,
        "subscription_request_created",
        "subscription_request",
        result.insertedId.toString()
      );

      res.json({
        success: true,
        message: `Your ${requestType} request to ${plan.name} plan has been submitted for approval. You will be notified once it's processed.`,
        data: {
          requestId: result.insertedId,
          status: "pending",
          requestType,
          requestedPlan: plan.name,
          requestedTier: plan.tier
        }
      });
    } catch (error) {
      logger.error("Subscription request error:", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to submit subscription request",
        error: error.message,
      });
    }
  }
);

// Get organization's pending subscription request
app.get(
  "/subscriptions/cancel",
  ensureDBConnection,
  authenticateUser,
  enforceOrganizationIsolation,
  checkOrganizationSuspension,
  async (req, res) => {
    try {
      const pendingRequest = await subscriptionRequestsCollection.findOne({
        organizationId: req.organizationId,
        status: "pending"
      });

      // If there's a pending request, get the plan details
      let requestWithPlanDetails = null;
      if (pendingRequest) {
        const requestedPlan = await subscriptionPlansCollection.findOne({
          _id: pendingRequest.requestedPlanId
        });

        requestWithPlanDetails = {
          ...pendingRequest,
          requestedPlanName: requestedPlan?.name || "Unknown Plan"
        };
      }

      res.json({
        success: true,
        data: requestWithPlanDetails
      });
    } catch (error) {
      logger.error("Error fetching pending request:", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch pending request",
        error: error.message,
      });
    }
  }
);

// Get organization's subscription request history
app.get(
  "/subscriptions/billing-history",
  ensureDBConnection,
  authenticateUser,
  enforceOrganizationIsolation,
  checkOrganizationSuspension,
  checkOrganizationSuspension,
  async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const requests = await subscriptionRequestsCollection
        .find({ organizationId: req.organizationId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .toArray();

      const total = await subscriptionRequestsCollection.countDocuments({
        organizationId: req.organizationId
      });

      res.json({
        success: true,
        data: {
          requests,
          pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / parseInt(limit))
          }
        }
      });
    } catch (error) {
      logger.error("Error fetching request history:", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch request history",
        error: error.message,
      });
    }
  }
);

// Cancel a pending subscription request
app.delete(
  "/subscriptions/requests/:requestId",
  ensureDBConnection,
  authenticateUser,
  enforceOrganizationIsolation,
  checkOrganizationSuspension,
  async (req, res) => {
    try {
      const { requestId } = req.params;

      // Find the request and verify it belongs to this organization
      const request = await subscriptionRequestsCollection.findOne({
        _id: new ObjectId(requestId),
        organizationId: req.organizationId,
        status: "pending"
      });

      if (!request) {
        return res.status(404).json({
          success: false,
          message: "Pending request not found or already processed",
        });
      }

      // Delete the request
      await subscriptionRequestsCollection.deleteOne({
        _id: new ObjectId(requestId)
      });

      // Clear pending request reference from organization
      await organizationsCollection.updateOne(
        { _id: req.organizationId },
        {
          $unset: { pendingSubscriptionRequest: "" },
          $set: { updatedAt: new Date() }
        }
      );

      // Log activity
      await logActivity(
        req.userId,
        req.organizationId,
        "subscription_request_cancelled",
        "subscription_request",
        requestId
      );

      res.json({
        success: true,
        message: "Subscription request cancelled successfully"
      });
    } catch (error) {
      logger.error("Error cancelling request:", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to cancel request",
        error: error.message,
      });
    }
  }
);

// Get subscription details (Generic route - must be below specific routes)
app.get(
  "/subscriptions/:id",
  ensureDBConnection,
  authenticateUser,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Validate ObjectId to prevent crashes on routes like /subscriptions/payments
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid subscription ID format",
        });
      }

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
        req.organizationId &&
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
      logger.error("Error in GET /subscriptions/:id:", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch subscription",
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
      logger.error("Registration error:", { error: error.message, stack: error.stack });
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
  checkOrganizationSuspension,
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
  checkOrganizationSuspension,
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
  checkOrganizationSuspension,
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
  checkOrganizationSuspension,
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
  checkOrganizationSuspension,
  requirePermission("view_students"),
  async (req, res) => {
    try {
      const { email, batchId, status, page = 1, limit = 10 } = req.query;

      const query = { organizationId: req.organizationId };

      if (email) {
        query.email = { $regex: email, $options: "i" };
      }
      if (batchId) {
        query.batchId = batchId;
      }
      if (status) {
        query.status = status;
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
  checkOrganizationSuspension,
  checkOrganizationSuspension,
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
  checkOrganizationSuspension,
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
  checkOrganizationSuspension,
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
  checkOrganizationSuspension,
  requirePermission("view_batches"),
  async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query;

      const query = {
        organizationId: req.organizationId,
        status: { $ne: "deleted" },
      };

      const batches = await batchesCollection
        .find(query)
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .toArray();

      const total = await batchesCollection.countDocuments(query);

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
  checkOrganizationSuspension,
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
  checkOrganizationSuspension,
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
  checkOrganizationSuspension,
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
  checkOrganizationSuspension,
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

// Get single batch by ID (organization-scoped)
app.get(
  "/batches/:id",
  ensureDBConnection,
  authenticateUser,
  enforceOrganizationIsolation,
  checkOrganizationSuspension,
  requirePermission("view_batches"),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid batch ID",
        });
      }

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

      res.json({
        success: true,
        data: batch,
      });
    } catch (error) {
      logger.error("Failed to fetch batch", {
        error: error.message,
        stack: error.stack,
      });
      res.status(500).json({
        success: false,
        message: "Failed to fetch batch",
        error: error.message,
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
  checkOrganizationSuspension,
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
  checkOrganizationSuspension,
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

      const deletedCounts = {
        students: 0,
        fees: 0,
        results: 0,
        exams: 0,
        attendance: 0,
      };

      // 1. Find all students in this batch
      const students = await studentsCollection
        .find({
          batchId: id,
          organizationId: req.organizationId,
        })
        .toArray();

      const studentIds = students.map((s) => s._id.toString());

      // 2. Delete fee records for these students
      if (studentIds.length > 0) {
        const feesResult = await feesCollection.deleteMany({
          studentId: { $in: studentIds },
          organizationId: req.organizationId,
        });
        deletedCounts.fees = feesResult.deletedCount;

        // 3. Delete result records for these students
        const studentResultsResult = await resultsCollection.deleteMany({
          studentId: { $in: studentIds },
          organizationId: req.organizationId,
        });
        deletedCounts.results = studentResultsResult.deletedCount;
      }

      // 4. Find all exams for this batch and delete their results
      const exams = await examsCollection
        .find({
          batchId: id,
          organizationId: req.organizationId,
        })
        .toArray();

      const examIds = exams.map((e) => e._id.toString());

      if (examIds.length > 0) {
        const examResultsResult = await resultsCollection.deleteMany({
          examId: { $in: examIds },
          organizationId: req.organizationId,
        });
        // Add to results count (avoid double-counting already deleted)
        deletedCounts.results += examResultsResult.deletedCount;
      }

      // 5. Delete all exams for this batch
      const examsResult = await examsCollection.deleteMany({
        batchId: id,
        organizationId: req.organizationId,
      });
      deletedCounts.exams = examsResult.deletedCount;

      // 6. Delete all attendance records for this batch
      const attendanceResult = await attendencesCollection.deleteMany({
        batchId: id,
        organizationId: req.organizationId,
      });
      deletedCounts.attendance = attendanceResult.deletedCount;

      // 7. Soft delete all students in this batch
      const activeStudents = students.filter(
        (s) => s.status !== "deleted"
      );
      if (students.length > 0) {
        await studentsCollection.updateMany(
          {
            batchId: id,
            organizationId: req.organizationId,
          },
          {
            $set: {
              status: "deleted",
              deletedAt: new Date(),
              updatedAt: new Date(),
            },
          }
        );
        deletedCounts.students = activeStudents.length;
      }

      // 8. Decrement usage.currentStudents by the number of active students
      if (activeStudents.length > 0) {
        await organizationsCollection.updateOne(
          { _id: req.organizationId },
          { $inc: { "usage.currentStudents": -activeStudents.length } }
        );
      }

      // 9. Soft delete the batch
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

      // 10. Decrement usage.currentBatches
      await organizationsCollection.updateOne(
        { _id: req.organizationId },
        { $inc: { "usage.currentBatches": -1 } }
      );

      // 11. Log activity with cascade details
      await logActivity(
        req.userId,
        req.organizationId,
        "delete",
        "batch",
        id,
        { cascadeDeleted: deletedCounts }
      );

      res.json({
        success: true,
        message: "Batch and all related data deleted successfully",
        deletedCounts,
      });
    } catch (error) {
      logger.error("Failed to delete batch", {
        error: error.message,
        stack: error.stack,
      });
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
  checkOrganizationSuspension,
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
  checkOrganizationSuspension,
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
  checkOrganizationSuspension,
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
  checkOrganizationSuspension,
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
  checkOrganizationSuspension,
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
  checkOrganizationSuspension,
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
  checkOrganizationSuspension,
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
  checkOrganizationSuspension,
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
  checkOrganizationSuspension,
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
  checkOrganizationSuspension,
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
  checkOrganizationSuspension,
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
  checkOrganizationSuspension,
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
  checkOrganizationSuspension,
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
  checkOrganizationSuspension,
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
  checkOrganizationSuspension,
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
  checkOrganizationSuspension,
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
  checkOrganizationSuspension,
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

// ==================== SUPER ADMIN API ROUTES ====================

// ==================== SUPER ADMIN: DASHBOARD ====================

// Get platform statistics
app.get(
  "/super-admin/dashboard/stats",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { period = "30days" } = req.query;

      // Calculate date range
      let startDate = new Date();
      switch (period) {
        case "7days":
          startDate.setDate(startDate.getDate() - 7);
          break;
        case "30days":
          startDate.setDate(startDate.getDate() - 30);
          break;
        case "90days":
          startDate.setDate(startDate.getDate() - 90);
          break;
        case "12months":
          startDate.setMonth(startDate.getMonth() - 12);
          break;
        default:
          startDate.setDate(startDate.getDate() - 30);
      }

      // Organizations stats
      const totalOrgs = await organizationsCollection.countDocuments({
        status: { $ne: "deleted" },
      });
      const newOrgs = await organizationsCollection.countDocuments({
        createdAt: { $gte: startDate },
        status: { $ne: "deleted" },
      });
      const activeOrgs = await organizationsCollection.countDocuments({
        status: "active",
      });
      const trialOrgs = await organizationsCollection.countDocuments({
        subscriptionStatus: "trial",
      });
      const suspendedOrgs = await organizationsCollection.countDocuments({
        status: "suspended",
      });

      // Users stats
      const totalUsers = await usersCollection.countDocuments({});
      const newUsers = await usersCollection.countDocuments({
        createdAt: { $gte: startDate },
      });
      const activeUsers = await usersCollection.countDocuments({
        status: "active",
      });

      // Subscriptions stats
      const subscriptionStats = await subscriptionsCollection
        .aggregate([
          {
            $group: {
              _id: "$tier",
              count: { $sum: 1 },
            },
          },
        ])
        .toArray();

      const byTier = {};
      subscriptionStats.forEach((s) => {
        byTier[s._id] = s.count;
      });

      const totalSubs = await subscriptionsCollection.countDocuments({});
      const activeSubs = await subscriptionsCollection.countDocuments({
        status: "active",
      });
      const trialSubs = await subscriptionsCollection.countDocuments({
        status: "trial",
      });

      // Revenue stats (MRR from active monthly subscriptions)
      const mrrResult = await subscriptionsCollection
        .aggregate([
          {
            $match: {
              status: "active",
              billingCycle: "monthly",
            },
          },
          {
            $group: {
              _id: null,
              mrr: { $sum: "$amount" },
            },
          },
        ])
        .toArray();

      const mrr = mrrResult[0]?.mrr || 0;

      // Total revenue from payments
      const revenueResult = await paymentsCollection
        .aggregate([
          {
            $match: {
              status: "completed",
            },
          },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: "$amount" },
            },
          },
        ])
        .toArray();

      const totalRevenue = revenueResult[0]?.totalRevenue || 0;

      // Previous period revenue for growth calculation
      const prevPeriodStart = new Date(startDate);
      prevPeriodStart.setTime(prevPeriodStart.getTime() - (new Date() - startDate));

      const prevRevenueResult = await paymentsCollection
        .aggregate([
          {
            $match: {
              status: "completed",
              paymentDate: { $gte: prevPeriodStart, $lt: startDate },
            },
          },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: "$amount" },
            },
          },
        ])
        .toArray();

      const prevRevenue = prevRevenueResult[0]?.totalRevenue || 0;
      const growth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;

      // Students stats
      const totalStudents = await studentsCollection.countDocuments({
        status: "active",
      });

      res.json({
        success: true,
        data: {
          organizations: {
            total: totalOrgs,
            new: newOrgs,
            active: activeOrgs,
            trial: trialOrgs,
            suspended: suspendedOrgs,
          },
          users: {
            total: totalUsers,
            new: newUsers,
            active: activeUsers,
          },
          subscriptions: {
            total: totalSubs,
            active: activeSubs,
            trial: trialSubs,
            byTier,
          },
          revenue: {
            mrr,
            totalRevenue,
            growth: parseFloat(growth.toFixed(2)),
          },
          students: {
            total: totalStudents,
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch dashboard stats",
        error: error.message,
      });
    }
  }
);

// Get revenue trend data
app.get(
  "/super-admin/dashboard/revenue-trend",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { period = "6months" } = req.query;

      let months = 6;
      switch (period) {
        case "3months":
          months = 3;
          break;
        case "6months":
          months = 6;
          break;
        case "12months":
          months = 12;
          break;
        default:
          months = 6;
      }

      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      const revenueTrend = await paymentsCollection
        .aggregate([
          {
            $match: {
              status: "completed",
              paymentDate: { $gte: startDate },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m", date: "$paymentDate" },
              },
              revenue: { $sum: "$amount" },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ])
        .toArray();

      // Calculate MRR per month from subscriptions
      const mrrTrend = await subscriptionsCollection
        .aggregate([
          {
            $match: {
              status: "active",
              billingCycle: "monthly",
              createdAt: { $lte: new Date() },
            },
          },
          {
            $group: {
              _id: null,
              mrr: { $sum: "$amount" },
            },
          },
        ])
        .toArray();

      const currentMrr = mrrTrend[0]?.mrr || 0;

      // Format the data
      const data = revenueTrend.map((item) => ({
        month: item._id,
        revenue: item.revenue,
        mrr: currentMrr, // Simplified: using current MRR for all months
      }));

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch revenue trend",
        error: error.message,
      });
    }
  }
);

// Get recent organizations
app.get(
  "/super-admin/dashboard/recent-organizations",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { limit = 5 } = req.query;

      const organizations = await organizationsCollection
        .aggregate([
          {
            $match: {
              status: { $ne: "deleted" },
            },
          },
          { $sort: { createdAt: -1 } },
          { $limit: parseInt(limit) },
          {
            $lookup: {
              from: "users",
              localField: "ownerId",
              foreignField: "_id",
              as: "ownerData",
            },
          },
          { $unwind: { path: "$ownerData", preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 1,
              name: 1,
              slug: 1,
              email: 1,
              subscriptionTier: 1,
              subscriptionStatus: 1,
              status: 1,
              createdAt: 1,
              owner: {
                _id: "$ownerData._id",
                name: "$ownerData.name",
                email: "$ownerData.email",
              },
            },
          },
        ])
        .toArray();

      res.json({
        success: true,
        data: organizations,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch recent organizations",
        error: error.message,
      });
    }
  }
);

// Get activity feed
app.get(
  "/super-admin/dashboard/activity-feed",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { limit = 10 } = req.query;

      const activities = await activityLogsCollection
        .aggregate([
          { $sort: { createdAt: -1 } },
          { $limit: parseInt(limit) },
          {
            $lookup: {
              from: "organizations",
              localField: "organizationId",
              foreignField: "_id",
              as: "orgData",
            },
          },
          { $unwind: { path: "$orgData", preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 1,
              userName: 1,
              organizationName: "$orgData.name",
              action: 1,
              resource: 1,
              resourceId: 1,
              createdAt: 1,
            },
          },
        ])
        .toArray();

      res.json({
        success: true,
        data: activities,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch activity feed",
        error: error.message,
      });
    }
  }
);

// ==================== SUPER ADMIN: ORGANIZATIONS ====================

// List all organizations
app.get(
  "/super-admin/organizations",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        search = "",
        status = "",
        tier = "",
        sortBy = "createdAt",
        order = "desc",
      } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Build query
      const query = { status: { $ne: "deleted" } };

      if (search) {
        query.$or = [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { slug: { $regex: search, $options: "i" } },
        ];
      }

      if (status) {
        query.status = status;
      }

      if (tier) {
        query.subscriptionTier = tier;
      }

      // Sort options
      const sortOptions = {};
      sortOptions[sortBy] = order === "desc" ? -1 : 1;

      const total = await organizationsCollection.countDocuments(query);

      const organizations = await organizationsCollection
        .aggregate([
          { $match: query },
          { $sort: sortOptions },
          { $skip: skip },
          { $limit: parseInt(limit) },
          {
            $lookup: {
              from: "users",
              localField: "ownerId",
              foreignField: "_id",
              as: "ownerData",
            },
          },
          { $unwind: { path: "$ownerData", preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: "users",
              localField: "_id",
              foreignField: "organizationId",
              as: "orgUsers",
            },
          },
          {
            $project: {
              _id: 1,
              name: 1,
              slug: 1,
              logo: 1,
              email: 1,
              phone: 1,
              subscriptionTier: 1,
              subscriptionStatus: 1,
              status: 1,
              usage: 1,
              limits: 1,
              createdAt: 1,
              updatedAt: 1,
              owner: {
                _id: "$ownerData._id",
                name: "$ownerData.name",
                email: "$ownerData.email",
                photoURL: "$ownerData.photoURL",
              },
              userCount: { $size: "$orgUsers" },
            },
          },
        ])
        .toArray();

      res.json({
        success: true,
        data: {
          organizations,
          pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / parseInt(limit)),
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch organizations",
        error: error.message,
      });
    }
  }
);

// Get single organization details
app.get(
  "/super-admin/organizations/:orgId",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { orgId } = req.params;

      const organization = await organizationsCollection
        .aggregate([
          { $match: { _id: new ObjectId(orgId) } },
          {
            $lookup: {
              from: "users",
              localField: "ownerId",
              foreignField: "_id",
              as: "ownerData",
            },
          },
          { $unwind: { path: "$ownerData", preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: "subscriptions",
              localField: "_id",
              foreignField: "organizationId",
              as: "subscription",
            },
          },
          { $unwind: { path: "$subscription", preserveNullAndEmptyArrays: true } },
        ])
        .toArray();

      if (!organization || organization.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Organization not found",
        });
      }

      const org = organization[0];
      org.owner = {
        _id: org.ownerData?._id,
        name: org.ownerData?.name,
        email: org.ownerData?.email,
      };
      delete org.ownerData;

      // Get organization stats
      const totalUsers = await usersCollection.countDocuments({
        organizationId: new ObjectId(orgId),
      });

      const totalStudents = await studentsCollection.countDocuments({
        organizationId: new ObjectId(orgId),
      });

      const totalBatches = await batchesCollection.countDocuments({
        organizationId: new ObjectId(orgId),
      });

      org.stats = {
        totalUsers,
        totalStudents,
        totalBatches,
      };

      res.json({
        success: true,
        data: org,
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

// Create organization (Super Admin)
app.post(
  "/super-admin/organizations",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const {
        name,
        slug,
        email,
        phone,
        address,
        ownerId,
        subscriptionTier = "free",
        status = "active",
      } = req.body;

      // Validation
      if (!name || !slug || !email) {
        return res.status(400).json({
          success: false,
          message: "Name, slug, and email are required",
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

      // Get plan limits
      const plan = await subscriptionPlansCollection.findOne({ tier: subscriptionTier });
      const limits = plan?.limits || {
        maxStudents: 50,
        maxBatches: 3,
        maxStaff: 2,
        maxStorage: 100,
        features: ["students", "batches", "basic_reports"],
      };

      // Create organization
      const organization = {
        name,
        slug,
        logo: "",
        email,
        phone: phone || "",
        address: address || {},
        subscriptionStatus: subscriptionTier === "free" ? "trial" : "active",
        subscriptionTier,
        limits,
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
        ownerId: ownerId ? new ObjectId(ownerId) : null,
        status,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await organizationsCollection.insertOne(organization);

      // Create subscription
      const subscription = {
        organizationId: result.insertedId,
        tier: subscriptionTier,
        status: subscriptionTier === "free" ? "trial" : "active",
        billingCycle: "monthly",
        amount: plan?.monthlyPrice || 0,
        currency: "BDT",
        trialStartDate: new Date(),
        trialEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        isTrialUsed: true,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        cancelAtPeriodEnd: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await subscriptionsCollection.insertOne(subscription);

      // Update owner's organizationId if provided
      if (ownerId) {
        await usersCollection.updateOne(
          { _id: new ObjectId(ownerId) },
          {
            $set: {
              organizationId: result.insertedId,
              role: "org_owner",
              updatedAt: new Date(),
            },
          }
        );
      }

      // Log activity
      await logSuperAdminActivity(
        req.userId,
        "created",
        "organization",
        result.insertedId.toString(),
        result.insertedId.toString(),
        { name, slug, email, subscriptionTier },
        req
      );

      res.status(201).json({
        success: true,
        message: "Organization created successfully",
        data: {
          organizationId: result.insertedId,
          slug,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to create organization",
        error: error.message,
      });
    }
  }
);

// Update organization
app.patch(
  "/super-admin/organizations/:orgId",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { orgId } = req.params;
      const updates = req.body;

      // Get current organization for logging
      const currentOrg = await organizationsCollection.findOne({
        _id: new ObjectId(orgId),
      });

      if (!currentOrg) {
        return res.status(404).json({
          success: false,
          message: "Organization not found",
        });
      }

      // Remove fields that shouldn't be updated directly
      delete updates._id;
      delete updates.createdAt;

      updates.updatedAt = new Date();

      await organizationsCollection.updateOne(
        { _id: new ObjectId(orgId) },
        { $set: updates }
      );

      // Log activity
      await logSuperAdminActivity(
        req.userId,
        "updated",
        "organization",
        orgId,
        orgId,
        { before: currentOrg, after: updates },
        req
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

// Change organization status
app.patch(
  "/super-admin/organizations/:orgId/status",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { orgId } = req.params;
      const { status } = req.body;

      if (!["active", "suspended", "inactive"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status. Must be: active, suspended, or inactive",
        });
      }

      const currentOrg = await organizationsCollection.findOne({
        _id: new ObjectId(orgId),
      });

      if (!currentOrg) {
        return res.status(404).json({
          success: false,
          message: "Organization not found",
        });
      }

      await organizationsCollection.updateOne(
        { _id: new ObjectId(orgId) },
        {
          $set: {
            status,
            updatedAt: new Date(),
          },
        }
      );

      // Log activity
      await logSuperAdminActivity(
        req.userId,
        "status_changed",
        "organization",
        orgId,
        orgId,
        { previousStatus: currentOrg.status, newStatus: status },
        req
      );

      res.json({
        success: true,
        message: `Organization ${status === "suspended" ? "suspended" : status === "active" ? "activated" : "deactivated"} successfully`,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to change organization status",
        error: error.message,
      });
    }
  }
);

// Suspend organization (with reason)
app.put(
  "/super-admin/organizations/:orgId/suspend",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { orgId } = req.params;
      const { reason } = req.body;

      const currentOrg = await organizationsCollection.findOne({
        _id: new ObjectId(orgId),
      });

      if (!currentOrg) {
        return res.status(404).json({
          success: false,
          message: "Organization not found",
        });
      }

      if (currentOrg.status === "suspended") {
        return res.status(400).json({
          success: false,
          message: "Organization is already suspended",
        });
      }

      await organizationsCollection.updateOne(
        { _id: new ObjectId(orgId) },
        {
          $set: {
            status: "suspended",
            suspensionReason: reason || "No reason provided",
            suspendedAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );

      // Log activity
      await logSuperAdminActivity(
        req.userId,
        "suspended",
        "organization",
        orgId,
        orgId,
        {
          previousStatus: currentOrg.status,
          reason: reason || "No reason provided",
          organizationName: currentOrg.name
        },
        req
      );

      res.json({
        success: true,
        message: "Organization suspended successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to suspend organization",
        error: error.message,
      });
    }
  }
);

// Activate organization
app.put(
  "/super-admin/organizations/:orgId/activate",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { orgId } = req.params;

      const currentOrg = await organizationsCollection.findOne({
        _id: new ObjectId(orgId),
      });

      if (!currentOrg) {
        return res.status(404).json({
          success: false,
          message: "Organization not found",
        });
      }

      if (currentOrg.status === "active") {
        return res.status(400).json({
          success: false,
          message: "Organization is already active",
        });
      }

      await organizationsCollection.updateOne(
        { _id: new ObjectId(orgId) },
        {
          $set: {
            status: "active",
            updatedAt: new Date(),
          },
          $unset: {
            suspensionReason: "",
            suspendedAt: "",
          },
        }
      );

      // Log activity
      await logSuperAdminActivity(
        req.userId,
        "activated",
        "organization",
        orgId,
        orgId,
        {
          previousStatus: currentOrg.status,
          organizationName: currentOrg.name
        },
        req
      );

      res.json({
        success: true,
        message: "Organization activated successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to activate organization",
        error: error.message,
      });
    }
  }
);

// ==================== SUPER ADMIN REACTIVATION REQUESTS ====================

// Get count of pending reactivation requests
app.get(
  "/super-admin/reactivation-requests/count",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const pendingCount = await reactivationRequestsCollection.countDocuments({
        status: "pending"
      });

      res.json({
        success: true,
        data: { pendingCount }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch count",
        error: error.message
      });
    }
  }
);

// Get all reactivation requests with filtering
app.get(
  "/super-admin/reactivation-requests",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { status, page = 1, limit = 20 } = req.query;
      
      const query = {};
      if (status) {
        query.status = status;
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const requests = await reactivationRequestsCollection
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .toArray();

      const total = await reactivationRequestsCollection.countDocuments(query);

      res.json({
        success: true,
        data: {
          requests,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / parseInt(limit))
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch reactivation requests",
        error: error.message
      });
    }
  }
);

// Get reactivation requests for specific organization
app.get(
  "/super-admin/organizations/:orgId/reactivation-requests",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { orgId } = req.params;

      const requests = await reactivationRequestsCollection
        .find({ organizationId: new ObjectId(orgId) })
        .sort({ createdAt: -1 })
        .toArray();

      res.json({
        success: true,
        data: requests
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch organization reactivation requests",
        error: error.message
      });
    }
  }
);

// Approve reactivation request
app.put(
  "/super-admin/reactivation-requests/:requestId/approve",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { requestId } = req.params;
      const { reviewNotes } = req.body;

      // Get the request
      const request = await reactivationRequestsCollection.findOne({
        _id: new ObjectId(requestId)
      });

      if (!request) {
        return res.status(404).json({
          success: false,
          message: "Reactivation request not found"
        });
      }

      if (request.status !== "pending") {
        return res.status(400).json({
          success: false,
          message: "Request has already been processed"
        });
      }

      // Get admin user info
      const adminUser = await usersCollection.findOne({
        _id: new ObjectId(req.userId)
      });

      // Update request status
      await reactivationRequestsCollection.updateOne(
        { _id: new ObjectId(requestId) },
        {
          $set: {
            status: "approved",
            reviewedBy: new ObjectId(req.userId),
            reviewedByName: adminUser?.name || "Super Admin",
            reviewedAt: new Date(),
            reviewNotes: reviewNotes || "",
            updatedAt: new Date()
          }
        }
      );

      // Reactivate the organization
      await organizationsCollection.updateOne(
        { _id: request.organizationId },
        {
          $set: {
            status: "active",
            updatedAt: new Date()
          },
          $unset: {
            suspensionReason: "",
            suspendedAt: "",
            suspendedBy: "",
            suspendedByName: "",
            pendingReactivationRequest: ""
          }
        }
      );

      // Log activity
      await logSuperAdminActivity(
        req.userId,
        "approved_reactivation",
        "organization",
        request.organizationId.toString(),
        request.organizationId,
        {
          requestId: requestId,
          organizationName: request.organizationName,
          reviewNotes
        },
        req
      );

      res.json({
        success: true,
        message: "Reactivation request approved and organization reactivated"
      });
    } catch (error) {
      logger.error("Error approving reactivation request:", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to approve reactivation request",
        error: error.message
      });
    }
  }
);

// Reject reactivation request
app.put(
  "/super-admin/reactivation-requests/:requestId/reject",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { requestId } = req.params;
      const { rejectionReason } = req.body;

      if (!rejectionReason) {
        return res.status(400).json({
          success: false,
          message: "Rejection reason is required"
        });
      }

      // Get the request
      const request = await reactivationRequestsCollection.findOne({
        _id: new ObjectId(requestId)
      });

      if (!request) {
        return res.status(404).json({
          success: false,
          message: "Reactivation request not found"
        });
      }

      if (request.status !== "pending") {
        return res.status(400).json({
          success: false,
          message: "Request has already been processed"
        });
      }

      // Get admin user info
      const adminUser = await usersCollection.findOne({
        _id: new ObjectId(req.userId)
      });

      // Update request status
      await reactivationRequestsCollection.updateOne(
        { _id: new ObjectId(requestId) },
        {
          $set: {
            status: "rejected",
            reviewedBy: new ObjectId(req.userId),
            reviewedByName: adminUser?.name || "Super Admin",
            reviewedAt: new Date(),
            rejectionReason,
            updatedAt: new Date()
          }
        }
      );

      // Remove pending request reference from organization
      await organizationsCollection.updateOne(
        { _id: request.organizationId },
        {
          $unset: { pendingReactivationRequest: "" },
          $set: { updatedAt: new Date() }
        }
      );

      // Log activity
      await logSuperAdminActivity(
        req.userId,
        "rejected_reactivation",
        "organization",
        request.organizationId.toString(),
        request.organizationId,
        {
          requestId: requestId,
          organizationName: request.organizationName,
          rejectionReason
        },
        req
      );

      res.json({
        success: true,
        message: "Reactivation request rejected"
      });
    } catch (error) {
      logger.error("Error rejecting reactivation request:", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to reject reactivation request",
        error: error.message
      });
    }
  }
);

// Override organization limits
app.patch(
  "/super-admin/organizations/:orgId/limits",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { orgId } = req.params;
      const { maxStudents, maxBatches, maxStaff, maxStorage, features } = req.body;

      const currentOrg = await organizationsCollection.findOne({
        _id: new ObjectId(orgId),
      });

      if (!currentOrg) {
        return res.status(404).json({
          success: false,
          message: "Organization not found",
        });
      }

      const newLimits = {
        maxStudents: maxStudents ?? currentOrg.limits.maxStudents,
        maxBatches: maxBatches ?? currentOrg.limits.maxBatches,
        maxStaff: maxStaff ?? currentOrg.limits.maxStaff,
        maxStorage: maxStorage ?? currentOrg.limits.maxStorage,
        features: features ?? currentOrg.limits.features,
      };

      await organizationsCollection.updateOne(
        { _id: new ObjectId(orgId) },
        {
          $set: {
            limits: newLimits,
            updatedAt: new Date(),
          },
        }
      );

      // Log activity
      await logSuperAdminActivity(
        req.userId,
        "limits_overridden",
        "organization",
        orgId,
        orgId,
        { previousLimits: currentOrg.limits, newLimits },
        req
      );

      res.json({
        success: true,
        message: "Organization limits updated successfully",
        data: { limits: newLimits },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to update organization limits",
        error: error.message,
      });
    }
  }
);

// Soft delete organization
app.delete(
  "/super-admin/organizations/:orgId",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { orgId } = req.params;

      const currentOrg = await organizationsCollection.findOne({
        _id: new ObjectId(orgId),
      });

      if (!currentOrg) {
        return res.status(404).json({
          success: false,
          message: "Organization not found",
        });
      }

      await organizationsCollection.updateOne(
        { _id: new ObjectId(orgId) },
        {
          $set: {
            status: "deleted",
            deletedAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );

      // Log activity
      await logSuperAdminActivity(
        req.userId,
        "deleted",
        "organization",
        orgId,
        orgId,
        { name: currentOrg.name, slug: currentOrg.slug },
        req
      );

      res.json({
        success: true,
        message: "Organization deleted successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to delete organization",
        error: error.message,
      });
    }
  }
);

// Get organization usage statistics
app.get(
  "/super-admin/organizations/:orgId/usage",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { orgId } = req.params;
      const orgObjectId = new ObjectId(orgId);

      const org = await organizationsCollection.findOne({ _id: orgObjectId });

      if (!org) {
        return res.status(404).json({
          success: false,
          message: "Organization not found",
        });
      }

      // Get actual counts
      const studentsCount = await studentsCollection.countDocuments({
        organizationId: orgObjectId,
        status: "active",
      });

      const batchesCount = await batchesCollection.countDocuments({
        organizationId: orgObjectId,
        status: "active",
      });

      const staffCount = await usersCollection.countDocuments({
        organizationId: orgObjectId,
        status: "active",
      });

      const limits = org.limits || {};

      res.json({
        success: true,
        data: {
          students: {
            current: studentsCount,
            max: limits.maxStudents || 50,
            percentage: limits.maxStudents
              ? parseFloat(((studentsCount / limits.maxStudents) * 100).toFixed(1))
              : 0,
          },
          batches: {
            current: batchesCount,
            max: limits.maxBatches || 3,
            percentage: limits.maxBatches
              ? parseFloat(((batchesCount / limits.maxBatches) * 100).toFixed(1))
              : 0,
          },
          staff: {
            current: staffCount,
            max: limits.maxStaff || 2,
            percentage: limits.maxStaff
              ? parseFloat(((staffCount / limits.maxStaff) * 100).toFixed(1))
              : 0,
          },
          storage: {
            current: org.usage?.storageUsed || 0,
            max: limits.maxStorage || 100,
            unit: "MB",
            percentage: limits.maxStorage
              ? parseFloat((((org.usage?.storageUsed || 0) / limits.maxStorage) * 100).toFixed(1))
              : 0,
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch organization usage",
        error: error.message,
      });
    }
  }
);

// Get organization users
app.get(
  "/super-admin/organizations/:orgId/users",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { orgId } = req.params;
      const { page = 1, limit = 10 } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const total = await usersCollection.countDocuments({
        organizationId: new ObjectId(orgId),
      });

      const users = await usersCollection
        .find({ organizationId: new ObjectId(orgId) })
        .project({
          _id: 1,
          name: 1,
          email: 1,
          role: 1,
          status: 1,
          lastLogin: 1,
          createdAt: 1,
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .toArray();

      res.json({
        success: true,
        data: {
          users,
          pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / parseInt(limit)),
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch organization users",
        error: error.message,
      });
    }
  }
);

// Get organization activity logs
app.get(
  "/super-admin/organizations/:orgId/activity",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { orgId } = req.params;
      const { page = 1, limit = 20, action = "" } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const query = { organizationId: new ObjectId(orgId) };
      if (action) {
        query.action = action;
      }

      const total = await activityLogsCollection.countDocuments(query);

      const activities = await activityLogsCollection
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .toArray();

      res.json({
        success: true,
        data: {
          activities,
          pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / parseInt(limit)),
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch organization activity",
        error: error.message,
      });
    }
  }
);

// Get organization payment history
app.get(
  "/super-admin/organizations/:orgId/payments",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { orgId } = req.params;
      const { page = 1, limit = 10 } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const total = await paymentsCollection.countDocuments({
        organizationId: new ObjectId(orgId),
      });

      const payments = await paymentsCollection
        .find({ organizationId: new ObjectId(orgId) })
        .sort({ paymentDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .toArray();

      res.json({
        success: true,
        data: {
          payments,
          pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / parseInt(limit)),
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch organization payments",
        error: error.message,
      });
    }
  }
);

// ==================== SUPER ADMIN: USERS ====================

// List all platform users
app.get(
  "/super-admin/users",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        search = "",
        org = "",
        role = "",
        status = "",
      } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const query = {};

      if (search) {
        query.$or = [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ];
      }

      if (org) {
        query.organizationId = new ObjectId(org);
      }

      if (role) {
        query.role = role;
      }

      if (status) {
        query.status = status;
      }

      const total = await usersCollection.countDocuments(query);

      const users = await usersCollection
        .aggregate([
          { $match: query },
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: parseInt(limit) },
          {
            $lookup: {
              from: "organizations",
              localField: "organizationId",
              foreignField: "_id",
              as: "orgData",
            },
          },
          { $unwind: { path: "$orgData", preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 1,
              name: 1,
              email: 1,
              phone: 1,
              photoURL: 1,
              role: 1,
              status: 1,
              isSuperAdmin: 1,
              lastLogin: 1,
              createdAt: 1,
              organization: {
                _id: "$orgData._id",
                name: "$orgData.name",
                slug: "$orgData.slug",
              },
            },
          },
        ])
        .toArray();

      res.json({
        success: true,
        data: {
          users,
          pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / parseInt(limit)),
          },
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

// Get single user details
app.get(
  "/super-admin/users/:userId",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { userId } = req.params;

      const user = await usersCollection
        .aggregate([
          { $match: { _id: new ObjectId(userId) } },
          {
            $lookup: {
              from: "organizations",
              localField: "organizationId",
              foreignField: "_id",
              as: "orgData",
            },
          },
          { $unwind: { path: "$orgData", preserveNullAndEmptyArrays: true } },
        ])
        .toArray();

      if (!user || user.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const userData = user[0];
      userData.organization = {
        _id: userData.orgData?._id,
        name: userData.orgData?.name,
        slug: userData.orgData?.slug,
      };
      delete userData.orgData;
      delete userData.password;

      // Get user activity count
      const activityCount = await activityLogsCollection.countDocuments({
        userId: new ObjectId(userId),
      });

      userData.activityCount = activityCount;

      res.json({
        success: true,
        data: userData,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch user",
        error: error.message,
      });
    }
  }
);

// Promote user to super admin
app.patch(
  "/super-admin/users/:userId/promote-super-admin",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { userId } = req.params;

      const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      if (user.isSuperAdmin || user.role === "super_admin") {
        return res.status(400).json({
          success: false,
          message: "User is already a super admin",
        });
      }

      await usersCollection.updateOne(
        { _id: new ObjectId(userId) },
        {
          $set: {
            isSuperAdmin: true,
            role: "super_admin",
            updatedAt: new Date(),
          },
        }
      );

      // Log activity
      await logSuperAdminActivity(
        req.userId,
        "promoted_to_super_admin",
        "user",
        userId,
        user.organizationId?.toString(),
        { userName: user.name, email: user.email },
        req
      );

      res.json({
        success: true,
        message: "User promoted to super admin successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to promote user",
        error: error.message,
      });
    }
  }
);

// Demote user from super admin
app.patch(
  "/super-admin/users/:userId/demote-super-admin",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { newRole = "org_owner" } = req.body;

      // Prevent self-demotion
      if (req.userId.toString() === userId) {
        return res.status(400).json({
          success: false,
          message: "Cannot demote yourself",
        });
      }

      const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      if (!user.isSuperAdmin && user.role !== "super_admin") {
        return res.status(400).json({
          success: false,
          message: "User is not a super admin",
        });
      }

      await usersCollection.updateOne(
        { _id: new ObjectId(userId) },
        {
          $set: {
            isSuperAdmin: false,
            role: newRole,
            updatedAt: new Date(),
          },
        }
      );

      // Log activity
      await logSuperAdminActivity(
        req.userId,
        "demoted_from_super_admin",
        "user",
        userId,
        user.organizationId?.toString(),
        { userName: user.name, email: user.email, newRole },
        req
      );

      res.json({
        success: true,
        message: "User demoted from super admin successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to demote user",
        error: error.message,
      });
    }
  }
);

// Change user status
app.patch(
  "/super-admin/users/:userId/status",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { status } = req.body;

      if (!["active", "inactive", "suspended"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status. Must be: active, inactive, or suspended",
        });
      }

      const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      await usersCollection.updateOne(
        { _id: new ObjectId(userId) },
        {
          $set: {
            status,
            updatedAt: new Date(),
          },
        }
      );

      // Log activity
      await logSuperAdminActivity(
        req.userId,
        "status_changed",
        "user",
        userId,
        user.organizationId?.toString(),
        { previousStatus: user.status, newStatus: status },
        req
      );

      res.json({
        success: true,
        message: "User status updated successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to update user status",
        error: error.message,
      });
    }
  }
);

// Generate impersonation token
app.post(
  "/super-admin/users/:userId/impersonate",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { userId } = req.params;

      const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Generate a temporary impersonation token (simplified)
      // In production, use JWT with short expiry
      const impersonationToken = Buffer.from(
        JSON.stringify({
          userId,
          impersonatedBy: req.userId.toString(),
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
        })
      ).toString("base64");

      // Log activity
      await logSuperAdminActivity(
        req.userId,
        "impersonated_user",
        "user",
        userId,
        user.organizationId?.toString(),
        { userName: user.name, email: user.email },
        req
      );

      res.json({
        success: true,
        message: "Impersonation token generated",
        data: {
          token: impersonationToken,
          user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
          expiresIn: "1 hour",
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to generate impersonation token",
        error: error.message,
      });
    }
  }
);

// List all super admin users
app.get(
  "/super-admin/users/super-admins/list",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const superAdmins = await usersCollection
        .find({
          $or: [{ isSuperAdmin: true }, { role: "super_admin" }],
        })
        .project({
          _id: 1,
          name: 1,
          email: 1,
          phone: 1,
          photoURL: 1,
          status: 1,
          lastLogin: 1,
          createdAt: 1,
        })
        .sort({ createdAt: -1 })
        .toArray();

      res.json({
        success: true,
        data: superAdmins,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch super admins",
        error: error.message,
      });
    }
  }
);

// ==================== SUPER ADMIN: SUBSCRIPTION REQUESTS (APPROVAL WORKFLOW) ====================

// Get pending subscription request count (for badge)
app.get(
  "/super-admin/subscription-requests/count",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const pendingCount = await subscriptionRequestsCollection.countDocuments({
        status: "pending"
      });

      res.json({
        success: true,
        data: {
          pendingCount
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch pending count",
        error: error.message,
      });
    }
  }
);

// List all subscription requests with filtering
app.get(
  "/super-admin/subscription-requests",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        status = "all",
        requestType = "",
        search = "",
        sortBy = "createdAt",
        sortOrder = "desc"
      } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const query = {};

      if (status !== "all") {
        query.status = status;
      }

      if (requestType) {
        query.requestType = requestType;
      }

      if (search) {
        query.$or = [
          { organizationName: { $regex: search, $options: "i" } },
          { requestedByName: { $regex: search, $options: "i" } },
          { requestedByEmail: { $regex: search, $options: "i" } }
        ];
      }

      const total = await subscriptionRequestsCollection.countDocuments(query);

      const requests = await subscriptionRequestsCollection
        .aggregate([
          { $match: query },
          { $sort: { [sortBy]: sortOrder === "desc" ? -1 : 1 } },
          { $skip: skip },
          { $limit: parseInt(limit) },
          {
            $lookup: {
              from: "organizations",
              localField: "organizationId",
              foreignField: "_id",
              as: "organization"
            }
          },
          { $unwind: { path: "$organization", preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: "subscription_plans",
              localField: "requestedPlanId",
              foreignField: "_id",
              as: "requestedPlan"
            }
          },
          { $unwind: { path: "$requestedPlan", preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: "subscription_plans",
              localField: "currentPlanId",
              foreignField: "_id",
              as: "currentPlan"
            }
          },
          { $unwind: { path: "$currentPlan", preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 1,
              organizationId: 1,
              organizationName: 1,
              requestedBy: 1,
              requestedByName: 1,
              requestedByEmail: 1,
              requestType: 1,
              currentTier: 1,
              currentPlanName: "$currentPlan.name",
              currentAmount: 1,
              requestedTier: 1,
              requestedPlanName: "$requestedPlan.name",
              requestedAmount: 1,
              requestedBillingCycle: 1,
              status: 1,
              createdAt: 1,
              reviewedAt: 1,
              reviewedByName: 1,
              rejectionReason: 1,
              "organization.status": 1,
              "organization.subscriptionStatus": 1
            }
          }
        ])
        .toArray();

      // Get stats
      const stats = {
        pending: await subscriptionRequestsCollection.countDocuments({ status: "pending" }),
        approved: await subscriptionRequestsCollection.countDocuments({ status: "approved" }),
        rejected: await subscriptionRequestsCollection.countDocuments({ status: "rejected" }),
        total
      };

      res.json({
        success: true,
        data: {
          requests,
          stats,
          pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / parseInt(limit)),
          }
        }
      });
    } catch (error) {
      logger.error("Error fetching subscription requests:", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch subscription requests",
        error: error.message,
      });
    }
  }
);

// Get single subscription request details
app.get(
  "/super-admin/subscription-requests/:requestId",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { requestId } = req.params;

      const request = await subscriptionRequestsCollection
        .aggregate([
          { $match: { _id: new ObjectId(requestId) } },
          {
            $lookup: {
              from: "organizations",
              localField: "organizationId",
              foreignField: "_id",
              as: "organization"
            }
          },
          { $unwind: { path: "$organization", preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: "subscriptions",
              localField: "organizationId",
              foreignField: "organizationId",
              as: "currentSubscription"
            }
          },
          { $unwind: { path: "$currentSubscription", preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: "subscription_plans",
              localField: "requestedPlanId",
              foreignField: "_id",
              as: "requestedPlan"
            }
          },
          { $unwind: { path: "$requestedPlan", preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: "subscription_plans",
              localField: "currentPlanId",
              foreignField: "_id",
              as: "currentPlan"
            }
          },
          { $unwind: { path: "$currentPlan", preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: "payments",
              localField: "organizationId",
              foreignField: "organizationId",
              as: "paymentHistory"
            }
          }
        ])
        .toArray();

      if (!request || request.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Request not found"
        });
      }

      const data = request[0];

      // Sort and limit payment history
      data.paymentHistory = (data.paymentHistory || [])
        .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
        .slice(0, 10);

      res.json({
        success: true,
        data
      });
    } catch (error) {
      logger.error("Error fetching request details:", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch request details",
        error: error.message,
      });
    }
  }
);

// Approve a subscription request
app.put(
  "/super-admin/subscription-requests/:requestId/approve",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { requestId } = req.params;
      const { notes } = req.body;

      const request = await subscriptionRequestsCollection.findOne({
        _id: new ObjectId(requestId),
        status: "pending"
      });

      if (!request) {
        return res.status(404).json({
          success: false,
          message: "Pending request not found"
        });
      }

      // Get the requested plan
      const plan = await subscriptionPlansCollection.findOne({
        _id: request.requestedPlanId
      });

      if (!plan) {
        return res.status(404).json({
          success: false,
          message: "Requested plan no longer exists"
        });
      }

      // Get super admin info
      const superAdmin = await usersCollection.findOne({
        _id: new ObjectId(req.userId)
      });

      // Calculate new billing dates
      const now = new Date();
      const nextBillingDate = new Date();
      if (request.requestedBillingCycle === "yearly") {
        nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
      } else {
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
      }

      // Apply the subscription change
      const subscriptionData = {
        organizationId: request.organizationId,
        planId: plan._id,
        tier: plan.tier,
        status: "active",
        billingCycle: request.requestedBillingCycle,
        amount: request.requestedAmount,
        nextBillingDate,
        currentPeriodStart: now,
        currentPeriodEnd: nextBillingDate,
        updatedAt: now,
      };

      await subscriptionsCollection.updateOne(
        { organizationId: request.organizationId },
        { $set: subscriptionData },
        { upsert: true }
      );

      // Update organization limits
      await organizationsCollection.updateOne(
        { _id: request.organizationId },
        {
          $set: {
            subscriptionStatus: "active",
            subscriptionTier: plan.tier,
            limits: plan.limits,
            updatedAt: now,
          },
          $unset: {
            pendingSubscriptionRequest: ""
          }
        }
      );

      // Record payment (for paid plans)
      if (request.requestedAmount > 0) {
        const paymentRecord = {
          organizationId: request.organizationId,
          type: "subscription",
          planTier: plan.tier,
          amount: request.requestedAmount,
          billingCycle: request.requestedBillingCycle,
          method: "admin_approved",
          status: "paid", // Payment confirmed by admin approval
          paymentDate: now,
          invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
          createdBy: new ObjectId(req.userId),
          subscriptionRequestId: new ObjectId(requestId),
          note: "Generated from approved subscription request",
          createdAt: now
        };
        await paymentsCollection.insertOne(paymentRecord);
      }

      // Update request status
      await subscriptionRequestsCollection.updateOne(
        { _id: new ObjectId(requestId) },
        {
          $set: {
            status: "approved",
            reviewedBy: new ObjectId(req.userId),
            reviewedByName: superAdmin?.name || "Super Admin",
            reviewedAt: now,
            reviewNotes: notes || "",
            updatedAt: now
          }
        }
      );

      // Log super admin activity
      await logSuperAdminActivity(
        req.userId,
        "approved_subscription_request",
        "subscription_request",
        requestId,
        request.organizationId.toString(),
        {
          previousTier: request.currentTier,
          newTier: plan.tier,
          organizationName: request.organizationName,
          notes
        },
        req
      );

      res.json({
        success: true,
        message: `Subscription request approved. ${request.organizationName} has been ${request.requestType}d to ${plan.name}.`
      });
    } catch (error) {
      logger.error("Approval error:", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to approve request",
        error: error.message,
      });
    }
  }
);

// Reject a subscription request
app.put(
  "/super-admin/subscription-requests/:requestId/reject",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { requestId } = req.params;
      const { reason } = req.body;

      if (!reason || reason.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Rejection reason is required"
        });
      }

      const request = await subscriptionRequestsCollection.findOne({
        _id: new ObjectId(requestId),
        status: "pending"
      });

      if (!request) {
        return res.status(404).json({
          success: false,
          message: "Pending request not found"
        });
      }

      // Get super admin info
      const superAdmin = await usersCollection.findOne({
        _id: new ObjectId(req.userId)
      });

      const now = new Date();

      // Update request status
      await subscriptionRequestsCollection.updateOne(
        { _id: new ObjectId(requestId) },
        {
          $set: {
            status: "rejected",
            reviewedBy: new ObjectId(req.userId),
            reviewedByName: superAdmin?.name || "Super Admin",
            reviewedAt: now,
            rejectionReason: reason,
            updatedAt: now
          }
        }
      );

      // Clear pending request from organization
      await organizationsCollection.updateOne(
        { _id: request.organizationId },
        {
          $unset: { pendingSubscriptionRequest: "" },
          $set: { updatedAt: now }
        }
      );

      // Log super admin activity
      await logSuperAdminActivity(
        req.userId,
        "rejected_subscription_request",
        "subscription_request",
        requestId,
        request.organizationId.toString(),
        {
          requestType: request.requestType,
          requestedTier: request.requestedTier,
          organizationName: request.organizationName,
          reason
        },
        req
      );

      res.json({
        success: true,
        message: `Subscription request rejected. ${request.organizationName} has been notified.`
      });
    } catch (error) {
      logger.error("Rejection error:", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to reject request",
        error: error.message,
      });
    }
  }
);

// Get subscriptions that are expiring soon (alerts)
app.get(
  "/super-admin/subscriptions/expiring-alerts",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { days = 7 } = req.query;

      const now = new Date();
      const alertDate = new Date();
      alertDate.setDate(alertDate.getDate() + parseInt(days));

      const expiringSubscriptions = await subscriptionsCollection
        .aggregate([
          {
            $match: {
              status: { $in: ["active", "trial"] },
              $or: [
                { currentPeriodEnd: { $lte: alertDate, $gte: now } },
                { trialEndDate: { $lte: alertDate, $gte: now } },
                { nextBillingDate: { $lte: alertDate, $gte: now } }
              ]
            }
          },
          {
            $lookup: {
              from: "organizations",
              localField: "organizationId",
              foreignField: "_id",
              as: "organization"
            }
          },
          { $unwind: { path: "$organization", preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 1,
              organizationId: 1,
              organizationName: "$organization.name",
              organizationEmail: "$organization.email",
              organizationStatus: "$organization.status",
              tier: 1,
              status: 1,
              amount: 1,
              billingCycle: 1,
              expirationDate: {
                $ifNull: [
                  "$currentPeriodEnd",
                  { $ifNull: ["$trialEndDate", "$nextBillingDate"] }
                ]
              },
              daysUntilExpiration: {
                $ceil: {
                  $divide: [
                    {
                      $subtract: [
                        { $ifNull: ["$currentPeriodEnd", { $ifNull: ["$trialEndDate", "$nextBillingDate"] }] },
                        now
                      ]
                    },
                    1000 * 60 * 60 * 24
                  ]
                }
              }
            }
          },
          { $sort: { expirationDate: 1 } }
        ])
        .toArray();

      // Also get expired subscriptions that haven't been suspended
      const expiredSubscriptions = await subscriptionsCollection
        .aggregate([
          {
            $match: {
              status: { $in: ["active", "trial"] },
              $or: [
                { currentPeriodEnd: { $lt: now } },
                { trialEndDate: { $lt: now } },
                { nextBillingDate: { $lt: now } }
              ]
            }
          },
          {
            $lookup: {
              from: "organizations",
              localField: "organizationId",
              foreignField: "_id",
              as: "organization"
            }
          },
          { $unwind: { path: "$organization", preserveNullAndEmptyArrays: true } },
          {
            $match: {
              "organization.status": { $ne: "suspended" }
            }
          },
          {
            $project: {
              _id: 1,
              organizationId: 1,
              organizationName: "$organization.name",
              organizationEmail: "$organization.email",
              organizationStatus: "$organization.status",
              tier: 1,
              status: 1,
              amount: 1,
              billingCycle: 1,
              expirationDate: {
                $ifNull: [
                  "$currentPeriodEnd",
                  { $ifNull: ["$trialEndDate", "$nextBillingDate"] }
                ]
              },
              daysOverdue: {
                $ceil: {
                  $divide: [
                    {
                      $subtract: [
                        now,
                        { $ifNull: ["$currentPeriodEnd", { $ifNull: ["$trialEndDate", "$nextBillingDate"] }] }
                      ]
                    },
                    1000 * 60 * 60 * 24
                  ]
                }
              }
            }
          },
          { $sort: { expirationDate: 1 } }
        ])
        .toArray();

      res.json({
        success: true,
        data: {
          expiringSoon: expiringSubscriptions,
          expired: expiredSubscriptions,
          stats: {
            expiringSoonCount: expiringSubscriptions.length,
            expiredCount: expiredSubscriptions.length
          }
        }
      });
    } catch (error) {
      logger.error("Error fetching expiring alerts:", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch expiring alerts",
        error: error.message,
      });
    }
  }
);

// Suspend organization due to expired subscription
app.put(
  "/super-admin/organizations/:orgId/suspend-expired",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { orgId } = req.params;
      const { reason } = req.body;

      const org = await organizationsCollection.findOne({
        _id: new ObjectId(orgId)
      });

      if (!org) {
        return res.status(404).json({
          success: false,
          message: "Organization not found"
        });
      }

      if (org.status === "suspended") {
        return res.status(400).json({
          success: false,
          message: "Organization is already suspended"
        });
      }

      const now = new Date();
      const suspensionReason = reason || "Subscription expired without renewal";

      // Update organization status
      await organizationsCollection.updateOne(
        { _id: new ObjectId(orgId) },
        {
          $set: {
            status: "suspended",
            subscriptionStatus: "expired",
            suspensionReason,
            suspendedAt: now,
            updatedAt: now
          }
        }
      );

      // Update subscription status
      await subscriptionsCollection.updateOne(
        { organizationId: new ObjectId(orgId) },
        {
          $set: {
            status: "expired",
            updatedAt: now
          }
        }
      );

      // Log activity
      await logSuperAdminActivity(
        req.userId,
        "suspended_expired_organization",
        "organization",
        orgId,
        orgId,
        {
          organizationName: org.name,
          reason: suspensionReason
        },
        req
      );

      res.json({
        success: true,
        message: `${org.name} has been suspended due to: ${suspensionReason}`
      });
    } catch (error) {
      logger.error("Suspension error:", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to suspend organization",
        error: error.message,
      });
    }
  }
);

// ==================== SUPER ADMIN: SUBSCRIPTIONS ====================

// List all subscriptions
app.get(
  "/super-admin/subscriptions",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        tier = "",
        status = "",
        billingCycle = "",
        search = "",
      } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const query = {};

      if (tier) {
        query.tier = tier;
      }

      if (status) {
        query.status = status;
      }

      if (billingCycle) {
        query.billingCycle = billingCycle;
      }

      const total = await subscriptionsCollection.countDocuments(query);

      const subscriptions = await subscriptionsCollection
        .aggregate([
          { $match: query },
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: parseInt(limit) },
          {
            $lookup: {
              from: "organizations",
              localField: "organizationId",
              foreignField: "_id",
              as: "orgData",
            },
          },
          { $unwind: { path: "$orgData", preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: "subscription_plans",
              localField: "planId",
              foreignField: "_id",
              as: "planData",
            },
          },
          { $unwind: { path: "$planData", preserveNullAndEmptyArrays: true } },
          {
            $match: search
              ? {
                  "orgData.name": { $regex: search, $options: "i" },
                }
              : {},
          },
          {
            $project: {
              _id: 1,
              organizationId: 1,
              organizationName: "$orgData.name",
              tier: 1,
              planName: "$planData.name",
              status: 1,
              billingCycle: 1,
              amount: 1,
              currency: 1,
              startDate: "$currentPeriodStart",
              endDate: "$currentPeriodEnd",
              currentPeriodStart: 1,
              currentPeriodEnd: 1,
              nextBillingDate: 1,
              trialEndDate: 1,
              createdAt: 1,
            },
          },
        ])
        .toArray();

      // Calculate stats
      const stats = {
        active: await subscriptionsCollection.countDocuments({ status: "active" }),
        trial: await subscriptionsCollection.countDocuments({ status: "trial" }),
        expired: await subscriptionsCollection.countDocuments({ status: "expired" }),
        cancelled: await subscriptionsCollection.countDocuments({ status: "cancelled" }),
        totalRevenue: 0,
      };

      // Calculate total revenue from active subscriptions
      const revenueResult = await subscriptionsCollection
        .aggregate([
          { $match: { status: { $in: ["active", "trial"] } } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ])
        .toArray();

      stats.totalRevenue = revenueResult[0]?.total || 0;

      res.json({
        success: true,
        data: {
          subscriptions,
          stats,
          pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / parseInt(limit)),
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch subscriptions",
        error: error.message,
      });
    }
  }
);

// Get single subscription details
app.get(
  "/super-admin/subscriptions/:subscriptionId",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { subscriptionId } = req.params;

      const subscription = await subscriptionsCollection
        .aggregate([
          { $match: { _id: new ObjectId(subscriptionId) } },
          {
            $lookup: {
              from: "organizations",
              localField: "organizationId",
              foreignField: "_id",
              as: "orgData",
            },
          },
          { $unwind: { path: "$orgData", preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: "payments",
              localField: "organizationId",
              foreignField: "organizationId",
              as: "payments",
            },
          },
        ])
        .toArray();

      if (!subscription || subscription.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Subscription not found",
        });
      }

      const subData = subscription[0];
      subData.organizationId = subData.orgData?._id;
      subData.organizationName = subData.orgData?.name;
      subData.organization = {
        _id: subData.orgData?._id,
        name: subData.orgData?.name,
        slug: subData.orgData?.slug,
      };
      delete subData.orgData;

      // Sort payments by date
      subData.payments = subData.payments
        .sort((a, b) => new Date(b.paymentDate || b.createdAt) - new Date(a.paymentDate || a.createdAt))
        .slice(0, 10);

      // Get subscription plan details
      try {
        const plan = await subscriptionPlansCollection.findOne({ _id: subData.planId });
        if (plan) {
          subData.planName = plan.name;
          subData.limits = plan.limits || {};
        }
      } catch (err) {
        // Plan not found, use defaults
      }

      // Get organization usage
      try {
        const org = await organizationsCollection.findOne({ _id: subData.organizationId });
        if (org) {
          subData.usage = org.usage || {};
        }
      } catch (err) {
        // Organization not found
      }

      res.json({
        success: true,
        data: subData,
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

// Get expiring subscriptions (within specified days)
app.get(
  "/super-admin/subscriptions/expiring",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { days = 30, limit = 5 } = req.query;

      // Calculate date threshold
      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + parseInt(days));

      const expiringSubscriptions = await subscriptionsCollection
        .aggregate([
          {
            $match: {
              status: { $in: ["active", "trial"] },
              $or: [
                {
                  currentPeriodEnd: {
                    $gte: now,
                    $lte: futureDate,
                  },
                },
                {
                  trialEndDate: {
                    $gte: now,
                    $lte: futureDate,
                  },
                },
              ],
            },
          },
          { $sort: { currentPeriodEnd: 1, trialEndDate: 1 } },
          { $limit: parseInt(limit) },
          {
            $lookup: {
              from: "organizations",
              localField: "organizationId",
              foreignField: "_id",
              as: "orgData",
            },
          },
          { $unwind: { path: "$orgData", preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: "subscription_plans",
              localField: "planId",
              foreignField: "_id",
              as: "planData",
            },
          },
          { $unwind: { path: "$planData", preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 1,
              organizationId: 1,
              organizationName: "$orgData.name",
              planName: "$planData.name",
              tier: 1,
              status: 1,
              endDate: {
                $ifNull: ["$currentPeriodEnd", "$trialEndDate"],
              },
              currentPeriodEnd: 1,
              trialEndDate: 1,
            },
          },
        ])
        .toArray();

      res.json({
        success: true,
        data: expiringSubscriptions,
      });
    } catch (error) {
      logger.error("Error fetching expiring subscriptions:", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch expiring subscriptions",
        error: error.message,
      });
    }
  }
);

// Manual upgrade subscription
app.patch(
  "/super-admin/subscriptions/:subscriptionId/upgrade",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { subscriptionId } = req.params;
      const { newTier, prorated = false } = req.body;

      const subscription = await subscriptionsCollection.findOne({
        _id: new ObjectId(subscriptionId),
      });

      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: "Subscription not found",
        });
      }

      // Get the new plan
      const plan = await subscriptionPlansCollection.findOne({ tier: newTier });

      if (!plan) {
        return res.status(404).json({
          success: false,
          message: "Plan not found",
        });
      }

      const previousTier = subscription.tier;

      // Update subscription
      await subscriptionsCollection.updateOne(
        { _id: new ObjectId(subscriptionId) },
        {
          $set: {
            tier: newTier,
            amount: plan.monthlyPrice || plan.amount,
            status: "active",
            updatedAt: new Date(),
          },
        }
      );

      // Update organization limits
      await organizationsCollection.updateOne(
        { _id: subscription.organizationId },
        {
          $set: {
            subscriptionTier: newTier,
            subscriptionStatus: "active",
            limits: plan.limits,
            updatedAt: new Date(),
          },
        }
      );

      // Log activity
      await logSuperAdminActivity(
        req.userId,
        "upgraded_subscription",
        "subscription",
        subscriptionId,
        subscription.organizationId.toString(),
        { previousTier, newTier, prorated },
        req
      );

      res.json({
        success: true,
        message: "Subscription upgraded successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to upgrade subscription",
        error: error.message,
      });
    }
  }
);

// Manual downgrade subscription
app.patch(
  "/super-admin/subscriptions/:subscriptionId/downgrade",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { subscriptionId } = req.params;
      const { newTier, immediate = false } = req.body;

      const subscription = await subscriptionsCollection.findOne({
        _id: new ObjectId(subscriptionId),
      });

      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: "Subscription not found",
        });
      }

      const plan = await subscriptionPlansCollection.findOne({ tier: newTier });

      if (!plan) {
        return res.status(404).json({
          success: false,
          message: "Plan not found",
        });
      }

      const previousTier = subscription.tier;

      if (immediate) {
        // Immediate downgrade
        await subscriptionsCollection.updateOne(
          { _id: new ObjectId(subscriptionId) },
          {
            $set: {
              tier: newTier,
              amount: plan.monthlyPrice || plan.amount,
              updatedAt: new Date(),
            },
          }
        );

        await organizationsCollection.updateOne(
          { _id: subscription.organizationId },
          {
            $set: {
              subscriptionTier: newTier,
              limits: plan.limits,
              updatedAt: new Date(),
            },
          }
        );
      } else {
        // Downgrade at period end
        await subscriptionsCollection.updateOne(
          { _id: new ObjectId(subscriptionId) },
          {
            $set: {
              pendingDowngrade: {
                newTier,
                effectiveDate: subscription.currentPeriodEnd,
              },
              updatedAt: new Date(),
            },
          }
        );
      }

      // Log activity
      await logSuperAdminActivity(
        req.userId,
        "downgraded_subscription",
        "subscription",
        subscriptionId,
        subscription.organizationId.toString(),
        { previousTier, newTier, immediate },
        req
      );

      res.json({
        success: true,
        message: immediate
          ? "Subscription downgraded immediately"
          : "Subscription will be downgraded at the end of the current period",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to downgrade subscription",
        error: error.message,
      });
    }
  }
);

// Cancel subscription (PUT version for frontend compatibility)
app.put(
  "/super-admin/subscriptions/:subscriptionId/cancel",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { subscriptionId } = req.params;
      const { immediate = false, reason = "" } = req.body;

      const subscription = await subscriptionsCollection.findOne({
        _id: new ObjectId(subscriptionId),
      });

      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: "Subscription not found",
        });
      }

      if (immediate) {
        await subscriptionsCollection.updateOne(
          { _id: new ObjectId(subscriptionId) },
          {
            $set: {
              status: "cancelled",
              cancelledAt: new Date(),
              cancellationReason: reason,
              updatedAt: new Date(),
            },
          }
        );

        await organizationsCollection.updateOne(
          { _id: subscription.organizationId },
          {
            $set: {
              subscriptionStatus: "cancelled",
              updatedAt: new Date(),
            },
          }
        );
      } else {
        await subscriptionsCollection.updateOne(
          { _id: new ObjectId(subscriptionId) },
          {
            $set: {
              cancelAtPeriodEnd: true,
              cancellationReason: reason,
              updatedAt: new Date(),
            },
          }
        );
      }

      // Log activity
      await logSuperAdminActivity(
        req.userId,
        "cancelled_subscription",
        "subscription",
        subscriptionId,
        subscription.organizationId.toString(),
        { immediate, reason },
        req
      );

      res.json({
        success: true,
        message: immediate
          ? "Subscription cancelled immediately"
          : "Subscription will be cancelled at the end of the current period",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to cancel subscription",
        error: error.message,
      });
    }
  }
);

// Cancel subscription (PATCH version - legacy support)
app.patch(
  "/super-admin/subscriptions/:subscriptionId/cancel",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { subscriptionId } = req.params;
      const { immediate = false, reason = "" } = req.body;

      const subscription = await subscriptionsCollection.findOne({
        _id: new ObjectId(subscriptionId),
      });

      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: "Subscription not found",
        });
      }

      if (immediate) {
        await subscriptionsCollection.updateOne(
          { _id: new ObjectId(subscriptionId) },
          {
            $set: {
              status: "cancelled",
              cancelledAt: new Date(),
              cancellationReason: reason,
              updatedAt: new Date(),
            },
          }
        );

        await organizationsCollection.updateOne(
          { _id: subscription.organizationId },
          {
            $set: {
              subscriptionStatus: "cancelled",
              updatedAt: new Date(),
            },
          }
        );
      } else {
        await subscriptionsCollection.updateOne(
          { _id: new ObjectId(subscriptionId) },
          {
            $set: {
              cancelAtPeriodEnd: true,
              cancellationReason: reason,
              updatedAt: new Date(),
            },
          }
        );
      }

      // Log activity
      await logSuperAdminActivity(
        req.userId,
        "cancelled_subscription",
        "subscription",
        subscriptionId,
        subscription.organizationId.toString(),
        { immediate, reason },
        req
      );

      res.json({
        success: true,
        message: immediate
          ? "Subscription cancelled immediately"
          : "Subscription will be cancelled at the end of the current period",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to cancel subscription",
        error: error.message,
      });
    }
  }
);

// Extend trial
app.patch(
  "/super-admin/subscriptions/:subscriptionId/extend-trial",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { subscriptionId } = req.params;
      const { additionalDays = 14 } = req.body;

      const subscription = await subscriptionsCollection.findOne({
        _id: new ObjectId(subscriptionId),
      });

      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: "Subscription not found",
        });
      }

      const currentTrialEnd = subscription.trialEndDate || new Date();
      const newTrialEnd = new Date(currentTrialEnd);
      newTrialEnd.setDate(newTrialEnd.getDate() + parseInt(additionalDays));

      await subscriptionsCollection.updateOne(
        { _id: new ObjectId(subscriptionId) },
        {
          $set: {
            trialEndDate: newTrialEnd,
            currentPeriodEnd: newTrialEnd,
            nextBillingDate: newTrialEnd,
            status: "trial",
            updatedAt: new Date(),
          },
        }
      );

      await organizationsCollection.updateOne(
        { _id: subscription.organizationId },
        {
          $set: {
            subscriptionStatus: "trial",
            updatedAt: new Date(),
          },
        }
      );

      // Log activity
      await logSuperAdminActivity(
        req.userId,
        "extended_trial",
        "subscription",
        subscriptionId,
        subscription.organizationId.toString(),
        {
          additionalDays,
          previousTrialEnd: currentTrialEnd,
          newTrialEnd,
        },
        req
      );

      res.json({
        success: true,
        message: `Trial extended by ${additionalDays} days`,
        data: { newTrialEnd },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to extend trial",
        error: error.message,
      });
    }
  }
);

// Extend subscription (add days to end date)
app.put(
  "/super-admin/subscriptions/:subscriptionId/extend",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { subscriptionId } = req.params;
      const { days = 30 } = req.body;

      const subscription = await subscriptionsCollection.findOne({
        _id: new ObjectId(subscriptionId),
      });

      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: "Subscription not found",
        });
      }

      const currentEndDate = subscription.currentPeriodEnd || new Date();
      const newEndDate = new Date(currentEndDate);
      newEndDate.setDate(newEndDate.getDate() + parseInt(days));

      const nextBilling = new Date(newEndDate);
      nextBilling.setDate(nextBilling.getDate() + 1);

      await subscriptionsCollection.updateOne(
        { _id: new ObjectId(subscriptionId) },
        {
          $set: {
            currentPeriodEnd: newEndDate,
            nextBillingDate: nextBilling,
            updatedAt: new Date(),
          },
        }
      );

      // Log activity
      await logSuperAdminActivity(
        req.userId,
        "extended_subscription",
        "subscription",
        subscriptionId,
        subscription.organizationId.toString(),
        {
          days,
          previousEndDate: currentEndDate,
          newEndDate,
        },
        req
      );

      res.json({
        success: true,
        message: `Subscription extended by ${days} days`,
        data: { newEndDate },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to extend subscription",
        error: error.message,
      });
    }
  }
);

// Reactivate cancelled or expired subscription
app.put(
  "/super-admin/subscriptions/:subscriptionId/reactivate",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { subscriptionId } = req.params;

      const subscription = await subscriptionsCollection.findOne({
        _id: new ObjectId(subscriptionId),
      });

      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: "Subscription not found",
        });
      }

      if (subscription.status === "active") {
        return res.status(400).json({
          success: false,
          message: "Subscription is already active",
        });
      }

      // Set new period dates
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      await subscriptionsCollection.updateOne(
        { _id: new ObjectId(subscriptionId) },
        {
          $set: {
            status: "active",
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            nextBillingDate: periodEnd,
            cancelAtPeriodEnd: false,
            cancelledAt: null,
            updatedAt: new Date(),
          },
        }
      );

      await organizationsCollection.updateOne(
        { _id: subscription.organizationId },
        {
          $set: {
            subscriptionStatus: "active",
            updatedAt: new Date(),
          },
        }
      );

      // Log activity
      await logSuperAdminActivity(
        req.userId,
        "reactivated_subscription",
        "subscription",
        subscriptionId,
        subscription.organizationId.toString(),
        { previousStatus: subscription.status },
        req
      );

      res.json({
        success: true,
        message: "Subscription reactivated successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to reactivate subscription",
        error: error.message,
      });
    }
  }
);

// Change subscription plan
app.put(
  "/super-admin/subscriptions/:subscriptionId/change-plan",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { subscriptionId } = req.params;
      const { planId } = req.body;

      const subscription = await subscriptionsCollection.findOne({
        _id: new ObjectId(subscriptionId),
      });

      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: "Subscription not found",
        });
      }

      const newPlan = await subscriptionPlansCollection.findOne({
        _id: new ObjectId(planId),
      });

      if (!newPlan) {
        return res.status(404).json({
          success: false,
          message: "Plan not found",
        });
      }

      const previousPlanId = subscription.planId;
      const previousTier = subscription.tier;

      await subscriptionsCollection.updateOne(
        { _id: new ObjectId(subscriptionId) },
        {
          $set: {
            planId: new ObjectId(planId),
            tier: newPlan.tier || newPlan.name,
            amount: newPlan.price?.monthly || newPlan.monthlyPrice || newPlan.amount,
            updatedAt: new Date(),
          },
        }
      );

      await organizationsCollection.updateOne(
        { _id: subscription.organizationId },
        {
          $set: {
            subscriptionTier: newPlan.tier || newPlan.name,
            limits: newPlan.limits || {},
            updatedAt: new Date(),
          },
        }
      );

      // Log activity
      await logSuperAdminActivity(
        req.userId,
        "changed_subscription_plan",
        "subscription",
        subscriptionId,
        subscription.organizationId.toString(),
        {
          previousPlanId: previousPlanId?.toString(),
          previousTier,
          newPlanId: planId,
          newTier: newPlan.tier || newPlan.name,
        },
        req
      );

      res.json({
        success: true,
        message: "Subscription plan changed successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to change subscription plan",
        error: error.message,
      });
    }
  }
);

// Get payments for a specific subscription
app.get(
  "/super-admin/subscriptions/:subscriptionId/payments",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { subscriptionId } = req.params;

      const subscription = await subscriptionsCollection.findOne({
        _id: new ObjectId(subscriptionId),
      });

      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: "Subscription not found",
        });
      }

      const payments = await paymentsCollection
        .find({ organizationId: subscription.organizationId })
        .sort({ paymentDate: -1, createdAt: -1 })
        .toArray();

      // Calculate totals
      const totalPaid = payments
        .filter((p) => p.status === "completed")
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      const outstanding = payments
        .filter((p) => p.status === "pending")
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      res.json({
        success: true,
        data: {
          payments: payments.map((p) => ({
            _id: p._id,
            amount: p.amount,
            status: p.status,
            method: p.paymentMethod,
            reference: p.invoiceNumber || p.transactionId,
            date: p.paymentDate || p.createdAt,
            notes: p.notes,
          })),
          totalPaid,
          outstanding,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch payments",
        error: error.message,
      });
    }
  }
);

// Add manual payment (alternative endpoint name for frontend compatibility)
app.post(
  "/super-admin/subscriptions/:subscriptionId/payments",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { subscriptionId } = req.params;
      const { amount, method, reference, notes } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Valid amount is required",
        });
      }

      const subscription = await subscriptionsCollection.findOne({
        _id: new ObjectId(subscriptionId),
      });

      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: "Subscription not found",
        });
      }

      // Create payment record
      const payment = {
        organizationId: subscription.organizationId,
        subscriptionId: new ObjectId(subscriptionId),
        amount: parseFloat(amount),
        currency: subscription.currency || "BDT",
        status: "completed",
        paymentMethod: method || "manual",
        paymentDate: new Date(),
        invoiceNumber: reference,
        notes,
        recordedBy: req.userId,
        isManualPayment: true,
        createdAt: new Date(),
      };

      const result = await paymentsCollection.insertOne(payment);

      // Update subscription status to active if it was cancelled/expired
      if (["cancelled", "expired", "trial"].includes(subscription.status)) {
        const nextBillingDate = new Date();
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

        await subscriptionsCollection.updateOne(
          { _id: new ObjectId(subscriptionId) },
          {
            $set: {
              status: "active",
              currentPeriodStart: new Date(),
              currentPeriodEnd: nextBillingDate,
              nextBillingDate,
              updatedAt: new Date(),
            },
          }
        );

        await organizationsCollection.updateOne(
          { _id: subscription.organizationId },
          {
            $set: {
              subscriptionStatus: "active",
              updatedAt: new Date(),
            },
          }
        );
      }

      // Log activity
      await logSuperAdminActivity(
        req.userId,
        "added_manual_payment",
        "payment",
        result.insertedId.toString(),
        subscription.organizationId.toString(),
        { amount, method, notes },
        req
      );

      res.status(201).json({
        success: true,
        message: "Payment added successfully",
        data: { paymentId: result.insertedId },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to add payment",
        error: error.message,
      });
    }
  }
);

// Record manual payment
app.post(
  "/super-admin/subscriptions/:subscriptionId/manual-payment",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { subscriptionId } = req.params;
      const { amount, paymentMethod, paymentDate, notes } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Valid amount is required",
        });
      }

      const subscription = await subscriptionsCollection.findOne({
        _id: new ObjectId(subscriptionId),
      });

      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: "Subscription not found",
        });
      }

      // Create payment record
      const payment = {
        organizationId: subscription.organizationId,
        subscriptionId: new ObjectId(subscriptionId),
        amount: parseFloat(amount),
        currency: subscription.currency || "BDT",
        status: "completed",
        paymentMethod: paymentMethod || "manual",
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        notes,
        recordedBy: req.userId,
        isManualPayment: true,
        createdAt: new Date(),
      };

      const result = await paymentsCollection.insertOne(payment);

      // Update subscription status to active if it was cancelled/expired
      if (["cancelled", "expired", "trial"].includes(subscription.status)) {
        const nextBillingDate = new Date();
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

        await subscriptionsCollection.updateOne(
          { _id: new ObjectId(subscriptionId) },
          {
            $set: {
              status: "active",
              currentPeriodStart: new Date(),
              currentPeriodEnd: nextBillingDate,
              nextBillingDate,
              updatedAt: new Date(),
            },
          }
        );

        await organizationsCollection.updateOne(
          { _id: subscription.organizationId },
          {
            $set: {
              subscriptionStatus: "active",
              updatedAt: new Date(),
            },
          }
        );
      }

      // Log activity
      await logSuperAdminActivity(
        req.userId,
        "recorded_manual_payment",
        "payment",
        result.insertedId.toString(),
        subscription.organizationId.toString(),
        { amount, paymentMethod, notes },
        req
      );

      res.status(201).json({
        success: true,
        message: "Payment recorded successfully",
        data: { paymentId: result.insertedId },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to record payment",
        error: error.message,
      });
    }
  }
);

// List all payments
app.get(
  "/super-admin/subscriptions/payments/list",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        status = "",
        org = "",
        dateFrom = "",
        dateTo = "",
      } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const query = {};

      if (status) {
        query.status = status;
      }

      if (org) {
        query.organizationId = new ObjectId(org);
      }

      if (dateFrom || dateTo) {
        query.paymentDate = {};
        if (dateFrom) {
          query.paymentDate.$gte = new Date(dateFrom);
        }
        if (dateTo) {
          query.paymentDate.$lte = new Date(dateTo);
        }
      }

      const total = await paymentsCollection.countDocuments(query);

      const payments = await paymentsCollection
        .aggregate([
          { $match: query },
          { $sort: { paymentDate: -1, createdAt: -1 } },
          { $skip: skip },
          { $limit: parseInt(limit) },
          {
            $lookup: {
              from: "organizations",
              localField: "organizationId",
              foreignField: "_id",
              as: "orgData",
            },
          },
          { $unwind: { path: "$orgData", preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 1,
              amount: 1,
              currency: 1,
              status: 1,
              paymentMethod: 1,
              paymentDate: 1,
              invoiceNumber: 1,
              isManualPayment: 1,
              createdAt: 1,
              organization: {
                _id: "$orgData._id",
                name: "$orgData.name",
              },
            },
          },
        ])
        .toArray();

      res.json({
        success: true,
        data: {
          payments,
          pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / parseInt(limit)),
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch payments",
        error: error.message,
      });
    }
  }
);

// ==================== SUPER ADMIN: PLANS ====================

// List all subscription plans
app.get(
  "/super-admin/plans",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const plans = await subscriptionPlansCollection
        .find({})
        .sort({ displayOrder: 1, createdAt: 1 })
        .toArray();

      res.json({
        success: true,
        data: plans,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch plans",
        error: error.message,
      });
    }
  }
);

// Create subscription plan
app.post(
  "/super-admin/plans",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const {
        tier,
        name,
        description,
        monthlyPrice,
        yearlyPrice,
        currency = "BDT",
        limits,
        features,
        isPopular = false,
        isActive = true,
        displayOrder = 0,
      } = req.body;

      // Validation
      if (!tier || !name) {
        return res.status(400).json({
          success: false,
          message: "Tier and name are required",
        });
      }

      // Check if tier already exists
      const existing = await subscriptionPlansCollection.findOne({ tier });

      if (existing) {
        return res.status(409).json({
          success: false,
          message: "Plan with this tier already exists",
        });
      }

      // If isPopular is true, unset it from other plans
      if (isPopular) {
        await subscriptionPlansCollection.updateMany(
          { isPopular: true },
          { $set: { isPopular: false } }
        );
      }

      const plan = {
        tier,
        name,
        description: description || "",
        monthlyPrice: monthlyPrice || 0,
        yearlyPrice: yearlyPrice || 0,
        currency,
        limits: limits || {
          maxStudents: 50,
          maxBatches: 3,
          maxStaff: 2,
          maxStorage: 100,
        },
        features: features || [],
        isPopular,
        isActive,
        displayOrder,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await subscriptionPlansCollection.insertOne(plan);

      // Log activity
      await logSuperAdminActivity(
        req.userId,
        "created",
        "subscription_plan",
        result.insertedId.toString(),
        null,
        { tier, name, monthlyPrice },
        req
      );

      res.status(201).json({
        success: true,
        message: "Plan created successfully",
        data: { planId: result.insertedId },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to create plan",
        error: error.message,
      });
    }
  }
);

// Update subscription plan
app.patch(
  "/super-admin/plans/:planId",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { planId } = req.params;
      const updates = req.body;

      const currentPlan = await subscriptionPlansCollection.findOne({
        _id: new ObjectId(planId),
      });

      if (!currentPlan) {
        return res.status(404).json({
          success: false,
          message: "Plan not found",
        });
      }

      // Remove fields that shouldn't be updated
      delete updates._id;
      delete updates.createdAt;

      // If isPopular is being set to true, unset it from other plans
      if (updates.isPopular === true) {
        await subscriptionPlansCollection.updateMany(
          { _id: { $ne: new ObjectId(planId) }, isPopular: true },
          { $set: { isPopular: false } }
        );
      }

      updates.updatedAt = new Date();

      await subscriptionPlansCollection.updateOne(
        { _id: new ObjectId(planId) },
        { $set: updates }
      );

      // Log activity
      await logSuperAdminActivity(
        req.userId,
        "updated",
        "subscription_plan",
        planId,
        null,
        { before: currentPlan, after: updates },
        req
      );

      res.json({
        success: true,
        message: "Plan updated successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to update plan",
        error: error.message,
      });
    }
  }
);

// Delete subscription plan (soft delete)
app.delete(
  "/super-admin/plans/:planId",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { planId } = req.params;

      const plan = await subscriptionPlansCollection.findOne({
        _id: new ObjectId(planId),
      });

      if (!plan) {
        return res.status(404).json({
          success: false,
          message: "Plan not found",
        });
      }

      // Soft delete by marking as inactive
      await subscriptionPlansCollection.updateOne(
        { _id: new ObjectId(planId) },
        {
          $set: {
            isActive: false,
            deletedAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );

      // Log activity
      await logSuperAdminActivity(
        req.userId,
        "deleted",
        "subscription_plan",
        planId,
        null,
        { tier: plan.tier, name: plan.name },
        req
      );

      res.json({
        success: true,
        message: "Plan deleted successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to delete plan",
        error: error.message,
      });
    }
  }
);

// Toggle plan popularity
app.patch(
  "/super-admin/plans/:planId/toggle-popular",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { planId } = req.params;

      const plan = await subscriptionPlansCollection.findOne({
        _id: new ObjectId(planId),
      });

      if (!plan) {
        return res.status(404).json({
          success: false,
          message: "Plan not found",
        });
      }

      const newIsPopular = !plan.isPopular;

      // If setting to popular, unset from other plans
      if (newIsPopular) {
        await subscriptionPlansCollection.updateMany(
          { _id: { $ne: new ObjectId(planId) }, isPopular: true },
          { $set: { isPopular: false } }
        );
      }

      await subscriptionPlansCollection.updateOne(
        { _id: new ObjectId(planId) },
        {
          $set: {
            isPopular: newIsPopular,
            updatedAt: new Date(),
          },
        }
      );

      res.json({
        success: true,
        message: `Plan ${newIsPopular ? "marked as" : "unmarked from"} most popular`,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to toggle plan popularity",
        error: error.message,
      });
    }
  }
);

// ==================== SUPER ADMIN: ACTIVITY LOGS ====================

// List platform-wide activity logs
app.get(
  "/super-admin/activity-logs",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 50,
        org = "",
        user = "",
        action = "",
        resource = "",
        dateFrom = "",
        dateTo = "",
        search = "",
      } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const query = {};

      if (org) {
        query.organizationId = new ObjectId(org);
      }

      if (user) {
        query.userId = new ObjectId(user);
      }

      if (action) {
        query.action = { $regex: action, $options: "i" };
      }

      if (resource) {
        query.resource = resource;
      }

      if (search) {
        query.resourceId = { $regex: search, $options: "i" };
      }

      if (dateFrom || dateTo) {
        query.createdAt = {};
        if (dateFrom) {
          query.createdAt.$gte = new Date(dateFrom);
        }
        if (dateTo) {
          query.createdAt.$lte = new Date(dateTo);
        }
      }

      const total = await activityLogsCollection.countDocuments(query);

      const logs = await activityLogsCollection
        .aggregate([
          { $match: query },
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: parseInt(limit) },
          {
            $lookup: {
              from: "organizations",
              localField: "organizationId",
              foreignField: "_id",
              as: "orgData",
            },
          },
          { $unwind: { path: "$orgData", preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: "users",
              localField: "userId",
              foreignField: "_id",
              as: "userData",
            },
          },
          { $unwind: { path: "$userData", preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 1,
              action: 1,
              resource: 1,
              resourceId: 1,
              changes: 1,
              ipAddress: 1,
              userAgent: 1,
              isSuperAdminAction: 1,
              createdAt: 1,
              user: {
                _id: "$userData._id",
                name: "$userData.name",
                email: "$userData.email",
              },
              organization: {
                _id: "$orgData._id",
                name: "$orgData.name",
              },
            },
          },
        ])
        .toArray();

      res.json({
        success: true,
        data: {
          logs,
          pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / parseInt(limit)),
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch activity logs",
        error: error.message,
      });
    }
  }
);

// Get detailed activity log
app.get(
  "/super-admin/activity-logs/:logId",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { logId } = req.params;

      const log = await activityLogsCollection
        .aggregate([
          { $match: { _id: new ObjectId(logId) } },
          {
            $lookup: {
              from: "organizations",
              localField: "organizationId",
              foreignField: "_id",
              as: "orgData",
            },
          },
          { $unwind: { path: "$orgData", preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: "users",
              localField: "userId",
              foreignField: "_id",
              as: "userData",
            },
          },
          { $unwind: { path: "$userData", preserveNullAndEmptyArrays: true } },
        ])
        .toArray();

      if (!log || log.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Activity log not found",
        });
      }

      const logData = log[0];
      logData.user = {
        _id: logData.userData?._id,
        name: logData.userData?.name,
        email: logData.userData?.email,
      };
      logData.organization = {
        _id: logData.orgData?._id,
        name: logData.orgData?.name,
      };
      delete logData.userData;
      delete logData.orgData;

      res.json({
        success: true,
        data: logData,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch activity log",
        error: error.message,
      });
    }
  }
);

// Export activity logs as CSV
app.get(
  "/super-admin/activity-logs/export/csv",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const {
        org = "",
        user = "",
        action = "",
        resource = "",
        dateFrom = "",
        dateTo = "",
      } = req.query;

      const query = {};

      if (org) {
        query.organizationId = new ObjectId(org);
      }

      if (user) {
        query.userId = new ObjectId(user);
      }

      if (action) {
        query.action = { $regex: action, $options: "i" };
      }

      if (resource) {
        query.resource = resource;
      }

      if (dateFrom || dateTo) {
        query.createdAt = {};
        if (dateFrom) {
          query.createdAt.$gte = new Date(dateFrom);
        }
        if (dateTo) {
          query.createdAt.$lte = new Date(dateTo);
        }
      }

      const logs = await activityLogsCollection
        .aggregate([
          { $match: query },
          { $sort: { createdAt: -1 } },
          { $limit: 10000 }, // Limit export to 10k rows
          {
            $lookup: {
              from: "organizations",
              localField: "organizationId",
              foreignField: "_id",
              as: "orgData",
            },
          },
          { $unwind: { path: "$orgData", preserveNullAndEmptyArrays: true } },
        ])
        .toArray();

      // Create CSV
      const csvHeader = "Date,User,Organization,Action,Resource,Resource ID\n";
      const csvRows = logs
        .map((log) => {
          return `"${new Date(log.createdAt).toISOString()}","${log.userName || ""}","${log.orgData?.name || ""}","${log.action}","${log.resource}","${log.resourceId || ""}"`;
        })
        .join("\n");

      const csv = csvHeader + csvRows;

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=activity_logs_${new Date().toISOString().split("T")[0]}.csv`
      );
      res.send(csv);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to export activity logs",
        error: error.message,
      });
    }
  }
);

// ==================== SUPER ADMIN: ANALYTICS ====================

// Comprehensive analytics endpoint
app.get(
  "/super-admin/analytics",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { timeRange = "month" } = req.query;

      // Calculate date ranges
      let days = 30;
      let previousDays = 30;
      switch (timeRange) {
        case "week":
          days = 7;
          previousDays = 7;
          break;
        case "month":
          days = 30;
          previousDays = 30;
          break;
        case "quarter":
          days = 90;
          previousDays = 90;
          break;
        case "year":
          days = 365;
          previousDays = 365;
          break;
        default:
          days = 30;
          previousDays = 30;
      }

      const now = new Date();
      const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      const previousStartDate = new Date(startDate.getTime() - previousDays * 24 * 60 * 60 * 1000);

      // Organizations Analytics
      const totalOrgs = await organizationsCollection.countDocuments({
        status: { $ne: "deleted" },
      });

      const newOrgs = await organizationsCollection.countDocuments({
        createdAt: { $gte: startDate },
        status: { $ne: "deleted" },
      });

      const previousOrgs = await organizationsCollection.countDocuments({
        createdAt: { $gte: previousStartDate, $lt: startDate },
        status: { $ne: "deleted" },
      });

      const orgGrowthRate = previousOrgs > 0
        ? ((newOrgs - previousOrgs) / previousOrgs * 100).toFixed(1)
        : 0;

      const orgsByStatus = {
        active: await organizationsCollection.countDocuments({ status: "active" }),
        trial: await organizationsCollection.countDocuments({ status: "trial" }),
        suspended: await organizationsCollection.countDocuments({ status: "suspended" }),
      };

      // Users Analytics
      const totalUsers = await usersCollection.countDocuments({});

      const newUsers = await usersCollection.countDocuments({
        createdAt: { $gte: startDate },
      });

      const previousUsers = await usersCollection.countDocuments({
        createdAt: { $gte: previousStartDate, $lt: startDate },
      });

      const userGrowthRate = previousUsers > 0
        ? ((newUsers - previousUsers) / previousUsers * 100).toFixed(1)
        : 0;

      const usersByRole = await usersCollection
        .aggregate([
          {
            $group: {
              _id: "$role",
              count: { $sum: 1 },
            },
          },
          {
            $project: {
              role: "$_id",
              count: 1,
              _id: 0,
            },
          },
        ])
        .toArray();

      // Subscriptions Analytics
      const activeSubscriptions = await subscriptionsCollection.countDocuments({
        status: "active",
      });

      const newSubscriptions = await subscriptionsCollection.countDocuments({
        createdAt: { $gte: startDate },
        status: "active",
      });

      const previousSubscriptions = await subscriptionsCollection.countDocuments({
        createdAt: { $gte: previousStartDate, $lt: startDate },
        status: "active",
      });

      const subGrowthRate = previousSubscriptions > 0
        ? ((newSubscriptions - previousSubscriptions) / previousSubscriptions * 100).toFixed(1)
        : 0;

      const totalSubscriptions = await subscriptionsCollection.countDocuments({});

      const subscriptionsByPlan = await subscriptionsCollection
        .aggregate([
          { $match: { status: { $in: ["active", "trial"] } } },
          {
            $group: {
              _id: "$tier",
              count: { $sum: 1 },
            },
          },
          {
            $project: {
              name: "$_id",
              count: 1,
              _id: 0,
            },
          },
        ])
        .toArray();

      // Revenue Analytics (if payments collection exists)
      let totalRevenue = 0;
      let revenueGrowthRate = 0;
      let revenueBreakdown = [];

      try {
        const revenueResult = await paymentsCollection
          .aggregate([
            {
              $match: {
                status: "completed",
                paymentDate: { $gte: startDate },
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: "$amount" },
              },
            },
          ])
          .toArray();

        totalRevenue = revenueResult[0]?.total || 0;

        const previousRevenueResult = await paymentsCollection
          .aggregate([
            {
              $match: {
                status: "completed",
                paymentDate: { $gte: previousStartDate, $lt: startDate },
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: "$amount" },
              },
            },
          ])
          .toArray();

        const previousRevenue = previousRevenueResult[0]?.total || 0;

        revenueGrowthRate = previousRevenue > 0
          ? ((totalRevenue - previousRevenue) / previousRevenue * 100).toFixed(1)
          : 0;

        // Revenue breakdown by date
        revenueBreakdown = await paymentsCollection
          .aggregate([
            {
              $match: {
                status: "completed",
                paymentDate: { $gte: startDate },
              },
            },
            {
              $group: {
                _id: {
                  $dateToString: { format: "%Y-%m-%d", date: "$paymentDate" }
                },
                amount: { $sum: "$amount" },
              },
            },
            {
              $project: {
                date: "$_id",
                amount: 1,
                _id: 0,
              },
            },
            { $sort: { date: -1 } },
            { $limit: 10 },
          ])
          .toArray();
      } catch (error) {
        // Payments collection might not exist, just continue
      }

      // Growth data (organizations over time)
      const growthData = await organizationsCollection
        .aggregate([
          {
            $match: {
              createdAt: { $gte: startDate },
              status: { $ne: "deleted" },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
              },
              count: { $sum: 1 },
            },
          },
          {
            $project: {
              date: "$_id",
              count: 1,
              _id: 0,
            },
          },
          { $sort: { date: -1 } },
          { $limit: 30 },
        ])
        .toArray();

      // Top Organizations
      const topOrganizations = await organizationsCollection
        .aggregate([
          { $match: { status: { $ne: "deleted" } } },
          {
            $lookup: {
              from: "users",
              localField: "_id",
              foreignField: "organizationId",
              as: "users",
            },
          },
          {
            $lookup: {
              from: "students",
              localField: "_id",
              foreignField: "organizationId",
              as: "students",
            },
          },
          {
            $lookup: {
              from: "subscriptions",
              localField: "_id",
              foreignField: "organizationId",
              as: "subscription",
            },
          },
          { $unwind: { path: "$subscription", preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 1,
              name: 1,
              userCount: { $size: "$users" },
              studentCount: { $size: "$students" },
              planName: "$subscription.tier",
              revenue: { $ifNull: ["$subscription.amount", 0] },
            },
          },
          { $sort: { userCount: -1, studentCount: -1 } },
          { $limit: 10 },
        ])
        .toArray();

      // Construct response
      const analyticsData = {
        organizations: {
          total: totalOrgs,
          growthRate: parseFloat(orgGrowthRate),
          byStatus: orgsByStatus,
        },
        users: {
          total: totalUsers,
          growthRate: parseFloat(userGrowthRate),
          byRole: usersByRole,
        },
        subscriptions: {
          active: activeSubscriptions,
          total: totalSubscriptions,
          growthRate: parseFloat(subGrowthRate),
          byPlan: subscriptionsByPlan,
        },
        revenue: {
          total: totalRevenue,
          growthRate: parseFloat(revenueGrowthRate),
          breakdown: revenueBreakdown,
        },
        growth: {
          organizations: growthData,
        },
        topOrganizations: topOrganizations,
      };

      res.json({
        success: true,
        data: analyticsData,
      });
    } catch (error) {
      logger.error("Analytics error:", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch analytics",
        error: error.message,
      });
    }
  }
);

// Revenue analytics
app.get(
  "/super-admin/analytics/revenue",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { period = "12months" } = req.query;

      let months = 12;
      switch (period) {
        case "6months":
          months = 6;
          break;
        case "30days":
          months = 1;
          break;
        default:
          months = 12;
      }

      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      // MRR (current monthly active subscriptions)
      const mrrResult = await subscriptionsCollection
        .aggregate([
          {
            $match: {
              status: "active",
              billingCycle: "monthly",
            },
          },
          {
            $group: {
              _id: null,
              mrr: { $sum: "$amount" },
            },
          },
        ])
        .toArray();

      const mrr = mrrResult[0]?.mrr || 0;
      const arr = mrr * 12;

      // Total revenue
      const totalRevenueResult = await paymentsCollection
        .aggregate([
          {
            $match: {
              status: "completed",
            },
          },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: "$amount" },
            },
          },
        ])
        .toArray();

      const totalRevenue = totalRevenueResult[0]?.totalRevenue || 0;

      // Revenue trend
      const trend = await paymentsCollection
        .aggregate([
          {
            $match: {
              status: "completed",
              paymentDate: { $gte: startDate },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m", date: "$paymentDate" },
              },
              revenue: { $sum: "$amount" },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ])
        .toArray();

      // Calculate growth
      let growth = 0;
      if (trend.length >= 2) {
        const currentMonth = trend[trend.length - 1]?.revenue || 0;
        const prevMonth = trend[trend.length - 2]?.revenue || 0;
        growth = prevMonth > 0 ? ((currentMonth - prevMonth) / prevMonth) * 100 : 0;
      }

      res.json({
        success: true,
        data: {
          summary: {
            mrr,
            arr,
            totalRevenue,
            growth: parseFloat(growth.toFixed(2)),
          },
          trend: trend.map((t) => ({
            period: t._id,
            revenue: t.revenue,
            mrr, // Simplified: current MRR for all months
          })),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch revenue analytics",
        error: error.message,
      });
    }
  }
);

// Growth analytics
app.get(
  "/super-admin/analytics/growth",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { period = "12months" } = req.query;

      let months = 12;
      switch (period) {
        case "6months":
          months = 6;
          break;
        default:
          months = 12;
      }

      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      // Organization growth
      const orgGrowth = await organizationsCollection
        .aggregate([
          {
            $match: {
              createdAt: { $gte: startDate },
              status: { $ne: "deleted" },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m", date: "$createdAt" },
              },
              new: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ])
        .toArray();

      // User growth
      const userGrowth = await usersCollection
        .aggregate([
          {
            $match: {
              createdAt: { $gte: startDate },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m", date: "$createdAt" },
              },
              new: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ])
        .toArray();

      // Calculate cumulative totals
      let orgTotal = await organizationsCollection.countDocuments({
        createdAt: { $lt: startDate },
        status: { $ne: "deleted" },
      });
      let userTotal = await usersCollection.countDocuments({
        createdAt: { $lt: startDate },
      });

      const organizations = orgGrowth.map((o) => {
        orgTotal += o.new;
        return {
          period: o._id,
          new: o.new,
          total: orgTotal,
        };
      });

      const users = userGrowth.map((u) => {
        userTotal += u.new;
        return {
          period: u._id,
          new: u.new,
          total: userTotal,
        };
      });

      res.json({
        success: true,
        data: {
          organizations,
          users,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch growth analytics",
        error: error.message,
      });
    }
  }
);

// Churn analytics
app.get(
  "/super-admin/analytics/churn",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { period = "12months" } = req.query;

      let months = 12;
      switch (period) {
        case "6months":
          months = 6;
          break;
        default:
          months = 12;
      }

      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      // Get cancelled subscriptions by month
      const cancelled = await subscriptionsCollection
        .aggregate([
          {
            $match: {
              status: "cancelled",
              cancelledAt: { $gte: startDate },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m", date: "$cancelledAt" },
              },
              cancelled: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ])
        .toArray();

      // Get total active subscriptions at each month end (simplified)
      const totalActive = await subscriptionsCollection.countDocuments({
        status: "active",
      });

      const churnData = cancelled.map((c) => ({
        period: c._id,
        cancelled: c.cancelled,
        total: totalActive + c.cancelled, // Simplified approximation
        rate: parseFloat((((c.cancelled) / (totalActive + c.cancelled)) * 100).toFixed(2)),
      }));

      res.json({
        success: true,
        data: churnData,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch churn analytics",
        error: error.message,
      });
    }
  }
);

// Top organizations by revenue
app.get(
  "/super-admin/analytics/top-organizations",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { limit = 10, period = "12months" } = req.query;

      let months = 12;
      switch (period) {
        case "6months":
          months = 6;
          break;
        default:
          months = 12;
      }

      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      const topOrgs = await paymentsCollection
        .aggregate([
          {
            $match: {
              status: "completed",
              paymentDate: { $gte: startDate },
            },
          },
          {
            $group: {
              _id: "$organizationId",
              totalRevenue: { $sum: "$amount" },
              paymentCount: { $sum: 1 },
            },
          },
          {
            $lookup: {
              from: "organizations",
              localField: "_id",
              foreignField: "_id",
              as: "orgData",
            },
          },
          { $unwind: { path: "$orgData", preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: "subscriptions",
              localField: "_id",
              foreignField: "organizationId",
              as: "subData",
            },
          },
          { $unwind: { path: "$subData", preserveNullAndEmptyArrays: true } },
          { $sort: { totalRevenue: -1 } },
          { $limit: parseInt(limit) },
          {
            $project: {
              organization: {
                _id: "$orgData._id",
                name: "$orgData.name",
                slug: "$orgData.slug",
              },
              tier: "$subData.tier",
              totalRevenue: 1,
              paymentCount: 1,
            },
          },
        ])
        .toArray();

      res.json({
        success: true,
        data: topOrgs,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch top organizations",
        error: error.message,
      });
    }
  }
);

// Feature usage statistics
app.get(
  "/super-admin/analytics/feature-usage",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      // Total organizations
      const totalOrgs = await organizationsCollection.countDocuments({
        status: { $ne: "deleted" },
      });

      // Students
      const totalStudents = await studentsCollection.countDocuments({
        status: "active",
      });

      // Batches
      const totalBatches = await batchesCollection.countDocuments({
        status: "active",
      });

      // Attendance records
      const totalAttendance = await attendencesCollection.countDocuments({});

      // Exams
      const totalExams = await examsCollection.countDocuments({});

      // Fee collection
      const feeStats = await feesCollection
        .aggregate([
          {
            $group: {
              _id: null,
              totalCollected: { $sum: "$paidAmount" },
              totalRecords: { $sum: 1 },
            },
          },
        ])
        .toArray();

      const avgPerOrg = (val) => (totalOrgs > 0 ? Math.round(val / totalOrgs) : 0);

      res.json({
        success: true,
        data: {
          students: {
            total: totalStudents,
            avgPerOrg: avgPerOrg(totalStudents),
          },
          batches: {
            total: totalBatches,
            avgPerOrg: avgPerOrg(totalBatches),
          },
          attendance: {
            total: totalAttendance,
            avgPerOrg: avgPerOrg(totalAttendance),
          },
          exams: {
            total: totalExams,
            avgPerOrg: avgPerOrg(totalExams),
          },
          fees: {
            totalCollected: feeStats[0]?.totalCollected || 0,
            avgPerOrg: avgPerOrg(feeStats[0]?.totalCollected || 0),
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch feature usage",
        error: error.message,
      });
    }
  }
);

// ==================== SUPER ADMIN: REPORTS ====================

// Generate reports
app.get(
  "/super-admin/reports",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { type = "organizations", dateRange = "month", startDate, endDate } = req.query;

      // Calculate date range
      let start, end;
      if (dateRange === "custom" && startDate && endDate) {
        start = new Date(startDate);
        end = new Date(endDate);
      } else {
        end = new Date();
        switch (dateRange) {
          case "week":
            start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case "quarter":
            start = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
          case "year":
            start = new Date(end.getTime() - 365 * 24 * 60 * 60 * 1000);
            break;
          default: // month
            start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
        }
      }

      let reportData = {};

      switch (type) {
        case "organizations":
          // Organizations Report
          const organizations = await organizationsCollection
            .aggregate([
              {
                $match: {
                  status: { $ne: "deleted" },
                  ...(dateRange !== "all" && { createdAt: { $gte: start, $lte: end } }),
                },
              },
              {
                $lookup: {
                  from: "users",
                  localField: "ownerId",
                  foreignField: "_id",
                  as: "owner",
                },
              },
              { $unwind: { path: "$owner", preserveNullAndEmptyArrays: true } },
              {
                $lookup: {
                  from: "users",
                  localField: "_id",
                  foreignField: "organizationId",
                  as: "users",
                },
              },
              {
                $lookup: {
                  from: "students",
                  localField: "_id",
                  foreignField: "organizationId",
                  as: "students",
                },
              },
              {
                $project: {
                  name: 1,
                  email: 1,
                  status: 1,
                  subscriptionTier: 1,
                  subscriptionStatus: 1,
                  ownerName: "$owner.name",
                  ownerEmail: "$owner.email",
                  userCount: { $size: "$users" },
                  studentCount: { $size: "$students" },
                  createdAt: 1,
                },
              },
              { $sort: { createdAt: -1 } },
            ])
            .toArray();

          const orgSummary = {
            totalOrganizations: organizations.length,
            activeOrganizations: organizations.filter((o) => o.status === "active").length,
            trialOrganizations: organizations.filter((o) => o.status === "trial").length,
            suspendedOrganizations: organizations.filter((o) => o.status === "suspended").length,
            totalUsers: organizations.reduce((sum, o) => sum + o.userCount, 0),
            totalStudents: organizations.reduce((sum, o) => sum + o.studentCount, 0),
          };

          reportData = {
            summary: orgSummary,
            columns: [
              { key: "name", label: "Organization Name", type: "text" },
              { key: "ownerName", label: "Owner", type: "text" },
              { key: "email", label: "Email", type: "text" },
              { key: "status", label: "Status", type: "badge" },
              { key: "subscriptionTier", label: "Plan", type: "text" },
              { key: "userCount", label: "Users", type: "number" },
              { key: "studentCount", label: "Students", type: "number" },
              { key: "createdAt", label: "Created Date", type: "date" },
            ],
            rows: organizations,
            pagination: {
              total: organizations.length,
            },
          };
          break;

        case "users":
          // Users Report
          const users = await usersCollection
            .aggregate([
              {
                $match: {
                  ...(dateRange !== "all" && { createdAt: { $gte: start, $lte: end } }),
                },
              },
              {
                $lookup: {
                  from: "organizations",
                  localField: "organizationId",
                  foreignField: "_id",
                  as: "organization",
                },
              },
              { $unwind: { path: "$organization", preserveNullAndEmptyArrays: true } },
              {
                $project: {
                  name: 1,
                  email: 1,
                  role: 1,
                  status: 1,
                  isActive: 1,
                  organizationName: "$organization.name",
                  createdAt: 1,
                },
              },
              { $sort: { createdAt: -1 } },
            ])
            .toArray();

          const userSummary = {
            totalUsers: users.length,
            activeUsers: users.filter((u) => u.isActive).length,
            orgOwners: users.filter((u) => u.role === "org_owner").length,
            admins: users.filter((u) => u.role === "admin").length,
            staff: users.filter((u) => u.role === "staff").length,
          };

          reportData = {
            summary: userSummary,
            columns: [
              { key: "name", label: "Name", type: "text" },
              { key: "email", label: "Email", type: "text" },
              { key: "role", label: "Role", type: "text" },
              { key: "organizationName", label: "Organization", type: "text" },
              { key: "status", label: "Status", type: "badge" },
              { key: "createdAt", label: "Joined Date", type: "date" },
            ],
            rows: users,
            pagination: {
              total: users.length,
            },
          };
          break;

        case "subscriptions":
          // Subscriptions Report
          const subscriptions = await subscriptionsCollection
            .aggregate([
              {
                $match: {
                  ...(dateRange !== "all" && { createdAt: { $gte: start, $lte: end } }),
                },
              },
              {
                $lookup: {
                  from: "organizations",
                  localField: "organizationId",
                  foreignField: "_id",
                  as: "organization",
                },
              },
              { $unwind: { path: "$organization", preserveNullAndEmptyArrays: true } },
              {
                $project: {
                  organizationName: "$organization.name",
                  tier: 1,
                  status: 1,
                  amount: 1,
                  billingCycle: 1,
                  currentPeriodStart: 1,
                  currentPeriodEnd: 1,
                  createdAt: 1,
                },
              },
              { $sort: { createdAt: -1 } },
            ])
            .toArray();

          const subSummary = {
            totalSubscriptions: subscriptions.length,
            activeSubscriptions: subscriptions.filter((s) => s.status === "active").length,
            trialSubscriptions: subscriptions.filter((s) => s.status === "trial").length,
            cancelledSubscriptions: subscriptions.filter((s) => s.status === "cancelled").length,
            totalRevenue: subscriptions
              .filter((s) => s.status === "active")
              .reduce((sum, s) => sum + (s.amount || 0), 0),
          };

          reportData = {
            summary: subSummary,
            columns: [
              { key: "organizationName", label: "Organization", type: "text" },
              { key: "tier", label: "Plan", type: "text" },
              { key: "status", label: "Status", type: "badge" },
              { key: "amount", label: "Amount", type: "currency" },
              { key: "billingCycle", label: "Billing Cycle", type: "text" },
              { key: "currentPeriodStart", label: "Period Start", type: "date" },
              { key: "currentPeriodEnd", label: "Period End", type: "date" },
              { key: "createdAt", label: "Created Date", type: "date" },
            ],
            rows: subscriptions,
            pagination: {
              total: subscriptions.length,
            },
          };
          break;

        case "revenue":
          // Revenue Report
          let payments = [];
          let revenueSummary = {
            totalRevenue: 0,
            completedPayments: 0,
            pendingPayments: 0,
            failedPayments: 0,
            averagePayment: 0,
          };

          try {
            payments = await paymentsCollection
              .aggregate([
                {
                  $match: {
                    ...(dateRange !== "all" && { paymentDate: { $gte: start, $lte: end } }),
                  },
                },
                {
                  $lookup: {
                    from: "organizations",
                    localField: "organizationId",
                    foreignField: "_id",
                    as: "organization",
                  },
                },
                { $unwind: { path: "$organization", preserveNullAndEmptyArrays: true } },
                {
                  $project: {
                    organizationName: "$organization.name",
                    amount: 1,
                    status: 1,
                    paymentMethod: 1,
                    transactionId: 1,
                    paymentDate: 1,
                  },
                },
                { $sort: { paymentDate: -1 } },
              ])
              .toArray();

            revenueSummary = {
              totalRevenue: payments
                .filter((p) => p.status === "completed")
                .reduce((sum, p) => sum + p.amount, 0),
              completedPayments: payments.filter((p) => p.status === "completed").length,
              pendingPayments: payments.filter((p) => p.status === "pending").length,
              failedPayments: payments.filter((p) => p.status === "failed").length,
              averagePayment:
                payments.filter((p) => p.status === "completed").length > 0
                  ? payments
                      .filter((p) => p.status === "completed")
                      .reduce((sum, p) => sum + p.amount, 0) /
                    payments.filter((p) => p.status === "completed").length
                  : 0,
            };
          } catch (error) {
            // Payments collection might not exist
          }

          reportData = {
            summary: revenueSummary,
            columns: [
              { key: "organizationName", label: "Organization", type: "text" },
              { key: "amount", label: "Amount", type: "currency" },
              { key: "status", label: "Status", type: "badge" },
              { key: "paymentMethod", label: "Payment Method", type: "text" },
              { key: "transactionId", label: "Transaction ID", type: "text" },
              { key: "paymentDate", label: "Payment Date", type: "date" },
            ],
            rows: payments,
            pagination: {
              total: payments.length,
            },
          };
          break;

        default:
          return res.status(400).json({
            success: false,
            message: "Invalid report type",
          });
      }

      res.json({
        success: true,
        data: reportData,
      });
    } catch (error) {
      logger.error("Reports error:", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to generate report",
        error: error.message,
      });
    }
  }
);

// Export reports (CSV, Excel, PDF)
app.get(
  "/super-admin/reports/export",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { type = "organizations", dateRange = "month", format = "csv", startDate, endDate } = req.query;

      // Get report data (reuse logic from above)
      const params = new URLSearchParams({ type, dateRange, startDate, endDate });
      const reportResponse = await fetch(`http://localhost:3001/super-admin/reports?${params}`, {
        headers: { "x-user-email": req.userEmail },
      });
      const reportResult = await reportResponse.json();
      const reportData = reportResult.data;

      if (format === "csv") {
        // Generate CSV
        const columns = reportData.columns.map((col) => col.label);
        const csvRows = [columns.join(",")];

        reportData.rows.forEach((row) => {
          const values = reportData.columns.map((col) => {
            let value = row[col.key];
            if (col.type === "date" && value) {
              value = new Date(value).toLocaleDateString();
            } else if (col.type === "currency" && value !== undefined) {
              value = `$${value}`;
            }
            // Escape commas and quotes
            value = String(value || "").replace(/"/g, '""');
            return `"${value}"`;
          });
          csvRows.push(values.join(","));
        });

        const csv = csvRows.join("\n");
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="${type}_report.csv"`);
        res.send(csv);
      } else {
        // For Excel and PDF, return JSON for now (requires additional libraries)
        res.status(501).json({
          success: false,
          message: `${format.toUpperCase()} export not yet implemented. Please use CSV format.`,
        });
      }
    } catch (error) {
      logger.error("Export error:", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to export report",
        error: error.message,
      });
    }
  }
);

// ==================== SUPER ADMIN: PLATFORM SETTINGS ====================

// Get platform settings
app.get(
  "/super-admin/settings",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { category = "" } = req.query;

      const query = {};
      if (category) {
        query.category = category;
      }

      const settings = await platformSettingsCollection.find(query).toArray();

      // Group by category
      const grouped = {
        general: {},
        trial: {},
        email: {},
        security: {},
      };

      settings.forEach((setting) => {
        if (grouped[setting.category]) {
          grouped[setting.category][setting.key] = setting.value;
        }
      });

      // Set defaults if no settings exist
      if (Object.keys(grouped.general).length === 0) {
        grouped.general = {
          platformName: "Coaching Management System",
          supportEmail: "support@example.com",
          defaultCurrency: "BDT",
          timezone: "Asia/Dhaka",
        };
      }

      if (Object.keys(grouped.trial).length === 0) {
        grouped.trial = {
          defaultTrialPeriodDays: 14,
          allowMultipleTrials: false,
          trialPlan: "professional",
        };
      }

      if (Object.keys(grouped.email).length === 0) {
        grouped.email = {
          smtpHost: "",
          smtpPort: 587,
          fromName: "Coaching System",
          fromEmail: "",
        };
      }

      if (Object.keys(grouped.security).length === 0) {
        grouped.security = {
          sessionTimeoutMinutes: 30,
          maxLoginAttempts: 5,
          passwordMinLength: 8,
          require2FAForSuperAdmins: false,
        };
      }

      res.json({
        success: true,
        data: grouped,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch settings",
        error: error.message,
      });
    }
  }
);

// Update platform settings
app.patch(
  "/super-admin/settings",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { category, settings } = req.body;

      if (!category || !settings) {
        return res.status(400).json({
          success: false,
          message: "Category and settings are required",
        });
      }

      const validCategories = ["general", "trial", "email", "security"];
      if (!validCategories.includes(category)) {
        return res.status(400).json({
          success: false,
          message: "Invalid category",
        });
      }

      const previousSettings = {};
      const operations = [];

      for (const [key, value] of Object.entries(settings)) {
        // Get previous value for logging
        const existing = await platformSettingsCollection.findOne({
          category,
          key,
        });
        previousSettings[key] = existing?.value;

        operations.push({
          updateOne: {
            filter: { category, key },
            update: {
              $set: {
                value,
                updatedBy: req.userId,
                updatedAt: new Date(),
              },
              $setOnInsert: {
                category,
                key,
                createdAt: new Date(),
              },
            },
            upsert: true,
          },
        });
      }

      if (operations.length > 0) {
        await platformSettingsCollection.bulkWrite(operations);
      }

      // Log activity
      await logSuperAdminActivity(
        req.userId,
        "updated_settings",
        "platform_settings",
        category,
        null,
        { category, previousSettings, newSettings: settings },
        req
      );

      res.json({
        success: true,
        message: "Settings updated successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to update settings",
        error: error.message,
      });
    }
  }
);

// Test email configuration
app.post(
  "/super-admin/settings/test-email",
  ensureDBConnection,
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { recipientEmail } = req.body;

      if (!recipientEmail) {
        return res.status(400).json({
          success: false,
          message: "Recipient email is required",
        });
      }

      // In a real implementation, this would send a test email
      // using the configured SMTP settings

      // For now, we'll just simulate success
      // TODO: Implement actual email sending with nodemailer

      // Log activity
      await logSuperAdminActivity(
        req.userId,
        "tested_email_config",
        "platform_settings",
        "email",
        null,
        { recipientEmail },
        req
      );

      res.json({
        success: true,
        message: `Test email would be sent to ${recipientEmail}`,
        note: "Email sending not yet implemented",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to test email configuration",
        error: error.message,
      });
    }
  }
);

// ==================== SERVER START ====================

// Start server only in non-Vercel environment
if (process.env.NODE_ENV !== "production") {
  app.listen(port, () => {
    logger.info(`🚀 Server running on port ${port}`);
  });
}

// Export for Vercel serverless functions
export default app;
