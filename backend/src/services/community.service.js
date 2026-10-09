const prisma = require('../config/prisma');
const { getIO } = require('../socket');
const gamificationService = require('./gamification.service');
const notificationService = require('./notification.service');

// Curated default domains to jumpstart communities
const DEFAULT_COMMUNITIES = [
  {
    name: 'Artificial Intelligence & Machine Learning',
    slug: 'ai-machine-learning',
    domain: 'AI/ML',
    careerFocus: 'Data Science, Deep Learning & LLMs',
    description: 'Explore generative AI, PyTorch, computer vision, research papers, and career paths in Machine Learning engineering.',
    tags: ['AI', 'MachineLearning', 'LLMs', 'Python', 'PyTorch'],
    bannerUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1200&q=80',
    avatarUrl: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=200&q=80',
  },
  {
    name: 'Full Stack & Software Engineering',
    slug: 'fullstack-software-engineering',
    domain: 'Software Development',
    careerFocus: 'Web Architecture, Systems & Cloud Apps',
    description: 'Discuss React, Node.js, Next.js, backend architecture, system design, coding best practices, and tech interviews.',
    tags: ['FullStack', 'React', 'NodeJS', 'SystemDesign', 'JavaScript'],
    bannerUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80',
    avatarUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=200&q=80',
  },
  {
    name: 'Cloud Computing & DevOps Architecture',
    slug: 'cloud-devops-architecture',
    domain: 'Cloud Computing',
    careerFocus: 'AWS, Kubernetes, CI/CD & Site Reliability',
    description: 'Dive into AWS, Docker, Kubernetes, Terraform, microservices infrastructure, and enterprise DevOps workflows.',
    tags: ['Cloud', 'AWS', 'Kubernetes', 'Docker', 'DevOps'],
    bannerUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
    avatarUrl: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=200&q=80',
  },
  {
    name: 'Cybersecurity & Ethical Hacking',
    slug: 'cybersecurity-infosec',
    domain: 'Cybersecurity',
    careerFocus: 'Network Security, Pentesting & Cloud Defense',
    description: 'Practical security methodologies, CTF challenges, threat analysis, incident response, and cybersecurity career guidance.',
    tags: ['Security', 'InfoSec', 'PenTesting', 'Cyber', 'EthicalHacking'],
    bannerUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1200&q=80',
    avatarUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=200&q=80',
  },
  {
    name: 'Product Management & Tech Leadership',
    slug: 'product-management-leadership',
    domain: 'Product Management',
    careerFocus: 'Roadmaps, Strategy, Agile & Analytics',
    description: 'Bridge tech and business: product discovery, user journeys, metrics, PRDs, sprint planning, and leadership growth.',
    tags: ['Product', 'PM', 'Leadership', 'Agile', 'Strategy'],
    bannerUrl: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=1200&q=80',
    avatarUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=200&q=80',
  },
  {
    name: 'Career Transition & Interview Preparation',
    slug: 'career-interview-prep',
    domain: 'Career Development',
    careerFocus: 'Resume Reviews, Mock Interviews & Referrals',
    description: 'Alumni-led resume teardowns, behavioral interview coaching, salary negotiation strategies, and insider referral tips.',
    tags: ['Career', 'Interviews', 'Resumes', 'Referrals', 'JobSearch'],
    bannerUrl: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1200&q=80',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
  },
];

/**
 * Seed default communities if table is empty
 */
async function seedDefaultCommunities(systemAdminId) {
  const count = await prisma.community.count();
  if (count > 0) return;

  // Use system admin or first user as creator
  let creatorId = systemAdminId;
  if (!creatorId) {
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });
    creatorId = admin ? admin.id : (await prisma.user.findFirst())?.id;
  }

  if (!creatorId) return;

  for (const c of DEFAULT_COMMUNITIES) {
    const created = await prisma.community.create({
      data: {
        ...c,
        creatorId,
      },
    });

    // Add creator as ADMIN member
    await prisma.communityMember.create({
      data: {
        communityId: created.id,
        userId: creatorId,
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });

    // Create a welcoming seed post
    await prisma.communityPost.create({
      data: {
        communityId: created.id,
        authorId: creatorId,
        type: 'ANNOUNCEMENT',
        title: `Welcome to the ${c.name} Community!`,
        content: `Welcome students and alumni! This community is dedicated to discussing ${c.careerFocus.toLowerCase()}, sharing resources, asking questions, and networking directly with experienced alumni mentors. Introduce yourself below! 🚀`,
        tags: c.tags,
        isPinned: true,
      },
    });
  }

  console.log('[Community] Seeded default communities with starter posts.');
}

/**
 * List all communities with user membership status & metrics
 */
async function getCommunities({ domain = '', search = '', userId = null, page = 1, limit = 20 } = {}) {
  // Ensure default communities exist
  await seedDefaultCommunities();

  const skip = (page - 1) * limit;

  const where = {
    isPrivate: false,
  };

  if (domain && domain !== 'All') {
    where.domain = domain;
  }

  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { careerFocus: { contains: q, mode: 'insensitive' } },
      { tags: { hasSome: [q] } },
    ];
  }

  const [communities, total] = await Promise.all([
    prisma.community.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            members: { where: { status: 'ACTIVE' } },
            posts: { where: { status: 'ACTIVE' } },
          },
        },
        members: userId
          ? {
              where: { userId, status: 'ACTIVE' },
              select: { role: true, status: true },
            }
          : false,
      },
    }),
    prisma.community.count({ where }),
  ]);

  const mapped = communities.map((c) => {
    const membership = c.members && c.members.length > 0 ? c.members[0] : null;
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      domain: c.domain,
      careerFocus: c.careerFocus,
      tags: c.tags,
      avatarUrl: c.avatarUrl,
      bannerUrl: c.bannerUrl,
      isPrivate: c.isPrivate,
      memberCount: c._count.members,
      postCount: c._count.posts,
      createdAt: c.createdAt,
      isMember: Boolean(membership),
      userRole: membership ? membership.role : null,
    };
  });

  return {
    communities: mapped,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Get Community by Slug with detailed membership & role
 */
async function getCommunityBySlug(slug, userId = null) {
  const community = await prisma.community.findUnique({
    where: { slug },
    include: {
      creator: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profilePhoto: true,
          role: true,
        },
      },
      _count: {
        select: {
          members: { where: { status: 'ACTIVE' } },
          posts: { where: { status: 'ACTIVE' } },
        },
      },
      members: userId
        ? {
            where: { userId, status: 'ACTIVE' },
            select: { role: true, status: true, joinedAt: true },
          }
        : false,
    },
  });

  if (!community) {
    const error = new Error('Community not found');
    error.statusCode = 404;
    throw error;
  }

  const membership = community.members && community.members.length > 0 ? community.members[0] : null;

  return {
    ...community,
    memberCount: community._count.members,
    postCount: community._count.posts,
    isMember: Boolean(membership),
    userRole: membership ? membership.role : null,
    membershipDetails: membership,
  };
}

/**
 * Join a Community
 * - Enforces unique membership via @@unique([communityId, userId])
 * - Prevents duplicates
 * - Emits Socket.IO real-time member update
 */
async function joinCommunity(communityId, userId) {
  const community = await prisma.community.findUnique({
    where: { id: communityId },
  });

  if (!community) {
    const error = new Error('Community not found');
    error.statusCode = 404;
    throw error;
  }

  // Upsert member record with race-condition safety
  let membership;
  try {
    membership = await prisma.communityMember.upsert({
      where: {
        communityId_userId: {
          communityId,
          userId,
        },
      },
      update: {
        status: 'ACTIVE',
      },
      create: {
        communityId,
        userId,
        role: 'MEMBER',
        status: 'ACTIVE',
      },
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
  } catch (err) {
    // Handle Prisma unique constraint race condition (P2002 or unique constraint violation)
    if (err.code === 'P2002' || err.message?.includes('Unique constraint') || err.message?.includes('unique constraint')) {
      membership = await prisma.communityMember.findUnique({
        where: {
          communityId_userId: { communityId, userId },
        },
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
      if (membership && membership.status !== 'ACTIVE') {
        membership = await prisma.communityMember.update({
          where: { id: membership.id },
          data: { status: 'ACTIVE' },
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
      }
    } else {
      throw err;
    }
  }

  const memberCount = await prisma.communityMember.count({
    where: { communityId, status: 'ACTIVE' },
  });

  // Real-time broadcast to community room
  const io = getIO();
  if (io) {
    io.to(`community:${communityId}`).emit('community:member_joined', {
      communityId,
      user: membership.user,
      memberCount,
    });
  }

  return {
    success: true,
    membership,
    memberCount,
  };
}

/**
 * Leave a Community
 */
async function leaveCommunity(communityId, userId) {
  const existing = await prisma.communityMember.findUnique({
    where: {
      communityId_userId: {
        communityId,
        userId,
      },
    },
  });

  if (!existing || existing.status !== 'ACTIVE') {
    return { success: true, message: 'Not an active member of this community' };
  }

  await prisma.communityMember.update({
    where: {
      communityId_userId: {
        communityId,
        userId,
      },
    },
    data: {
      status: 'LEFT',
    },
  });

  const memberCount = await prisma.communityMember.count({
    where: { communityId, status: 'ACTIVE' },
  });

  const io = getIO();
  if (io) {
    io.to(`community:${communityId}`).emit('community:member_left', {
      communityId,
      userId,
      memberCount,
    });
  }

  return {
    success: true,
    memberCount,
  };
}

/**
 * List Community Members
 */
async function getCommunityMembers(communityId, { page = 1, limit = 30, role = null } = {}) {
  const skip = (page - 1) * limit;

  const where = {
    communityId,
    status: 'ACTIVE',
  };

  if (role) {
    where.role = role;
  }

  const [members, total] = await Promise.all([
    prisma.communityMember.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            profilePhoto: true,
            alumniProfile: {
              select: {
                currentCompany: true,
                jobRole: true,
                domain: true,
              },
            },
            studentProfile: {
              select: {
                branch: true,
                currentYear: true,
                careerGoal: true,
              },
            },
          },
        },
      },
    }),
    prisma.communityMember.count({ where }),
  ]);

  return {
    members,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Get Community Posts
 */
async function getCommunityPosts(communityId, userId = null, { type = null, search = '', page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;

  const where = {
    communityId,
    status: 'ACTIVE',
  };

  if (type && type !== 'ALL') {
    where.type = type;
  }

  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { content: { contains: q, mode: 'insensitive' } },
      { tags: { hasSome: [q] } },
    ];
  }

  const [posts, total] = await Promise.all([
    prisma.communityPost.findMany({
      where,
      skip,
      take: limit,
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
            alumniProfile: {
              select: {
                currentCompany: true,
                jobRole: true,
                domain: true,
              },
            },
          },
        },
        _count: {
          select: {
            comments: true,
            likes: true,
          },
        },
        likes: userId
          ? {
              where: { userId },
              select: { id: true },
            }
          : false,
      },
    }),
    prisma.communityPost.count({ where }),
  ]);

  const mapped = posts.map((p) => ({
    id: p.id,
    communityId: p.communityId,
    type: p.type,
    title: p.title,
    content: p.content,
    linkUrl: p.linkUrl,
    tags: p.tags,
    isPinned: p.isPinned,
    isLocked: p.isLocked,
    likesCount: p._count.likes,
    commentCount: p._count.comments,
    viewCount: p.viewCount,
    createdAt: p.createdAt,
    author: p.author,
    hasLiked: Boolean(p.likes && p.likes.length > 0),
  }));

  return {
    posts: mapped,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Create a Community Post
 * - Validates active membership
 * - Awards gamification points for Alumni contributors
 * - Broadcasts real-time Socket.IO notification to community members
 */
async function createPost({ communityId, authorId, type = 'DISCUSSION', title, content, linkUrl = null, tags = [] }) {
  if (!title || !title.trim() || !content || !content.trim()) {
    const error = new Error('Post title and content are required');
    error.statusCode = 400;
    throw error;
  }

  // 1. Membership Validation
  const membership = await prisma.communityMember.findUnique({
    where: {
      communityId_userId: {
        communityId,
        userId: authorId,
      },
    },
  });

  if (!membership || membership.status !== 'ACTIVE') {
    const error = new Error('You must join this community before creating a post');
    error.statusCode = 403;
    throw error;
  }

  // 2. Create Post in PostgreSQL
  const post = await prisma.communityPost.create({
    data: {
      communityId,
      authorId,
      type,
      title: title.trim(),
      content: content.trim(),
      linkUrl: linkUrl ? linkUrl.trim() : null,
      tags: Array.isArray(tags) ? tags : [],
      status: 'ACTIVE',
    },
    include: {
      author: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profilePhoto: true,
          role: true,
          alumniProfile: {
            select: {
              currentCompany: true,
              jobRole: true,
              domain: true,
            },
          },
        },
      },
      community: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  // 3. Award Gamification Points if Alumni
  if (post.author.role === 'ALUMNI') {
    const activityType = type === 'RESOURCE' ? 'COMMUNITY_RESOURCE_SHARED' : 'COMMUNITY_POST_CREATED';
    await gamificationService.awardPoints({
      userId: authorId,
      activityType,
      referenceId: post.id,
      referenceType: 'community_post',
      description: `Posted "${post.title}" in ${post.community.name}`,
    });
  }

  // 4. Real-time broadcast via Socket.IO
  const io = getIO();
  if (io) {
    io.to(`community:${communityId}`).emit('community:new_post', {
      communityId,
      post: {
        ...post,
        likesCount: 0,
        commentCount: 0,
        hasLiked: false,
      },
    });
  }

  return post;
}

/**
 * Get Post Details with Threaded Comments
 */
async function getPostDetails(postId, userId = null) {
  const post = await prisma.communityPost.findUnique({
    where: { id: postId },
    include: {
      community: {
        select: {
          id: true,
          name: true,
          slug: true,
          domain: true,
        },
      },
      author: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profilePhoto: true,
          role: true,
          alumniProfile: {
            select: {
              currentCompany: true,
              jobRole: true,
              domain: true,
            },
          },
        },
      },
      _count: {
        select: {
          comments: true,
          likes: true,
        },
      },
      likes: userId
        ? {
            where: { userId },
            select: { id: true },
          }
        : false,
      comments: {
        where: { parentId: null },
        orderBy: { createdAt: 'asc' },
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
          replies: {
            orderBy: { createdAt: 'asc' },
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
          },
        },
      },
    },
  });

  if (!post) {
    const error = new Error('Post not found');
    error.statusCode = 404;
    throw error;
  }

  // Increment view count asynchronously
  prisma.communityPost.update({
    where: { id: postId },
    data: { viewCount: { increment: 1 } },
  }).catch(() => {});

  return {
    ...post,
    likesCount: post._count.likes,
    commentCount: post._count.comments,
    hasLiked: Boolean(post.likes && post.likes.length > 0),
  };
}

/**
 * Create a Community Comment or Reply
 */
async function createComment({ postId, authorId, parentId = null, content }) {
  if (!content || !content.trim()) {
    const error = new Error('Comment content cannot be empty');
    error.statusCode = 400;
    throw error;
  }

  const post = await prisma.communityPost.findUnique({
    where: { id: postId },
    include: { community: true },
  });

  if (!post) {
    const error = new Error('Post not found');
    error.statusCode = 404;
    throw error;
  }

  if (post.isLocked) {
    const error = new Error('This post is locked by community moderators');
    error.statusCode = 403;
    throw error;
  }

  // Membership validation
  const membership = await prisma.communityMember.findUnique({
    where: {
      communityId_userId: {
        communityId: post.communityId,
        userId: authorId,
      },
    },
  });

  if (!membership || membership.status !== 'ACTIVE') {
    const error = new Error('You must join this community to comment');
    error.statusCode = 403;
    throw error;
  }

  // Create comment in PostgreSQL
  const comment = await prisma.communityComment.create({
    data: {
      postId,
      authorId,
      parentId,
      content: content.trim(),
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

  // Award Gamification Points if Alumni
  if (comment.author.role === 'ALUMNI') {
    await gamificationService.awardPoints({
      userId: authorId,
      activityType: 'COMMUNITY_COMMENT_CREATED',
      referenceId: comment.id,
      referenceType: 'community_comment',
      description: `Commented on "${post.title}"`,
    });
  }

  // Notify post author if commenter is someone else
  if (post.authorId !== authorId) {
    try {
      await notificationService.createNotification({
        userId: post.authorId,
        actorId: authorId,
        type: 'COMMUNITY_COMMENT',
        title: 'New Reply in Community 💬',
        message: `${comment.author.firstName} commented on your post: "${post.title}"`,
        data: { postId, commentId: comment.id, communitySlug: post.community.slug },
      });
    } catch (err) {
      console.warn('[Community] Comment notification failed:', err.message);
    }
  }

  // Real-time broadcast
  const io = getIO();
  if (io) {
    io.to(`community:${post.communityId}`).emit('community:new_comment', {
      communityId: post.communityId,
      postId,
      comment,
    });
    io.to(`community_post:${postId}`).emit('community_post:new_comment', {
      postId,
      comment,
    });
  }

  return comment;
}

/**
 * Toggle Like on Post
 */
async function toggleLikePost(postId, userId) {
  const existing = await prisma.communityPostLike.findUnique({
    where: {
      postId_userId: {
        postId,
        userId,
      },
    },
  });

  let hasLiked = false;
  if (existing) {
    try {
      await prisma.communityPostLike.deleteMany({
        where: { postId, userId },
      });
    } catch (e) {
      // Ignore if already deleted concurrently
    }
    hasLiked = false;
  } else {
    try {
      await prisma.communityPostLike.create({
        data: {
          postId,
          userId,
        },
      });
      hasLiked = true;
    } catch (e) {
      // If concurrent request already inserted the like
      if (e.code === 'P2002' || e.message?.includes('Unique constraint') || e.message?.includes('unique constraint')) {
        hasLiked = true;
      } else {
        throw e;
      }
    }
  }

  // Count actual likes to keep count 100% accurate and prevent negatives
  const likesCount = await prisma.communityPostLike.count({
    where: { postId },
  });

  const updatedPost = await prisma.communityPost.update({
    where: { id: postId },
    data: { likesCount },
    select: { likesCount: true, communityId: true },
  });

  const io = getIO();
  if (io && updatedPost) {
    io.to(`community:${updatedPost.communityId}`).emit('community:post_likes_updated', {
      postId,
      likesCount: updatedPost.likesCount,
    });
  }

  return {
    hasLiked,
    likesCount: updatedPost ? updatedPost.likesCount : 0,
  };
}

/**
 * Moderate Post (Pin, Lock, Flag, Hide, Delete)
 */
async function moderatePost({ postId, moderatorId, status = null, isPinned = null, isLocked = null }) {
  const post = await prisma.communityPost.findUnique({
    where: { id: postId },
    include: { community: true },
  });

  if (!post) {
    const error = new Error('Post not found');
    error.statusCode = 404;
    throw error;
  }

  // Check moderator privileges
  const user = await prisma.user.findUnique({
    where: { id: moderatorId },
    select: { role: true },
  });

  const member = await prisma.communityMember.findUnique({
    where: {
      communityId_userId: {
        communityId: post.communityId,
        userId: moderatorId,
      },
    },
  });

  const isPlatformAdmin = user && user.role === 'ADMIN';
  const isCommunityModerator = member && ['ADMIN', 'MODERATOR'].includes(member.role);

  if (!isPlatformAdmin && !isCommunityModerator) {
    const error = new Error('Moderation permissions required');
    error.statusCode = 403;
    throw error;
  }

  const updateData = {};
  if (status) updateData.status = status;
  if (isPinned !== null && isPinned !== undefined) updateData.isPinned = Boolean(isPinned);
  if (isLocked !== null && isLocked !== undefined) updateData.isLocked = Boolean(isLocked);

  const updated = await prisma.communityPost.update({
    where: { id: postId },
    data: updateData,
  });

  const io = getIO();
  if (io) {
    io.to(`community:${post.communityId}`).emit('community:post_moderated', {
      postId,
      updates: updateData,
    });
  }

  return updated;
}

module.exports = {
  DEFAULT_COMMUNITIES,
  seedDefaultCommunities,
  getCommunities,
  getCommunityBySlug,
  joinCommunity,
  leaveCommunity,
  getCommunityMembers,
  getCommunityPosts,
  createPost,
  getPostDetails,
  createComment,
  toggleLikePost,
  moderatePost,
};
