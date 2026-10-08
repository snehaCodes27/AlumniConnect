const prisma = require('../config/prisma');

const getProfileCompletion = (profile, user) => {
  const fields = [
    { key: 'profilePhoto', value: user?.profilePhoto, label: 'Profile Photo', weight: 5 },
    { key: 'firstName', value: user?.firstName, label: 'First Name', weight: 5 },
    { key: 'lastName', value: user?.lastName, label: 'Last Name', weight: 5 },
    { key: 'email', value: user?.email, label: 'Email', weight: 5 },
    { key: 'phone', value: user?.phone, label: 'Phone', weight: 5 },
    { key: 'location', value: profile?.location, label: 'Location', weight: 5 },
    { key: 'college', value: profile?.college, label: 'College', weight: 8 },
    { key: 'degree', value: profile?.degree, label: 'Degree', weight: 8 },
    { key: 'branch', value: profile?.branch, label: 'Branch', weight: 8 },
    { key: 'currentYear', value: profile?.currentYear, label: 'Current Year', weight: 8 },
    { key: 'batch', value: profile?.batch, label: 'Batch', weight: 8 },
    { key: 'graduationYear', value: profile?.graduationYear, label: 'Graduation Year', weight: 8 },
    { key: 'cgpa', value: profile?.cgpa, label: 'CGPA/Percentage', weight: 8 },
    { key: 'careerGoal', value: profile?.careerGoal, label: 'Career Goal', weight: 10 },
    { key: 'preferredDomain', value: profile?.preferredDomain, label: 'Preferred Domain', weight: 10 },
    { key: 'preferredRole', value: profile?.preferredRole, label: 'Preferred Role', weight: 10 },
    { key: 'preferredCompany', value: profile?.preferredCompany, label: 'Preferred Company', weight: 8 },
    { key: 'technicalSkills', value: profile?.technicalSkills?.length, label: 'Technical Skills', weight: 10 },
    { key: 'tools', value: profile?.tools?.length, label: 'Tools/Technologies', weight: 8 },
    { key: 'domainInterests', value: profile?.domainInterests?.length, label: 'Domain Interests', weight: 8 },
    { key: 'careerInterests', value: profile?.careerInterests?.length, label: 'Career Interests', weight: 8 },
    { key: 'linkedinUrl', value: profile?.linkedinUrl, label: 'LinkedIn', weight: 5 },
    { key: 'githubUrl', value: profile?.githubUrl, label: 'GitHub', weight: 5 },
    { key: 'portfolioUrl', value: profile?.portfolioUrl, label: 'Portfolio', weight: 5 },
    { key: 'resumeUrl', value: profile?.resumeUrl, label: 'Resume/CV', weight: 10 },
  ];

  let completedWeight = 0;
  const totalWeight = fields.reduce((sum, f) => sum + f.weight, 0);
  const incompleteFields = [];

  fields.forEach((field) => {
    const hasValue = field.value !== null && field.value !== undefined && field.value !== '';
    if (hasValue) {
      completedWeight += field.weight;
    } else {
      incompleteFields.push(field.label);
    }
  });

  const percentage = Math.round((completedWeight / totalWeight) * 100);

  return {
    percentage,
    incompleteFields,
    completedCount: fields.filter(f => {
      const hasValue = f.value !== null && f.value !== undefined && f.value !== '';
      return hasValue;
    }).length,
    totalCount: fields.length,
  };
};

const getStudentProfile = async (req, res, next) => {
  try {
    const userId = req.user.userId;

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

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    if (user.role !== 'STUDENT') {
      return res.status(403).json({
        success: false,
        message: 'Only students can access student profile.',
      });
    }

    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId },
    });

    const completion = getProfileCompletion(studentProfile, user);

    return res.status(200).json({
      success: true,
      data: {
        user,
        studentProfile: studentProfile || {},
        profileCompletion: completion,
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateStudentProfile = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    if (user.role !== 'STUDENT') {
      return res.status(403).json({
        success: false,
        message: 'Only students can update student profile.',
      });
    }

    const {
      phone,
      location,
      college,
      degree,
      branch,
      currentYear,
      batch,
      graduationYear,
      cgpa,
      careerGoal,
      preferredDomain,
      preferredRole,
      preferredCompany,
      technicalSkills,
      tools,
      domainInterests,
      careerInterests,
      linkedinUrl,
      githubUrl,
      portfolioUrl,
      resumeUrl,
    } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        phone: phone?.trim() || null,
        location: location?.trim() || null,
      },
    });

    const studentProfileData = {
      college: college?.trim() || null,
      degree: degree?.trim() || null,
      branch: branch?.trim() || null,
      currentYear: currentYear ? parseInt(currentYear) : null,
      batch: batch?.trim() || null,
      graduationYear: graduationYear ? parseInt(graduationYear) : null,
      cgpa: cgpa ? parseFloat(cgpa) : null,
      careerGoal: careerGoal?.trim() || null,
      preferredDomain: preferredDomain?.trim() || null,
      preferredRole: preferredRole?.trim() || null,
      preferredCompany: preferredCompany?.trim() || null,
      technicalSkills: Array.isArray(technicalSkills) ? technicalSkills : (technicalSkills ? technicalSkills.split(',').map(s => s.trim()).filter(Boolean) : []),
      tools: Array.isArray(tools) ? tools : (tools ? tools.split(',').map(s => s.trim()).filter(Boolean) : []),
      domainInterests: Array.isArray(domainInterests) ? domainInterests : (domainInterests ? domainInterests.split(',').map(s => s.trim()).filter(Boolean) : []),
      careerInterests: Array.isArray(careerInterests) ? careerInterests : (careerInterests ? careerInterests.split(',').map(s => s.trim()).filter(Boolean) : []),
      linkedinUrl: linkedinUrl?.trim() || null,
      githubUrl: githubUrl?.trim() || null,
      portfolioUrl: portfolioUrl?.trim() || null,
      resumeUrl: resumeUrl?.trim() || null,
    };

    const studentProfile = await prisma.studentProfile.upsert({
      where: { userId },
      update: studentProfileData,
      create: {
        userId,
        ...studentProfileData,
      },
    });

    const completion = getProfileCompletion(studentProfile, updatedUser);

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: {
        user: updatedUser,
        studentProfile,
        profileCompletion: completion,
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateProfilePhoto = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    if (user.role !== 'STUDENT') {
      return res.status(403).json({
        success: false,
        message: 'Only students can update profile photo.',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded.',
      });
    }

    const profilePhotoUrl = `/uploads/${req.file.filename}`;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { profilePhoto: profilePhotoUrl },
    });

    return res.status(200).json({
      success: true,
      message: 'Profile photo updated successfully.',
      data: {
        user: updatedUser,
        profilePhoto: profilePhotoUrl,
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateResume = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    if (user.role !== 'STUDENT') {
      return res.status(403).json({
        success: false,
        message: 'Only students can update resume.',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded.',
      });
    }

    const resumeUrl = `/uploads/${req.file.filename}`;

    const studentProfile = await prisma.studentProfile.upsert({
      where: { userId },
      update: { resumeUrl },
      create: {
        userId,
        resumeUrl,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Resume updated successfully.',
      data: {
        studentProfile,
        resumeUrl,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStudentProfile,
  updateStudentProfile,
  updateProfilePhoto,
  updateResume,
};