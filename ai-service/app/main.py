import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.health import router as health_router
from app.api.search import router as search_router
from app.api.recommendations import router as recommendations_router

load_dotenv()

app = FastAPI(
    title="AlumniConnect AI Service",
    description="AI Microservice for AlumniConnect handling Semantic Search, Dynamic Recommendations, LLM, and Embeddings",
    version="1.1.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(health_router)
app.include_router(search_router)
app.include_router(recommendations_router)

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run("app.main:app", host=host, port=port, reload=True)
