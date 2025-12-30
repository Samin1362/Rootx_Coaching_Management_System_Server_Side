# Rootx Coaching Management System - Backend API

Backend API for the Rootx Coaching Management System built with Express.js and MongoDB.

## 🚀 Quick Start

### Local Development

1. **Install Dependencies**

   ```bash
   npm install
   ```

2. **Environment Setup**
   Create a `.env` file in the root directory:

   ```env
   DB_USER=your_mongodb_username
   DB_PASS=your_mongodb_password
   PORT=3001
   NODE_ENV=development
   ```

3. **Run Development Server**

   ```bash
   npm run dev
   ```

   Server will start at `http://localhost:3001`

## 📦 Vercel Deployment

### Prerequisites

- Vercel account ([Sign up](https://vercel.com/signup))
- Vercel CLI installed (optional but recommended)
  ```bash
  npm install -g vercel
  ```

### Deployment Steps

#### Option 1: Using Vercel CLI (Recommended)

1. **Login to Vercel**

   ```bash
   vercel login
   ```

2. **Deploy**

   ```bash
   vercel
   ```

   Follow the prompts:

   - Set up and deploy? `Y`
   - Which scope? Select your account
   - Link to existing project? `N` (for first deployment)
   - What's your project's name? `rootx-cms-backend`
   - In which directory is your code located? `./`

3. **Add Environment Variables**

   ```bash
   vercel env add DB_USER
   vercel env add DB_PASS
   ```

   Or add them in the Vercel Dashboard:

   - Go to your project settings
   - Navigate to "Environment Variables"
   - Add:
     - `DB_USER`: Your MongoDB username
     - `DB_PASS`: Your MongoDB password
     - `NODE_ENV`: `production`

4. **Deploy to Production**
   ```bash
   vercel --prod
   ```

#### Option 2: Using Vercel Dashboard

1. **Push to GitHub**

   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin your-repo-url
   git push -u origin main
   ```

2. **Import Project**

   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New" → "Project"
   - Import your GitHub repository
   - Configure:
     - **Framework Preset**: Other
     - **Root Directory**: `rootx_coaching_management_server_side`
     - **Build Command**: Leave empty
     - **Output Directory**: Leave empty

3. **Add Environment Variables**
   In the project settings, add:

   - `DB_USER`: Your MongoDB username
   - `DB_PASS`: Your MongoDB password
   - `NODE_ENV`: `production`

4. **Deploy**
   Click "Deploy" and wait for deployment to complete

### Post-Deployment

1. **Get Your API URL**

   - Your API will be available at: `https://your-project-name.vercel.app`
   - Example: `https://rootx-cms-backend.vercel.app`

2. **Update Frontend**
   Update your frontend's API base URL to point to the deployed backend:

   ```javascript
   const API_URL = "https://your-project-name.vercel.app";
   ```

3. **Update CORS Origins**
   In `index.js`, update the CORS configuration with your frontend domain:

   ```javascript
   cors({
     origin: [
       "https://rootx-coaching-management-server-si.vercel.app",
       "http://localhost:5173", // Keep for local development
     ],
     credentials: true,
   });
   ```

4. **Redeploy** if you made CORS changes:
   ```bash
   vercel --prod
   ```

## 🔧 Configuration

### MongoDB Setup

Ensure your MongoDB Atlas cluster allows connections from:

- `0.0.0.0/0` (All IPs) for Vercel deployment
- Or add Vercel's IP ranges to your whitelist

### Environment Variables

| Variable   | Description                          | Required           |
| ---------- | ------------------------------------ | ------------------ |
| `DB_USER`  | MongoDB username                     | Yes                |
| `DB_PASS`  | MongoDB password                     | Yes                |
| `PORT`     | Server port (local only)             | No (default: 3001) |
| `NODE_ENV` | Environment (development/production) | No                 |

## 📡 API Endpoints

### Health Check

```http
GET /health
```

### Root

```http
GET /
```

### Users

- `POST /users` - Create user
- `GET /users` - Get all users
- `GET /users/:email` - Get user by email

### Students

- `POST /students` - Create student
- `GET /students` - Get all students
- `GET /students/:id` - Get student by ID
- `PATCH /students/:id` - Update student

### Admissions

- `POST /admissions` - Create admission
- `GET /admissions` - Get all admissions
- `GET /admissions/:id` - Get admission by ID
- `PATCH /admissions/:id/follow-up` - Add follow-up

### Batches

- `POST /batches` - Create batch
- `GET /batches` - Get all batches
- `GET /batches?status=active` - Get active batches

### Fees

- `POST /fees` - Create fee entry
- `GET /fees` - Get all fees
- `GET /fees?status=clear` - Get cleared fees
- `GET /fees?status=due` - Get due fees
- `PATCH /fees/:id` - Add payment

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js 5.x
- **Database**: MongoDB Atlas
- **Deployment**: Vercel
- **Authentication**: JWT (if implemented)

## 📝 Notes

### Vercel Limitations

- Serverless functions have a 10-second timeout on Hobby plan
- 50 MB deployment size limit
- Cold starts may occur after periods of inactivity

### MongoDB Connection

- Connection is established once on server start
- Uses connection pooling for efficiency
- Automatic reconnection on connection loss

## 🐛 Troubleshooting

### Issue: Module not found errors

**Solution**: Ensure `"type": "module"` is in `package.json`

### Issue: CORS errors

**Solution**: Update CORS origins in `index.js` with your frontend domain

### Issue: MongoDB connection timeout

**Solution**:

- Check MongoDB Atlas whitelist (allow 0.0.0.0/0)
- Verify DB_USER and DB_PASS environment variables
- Check MongoDB Atlas cluster status

### Issue: 500 Internal Server Error

**Solution**:

- Check Vercel logs: `vercel logs`
- Verify environment variables are set
- Check MongoDB connection string

## 📞 Support

For issues or questions, please contact the development team.

## 📄 License

ISC
