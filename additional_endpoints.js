// ==================== ADDITIONAL API ENDPOINTS ====================
// This file contains the remaining multi-tenant API endpoints
// These should be added to index.js before the SERVER START section

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
      const { email, phone, name, status, page = 1, limit = 10 } = req.query;

      const query = { organizationId: req.organizationId };

      if (email) query.email = { $regex: email, $options: "i" };
      if (phone) query.phone = { $regex: phone, $options: "i" };
      if (name) query.name = { $regex: name, $options: "i" };
      if (status) query.status = status;

      const admissions = await admissionsCollection
        .find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * Number(limit))
        .limit(Number(limit))
        .toArray();

      const total = await admissionsCollection.countDocuments(query);

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
      const { name, phone, email, interestedBatchId } = req.body;

      if (!name || !phone) {
        return res.status(400).json({
          success: false,
          message: "Name and phone are required",
        });
      }

      const admission = {
        organizationId: req.organizationId,
        name,
        phone,
        email: email || null,
        interestedBatchId: interestedBatchId || null,
        status: "inquiry",
        followUps: [],
        createdBy: req.userId,
        updatedBy: req.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await admissionsCollection.insertOne(admission);

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
        data: { insertedId: result.insertedId },
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
      const { name, phone, email, interestedBatchId, status, followUpNote, followUpDate, followUps } = req.body;

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

      const updateDoc = { $set: {} };

      if (name) updateDoc.$set.name = name;
      if (phone) updateDoc.$set.phone = phone;
      if (email) updateDoc.$set.email = email;
      if (interestedBatchId) updateDoc.$set.interestedBatchId = interestedBatchId;
      if (status) updateDoc.$set.status = status;

      updateDoc.$set.updatedBy = req.userId;
      updateDoc.$set.updatedAt = new Date();

      if (followUps !== undefined) {
        updateDoc.$set.followUps = followUps;
      } else if (followUpNote) {
        updateDoc.$push = {
          followUps: {
            note: followUpNote,
            date: followUpDate ? new Date(followUpDate) : new Date(),
            followedUpBy: req.userId,
          },
        };
        updateDoc.$set.status = "follow-up";
      }

      await admissionsCollection.updateOne(
        { _id: new ObjectId(id) },
        updateDoc
      );

      await logActivity(
        req.userId,
        req.organizationId,
        "update",
        "admission",
        id
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

      const result = await admissionsCollection.deleteOne({
        _id: new ObjectId(id),
        organizationId: req.organizationId,
      });

      if (result.deletedCount === 0) {
        return res.status(404).json({
          success: false,
          message: "Admission not found",
        });
      }

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
      const { name, course, status, page = 1, limit = 10 } = req.query;

      const query = { organizationId: req.organizationId };

      if (name) query.name = { $regex: name, $options: "i" };
      if (course) query.course = { $regex: course, $options: "i" };
      if (status) query.status = status;

      const batches = await batchesCollection
        .find(query)
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
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
  requirePermission("create_batch"),
  async (req, res) => {
    try {
      const { name, course, schedule, totalFee, capacity, startDate, endDate, status, instructorId } = req.body;

      if (!name || !course || !schedule || !totalFee || !capacity || !startDate) {
        return res.status(400).json({
          success: false,
          message: "Required fields are missing",
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
          message: "Batch limit reached. Upgrade your plan to add more batches.",
        });
      }

      const batch = {
        organizationId: req.organizationId,
        name,
        course,
        schedule,
        totalFee: Number(totalFee),
        capacity: Number(capacity),
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        status: status || "active",
        instructorId: instructorId ? new ObjectId(instructorId) : null,
        createdBy: req.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await batchesCollection.insertOne(batch);

      // Update organization batch count
      await organizationsCollection.updateOne(
        { _id: req.organizationId },
        { $inc: { "usage.currentBatches": 1 } }
      );

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
        data: { insertedId: result.insertedId },
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

// NOTE: Add similar endpoints for FEES, ATTENDANCE, EXAMS, RESULTS, and EXPENSES
// following the same pattern as above with organization isolation
