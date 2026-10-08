const prisma = require('../config/prisma');
const { getIO, emitToUser } = require('../socket');
const notificationService = require('./notification.service');

// Point values assigned to verified meaningful activities
const POINT_CONFIG = {
  MENTORSHIP_ACCEPTED: { points: 25, category: 'mentorshipPoints', title: 'Accepted Mentorship Request' },
  MENTORSHIP_COMPLETED: { points: 100, category: 'mentorshipPoints', title: 'Completed Mentorship Session' },
  CONNECTION_ACCEPTED: { points: 15, category: 'helpingPoints', title: 'Accepted Student Connection' },
  JOB_POSTED: { points: 50, category: 'jobPoints', title: 'Posted Career Opportunity / Internship' },
  WEBINAR_HOSTED: { points: 75, category: 'webinarPoints', title: 'Hosted Webinar / Technical Workshop' },
  COMMUNITY_POST_CREATED: { points: 20, category: 'communityPoints', title: 'Shared Community Discussion' },
  COMMUNITY_RESOURCE_SHARED: { points: 35, category: 'communityPoints', title: 'Shared Learning Resource' },
  COMMUNITY_COMMENT_CREATED: { points: 10, category: 'communityPoints', title: 'Provided Community Guidance / Reply' },
};

// Base badge definitions
const SYSTEM_BADGES = [
  {
    code: 'MENTOR_INITIATE',
    name: 'Mentorship Initiate',
    description: 'Accepted first student mentorship request',
    icon: '🌱',
    category: 'MENTORSHIP',
    tier: 'BRONZE',
    pointsRequired: 25,
  },
  {
    code: 'MENTOR_MAESTRO',
    name: 'Mentor Maestro',
    description: 'Completed 3+ mentorship sessions or earned 200+ mentorship points',
    icon: '🏆',
    category: 'MENTORSHIP',
    tier: 'GOLD',
    pointsRequired: 200,
  },
  {
    code: 'OPPORTUNITY_CREATOR',
    name: 'Opportunity Creator',
    description: 'Posted a job, referral, or internship opening for students',
    icon: '💼',
    category: 'CAREER',
    tier: 'SILVER',
    pointsRequired: 50,
  },
  {
    code: 'WEBINAR_MASTER',
    name: 'Webinar Master',
    description: 'Conducted a live webinar, AMA, or technical workshop',
    icon: '🎙️',
    category: 'EVENTS',
    tier: 'GOLD',
    pointsRequired: 75,
  },
  {
    code: 'COMMUNITY_PILLAR',
    name: 'Community Pillar',
    description: 'Active contributor sharing knowledge and discussions in domain communities',
    icon: '🏛️',
    category: 'COMMUNITY',
    tier: 'SILVER',
    pointsRequired: 60,
  },
  {
    code: 'NETWORK_BUILDER',
    name: 'Network Builder',
    description: 'Accepted connections and expanded student professional network',
    icon: '🌐',
    category: 'NETWORK',
    tier: 'BRONZE',
    pointsRequired: 30,
  },
  {
    code: 'GUIDING_LIGHT',
    name: 'Guiding Light',
    description: 'Top-tier contributor with over 500 total impact points',
    icon: '⭐',
    category: 'GLOBAL',
    tier: 'PLATINUM',
    pointsRequired: 500,
  },
];

/**
 * Seed system badges into database if they do not exist
 */
async function seedBadges() {
  for (const b of SYSTEM_BADGES) {
    await prisma.badge.upsert({
      where: { code: b.code },
      update: {
        name: b.name,
        description: b.description,
        icon: b.icon,
        category: b.category,
        tier: b.tier,
        pointsRequired: b.pointsRequired,
      },
      create: b,
    });
  }
}

/**
 * Calculate user level based on total points
 */
function calculateLevel(totalPoints) {
  if (totalPoints <= 0) return 1;
  return Math.floor(Math.sqrt(totalPoints / 50)) + 1;
}

/**
 * Core Award Points Function
 * - Enforces idempotency via @@unique([userId, activityType, referenceId])
 * - Prevents duplicate or fake point awards
 * - Updates GamificationProfile breakdown and level
 * - Automatically checks badge eligibility and awards them
 * - Emits real-time Socket.IO notification to user
 */
async function awardPoints({
  userId,
  activityType,
  referenceId = null,
  referenceType = null,
  customPoints = null,
  customTitle = null,
  description = null,
}) {
  if (!userId || !activityType) {
    return { success: false, message: 'userId and activityType are required' };
  }

  const config = POINT_CONFIG[activityType] || {
    points: 10,
    category: 'communityPoints',
    title: 'Platform Activity',
  };

  const pointsToAward = customPoints !== null ? customPoints : config.points;
  const title = customTitle || config.title;

  // 1. Check for duplicate award if referenceId is provided
  if (referenceId) {
    const existingLog = await prisma.gamificationPointLog.findUnique({
      where: {
        userId_activityType_referenceId: {
          userId,
          activityType,
          referenceId: String(referenceId),
        },
      },
    });

    if (existingLog) {
      return {
        success: true,
        alreadyAwarded: true,
        log: existingLog,
      };
    }
  }

  // 2. Insert point log record
  const log = await prisma.gamificationPointLog.create({
    data: {
      userId,
      points: pointsToAward,
      activityType,
      title,
      description,
      referenceId: referenceId ? String(referenceId) : null,
      referenceType: referenceType ? String(referenceType) : null,
    },
  });

  // 3. Upsert GamificationProfile
  const profile = await prisma.gamificationProfile.upsert({
    where: { userId },
    create: {
      userId,
      totalPoints: pointsToAward,
      level: calculateLevel(pointsToAward),
      [config.category]: pointsToAward,
    },
    update: {
      totalPoints: { increment: pointsToAward },
      [config.category]: { increment: pointsToAward },
    },
  });

  // Re-calculate level after increment
  const updatedLevel = calculateLevel(profile.totalPoints);
  if (updatedLevel !== profile.level) {
    await prisma.gamificationProfile.update({
      where: { userId },
      data: { level: updatedLevel },
    });
  }

  // 4. Check & award eligible badges
  const newlyAwardedBadges = await checkAndAwardBadges(userId);

  // 5. Send real-time notification via Socket.IO
  const io = getIO();
  if (io) {
    emitToUser(userId, 'gamification:points_awarded', {
      pointsAwarded: pointsToAward,
      totalPoints: profile.totalPoints,
      activityType,
      title,
      newBadges: newlyAwardedBadges,
    });
  }

  // 6. Save persistent notification
  try {
    await notificationService.createNotification({
      userId,
      type: 'GAMIFICATION_POINTS_AWARDED',
      title: `+${pointsToAward} Impact Points! ⭐`,
      message: `${title}: Keep up the fantastic contributions in our alumni community.`,
      data: { activityType, pointsAwarded: pointsToAward, referenceId },
    });
  } catch (err) {
    console.warn('[Gamification] Notification create error:', err.message);
  }

  return {
    success: true,
    alreadyAwarded: false,
    log,
    totalPoints: profile.totalPoints,
    newlyAwardedBadges,
  };
}

/**
 * Check criteria and grant badges to user
 */
async function checkAndAwardBadges(userId) {
  const profile = await prisma.gamificationProfile.findUnique({
    where: { userId },
  });
  if (!profile) return [];

  const existingUserBadges = await prisma.userBadge.findMany({
    where: { userId },
    select: { badgeId: true },
  });
  const earnedBadgeIds = new Set(existingUserBadges.map((ub) => ub.badgeId));

  const allBadges = await prisma.badge.findMany();
  const newlyAwarded = [];

  for (const badge of allBadges) {
    if (earnedBadgeIds.has(badge.id)) continue;

    let eligible = false;

    switch (badge.code) {
      case 'MENTOR_INITIATE':
        eligible = profile.mentorshipPoints >= 25;
        break;
      case 'MENTOR_MAESTRO':
        eligible = profile.mentorshipPoints >= 200;
        break;
      case 'OPPORTUNITY_CREATOR':
        eligible = profile.jobPoints >= 50;
        break;
      case 'WEBINAR_MASTER':
        eligible = profile.webinarPoints >= 75;
        break;
      case 'COMMUNITY_PILLAR':
        eligible = profile.communityPoints >= 60;
        break;
      case 'NETWORK_BUILDER':
        eligible = profile.helpingPoints >= 30;
        break;
      case 'GUIDING_LIGHT':
        eligible = profile.totalPoints >= 500;
        break;
      default:
        eligible = profile.totalPoints >= badge.pointsRequired;
        break;
    }

    if (eligible) {
      const userBadge = await prisma.userBadge.create({
        data: {
          userId,
          badgeId: badge.id,
        },
        include: { badge: true },
      });

      newlyAwarded.push(userBadge.badge);

      // Real-time badge notification
      const io = getIO();
      if (io) {
        emitToUser(userId, 'gamification:badge_earned', {
          badge: userBadge.badge,
        });
      }

      try {
        await notificationService.createNotification({
          userId,
          type: 'GAMIFICATION_BADGE_EARNED',
          title: `New Badge Unlocked: ${badge.name} ${badge.icon}`,
          message: badge.description,
          data: { badgeId: badge.id, code: badge.code },
        });
      } catch (err) {
        console.warn('[Gamification] Badge notification error:', err.message);
      }
    }
  }

  return newlyAwarded;
}

/**
 * Fetch Ranked Leaderboard of Alumni
 */
async function getLeaderboard({ limit = 25, page = 1 } = {}) {
  const skip = (page - 1) * limit;

  // We query all profiles with points ordered descending
  const [profiles, total] = await Promise.all([
    prisma.gamificationProfile.findMany({
      orderBy: { totalPoints: 'desc' },
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profilePhoto: true,
            role: true,
            alumniProfile: {
              select: {
                currentCompany: true,
                jobRole: true,
                domain: true,
                graduationYear: true,
                branch: true,
              },
            },
            userBadges: {
              include: { badge: true },
            },
          },
        },
      },
    }),
    prisma.gamificationProfile.count(),
  ]);

  // Assign calculated ranks
  const ranked = profiles.map((p, idx) => ({
    rank: skip + idx + 1,
    id: p.id,
    userId: p.userId,
    user: p.user,
    totalPoints: p.totalPoints,
    level: p.level,
    breakdown: {
      mentorshipPoints: p.mentorshipPoints,
      helpingPoints: p.helpingPoints,
      jobPoints: p.jobPoints,
      webinarPoints: p.webinarPoints,
      communityPoints: p.communityPoints,
    },
    badges: (p.user?.userBadges || []).map((ub) => ub.badge),
    updatedAt: p.updatedAt,
  }));

  return {
    leaderboard: ranked,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Get detailed Gamification Profile for a specific user
 */
async function getUserGamificationProfile(userId) {
  let profile = await prisma.gamificationProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    profile = await prisma.gamificationProfile.create({
      data: {
        userId,
        totalPoints: 0,
        level: 1,
      },
    });
  }

  // Calculate user's current rank
  const higherCount = await prisma.gamificationProfile.count({
    where: { totalPoints: { gt: profile.totalPoints } },
  });
  const currentRank = higherCount + 1;

  // All badges with earned status
  const allBadges = await prisma.badge.findMany({
    orderBy: { pointsRequired: 'asc' },
  });

  const earnedUserBadges = await prisma.userBadge.findMany({
    where: { userId },
    include: { badge: true },
    orderBy: { earnedAt: 'desc' },
  });

  const earnedMap = new Map(earnedUserBadges.map((ub) => [ub.badgeId, ub.earnedAt]));

  const badgesWithStatus = allBadges.map((b) => ({
    ...b,
    isEarned: earnedMap.has(b.id),
    earnedAt: earnedMap.get(b.id) || null,
  }));

  // Recent 20 point audit logs
  const logs = await prisma.gamificationPointLog.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });

  return {
    profile: {
      ...profile,
      currentRank,
    },
    badges: badgesWithStatus,
    earnedBadgesCount: earnedUserBadges.length,
    pointHistory: logs,
  };
}

/**
 * Synchronize and audit points from existing database activities.
 * Ensures zero dummy data: all points originate from real PostgreSQL rows!
 */
async function syncHistoricalContributions() {
  await seedBadges();

  const alumniList = await prisma.user.findMany({
    where: { role: 'ALUMNI' },
    select: { id: true },
  });

  for (const { id: alumniId } of alumniList) {
    // 1. Accepted mentorship requests
    const acceptedMentorships = await prisma.mentorshipRequest.findMany({
      where: { alumniId, status: { in: ['ACCEPTED', 'COMPLETED'] } },
    });
    for (const m of acceptedMentorships) {
      await awardPoints({
        userId: alumniId,
        activityType: 'MENTORSHIP_ACCEPTED',
        referenceId: m.id,
        referenceType: 'mentorship_request',
        description: `Accepted mentorship for topic "${m.topic}"`,
      });

      if (m.status === 'COMPLETED') {
        await awardPoints({
          userId: alumniId,
          activityType: 'MENTORSHIP_COMPLETED',
          referenceId: m.id,
          referenceType: 'mentorship_request',
          description: `Successfully completed mentorship session for topic "${m.topic}"`,
        });
      }
    }

    // 2. Accepted connection requests
    const acceptedConnections = await prisma.connection.findMany({
      where: { receiverId: alumniId, status: 'ACCEPTED' },
    });
    for (const c of acceptedConnections) {
      await awardPoints({
        userId: alumniId,
        activityType: 'CONNECTION_ACCEPTED',
        referenceId: c.id,
        referenceType: 'connection',
        description: 'Accepted student connection request',
      });
    }

    // 3. Posted jobs
    const jobs = await prisma.job.findMany({
      where: { alumniId },
    });
    for (const j of jobs) {
      await awardPoints({
        userId: alumniId,
        activityType: 'JOB_POSTED',
        referenceId: j.id,
        referenceType: 'job',
        description: `Posted opportunity "${j.title}" at ${j.company}`,
      });
    }

    // 4. Events / Webinars
    const events = await prisma.event.findMany({
      where: { creatorId: alumniId },
    });
    for (const ev of events) {
      await awardPoints({
        userId: alumniId,
        activityType: 'WEBINAR_HOSTED',
        referenceId: ev.id,
        referenceType: 'event',
        description: `Hosted session "${ev.title}"`,
      });
    }
  }

  console.log('[Gamification] Historical contributions synchronization complete.');
}

module.exports = {
  POINT_CONFIG,
  SYSTEM_BADGES,
  seedBadges,
  awardPoints,
  checkAndAwardBadges,
  getLeaderboard,
  getUserGamificationProfile,
  syncHistoricalContributions,
};
