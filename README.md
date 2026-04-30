# Civic Infrastructure Complaint and Status Tracker

## Overview
The **Civic Infrastructure Complaint and Status Tracker** is a full-stack web application designed to empower citizens to report local civic issues (such as potholes, broken streetlights, water supply problems, and sanitation issues) directly to local authorities. The platform provides a transparent, real-time tracking system where users can monitor the status of their complaints, from submission to resolution, while administrators can efficiently manage, update, and resolve reported issues.

## Features
- **Citizen Portal:**
  - Secure registration and login.
  - Submit complaints with details, categories, priority, location, and photo attachments.
  - View personal complaint history and track real-time status updates (Pending, In Progress, Resolved, Rejected).
  - Add comments to existing complaints for follow-ups.
- **Admin Dashboard:**
  - Overview statistics of all complaints (Total, Pending, In Progress, Resolved).
  - Filter and manage complaints by status and category.
  - Update complaint statuses with optional remarks.
- **Modern, Responsive UI:**
  - Stunning dark-mode glassmorphism design.
  - Real-time toast notifications and smooth page transitions.
  - Mobile-friendly layout.

## Tech Stack
- **Frontend:** Vanilla HTML5, CSS3 (with CSS Variables, Flexbox, Grid), JavaScript (ES6+). Single Page Application (SPA) architecture.
- **Backend:** Node.js, Express.js REST API.
- **Database:** MongoDB (using Mongoose ODM).
- **Authentication:** JWT (JSON Web Tokens) with bcrypt password hashing.
- **File Uploads:** Multer (for handling complaint image attachments).

## Prerequisites
- Node.js (v16 or higher recommended)
- MongoDB (Local instance or MongoDB Atlas cluster)

## Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd Civic-Infrastructure-Complaint-and-Status-Tracker-Project
   ```

2. **Install Backend Dependencies:**
   ```bash
   npm run postinstall
   # or
   cd backend && npm install
   ```

3. **Environment Configuration:**
   Create a `.env` file in the `backend` directory with the following variables:
   ```env
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/civic_tracker
   JWT_SECRET=your_super_secret_jwt_key
   FRONTEND_URL=http://localhost:5500
   ```
   *(Update `MONGODB_URI` if using MongoDB Atlas, and `FRONTEND_URL` to match your local frontend server port if running separately).*

4. **Start the Application:**
   From the root directory:
   ```bash
   npm start
   ```
   This will start the Node.js backend server. The backend is configured to statically serve the frontend application on `http://localhost:3000`.

5. **Seed Admin User (Optional but recommended):**
   To create an initial admin account for testing the Admin Dashboard:
   ```bash
   npm run seed-admin
   ```
   *Check `backend/scripts/seedAdmin.js` for the default admin credentials.*

## Project Structure
```text
.
├── backend/                # Node.js Express API
│   ├── database/           # MongoDB connection config
│   ├── middleware/         # Auth and upload middleware
│   ├── models/             # Mongoose schemas (User, Complaint, etc.)
│   ├── routes/             # API endpoints (auth, complaints, users)
│   ├── scripts/            # DB seeding scripts
│   ├── uploads/            # Directory for user-uploaded images
│   └── server.js           # Express app entry point
├── frontend/               # Vanilla HTML/CSS/JS Client
│   ├── index.html          # Main application UI
│   ├── style.css           # Global stylesheet and design system
│   └── app.js              # SPA logic and API interaction
├── package.json            # Root scripts
└── README.md
```

## API Endpoints (Brief)
- **Auth:** `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- **Complaints:** `GET /api/complaints`, `POST /api/complaints`, `GET /api/complaints/:id`, `PATCH /api/complaints/:id/status`, `POST /api/complaints/:id/comments`

## License
ISC