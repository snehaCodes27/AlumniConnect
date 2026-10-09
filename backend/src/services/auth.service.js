const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const config = require('../config/env');

/**
 * Helper function to remove sensitive fields like passwordHash from user object
 */
const sanitizeUser = (user) => {
  if (!user) return null;
  const { passwordHash, ...sanitized } = user;
  return sanitized;
};

/**
 * Register a new Student user
 */
const registerStudent = async (data) => {
  const { firstName, lastName, email, phone, password } = data;
  const normalizedEmail = email.trim().toLowerCase();

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    const error = new Error('An account with this email address already exists.');
    error.statusCode = 400;
    throw error;
  }

  // Hash password
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // Create User
  const newUser = await prisma.user.create({
    data: {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      phone: phone ? phone.trim() : null,
      passwordHash,
      role: 'STUDENT',
      isApproved: true,
      isVerified: true,
    },
  });

  return {
    user: sanitizeUser(newUser),
    message: 'Registration successful. Your account is waiting for admin approval.',
  };
};

/**
 * Register a new Alumni user
 */
const registerAlumni = async (data) => {
  const { firstName, lastName, email, phone, password } = data;
  const normalizedEmail = email.trim().toLowerCase();

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    const error = new Error('An account with this email address already exists.');
    error.statusCode = 400;
    throw error;
  }

  // Hash password
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // Create User
  const newUser = await prisma.user.create({
    data: {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      phone: phone ? phone.trim() : null,
      passwordHash,
      role: 'ALUMNI',
      isApproved: true,
      isVerified: true,
    },
  });

  return {
    user: sanitizeUser(newUser),
    message: 'Registration successful. Your account is waiting for admin approval.',
  };
};

/**
 * Login user and issue JWT token
 */
const login = async ({ email, password }) => {
  const normalizedEmail = email.trim().toLowerCase();

  // 1. Find user by email
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  // 2. Compare password
  const isPasswordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordMatch) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  // 3. Approval check removed — alumni are auto-approved on registration

  // 4. Update lastLoginAt
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const sanitizedUser = sanitizeUser(user);

  // For alumni, check if onboarding is needed
  if (user.role === 'ALUMNI') {
    const alumniProfile = await prisma.alumniProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    sanitizedUser.needsOnboarding = !alumniProfile;
  }

  // 5. Generate JWT token
  const token = jwt.sign(
    {
      userId: user.id,
      role: user.role,
    },
    config.jwtSecret,
    { expiresIn: '24h' }
  );

  return {
    token,
    user: sanitizedUser,
  };
};

/**
 * Get current authenticated user details
 */
const getCurrentUser = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isApproved: true,
      isVerified: true,
      profilePhoto: true,
      phone: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    const error = new Error('User session expired. Please log in again.');
    error.statusCode = 401;
    throw error;
  }

  const result = { ...user };

  // For alumni, include onboarding status
  if (user.role === 'ALUMNI') {
    const alumniProfile = await prisma.alumniProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    result.needsOnboarding = !alumniProfile;
  }

  return result;
};

module.exports = {
  registerStudent,
  registerAlumni,
  login,
  getCurrentUser,
  sanitizeUser,
};
