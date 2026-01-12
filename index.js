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
let attendencesCollection;
let examsCollection;
let resultsCollection;
let expensesCollection;

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
    attendencesCollection = db.collection("attendence");
    examsCollection = db.collection("exams");
    resultsCollection = db.collection("results");
    expensesCollection = db.collection("expenses");
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

    // Auto-generate roll number for the batch
    // Find the highest roll number in this batch and increment by 1
    const studentsInBatch = await studentsCollection
      .find({ batchId })
      .sort({ roll: -1 })
      .limit(1)
      .toArray();

    const nextRoll =
      studentsInBatch.length > 0 && studentsInBatch[0].roll
        ? studentsInBatch[0].roll + 1
        : 1;

    const newStudent = {
      studentId: `STD-${Date.now()}`, // simple unique ID
      roll: nextRoll, // Auto-generated roll number per batch
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
      roll: nextRoll, // Return the generated roll number
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Failed to add student" });
  }
});

app.patch("/students/:id", ensureDBConnection, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        message: "Invalid student ID",
      });
    }

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

    const updateDoc = {
      $set: {},
    };

    // Basic info
    if (name) updateDoc.$set.name = name;
    if (image !== undefined) updateDoc.$set.image = image;
    if (gender !== undefined) updateDoc.$set.gender = gender;
    if (dob) updateDoc.$set.dob = dob;
    if (phone) updateDoc.$set.phone = phone;
    if (email !== undefined) updateDoc.$set.email = email;
    if (address !== undefined) updateDoc.$set.address = address;

    // Guardian info
    if (guardianName !== undefined) updateDoc.$set.guardianName = guardianName;
    if (guardianPhone !== undefined)
      updateDoc.$set.guardianPhone = guardianPhone;

    // Academic info
    if (previousInstitute !== undefined)
      updateDoc.$set.previousInstitute = previousInstitute;

    // If batch is being changed, regenerate roll number for new batch
    if (batchId) {
      // Get current student to check if batch is actually changing
      const currentStudent = await studentsCollection.findOne({
        _id: new ObjectId(id),
      });

      if (currentStudent && currentStudent.batchId !== batchId) {
        // Batch is changing, generate new roll number for the new batch
        const studentsInNewBatch = await studentsCollection
          .find({ batchId })
          .sort({ roll: -1 })
          .limit(1)
          .toArray();

        const nextRoll =
          studentsInNewBatch.length > 0 && studentsInNewBatch[0].roll
            ? studentsInNewBatch[0].roll + 1
            : 1;

        updateDoc.$set.roll = nextRoll;
      }

      updateDoc.$set.batchId = batchId;
    }

    // Status & documents
    if (status) updateDoc.$set.status = status;
    if (Array.isArray(documents)) updateDoc.$set.documents = documents;

    // Admission date
    if (admissionDate) updateDoc.$set.admissionDate = new Date(admissionDate);

    // If no fields provided
    if (Object.keys(updateDoc.$set).length === 0) {
      return res.status(400).send({
        message: "No valid fields provided for update",
      });
    }

    const result = await studentsCollection.updateOne(
      { _id: new ObjectId(id) },
      updateDoc
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({
        message: "Student not found",
      });
    }

    res.send({
      message: "Student updated successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: "Failed to update student",
    });
  }
});

app.delete("/students/:id", ensureDBConnection, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        message: "Invalid student ID",
      });
    }

    // Check if student exists
    const student = await studentsCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!student) {
      return res.status(404).send({
        message: "Student not found",
      });
    }

    // Delete student
    const result = await studentsCollection.deleteOne({
      _id: new ObjectId(id),
    });

    res.send({
      message: "Student deleted successfully",
      deletedId: id,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: "Failed to delete student",
    });
  }
});

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
      followUps,
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

    // Handle follow-ups: either replace array (delete) OR add new entry (add)
    // Cannot do both $set and $push on same field simultaneously
    if (followUps !== undefined) {
      // Replace entire followUps array (used when deleting a follow-up)
      console.log("Replacing followUps array with:", followUps);
      updateDoc.$set.followUps = followUps;
    } else if (followUpNote) {
      // Add follow-up entry (for add operation)
      console.log("Adding new follow-up:", followUpNote);
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
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    res.status(500).send({
      message: "Failed to update admission",
      error: error.message,
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

app.delete("/fees/:id", ensureDBConnection, async (req, res) => {
  try {
    const { id } = req.params;

    // ---------- Validation ----------
    if (!id) {
      return res.status(400).send({
        message: "Fee ID is required",
      });
    }

    // ---------- Check if fee record exists ----------
    const fee = await feesCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!fee) {
      return res.status(404).send({
        message: "Fee record not found",
      });
    }

    // ---------- Delete fee record ----------
    const result = await feesCollection.deleteOne({
      _id: new ObjectId(id),
    });

    res.send({
      message: "Fee record deleted successfully",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: "Failed to delete fee record",
    });
  }
});

// attendence api's
app.get("/attendences", ensureDBConnection, async (req, res) => {
  try {
    const { batchId, date, takenBy, page = 1, limit = 10 } = req.query;

    const query = {};

    // Filter by batch
    if (batchId) {
      query.batchId = batchId;
    }

    // Filter by date (single day)
    if (date) {
      const selectedDate = new Date(date);
      selectedDate.setHours(0, 0, 0, 0);

      const nextDay = new Date(selectedDate);
      nextDay.setDate(nextDay.getDate() + 1);

      query.date = {
        $gte: selectedDate,
        $lt: nextDay,
      };
    }

    // Filter by attendance taker
    if (takenBy) {
      query.takenBy = takenBy;
    }

    const attendences = await attendencesCollection
      .find(query)
      .sort({ date: -1 }) // latest attendance first
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .toArray();

    res.send(attendences);
  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: "Failed to fetch attendance records",
    });
  }
});

app.post("/attendences", ensureDBConnection, async (req, res) => {
  try {
    const {
      date,
      batchId,
      records, // [{ studentId, status }]
      takenBy,
    } = req.body;

    // ---------- Basic validation ----------
    if (!date || !batchId || !Array.isArray(records) || records.length === 0) {
      return res.status(400).send({
        message: "Required fields are missing",
      });
    }

    // Validate each attendance record
    for (const record of records) {
      if (
        !record.studentId ||
        !record.status ||
        !["present", "absent"].includes(record.status)
      ) {
        return res.status(400).send({
          message: "Invalid attendance record format",
        });
      }
    }

    // ---------- Prevent duplicate attendance (same date + batch) ----------
    const existingAttendance = await attendencesCollection.findOne({
      date: new Date(date),
      batchId,
    });

    if (existingAttendance) {
      return res.status(409).send({
        message: "Attendance already taken for this batch on this date",
      });
    }

    // ---------- Create attendance document ----------
    const attendanceDoc = {
      date: new Date(date),
      batchId,
      records: records.map((r) => ({
        studentId: r.studentId,
        status: r.status, // present | absent
      })),
      takenBy: takenBy || "admin", // replace later with logged-in user
      createdAt: new Date(),
    };

    const result = await attendencesCollection.insertOne(attendanceDoc);

    res.send({
      message: "Attendance recorded successfully",
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: "Failed to record attendance",
    });
  }
});

// performance api's
app.get("/exams", ensureDBConnection, async (req, res) => {
  try {
    const { batchId, name, page = 1, limit = 10 } = req.query;

    const query = {};

    if (batchId) {
      query.batchId = batchId;
    }

    if (name) {
      query.name = { $regex: name, $options: "i" };
    }

    const exams = await examsCollection
      .find(query)
      .sort({ date: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .toArray();

    res.send(exams);
  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: "Failed to fetch exams",
    });
  }
});

app.post("/exams", ensureDBConnection, async (req, res) => {
  try {
    const { name, batchId, totalMarks, date } = req.body;

    // ---------- Validation ----------
    if (!name || !batchId || !totalMarks || !date) {
      return res.status(400).send({
        message: "Required fields are missing",
      });
    }

    const exam = {
      name,
      batchId,
      totalMarks: Number(totalMarks),
      date: new Date(date),
      createdAt: new Date(),
    };

    const result = await examsCollection.insertOne(exam);

    res.status(201).send({
      message: "Exam created successfully",
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: "Failed to create exam",
    });
  }
});

app.delete("/exams", ensureDBConnection, async (req, res) => {
  try {
    const { id } = req.query;

    // ---------- Validation ----------
    if (!id) {
      return res.status(400).send({
        message: "Exam ID is required",
      });
    }

    // ---------- Check if exam exists ----------
    const exam = await examsCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!exam) {
      return res.status(404).send({
        message: "Exam not found",
      });
    }

    // ---------- Optional: prevent deletion if results exist ----------
    const relatedResults = await resultsCollection.findOne({
      examId: id,
    });

    if (relatedResults) {
      return res.status(409).send({
        message:
          "Cannot delete exam because results already exist for this exam",
      });
    }

    // ---------- Delete exam ----------
    const result = await examsCollection.deleteOne({
      _id: new ObjectId(id),
    });

    res.send({
      message: "Exam deleted successfully",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: "Failed to delete exam",
    });
  }
});

app.get("/results", ensureDBConnection, async (req, res) => {
  try {
    const { examId, studentId, page = 1, limit = 10 } = req.query;

    const query = {};

    if (examId) {
      query.examId = examId;
    }

    if (studentId) {
      query.studentId = studentId;
    }

    const results = await resultsCollection
      .find(query)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .toArray();

    res.send(results);
  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: "Failed to fetch results",
    });
  }
});

app.post("/results", ensureDBConnection, async (req, res) => {
  try {
    const { examId, studentId, marks, grade } = req.body;

    // ---------- Validation ----------
    if (!examId || !studentId || marks === undefined) {
      return res.status(400).send({
        message: "Required fields are missing",
      });
    }

    // ---------- Prevent duplicate result ----------
    const existingResult = await resultsCollection.findOne({
      examId,
      studentId,
    });

    if (existingResult) {
      return res.status(409).send({
        message: "Result already exists for this student in this exam",
      });
    }

    const resultDoc = {
      examId,
      studentId,
      marks: Number(marks),
      grade: grade || "",
      createdAt: new Date(),
    };

    const result = await resultsCollection.insertOne(resultDoc);

    res.status(201).send({
      message: "Result added successfully",
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: "Failed to add result",
    });
  }
});

app.delete("/results/:id", ensureDBConnection, async (req, res) => {
  try {
    const { id } = req.params;

    // ---------- Validation ----------
    if (!id) {
      return res.status(400).send({
        message: "Result ID is required",
      });
    }

    // ---------- Check if result exists ----------
    const resultDoc = await resultsCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!resultDoc) {
      return res.status(404).send({
        message: "Result not found",
      });
    }

    // ---------- Delete result ----------
    const result = await resultsCollection.deleteOne({
      _id: new ObjectId(id),
    });

    res.send({
      message: "Result deleted successfully",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: "Failed to delete result",
    });
  }
});

// ==================== EXPENSE MANAGEMENT ROUTES ====================

// CREATE - Add new expense
app.post("/expenses", ensureDBConnection, async (req, res) => {
  try {
    const expense = req.body;

    // Validate required fields
    if (!expense.category || !expense.amount || !expense.date) {
      return res.status(400).json({
        success: false,
        message: "Category, amount, and date are required",
      });
    }

    // Create expense document with proper structure
    const newExpense = {
      category: expense.category, // e.g., "Salary", "Utilities", "Supplies", "Maintenance", "Marketing", "Other"
      amount: parseFloat(expense.amount),
      date: new Date(expense.date),
      description: expense.description || "",
      paymentMethod: expense.paymentMethod || "cash", // cash, bank, card, online
      paidTo: expense.paidTo || "", // Person/Company name
      receiptNumber: expense.receiptNumber || "",
      notes: expense.notes || "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await expensesCollection.insertOne(newExpense);

    res.status(201).json({
      success: true,
      message: "Expense added successfully",
      expenseId: result.insertedId,
    });
  } catch (error) {
    console.error("Error adding expense:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add expense",
      error: error.message,
    });
  }
});

// READ - Get all expenses with optional filters
app.get("/expenses", ensureDBConnection, async (req, res) => {
  try {
    const { category, startDate, endDate, paymentMethod } = req.query;
    const filter = {};

    // Filter by category
    if (category) {
      filter.category = category;
    }

    // Filter by payment method
    if (paymentMethod) {
      filter.paymentMethod = paymentMethod;
    }

    // Filter by date range
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) {
        filter.date.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.date.$lte = new Date(endDate);
      }
    }

    const expenses = await expensesCollection
      .find(filter)
      .sort({ date: -1 })
      .toArray();

    res.json({
      success: true,
      count: expenses.length,
      data: expenses,
    });
  } catch (error) {
    console.error("Error fetching expenses:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch expenses",
      error: error.message,
    });
  }
});

// READ - Get single expense by ID
app.get("/expenses/:id", ensureDBConnection, async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid expense ID",
      });
    }

    const expense = await expensesCollection.findOne({ _id: new ObjectId(id) });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    res.json({
      success: true,
      data: expense,
    });
  } catch (error) {
    console.error("Error fetching expense:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch expense",
      error: error.message,
    });
  }
});

// UPDATE - Update expense by ID
app.patch("/expenses/:id", ensureDBConnection, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid expense ID",
      });
    }

    // Prepare update document
    const updateDoc = {
      $set: {
        ...updates,
        updatedAt: new Date(),
      },
    };

    // Convert amount to number if provided
    if (updates.amount) {
      updateDoc.$set.amount = parseFloat(updates.amount);
    }

    // Convert date to Date object if provided
    if (updates.date) {
      updateDoc.$set.date = new Date(updates.date);
    }

    const result = await expensesCollection.updateOne(
      { _id: new ObjectId(id) },
      updateDoc
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    res.json({
      success: true,
      message: "Expense updated successfully",
    });
  } catch (error) {
    console.error("Error updating expense:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update expense",
      error: error.message,
    });
  }
});

// DELETE - Delete expense by ID
app.delete("/expenses/:id", ensureDBConnection, async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid expense ID",
      });
    }

    const result = await expensesCollection.deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    res.json({
      success: true,
      message: "Expense deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting expense:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete expense",
      error: error.message,
    });
  }
});

// ANALYTICS - Get expense statistics
app.get("/expenses/analytics/summary", ensureDBConnection, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const matchFilter = {};

    // Filter by date range if provided
    if (startDate || endDate) {
      matchFilter.date = {};
      if (startDate) {
        matchFilter.date.$gte = new Date(startDate);
      }
      if (endDate) {
        matchFilter.date.$lte = new Date(endDate);
      }
    }

    // Aggregate expenses by category
    const categoryStats = await expensesCollection
      .aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: "$category",
            totalAmount: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { totalAmount: -1 } },
      ])
      .toArray();

    // Get total expenses
    const totalExpenses = await expensesCollection
      .aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    // Get expenses by payment method
    const paymentMethodStats = await expensesCollection
      .aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: "$paymentMethod",
            totalAmount: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    res.json({
      success: true,
      data: {
        totalExpenses: totalExpenses[0]?.total || 0,
        totalCount: totalExpenses[0]?.count || 0,
        byCategory: categoryStats,
        byPaymentMethod: paymentMethodStats,
      },
    });
  } catch (error) {
    console.error("Error fetching expense analytics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch expense analytics",
      error: error.message,
    });
  }
});

// Get distinct expense categories
app.get("/expenses/categories/list", ensureDBConnection, async (req, res) => {
  try {
    const categories = await expensesCollection.distinct("category");

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
      error: error.message,
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
