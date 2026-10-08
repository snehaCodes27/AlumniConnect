const prisma = require('../config/prisma');
const notificationService = require('./notification.service');
const { emitToUser } = require('../socket');
const { sendSMS } = require('./twilio.service');

/**
 * Intelligent Multi-Factor Mentorship Matching Algorithm
 * Computes a weighted 0-100% score and returns detailed matching explanations & breakdown.
 *
 * Factors:
 * 1. Target Company Alignment (Up to 20 pts) - Current or Previous Companies
 * 2. Role & Career Goal Alignment (Up to 20 pts) - Job Role vs Preferred Role / Career Interests
 * 3. Domain Synergy (Up to 20 pts) - Domain vs Preferred Domain / Domain Interests
 * 4. Technical Skills & Tools Overlap (Up to 20 pts) - Skills & Tools vs Alumni Skills & Expertise
 * 5. Mentorship Availability (10 pts) - Whether alumni has flagged actively open for mentoring
 * 6. Branch / Academic Synergy (5 pts) - Same academic discipline/department
 * 7. Experience & Seniority Factor (Up to 5 pts) - Years of industry experience
 */
function calculateMentorMatch(studentProfile, alumniProfile) {
  if (!alumniProfile) {
    return {
      score: 50,
      level: 'GOOD',
      reasons: ['Verified College Alumni'],
      breakdown: {
        company: { points: 0, matched: false, detail: 'No target company match' },
        role: { points: 0, matched: false, detail: 'No role match' },
        domain: { points: 0, matched: false, detail: 'No domain match' },
        skills: { points: 0, count: 0, items: [] },
        availability: { points: 0, isAvailable: false },
        branch: { points: 0, matched: false },
        experience: { points: 0, years: 0 },
      },
    };
  }

  const sProf = studentProfile || {};
  let score = 0;
  const reasons = [];

  // Normalize helpers
  const normalize = (str) => (str || '').toLowerCase().trim();
  const tokenize = (arr) =>
    (arr || []).map((s) => normalize(s)).filter(Boolean);

  const studentDomain = normalize(sProf.preferredDomain);
  const studentDomainInterests = tokenize(sProf.domainInterests);
  const alumniDomain = normalize(alumniProfile.domain);

  // 1. Domain Alignment (Up to 20 pts)
  let domainPoints = 0;
  let domainDetail = 'Domain not specified';
  if (alumniDomain) {
    if (studentDomain && (alumniDomain.includes(studentDomain) || studentDomain.includes(alumniDomain))) {
      domainPoints = 20;
      domainDetail = `Target Domain Alignment: ${alumniProfile.domain}`;
      reasons.push(`🎯 Domain Alignment: ${alumniProfile.domain}`);
    } else if (
      studentDomainInterests.some(
        (d) => alumniDomain.includes(d) || d.includes(alumniDomain)
      )
    ) {
      domainPoints = 15;
      domainDetail = `Shared Domain Interest: ${alumniProfile.domain}`;
      reasons.push(`💡 Shared Interest: ${alumniProfile.domain}`);
    } else {
      domainPoints = 5;
      domainDetail = `Industry Domain: ${alumniProfile.domain}`;
    }
  }
  score += domainPoints;

  // 2. Target Role Alignment (Up to 20 pts)
  let rolePoints = 0;
  let roleDetail = 'Role not specified';
  const studentRole = normalize(sProf.preferredRole);
  const studentCareerInterests = tokenize(sProf.careerInterests);
  const alumniRole = normalize(alumniProfile.jobRole);

  if (alumniRole) {
    if (studentRole && (alumniRole.includes(studentRole) || studentRole.includes(alumniRole))) {
      rolePoints = 20;
      roleDetail = `Direct Role Match: ${alumniProfile.jobRole}`;
      reasons.push(`💼 Direct Role Match: ${alumniProfile.jobRole}`);
    } else if (
      studentCareerInterests.some((r) => alumniRole.includes(r) || r.includes(alumniRole))
    ) {
      rolePoints = 15;
      roleDetail = `Career Track Interest: ${alumniProfile.jobRole}`;
      reasons.push(`🚀 Career Track: ${alumniProfile.jobRole}`);
    } else {
      rolePoints = 5;
      roleDetail = `Professional Role: ${alumniProfile.jobRole}`;
    }
  }
  score += rolePoints;

  // 3. Target Company Alignment (Up to 20 pts)
  let companyPoints = 0;
  let companyDetail = 'No target company matched';
  const studentCompany = normalize(sProf.preferredCompany);
  const alumniCompany = normalize(alumniProfile.currentCompany);
  const previousCompanies = (alumniProfile.previousCompanies || []).map((c) =>
    normalize(c.companyName)
  );

  if (studentCompany) {
    if (alumniCompany && (alumniCompany.includes(studentCompany) || studentCompany.includes(alumniCompany))) {
      companyPoints = 20;
      companyDetail = `Currently at Target Company: ${alumniProfile.currentCompany}`;
      reasons.push(`🏢 Target Company: ${alumniProfile.currentCompany}`);
    } else if (
      previousCompanies.some((pc) => pc.includes(studentCompany) || studentCompany.includes(pc))
    ) {
      companyPoints = 14;
      companyDetail = `Former Experience at Target Company: ${sProf.preferredCompany}`;
      reasons.push(`🏛️ Former Experience at: ${sProf.preferredCompany}`);
    } else if (alumniCompany) {
      companyPoints = 5;
      companyDetail = `Top Company: ${alumniProfile.currentCompany}`;
    }
  } else if (alumniCompany) {
    companyPoints = 8;
    companyDetail = `Active at ${alumniProfile.currentCompany}`;
  }
  score += companyPoints;

  // 4. Skills & Technical Overlap (Up to 20 pts)
  const studentSkills = new Set([
    ...tokenize(sProf.skills),
    ...tokenize(sProf.technicalSkills),
    ...tokenize(sProf.tools),
  ]);

  const alumniSkills = new Set([
    ...tokenize(alumniProfile.skills),
    ...tokenize(alumniProfile.areasOfExpertise),
  ]);

  const matchingSkills = [];
  studentSkills.forEach((s) => {
    alumniSkills.forEach((as) => {
      if (s === as || (s.length > 2 && (s.includes(as) || as.includes(s)))) {
        if (!matchingSkills.includes(s)) matchingSkills.push(s);
      }
    });
  });

  let skillPoints = 0;
  if (matchingSkills.length > 0) {
    skillPoints = Math.min(20, matchingSkills.length * 5);
    score += skillPoints;
    const sample = matchingSkills.slice(0, 3).map((s) => s.toUpperCase()).join(', ');
    reasons.push(`⚡ ${matchingSkills.length} Shared Skill${matchingSkills.length > 1 ? 's' : ''} (${sample})`);
  } else {
    skillPoints = 4;
    score += skillPoints;
  }

  // 5. Mentorship Availability (10 pts)
  let availabilityPoints = 0;
  if (alumniProfile.mentorshipAvailable) {
    availabilityPoints = 10;
    score += 10;
    reasons.push('🟢 Actively Available for Mentorship');
  }

  // 6. Branch / Academic Synergy (5 pts)
  let branchPoints = 0;
  if (
    sProf.branch &&
    alumniProfile.branch &&
    normalize(sProf.branch) === normalize(alumniProfile.branch)
  ) {
    branchPoints = 5;
    score += 5;
    reasons.push(`🎓 Same Branch: ${sProf.branch}`);
  }

  // 7. Experience Level Booster (up to 5 pts)
  const years = parseInt(alumniProfile.yearsOfExperience, 10) || 0;
  let experiencePoints = 0;
  if (years > 0) {
    experiencePoints = Math.min(5, years);
    score += experiencePoints;
    if (years >= 3) {
      reasons.push(`⭐ ${years}+ Years Industry Experience`);
    }
  }

  // Ensure score is bounded between 35 and 99%
  const finalScore = Math.min(99, Math.max(35, score));

  let level = 'GOOD';
  if (finalScore >= 85) level = 'EXCELLENT';
  else if (finalScore >= 70) level = 'HIGH';
  else if (finalScore >= 50) level = 'GOOD';
  else level = 'MODERATE';

  if (reasons.length === 0) {
    reasons.push('Verified Alumni Network Member');
  }

  return {
    score: finalScore,
    level,
    reasons,
    breakdown: {
      company: { points: companyPoints, matched: companyPoints >= 14, detail: companyDetail },
      role: { points: rolePoints, matched: rolePoints >= 15, detail: roleDetail },
      domain: { points: domainPoints, matched: domainPoints >= 15, detail: domainDetail },
      skills: { points: skillPoints, count: matchingSkills.length, items: matchingSkills },
      availability: { points: availabilityPoints, isAvailable: alumniProfile.mentorshipAvailable },
      branch: { points: branchPoints, matched: branchPoints > 0 },
      experience: { points: experiencePoints, years },
    },
  };
}

/**
 * Get Intelligent Mentor Recommendations for Student
 * Queries real PostgreSQL database, ranks alumni using multi-factor calculation,
 * and attaches live request statuses.
 */
const getRecommendedMentors = async (studentUserId, { domain, skills, availableOnly, limit = 20 } = {}) => {
  // 1. Fetch Student Profile
  const student = await prisma.user.findUnique({
    where: { id: studentUserId },
    include: { studentProfile: true },
  });

  const studentProfile = student?.studentProfile || {};

  // 2. Fetch all alumni profiles
  const where = {};
  if (domain) {
    where.domain = { contains: domain, mode: 'insensitive' };
  }
  if (skills) {
    const skillList = skills.split(',').map((s) => s.trim()).filter(Boolean);
    if (skillList.length > 0) {
      where.skills = { hasSome: skillList };
    }
  }
  if (availableOnly === 'true' || availableOnly === true) {
    where.mentorshipAvailable = true;
  }

  const alumniProfiles = await prisma.alumniProfile.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          profilePhoto: true,
          role: true,
        },
      },
      previousCompanies: {
        orderBy: { startYear: 'desc' },
      },
    },
  });

  // 3. Fetch existing mentorship requests by this student to determine live status
  const existingRequests = await prisma.mentorshipRequest.findMany({
    where: { studentId: studentUserId },
    select: {
      id: true,
      alumniId: true,
      status: true,
      topic: true,
      goals: true,
      message: true,
      responseNote: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const requestMap = {};
  existingRequests.forEach((req) => {
    // Keep the most relevant/recent request
    if (!requestMap[req.alumniId] || ['PENDING', 'ACCEPTED'].includes(req.status)) {
      requestMap[req.alumniId] = {
        requestId: req.id,
        status: req.status,
        topic: req.topic,
        goals: req.goals,
        message: req.message,
        responseNote: req.responseNote,
        createdAt: req.createdAt,
      };
    }
  });

  // 4. Calculate matching score for each mentor
  const rankedMentors = alumniProfiles
    .filter((a) => a.userId !== studentUserId && a.user) // Exclude self & invalid
    .map((alumni) => {
      const match = calculateMentorMatch(studentProfile, alumni);
      const requestInfo = requestMap[alumni.userId] || {
        requestId: null,
        status: 'NONE',
      };

      return {
        ...alumni,
        matchScore: match.score,
        matchLevel: match.level,
        matchReasons: match.reasons,
        matchBreakdown: match.breakdown,
        mentorshipRequest: requestInfo,
      };
    });

  // 5. Sort by matchScore descending, then mentorshipAvailable, then experience
  rankedMentors.sort((a, b) => {
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    if (b.mentorshipAvailable !== a.mentorshipAvailable) return (b.mentorshipAvailable ? 1 : 0) - (a.mentorshipAvailable ? 1 : 0);
    return (b.yearsOfExperience || 0) - (a.yearsOfExperience || 0);
  });

  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

  return {
    studentProfileSummary: {
      branch: studentProfile.branch,
      domain: studentProfile.preferredDomain,
      role: studentProfile.preferredRole,
      company: studentProfile.preferredCompany,
      skills: [
        ...(studentProfile.technicalSkills || []),
        ...(studentProfile.skills || []),
      ],
    },
    total: rankedMentors.length,
    mentors: rankedMentors.slice(0, limitNum),
  };
};

/**
 * Send Mentorship Request
 * Validates role, checks existing active request, saves in DB, creates notification, emits Socket.IO event.
 */
const sendMentorshipRequest = async ({ studentId, alumniId, topic = 'General Mentorship', goals = '', message }) => {
  if (!alumniId) {
    const error = new Error('Alumni mentor ID is required.');
    error.statusCode = 400;
    throw error;
  }

  if (studentId === alumniId) {
    const error = new Error('You cannot request mentorship from yourself.');
    error.statusCode = 400;
    throw error;
  }

  if (!message || !message.trim()) {
    const error = new Error('Please include a message introducing yourself and stating your mentorship goals.');
    error.statusCode = 400;
    throw error;
  }

  // Verify alumni exists
  const alumni = await prisma.user.findUnique({
    where: { id: alumniId },
    include: { alumniProfile: true },
  });

  if (!alumni || alumni.role !== 'ALUMNI') {
    const error = new Error('Mentor was not found or is not registered as an alumni.');
    error.statusCode = 404;
    throw error;
  }

  // Check for existing active mentorship request
  const existing = await prisma.mentorshipRequest.findFirst({
    where: {
      studentId,
      alumniId,
      status: { in: ['PENDING', 'ACCEPTED'] },
    },
  });

  if (existing) {
    if (existing.status === 'ACCEPTED') {
      const error = new Error('You already have an active mentorship with this alumni mentor.');
      error.statusCode = 400;
      throw error;
    }
    if (existing.status === 'PENDING') {
      const error = new Error('You already have a pending mentorship request with this alumni mentor.');
      error.statusCode = 400;
      throw error;
    }
  }

  // Fetch student details for notification & socket payload
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    include: { studentProfile: true },
  });

  // Calculate match score to attach in request
  const match = calculateMentorMatch(student.studentProfile, alumni.alumniProfile);

  // Create Mentorship Request
  const mentorshipRequest = await prisma.mentorshipRequest.create({
    data: {
      studentId,
      alumniId,
      topic: topic?.trim() || 'Career Guidance',
      goals: goals?.trim() || null,
      message: message.trim(),
      status: 'PENDING',
    },
    include: {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          profilePhoto: true,
          studentProfile: true,
        },
      },
      alumni: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          profilePhoto: true,
          alumniProfile: true,
        },
      },
    },
  });

  const payload = {
    ...mentorshipRequest,
    matchScore: match.score,
    matchLevel: match.level,
    matchReasons: match.reasons,
    matchBreakdown: match.breakdown,
  };

  // Create persistent PostgreSQL Notification for Alumni
  await notificationService.createNotification({
    userId: alumniId,
    actorId: studentId,
    type: 'MENTORSHIP_REQUEST',
    title: 'New Mentorship Request 🤝',
    message: `${student.firstName} ${student.lastName} requested mentorship on "${topic}" (${match.score}% Match).`,
    data: {
      mentorshipRequestId: mentorshipRequest.id,
      studentId,
      topic,
      matchScore: match.score,
    },
  });

  // Real-time Socket.IO events
  emitToUser(alumniId, 'mentorship:request:received', payload);
  emitToUser(studentId, 'mentorship:request:sent', payload);

  return payload;
};

/**
 * Respond to Mentorship Request (Accept / Reject)
 */
const respondToMentorshipRequest = async ({ alumniId, requestId, status, responseNote = '' }) => {
  if (!['ACCEPTED', 'REJECTED'].includes(status)) {
    const error = new Error("Invalid status. Allowed values are 'ACCEPTED' or 'REJECTED'.");
    error.statusCode = 400;
    throw error;
  }

  const request = await prisma.mentorshipRequest.findUnique({
    where: { id: requestId },
    include: {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          profilePhoto: true,
          studentProfile: true,
        },
      },
      alumni: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          profilePhoto: true,
          alumniProfile: true,
        },
      },
    },
  });

  if (!request) {
    const error = new Error('Mentorship request not found.');
    error.statusCode = 404;
    throw error;
  }

  if (request.alumniId !== alumniId) {
    const error = new Error('You are not authorized to respond to this mentorship request.');
    error.statusCode = 403;
    throw error;
  }

  if (request.status !== 'PENDING') {
    const error = new Error(`Mentorship request is already ${request.status.toLowerCase()}.`);
    error.statusCode = 400;
    throw error;
  }

  const updatedRequest = await prisma.mentorshipRequest.update({
    where: { id: requestId },
    data: {
      status,
      responseNote: responseNote?.trim() || null,
    },
    include: {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          profilePhoto: true,
          studentProfile: true,
        },
      },
      alumni: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          profilePhoto: true,
          alumniProfile: true,
        },
      },
    },
  });

  // Also automatically ensure connection is accepted if mentorship is accepted
  if (status === 'ACCEPTED') {
    await prisma.connection.upsert({
      where: {
        senderId_receiverId: {
          senderId: request.studentId,
          receiverId: alumniId,
        },
      },
      create: {
        senderId: request.studentId,
        receiverId: alumniId,
        status: 'ACCEPTED',
        message: `Mentorship: ${request.topic || 'General Guidance'}`,
      },
      update: {
        status: 'ACCEPTED',
      },
    });

    // Automatically award gamification points to alumni for accepting mentorship
    try {
      const gamificationService = require('./gamification.service');
      await gamificationService.awardPoints({
        userId: alumniId,
        activityType: 'MENTORSHIP_ACCEPTED',
        referenceId: updatedRequest.id,
        referenceType: 'mentorship_request',
        description: `Accepted mentorship request for "${updatedRequest.topic}"`,
      });
    } catch (gErr) {
      console.warn('[Gamification] Mentorship accept points award error:', gErr.message);
    }
  }

  // Create persistent PostgreSQL Notification for Student
  await notificationService.createNotification({
    userId: request.studentId,
    actorId: alumniId,
    type: status === 'ACCEPTED' ? 'MENTORSHIP_ACCEPTED' : 'MENTORSHIP_REJECTED',
    title: status === 'ACCEPTED' ? 'Mentorship Request Accepted! 🎉' : 'Mentorship Request Update',
    message: `${request.alumni.firstName} ${request.alumni.lastName} ${
      status === 'ACCEPTED'
        ? `accepted your mentorship request for "${request.topic}".`
        : `was unable to accept your mentorship request for "${request.topic}".`
    }`,
    data: {
      mentorshipRequestId: updatedRequest.id,
      alumniId,
      status,
      responseNote: updatedRequest.responseNote,
    },
  });

  // Emit real-time Socket.IO events
  emitToUser(request.studentId, 'mentorship:updated', updatedRequest);
  emitToUser(alumniId, 'mentorship:updated', updatedRequest);

  // Additionally dispatch SMS notification to student if mentorship was accepted and phone is available
  if (status === 'ACCEPTED' && updatedRequest.student?.phone) {
    try {
      await sendSMS({
        to: updatedRequest.student.phone,
        body: 'AlumniConnect: Your mentorship request has been accepted. You can now connect with your mentor.',
      });
    } catch (smsError) {
      // Graceful error handling: SMS failure never breaks the mentorship acceptance flow
      console.warn(`[Mentorship SMS Warning] Failed to send SMS to student ${request.studentId}:`, smsError.message);
    }
  }

  return updatedRequest;
};

/**
 * Complete Mentorship
 */
const completeMentorship = async ({ userId, requestId }) => {
  const request = await prisma.mentorshipRequest.findUnique({
    where: { id: requestId },
    include: { student: true, alumni: true },
  });

  if (!request) {
    const error = new Error('Mentorship not found.');
    error.statusCode = 404;
    throw error;
  }

  if (request.studentId !== userId && request.alumniId !== userId) {
    const error = new Error('Not authorized to complete this mentorship.');
    error.statusCode = 403;
    throw error;
  }

  const updated = await prisma.mentorshipRequest.update({
    where: { id: requestId },
    data: { status: 'COMPLETED' },
    include: { student: true, alumni: true },
  });

  const otherUserId = request.studentId === userId ? request.alumniId : request.studentId;

  await notificationService.createNotification({
    userId: otherUserId,
    actorId: userId,
    type: 'MENTORSHIP_COMPLETED',
    title: 'Mentorship Marked Completed 🏆',
    message: `Mentorship session on "${request.topic}" has been marked completed.`,
    data: { mentorshipRequestId: requestId },
  });

  emitToUser(request.studentId, 'mentorship:updated', updated);
  emitToUser(request.alumniId, 'mentorship:updated', updated);

  // Automatically award gamification points to alumni for completing mentorship
  try {
    const gamificationService = require('./gamification.service');
    await gamificationService.awardPoints({
      userId: request.alumniId,
      activityType: 'MENTORSHIP_COMPLETED',
      referenceId: updated.id,
      referenceType: 'mentorship_request',
      description: `Completed mentorship session for "${updated.topic}"`,
    });
  } catch (gErr) {
    console.warn('[Gamification] Mentorship complete points award error:', gErr.message);
  }

  return updated;
};

/**
 * Cancel Pending Mentorship Request (Student)
 */
const cancelMentorshipRequest = async ({ studentId, requestId }) => {
  const request = await prisma.mentorshipRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    const error = new Error('Mentorship request not found.');
    error.statusCode = 404;
    throw error;
  }

  if (request.studentId !== studentId) {
    const error = new Error('You are not authorized to cancel this request.');
    error.statusCode = 403;
    throw error;
  }

  if (request.status !== 'PENDING') {
    const error = new Error(`Cannot cancel a request that is already ${request.status.toLowerCase()}.`);
    error.statusCode = 400;
    throw error;
  }

  const updated = await prisma.mentorshipRequest.update({
    where: { id: requestId },
    data: { status: 'CANCELLED' },
  });

  emitToUser(request.alumniId, 'mentorship:cancelled', { requestId });
  emitToUser(studentId, 'mentorship:cancelled', { requestId });

  return updated;
};

/**
 * Get Received Mentorship Requests (Alumni)
 */
const getReceivedMentorshipRequests = async (alumniId, { status, page = 1, limit = 20 } = {}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

  const where = { alumniId };
  if (status && status !== 'ALL') {
    where.status = status;
  }

  // Fetch alumni profile for matching calculation
  const alumni = await prisma.user.findUnique({
    where: { id: alumniId },
    include: { alumniProfile: true },
  });

  const [total, requests] = await Promise.all([
    prisma.mentorshipRequest.count({ where }),
    prisma.mentorshipRequest.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profilePhoto: true,
            studentProfile: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    }),
  ]);

  // Attach match score for alumni to see how relevant student is
  const mapped = requests.map((req) => {
    const match = calculateMentorMatch(req.student?.studentProfile, alumni?.alumniProfile);
    return {
      ...req,
      matchScore: match.score,
      matchLevel: match.level,
      matchReasons: match.reasons,
      matchBreakdown: match.breakdown,
    };
  });

  return {
    requests: mapped,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
};

/**
 * Get Sent Mentorship Requests (Student)
 */
const getSentMentorshipRequests = async (studentId, { status, page = 1, limit = 20 } = {}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

  const where = { studentId };
  if (status && status !== 'ALL') {
    where.status = status;
  }

  // Fetch student profile to compute match
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    include: { studentProfile: true },
  });

  const [total, requests] = await Promise.all([
    prisma.mentorshipRequest.count({ where }),
    prisma.mentorshipRequest.findMany({
      where,
      include: {
        alumni: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profilePhoto: true,
            alumniProfile: {
              include: {
                previousCompanies: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    }),
  ]);

  const mapped = requests.map((req) => {
    const match = calculateMentorMatch(student?.studentProfile, req.alumni?.alumniProfile);
    return {
      ...req,
      matchScore: match.score,
      matchLevel: match.level,
      matchReasons: match.reasons,
      matchBreakdown: match.breakdown,
    };
  });

  return {
    requests: mapped,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
};

/**
 * Get Active Mentorships for User
 */
const getActiveMentorships = async (userId) => {
  const mentorships = await prisma.mentorshipRequest.findMany({
    where: {
      status: 'ACCEPTED',
      OR: [{ studentId: userId }, { alumniId: userId }],
    },
    include: {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          profilePhoto: true,
          studentProfile: true,
        },
      },
      alumni: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          profilePhoto: true,
          alumniProfile: {
            include: {
              previousCompanies: true,
            },
          },
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return mentorships;
};

module.exports = {
  calculateMentorMatch,
  getRecommendedMentors,
  sendMentorshipRequest,
  respondToMentorshipRequest,
  completeMentorship,
  cancelMentorshipRequest,
  getReceivedMentorshipRequests,
  getSentMentorshipRequests,
  getActiveMentorships,
};
