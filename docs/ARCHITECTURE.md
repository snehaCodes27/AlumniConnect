# AlumniConnect System Architecture

## Overview
AlumniConnect is an AI-powered platform designed to seamlessly connect Students, Alumni, and Administrators.

## Target User Roles
1. **Student**: Access mentorship, career guidance, events, job opportunities, and AI-driven recommendations.
2. **Alumni**: Mentor students, share job postings, network with peers, and host webinars.
3. **Admin**: Moderate platform content, verify alumni credentials, manage users, and view platform analytics.

## Multi-tier Architecture

```
                    ┌─────────────────────────┐
                    │     Frontend (Vite)     │
                    │   React + Tailwind CSS  │
                    │      React Router       │
                    └───────────┬─────────────┘
                                │ HTTP / REST / WebSockets
                                ▼
                    ┌─────────────────────────┐
                    │    Backend (Express)    │
                    │    Node.js + Prisma     │
                    └─────┬─────────────┬─────┘
                          │             │ HTTP Requests
                          │             ▼
                          │   ┌───────────────────┐
                          │   │ AI Service (Fast) │
                          │   │ Python + Ollama   │
                          │   │ Embeddings / RAG  │
                          │   └─────────┬─────────┘
                          ▼             ▼
                    ┌─────────────────────────┐
                    │  PostgreSQL + pgvector  │
                    └─────────────────────────┘
```

## Directory Structure
- `frontend/`: Single Page Application (React 19+, Vite, Tailwind CSS, Axios, React Router)
- `backend/`: REST API & WebSocket server (Node.js, Express, Prisma ORM)
- `ai-service/`: Microservice for LLM inference, RAG, embeddings, and transcription (FastAPI, Python)
- `prisma/`: PostgreSQL schema definition and migrations
- `docs/`: Technical documentation and design specifications
