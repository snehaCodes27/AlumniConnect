const prisma = require('../config/prisma');

/**
 * Get all users awaiting admin approval (STUDENT & ALUMNI)
 */
const getPendingUsers = async () => {
  const pendingUsers = await prisma.user.findMany({
    where: {
      isApproved: false,
      role: {
        in: ['STUDENT', 'ALUMNI'],
      },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  return pendingUsers;
};

/**
 * Approve a user account
 */
const approveUser = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      isApproved: true,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      isApproved: true,
      updatedAt: true,
    },
  });

  return updatedUser;
};

/**
 * Reject a user account (set isApproved to false)
 */
const rejectUser = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      isApproved: false,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      isApproved: true,
      updatedAt: true,
    },
  });

  return updatedUser;
};

module.exports = {
  getPendingUsers,
  approveUser,
  rejectUser,
};
