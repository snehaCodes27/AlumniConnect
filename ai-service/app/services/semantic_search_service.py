import re
from typing import List, Dict, Any, Tuple
from app.models.schemas import (
    AlumniCandidate,
    SemanticSearchResultItem,
    MatchBreakdown
)
from app.services.embedding_service import EmbeddingService

class SemanticSearchService:
    @staticmethod
    def construct_profile_text(candidate: AlumniCandidate) -> str:
        """Construct semantic text representation of alumni profile for vectorization"""
        parts = []
        parts.append(f"Alumni Name: {candidate.name}")
        if candidate.job_role and candidate.current_company:
            parts.append(f"Current Position: {candidate.job_role} at {candidate.current_company}")
        elif candidate.job_role:
            parts.append(f"Role: {candidate.job_role}")
        elif candidate.current_company:
            parts.append(f"Company: {candidate.current_company}")

        if candidate.years_of_experience:
            parts.append(f"Experience: {candidate.years_of_experience} years in industry")

        if candidate.domain:
            parts.append(f"Domain: {candidate.domain}")

        if candidate.branch:
            grad = f" (Graduated {candidate.graduation_year})" if candidate.graduation_year else ""
            parts.append(f"Academic Background: {candidate.branch}{grad}")

        all_skills = list(set(candidate.skills + candidate.areas_of_expertise))
        if all_skills:
            parts.append(f"Skills and Technologies: {', '.join(all_skills)}")

        if candidate.previous_companies:
            prev_strs = []
            for p in candidate.previous_companies:
                prev_str = p.company_name
                if p.job_role:
                    prev_str += f" ({p.job_role})"
                prev_strs.append(prev_str)
            parts.append(f"Past Experience: {', '.join(prev_strs)}")

        if candidate.mentorship_available:
            parts.append("Status: Actively available for student mentorship and career guidance")

        if candidate.location:
            parts.append(f"Location: {candidate.location}")

        return " | ".join(parts)

    @classmethod
    def search(
        cls,
        query: str,
        candidates: List[AlumniCandidate],
        top_k: int = 20
    ) -> List[SemanticSearchResultItem]:
        if not candidates:
            return []

        clean_query = query.strip()
        query_lower = clean_query.lower()

        # 1. Generate query embedding
        query_embeddings = EmbeddingService.generate_embeddings([clean_query])
        query_vec = query_embeddings[0] if query_embeddings else None

        # 2. Extract query tokens and intent
        query_words = set(re.findall(r'\b[a-zA-Z0-9+#.-]+\b', query_lower))
        wants_mentor = any(k in query_lower for k in ['mentor', 'guidance', 'advice', 'guide'])

        # 3. Determine which candidates need embedding generation
        candidates_to_embed = []
        embed_indices = []
        for i, c in enumerate(candidates):
            if not c.embedding or len(c.embedding) == 0:
                profile_text = cls.construct_profile_text(c)
                candidates_to_embed.append(profile_text)
                embed_indices.append(i)

        if candidates_to_embed:
            generated_embeds = EmbeddingService.generate_embeddings(candidates_to_embed)
            for gen_idx, cand_idx in enumerate(embed_indices):
                candidates[cand_idx].embedding = generated_embeds[gen_idx]

        # 4. Score each candidate
        results: List[SemanticSearchResultItem] = []

        for c in candidates:
            # Semantic cosine similarity
            cos_sim = 0.0
            if query_vec and c.embedding:
                cos_sim = EmbeddingService.cosine_similarity(query_vec, c.embedding)

            # Attribute matching
            reasons = []
            matched_skills = []
            role_match = False
            company_match = False
            domain_match = False
            attribute_score = 0.0

            # Skills matching
            cand_skills = [s.lower() for s in (c.skills + c.areas_of_expertise)]
            for s in cand_skills:
                for word in query_words:
                    if len(word) >= 2 and (word in s or s in word):
                        matched_skills.append(s)
                        break

            matched_skills = list(set(matched_skills))
            if matched_skills:
                attribute_score += min(35.0, len(matched_skills) * 12.0)
                reasons.append(f"Matching skills: {', '.join(matched_skills[:4])}")

            # Company matching
            cand_comp = (c.current_company or "").lower()
            if cand_comp and any(word in cand_comp or cand_comp in word for word in query_words if len(word) > 2):
                company_match = True
                attribute_score += 25.0
                reasons.append(f"Company alignment: {c.current_company}")

            # Past company matching
            for prev in c.previous_companies:
                prev_comp = (prev.company_name or "").lower()
                if prev_comp and any(word in prev_comp or prev_comp in word for word in query_words if len(word) > 2):
                    attribute_score += 15.0
                    reasons.append(f"Past experience at {prev.company_name}")
                    break

            # Role matching
            cand_role = (c.job_role or "").lower()
            if cand_role and any(word in cand_role for word in query_words if len(word) > 2):
                role_match = True
                attribute_score += 20.0
                reasons.append(f"Role match: {c.job_role}")

            # Domain matching
            cand_domain = (c.domain or "").lower()
            if cand_domain and any(word in cand_domain for word in query_words if len(word) > 2):
                domain_match = True
                attribute_score += 15.0
                reasons.append(f"Domain: {c.domain}")

            # Mentorship boost
            mentorship_boost = 0.0
            if wants_mentor and c.mentorship_available:
                mentorship_boost = 15.0
                attribute_score += 15.0
                reasons.append("Available for 1:1 Mentorship")
            elif c.mentorship_available:
                mentorship_boost = 5.0
                attribute_score += 5.0

            # Experience boost
            exp_boost = min(10.0, float(c.years_of_experience or 0) * 1.5)
            attribute_score += exp_boost
            if (c.years_of_experience or 0) >= 3:
                reasons.append(f"{c.years_of_experience}+ Years Industry Experience")

            # Calculate composite relevance score
            # 60% semantic similarity + 40% structured attribute match
            semantic_score_100 = round(cos_sim * 100.0, 1)
            raw_composite = (semantic_score_100 * 0.60) + (min(100.0, attribute_score) * 0.40)
            relevance_score = round(min(99.0, max(30.0, raw_composite)), 1)

            # High semantic reason
            if cos_sim >= 0.70:
                reasons.insert(0, f"Strong {int(semantic_score_100)}% semantic alignment with your search query")
            elif cos_sim >= 0.50:
                reasons.insert(0, f"{int(semantic_score_100)}% semantic relevance to profile")
            elif not reasons:
                reasons.append("Verified alumni profile in network")

            results.append(
                SemanticSearchResultItem(
                    id=c.id,
                    relevance_score=relevance_score,
                    semantic_score=semantic_score_100,
                    match_reasons=reasons,
                    breakdown=MatchBreakdown(
                        semantic_similarity=round(cos_sim, 4),
                        skill_overlap=matched_skills,
                        role_alignment=role_match,
                        company_match=company_match,
                        domain_match=domain_match,
                        experience_boost=exp_boost,
                        mentorship_boost=mentorship_boost
                    )
                )
            )

        # Sort descending by relevance score
        results.sort(key=lambda x: x.relevance_score, reverse=True)
        return results[:top_k]
