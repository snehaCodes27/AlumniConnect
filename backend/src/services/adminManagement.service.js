const prisma = require('../config/prisma');
const {
  fail
} = require('./companyConnectUtils');
const {
  moderatePost
} = require('./community.service');
const RESOURCES = {
  users: 'user',
  alumni: 'user',
  students: 'user',
  mentorship: 'mentorshipRequest',
  jobs: 'job',
  events: 'event',
  community: 'communityPost'
};
const userSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true,
  isVerified: true,
  createdAt: true,
  lastLoginAt: true,
  alumniProfile: {
    select: {
      branch: true,
      graduationYear: true,
      currentCompany: true,
      jobRole: true,
      domain: true
    }
  },
  studentProfile: {
    select: {
      branch: true,
      currentYear: true,
      graduationYear: true,
      cgpa: true
    }
  }
};
async function listResource(resource, {
  q = '',
  page = 1,
  limit = 8,
  status = ''
} = {}) {
  if (!Object.hasOwn(RESOURCES, resource)) fail('Unknown admin resource.', 404);
  const model = RESOURCES[resource],
    where = {};
  if (resource === 'alumni') where.role = 'ALUMNI';
  if (resource === 'students') where.role = 'STUDENT';
  if (q) {
    const term = {
      contains: q,
      mode: 'insensitive'
    };
    if (model === 'user') where.OR = [{
      firstName: term
    }, {
      lastName: term
    }, {
      email: term
    }];else if (resource === 'mentorship') where.OR = [{
      topic: term
    }, {
      student: {
        firstName: term
      }
    }, {
      alumni: {
        firstName: term
      }
    }];else if (resource === 'jobs') where.OR = [{
      title: term
    }, {
      company: term
    }];else if (resource === 'events') where.title = term;else where.OR = [{
      title: term
    }, {
      community: {
        name: term
      }
    }];
  }
  if (status) {
    const allowed = {
      mentorship: ['PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED', 'CANCELLED'],
      jobs: ['ACTIVE', 'CLOSED', 'DRAFT'],
      events: ['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED'],
      community: ['ACTIVE', 'HIDDEN', 'FLAGGED', 'DELETED']
    }[resource];
    if (!allowed?.includes(status)) fail('Invalid resource status.');
    where.status = status;
  }
  const include = resource === 'mentorship' ? {
    student: {
      select: userSelect
    },
    alumni: {
      select: userSelect
    }
  } : resource === 'jobs' ? {
    alumni: {
      select: {
        firstName: true,
        lastName: true
      }
    },
    _count: {
      select: {
        applications: true
      }
    }
  } : resource === 'events' ? {
    creator: {
      select: {
        firstName: true,
        lastName: true
      }
    },
    _count: {
      select: {
        registrations: true
      }
    }
  } : resource === 'community' ? {
    community: {
      select: {
        name: true,
        slug: true
      }
    },
    author: {
      select: {
        firstName: true,
        lastName: true
      }
    }
  } : null;
  const [records, total] = await Promise.all([prisma[model].findMany({
    where,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: {
      createdAt: 'desc'
    },
    ...(model === 'user' ? {
      select: userSelect
    } : {
      include
    })
  }), prisma[model].count({
    where
  })]);
  return {
    records,
    pagination: {
      page,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      limit
    }
  };
}
async function updateResourceStatus(resource, id, status, actorId) {
  if (resource === 'community') {
    if (!['ACTIVE', 'HIDDEN', 'FLAGGED'].includes(status)) fail('Invalid moderation status.');
    return moderatePost({
      postId: id,
      moderatorId: actorId,
      status
    });
  }
  const allowed = {
    jobs: ['ACTIVE', 'CLOSED'],
    events: ['CANCELLED']
  }[resource];
  if (!allowed?.includes(status)) fail('This admin action is not supported.');
  const model = RESOURCES[resource],
    record = await prisma[model].findUnique({
      where: {
        id
      }
    });
  if (!record) fail('Record not found.', 404);
  if (resource === 'events' && record.status === 'COMPLETED') fail('Completed events cannot be cancelled.', 409);
  if (resource === 'jobs' && record.status === 'DRAFT' && status === 'ACTIVE') fail('The author must publish the draft.');
  if (resource === 'events') {
    if (record.status === 'CANCELLED') return record;
    return require('./event.service').cancelEvent(id, actorId, 'ADMIN');
  }
  return prisma[model].update({
    where: {
      id
    },
    data: {
      status
    }
  });
}
async function companies({
  q = '',
  page = 1,
  limit = 8
} = {}) {
  const alumni = await prisma.alumniProfile.groupBy({
    by: ['currentCompany'],
    where: {
      currentCompany: {
        not: null
      }
    },
    _count: {
      _all: true
    }
  });
  const jobs = await prisma.job.groupBy({
    by: ['company'],
    _count: {
      _all: true
    }
  });
  const map = new Map();
  for (const a of alumni) {
    const name = a.currentCompany.trim();
    if (name) {
      const key = name.toLowerCase(),
        item = map.get(key) || {
          id: key,
          name,
          alumni: 0,
          jobs: 0
        };
      item.alumni += a._count._all;
      map.set(key, item);
    }
  }
  for (const j of jobs) {
    const key = j.company.trim().toLowerCase();
    const item = map.get(key) || {
      id: key,
      name: j.company,
      alumni: 0,
      jobs: 0
    };
    item.jobs += j._count._all;
    map.set(key, item);
  }
  const records = [...map.values()].filter(r => r.name.toLowerCase().includes(q.toLowerCase())).sort((a, b) => b.alumni - a.alumni || a.name.localeCompare(b.name));
  return {
    records: records.slice((page - 1) * limit, page * limit),
    pagination: {
      page,
      limit,
      total: records.length,
      totalPages: Math.max(1, Math.ceil(records.length / limit))
    }
  };
}
async function settings() {
  return {
    registration: 'Students and Alumni sign in directly; Admin approval is not required.',
    emailConfigured: Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS || process.env.SMTP_HOST),
    smsConfigured: Boolean(process.env.TEXTBEE_API_KEY && process.env.TEXTBEE_DEVICE_ID || process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER),
    companyConnectPersistence: 'PostgreSQL',
    donationMode: process.env.DONATION_MODEL_PATH ? 'Trained model configured' : 'Engagement baseline',
    platformUrl: process.env.CLIENT_URL || 'http://localhost:5173'
  };
}
module.exports = {
  listResource,
  updateResourceStatus,
  companies,
  settings
};
