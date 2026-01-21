# Multi-Tenant Backend Implementation - README

## 🎯 Overview

This document describes the multi-tenant backend implementation for the Rootx Coaching Management System. The system has been transformed from a single-tenant application to a multi-tenant SaaS platform.

## 📦 What's Been Implemented

### 1. New Collections (6)
- ✅ `organizations` - Tenant/organization data
- ✅ `subscriptions` - Subscription management
- ✅ `subscription_plans` - Plan definitions
- ✅ `payments` - Payment transactions (structure defined, endpoints pending)
- ✅ `activity_logs` - Audit trail
- ✅ `notifications` - User notifications (structure defined, endpoints pending)

### 2. Updated Collections (9)
All existing collections now include `organizationId` for data isolation:
- ✅ `users` - Enhanced with roles, permissions, organization membership
- ✅ `students` - Organization-scoped with audit fields
- ✅ `admissions` - Organization-scoped
- ✅ `batches` - Organization-scoped
- ✅ `fees` - Organization-scoped
- ✅ `attendence` - Organization-scoped
- ✅ `exams` - Organization-scoped
- ✅ `results` - Organization-scoped
- ✅ `expenses` - Organization-scoped

### 3. Middleware
- ✅ `ensureDBConnection` - Database connection check
- ✅ `authenticateUser` - User authentication (simplified, needs Firebase Admin SDK)
- ✅ `requirePermission` - Role-based authorization
- ✅ `enforceOrganizationIsolation` - Automatic organization filtering
- ✅ `logActivity` - Activity logging function

### 4. API Endpoints Implemented

#### Organizations
- ✅ `POST /organizations` - Create organization (public signup)
- ✅ `GET /organizations/:id` - Get organization details
- ✅ `PATCH /organizations/:id` - Update organization
- ✅ `GET /organizations/:id/stats` - Organization statistics

#### Subscriptions
- ✅ `GET /subscriptions/plans` - List subscription plans
- ✅ `GET /subscriptions/:id` - Get subscription details

#### Users
- ✅ `GET /users` - List organization users
- ✅ `POST /users/invite` - Invite user to organization
- ✅ `PATCH /users/:id/role` - Update user role
- ✅ `DELETE /users/:id` - Remove user from organization

#### Students (Organization-Scoped)
- ✅ `GET /students` - List students
- ✅ `POST /students` - Create student (with limit check)
- ✅ `PATCH /students/:id` - Update student
- ✅ `DELETE /students/:id` - Delete student (soft delete)

#### Other Endpoints
Reference implementations for admissions and batches are in `additional_endpoints.js`

### 5. Scripts
- ✅ `migrate-to-multitenant.js` - Migration script for existing data
- ✅ `seed-subscription-plans.js` - Seed subscription plans
- ✅ `index.js.backup` - Backup of original single-tenant code

## 🚀 Getting Started

### Prerequisites
```bash
npm install
```

### 1. Seed Subscription Plans
```bash
node seed-subscription-plans.js
```

This will create 4 subscription tiers:
- **Free**: 50 students, 3 batches, basic features
- **Basic**: 200 students, 10 batches, ৳2,000/month
- **Professional**: 1000 students, 50 batches, ৳5,000/month (Most Popular)
- **Enterprise**: Unlimited, ৳15,000/month

### 2. Migrate Existing Data (Optional)
If you have existing data, run the migration:
```bash
node migrate-to-multitenant.js
```

This will:
- Create a "Default Organization"
- Add `organizationId` to all existing records
- Convert existing users to admins
- Set first user as organization owner
- Create enterprise subscription for default org

### 3. Start Server
```bash
npm run dev
```

## 🔐 Authentication Flow

### Current Implementation (Simplified)
The current implementation uses a simplified authentication:
```javascript
// Client sends email in header
headers: {
  'x-user-email': 'user@example.com'
}
```

### Production Implementation (Recommended)
For production, implement Firebase Admin SDK:

1. Install Firebase Admin:
```bash
npm install firebase-admin
```

2. Update `authenticateUser` middleware:
```javascript
import admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const authenticateUser = async (req, res, next) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    const user = await usersCollection.findOne({ 
      firebaseUid: decodedToken.uid 
    });
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    req.user = user;
    req.userId = user._id;
    req.organizationId = user.organizationId;
    req.userRole = user.role;
    
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};
```

## 📝 API Usage Examples

### 1. Create Organization (Signup)
```javascript
POST /organizations
{
  "name": "ABC Coaching Center",
  "slug": "abc-coaching",
  "email": "admin@abc.com",
  "phone": "01712345678",
  "ownerName": "John Doe",
  "ownerEmail": "john@abc.com",
  "ownerPassword": "password123"
}
```

### 2. Invite User
```javascript
POST /users/invite
Headers: { "x-user-email": "owner@abc.com" }
{
  "name": "Jane Smith",
  "email": "jane@abc.com",
  "role": "teacher",
  "phone": "01798765432"
}
```

### 3. Create Student (With Limit Check)
```javascript
POST /students
Headers: { "x-user-email": "owner@abc.com" }
{
  "name": "Student Name",
  "phone": "01712345678",
  "batchId": "batch123",
  "email": "student@example.com",
  "guardianName": "Guardian Name",
  "guardianPhone": "01798765432"
}
```

### 4. Get Organization Stats
```javascript
GET /organizations/:id/stats
Headers: { "x-user-email": "owner@abc.com" }

Response:
{
  "success": true,
  "data": {
    "students": { "total": 45 },
    "batches": { "total": 3 },
    "staff": { "total": 5 },
    "admissions": { "total": 12 },
    "finance": {
      "totalRevenue": 50000,
      "totalDue": 15000
    }
  }
}
```

## 🔒 Role-Based Access Control

### Roles
1. **super_admin** - Platform administrator (all permissions)
2. **org_owner** - Organization owner (all organization permissions)
3. **admin** - Organization admin (most permissions)
4. **manager** - Can manage students, batches, fees
5. **teacher** - Can mark attendance, enter results
6. **staff** - View-only access

### Permission Examples
```javascript
// Students
requirePermission("view_students")
requirePermission("create_student")
requirePermission("update_student")
requirePermission("delete_student")

// Batches
requirePermission("view_batches")
requirePermission("create_batch")

// Fees
requirePermission("view_fees")
requirePermission("collect_payment")
```

## 📊 Subscription Limits

Limits are enforced before creating resources:

```javascript
// Example: Student limit check
const org = await organizationsCollection.findOne({ _id: organizationId });

if (org.limits.maxStudents !== -1 && 
    org.usage.currentStudents >= org.limits.maxStudents) {
  return res.status(403).json({
    message: "Student limit reached. Upgrade your plan."
  });
}
```

## 🗄️ Database Indexes

All collections have been indexed for performance:

```javascript
// Students
{ organizationId: 1 }
{ organizationId: 1, studentId: 1 } (unique)
{ organizationId: 1, batchId: 1 }
{ organizationId: 1, status: 1 }

// Organizations
{ slug: 1 } (unique)
{ email: 1 } (unique)
{ subscriptionStatus: 1 }

// ... and more
```

## 🔄 Data Isolation

Every query is automatically scoped to the user's organization:

```javascript
// Middleware adds organizationId
req.organizationId = user.organizationId;

// All queries include it
const students = await studentsCollection.find({
  organizationId: req.organizationId  // Automatic isolation
});
```

## 📁 File Structure

```
rootx_coaching_management_server_side/
├── index.js                        # Main server (multi-tenant)
├── index.js.backup                 # Original single-tenant backup
├── additional_endpoints.js         # Reference for remaining endpoints
├── migrate-to-multitenant.js       # Migration script
├── seed-subscription-plans.js      # Subscription plans seeder
├── package.json
├── .env
└── vercel.json
```

## ⚠️ Important Notes

### 1. Incomplete Implementation
The current `index.js` (1466 lines) includes:
- ✅ Organizations API (complete)
- ✅ Subscriptions API (partial - missing upgrade/downgrade)
- ✅ Users API (complete)
- ✅ Students API (complete)
- ⚠️ Admissions, Batches, Fees, Attendance, Exams, Results, Expenses (reference in `additional_endpoints.js`)

**Action Required**: Copy endpoints from `additional_endpoints.js` into `index.js` before the `// SERVER START` section.

### 2. Authentication
Current implementation uses simplified auth (`x-user-email` header). For production:
- Implement Firebase Admin SDK token verification
- Add proper error handling
- Implement token refresh mechanism

### 3. Testing Required
Before deploying:
- [ ] Test organization creation
- [ ] Test data isolation (Org A can't see Org B's data)
- [ ] Test role permissions
- [ ] Test subscription limits
- [ ] Test migration script with real data

### 4. Frontend Changes Needed
The frontend needs updates to:
- Send authentication tokens
- Handle organization context
- Show subscription status
- Implement organization signup flow
- Add user invitation UI
- Show usage vs limits

## 🐛 Known Issues

1. **Authentication**: Using simplified email-based auth instead of Firebase tokens
2. **Incomplete Endpoints**: Some CRUD operations missing for admissions, batches, etc.
3. **No Payment Integration**: Payment gateway integration not implemented
4. **No Email Service**: User invitations don't send emails
5. **No Subscription Upgrade**: Upgrade/downgrade flow not implemented

## 🚧 Next Steps

1. **Complete API Endpoints**: Add all remaining endpoints from `additional_endpoints.js`
2. **Implement Firebase Admin SDK**: Proper token verification
3. **Add Payment Gateway**: Stripe/SSLCommerz integration
4. **Email Service**: SendGrid/AWS SES for notifications
5. **Frontend Updates**: Organization signup, user management UI
6. **Testing**: Comprehensive testing of all features
7. **Documentation**: API documentation (Swagger/Postman)

## 📞 Support

For questions or issues, refer to:
- `multi_tenant_schema_plan.md` - Complete schema documentation
- `project_understanding.md` - Original project architecture

## 🎉 Success Criteria

The multi-tenant implementation is complete when:
- ✅ All 15 collections created with indexes
- ✅ All API endpoints organization-scoped
- ✅ Role-based access control working
- ✅ Subscription limits enforced
- ✅ Data isolation verified
- ✅ Migration script tested
- ✅ Frontend integrated
- ✅ Payment gateway integrated
- ✅ Production-ready authentication

---

**Version**: 2.0.0 (Multi-Tenant)  
**Last Updated**: 2026-01-20
