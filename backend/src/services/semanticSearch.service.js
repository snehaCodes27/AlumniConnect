const prisma = require('../config/prisma');
const connectionService = require('./connection.service');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

/**
 * Format alumni profile into structured candidate object for AI service
 */
function formatAlumniCandidate(profile, embeddingRecord = null) {
  const fullName = `${profile.user?.firstName || ''} ${profile.user?.lastName || ''}`.trim();
  return {
    id: profile.id,
    name: fullName || 'Alumnus',
    current_company: profile.currentCompany || null,
    job_role: profile.jobRole || null,
    domain: profile.domain || null,
    branch: profile.branch || null,
    graduation_year: profile.graduationYear || null,
    years_of_experience: profile.yearsOfExperience || 0,
    skills: profile.skills || [],
    areas_of_expertise: profile.areasOfExpertise || [],
    previous_companies: (profile.previousCompanies || []).map((pc) => ({
      company_name: pc.companyName,
      job_role: pc.jobRole || null,
      domain: pc.domain || null,
      start_year: pc.startYear || null,
      end_year: pc.endYear || null,
    })),
    mentorship_available: Boolean(profile.mentorshipAvailable),
    location: profile.location || null,
    embedding: embeddingRecord?.embedding || null,
  };
}

/**
 * Construct semantic text representation for embedding storage
 */
function buildAlumniSemanticText(profile) {
  const fullName = `${profile.user?.firstName || ''} ${profile.user?.lastName || ''}`.trim();
  const parts = [
    `Name: ${fullName}`,
    profile.jobRole ? `Role: ${profile.jobRole}` : '',
    profile.currentCompany ? `Company: ${profile.currentCompany}` : '',
    profile.yearsOfExperience ? `Experience: ${profile.yearsOfExperience} years` : '',
    profile.domain ? `Domain: ${profile.domain}` : '',
    profile.branch ? `Branch: ${profile.branch}` : '',
    profile.graduationYear ? `Class of: ${profile.graduationYear}` : '',
    profile.skills?.length ? `Skills: ${profile.skills.join(', ')}` : '',
    profile.areasOfExpertise?.length ? `Expertise: ${profile.areasOfExpertise.join(', ')}` : '',
    profile.mentorshipAvailable ? 'Mentorship: Available for 1-on-1 mentoring' : '',
    profile.location ? `Location: ${profile.location}` : '',
  ];

  if (profile.previousCompanies?.length) {
    const prev = profile.previousCompanies.map((c) => `${c.jobRole || 'Role'} at ${c.companyName}`).join('; ');
    parts.push(`Career History: ${prev}`);
  }

  return parts.filter(Boolean).join(' | ');
}

/**
 * Generate and persist embeddings in PostgreSQL for all alumni profiles missing embeddings
 */
async function syncAlumniEmbeddings() {
  try {
    const allAlumni = await prisma.alumniProfile.findMany({
      include: {
        user: true,
        previousCompanies: true,
        embedding: true,
      },
    });

    const needSync = allAlumni.filter((a) => !a.embedding || !a.embedding.embedding?.length);
    if (needSync.length === 0) {
      return { total: allAlumni.length, synced: 0, message: 'All alumni embeddings are up-to-date in PostgreSQL' };
    }

    const texts = needSync.map((a) => buildAlumniSemanticText(a));

    // Request embeddings from AI service
    let embeddings = [];
    try {
      const res = await fetch(`${AI_SERVICE_URL}/api/search/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts }),
      });
      if (res.ok) {
        const data = await res.json();
        embeddings = data.embeddings || [];
      }
    } catch (err) {
      console.warn('[SemanticSearchService] AI service embeddings call failed:', err.message);
    }

    // Save embeddings into PostgreSQL alumni_embeddings table
    let syncedCount = 0;
    for (let i = 0; i < needSync.length; i++) {
      const profile = needSync[i];
      const text = texts[i];
      const vector = embeddings[i] || [];

      await prisma.alumniEmbedding.upsert({
        where: { alumniProfileId: profile.id },
        create: {
          alumniProfileId: profile.id,
          embeddingText: text,
          embedding: vector,
          modelVersion: 'bge-small-en-v1.5',
        },
        update: {
          embeddingText: text,
          embedding: vector,
          modelVersion: 'bge-small-en-v1.5',
        },
      });
      syncedCount++;
    }

    return { total: allAlumni.length, synced: syncedCount, message: `Successfully synced ${syncedCount} alumni embeddings in PostgreSQL` };
  } catch (error) {
    console.error('[SemanticSearchService] Error during syncAlumniEmbeddings:', error);
    throw error;
  }
}

/**
 * Perform semantic search with PostgreSQL filter preservation
 */
async function searchAlumniSemantic({
  query = '',
  currentCompany = '',
  previousCompany = '',
  jobRole = '',
  branch = '',
  graduationYear = '',
  domain = '',
  skills = '',
  location = '',
  mentorshipAvailable = '',
  currentUserId = null,
  page = 1,
  limit = 20,
}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

  // 1. Build relational WHERE filters
  const where = {};
  if (graduationYear && !isNaN(parseInt(graduationYear, 10))) {
    where.graduationYear = parseInt(graduationYear, 10);
  }
  if (branch) {
    where.branch = { contains: branch, mode: 'insensitive' };
  }
  if (currentCompany) {
    where.currentCompany = { contains: currentCompany, mode: 'insensitive' };
  }
  if (jobRole) {
    where.jobRole = { contains: jobRole, mode: 'insensitive' };
  }
  if (domain) {
    where.domain = { contains: domain, mode: 'insensitive' };
  }
  if (location) {
    where.location = { contains: location, mode: 'insensitive' };
  }
  if (mentorshipAvailable === 'true' || mentorshipAvailable === true) {
    where.mentorshipAvailable = true;
  }
  if (skills) {
    const skillList = skills.split(',').map((s) => s.trim()).filter(Boolean);
    if (skillList.length > 0) {
      where.skills = { hasSome: skillList };
    }
  }
  if (previousCompany) {
    where.previousCompanies = {
      some: {
        companyName: { contains: previousCompany, mode: 'insensitive' },
      },
    };
  }

  // 2. Fetch candidate profiles from PostgreSQL
  const [totalCandidates, rawProfiles] = await Promise.all([
    prisma.alumniProfile.count({ where }),
    prisma.alumniProfile.findMany({
      where,
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
        previousCompanies: {
          orderBy: { startYear: 'desc' },
        },
        embedding: true,
      },
      take: 100, // Fetch up to 100 matching candidates for semantic reranking
    }),
  ]);

  if (rawProfiles.length === 0) {
    return {
      alumni: [],
      pagination: {
        total: 0,
        page: pageNum,
        limit: limitNum,
        totalPages: 0,
      },
    };
  }

  // 3. Attach real-time connection status
  const targetUserIds = rawProfiles.map((p) => p.userId).filter(Boolean);
  const connectionMap = currentUserId
    ? await connectionService.getConnectionStatusesMap(currentUserId, targetUserIds)
    : {};

  // 4. If query is provided, execute semantic reranking via AI Service
  let rankedProfiles = [];

  if (query && query.trim().length > 0) {
    const candidatesPayload = rawProfiles.map((p) => formatAlumniCandidate(p, p.embedding));

    try {
      const aiResponse = await fetch(`${AI_SERVICE_URL}/api/search/semantic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim(),
          candidates: candidatesPayload,
          top_k: limitNum * pageNum,
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        const resultsMap = new Map();
        (aiData.results || []).forEach((r) => {
          resultsMap.set(r.id, r);
        });

        rankedProfiles = rawProfiles.map((p) => {
          const aiResult = resultsMap.get(p.id);
          const relevanceScore = aiResult ? aiResult.relevance_score : 50;
          const semanticScore = aiResult ? aiResult.semantic_score : 50;
          const matchReasons = aiResult ? aiResult.match_reasons : ['Verified alumni profile'];

          return {
            ...p,
            relevanceScore,
            semanticScore,
            matchReasons,
            matchBreakdown: aiResult?.breakdown || null,
            connection: connectionMap[p.userId] || { status: 'NONE', isSender: false, connectionId: null },
          };
        });

        // Sort descending by relevance score
        rankedProfiles.sort((a, b) => b.relevanceScore - a.relevanceScore);
      } else {
        throw new Error(`AI service responded with status ${aiResponse.status}`);
      }
    } catch (err) {
      console.warn('[SemanticSearchService] Calling AI service failed, falling back to local heuristic ranking:', err.message);
      // Fallback local ranking
      rankedProfiles = fallbackRank(rawProfiles, query, skills, connectionMap);
    }
  } else {
    // Standard browsing sort
    rankedProfiles = rawProfiles.map((p) => ({
      ...p,
      relevanceScore: p.mentorshipAvailable ? 85 : 70,
      semanticScore: null,
      matchReasons: [
        p.mentorshipAvailable ? '🤝 Available for 1-on-1 Mentorship' : 'Alumni Network Member',
        p.yearsOfExperience ? `⭐ ${p.yearsOfExperience}+ Years Experience` : '',
        p.branch ? `🎓 ${p.branch}` : '',
      ].filter(Boolean),
      connection: connectionMap[p.userId] || { status: 'NONE', isSender: false, connectionId: null },
    }));

    rankedProfiles.sort((a, b) => {
      if (b.mentorshipAvailable !== a.mentorshipAvailable) {
        return b.mentorshipAvailable ? 1 : -1;
      }
      return (b.yearsOfExperience || 0) - (a.yearsOfExperience || 0);
    });
  }

  // 5. Apply pagination to ranked profiles
  const paginated = rankedProfiles.slice((pageNum - 1) * limitNum, pageNum * limitNum);

  return {
    alumni: paginated,
    pagination: {
      total: totalCandidates,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalCandidates / limitNum),
    },
  };
}

/**
 * Local fallback ranking when AI service is temporarily offline
 */
function fallbackRank(profiles, query, skills, connectionMap) {
  const queryTerms = (query || '').toLowerCase().split(/\s+/).filter(Boolean);
  const skillTerms = skills ? skills.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean) : [];

  return profiles
    .map((p) => {
      let score = 50;
      const reasons = [];
      const fullName = `${p.user?.firstName || ''} ${p.user?.lastName || ''}`.toLowerCase();
      const comp = (p.currentCompany || '').toLowerCase();
      const role = (p.jobRole || '').toLowerCase();
      const dom = (p.domain || '').toLowerCase();
      const pSkills = (p.skills || []).map((s) => s.toLowerCase());

      for (const term of queryTerms) {
        if (fullName.includes(term)) { score += 15; reasons.push(`Name matches: ${term}`); }
        if (comp.includes(term)) { score += 15; reasons.push(`Current company: ${p.currentCompany}`); }
        if (role.includes(term)) { score += 12; reasons.push(`Job role: ${p.jobRole}`); }
        if (dom.includes(term)) { score += 10; reasons.push(`Domain: ${p.domain}`); }
        if (pSkills.some((s) => s.includes(term))) { score += 10; reasons.push(`Skill match: ${term}`); }
      }

      if (p.mentorshipAvailable) {
        score += 8;
        reasons.push('Available for 1:1 Mentorship');
      }

      if ((p.yearsOfExperience || 0) >= 3) {
        score += 5;
        reasons.push(`${p.yearsOfExperience}+ Years Experience`);
      }

      const finalScore = Math.min(99, Math.max(30, score));
      if (!reasons.length) reasons.push('Alumni network member');

      return {
        ...p,
        relevanceScore: finalScore,
        semanticScore: Math.round(finalScore * 0.95),
        matchReasons: reasons,
        connection: connectionMap[p.userId] || { status: 'NONE', isSender: false, connectionId: null },
      };
    })
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}

module.exports = {
  searchAlumniSemantic,
  syncAlumniEmbeddings,
  formatAlumniCandidate,
  buildAlumniSemanticText,
};
