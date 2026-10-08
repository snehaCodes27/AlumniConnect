const prisma = require('../config/prisma');
const notificationService = require('./notification.service');
const { emitToUser, emitToCommunity } = require('../socket');
const aiKnowledgeService = require('./aiKnowledge.service');
const { validateCreateEvent, validateUpdateEvent } = require('../validators/event.validator');
const { sendSMS } = require('./twilio.service');

/**
 * Create a new Event or Webinar (Alumni / Admin only)
 */
const createEvent = async (creatorId, data) => {
  const validation = validateCreateEvent(data);
  if (!validation.isValid) {
    const error = new Error(`Validation Error: ${validation.errors.join(' ')}`);
    error.statusCode = 400;
    throw error;
  }

  const creator = await prisma.user.findUnique({
    where: { id: creatorId },
    select: { id: true, role: true, firstName: true, lastName: true },
  });

  if (!creator || (creator.role.toUpperCase() !== 'ALUMNI' && creator.role.toUpperCase() !== 'ADMIN')) {
    const error = new Error('Only registered alumni or administrators can create events.');
    error.statusCode = 403;
    throw error;
  }

  const event = await prisma.event.create({
    data: {
      creatorId,
      title: data.title.trim(),
      description: data.description.trim(),
      type: data.type || 'WEBINAR',
      status: data.status || 'PUBLISHED',
      speakerName: data.speakerName.trim(),
      speakerRole: data.speakerRole ? data.speakerRole.trim() : null,
      speakerCompany: data.speakerCompany ? data.speakerCompany.trim() : null,
      speakerBio: data.speakerBio ? data.speakerBio.trim() : null,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      location: data.location ? data.location.trim() : 'Online Webinar',
      meetingUrl: data.meetingUrl ? data.meetingUrl.trim() : null,
      maxCapacity: data.maxCapacity !== undefined && data.maxCapacity !== null && data.maxCapacity !== '' ? parseInt(data.maxCapacity, 10) : null,
      registrationDeadline: data.registrationDeadline ? new Date(data.registrationDeadline) : null,
      tags: (data.tags || []).map((t) => t.trim()).filter(Boolean),
      bannerUrl: data.bannerUrl ? data.bannerUrl.trim() : null,
      isFeatured: Boolean(data.isFeatured),
    },
    include: {
      creator: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          profilePhoto: true,
        },
      },
      _count: {
        select: { registrations: true },
      },
    },
  });

  // Automatically award gamification points for hosting webinar/event
  try {
    const gamificationService = require('./gamification.service');
    await gamificationService.awardPoints({
      userId: creatorId,
      activityType: 'WEBINAR_HOSTED',
      referenceId: event.id,
      referenceType: 'event',
      description: `Hosted session "${event.title}"`,
    });
  } catch (gErr) {
    console.warn('[Gamification] Event points award error:', gErr.message);
  }

  return event;
};

/**
 * Update an existing Event
 */
const updateEvent = async (eventId, requesterId, requesterRole, data) => {
  const existing = await prisma.event.findUnique({ where: { id: eventId } });
  if (!existing) {
    const error = new Error('Event not found.');
    error.statusCode = 404;
    throw error;
  }

  if (existing.creatorId !== requesterId && requesterRole.toUpperCase() !== 'ADMIN') {
    const error = new Error('Forbidden: You can only edit events created by yourself.');
    error.statusCode = 403;
    throw error;
  }

  const validation = validateUpdateEvent(data);
  if (!validation.isValid) {
    const error = new Error(`Validation Error: ${validation.errors.join(' ')}`);
    error.statusCode = 400;
    throw error;
  }

  const updated = await prisma.event.update({
    where: { id: eventId },
    data: {
      title: data.title !== undefined ? data.title.trim() : existing.title,
      description: data.description !== undefined ? data.description.trim() : existing.description,
      type: data.type !== undefined ? data.type : existing.type,
      status: data.status !== undefined ? data.status : existing.status,
      speakerName: data.speakerName !== undefined ? data.speakerName.trim() : existing.speakerName,
      speakerRole: data.speakerRole !== undefined ? data.speakerRole.trim() : existing.speakerRole,
      speakerCompany: data.speakerCompany !== undefined ? data.speakerCompany.trim() : existing.speakerCompany,
      speakerBio: data.speakerBio !== undefined ? data.speakerBio.trim() : existing.speakerBio,
      startDate: data.startDate !== undefined ? new Date(data.startDate) : existing.startDate,
      endDate: data.endDate !== undefined ? new Date(data.endDate) : existing.endDate,
      location: data.location !== undefined ? data.location.trim() : existing.location,
      meetingUrl: data.meetingUrl !== undefined ? data.meetingUrl.trim() : existing.meetingUrl,
      maxCapacity: data.maxCapacity !== undefined ? (data.maxCapacity !== '' ? parseInt(data.maxCapacity, 10) : null) : existing.maxCapacity,
      registrationDeadline: data.registrationDeadline !== undefined ? (data.registrationDeadline ? new Date(data.registrationDeadline) : null) : existing.registrationDeadline,
      tags: data.tags !== undefined ? data.tags.map((t) => t.trim()).filter(Boolean) : existing.tags,
      bannerUrl: data.bannerUrl !== undefined ? data.bannerUrl.trim() : existing.bannerUrl,
      isFeatured: data.isFeatured !== undefined ? Boolean(data.isFeatured) : existing.isFeatured,
    },
    include: {
      creator: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          profilePhoto: true,
        },
      },
      _count: { select: { registrations: true } },
    },
  });

  return updated;
};

/**
 * Cancel an Event and notify registered attendees
 */
const cancelEvent = async (eventId, requesterId, requesterRole) => {
  const existing = await prisma.event.findUnique({
    where: { id: eventId },
    include: { registrations: { select: { userId: true } } },
  });

  if (!existing) {
    const error = new Error('Event not found.');
    error.statusCode = 404;
    throw error;
  }

  if (existing.creatorId !== requesterId && requesterRole.toUpperCase() !== 'ADMIN') {
    const error = new Error('Forbidden: You can only cancel events created by yourself.');
    error.statusCode = 403;
    throw error;
  }

  const cancelled = await prisma.event.update({
    where: { id: eventId },
    data: { status: 'CANCELLED' },
  });

  // Send notifications to registered users
  for (const reg of existing.registrations) {
    await notificationService.createNotification({
      userId: reg.userId,
      actorId: requesterId,
      type: 'EVENT_UPDATED',
      title: 'Event Cancelled',
      message: `The event "${existing.title}" has been cancelled by the host.`,
      data: { eventId: existing.id },
    });
    emitToUser(reg.userId, 'event:cancelled', { eventId: existing.id, title: existing.title });
  }

  return cancelled;
};

/**
 * Delete an Event
 */
const deleteEvent = async (eventId, requesterId, requesterRole) => {
  const existing = await prisma.event.findUnique({ where: { id: eventId } });
  if (!existing) {
    const error = new Error('Event not found.');
    error.statusCode = 404;
    throw error;
  }

  if (existing.creatorId !== requesterId && requesterRole.toUpperCase() !== 'ADMIN') {
    const error = new Error('Forbidden: You can only delete events created by yourself.');
    error.statusCode = 403;
    throw error;
  }

  await prisma.event.delete({ where: { id: eventId } });
  return { message: 'Event deleted successfully.' };
};

/**
 * Browse Events with Filtering and Pagination
 */
const getEvents = async (filters = {}, currentUserId = null) => {
  const { search, type, status, filterScope, page = 1, limit = 12 } = filters;

  const where = {};

  if (status) {
    where.status = status;
  } else {
    // Default: show PUBLISHED events for public/students, or all if filterScope === 'my'
    if (filterScope !== 'my') {
      where.status = 'PUBLISHED';
    }
  }

  if (type) {
    where.type = type;
  }

  if (filterScope === 'my' && currentUserId) {
    where.creatorId = currentUserId;
  }

  if (search) {
    const q = search.trim();
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { speakerName: { contains: q, mode: 'insensitive' } },
      { speakerCompany: { contains: q, mode: 'insensitive' } },
    ];
  }

  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 12;
  const skip = (pageNum - 1) * limitNum;

  // Query user registrations map if currentUserId is provided
  let registeredEventIds = new Set();
  if (currentUserId) {
    const myRegistrations = await prisma.eventRegistration.findMany({
      where: { userId: currentUserId, status: 'REGISTERED' },
      select: { eventId: true },
    });
    registeredEventIds = new Set(myRegistrations.map((r) => r.eventId));
  }

  const [total, events] = await Promise.all([
    prisma.event.count({ where }),
    prisma.event.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { startDate: 'asc' },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profilePhoto: true,
          },
        },
        _count: {
          select: { registrations: true },
        },
      },
    }),
  ]);

  const formattedEvents = events.map((event) => {
    const totalRegistrations = event._count?.registrations || 0;
    const isSpotsFull = event.maxCapacity ? totalRegistrations >= event.maxCapacity : false;
    const isDeadlinePassed = event.registrationDeadline ? new Date(event.registrationDeadline) < new Date() : false;

    return {
      ...event,
      registeredCount: totalRegistrations,
      isRegistered: registeredEventIds.has(event.id),
      isSpotsFull,
      isDeadlinePassed,
    };
  });

  return {
    events: formattedEvents,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
};

/**
 * Get Event Details by ID
 */
const getEventDetails = async (eventId, currentUserId = null) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      creator: {
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
        select: { registrations: true },
      },
    },
  });

  if (!event) {
    const error = new Error('Event not found.');
    error.statusCode = 404;
    throw error;
  }

  let registration = null;
  if (currentUserId) {
    registration = await prisma.eventRegistration.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId: currentUserId,
        },
      },
    });
  }

  const registeredCount = event._count?.registrations || 0;

  return {
    ...event,
    registeredCount,
    isRegistered: Boolean(registration && registration.status === 'REGISTERED'),
    userRegistration: registration,
    isSpotsFull: event.maxCapacity ? registeredCount >= event.maxCapacity : false,
    isDeadlinePassed: event.registrationDeadline ? new Date(event.registrationDeadline) < new Date() : false,
  };
};

/**
 * Register a User for an Event
 */
const registerForEvent = async (eventId, userId) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      _count: { select: { registrations: true } },
    },
  });

  if (!event) {
    const error = new Error('Event not found.');
    error.statusCode = 404;
    throw error;
  }

  if (event.status !== 'PUBLISHED') {
    const error = new Error('Registration is disabled for unpublished or cancelled events.');
    error.statusCode = 400;
    throw error;
  }

  if (event.registrationDeadline && new Date(event.registrationDeadline) < new Date()) {
    const error = new Error('Registration deadline for this event has passed.');
    error.statusCode = 400;
    throw error;
  }

  const registeredCount = event._count?.registrations || 0;
  if (event.maxCapacity && registeredCount >= event.maxCapacity) {
    const error = new Error('Event has reached maximum participant capacity.');
    error.statusCode = 400;
    throw error;
  }

  // Check duplicate registration
  const existing = await prisma.eventRegistration.findUnique({
    where: {
      eventId_userId: { eventId, userId },
    },
  });

  if (existing && existing.status === 'REGISTERED') {
    const error = new Error('You are already registered for this event.');
    error.statusCode = 409;
    throw error;
  }

  let registration;
  if (existing) {
    registration = await prisma.eventRegistration.update({
      where: { id: existing.id },
      data: { status: 'REGISTERED' },
    });
  } else {
    registration = await prisma.eventRegistration.create({
      data: {
        eventId,
        userId,
        status: 'REGISTERED',
      },
    });
  }

  // Send real-time & persistent notification to the event creator
  await notificationService.createNotification({
    userId: event.creatorId,
    actorId: userId,
    type: 'EVENT_REGISTERED',
    title: 'New Event Registration',
    message: `A participant registered for your webinar/event "${event.title}".`,
    data: { eventId: event.id, registrationId: registration.id },
  });

  emitToUser(event.creatorId, 'event:registration:new', {
    eventId: event.id,
    eventTitle: event.title,
    userId,
  });

  return registration;
};

/**
 * Cancel a User Registration
 */
const cancelRegistration = async (eventId, userId) => {
  const existing = await prisma.eventRegistration.findUnique({
    where: {
      eventId_userId: { eventId, userId },
    },
  });

  if (!existing || existing.status !== 'REGISTERED') {
    const error = new Error('No active registration found for this event.');
    error.statusCode = 404;
    throw error;
  }

  const updated = await prisma.eventRegistration.update({
    where: { id: existing.id },
    data: { status: 'CANCELLED' },
  });

  return updated;
};

/**
 * Get User's Registered Events
 */
const getUserRegistrations = async (userId) => {
  const registrations = await prisma.eventRegistration.findMany({
    where: { userId, status: 'REGISTERED' },
    orderBy: { createdAt: 'desc' },
    include: {
      event: {
        include: {
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              profilePhoto: true,
            },
          },
          _count: { select: { registrations: true } },
        },
      },
    },
  });

  return registrations;
};

/**
 * Get Event Registrants (Alumni / Admin)
 */
const getEventRegistrants = async (eventId, requesterId, requesterRole) => {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    const error = new Error('Event not found.');
    error.statusCode = 404;
    throw error;
  }

  if (event.creatorId !== requesterId && requesterRole.toUpperCase() !== 'ADMIN') {
    const error = new Error('Forbidden: You can only view registrants for events you created.');
    error.statusCode = 403;
    throw error;
  }

  const registrants = await prisma.eventRegistration.findMany({
    where: { eventId, status: 'REGISTERED' },
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          profilePhoto: true,
          studentProfile: true,
          alumniProfile: true,
        },
      },
    },
  });

  return registrants;
};

/**
 * Get all invitable students for an event (both registered and all platform students)
 */
const getInvitableStudents = async (eventId) => {
  const registrants = await prisma.eventRegistration.findMany({
    where: { eventId, status: 'REGISTERED' },
    select: { userId: true },
  });
  const registeredIds = new Set(registrants.map((r) => r.userId));

  const students = await prisma.user.findMany({
    where: { role: 'STUDENT' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      profilePhoto: true,
      studentProfile: {
        select: {
          branch: true,
          currentYear: true,
          degree: true,
          batch: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return students.map((s) => ({
    ...s,
    isRegistered: registeredIds.has(s.id),
  }));
};

/**
 * Send a broadcast notification / announcement to all registered participants
 * (Alumni / Admin, creator of the event only)
 */
const sendEventNotification = async (eventId, requesterId, requesterRole, data = {}) => {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    const error = new Error('Event not found.');
    error.statusCode = 404;
    throw error;
  }

  if (event.creatorId !== requesterId && requesterRole.toUpperCase() !== 'ADMIN') {
    const error = new Error('Forbidden: You can only send notifications for events you created.');
    error.statusCode = 403;
    throw error;
  }

  const message = typeof data.message === 'string' ? data.message.trim() : '';
  if (!message) {
    const error = new Error('Notification message is required.');
    error.statusCode = 400;
    throw error;
  }
  if (message.length > 500) {
    const error = new Error('Notification message must be 500 characters or fewer.');
    error.statusCode = 400;
    throw error;
  }

  const title =
    typeof data.title === 'string' && data.title.trim()
      ? data.title.trim().substring(0, 100)
      : `Update: ${event.title}`;

  const registrations = await prisma.eventRegistration.findMany({
    where: { eventId, status: 'REGISTERED' },
    select: { userId: true },
  });

  const recipientIds = [...new Set(registrations.map((r) => r.userId))].filter(
    (id) => id !== requesterId
  );

  let delivered = 0;
  for (const recipientId of recipientIds) {
    await notificationService.createNotification({
      userId: recipientId,
      actorId: requesterId,
      type: 'EVENT_ANNOUNCEMENT',
      title,
      message,
      data: { eventId: event.id, eventTitle: event.title },
    });
    delivered += 1;
  }

  return { delivered, recipients: recipientIds.length };
};

/**
 * Timezone-aware date/time formatting for SMS and notifications
 * Defaults to Asia/Kolkata (IST)
 */
const formatEventTime = (date, timeZone = 'Asia/Kolkata') => {
  try {
    const d = new Date(date);
    return new Intl.DateTimeFormat('en-IN', {
      timeZone,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  } catch (err) {
    return new Date(date).toLocaleString();
  }
};

/**
 * Send reminders for a specific event to registered participants
 * Deduplicates to ensure only one reminder is sent per student/event
 */
const sendEventRemindersForEvent = async (eventId, { timeZone = 'Asia/Kolkata' } = {}) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      title: true,
      startDate: true,
      location: true,
      creatorId: true,
      status: true,
    },
  });

  if (!event) {
    const error = new Error('Event not found.');
    error.statusCode = 404;
    throw error;
  }

  // Fetch all active registrations with user profile & phone
  const registrations = await prisma.eventRegistration.findMany({
    where: {
      eventId,
      status: 'REGISTERED',
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
        },
      },
    },
  });

  if (!registrations.length) {
    return {
      eventId: event.id,
      totalRegistrants: 0,
      remindersSent: 0,
      smsDispatched: 0,
      skippedAlreadyNotified: 0,
      smsErrors: 0,
    };
  }

  // Deduplication check: query existing EVENT_REMINDER notifications for these users
  const userIds = registrations.map((r) => r.user.id);
  const existingNotifications = await prisma.notification.findMany({
    where: {
      userId: { in: userIds },
      type: 'EVENT_REMINDER',
    },
    select: {
      userId: true,
      data: true,
    },
  });

  const alreadyNotifiedUserIds = new Set(
    existingNotifications
      .filter((n) => n.data && typeof n.data === 'object' && n.data.eventId === event.id)
      .map((n) => n.userId)
  );

  const formattedTime = formatEventTime(event.startDate, timeZone);
  const smsBody = `AlumniConnect: Reminder! Your registered event "${event.title}" starts on ${formattedTime}. Location: ${event.location || 'Online Webinar'}.`;

  let remindersSent = 0;
  let smsDispatched = 0;
  let skippedAlreadyNotified = 0;
  let smsErrors = 0;

  for (const reg of registrations) {
    const student = reg.user;
    if (!student) continue;

    // Skip if already notified for this event (prevent duplicate sends)
    if (alreadyNotifiedUserIds.has(student.id)) {
      skippedAlreadyNotified++;
      continue;
    }

    // Create persistent in-app notification & Socket.IO event
    await notificationService.createNotification({
      userId: student.id,
      actorId: event.creatorId,
      type: 'EVENT_REMINDER',
      title: `Event Reminder: ${event.title} ⏰`,
      message: `Your registered event "${event.title}" is scheduled to start on ${formattedTime}.`,
      data: {
        eventId: event.id,
        eventTitle: event.title,
        startDate: event.startDate,
        smsDispatched: Boolean(student.phone),
      },
    });
    remindersSent++;

    // Send SMS if phone number is present
    if (student.phone) {
      try {
        await sendSMS({
          to: student.phone,
          body: smsBody,
        });
        smsDispatched++;
      } catch (smsErr) {
        smsErrors++;
        console.warn(`[Event Reminder SMS Warning] Failed to send SMS to ${student.id} (${student.phone}):`, smsErr.message);
      }
    }
  }

  return {
    eventId: event.id,
    totalRegistrants: registrations.length,
    remindersSent,
    smsDispatched,
    skippedAlreadyNotified,
    smsErrors,
  };
};

/**
 * Scan all upcoming PUBLISHED events within hoursAhead and send reminders to registered participants
 */
const sendUpcomingEventReminders = async ({ hoursAhead = 24, timeZone = 'Asia/Kolkata' } = {}) => {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

  const upcomingEvents = await prisma.event.findMany({
    where: {
      status: 'PUBLISHED',
      startDate: {
        gte: now,
        lte: windowEnd,
      },
    },
    select: {
      id: true,
      title: true,
      startDate: true,
      location: true,
    },
  });

  const results = [];
  for (const event of upcomingEvents) {
    const summary = await sendEventRemindersForEvent(event.id, { timeZone });
    results.push({
      eventId: event.id,
      eventTitle: event.title,
      startDate: event.startDate,
      ...summary,
    });
  }

  return {
    eventsScanned: upcomingEvents.length,
    events: results,
  };
};

let reminderIntervalTimer = null;

/**
 * Automated periodic scheduler for event reminders
 */
const initEventReminderScheduler = ({ intervalMinutes = 30, hoursAhead = 24 } = {}) => {
  if (reminderIntervalTimer) {
    return;
  }

  setTimeout(() => {
    sendUpcomingEventReminders({ hoursAhead }).catch((err) => {
      console.warn('[Event Reminder Scheduler Startup Warning]:', err.message);
    });
  }, 10000);

  reminderIntervalTimer = setInterval(() => {
    sendUpcomingEventReminders({ hoursAhead }).catch((err) => {
      console.warn('[Event Reminder Scheduler Recurring Warning]:', err.message);
    });
  }, intervalMinutes * 60 * 1000);

  if (reminderIntervalTimer.unref) {
    reminderIntervalTimer.unref();
  }

  console.log(`[Event Reminder Scheduler] Automated reminder worker initialized (Scanning every ${intervalMinutes}m for events within ${hoursAhead}h).`);
};

/**
 * Get Event Community Details, Posts, Attendees and Recording
 */
const getEventCommunity = async (eventId, userId, userRole) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      creator: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          profilePhoto: true,
          role: true,
        },
      },
      recording: true,
      _count: {
        select: { registrations: true },
      },
    },
  });

  if (!event) {
    const error = new Error('Event not found.');
    error.statusCode = 404;
    throw error;
  }

  const isHost = event.creatorId === userId || userRole === 'ADMIN';

  // Check if current user is registered
  let isRegistered = false;
  if (userId) {
    const reg = await prisma.eventRegistration.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId,
        },
      },
    });
    isRegistered = Boolean(reg && reg.status === 'REGISTERED');
  }

  // Automatic Community Creation & Seamless Registration
  // When a student clicks to enter the community, automatically register and grant immediate access
  if (userId && !isHost && !isRegistered) {
    try {
      await registerForEvent(eventId, userId);
      isRegistered = true;
    } catch (err) {
      console.warn('Auto-registration on community enter:', err.message);
      // Even if already registered or at capacity, grant viewing access
      isRegistered = true;
    }
  }

  // Auto-initialize first welcome community announcement if empty
  const postCount = await prisma.eventCommunityPost.count({ where: { eventId } });
  if (postCount === 0) {
    await prisma.eventCommunityPost.create({
      data: {
        eventId,
        authorId: event.creatorId,
        type: 'ANNOUNCEMENT',
        title: `Welcome to the ${event.title} Community!`,
        content: `Welcome to the official event community for "${event.title}" hosted by ${event.speakerName}. Check the external webinar link above, discuss in real-time, view resources, and access post-session recordings & AI notes here.`,
        linkUrl: event.meetingUrl || null,
        isPinned: true,
      },
    }).catch(() => {});
  }

  // Fetch community posts
  const posts = await prisma.eventCommunityPost.findMany({
    where: { eventId },
    orderBy: [
      { isPinned: 'desc' },
      { createdAt: 'desc' },
    ],
    include: {
      author: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profilePhoto: true,
          role: true,
        },
      },
    },
    take: 100,
  });

  // Fetch community registered attendees
  const registrations = await prisma.eventRegistration.findMany({
    where: { eventId, status: 'REGISTERED' },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profilePhoto: true,
          role: true,
        },
      },
    },
  });

  const attendees = registrations.map((r) => r.user).filter(Boolean);

  return {
    hasAccess: true,
    event,
    isHost,
    isRegistered,
    posts,
    attendees,
    recording: event.recording || null,
  };
};

/**
 * Create a new Post inside the Event Community
 * Types: ANNOUNCEMENT, REMINDER, RESOURCE, DISCUSSION, MEETING_LINK
 */
const createCommunityPost = async (eventId, userId, userRole, data) => {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    const error = new Error('Event not found.');
    error.statusCode = 404;
    throw error;
  }

  const isHost = event.creatorId === userId || userRole === 'ADMIN';

  // Check registration if not host
  if (!isHost) {
    const reg = await prisma.eventRegistration.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });
    if (!reg || reg.status !== 'REGISTERED') {
      const error = new Error('You must be registered for this event to post in the community.');
      error.statusCode = 403;
      throw error;
    }
  }

  const content = typeof data.content === 'string' ? data.content.trim() : '';
  if (!content) {
    const error = new Error('Post content is required.');
    error.statusCode = 400;
    throw error;
  }

  const type = data.type || 'DISCUSSION';

  // Only host or admin can create ANNOUNCEMENT, REMINDER, or MEETING_LINK
  if (['ANNOUNCEMENT', 'REMINDER', 'MEETING_LINK'].includes(type) && !isHost) {
    const error = new Error('Only the alumni host or administrator can post announcements, reminders, or official meeting links.');
    error.statusCode = 403;
    throw error;
  }

  let isPinned = Boolean(data.isPinned);

  // If posting a meeting link, update the event meetingUrl and pin the post
  if (type === 'MEETING_LINK' && data.linkUrl) {
    await prisma.event.update({
      where: { id: eventId },
      data: { meetingUrl: data.linkUrl.trim() },
    });
    isPinned = true;
    emitToCommunity(eventId, 'community:meeting-link-updated', {
      meetingUrl: data.linkUrl.trim(),
    });
  }

  const post = await prisma.eventCommunityPost.create({
    data: {
      eventId,
      authorId: userId,
      type,
      title: data.title ? data.title.trim() : null,
      content,
      linkUrl: data.linkUrl ? data.linkUrl.trim() : null,
      tags: Array.isArray(data.tags) ? data.tags.map((t) => t.trim()).filter(Boolean) : [],
      isPinned,
    },
    include: {
      author: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profilePhoto: true,
          role: true,
        },
      },
    },
  });

  // Broadcast to all active users in the event community room
  emitToCommunity(eventId, 'community:post-created', post);

  // If announcement or reminder, notify all registered students
  if (type === 'ANNOUNCEMENT' || type === 'REMINDER') {
    const notifTitle = data.title ? data.title.trim() : `${type === 'REMINDER' ? 'Reminder' : 'Announcement'}: ${event.title}`;
    sendEventNotification(eventId, userId, userRole, {
      title: notifTitle,
      message: content,
    }).catch((err) => console.warn('Failed to dispatch background notifications:', err.message));
  }

  return post;
};

/**
 * Update External Webinar Meeting Link (Google Meet / Zoom / MS Teams)
 */
const updateMeetingLink = async (eventId, userId, userRole, meetingUrl) => {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    const error = new Error('Event not found.');
    error.statusCode = 404;
    throw error;
  }

  if (event.creatorId !== userId && userRole !== 'ADMIN') {
    const error = new Error('Only the alumni creator can set the webinar meeting link.');
    error.statusCode = 403;
    throw error;
  }

  const trimmedUrl = meetingUrl ? meetingUrl.trim() : '';

  const updatedEvent = await prisma.event.update({
    where: { id: eventId },
    data: { meetingUrl: trimmedUrl || null },
  });

  // Broadcast real-time link change to community room
  emitToCommunity(eventId, 'community:meeting-link-updated', {
    meetingUrl: trimmedUrl,
  });

  // Create pinned announcement in community
  if (trimmedUrl) {
    await prisma.eventCommunityPost.create({
      data: {
        eventId,
        authorId: userId,
        type: 'MEETING_LINK',
        title: 'Official Webinar Link Posted',
        content: `The host has posted the live webinar link: ${trimmedUrl}. Click "Join Webinar" to attend.`,
        linkUrl: trimmedUrl,
        isPinned: true,
      },
    }).catch(() => {});
  }

  return updatedEvent;
};

/**
 * Delete a Community Post
 */
const deleteCommunityPost = async (eventId, postId, userId, userRole) => {
  const post = await prisma.eventCommunityPost.findUnique({
    where: { id: postId },
    include: { event: true },
  });

  if (!post || post.eventId !== eventId) {
    const error = new Error('Community post not found.');
    error.statusCode = 404;
    throw error;
  }

  const isHost = post.event.creatorId === userId || userRole === 'ADMIN';
  if (post.authorId !== userId && !isHost) {
    const error = new Error('You do not have permission to delete this post.');
    error.statusCode = 403;
    throw error;
  }

  await prisma.eventCommunityPost.delete({ where: { id: postId } });

  emitToCommunity(eventId, 'community:post-deleted', { postId });
  return { success: true, message: 'Post deleted successfully.' };
};

/**
 * Save / Upload Webinar Recording & Run AI Knowledge Extraction
 */
const saveEventRecording = async (eventId, userId, userRole, data) => {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    const error = new Error('Event not found.');
    error.statusCode = 404;
    throw error;
  }

  const isHost = event.creatorId === userId || userRole === 'ADMIN';
  if (!isHost) {
    const error = new Error('Only the alumni creator or administrator can upload webinar recordings.');
    error.statusCode = 403;
    throw error;
  }

  const transcript = data.transcript ? data.transcript.trim() : '';
  const recordingUrl = data.recordingUrl ? data.recordingUrl.trim() : null;
  const videoFileName = data.videoFileName ? data.videoFileName.trim() : null;

  // Run AI Knowledge Extraction & RAG Chunking
  const aiResult = await aiKnowledgeService.extractAiKnowledge({
    transcript: transcript || `Recording of session "${event.title}" by ${event.speakerName}. Topics: ${(event.tags || []).join(', ')}.`,
    eventTitle: event.title,
    speakerName: event.speakerName,
    recordingUrl,
  });

  const recording = await prisma.eventRecording.upsert({
    where: { eventId },
    create: {
      eventId,
      uploaderId: userId,
      recordingUrl,
      recordingType: data.recordingType || (videoFileName ? 'FILE' : 'LINK'),
      videoFileName,
      transcript: transcript || null,
      summary: aiResult.summary,
      keyTakeaways: aiResult.keyTakeaways,
      qaPairs: aiResult.qaPairs,
      actionItems: aiResult.actionItems,
      ragChunks: aiResult.ragChunks,
      status: 'COMPLETED',
      durationMinutes: data.durationMinutes ? parseInt(data.durationMinutes, 10) : null,
    },
    update: {
      recordingUrl: recordingUrl !== undefined ? recordingUrl : undefined,
      videoFileName: videoFileName !== undefined ? videoFileName : undefined,
      transcript: transcript !== undefined ? transcript : undefined,
      summary: aiResult.summary,
      keyTakeaways: aiResult.keyTakeaways,
      qaPairs: aiResult.qaPairs,
      actionItems: aiResult.actionItems,
      ragChunks: aiResult.ragChunks,
      status: 'COMPLETED',
      durationMinutes: data.durationMinutes ? parseInt(data.durationMinutes, 10) : undefined,
    },
    include: {
      uploader: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  // Post announcement to community that recording and AI notes are ready
  await prisma.eventCommunityPost.create({
    data: {
      eventId,
      authorId: userId,
      type: 'ANNOUNCEMENT',
      title: 'Webinar Recording & AI Knowledge Hub Published',
      content: `The recording, full transcript, and AI-extracted knowledge notes for "${event.title}" have been uploaded! You can now watch the replay, study key takeaways, and ask AI questions in the Recording tab.`,
      linkUrl: recordingUrl,
      isPinned: false,
    },
  }).catch(() => {});

  emitToCommunity(eventId, 'community:recording-updated', recording);

  return recording;
};

/**
 * Get Event Recording & AI Extraction
 */
const getEventRecording = async (eventId, userId, userRole) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { recording: true },
  });

  if (!event) {
    const error = new Error('Event not found.');
    error.statusCode = 404;
    throw error;
  }

  const isHost = event.creatorId === userId || userRole === 'ADMIN';
  if (!isHost) {
    const reg = await prisma.eventRegistration.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });
    if (!reg || reg.status !== 'REGISTERED') {
      const error = new Error('Access denied. Please register for the event to view the recording and AI knowledge base.');
      error.statusCode = 403;
      throw error;
    }
  }

  return event.recording || null;
};

/**
 * Query AI Knowledge Base (RAG) for an Event
 */
const queryEventRecordingRag = async (eventId, userId, userRole, question) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { recording: true },
  });

  if (!event) {
    const error = new Error('Event not found.');
    error.statusCode = 404;
    throw error;
  }

  return await aiKnowledgeService.queryRagKnowledge({
    question,
    eventTitle: event.title,
    speakerName: event.speakerName,
    recording: event.recording,
  });
};

/**
 * Delete Event Recording
 */
const deleteEventRecording = async (eventId, userId, userRole) => {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    const error = new Error('Event not found.');
    error.statusCode = 404;
    throw error;
  }

  if (event.creatorId !== userId && userRole !== 'ADMIN') {
    const error = new Error('Only the event host can delete the recording.');
    error.statusCode = 403;
    throw error;
  }

  await prisma.eventRecording.deleteMany({ where: { eventId } });
  emitToCommunity(eventId, 'community:recording-deleted', { eventId });

  return { success: true, message: 'Recording deleted successfully.' };
};

module.exports = {
  createEvent,
  updateEvent,
  cancelEvent,
  deleteEvent,
  getEvents,
  getEventDetails,
  registerForEvent,
  cancelRegistration,
  getUserRegistrations,
  getEventRegistrants,
  getInvitableStudents,
  sendEventNotification,
  // Event Community & Recording additions:
  getEventCommunity,
  createCommunityPost,
  updateMeetingLink,
  deleteCommunityPost,
  saveEventRecording,
  getEventRecording,
  queryEventRecordingRag,
  deleteEventRecording,
  // Event Reminder workflow:
  formatEventTime,
  sendEventRemindersForEvent,
  sendUpcomingEventReminders,
  initEventReminderScheduler,
};

