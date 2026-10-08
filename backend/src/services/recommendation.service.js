const prisma = require('../config/prisma');
const connectionService = require('./connection.service');
const { formatAlumniCandidate } = require('./semanticSearch.service');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const CACHE_TTL_MINUTES = 30;

/**
 * Get comprehensive, dynamic AI recommendations for a student
 */
async function getStudentRecommendations(studentUserId, { forceRefresh = false, limit = 5 } = {}) {
  // 1. Check PostgreSQL RecommendationCache
  if (!forceRefresh) {
    const cached = await prisma.recommendationCache.findFirst({
      where: {
        studentId: studentUserId,
        recommendationType: 'DASHBOARD_ALL',
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (cached && cached.recommendations) {
      return {
        fromCache: true,
        expiresAt: cached.expiresAt,
        ...cached.recommendations,
      };
    }
  }

  // 2. Fetch Student Profile and Interaction Data
  const [student, connections, mentorshipReqs, jobApps, eventRegs] = await Promise.all([
    prisma.user.findUnique({
      where: { id: studentUserId },
      include: { studentProfile: true },
    }),
    prisma.connection.findMany({
      where: {
        OR: [{ senderId: studentUserId }, { receiverId: studentUserId }],
        status: 'ACCEPTED',
      },
    }),
    prisma.mentorshipRequest.findMany({
      where: { studentId: studentUserId },
      select: { alumniId: true, status: true },
    }),
    prisma.jobApplication.findMany({
      where: { studentId: studentUserId },
      include: { job: { select: { company: true } } },
    }),
    prisma.eventRegistration.findMany({
      where: { userId: studentUserId },
      select: { eventId: true, status: true },
    }),
  ]);

  const profile = student?.studentProfile || {};

  const connectedUserIds = connections.map((c) =>
    c.senderId === studentUserId ? c.receiverId : c.senderId
  );
  const requestedMentorIds = mentorshipReqs.map((m) => m.alumniId);
  const appliedJobIds = jobApps.map((a) => a.jobId);
  const appliedCompanyNames = jobApps.map((a) => a.job?.company).filter(Boolean);
  const registeredEventIds = eventRegs.map((e) => e.eventId);

  const studentContext = {
    user_id: studentUserId,
    name: `${student?.firstName || ''} ${student?.lastName || ''}`.trim() || 'Student',
    branch: profile.branch || null,
    graduation_year: profile.graduationYear || null,
    cgpa: profile.cgpa ? parseFloat(profile.cgpa.toString()) : null,
    career_goal: profile.careerGoal || null,
    preferred_domain: profile.preferredDomain || null,
    preferred_role: profile.preferredRole || null,
    preferred_company: profile.preferredCompany || null,
    technical_skills: profile.technicalSkills || [],
    skills: profile.skills || [],
    tools: profile.tools || [],
    domain_interests: profile.domainInterests || [],
    career_interests: profile.careerInterests || [],
    interests: profile.interests || [],
    location: profile.location || null,
    applied_job_ids: appliedJobIds,
    applied_company_names: appliedCompanyNames,
    connected_user_ids: connectedUserIds,
    requested_mentor_ids: requestedMentorIds,
    registered_event_ids: registeredEventIds,
  };

  // 3. Fetch Candidate Pools from PostgreSQL
  const [alumniCandidates, jobCandidates, eventCandidates] = await Promise.all([
    prisma.alumniProfile.findMany({
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profilePhoto: true,
          },
        },
        previousCompanies: { orderBy: { startYear: 'desc' } },
        embedding: true,
      },
      take: 50,
    }),
    prisma.job.findMany({
      where: { status: 'ACTIVE' },
      include: {
        alumni: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.event.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { startDate: 'asc' },
      take: 20,
    }),
  ]);

  // Format candidate data for AI service
  const formattedAlumni = alumniCandidates.map((a) => formatAlumniCandidate(a, a.embedding));
  const formattedJobs = jobCandidates.map((j) => ({
    id: j.id,
    company: j.company,
    title: j.title,
    location: j.location,
    employment_type: j.employmentType,
    description: j.description,
    skills: j.skills || [],
    min_experience: j.minExperience || 0,
    min_cgpa: j.minCgpa ? parseFloat(j.minCgpa.toString()) : null,
    eligible_branches: j.eligibleBranches || [],
    eligible_batches: j.eligibleBatches || [],
  }));
  const formattedEvents = eventCandidates.map((e) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    type: e.type,
    speaker_name: e.speakerName,
    speaker_role: e.speakerRole || null,
    speaker_company: e.speakerCompany || null,
    tags: e.tags || [],
    start_date: e.startDate.toISOString(),
  }));

  // 4. Request dynamic rankings from AI Service
  let aiResults = null;
  try {
    const aiRes = await fetch(`${AI_SERVICE_URL}/api/recommendations/rank`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student: studentContext,
        candidates_alumni: formattedAlumni,
        candidates_jobs: formattedJobs,
        candidates_events: formattedEvents,
        limit,
      }),
    });

    if (aiRes.ok) {
      aiResults = await aiRes.json();
    }
  } catch (err) {
    console.warn('[RecommendationService] Call to AI service failed:', err.message);
  }

  // 5. Hydrate recommended results with full relational details
  const targetAlumniUserIds = alumniCandidates.map((a) => a.userId).filter(Boolean);
  const connectionStatuses = await connectionService.getConnectionStatusesMap(
    studentUserId,
    targetAlumniUserIds
  );

  const alumniMap = new Map(alumniCandidates.map((a) => [a.id, a]));
  const jobsMap = new Map(jobCandidates.map((j) => [j.id, j]));
  const eventsMap = new Map(eventCandidates.map((e) => [e.id, e]));

  // Process Alumni Recommendations
  const finalAlumni = (aiResults?.recommended_alumni || []).map((item) => {
    const raw = alumniMap.get(item.id);
    return {
      id: raw?.id || item.id,
      userId: raw?.userId,
      user: raw?.user,
      currentCompany: raw?.currentCompany,
      jobRole: raw?.jobRole,
      domain: raw?.domain,
      skills: raw?.skills || [],
      mentorshipAvailable: raw?.mentorshipAvailable,
      yearsOfExperience: raw?.yearsOfExperience,
      location: raw?.location,
      score: item.score,
      matchLevel: item.match_level,
      reasons: item.reasons,
      connection: connectionStatuses[raw?.userId] || { status: 'NONE', isSender: false },
    };
  });

  // Process Mentor Recommendations
  const finalMentors = (aiResults?.recommended_mentors || []).map((item) => {
    const raw = alumniMap.get(item.id);
    return {
      id: raw?.id || item.id,
      userId: raw?.userId,
      user: raw?.user,
      currentCompany: raw?.currentCompany,
      jobRole: raw?.jobRole,
      domain: raw?.domain,
      skills: raw?.skills || [],
      mentorshipAvailable: true,
      yearsOfExperience: raw?.yearsOfExperience,
      score: item.score,
      matchLevel: item.match_level,
      reasons: item.reasons,
      connection: connectionStatuses[raw?.userId] || { status: 'NONE', isSender: false },
    };
  });

  // Process Job Recommendations
  const finalJobs = (aiResults?.recommended_jobs || []).map((item) => {
    const raw = jobsMap.get(item.id);
    return {
      id: raw?.id || item.id,
      title: raw?.title,
      company: raw?.company,
      location: raw?.location,
      employmentType: raw?.employmentType,
      workplaceType: raw?.workplaceType,
      salary: raw?.salary,
      skills: raw?.skills || [],
      deadline: raw?.deadline,
      score: item.score,
      matchLevel: item.match_level,
      reasons: item.reasons,
      isApplied: appliedJobIds.includes(raw?.id),
    };
  });

  // Process Event Recommendations
  const finalEvents = (aiResults?.recommended_events || []).map((item) => {
    const raw = eventsMap.get(item.id);
    return {
      id: raw?.id || item.id,
      title: raw?.title,
      type: raw?.type,
      speakerName: raw?.speakerName,
      speakerRole: raw?.speakerRole,
      speakerCompany: raw?.speakerCompany,
      startDate: raw?.startDate,
      location: raw?.location,
      tags: raw?.tags || [],
      score: item.score,
      matchLevel: item.match_level,
      reasons: item.reasons,
      isRegistered: registeredEventIds.includes(raw?.id),
    };
  });

  const payload = {
    studentId: studentUserId,
    alumni: finalAlumni,
    mentors: finalMentors,
    jobs: finalJobs,
    events: finalEvents,
    generatedAt: new Date().toISOString(),
  };

  // 6. Cache into PostgreSQL RecommendationCache table
  try {
    const expiresAt = new Date(Date.now() + CACHE_TTL_MINUTES * 60 * 1000);
    await prisma.recommendationCache.create({
      data: {
        studentId: studentUserId,
        recommendationType: 'DASHBOARD_ALL',
        recommendations: payload,
        queryContext: studentContext.career_goal || 'default_profile',
        expiresAt,
      },
    });
  } catch (cacheErr) {
    console.warn('[RecommendationService] Caching recommendation failed:', cacheErr.message);
  }

  return {
    fromCache: false,
    ...payload,
  };
}

/**
 * Record student feedback on a recommendation
 */
async function recordRecommendationFeedback(studentUserId, { itemId, itemType, action, feedback }) {
  // Store feedback in recommendation cache metadata or logging
  console.log(`[RecommendationFeedback] Student ${studentUserId} - ${itemType} ${itemId}: ${action}`, feedback);
  return { success: true, message: 'Feedback recorded successfully' };
}

module.exports = {
  getStudentRecommendations,
  recordRecommendationFeedback,
};
