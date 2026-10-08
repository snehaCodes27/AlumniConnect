from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class EmbedRequest(BaseModel):
    texts: List[str] = Field(..., description="List of strings to embed")

class EmbedResponse(BaseModel):
    embeddings: List[List[float]]
    dimension: int
    model: str

class PreviousCompany(BaseModel):
    company_name: str
    job_role: Optional[str] = None
    domain: Optional[str] = None
    start_year: Optional[int] = None
    end_year: Optional[int] = None

class AlumniCandidate(BaseModel):
    id: str
    name: str
    current_company: Optional[str] = None
    job_role: Optional[str] = None
    domain: Optional[str] = None
    branch: Optional[str] = None
    graduation_year: Optional[int] = None
    years_of_experience: Optional[int] = 0
    skills: List[str] = []
    areas_of_expertise: List[str] = []
    previous_companies: List[PreviousCompany] = []
    mentorship_available: bool = False
    location: Optional[str] = None
    embedding: Optional[List[float]] = None

class SemanticSearchRequest(BaseModel):
    query: str
    candidates: List[AlumniCandidate]
    top_k: int = 20

class MatchBreakdown(BaseModel):
    semantic_similarity: float
    skill_overlap: List[str] = []
    role_alignment: bool = False
    company_match: bool = False
    domain_match: bool = False
    experience_boost: float = 0.0
    mentorship_boost: float = 0.0

class SemanticSearchResultItem(BaseModel):
    id: str
    relevance_score: float # 0 - 100
    semantic_score: float  # 0 - 100
    match_reasons: List[str]
    breakdown: MatchBreakdown

class SemanticSearchResponse(BaseModel):
    success: bool = True
    query: str
    total_candidates: int
    results: List[SemanticSearchResultItem]

class StudentProfileContext(BaseModel):
    user_id: str
    name: Optional[str] = None
    branch: Optional[str] = None
    graduation_year: Optional[int] = None
    cgpa: Optional[float] = None
    career_goal: Optional[str] = None
    preferred_domain: Optional[str] = None
    preferred_role: Optional[str] = None
    preferred_company: Optional[str] = None
    technical_skills: List[str] = []
    skills: List[str] = []
    tools: List[str] = []
    domain_interests: List[str] = []
    career_interests: List[str] = []
    interests: List[str] = []
    location: Optional[str] = None
    # Interaction signals
    applied_job_ids: List[str] = []
    applied_company_names: List[str] = []
    connected_user_ids: List[str] = []
    requested_mentor_ids: List[str] = []
    registered_event_ids: List[str] = []

class JobCandidate(BaseModel):
    id: str
    company: str
    title: str
    location: str
    employment_type: str
    description: str
    skills: List[str] = []
    min_experience: Optional[int] = 0
    min_cgpa: Optional[float] = None
    eligible_branches: List[str] = []
    eligible_batches: List[int] = []

class EventCandidate(BaseModel):
    id: str
    title: str
    description: str
    type: str
    speaker_name: str
    speaker_role: Optional[str] = None
    speaker_company: Optional[str] = None
    tags: List[str] = []
    start_date: str

class RecommendationRequest(BaseModel):
    student: StudentProfileContext
    candidates_alumni: List[AlumniCandidate] = []
    candidates_jobs: List[JobCandidate] = []
    candidates_events: List[EventCandidate] = []
    limit: int = 10

class RecommendedItem(BaseModel):
    id: str
    score: float # 0 - 100
    match_level: str # 'EXCELLENT', 'HIGH', 'GOOD', 'MODERATE'
    reasons: List[str]
    metadata: Dict[str, Any] = {}

class RecommendationResponse(BaseModel):
    success: bool = True
    student_id: str
    recommended_alumni: List[RecommendedItem]
    recommended_mentors: List[RecommendedItem]
    recommended_jobs: List[RecommendedItem]
    recommended_events: List[RecommendedItem]
