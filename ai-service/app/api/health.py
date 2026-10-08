from fastapi import APIRouter

router = APIRouter()

@router.get("/health")
def health_check():
    """Service health check endpoint."""
    return {
        "success": True,
        "message": "AlumniConnect AI service is running"
    }
