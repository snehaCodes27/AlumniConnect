from fastapi import APIRouter, HTTPException
from app.models.schemas import (
    EmbedRequest,
    EmbedResponse,
    SemanticSearchRequest,
    SemanticSearchResponse
)
from app.services.embedding_service import EmbeddingService
from app.services.semantic_search_service import SemanticSearchService

router = APIRouter(prefix="/api/search", tags=["Search"])

@router.post("/embeddings", response_model=EmbedResponse)
async def generate_embeddings_endpoint(req: EmbedRequest):
    try:
        embeddings = EmbeddingService.generate_embeddings(req.texts)
        dim = len(embeddings[0]) if embeddings else 384
        return EmbedResponse(
            embeddings=embeddings,
            dimension=dim,
            model="bge-small-en-v1.5"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/semantic", response_model=SemanticSearchResponse)
async def semantic_search_endpoint(req: SemanticSearchRequest):
    try:
        results = SemanticSearchService.search(
            query=req.query,
            candidates=req.candidates,
            top_k=req.top_k
        )
        return SemanticSearchResponse(
            success=True,
            query=req.query,
            total_candidates=len(req.candidates),
            results=results
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
