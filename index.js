import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ServerApiVersion } from "mongodb";
import { ObjectId } from "mongodb";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// middleware
app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://rootx-cms-firebase-project.web.app", // Replace with your actual frontend domain
    ],
    credentials: true,
  })
);

// encode credentials
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

// Database collections (will be initialized after connection)
let db;
let usersCollection;
let studentsCollection;
let admissionsCollection;
let batchesCollection;
let feesCollection;
let isConnected = false;

async function connectDB() {
  if (isConnected && db) {
    return;
  }

  try {
    await client.connect();
    db = client.db("roots_coaching_management_users");
    usersCollection = db.collection("users");
    studentsCollection = db.collection("students");
    admissionsCollection = db.collection("admissions");
    batchesCollection = db.collection("batches");
    feesCollection = db.collection("fees");
    isConnected = true;
    console.log("✅ Connected to MongoDB");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    isConnected = false;
    throw err;
  }
}

// Middleware to ensure DB connection
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

// Initialize database connection
connectDB().catch(console.dir);

// ==================== API ROUTES ====================

// users api's
app.post("/users", ensureDBConnection, async (req, res) => {
  try {
    const user = req.body;

    // basic validation
    if (!user.name || !user.email || !user.password || !user.role) {
      return res.status(400).send({ message: "Required fields missing" });
    }

    const newUser = {
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      password: user.password,

      image: user.image || "",

      role: user.role, // admin | manager
      status: "active",

      lastLogin: null,

      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await usersCollection.insertOne(newUser);

    res.status(201).send({
      message: "User created successfully",
      insertedId: result.insertedId,
    });
  } catch (error) {
    res.status(500).send({ message: "Failed to create user" });
  }
});

// students api's
app.get("/students", ensureDBConnection, async (req, res) => {
  try {
    const { email, page = 1, limit = 10 } = req.query;

    const query = {};

    if (email) {
      query.email = { $regex: email, $options: "i" };
    }

    const students = await studentsCollection
      .find(query)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .toArray();

    res.send(students);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Failed to fetch students" });
  }
});

app.post("/students", ensureDBConnection, async (req, res) => {
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

    // basic validation
    if (!name || !phone || !batchId) {
      return res.status(400).send({ message: "Required fields missing" });
    }

    const newStudent = {
      studentId: `STD-${Date.now()}`, // simple unique ID
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

      createdAt: new Date(),
    };

    const result = await studentsCollection.insertOne(newStudent);

    res.status(201).send({
      message: "Student added successfully",
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Failed to add student" });
  }
});

app.patch("/students/:id", ensureDBConnection, async (req, res) => {});

// admissions api's
app.get("/admissions", ensureDBConnection, async (req, res) => {
  try {
    const { email, phone, name, status, page = 1, limit = 10 } = req.query;

    const query = {};

    // Search filters
    if (email) {
      query.email = { $regex: email, $options: "i" };
    }

    if (phone) {
      query.phone = { $regex: phone, $options: "i" };
    }

    if (name) {
      query.name = { $regex: name, $options: "i" };
    }

    // Status filter
    if (status) {
      query.status = status;
    }

    const admissions = await admissionsCollection
      .find(query)
      .sort({ createdAt: -1 }) // latest first
      .skip((page - 1) * Number(limit))
      .limit(Number(limit))
      .toArray();

    res.send(admissions);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Failed to fetch admissions" });
  }
});

app.post("/admissions", ensureDBConnection, async (req, res) => {
  try {
    const { name, phone, email, interestedBatchId, createdBy } = req.body;

    // Basic validation
    if (!name || !phone) {
      return res.status(400).send({
        message: "Name and phone are required",
      });
    }

    const admission = {
      name,
      phone,
      email: email || null,
      interestedBatchId: interestedBatchId || null,

      status: "inquiry", // default status

      followUps: [],

      createdBy: createdBy || null,
      createdAt: new Date(),
    };

    const result = await admissionsCollection.insertOne(admission);

    res.status(201).send({
      message: "Admission created successfully",
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: "Failed to create admission",
    });
  }
});

app.patch("/admissions/:id", ensureDBConnection, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      phone,
      email,
      interestedBatchId,
      status,
      followUpNote,
      followUpDate,
    } = req.body;

    const updateDoc = {
      $set: {},
    };

    // Basic field updates
    if (name) updateDoc.$set.name = name;
    if (phone) updateDoc.$set.phone = phone;
    if (email) updateDoc.$set.email = email;
    if (interestedBatchId) updateDoc.$set.interestedBatchId = interestedBatchId;

    // Status update
    if (status) {
      updateDoc.$set.status = status;
      // inquiry | follow-up | enrolled | rejected
    }

    // Add follow-up entry
    if (followUpNote) {
      updateDoc.$push = {
        followUps: {
          note: followUpNote,
          date: followUpDate ? new Date(followUpDate) : new Date(),
        },
      };

      // Auto-move to follow-up stage if needed
      updateDoc.$set.status = "follow-up";
    }

    // If no update fields provided
    if (Object.keys(updateDoc.$set).length === 0 && !updateDoc.$push) {
      return res.status(400).send({
        message: "No valid fields provided for update",
      });
    }

    const result = await admissionsCollection.updateOne(
      { _id: new ObjectId(id) },
      updateDoc
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({
        message: "Admission not found",
      });
    }

    res.send({
      message: "Admission updated successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: "Failed to update admission",
    });
  }
});

app.delete("/admissions/:id", ensureDBConnection, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await admissionsCollection.deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).send({
        message: "Admission not found",
      });
    }

    res.send({
      message: "Admission deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: "Failed to delete admission",
    });
  }
});

// batches api's
app.get("/batches", ensureDBConnection, async (req, res) => {
  try {
    const { name, course, status, page = 1, limit = 10 } = req.query;

    const query = {};

    // Search filters
    if (name) {
      query.name = { $regex: name, $options: "i" };
    }

    if (course) {
      query.course = { $regex: course, $options: "i" };
    }

    // Status filter
    if (status) {
      query.status = status; // active | completed
    }

    const batches = await batchesCollection
      .find(query)
      .sort({ createdAt: -1 }) // latest first
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .toArray();

    res.send(batches);
  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: "Failed to fetch batches",
    });
  }
});

app.post("/batches", ensureDBConnection, async (req, res) => {
  try {
    const {
      name,
      course,
      schedule,
      totalFee,
      capacity,
      startDate,
      endDate,
      status,
    } = req.body;

    // Basic validation
    if (!name || !course || !schedule || !totalFee || !capacity || !startDate) {
      return res.status(400).send({
        message: "Required fields are missing",
      });
    }

    const batch = {
      name,
      course,
      schedule, // "Sun–Thu 7–9 PM"
      totalFee: Number(totalFee),
      capacity: Number(capacity),
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      status: status || "active", // active | completed
      createdAt: new Date(),
    };

    const result = await batchesCollection.insertOne(batch);

    res.send({
      message: "Batch created successfully",
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: "Failed to create batch",
    });
  }
});

// fees api's
app.get("/fees", ensureDBConnection, async (req, res) => {
  try {
    const {
      studentId,
      batchId,
      status, // clear | due
      page = 1,
      limit = 10,
    } = req.query;

    const query = {};

    // Filters
    if (studentId) {
      query.studentId = studentId;
    }

    if (batchId) {
      query.batchId = batchId;
    }

    if (status) {
      query.status = status;
    }

    const fees = await feesCollection
      .find(query)
      .sort({ createdAt: -1 }) // latest first
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .toArray();

    res.send(fees);
  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: "Failed to fetch fees",
    });
  }
});

app.post("/fees", ensureDBConnection, async (req, res) => {
  try {
    const {
      studentId,
      batchId,
      totalFee,
      paidAmount,
      paymentMethod, // cash | online (initial payment)
    } = req.body;

    // Basic validation
    if (!studentId || !batchId || !totalFee) {
      return res.status(400).send({
        message: "Required fields are missing",
      });
    }

    const paid = Number(paidAmount) || 0;
    const total = Number(totalFee);
    const due = total - paid;

    const feeDoc = {
      studentId,
      batchId,
      totalFee: total,
      paidAmount: paid,
      dueAmount: due,
      payments:
        paid > 0
          ? [
              {
                amount: paid,
                method: paymentMethod || "cash",
                date: new Date(),
              },
            ]
          : [],
      status: due === 0 ? "clear" : "due", // clear | due
      lastPaymentDate: paid > 0 ? new Date() : null,
      createdAt: new Date(),
    };

    const result = await feesCollection.insertOne(feeDoc);

    res.send({
      message: "Fee record created successfully",
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: "Failed to create fee record",
    });
  }
});

app.patch("/fees/:id", ensureDBConnection, async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, paymentMethod } = req.body;

    // Validation
    if (!amount || Number(amount) <= 0) {
      return res.status(400).send({
        message: "Valid payment amount is required",
      });
    }

    // Find existing fee record
    const fee = await feesCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!fee) {
      return res.status(404).send({
        message: "Fee record not found",
      });
    }

    const paymentAmount = Number(amount);
    const newPaidAmount = fee.paidAmount + paymentAmount;
    const newDueAmount = fee.totalFee - newPaidAmount;

    if (newPaidAmount > fee.totalFee) {
      return res.status(400).send({
        message: "Payment exceeds total fee",
      });
    }

    const updateDoc = {
      $set: {
        paidAmount: newPaidAmount,
        dueAmount: newDueAmount,
        status: newDueAmount === 0 ? "clear" : "due",
        lastPaymentDate: new Date(),
      },
      $push: {
        payments: {
          amount: paymentAmount,
          method: paymentMethod || "cash",
          date: new Date(),
        },
      },
    };

    const result = await feesCollection.updateOne(
      { _id: new ObjectId(id) },
      updateDoc
    );

    res.send({
      message: "Payment added successfully",
      updatedStatus: updateDoc.$set.status,
      dueAmount: newDueAmount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: "Failed to add payment",
    });
  }
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Rootx Coaching Management System API",
    version: "1.0.0",
    status: "Running",
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is healthy",
    timestamp: new Date().toISOString(),
  });
});

// Start server only in non-Vercel environment
if (process.env.NODE_ENV !== "production") {
  app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
  });
}

// Export for Vercel serverless functions
export default app;
