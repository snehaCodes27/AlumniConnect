const prisma = require('../config/prisma');
const notificationService = require('./notification.service');
const { emitToUser } = require('../socket');
const { sendSMS } = require('./twilio.service');

/**
 * Helper to compute skill match & eligibility for student vs job
 */
function computeJobMatch(studentProfile, job) {
  if (!studentProfile || !job) {
    return {
      matchScore: 60,
      matchingSkills: [],
      isEligible: true,
      eligibilityReasons: [],
    };
  }

  let score = 40; // baseline
  const normalize = (s) => (s || '').toLowerCase().trim();
  const tokenize = (arr) => (arr || []).map(normalize).filter(Boolean);

  const studentSkills = new Set([
    ...tokenize(studentProfile.skills),
    ...tokenize(studentProfile.technicalSkills),
    ...tokenize(studentProfile.tools),
  ]);

  const jobSkills = tokenize(job.skills);
  const matchingSkills = [];

  jobSkills.forEach((js) => {
    studentSkills.forEach((ss) => {
      if (ss === js || (ss.length > 2 && (ss.includes(js) || js.includes(ss)))) {
        if (!matchingSkills.includes(js)) matchingSkills.push(js);
      }
    });
  });

  if (jobSkills.length > 0) {
    const skillRatio = matchingSkills.length / jobSkills.length;
    score += Math.round(skillRatio * 40);
  } else {
    score += 20;
  }

  // Branch match
  const eligibleBranches = tokenize(job.eligibleBranches);
  const studentBranch = normalize(studentProfile.branch);
  let branchEligible = true;
  if (eligibleBranches.length > 0) {
    branchEligible = eligibleBranches.some((b) => studentBranch.includes(b) || b.includes(studentBranch));
    if (branchEligible) score += 10;
  } else {
    score += 5;
  }

  // CGPA match
  let cgpaEligible = true;
  if (job.minCgpa && studentProfile.cgpa) {
    const studentCgpa = parseFloat(studentProfile.cgpa);
    const minCgpa = parseFloat(job.minCgpa);
    if (studentCgpa < minCgpa) {
      cgpaEligible = false;
    } else {
      score += 10;
    }
  }

  const finalScore = Math.min(99, Math.max(30, score));

  return {
    matchScore: finalScore,
    matchingSkills,
    isEligible: branchEligible && cgpaEligible,
    eligibilityReasons: [
      !branchEligible ? `Requires: ${job.eligibleBranches.join(', ')}` : null,
      !cgpaEligible ? `Requires Min CGPA: ${job.minCgpa}` : null,
    ].filter(Boolean),
  };
}

/**
 * ALUMNI: Create a new Job Posting
 */
const createJob = async (alumniId, data) => {
  const alumni = await prisma.user.findUnique({
    where: { id: alumniId },
    include: { alumniProfile: true },
  });

  if (!alumni || (alumni.role?.toUpperCase() !== 'ALUMNI' && alumni.role?.toUpperCase() !== 'ADMIN')) {
    const error = new Error('Only registered alumni or administrators can post job openings.');
    error.statusCode = 403;
    throw error;
  }

  if (data.deadline) {
    const deadlineDate = new Date(data.deadline);
    if (isNaN(deadlineDate.getTime())) {
      const error = new Error('Invalid deadline date format.');
      error.statusCode = 400;
      throw error;
    }
    if (deadlineDate <= new Date()) {
      const error = new Error('Application deadline must be a future date.');
      error.statusCode = 400;
      throw error;
    }
  }

  const job = await prisma.job.create({
    data: {
      alumniId,
      company: data.company.trim(),
      title: data.title.trim(),
      location: data.location.trim(),
      employmentType: data.employmentType || 'FULL_TIME',
      workplaceType: data.workplaceType || 'On-site',
      description: data.description.trim(),
      requirements: data.requirements ? data.requirements.trim() : null,
      skills: (data.skills || []).map((s) => s.trim()).filter(Boolean),
      minExperience: parseInt(data.minExperience, 10) || 0,
      minCgpa: data.minCgpa !== undefined && data.minCgpa !== null && data.minCgpa !== '' ? parseFloat(data.minCgpa) : null,
      eligibleBranches: (data.eligibleBranches || []).map((b) => b.trim()).filter(Boolean),
      eligibleBatches: (data.eligibleBatches || []).map((b) => parseInt(b, 10)).filter((n) => !isNaN(n)),
      salary: data.salary ? data.salary.trim() : null,
      deadline: data.deadline ? new Date(data.deadline) : null,
      status: data.status || 'ACTIVE',
      externalApplyUrl: data.externalApplyUrl ? data.externalApplyUrl.trim() : null,
    },
    include: {
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

  // Automatically award gamification points to alumni for posting a job
  try {
    const gamificationService = require('./gamification.service');
    await gamificationService.awardPoints({
      userId: alumniId,
      activityType: 'JOB_POSTED',
      referenceId: job.id,
      referenceType: 'job',
      description: `Posted opportunity "${job.title}" at ${job.company}`,
    });
  } catch (gErr) {
    console.warn('[Gamification] Job post points award error:', gErr.message);
  }

  return job;
};

/**
 * ALUMNI: Update an existing Job Posting
 */
const updateJob = async (alumniId, jobId, data) => {
  const existingJob = await prisma.job.findUnique({
    where: { id: jobId },
  });

  if (!existingJob) {
    const error = new Error('Job opening not found.');
    error.statusCode = 404;
    throw error;
  }

  if (existingJob.alumniId !== alumniId) {
    const error = new Error('You are not authorized to edit this job posting.');
    error.statusCode = 403;
    throw error;
  }

  if (data.deadline) {
    const deadlineDate = new Date(data.deadline);
    if (isNaN(deadlineDate.getTime())) {
      const error = new Error('Invalid deadline date format.');
      error.statusCode = 400;
      throw error;
    }
  }

  const updateData = {};
  if (data.company !== undefined) updateData.company = data.company.trim();
  if (data.title !== undefined) updateData.title = data.title.trim();
  if (data.location !== undefined) updateData.location = data.location.trim();
  if (data.employmentType !== undefined) updateData.employmentType = data.employmentType;
  if (data.workplaceType !== undefined) updateData.workplaceType = data.workplaceType;
  if (data.description !== undefined) updateData.description = data.description.trim();
  if (data.requirements !== undefined) updateData.requirements = data.requirements ? data.requirements.trim() : null;
  if (data.skills !== undefined) updateData.skills = data.skills.map((s) => s.trim()).filter(Boolean);
  if (data.minExperience !== undefined) updateData.minExperience = parseInt(data.minExperience, 10) || 0;
  if (data.minCgpa !== undefined) updateData.minCgpa = data.minCgpa !== null && data.minCgpa !== '' ? parseFloat(data.minCgpa) : null;
  if (data.eligibleBranches !== undefined) updateData.eligibleBranches = data.eligibleBranches.map((b) => b.trim()).filter(Boolean);
  if (data.eligibleBatches !== undefined) updateData.eligibleBatches = data.eligibleBatches.map((b) => parseInt(b, 10)).filter((n) => !isNaN(n));
  if (data.salary !== undefined) updateData.salary = data.salary ? data.salary.trim() : null;
  if (data.deadline !== undefined) updateData.deadline = data.deadline ? new Date(data.deadline) : null;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.externalApplyUrl !== undefined) updateData.externalApplyUrl = data.externalApplyUrl ? data.externalApplyUrl.trim() : null;

  const updatedJob = await prisma.job.update({
    where: { id: jobId },
    data: updateData,
    include: {
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

  return updatedJob;
};

/**
 * ALUMNI: Close Job Posting
 */
const closeJob = async (alumniId, jobId) => {
  const existingJob = await prisma.job.findUnique({
    where: { id: jobId },
  });

  if (!existingJob) {
    const error = new Error('Job opening not found.');
    error.statusCode = 404;
    throw error;
  }

  if (existingJob.alumniId !== alumniId) {
    const error = new Error('You are not authorized to close this job posting.');
    error.statusCode = 403;
    throw error;
  }

  const updatedJob = await prisma.job.update({
    where: { id: jobId },
    data: { status: 'CLOSED' },
  });

  return updatedJob;
};

/**
 * ALUMNI: Delete Job Posting
 */
const deleteJob = async (alumniId, jobId) => {
  const existingJob = await prisma.job.findUnique({
    where: { id: jobId },
  });

  if (!existingJob) {
    const error = new Error('Job opening not found.');
    error.statusCode = 404;
    throw error;
  }

  if (existingJob.alumniId !== alumniId) {
    const error = new Error('You are not authorized to delete this job posting.');
    error.statusCode = 403;
    throw error;
  }

  await prisma.job.delete({
    where: { id: jobId },
  });

  return { success: true, message: 'Job posting deleted successfully.' };
};

/**
 * ALUMNI: Get all jobs posted by the logged-in alumni with applicant analytics
 */
const getAlumniJobs = async (alumniId, { status, page = 1, limit = 20 } = {}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

  const where = { alumniId };
  if (status && status !== 'ALL') {
    where.status = status;
  }

  const [total, jobs] = await Promise.all([
    prisma.job.count({ where }),
    prisma.job.findMany({
      where,
      include: {
        applications: {
          select: {
            id: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    }),
  ]);

  const mapped = jobs.map((j) => {
    const apps = j.applications || [];
    const counts = {
      total: apps.length,
      pending: apps.filter((a) => a.status === 'PENDING').length,
      reviewing: apps.filter((a) => a.status === 'REVIEWING').length,
      shortlisted: apps.filter((a) => a.status === 'SHORTLISTED').length,
      interview: apps.filter((a) => a.status === 'INTERVIEW').length,
      selected: apps.filter((a) => a.status === 'SELECTED').length,
      rejected: apps.filter((a) => a.status === 'REJECTED').length,
    };

    const isExpired = j.deadline && new Date(j.deadline) < new Date();

    return {
      ...j,
      isExpired,
      applicantCounts: counts,
    };
  });

  return {
    jobs: mapped,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
};

/**
 * ALUMNI: Get applicants for a specific Job Posting
 */
const getJobApplicants = async (alumniId, jobId, { status, page = 1, limit = 30 } = {}) => {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
  });

  if (!job) {
    const error = new Error('Job opening not found.');
    error.statusCode = 404;
    throw error;
  }

  if (job.alumniId !== alumniId) {
    const error = new Error('You are not authorized to view applicants for this job.');
    error.statusCode = 403;
    throw error;
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 30));

  const where = { jobId };
  if (status && status !== 'ALL') {
    where.status = status;
  }

  const [total, applications] = await Promise.all([
    prisma.jobApplication.count({ where }),
    prisma.jobApplication.findMany({
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

  // Compute matching score for each applicant against this job
  const mapped = applications.map((app) => {
    const match = computeJobMatch(app.student?.studentProfile, job);
    return {
      ...app,
      matchScore: match.matchScore,
      matchingSkills: match.matchingSkills,
      isEligible: match.isEligible,
      eligibilityReasons: match.eligibilityReasons,
    };
  });

  // Sort by match score desc if pending
  mapped.sort((a, b) => b.matchScore - a.matchScore);

  return {
    job: {
      id: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      employmentType: job.employmentType,
      status: job.status,
      deadline: job.deadline,
    },
    applicants: mapped,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
};

/**
 * ALUMNI: Update Applicant Status (Shortlisted, Interview, Selected, Rejected, Reviewing)
 */
const updateApplicationStatus = async (alumniId, applicationId, { status, reviewNotes, interviewDate }) => {
  const application = await prisma.jobApplication.findUnique({
    where: { id: applicationId },
    include: {
      job: true,
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          profilePhoto: true,
        },
      },
    },
  });

  if (!application) {
    const error = new Error('Application not found.');
    error.statusCode = 404;
    throw error;
  }

  if (application.job.alumniId !== alumniId) {
    const error = new Error('You are not authorized to update this application.');
    error.statusCode = 403;
    throw error;
  }

  const updated = await prisma.jobApplication.update({
    where: { id: applicationId },
    data: {
      status,
      reviewNotes: reviewNotes !== undefined ? (reviewNotes ? reviewNotes.trim() : null) : application.reviewNotes,
      interviewDate: interviewDate !== undefined ? (interviewDate ? new Date(interviewDate) : null) : application.interviewDate,
    },
    include: {
      job: true,
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
    },
  });

  // Create persistent notification in PostgreSQL for student
  let notifTitle = 'Job Application Update';
  let notifMsg = `Your application for "${application.job.title}" at ${application.job.company} was updated to ${status}.`;

  if (status === 'SHORTLISTED') {
    notifTitle = 'Application Shortlisted! ⭐';
    notifMsg = `Congratulations! You have been shortlisted for ${application.job.title} at ${application.job.company}.`;
  } else if (status === 'INTERVIEW') {
    notifTitle = 'Interview Scheduled! 📅';
    notifMsg = `An interview has been scheduled for your application to ${application.job.title} at ${application.job.company}.`;
  } else if (status === 'SELECTED') {
    notifTitle = 'Offer / Selected! 🎉';
    notifMsg = `Congratulations! You have been selected for ${application.job.title} at ${application.job.company}!`;
  } else if (status === 'REJECTED') {
    notifTitle = 'Application Status Update';
    notifMsg = `Update on your application for ${application.job.title} at ${application.job.company}.`;
  }

  await notificationService.createNotification({
    userId: application.studentId,
    actorId: alumniId,
    type: 'JOB_APPLICATION_STATUS_UPDATED',
    title: notifTitle,
    message: notifMsg,
    data: {
      applicationId: updated.id,
      jobId: application.jobId,
      status,
      reviewNotes: updated.reviewNotes,
      interviewDate: updated.interviewDate,
    },
  });

  // Emit real-time Socket.IO events to student and alumni
  emitToUser(application.studentId, 'job:application:status:updated', updated);
  emitToUser(alumniId, 'job:application:status:updated', updated);

  // Send SMS notification if application was transitioned to SHORTLISTED (preventing duplicate sends)
  if (status === 'SHORTLISTED' && application.status !== 'SHORTLISTED' && updated.student?.phone) {
    try {
      await sendSMS({
        to: updated.student.phone,
        body: 'AlumniConnect: You have been shortlisted for a job opportunity. Please check your Applications section for details.',
      });
    } catch (smsError) {
      // Graceful error handling: SMS failure never blocks the application status update flow
      console.warn(`[Job Application SMS Warning] Failed to send SMS to student ${application.studentId}:`, smsError.message);
    }
  }

  return updated;
};

/**
 * STUDENT / PUBLIC: Browse and Filter Active Job Openings
 */
const getActiveJobs = async ({ q, company, employmentType, workplaceType, location, skills, branch, page = 1, limit = 20 } = {}, studentUserId = null) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

  const where = {
    status: 'ACTIVE',
    OR: [
      { deadline: null },
      { deadline: { gte: new Date() } },
    ],
  };

  if (company) {
    where.company = { contains: company, mode: 'insensitive' };
  }

  if (employmentType && employmentType !== 'ALL') {
    where.employmentType = employmentType;
  }

  if (workplaceType && workplaceType !== 'ALL') {
    where.workplaceType = { contains: workplaceType, mode: 'insensitive' };
  }

  if (location) {
    where.location = { contains: location, mode: 'insensitive' };
  }

  if (branch) {
    where.eligibleBranches = { has: branch };
  }

  if (skills) {
    const skillList = skills.split(',').map((s) => s.trim()).filter(Boolean);
    if (skillList.length > 0) {
      where.skills = { hasSome: skillList };
    }
  }

  if (q) {
    where.AND = [
      {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { company: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { location: { contains: q, mode: 'insensitive' } },
        ],
      },
    ];
  }

  // Fetch student profile if studentUserId is present to calculate matching & application state
  let studentProfile = null;
  let studentApplicationsMap = {};

  if (studentUserId) {
    const studentUser = await prisma.user.findUnique({
      where: { id: studentUserId },
      include: {
        studentProfile: true,
        jobApplications: {
          select: {
            id: true,
            jobId: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    studentProfile = studentUser?.studentProfile || null;
    (studentUser?.jobApplications || []).forEach((app) => {
      studentApplicationsMap[app.jobId] = {
        applicationId: app.id,
        status: app.status,
        createdAt: app.createdAt,
      };
    });
  }

  const [total, jobs] = await Promise.all([
    prisma.job.count({ where }),
    prisma.job.findMany({
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
              select: {
                currentCompany: true,
                jobRole: true,
                branch: true,
                graduationYear: true,
              },
            },
          },
        },
        _count: {
          select: { applications: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    }),
  ]);

  const mapped = jobs.map((job) => {
    const applicationInfo = studentApplicationsMap[job.id] || {
      hasApplied: false,
      applicationId: null,
      status: 'NONE',
    };

    const match = computeJobMatch(studentProfile, job);

    return {
      ...job,
      applicantCount: job._count?.applications || 0,
      hasApplied: Boolean(studentApplicationsMap[job.id]),
      application: applicationInfo,
      matchScore: match.matchScore,
      matchingSkills: match.matchingSkills,
      isEligible: match.isEligible,
      eligibilityReasons: match.eligibilityReasons,
    };
  });

  // Sort by match score desc if student is logged in
  if (studentProfile) {
    mapped.sort((a, b) => b.matchScore - a.matchScore);
  }

  return {
    jobs: mapped,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
};

/**
 * STUDENT / PUBLIC: Get single Job details
 */
const getJobDetails = async (jobId, studentUserId = null) => {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
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
      _count: {
        select: { applications: true },
      },
    },
  });

  if (!job) {
    const error = new Error('Job opening not found.');
    error.statusCode = 404;
    throw error;
  }

  let applicationInfo = {
    hasApplied: false,
    applicationId: null,
    status: 'NONE',
  };
  let match = { matchScore: 60, matchingSkills: [], isEligible: true, eligibilityReasons: [] };

  if (studentUserId) {
    const studentUser = await prisma.user.findUnique({
      where: { id: studentUserId },
      include: {
        studentProfile: true,
        jobApplications: {
          where: { jobId },
        },
      },
    });

    if (studentUser) {
      match = computeJobMatch(studentUser.studentProfile, job);
      const app = studentUser.jobApplications?.[0];
      if (app) {
        applicationInfo = {
          hasApplied: true,
          applicationId: app.id,
          status: app.status,
          createdAt: app.createdAt,
          reviewNotes: app.reviewNotes,
          interviewDate: app.interviewDate,
        };
      }
    }
  }

  const isExpired = job.deadline && new Date(job.deadline) < new Date();

  return {
    ...job,
    isExpired,
    applicantCount: job._count?.applications || 0,
    hasApplied: applicationInfo.hasApplied,
    application: applicationInfo,
    matchScore: match.matchScore,
    matchingSkills: match.matchingSkills,
    isEligible: match.isEligible,
    eligibilityReasons: match.eligibilityReasons,
  };
};

/**
 * STUDENT: Apply for a Job Opening
 */
const applyForJob = async (studentUserId, jobId, { resumeUrl, coverLetter, portfolioUrl, linkedinUrl }) => {
  const student = await prisma.user.findUnique({
    where: { id: studentUserId },
    include: { studentProfile: true },
  });

  if (!student || student.role !== 'STUDENT') {
    const error = new Error('Only registered students can apply for job openings.');
    error.statusCode = 403;
    throw error;
  }

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { alumni: true },
  });

  if (!job) {
    const error = new Error('Job opening not found.');
    error.statusCode = 404;
    throw error;
  }

  if (job.status !== 'ACTIVE') {
    const error = new Error('This job opening is no longer accepting applications.');
    error.statusCode = 400;
    throw error;
  }

  if (job.deadline && new Date(job.deadline) < new Date()) {
    const error = new Error('The application deadline for this job has expired.');
    error.statusCode = 400;
    throw error;
  }

  // Prevent duplicate application
  const existingApp = await prisma.jobApplication.findUnique({
    where: {
      jobId_studentId: {
        jobId,
        studentId: studentUserId,
      },
    },
  });

  if (existingApp) {
    const error = new Error(`You have already applied for this job (Status: ${existingApp.status}).`);
    error.statusCode = 400;
    throw error;
  }

  // Auto-fill from student profile if not provided
  const finalResumeUrl = resumeUrl || student.studentProfile?.resumeUrl || null;
  const finalPortfolioUrl = portfolioUrl || student.studentProfile?.portfolioUrl || null;
  const finalLinkedinUrl = linkedinUrl || student.studentProfile?.linkedinUrl || null;

  const application = await prisma.jobApplication.create({
    data: {
      jobId,
      studentId: studentUserId,
      resumeUrl: finalResumeUrl,
      coverLetter: coverLetter ? coverLetter.trim() : null,
      portfolioUrl: finalPortfolioUrl,
      linkedinUrl: finalLinkedinUrl,
      status: 'PENDING',
    },
    include: {
      job: true,
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
  });

  // Create persistent PostgreSQL notification for the Alumni job poster
  await notificationService.createNotification({
    userId: job.alumniId,
    actorId: studentUserId,
    type: 'JOB_APPLICATION_SUBMITTED',
    title: 'New Job Application Received 📄',
    message: `${student.firstName} ${student.lastName} applied for "${job.title}" at ${job.company}.`,
    data: {
      jobId: job.id,
      applicationId: application.id,
      studentId: studentUserId,
      jobTitle: job.title,
    },
  });

  // Emit real-time Socket.IO events
  emitToUser(job.alumniId, 'job:application:received', application);
  emitToUser(studentUserId, 'job:application:submitted', application);

  return application;
};

/**
 * STUDENT: Get all applications submitted by logged-in student
 */
const getStudentApplications = async (studentUserId, { status, page = 1, limit = 30 } = {}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 30));

  const where = { studentId: studentUserId };
  if (status && status !== 'ALL') {
    where.status = status;
  }

  const [total, applications] = await Promise.all([
    prisma.jobApplication.count({ where }),
    prisma.jobApplication.findMany({
      where,
      include: {
        job: {
          include: {
            alumni: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                profilePhoto: true,
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

  return {
    applications,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
};

/**
 * STUDENT: Withdraw pending job application
 */
const withdrawApplication = async (studentUserId, applicationId) => {
  const application = await prisma.jobApplication.findUnique({
    where: { id: applicationId },
    include: { job: true },
  });

  if (!application) {
    const error = new Error('Application not found.');
    error.statusCode = 404;
    throw error;
  }

  if (application.studentId !== studentUserId) {
    const error = new Error('You are not authorized to withdraw this application.');
    error.statusCode = 403;
    throw error;
  }

  if (application.status !== 'PENDING') {
    const error = new Error(`Cannot withdraw an application that is already ${application.status.toLowerCase()}.`);
    error.statusCode = 400;
    throw error;
  }

  const updated = await prisma.jobApplication.update({
    where: { id: applicationId },
    data: { status: 'WITHDRAWN' },
  });

  emitToUser(application.job.alumniId, 'job:application:withdrawn', { applicationId });
  emitToUser(studentUserId, 'job:application:withdrawn', { applicationId });

  return updated;
};

module.exports = {
  createJob,
  updateJob,
  closeJob,
  deleteJob,
  getAlumniJobs,
  getJobApplicants,
  updateApplicationStatus,
  getActiveJobs,
  getJobDetails,
  applyForJob,
  getStudentApplications,
  withdrawApplication,
  computeJobMatch,
};
