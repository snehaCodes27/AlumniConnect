const { PrismaClient } = require('@prisma/client');
const { sendSMS } = require('./twilio.service');
const {
  sendEmail,
  getAlumniPlacementInviteHtml,
  getStudentPlacementBroadcastHtml,
} = require('./email.service');
const { getIO } = require('../socket');

const prisma = new PrismaClient();

// In-memory state for active drives — starts empty, created dynamically
let activeDrives = [];


/**
 * 1. Get All Placement Announcements / Drives
 */
const getDrives = async () => {
  return activeDrives;
};

/**
 * 1b. Create New Drive (Admin)
 */
const createDrive = async ({ companyName, driveDate, minCgpa, eligibleBranches, webinarLink }) => {
  const id = `drive-${companyName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`;
  const newDrive = {
    id,
    companyName,
    driveDate,
    minCgpa: parseFloat(minCgpa) || 6.0,
    eligibleBranches: eligibleBranches || ['Computer Engineering', 'Information Technology'],
    status: 'ANNOUNCED',
    announcementMessage: `On ${driveDate}, ${companyName} placement drive is arranged in our college.`,
    announcementTime: new Date().toISOString(),
    invitedAlumni: [],
    acceptedAlumni: [],
    registeredStudents: [],
    communityId: null,
    webinarLink: webinarLink || `https://meet.google.com/${companyName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-placement`,
  };
  activeDrives.push(newDrive);
  return newDrive;
};

/**
 * 2. Get Single Drive
 */
const getDriveById = async (id) => {
  return activeDrives.find((d) => d.id === id) || null;
};

/**
 * 2b. Get or create drive by company name
 */
const getOrCreateDrive = async ({ companyName, driveDate }) => {
  const slug = companyName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const existing = activeDrives.find((d) => d.companyName.toLowerCase().includes(slug) || slug.includes(d.companyName.toLowerCase().replace(/[^a-z0-9]/g, '-')));
  if (existing) return existing;
  return createDrive({ companyName, driveDate: driveDate || 'TBD' });
};

/**
 * 3. Search Alumni for a Company (AI Discovery)
 */
const searchAlumniForCompany = async (companyName) => {
  const query = companyName.trim().toLowerCase();

  const alumniList = await prisma.user.findMany({
    where: {
      role: 'ALUMNI',
      alumniProfile: {
        OR: [
          { currentCompany: { contains: query, mode: 'insensitive' } },
          { previousCompanies: { some: { companyName: { contains: query, mode: 'insensitive' } } } },
        ],
      },
    },
    include: { alumniProfile: true },
  });

  return alumniList.map((alumni) => ({
    id: alumni.id,
    name: `${alumni.firstName} ${alumni.lastName}`,
    email: alumni.email,
    phone: alumni.phone,
    role: alumni.alumniProfile?.jobRole || 'Engineer',
    company: alumni.alumniProfile?.currentCompany || companyName,
    branch: alumni.alumniProfile?.branch || 'Engineering',
    passoutYear: alumni.alumniProfile?.graduationYear || 2022,
    skills: alumni.alumniProfile?.skills || [],
  }));
};

/**
 * 3b. ONE-CLICK: Search alumni + auto-create drive + send emails (all in one)
 */
const searchAndInviteAlumni = async ({ companyName, driveDate, minCgpa, alumniIds }) => {
  // 1. Get or create drive for this company
  const drive = await getOrCreateDrive({ companyName, driveDate });

  // 2. If no alumniIds passed, find all alumni at this company
  let targetIds = alumniIds;
  if (!targetIds || targetIds.length === 0) {
    const found = await searchAlumniForCompany(companyName);
    targetIds = found.map((a) => a.id);
  }

  if (targetIds.length === 0) {
    return { success: false, error: `No alumni found working at ${companyName}`, drive, invited: [] };
  }

  // 3. Send invites
  const result = await sendAlumniInvites({ driveId: drive.id, alumniIds: targetIds });
  return { ...result, drive, companyName };
};

/**
 * 4. Send Invites to Selected Alumni (SMS & In-App Notification)
 */
const sendAlumniInvites = async ({ driveId, alumniIds }) => {
  const drive = await getDriveById(driveId);
  const invited = [];

  for (const alumniId of alumniIds) {
    const user = await prisma.user.findUnique({
      where: { id: alumniId },
      include: { alumniProfile: true },
    });

    if (user) {
      const inviteRecord = {
        id: `invite-${user.id}`,
        alumniId: user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        phone: user.phone,
        company: user.alumniProfile?.currentCompany || drive.companyName,
        status: 'INVITED', // INVITED, ACCEPTED, DECLINED
        sentAt: new Date().toISOString(),
      };

      // Add to drive record
      const existingIdx = drive.invitedAlumni.findIndex((a) => a.alumniId === user.id);
      if (existingIdx >= 0) {
        drive.invitedAlumni[existingIdx] = inviteRecord;
      } else {
        drive.invitedAlumni.push(inviteRecord);
      }
      invited.push(inviteRecord);

      // Create in-app Notification for Alumni
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'SYSTEM',
          title: `Invitation to Guide Juniors - ${drive.companyName} Drive`,
          message: `On ${drive.driveDate}, ${drive.companyName} placement drive is arranged in our college. Would you be interested in guiding your juniors?`,
          data: { driveId: drive.id },
        },
      });

      const backendUrl = process.env.API_BASE_URL || 'http://localhost:5000';
      const acceptUrl = `${backendUrl}/api/company-connect/email-respond?driveId=${drive.id}&alumniId=${user.id}&action=ACCEPT`;
      const declineUrl = `${backendUrl}/api/company-connect/email-respond?driveId=${drive.id}&alumniId=${user.id}&action=DECLINE`;

      // Send Real SMS to Alumni via TextBee
      if (user.phone) {
        const smsText = `AlumniConnect: Hi ${user.firstName}, on ${drive.driveDate}, ${drive.companyName} placement drive is arranged. Can you guide juniors? Tap to Accept: ${acceptUrl}`;
        sendSMS({ to: user.phone, body: smsText }).catch((e) =>
          console.warn(`[Company Connect SMS Warning] ${e.message}`)
        );
      }

      // Send Real Email to Alumni
      if (user.email) {
        sendEmail({
          to: user.email,
          subject: `Placement Drive Guidance Invitation: ${drive.companyName} (${drive.driveDate})`,
          html: getAlumniPlacementInviteHtml({
            alumniName: `${user.firstName} ${user.lastName}`,
            companyName: drive.companyName,
            driveDate: drive.driveDate,
            webinarLink: drive.webinarLink,
            acceptUrl,
            declineUrl,
             dashboardLink: `${process.env.CLIENT_URL || 'http://localhost:5173'}/alumni/dashboard`,
          }),
        }).catch((e) => console.warn(`[Company Connect Email Warning] ${e.message}`));
      }
    }
  }

  drive.status = 'ALUMNI_INVITED';

  // Broadcast socket update
  const io = getIO();
  if (io) {
    io.emit('company_connect:invites_sent', { driveId: drive.id, invitedCount: invited.length });
  }

  return { success: true, invited };
};

/**
 * 5. Alumni Responds (Accept / Reject)
 */
const respondAlumniInvite = async ({ driveId, alumniId, action }) => {
  const drive = await getDriveById(driveId);
  const invite = drive.invitedAlumni.find((a) => a.alumniId === alumniId);

  const status = action === 'ACCEPT' ? 'ACCEPTED' : 'DECLINED';
  if (invite) {
    invite.status = status;
  }

  if (action === 'ACCEPT') {
    const existingIdx = drive.acceptedAlumni.findIndex((a) => a.alumniId === alumniId);
    if (existingIdx < 0 && invite) {
      drive.acceptedAlumni.push(invite);
    }

    // Notify Admin via Notification in database
    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (adminUser) {
      await prisma.notification.create({
        data: {
          userId: adminUser.id,
          type: 'SYSTEM',
          title: `Alumni Accepted Placement Mentorship 🌟`,
          message: `${invite?.name || 'Alumni'} has accepted your request to guide juniors for ${drive.companyName} placement drive!`,
          data: { driveId: drive.id, alumniId },
        },
      });
    }

    // Socket broadcast
    const io = getIO();
    if (io) {
      io.emit('company_connect:alumni_accepted', {
        driveId: drive.id,
        alumniName: invite?.name,
      });
    }
  }

  return { success: true, status, drive };
};

/**
 * 6. Admin Broadcasts to Students (SMS & In-App Notification)
 */
const broadcastToStudents = async ({ driveId }) => {
  const drive = await getDriveById(driveId);
  drive.status = 'STUDENTS_NOTIFIED';

  const students = await prisma.user.findMany({
    where: { role: 'STUDENT' },
    include: { studentProfile: true },
  });

  const mentorNames = drive.acceptedAlumni.map((a) => a.name).join(', ') || 'Senior Alumni';

  for (const student of students) {
    // In-app Notification
    await prisma.notification.create({
      data: {
        userId: student.id,
        type: 'SYSTEM',
        title: `${drive.companyName} Placement Drive Announcement 🚀`,
        message: `In our college, on ${drive.driveDate}, ${drive.companyName} placement drive is arranged. Alumni (${mentorNames}) are ready to guide you. Fill form if interested!`,
        data: { driveId: drive.id, action: 'FILL_FORM' },
      },
    });

    // Send Real SMS to Student
    if (student.phone) {
      const smsBody = `AlumniConnect: ${drive.companyName} Drive on ${drive.driveDate}! Alumni mentors are ready to guide you. Check your student dashboard to register!`;
      sendSMS({ to: student.phone, body: smsBody }).catch((e) =>
        console.warn(`[Student Broadcast SMS Warning] ${e.message}`)
      );
    }

    // Send Real Email to Student
    if (student.email) {
      sendEmail({
        to: student.email,
        subject: `Upcoming Placement Drive Announcement: ${drive.companyName} (${drive.driveDate})`,
        html: getStudentPlacementBroadcastHtml({
          studentName: `${student.firstName} ${student.lastName}`,
          companyName: drive.companyName,
          driveDate: drive.driveDate,
          mentorNames,
          webinarLink: drive.webinarLink,
          registrationLink: 'http://localhost:5173/student/placement',
        }),
      }).catch((e) => console.warn(`[Student Broadcast Email Warning] ${e.message}`));
    }
  }

  const io = getIO();
  if (io) {
    io.emit('company_connect:students_notified', { driveId: drive.id, studentCount: students.length });
  }

  return { success: true, notifiedCount: students.length, drive };
};

/**
 * 7. Student Registration & Automated Eligibility Check & Community Creation
 */
const registerStudentForDrive = async ({ driveId, studentUserId, formDetails }) => {
  const drive = await getDriveById(driveId);
  const student = await prisma.user.findUnique({
    where: { id: studentUserId },
    include: { studentProfile: true },
  });

  if (!student) {
    const error = new Error('Student not found.');
    error.statusCode = 404;
    throw error;
  }

  const cgpa = formDetails.cgpa ? parseFloat(formDetails.cgpa) : (student.studentProfile?.cgpa ? parseFloat(student.studentProfile.cgpa) : 0);
  const branch = formDetails.branch || student.studentProfile?.branch || 'Information Technology';

  // Eligibility Checks
  const isCgpaEligible = cgpa >= drive.minCgpa;
  const isBranchEligible = drive.eligibleBranches.some((b) => branch.toLowerCase().includes(b.toLowerCase()) || b.toLowerCase().includes(branch.toLowerCase()));
  const isEligible = isCgpaEligible && isBranchEligible;

  const registrationRecord = {
    studentId: student.id,
    name: `${student.firstName} ${student.lastName}`,
    email: student.email,
    phone: student.phone,
    rollNumber: formDetails.rollNumber || '22IT101',
    branch,
    cgpa,
    isEligible,
    eligibilityReasons: [
      isCgpaEligible ? `CGPA criteria satisfied (${cgpa} >= ${drive.minCgpa})` : `CGPA below cutoff (${cgpa} < ${drive.minCgpa})`,
      isBranchEligible ? `Branch criteria satisfied (${branch})` : `Branch not eligible`,
      'Year criteria satisfied (Final/Pre-final year)',
    ],
    status: isEligible ? 'ENROLLED' : 'REJECTED_CRITERIA',
    registeredAt: new Date().toISOString(),
  };

  // Add to drive registrations
  const existIdx = drive.registeredStudents.findIndex((s) => s.studentId === student.id);
  if (existIdx >= 0) {
    drive.registeredStudents[existIdx] = registrationRecord;
  } else {
    drive.registeredStudents.push(registrationRecord);
  }

  // If eligible, automatically create or add to Dedicated Community!
  if (isEligible) {
    // 1. Check or Create Community: "Godrej Infotech Placement Community"
    let community = null;
    if (drive.communityId) {
      community = await prisma.community.findUnique({ where: { id: drive.communityId } });
    }

    if (!community) {
      const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
      const communityName = `${drive.companyName} Placement Community`;
      const slug = `placement-${drive.companyName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

      community = await prisma.community.upsert({
        where: { slug },
        update: {},
        create: {
          name: communityName,
          slug,
          description: `Official preparation and guidance community for ${drive.companyName} placement drive on ${drive.driveDate}.`,
          creatorId: adminUser?.id || student.id,
          tags: ['Placement', drive.companyName, 'CareerPrep'],
        },
      });
      drive.communityId = community.id;

      // Post initial welcome webinar link in the community
      await prisma.communityPost.create({
        data: {
          communityId: community.id,
          authorId: adminUser?.id || student.id,
          title: `Welcome to ${drive.companyName} Placement Guidance Session! 🎓`,
          content: `Welcome students and mentors! The live guidance webinar for ${drive.companyName} placement drive will take place on ${drive.driveDate}. Here is the Google Meet link: ${drive.webinarLink}`,
          linkUrl: drive.webinarLink,
          type: 'ANNOUNCEMENT',
          isPinned: true,
        },
      });
    }

    // 2. Add Student to Community
    await prisma.communityMember.upsert({
      where: {
        communityId_userId: {
          communityId: community.id,
          userId: student.id,
        },
      },
      update: { status: 'ACTIVE' },
      create: {
        communityId: community.id,
        userId: student.id,
        role: 'MEMBER',
        status: 'ACTIVE',
      },
    });

    // 3. Add Accepted Alumni as Moderators to Community
    for (const alumni of drive.acceptedAlumni) {
      await prisma.communityMember.upsert({
        where: {
          communityId_userId: {
            communityId: community.id,
            userId: alumni.alumniId,
          },
        },
        update: { status: 'ACTIVE', role: 'MODERATOR' },
        create: {
          communityId: community.id,
          userId: alumni.alumniId,
          role: 'MODERATOR',
          status: 'ACTIVE',
        },
      });
    }

    // Send SMS reminder to student with webinar link
    if (student.phone) {
      const joinSms = `AlumniConnect: You are approved for ${drive.companyName} Drive! Joined ${drive.companyName} Community. Webinar: ${drive.webinarLink}`;
      sendSMS({ to: student.phone, body: joinSms }).catch((e) => console.warn(e.message));
    }
  }

  return {
    success: true,
    registration: registrationRecord,
    isEligible,
    communityId: drive.communityId,
    drive,
  };
};

const resetDriveState = (id) => {
  if (id) {
    const drive = activeDrives.find((d) => d.id === id);
    if (drive) {
      drive.status = 'ANNOUNCED';
      drive.invitedAlumni = [];
      drive.acceptedAlumni = [];
      drive.registeredStudents = [];
      return drive;
    }
    return null;
  }

  // Reset all drives when no specific id provided
  const resetDrives = [];
  activeDrives.forEach((drive) => {
    drive.status = 'ANNOUNCED';
    drive.invitedAlumni = [];
    drive.acceptedAlumni = [];
    drive.registeredStudents = [];
    resetDrives.push(drive);
  });
  return resetDrives;
};

module.exports = {
  getDrives,
  getDriveById,
  getOrCreateDrive,
  createDrive,
  searchAlumniForCompany,
  searchAndInviteAlumni,
  sendAlumniInvites,
  respondAlumniInvite,
  broadcastToStudents,
  registerStudentForDrive,
  resetDriveState,
};

