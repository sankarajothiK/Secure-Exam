# Enterprise-Grade Proctored AI Examination Portal

This repository contains a 100% production-ready proctored online examination portal consisting of a secure React.js SPA frontend and a secure Node.js/Express backend with MongoDB integration.

---

## Folder Structure

```
├── client/                     # Vite + React SPA Frontend
│   ├── src/
│   │   ├── components/         # Shared components (Navbar, ThemeToggle)
│   │   ├── context/            # Auth and Theme state contexts
│   │   ├── pages/              # View pages (Login, ExamEngine, AdminDashboard, etc.)
│   │   ├── utils/              # Axios API setup
│   │   ├── main.jsx
│   │   └── App.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── vercel.json             # Vercel deployment routing rules
│
├── server/                     # Node.js + Express Backend
│   ├── config/                 # DB configuration
│   ├── controllers/            # Auth, Exam, Student, Admin controllers
│   ├── models/                 # Mongoose schemas (Student, Exam, ExamAttempt, etc.)
│   ├── middlewares/            # JWT authentication and security middlewares
│   ├── routes/                 # Express route entrypoints
│   ├── services/               # PDF MCQ parser algorithms
│   ├── uploads/                # Local storage for webcam verification files
│   │   ├── selfies/            # Student selfies
│   │   └── aadhaar/            # Aadhaar cards
│   ├── package.json
│   └── server.js
```

---

## Tech Stack

- **Frontend**: React (Vite), Tailwind CSS, Framer Motion, Axios, React Hook Form, React Toastify, Lucide Icons.
- **Backend**: Node.js, Express.js, Multer (in-memory for PDF parsing, disk storage for Aadhaar uploads), pdf-parse.
- **Database**: MongoDB Atlas (Mongoose ODM) with connection pooling.
- **Authentication**: JWT token authorization, bcrypt password hashing.

---

## Environment Variables

### Backend (`server/.env`)
Create a `.env` file in the `server/` directory:
```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxx.mongodb.net/examportal?retryWrites=true&w=majority
JWT_SECRET=supersecretkeyexamportal12345678
ADMIN_EMAIL=admin@examportal.com
ADMIN_PASSWORD=AdminPass123!
```

---

## Setup & Local Development

### 1. Start Backend Server
Navigate to the `server/` directory and install dependencies:
```bash
cd server
npm install
npm run dev # or npm start
```
The server will seed the default admin account:
- **Email**: `admin@examportal.com`
- **Password**: `AdminPass123!`

### 2. Start Frontend SPA
Navigate to the `client/` directory and install dependencies:
```bash
cd client
npm install
npm run dev
```
Open your browser at `http://localhost:3000`.

---

## Key Features

### 1. Proctoring & Anti-Cheat Suite (`ExamEngine.jsx`)
- **Fullscreen Enforced**: Toggling out of fullscreen prompts a warning dialog. Exiting a second time automatically submits the exam as disqualified.
- **Tab & Window tracking**: Switching tabs or losing focus increments tab count. Exceeding **2 tab switches** submits the exam as terminated.
- **Disabled Actions**: Context Menu (right click), Text Selection, Copying, Pasting, and Developer Console shortcuts (`F12`, `Ctrl+C/V/U/A/S`) are fully blocked.
- **Accidental Refresh Block**: Custom `beforeunload` checks alert users.
- **Timer Tick**: Every question is guarded by a **20-second countdown timer**. When time reaches zero, the engine automatically records an empty response and advances to the next question (no skipping back).

### 2. AI PDF Upload & Parse (`pdfParser.js`)
- Admin uploads a **Question Paper PDF** and an **Answer Key PDF** separately.
- System extracts questions, options (A-D), and correct choices using regex heuristics.
- Admin reviews, modifies, and adds/deletes parsed items in the preview editor before publishing.

### 3. Student Registration Audit (`AdminStudentDetails.jsx`)
- Student registers, captures a live webcam selfie, and uploads/captures their Aadhaar.
- Verification files are saved securely under `server/uploads/`.
- Admin reviews candidate webcam selfies side-by-side with Aadhaar documents in the report console.

---

## Deployment Ready

### Backend (Render / Heroku)
- Deploy the `server/` folder to Render.
- Specify the **Build Command**: `npm install`
- Specify the **Start Command**: `node server.js`
- Connect your **MongoDB Atlas** cluster and configure env variables (`MONGO_URI`, `JWT_SECRET`, etc.).

### Frontend (Vercel)
- Deploy the `client/` folder to Vercel.
- Vercel will automatically discover the `vercel.json` and configure rewrites to handle SPA client-side routing.
- Specify the **Build Command**: `npm run build`
- Specify the **Output Directory**: `dist`
