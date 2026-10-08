# AlumniConnect

AlumniConnect is an AI-powered alumni engagement platform connecting **Students**, **Alumni**, and **Admins**.

> **"Connect. Guide. Grow Together."**

---

## Architecture Overview

```
AlumniConnect/
├── frontend/        # React + Vite + Tailwind CSS + React Router + Axios
├── backend/         # Node.js + Express + Prisma ORM
├── ai-service/      # Python + FastAPI (Ollama, Embeddings, RAG, Whisper)
├── prisma/          # Prisma schema & PostgreSQL database migrations
├── docs/            # Architecture & specifications
├── .gitignore       # Root git ignore
└── README.md        # Project guide & instructions
```

---

## User Roles

1. **Student**: Access mentorship, career guidance, campus events, job opportunities, and AI-driven recommendations.
2. **Alumni**: Mentor students, share job postings, network with peers, and host webinars.
3. **Admin**: Moderate platform content, verify alumni credentials, manage users, and view platform analytics.

---

## Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, React Router v6, Axios
- **Backend**: Node.js, Express.js, Prisma ORM, PostgreSQL, JWT, bcrypt, Nodemailer, Socket.IO, Cloudinary
- **AI Service**: Python 3.10+, FastAPI, Uvicorn, Ollama (Local LLM), Embeddings, pgvector, RAG, Whisper

---

## Quick Start (One-Click)

### Option A: Double-Click Launcher (Windows)
- Double-click **`start-app.bat`** in the project folder to start **Backend + Frontend** and open the app in your browser automatically.
- Or double-click **`start-all.bat`** to start **Backend + Frontend + AI Service**.

### Option B: Terminal Command (Unified Concurrently)
Run both backend and frontend concurrently from the root directory:
```bash
npm run dev
```
Or start all 3 services concurrently:
```bash
npm run dev:all
```

---

## Getting Started (Individual Services)

### 1. Backend Service

#### Setup & Run:
```bash
cd backend
npm install
npm run dev
```

The backend server starts by default at `http://localhost:5000`.

#### Health Check:
```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "success": true,
  "message": "AlumniConnect backend is running"
}
```

---

### 2. Frontend Application

#### Setup & Run:
```bash
cd frontend
npm install
npm run dev
```

The frontend application starts by default at `http://localhost:5173`.

---

### 3. AI Service (Python FastAPI)

#### Setup & Run:
```bash
cd ai-service
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The AI microservice starts by default at `http://localhost:8000`.

#### Health Check:
```bash
curl http://localhost:8000/health
```

Expected response:
```json
{
  "success": true,
  "message": "AlumniConnect AI service is running"
}
```

---

### 4. Database & Prisma

The Prisma configuration is located in `prisma/schema.prisma`.

To generate the Prisma Client from the backend:
```bash
cd backend
npm run prisma:generate
```
