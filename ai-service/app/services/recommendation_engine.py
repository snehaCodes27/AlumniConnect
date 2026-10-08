import re
from typing import List, Dict, Any, Tuple
from app.models.schemas import (
    StudentProfileContext,
    AlumniCandidate,
    JobCandidate,
    EventCandidate,
    RecommendedItem,
    RecommendationResponse
)
from app.services.embedding_service import EmbeddingService
from app.services.semantic_search_service import SemanticSearchService

class RecommendationEngine:
    @classmethod
    def construct_student_persona_text(cls, s: StudentProfileContext) -> str:
        parts = []
        if s.preferred_role or s.preferred_company:
            parts.append(f"Aspiring {s.preferred_role or 'Professional'} targeting {s.preferred_company or 'Top Companies'}")
        if s.career_goal:
            parts.append(f"Career Objective: {s.career_goal}")
        if s.preferred_domain:
            parts.append(f"Domain Focus: {s.preferred_domain}")

        all_skills = list(set(s.technical_skills + s.skills + s.tools))
        if all_skills:
            parts.append(f"Technical Proficiencies: {', '.join(all_skills)}")

        all_interests = list(set(s.domain_interests + s.career_interests + s.interests))
        if all_interests:
            parts.append(f"Key Interests: {', '.join(all_interests)}")

        if s.branch:
            parts.append(f"Degree: {s.branch}")

        if s.applied_company_names:
            parts.append(f"Companies of Interest: {', '.join(s.applied_company_names[:4])}")

        return " | ".join(parts) if parts else "Student seeking career guidance and opportunities in technology"

    @classmethod
    def recommend_alumni_and_mentors(
        cls,
        student: StudentProfileContext,
        persona_vec: List[float],
        candidates: List[AlumniCandidate],
        mentors_only: bool = False,
        limit: int = 5
    ) -> List[RecommendedItem]:
        if not candidates:
            return []

        # Filter if mentors only
        pool = [c for c in candidates if c.mentorship_available] if mentors_only else candidates
        if not pool:
            pool = candidates

        results = []
        student_skills = [x.lower() for x in (student.technical_skills + student.skills + student.tools)]
        student_interests = [x.lower() for x in (student.domain_interests + student.career_interests + student.interests)]
        pref_comp = (student.preferred_company or "").lower()
        pref_role = (student.preferred_role or "").lower()
        pref_dom = (student.preferred_domain or "").lower()

        for c in pool:
            # Semantic cosine similarity
            cos_sim = 0.0
            if persona_vec and c.embedding:
                cos_sim = EmbeddingService.cosine_similarity(persona_vec, c.embedding)

            reasons = []
            bonus = 0.0

            # 1. Preferred Company Match
            curr_comp = (c.current_company or "").lower()
            if pref_comp and (pref_comp in curr_comp or curr_comp in pref_comp):
                bonus += 22.0
                reasons.append(f"🏢 Works at your target company: {c.current_company}")
            else:
                for prev in c.previous_companies:
                    p_comp = (prev.company_name or "").lower()
                    if pref_comp and (pref_comp in p_comp or p_comp in pref_comp):
                        bonus += 14.0
                        reasons.append(f"🏢 Former experience at your dream company: {prev.company_name}")
                        break

            # Also check if student has applied to this company
            for app_comp in student.applied_company_names:
                if app_comp.lower() in curr_comp:
                    bonus += 12.0
                    reasons.append(f"💼 You applied to {c.current_company}")
                    break

            # 2. Preferred Role Match
            curr_role = (c.job_role or "").lower()
            if pref_role and (pref_role in curr_role or curr_role in pref_role):
                bonus += 18.0
                reasons.append(f"🎯 Role alignment: {c.job_role}")

            # 3. Domain Match
            curr_dom = (c.domain or "").lower()
            if pref_dom and (pref_dom in curr_dom or curr_dom in pref_dom):
                bonus += 15.0
                reasons.append(f"🌐 In your target domain: {c.domain}")

            # 4. Shared Technical Skills
            cand_skills = [s.lower() for s in (c.skills + c.areas_of_expertise)]
            matched_skills = [s for s in cand_skills if any(sk in s or s in sk for sk in student_skills)]
            if matched_skills:
                skill_bonus = min(25.0, len(matched_skills) * 8.0)
                bonus += skill_bonus
                reasons.append(f"⚡ Shared skills: {', '.join(list(set(matched_skills))[:3])}")

            # 5. Shared Branch
            if student.branch and c.branch and student.branch.lower() == c.branch.lower():
                bonus += 10.0
                reasons.append(f"🎓 Same department: {c.branch}")

            # 6. Mentorship availability
            if c.mentorship_available:
                bonus += 8.0
                reasons.append("🤝 Actively mentoring students")

            # 7. Experience Booster
            if (c.years_of_experience or 0) >= 3:
                bonus += min(8.0, float(c.years_of_experience))
                reasons.append(f"⭐ {c.years_of_experience}+ Years Experience")

            # Demote if already connected
            already_connected = c.id in student.connected_user_ids
            if already_connected:
                bonus -= 15.0

            # Composite score calculation
            semantic_score = cos_sim * 100.0
            raw_score = (semantic_score * 0.55) + (min(100.0, bonus) * 0.45)
            final_score = round(min(99.0, max(38.0, raw_score)), 1)

            if not reasons:
                reasons.append("Verified alumni match based on academic alignment")

            level = 'EXCELLENT' if final_score >= 82 else ('HIGH' if final_score >= 68 else ('GOOD' if final_score >= 50 else 'MODERATE'))

            results.append(
                RecommendedItem(
                    id=c.id,
                    score=final_score,
                    match_level=level,
                    reasons=reasons,
                    metadata={
                        "name": c.name,
                        "current_company": c.current_company,
                        "job_role": c.job_role,
                        "domain": c.domain,
                        "skills": c.skills,
                        "mentorship_available": c.mentorship_available,
                        "already_connected": already_connected,
                        "semantic_similarity": round(cos_sim, 3)
                    }
                )
            )

        results.sort(key=lambda x: x.score, reverse=True)
        return results[:limit]

    @classmethod
    def recommend_jobs(
        cls,
        student: StudentProfileContext,
        persona_vec: List[float],
        jobs: List[JobCandidate],
        limit: int = 5
    ) -> List[RecommendedItem]:
        if not jobs:
            return []

        # Embed jobs
        job_texts = [
            f"Job Title: {j.title} at {j.company}. Employment Type: {j.employment_type} in {j.location}. Required Skills: {', '.join(j.skills)}. Description: {j.description[:500]}"
            for j in jobs
        ]
        job_embeddings = EmbeddingService.generate_embeddings(job_texts)

        student_skills = [x.lower() for x in (student.technical_skills + student.skills + student.tools)]
        pref_comp = (student.preferred_company or "").lower()
        pref_role = (student.preferred_role or "").lower()

        results = []
        for idx, j in enumerate(jobs):
            job_vec = job_embeddings[idx] if idx < len(job_embeddings) else None
            cos_sim = EmbeddingService.cosine_similarity(persona_vec, job_vec) if persona_vec and job_vec else 0.0

            reasons = []
            bonus = 0.0

            # Direct skills overlap
            j_skills = [s.lower() for s in j.skills]
            matched_skills = [s for s in j_skills if any(sk in s or s in sk for sk in student_skills)]
            if matched_skills:
                skill_bonus = min(30.0, len(matched_skills) * 10.0)
                bonus += skill_bonus
                reasons.append(f"Matching skills: {', '.join(list(set(matched_skills))[:3])}")

            # Preferred company match
            if pref_comp and (pref_comp in j.company.lower() or j.company.lower() in pref_comp):
                bonus += 25.0
                reasons.append(f"Dream employer: {j.company}")

            # Preferred role match
            if pref_role and (pref_role in j.title.lower() or j.title.lower() in pref_role):
                bonus += 20.0
                reasons.append(f"Target role match: {j.title}")

            # Branch eligibility
            if student.branch and j.eligible_branches:
                if any(b.lower() in student.branch.lower() or student.branch.lower() in b.lower() for b in j.eligible_branches):
                    bonus += 15.0
                    reasons.append(f"Eligible for your branch: {student.branch}")

            # CGPA check
            if student.cgpa and j.min_cgpa:
                if student.cgpa >= j.min_cgpa:
                    bonus += 8.0
                    reasons.append(f"Meets CGPA cutoff ({j.min_cgpa})")

            # Check if student already applied
            already_applied = j.id in student.applied_job_ids
            if already_applied:
                reasons.append("✓ Application already submitted")

            semantic_score = cos_sim * 100.0
            raw_score = (semantic_score * 0.50) + (min(100.0, bonus) * 0.50)
            final_score = round(min(99.0, max(35.0, raw_score)), 1)

            if not reasons:
                reasons.append(f"Active hiring opportunity at {j.company}")

            level = 'EXCELLENT' if final_score >= 80 else ('HIGH' if final_score >= 65 else ('GOOD' if final_score >= 50 else 'MODERATE'))

            results.append(
                RecommendedItem(
                    id=j.id,
                    score=final_score,
                    match_level=level,
                    reasons=reasons,
                    metadata={
                        "title": j.title,
                        "company": j.company,
                        "location": j.location,
                        "employment_type": j.employment_type,
                        "skills": j.skills,
                        "already_applied": already_applied,
                        "semantic_similarity": round(cos_sim, 3)
                    }
                )
            )

        results.sort(key=lambda x: x.score, reverse=True)
        return results[:limit]

    @classmethod
    def recommend_events(
        cls,
        student: StudentProfileContext,
        persona_vec: List[float],
        events: List[EventCandidate],
        limit: int = 5
    ) -> List[RecommendedItem]:
        if not events:
            return []

        # Embed events
        event_texts = [
            f"Event Title: {e.title} ({e.type}). Speaker: {e.speaker_name} at {e.speaker_company or 'Tech Industry'}. Tags: {', '.join(e.tags)}. Description: {e.description[:500]}"
            for e in events
        ]
        event_embeddings = EmbeddingService.generate_embeddings(event_texts)

        student_interests = [x.lower() for x in (student.domain_interests + student.career_interests + student.interests + student.skills)]
        pref_comp = (student.preferred_company or "").lower()

        results = []
        for idx, e in enumerate(events):
            event_vec = event_embeddings[idx] if idx < len(event_embeddings) else None
            cos_sim = EmbeddingService.cosine_similarity(persona_vec, event_vec) if persona_vec and event_vec else 0.0

            reasons = []
            bonus = 0.0

            # Speaker Company Match
            spk_comp = (e.speaker_company or "").lower()
            if pref_comp and spk_comp and (pref_comp in spk_comp or spk_comp in pref_comp):
                bonus += 25.0
                reasons.append(f"Speaker is an alumnus at {e.speaker_company}")

            # Tag alignment with student interests
            matched_tags = []
            for t in e.tags:
                tl = t.lower()
                if any(tl in inter or inter in tl for inter in student_interests):
                    matched_tags.append(t)
            if matched_tags:
                bonus += min(25.0, len(matched_tags) * 10.0)
                reasons.append(f"Relevant topic: {', '.join(matched_tags[:3])}")

            # Already registered check
            already_registered = e.id in student.registered_event_ids
            if already_registered:
                reasons.append("✓ You are registered for this event")

            semantic_score = cos_sim * 100.0
            raw_score = (semantic_score * 0.55) + (min(100.0, bonus) * 0.45)
            final_score = round(min(99.0, max(40.0, raw_score)), 1)

            if not reasons:
                reasons.append("Recommended live interactive alumni session")

            level = 'EXCELLENT' if final_score >= 80 else ('HIGH' if final_score >= 65 else ('GOOD' if final_score >= 50 else 'MODERATE'))

            results.append(
                RecommendedItem(
                    id=e.id,
                    score=final_score,
                    match_level=level,
                    reasons=reasons,
                    metadata={
                        "title": e.title,
                        "type": e.type,
                        "speaker_name": e.speaker_name,
                        "speaker_company": e.speaker_company,
                        "tags": e.tags,
                        "start_date": e.start_date,
                        "already_registered": already_registered,
                        "semantic_similarity": round(cos_sim, 3)
                    }
                )
            )

        results.sort(key=lambda x: x.score, reverse=True)
        return results[:limit]

    @classmethod
    def generate_all_recommendations(
        cls,
        student: StudentProfileContext,
        candidates_alumni: List[AlumniCandidate],
        candidates_jobs: List[JobCandidate],
        candidates_events: List[EventCandidate],
        limit: int = 10
    ) -> RecommendationResponse:
        # Build student persona embedding
        persona_text = cls.construct_student_persona_text(student)
        persona_embeddings = EmbeddingService.generate_embeddings([persona_text])
        persona_vec = persona_embeddings[0] if persona_embeddings else None

        # Pre-embed alumni candidates if not already done
        cand_to_embed = []
        cand_indices = []
        for i, a in enumerate(candidates_alumni):
            if not a.embedding:
                cand_to_embed.append(SemanticSearchService.construct_profile_text(a))
                cand_indices.append(i)
        if cand_to_embed:
            gen_embeds = EmbeddingService.generate_embeddings(cand_to_embed)
            for g_i, c_i in enumerate(cand_indices):
                candidates_alumni[c_i].embedding = gen_embeds[g_i]

        rec_alumni = cls.recommend_alumni_and_mentors(student, persona_vec, candidates_alumni, mentors_only=False, limit=limit)
        rec_mentors = cls.recommend_alumni_and_mentors(student, persona_vec, candidates_alumni, mentors_only=True, limit=limit)
        rec_jobs = cls.recommend_jobs(student, persona_vec, candidates_jobs, limit=limit)
        rec_events = cls.recommend_events(student, persona_vec, candidates_events, limit=limit)

        return RecommendationResponse(
            success=True,
            student_id=student.user_id,
            recommended_alumni=rec_alumni,
            recommended_mentors=rec_mentors,
            recommended_jobs=rec_jobs,
            recommended_events=rec_events
        )
