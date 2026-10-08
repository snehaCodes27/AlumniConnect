const prisma = require('../config/prisma');
const path = require('path');
const fs = require('fs');
const {
  validateAlumniOnboarding,
  validatePreviousCompanies,
} = require('../validators/alumniProfile.validator');

/**
 * Helper to check if the authenticated user is an alumni
 */
const requireAlumni = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, firstName: true, lastName: true },
  });

  if (!user) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  if (user.role !== 'ALUMNI') {
    const error = new Error('Only alumni can access this resource.');
    error.statusCode = 403;
    throw error;
  }

  return user;
};

/**
 * Helper to parse array fields from form submissions
 */
const parseArrayField = (value) => {
  if (Array.isArray(value)) {
    return value.filter((v) => v !== undefined && v !== null && v !== '');
  }
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter((v) => v !== undefined && v !== null && v !== '');
      }
    } catch {
      // Not JSON, fall through to comma-split
    }
    return value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
};

/**
 * Get the current alumni's profile, including previous companies
 */
const getAlumniProfile = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    await requireAlumni(userId);

    const profile = await prisma.alumniProfile.findUnique({
      where: { userId },
      include: {
        previousCompanies: {
          orderBy: { startYear: 'desc' },
        },
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        profilePhoto: true,
        role: true,
      },
    });

    const onboardingComplete = !!profile;

    return res.status(200).json({
      success: true,
      data: {
        user,
        profile: profile || null,
        onboardingComplete,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Complete onboarding — create/update alumni profile with all fields.
 * Expects multipart/form-data to support file uploads (profile photo, resume).
 */
const completeOnboarding = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const user = await requireAlumni(userId);

    const data = req.body;

    const validation = validateAlumniOnboarding(data);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.errors.join(' '),
        errors: validation.errors,
      });
    }

    const fullName = (data.fullName || '').trim();
    const firstName = data.firstName?.trim() || fullName.split(/\s+/)[0] || user.firstName;
    const lastName = data.lastName?.trim() || fullName.split(/\s+/).slice(1).join(' ') || user.lastName;

    await prisma.user.update({
      where: { id: userId },
      data: {
        firstName: firstName,
        lastName: lastName,
      },
    });

    const previousCompaniesRaw = parseArrayField(data.previousCompanies);
    let previousCompanies = [];
    if (previousCompaniesRaw.length > 0) {
      const companyValidation = validatePreviousCompanies(previousCompaniesRaw);
      if (!companyValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: companyValidation.errors.join(' '),
          errors: companyValidation.errors,
        });
      }
      previousCompanies = previousCompaniesRaw;
    }

    let profilePhotoUrl = null;
    if (req.files?.profilePhoto?.[0]) {
      profilePhotoUrl = `/uploads/${req.files.profilePhoto[0].filename}`;
    }

    let resumeUrl = null;
    if (req.files?.resume?.[0]) {
      resumeUrl = `/uploads/${req.files.resume[0].filename}`;
    }

    const profileData = {
      graduationYear: data.graduationYear ? parseInt(data.graduationYear) : null,
      branch: data.branch?.trim() || null,
      currentCompany: data.currentCompany?.trim() || null,
      jobRole: data.jobRole?.trim() || null,
      yearsOfExperience: data.yearsOfExperience ? parseInt(data.yearsOfExperience) : null,
      domain: data.domain?.trim() || null,
      skills: parseArrayField(data.skills),
      areasOfExpertise: parseArrayField(data.areasOfExpertise),
      location: data.location?.trim() || null,
      linkedinUrl: data.linkedinUrl?.trim() || null,
      githubUrl: data.githubUrl?.trim() || null,
      mentorshipAvailable: data.mentorshipAvailable === 'true' || data.mentorshipAvailable === true,
      resumeUrl: resumeUrl || data.resumeUrl || null,
    };

    let profile;

    if (previousCompanies.length > 0) {
      profile = await prisma.alumniProfile.upsert({
        where: { userId },
        create: {
          userId,
          ...profileData,
          previousCompanies: {
            create: previousCompanies.map((c) => ({
              companyName: c.companyName.trim(),
              jobRole: c.jobRole?.trim() || null,
              domain: c.domain?.trim() || null,
              startYear: c.startYear ? parseInt(c.startYear) : null,
              endYear: c.endYear ? parseInt(c.endYear) : null,
            })),
          },
        },
        update: {
          ...profileData,
          previousCompanies: {
            deleteMany: {},
            create: previousCompanies.map((c) => ({
              companyName: c.companyName.trim(),
              jobRole: c.jobRole?.trim() || null,
              domain: c.domain?.trim() || null,
              startYear: c.startYear ? parseInt(c.startYear) : null,
              endYear: c.endYear ? parseInt(c.endYear) : null,
            })),
          },
        },
        include: {
          previousCompanies: {
            orderBy: { startYear: 'desc' },
          },
        },
      });
    } else {
      profile = await prisma.alumniProfile.upsert({
        where: { userId },
        create: {
          userId,
          ...profileData,
        },
        update: profileData,
        include: {
          previousCompanies: {
            orderBy: { startYear: 'desc' },
          },
        },
      });
    }

    if (profilePhotoUrl) {
      await prisma.user.update({
        where: { id: userId },
        data: { profilePhoto: profilePhotoUrl },
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Onboarding completed successfully.',
      data: {
        profile,
        profilePhoto: profilePhotoUrl,
        resumeUrl: resumeUrl || profile.resumeUrl,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update alumni profile (general update endpoint for future editing)
 */
const updateAlumniProfile = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    await requireAlumni(userId);

    const {
      graduationYear,
      branch,
      currentCompany,
      jobRole,
      yearsOfExperience,
      domain,
      skills,
      areasOfExpertise,
      location,
      linkedinUrl,
      githubUrl,
      mentorshipAvailable,
      resumeUrl,
    } = req.body;

    const profileData = {
      graduationYear: graduationYear ? parseInt(graduationYear) : null,
      branch: branch?.trim() || null,
      currentCompany: currentCompany?.trim() || null,
      jobRole: jobRole?.trim() || null,
      yearsOfExperience: yearsOfExperience ? parseInt(yearsOfExperience) : null,
      domain: domain?.trim() || null,
      skills: parseArrayField(skills),
      areasOfExpertise: parseArrayField(areasOfExpertise),
      location: location?.trim() || null,
      linkedinUrl: linkedinUrl?.trim() || null,
      githubUrl: githubUrl?.trim() || null,
      mentorshipAvailable:
        mentorshipAvailable === 'true' || mentorshipAvailable === true,
      resumeUrl: resumeUrl || null,
    };

    const profile = await prisma.alumniProfile.upsert({
      where: { userId },
      create: { userId, ...profileData },
      update: profileData,
      include: {
        previousCompanies: {
          orderBy: { startYear: 'desc' },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update profile photo
 */
const updateProfilePhoto = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    await requireAlumni(userId);

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded.',
      });
    }

    const profilePhotoUrl = `/uploads/${req.file.filename}`;

    await prisma.user.update({
      where: { id: userId },
      data: { profilePhoto: profilePhotoUrl },
    });

    return res.status(200).json({
      success: true,
      message: 'Profile photo updated successfully.',
      data: { profilePhoto: profilePhotoUrl },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload resume
 */
const uploadResume = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    await requireAlumni(userId);

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded.',
      });
    }

    const resumeUrl = `/uploads/${req.file.filename}`;

    await prisma.alumniProfile.upsert({
      where: { userId },
      create: { userId, resumeUrl },
      update: { resumeUrl },
    });

    return res.status(200).json({
      success: true,
      message: 'Resume uploaded successfully.',
      data: { resumeUrl },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAlumniProfile,
  completeOnboarding,
  updateAlumniProfile,
  updateProfilePhoto,
  uploadResume,
};
