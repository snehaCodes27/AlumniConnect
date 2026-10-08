from fastapi import APIRouter, HTTPException
from app.models.schemas import (
    RecommendationRequest,
    RecommendationResponse
)
from app.services.recommendation_engine import RecommendationEngine

router = APIRouter(prefix="/api/recommendations", tags=["Recommendations"])

@router.post("/rank", response_model=RecommendationResponse)
async def rank_recommendations_endpoint(req: RecommendationRequest):
    try:
        response = RecommendationEngine.generate_all_recommendations(
            student=req.student,
            candidates_alumni=req.candidates_alumni,
            candidates_jobs=req.candidates_jobs,
            candidates_events=req.candidates_events,
            limit=req.limit
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
