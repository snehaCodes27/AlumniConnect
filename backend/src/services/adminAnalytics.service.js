const prisma = require('../config/prisma');

/**
 * Admin Analytics Service
 * All data is derived from real PostgreSQL queries via Prisma.
 */

/** ── KPI Summary Cards ───────────────────────────────────────────────── */
const getKpiStats = async () => {
  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const [
    totalStudents,
    totalAlumni,
    activeAlumni,
    mentorshipSessions,
    jobApplications,
    studentsShortlisted,
    eventsCount,
    communityPosts,
    // Last month comparisons
    lastMonthStudents,
    lastMonthAlumni,
    lastMonthActiveAlumni,
    lastMonthMentorship,
    lastMonthApplications,
    lastMonthShortlisted,
    lastMonthEvents,
    lastMonthPosts,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'STUDENT', isApproved: true } }),
    prisma.user.count({ where: { role: 'ALUMNI', isApproved: true } }),
    prisma.user.count({ where: { role: 'ALUMNI', isApproved: true, lastLoginAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }),
    prisma.mentorshipRequest.count({ where: { status: { in: ['ACCEPTED', 'COMPLETED'] } } }),
    prisma.jobApplication.count(),
    prisma.jobApplication.count({ where: { status: 'SHORTLISTED' } }),
    prisma.event.count({ where: { status: { in: ['PUBLISHED', 'COMPLETED'] } } }),
    prisma.communityPost.count({ where: { status: 'ACTIVE' } }),
    // Last month
    prisma.user.count({ where: { role: 'STUDENT', isApproved: true, createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
    prisma.user.count({ where: { role: 'ALUMNI', isApproved: true, createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
    prisma.user.count({ where: { role: 'ALUMNI', isApproved: true, lastLoginAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
    prisma.mentorshipRequest.count({ where: { status: { in: ['ACCEPTED', 'COMPLETED'] }, createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
    prisma.jobApplication.count({ where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
    prisma.jobApplication.count({ where: { status: 'SHORTLISTED', updatedAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
    prisma.event.count({ where: { status: { in: ['PUBLISHED', 'COMPLETED'] }, createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
    prisma.communityPost.count({ where: { status: 'ACTIVE', createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
  ]);

  const pctChange = (current, prev) => {
    if (prev === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - prev) / prev) * 100);
  };

  return {
    totalStudents: { value: totalStudents, change: pctChange(totalStudents, totalStudents - lastMonthStudents) },
    totalAlumni: { value: totalAlumni, change: pctChange(totalAlumni, totalAlumni - lastMonthAlumni) },
    activeAlumni: { value: activeAlumni, change: pctChange(activeAlumni, activeAlumni - lastMonthActiveAlumni) },
    mentorshipSessions: { value: mentorshipSessions, change: pctChange(mentorshipSessions, mentorshipSessions - lastMonthMentorship) },
    jobApplications: { value: jobApplications, change: pctChange(jobApplications, jobApplications - lastMonthApplications) },
    studentsShortlisted: { value: studentsShortlisted, change: pctChange(studentsShortlisted, studentsShortlisted - lastMonthShortlisted) },
    eventsWebinars: { value: eventsCount, change: pctChange(eventsCount, eventsCount - lastMonthEvents) },
    communityPosts: { value: communityPosts, change: pctChange(communityPosts, communityPosts - lastMonthPosts) },
  };
};

/** ── Platform Activity Chart (last 10 months) ───────────────────────── */
const getPlatformActivityChart = async () => {
  const months = [];
  for (let i = 9; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    months.push({
      label: d.toLocaleString('default', { month: 'short' }),
      start: new Date(d.getFullYear(), d.getMonth(), 1),
      end: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59),
    });
  }

  const data = await Promise.all(
    months.map(async (m) => {
      const [newStudents, newAlumni, jobApps, mentorship] = await Promise.all([
        prisma.user.count({ where: { role: 'STUDENT', createdAt: { gte: m.start, lte: m.end } } }),
        prisma.user.count({ where: { role: 'ALUMNI', createdAt: { gte: m.start, lte: m.end } } }),
        prisma.jobApplication.count({ where: { createdAt: { gte: m.start, lte: m.end } } }),
        prisma.mentorshipRequest.count({ where: { createdAt: { gte: m.start, lte: m.end } } }),
      ]);
      return { month: m.label, newStudents, newAlumni, jobApplications: jobApps, mentorshipSessions: mentorship };
    })
  );

  return data;
};

/** ── User Growth Chart (last 10 months) ─────────────────────────────── */
const getUserGrowthChart = async () => {
  const months = [];
  for (let i = 9; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    months.push({
      label: d.toLocaleString('default', { month: 'short' }),
      start: new Date(d.getFullYear(), d.getMonth(), 1),
      end: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59),
    });
  }

  const data = await Promise.all(
    months.map(async (m) => {
      const [students, alumni] = await Promise.all([
        prisma.user.count({ where: { role: 'STUDENT', createdAt: { gte: m.start, lte: m.end } } }),
        prisma.user.count({ where: { role: 'ALUMNI', createdAt: { gte: m.start, lte: m.end } } }),
      ]);
      return { month: m.label, students, alumni };
    })
  );

  return data;
};

/** ── Recent Activity Feed ────────────────────────────────────────────── */
const getRecentActivity = async (limit = 10) => {
  const [recentUsers, recentMentorships, recentApplications, recentEvents] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: ['STUDENT', 'ALUMNI'] } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { id: true, firstName: true, lastName: true, role: true, createdAt: true },
    }),
    prisma.mentorshipRequest.findMany({
      orderBy: { updatedAt: 'desc' },
      take: limit,
      where: { status: 'ACCEPTED' },
      select: { id: true, updatedAt: true, student: { select: { firstName: true, lastName: true } } },
    }),
    prisma.jobApplication.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true, createdAt: true,
        job: { select: { title: true, company: true } },
        student: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.event.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { id: true, title: true, createdAt: true },
    }),
  ]);

  const activities = [
    ...recentUsers.map((u) => ({
      id: `user-${u.id}`,
      type: u.role === 'STUDENT' ? 'student_registered' : 'alumni_registered',
      message: u.role === 'STUDENT'
        ? `New student registration: ${u.firstName} ${u.lastName}`
        : `Alumni registered: ${u.firstName} ${u.lastName}`,
      timestamp: u.createdAt,
    })),
    ...recentMentorships.map((m) => ({
      id: `mentorship-${m.id}`,
      type: 'mentorship_accepted',
      message: 'Mentorship session completed',
      timestamp: m.updatedAt,
    })),
    ...recentApplications.map((a) => ({
      id: `app-${a.id}`,
      type: 'job_application',
      message: `Job application received: ${a.job?.title || 'Unknown Role'}`,
      timestamp: a.createdAt,
    })),
    ...recentEvents.map((e) => ({
      id: `event-${e.id}`,
      type: 'event_created',
      message: `New event created: ${e.title}`,
      timestamp: e.createdAt,
    })),
  ];

  return activities
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit);
};

/** ── Upcoming Events ─────────────────────────────────────────────────── */
const getUpcomingEvents = async (limit = 5) => {
  const events = await prisma.event.findMany({
    where: {
      status: 'PUBLISHED',
      startDate: { gte: new Date() },
    },
    orderBy: { startDate: 'asc' },
    take: limit,
    select: {
      id: true,
      title: true,
      type: true,
      location: true,
      startDate: true,
      endDate: true,
      _count: { select: { registrations: true } },
    },
  });

  return events.map((e) => ({
    id: e.id,
    title: e.title,
    type: e.type,
    location: e.location,
    startDate: e.startDate,
    endDate: e.endDate,
    registeredCount: e._count.registrations,
  }));
};

/** ── Top Companies by Applications ──────────────────────────────────── */
const getTopCompaniesByApplications = async (limit = 5) => {
  const jobs = await prisma.job.findMany({
    select: {
      company: true,
      _count: { select: { applications: true } },
    },
  });

  // Aggregate by company name
  const companyMap = {};
  for (const job of jobs) {
    const co = job.company;
    companyMap[co] = (companyMap[co] || 0) + job._count.applications;
  }

  const sorted = Object.entries(companyMap)
    .map(([company, applications]) => ({ company, applications }))
    .sort((a, b) => b.applications - a.applications)
    .slice(0, limit);

  const maxApps = sorted[0]?.applications || 1;
  return sorted.map((c) => ({ ...c, percentage: Math.round((c.applications / maxApps) * 100) }));
};

/** ── Job Application Funnel ──────────────────────────────────────────── */
const getApplicationFunnel = async () => {
  const [applied, reviewing, shortlisted, interview, selected] = await Promise.all([
    prisma.jobApplication.count(),
    prisma.jobApplication.count({ where: { status: 'REVIEWING' } }),
    prisma.jobApplication.count({ where: { status: 'SHORTLISTED' } }),
    prisma.jobApplication.count({ where: { status: 'INTERVIEW' } }),
    prisma.jobApplication.count({ where: { status: 'SELECTED' } }),
  ]);

  return { applied, reviewing, shortlisted, interview, selected };
};

/** ── Mentorship Metrics ──────────────────────────────────────────────── */
const getMentorshipMetrics = async () => {
  const [accepted, pending, rejected, total] = await Promise.all([
    prisma.mentorshipRequest.count({ where: { status: 'ACCEPTED' } }),
    prisma.mentorshipRequest.count({ where: { status: 'PENDING' } }),
    prisma.mentorshipRequest.count({ where: { status: 'REJECTED' } }),
    prisma.mentorshipRequest.count(),
  ]);

  const acceptanceRate = total > 0 ? Math.round((accepted / total) * 100) : 0;

  return { accepted, pending, rejected, total, acceptanceRate };
};

/** ── Platform Impact Summary ─────────────────────────────────────────── */
const getPlatformImpact = async () => {
  const [eventRatings, totalRegistrations] = await Promise.all([
    prisma.eventRegistration.findMany({
      where: { rating: { not: null } },
      select: { rating: true },
    }),
    prisma.eventRegistration.count(),
  ]);

  const avgRating = eventRatings.length > 0
    ? (eventRatings.reduce((sum, r) => sum + r.rating, 0) / eventRatings.length).toFixed(1)
    : '0.0';

  const [selected, totalApplications] = await Promise.all([
    prisma.jobApplication.count({ where: { status: 'SELECTED' } }),
    prisma.jobApplication.count(),
  ]);

  const placementRate = totalApplications > 0
    ? Math.round((selected / totalApplications) * 100)
    : 0;

  // Student satisfaction: derived from event rating as proxy (out of 100%)
  const studentSatisfaction = eventRatings.length > 0
    ? Math.round((eventRatings.reduce((sum, r) => sum + r.rating, 0) / eventRatings.length / 5) * 100)
    : 0;

  return {
    studentSatisfaction,
    eventRating: parseFloat(avgRating),
    placementSupport: placementRate,
  };
};

/** ── Full Dashboard Summary ──────────────────────────────────────────── */
const getDashboardSummary = async () => {
  const [kpi, activityChart, userGrowthChart, recentActivity, upcomingEvents, topCompanies, funnel, mentorship, impact] =
    await Promise.all([
      getKpiStats(),
      getPlatformActivityChart(),
      getUserGrowthChart(),
      getRecentActivity(8),
      getUpcomingEvents(3),
      getTopCompaniesByApplications(5),
      getApplicationFunnel(),
      getMentorshipMetrics(),
      getPlatformImpact(),
    ]);

  return {
    kpi,
    activityChart,
    userGrowthChart,
    recentActivity,
    upcomingEvents,
    topCompanies,
    funnel,
    mentorship,
    impact,
  };
};

module.exports = {
  getDashboardSummary,
  getKpiStats,
  getPlatformActivityChart,
  getUserGrowthChart,
  getRecentActivity,
  getUpcomingEvents,
  getTopCompaniesByApplications,
  getApplicationFunnel,
  getMentorshipMetrics,
  getPlatformImpact,
};
