const prisma = require('../config/prisma');
const {
  sendEmail
} = require('./email.service');
const {
  emitToUser
} = require('../socket');
const {
  fail,
  requiredText,
  validateDrive,
  eligibility,
  viewDrive
} = require('./companyConnectUtils');
const {
  signResponse,
  verifyResponse
} = require('./companyConnectEmailLinks');
const include = {
  invitations: true,
  registrations: true
};
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
})[char]);
const adminView = {
  role: 'ADMIN'
};
async function requireDrive(id, db = prisma) {
  if (typeof id !== 'string' || !id) fail('driveId is required.');
  const d = await db.placementDrive.findUnique({
    where: {
      id
    },
    include
  });
  if (!d) fail('Drive not found.', 404);
  return d;
}
async function requireOpen(id, db = prisma) {
  const drive = await requireDrive(id, db);
  if (drive.status === 'CLOSED' || drive.driveDate < new Date(new Date().toISOString().slice(0, 10))) fail('This drive is closed.', 409);
  return drive;
}
async function lockOpen(id, tx) {
  if (typeof id !== 'string' || !id) fail('driveId is required.');
  const found = await tx.placementDrive.updateMany({
    where: {
      id,
      status: {
        not: 'CLOSED'
      }
    },
    data: {
      updatedAt: new Date()
    }
  });
  if (!found.count) {
    await requireDrive(id, tx);
    fail('This drive is closed.', 409);
  }
  return requireOpen(id, tx);
}
async function enrich(drives, user) {
  const ids = [...new Set(drives.flatMap(d => [...d.invitations.map(i => i.alumniId), ...d.registrations.map(r => r.studentId)]))];
  const users = ids.length ? await prisma.user.findMany({
    where: {
      id: {
        in: ids
      }
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      alumniProfile: {
        select: {
          currentCompany: true
        }
      }
    }
  }) : [];
  const map = new Map(users.map(u => [u.id, u]));
  return drives.map(d => viewDrive(d, user, map));
}
async function getDrives(user) {
  const where = user.role === 'ADMIN' ? {} : user.role === 'ALUMNI' ? {
    invitations: {
      some: {
        alumniId: user.userId
      }
    }
  } : {
    status: {
      in: ['STUDENTS_NOTIFIED', 'CLOSED']
    },
    broadcastAt: {
      not: null
    }
  };
  const result = await enrich(await prisma.placementDrive.findMany({
    where,
    include,
    orderBy: {
      createdAt: 'desc'
    }
  }), user);
  if(user.role==='ADMIN'){const students=await prisma.user.findMany({where:{role:'STUDENT'},select:{studentProfile:true}});return result.map(d=>({...d,eligibleStudentCount:students.filter(s=>eligibility(d,s.studentProfile).isEligible).length}));}
  return result;
}
async function getDriveById(id, user) {
  const d = await requireDrive(id);
  if (user.role === 'ALUMNI' && !d.invitations.some(i => i.alumniId === user.userId)) fail('You are not invited to this drive.', 403);
  if (user.role === 'STUDENT' && !d.broadcastAt) fail('This drive has not been announced to students.', 403);
  return (await enrich([d], user))[0];
}
async function createDrive(input, creatorId) {
  const drive = await prisma.placementDrive.create({
    data: {
      ...validateDrive(input),
      creatorId
    },
    include
  });
  return (await enrich([drive], adminView))[0];
}
async function closeDrive(id) {
  const d = await requireDrive(id);
  return (await enrich([await prisma.placementDrive.update({
    where: {
      id: d.id
    },
    data: {
      status: 'CLOSED'
    },
    include
  })], adminView))[0];
}
async function searchAlumniForCompany(companyName) {
  const query = requiredText(companyName, 'Company name', 100);
  return (await prisma.user.findMany({
    where: {
      role: 'ALUMNI',
      alumniProfile: {
        OR: [{
          currentCompany: {
            contains: query,
            mode: 'insensitive'
          }
        }, {
          previousCompanies: {
            some: {
              companyName: {
                contains: query,
                mode: 'insensitive'
              }
            }
          }
        }]
      }
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      alumniProfile: {
        select: {
          jobRole: true,
          currentCompany: true,
          branch: true,
          graduationYear: true,
          previousCompanies: {
            select: {
              companyName: true
            }
          }
        }
      }
    },
    take: 200,
    orderBy: {
      firstName: 'asc'
    }
  })).map(u => ({
    id: u.id,
    name: `${u.firstName} ${u.lastName}`,
    email: u.email,
    role: u.alumniProfile?.jobRole || null,
    company: u.alumniProfile?.currentCompany || null,
    branch: u.alumniProfile?.branch || null,
    passoutYear: u.alumniProfile?.graduationYear || null,
    matchReason: u.alumniProfile?.currentCompany?.toLowerCase().includes(query.toLowerCase()) ? 'Current company' : 'Previous company'
  }));
}
async function getSearchContext() {
  const [totalAlumni, groups] = await Promise.all([prisma.user.count({
    where: {
      role: 'ALUMNI'
    }
  }), prisma.alumniProfile.groupBy({
    by: ['currentCompany'],
    where: {
      currentCompany: {
        not: null
      }
    },
    _count: {
      _all: true
    }
  })]);
  return {
    totalAlumni,
    recordedCompanies: groups.map(g => g.currentCompany).filter(Boolean).slice(0, 20)
  };
}
async function notifyAdmins(event, payload) {
  const admins = await prisma.user.findMany({
    where: {
      role: 'ADMIN'
    },
    select: {
      id: true
    }
  });
  for (const a of admins) emitToUser(a.id, event, payload);
}
function emailStatus(result) {
  return result.success ? 'sent' : result.simulated ? 'not_configured' : 'failed';
}
async function deliver(user, drive, kind, invitation) {
  const client = process.env.CLIENT_URL || 'http://localhost:5173';
  const date = drive.driveDate.toISOString().slice(0, 10);
  const subject = kind === 'invite' ? `Guidance invitation: ${drive.companyName}` : `Placement announcement: ${drive.companyName}`;
  let text, html;
  if (kind === 'invite') {
    const base = process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}/api`;
    const link = action => `${base.replace(/\/$/, '')}/company-connect/email-respond?token=${encodeURIComponent(signResponse(invitation, action))}`;
    const accept = link('ACCEPT'),
      decline = link('DECLINE');
    text = `${drive.companyName} placement drive on ${date}. Help students prepare with your company experience. Accept: ${accept} Decline: ${decline}. Links expire after 7 days. After acceptance, we will email you to ask for your availability.`;
    html = `<p>Hello ${escape(user.firstName)},</p><p>Would you guide students for the <strong>${escape(drive.companyName)}</strong> placement drive on ${date}?</p><p><a href="${escape(accept)}">Accept invitation</a> &nbsp; <a href="${escape(decline)}">Decline invitation</a></p><p>No sign-in is needed. These personal links expire in 7 days. After acceptance, we will email you to ask for your availability.</p>`;
  } else {
    const link = `${client}/student/placement?driveId=${encodeURIComponent(drive.id)}`;
    text = `${drive.companyName} placement drive on ${date}. Check saved-profile eligibility and register: ${link}`;
    html = `<p>Hello ${escape(user.firstName)},</p><p>${escape(text)}</p><p><a href="${escape(link)}">Review placement drive</a></p>`;
  }
  const email = await sendEmail({
    to: user.email,
    subject,
    html,
    text
  });
  return {
    inApp: 'saved',
    email: emailStatus(email),
    sms: 'disabled'
  };
}
async function ensureDriveCommunity(tx, drive) {
  let communityId = drive.communityId;
  if (!communityId) {
    const community = await tx.community.create({
      data: {
        name: `${drive.companyName} Placement Community`,
        slug: `placement-${drive.id}`,
        description: `Preparation for ${drive.companyName} on ${drive.driveDate.toISOString().slice(0, 10)}.`,
        creatorId: drive.creatorId,
        isPrivate: true,
        requiresApproval: true,
        tags: ['Placement', drive.companyName]
      }
    });
    communityId = community.id;
    await tx.placementDrive.update({
      where: {
        id: drive.id
      },
      data: {
        communityId
      }
    });
    await tx.communityMember.create({
      data: {
        communityId,
        userId: drive.creatorId,
        role: 'ADMIN'
      }
    });
    await tx.communityPost.create({
      data: {
        communityId,
        authorId: drive.creatorId,
        type: 'ANNOUNCEMENT',
        isPinned: true,
        title: 'Welcome to placement preparation',
        content: drive.webinarLink ? `Guidance meeting: ${drive.webinarLink}` : 'Mentor availability and guidance details will be coordinated here.',
        linkUrl: drive.webinarLink
      }
    });
  }
  return communityId;
}
async function acceptanceEmails(driveId, alumniId) {
  const drive = await requireDrive(driveId);
  const [alumni, admin] = await Promise.all([prisma.user.findUnique({
    where: {
      id: alumniId
    },
    select: {
      firstName: true,
      lastName: true,
      email: true
    }
  }), prisma.user.findUnique({
    where: {
      id: drive.creatorId
    },
    select: {
      email: true
    }
  })]);
  if (!alumni || !admin) return;
  const name = `${alumni.firstName} ${alumni.lastName}`,
    date = drive.driveDate.toISOString().slice(0, 10);
  const adminAddress = process.env.PLACEMENT_ADMIN_EMAIL || admin.email;
  const adminMail = await sendEmail({
    to: adminAddress,
    subject: `Mentor accepted: ${drive.companyName}`,
    text: `${name} accepted the invitation for ${drive.companyName} on ${date}. The placement community has been created. An availability request is being emailed to the mentor.`,
    html: `<p>${escape(name)} accepted the ${escape(drive.companyName)} invitation for ${date}.</p><p>The private placement community is ready. An availability request is being emailed to the mentor.</p>`
  });
  const schedule = await sendEmail({
    to: alumni.email,
    replyTo: adminAddress,
    subject: `Share your availability: ${drive.companyName} guidance`,
    text: `Thank you, ${name}, for accepting. The placement drive is on ${date}. Please reply to this email with your available dates, time slots and time zone for the guidance session. The placement administrator will coordinate the final schedule.`,
    html: `<p>Thank you, ${escape(name)}, for accepting.</p><p>The ${escape(drive.companyName)} placement drive is on ${date}. Please reply with your available dates, time slots and time zone for a guidance session.</p><p>The placement administrator will coordinate the final schedule. Your private event community has been created.</p>`
  });
  const invite = await prisma.placementInvitation.findUnique({
    where: {
      driveId_alumniId: {
        driveId,
        alumniId
      }
    }
  });
  await prisma.placementInvitation.update({
    where: {
      id: invite.id
    },
    data: {
      delivery: {
        ...(invite.delivery || {}),
        adminEmail: emailStatus(adminMail),
        availabilityEmail: emailStatus(schedule)
      }
    }
  });
}
async function respondFromEmail(token) {
  const data = verifyResponse(token);
  const invitation = await prisma.placementInvitation.findUnique({
    where: {
      id: data.invitationId
    }
  });
  if (!invitation || invitation.driveId !== data.driveId || invitation.alumniId !== data.alumniId) fail('Invitation not found.', 404);
  return respondAlumniInvite({
    driveId: data.driveId,
    alumniId: data.alumniId,
    action: data.action
  });
}
async function sendAlumniInvites({
  driveId,
  alumniIds
}) {
  await requireOpen(driveId);
  if (!Array.isArray(alumniIds) || !alumniIds.length || alumniIds.length > 200 || alumniIds.some(id => typeof id !== 'string')) fail('Select 1–200 alumni.');
  const ids = [...new Set(alumniIds)];
  const users = await prisma.user.findMany({
    where: {
      id: {
        in: ids
      },
      role: 'ALUMNI'
    },
    select: {
      id: true,
      firstName: true,
      email: true,
      phone: true
    }
  });
  if (users.length !== ids.length) fail('Every recipient must be an Alumni account.');
  const invited = [];
  let skipped = 0;
  for (const user of users) {
    let record;
    try {
      record = await prisma.$transaction(async tx => {
        const drive = await lockOpen(driveId, tx);
        const i = await tx.placementInvitation.create({
          data: {
            driveId,
            alumniId: user.id
          }
        });
        const notification = await tx.notification.create({
          data: {
            userId: user.id,
            type: 'SYSTEM',
            title: `Guidance invitation: ${drive.companyName}`,
            message: `Review the ${drive.companyName} placement invitation on your dashboard.`,
            data: {
              driveId
            }
          }
        });
        await tx.placementDrive.updateMany({
          where: {
            id: driveId,
            status: 'ANNOUNCED'
          },
          data: {
            status: 'ALUMNI_INVITED'
          }
        });
        return {
          i,
          drive,
          notification
        };
      });
    } catch (e) {
      if (e.code === 'P2002') {
        skipped++;
        continue;
      }
      throw e;
    }
    emitToUser(user.id, 'notification:new', record.notification);
    emitToUser(user.id, 'company_connect:invites_sent', {
      driveId
    });
    const delivery = await deliver(user, record.drive, 'invite', record.i);
    await prisma.placementInvitation.update({
      where: {
        id: record.i.id
      },
      data: {
        delivery
      }
    });
    invited.push({
      ...record.i,
      delivery
    });
    emitToUser(user.id, 'company_connect:invites_sent', {
      driveId
    });
  }
  await notifyAdmins('company_connect:invites_sent', {
    driveId,
    invitedCount: invited.length
  });
  return {
    success: true,
    invited,
    skipped,
    drive: await getDriveById(driveId, adminView)
  };
}
async function retryInviteEmails({
  driveId,
  alumniIds
}) {
  const drive = await requireOpen(driveId);
  if (!Array.isArray(alumniIds) || !alumniIds.length || alumniIds.length > 200) fail('Select pending invitations to retry.');
  const invited = [];
  for (const id of [...new Set(alumniIds)]) {
    const invitation = drive.invitations.find(i => i.alumniId === id);
    if (!invitation || invitation.status !== 'INVITED' || invitation.delivery?.email === 'sent') fail('Only failed or pending invitation emails can be retried.');
    const alumni = await prisma.user.findUnique({
      where: {
        id
      },
      select: {
        id: true,
        email: true,
        firstName: true
      }
    });
    if (!alumni) fail('Alumni account no longer exists.', 404);
    const delivery = await deliver(alumni, drive, 'invite', invitation);
    await prisma.placementInvitation.update({
      where: {
        id: invitation.id
      },
      data: {
        delivery: {
          ...(invitation.delivery || {}),
          ...delivery
        }
      }
    });
    invited.push({
      ...invitation,
      delivery
    });
  }
  return {
    success: true,
    invited,
    skipped: 0,
    drive: await getDriveById(driveId, adminView)
  };
}
async function respondAlumniInvite({
  driveId,
  alumniId,
  action
}) {
  if (!['ACCEPT', 'DECLINE'].includes(action)) fail('Action must be ACCEPT or DECLINE.');
  const status = action === 'ACCEPT' ? 'ACCEPTED' : 'DECLINED';
  const notifications = await prisma.$transaction(async tx => {
    const messages = [];
    const drive = await lockOpen(driveId, tx);
    const invite = await tx.placementInvitation.findUnique({
      where: {
        driveId_alumniId: {
          driveId,
          alumniId
        }
      }
    });
    if (!invite) fail('Invitation not found for your account.', 403);
    if (invite.status === status) return messages;
    if (invite.status !== 'INVITED') fail('This invitation has already been answered.', 409);
    const changed = await tx.placementInvitation.updateMany({
      where: {
        id: invite.id,
        status: 'INVITED'
      },
      data: {
        status,
        respondedAt: new Date()
      }
    });
    if (!changed.count) fail('Invitation already answered.', 409);
    if (status === 'ACCEPTED') {
      drive.communityId = await ensureDriveCommunity(tx, drive);
      if (drive.communityId) await tx.communityMember.upsert({
        where: {
          communityId_userId: {
            communityId: drive.communityId,
            userId: alumniId
          }
        },
        update: {
          status: 'ACTIVE',
          role: 'MODERATOR'
        },
        create: {
          communityId: drive.communityId,
          userId: alumniId,
          role: 'MODERATOR'
        }
      });
      const admins = await tx.user.findMany({
        where: {
          role: 'ADMIN'
        },
        select: {
          id: true
        }
      });
      for (const a of admins) messages.push(await tx.notification.create({
        data: {
          userId: a.id,
          type: 'SYSTEM',
          title: 'Alumni accepted guidance invitation',
          message: `An alumnus accepted the ${drive.companyName} invitation.`,
          data: {
            driveId,
            alumniId
          }
        }
      }));
    }
    return messages;
  });
  for (const n of notifications) emitToUser(n.userId, 'notification:new', n);
  if (status === 'ACCEPTED' && notifications.length) await acceptanceEmails(driveId, alumniId);
  await notifyAdmins('company_connect:alumni_accepted', {
    driveId
  });
  emitToUser(alumniId, 'company_connect:invite_updated', {
    driveId
  });
  return {
    success: true,
    status,
    drive: await getDriveById(driveId, {
      role: 'ALUMNI',
      userId: alumniId
    })
  };
}
async function broadcastToStudents({
  driveId
}) {
  const studentAccounts = await prisma.user.findMany({
    where: {
      role: 'STUDENT'
    },
    select: {
      id: true,
      firstName: true,
      email: true,
      studentProfile: true
    }
  });
  const criteria = await requireOpen(driveId);
  const students = studentAccounts.filter(student => eligibility(criteria, student.studentProfile).isEligible);
  const drive = await prisma.$transaction(async tx => {
    const d = await lockOpen(driveId, tx);
    if (!d.invitations.some(i => i.status === 'ACCEPTED')) fail('At least one alumni mentor must accept first.', 409);
    if (d.broadcastAt) return null;
    if (!students.length) fail('No student profiles meet this drive’s CGPA, branch and year criteria.', 409);
    const claimed = await tx.placementDrive.updateMany({
      where: {
        id: driveId,
        broadcastAt: null,
        status: {
          not: 'CLOSED'
        }
      },
      data: {
        status: 'STUDENTS_NOTIFIED',
        broadcastAt: new Date()
      }
    });
    if (!claimed.count) return null;
    const notifications = [];
    for (const student of students) {
      await tx.placementBroadcast.create({
        data: {
          driveId,
          studentId: student.id
        }
      });
      notifications.push(await tx.notification.create({
        data: {
          userId: student.id,
          type: 'SYSTEM',
          title: `${d.companyName} placement announcement`,
          message: 'Review the drive criteria and register from Placement Drives.',
          data: {
            driveId
          }
        }
      }));
    }
    return {
      ...d,
      notifications
    };
  }, {
    timeout: 20000
  });
  if (!drive) return {
    success: true,
    alreadyNotified: true,
    notifiedCount: 0,
    drive: await getDriveById(driveId, adminView)
  };
  for (const notification of drive.notifications) {
    emitToUser(notification.userId, 'notification:new', notification);
    emitToUser(notification.userId, 'company_connect:students_notified', {
      driveId
    });
  }
  const delivery = [];
  for (const student of students) {
    const status = await deliver(student, drive, 'student');
    await prisma.placementBroadcast.update({
      where: {
        driveId_studentId: {
          driveId,
          studentId: student.id
        }
      },
      data: {
        delivery: status
      }
    });
    delivery.push(status);
    emitToUser(student.id, 'company_connect:students_notified', {
      driveId
    });
  }
  await notifyAdmins('company_connect:students_notified', {
    driveId,
    studentCount: students.length
  });
  return {
    success: true,
    notifiedCount: students.length,
    delivery,
    drive: await getDriveById(driveId, adminView)
  };
}
async function registerStudentForDrive({
  driveId,
  studentUserId,
  formDetails = {}
}) {
  const rollNumber = requiredText(formDetails.rollNumber, 'Roll number', 60);
  const result = await prisma.$transaction(async tx => {
    let drive = await lockOpen(driveId, tx);
    if (!drive.broadcastAt) fail('Registration has not opened.', 409);
    const student = await tx.user.findUnique({
      where: {
        id: studentUserId
      },
      include: {
        studentProfile: true
      }
    });
    if (!student || student.role !== 'STUDENT') fail('Student account required.', 403);
    const checked = eligibility(drive, student.studentProfile);
    // Lock this drive against concurrent community creation and closure.
    const claimed = await tx.placementDrive.updateMany({
      where: {
        id: driveId,
        status: 'STUDENTS_NOTIFIED'
      },
      data: {
        updatedAt: new Date()
      }
    });
    if (!claimed.count) fail('Drive is no longer open.', 409);
    drive = await requireDrive(driveId, tx);
    const existing = await tx.placementRegistration.findUnique({
      where: {
        driveId_studentId: {
          driveId,
          studentId: studentUserId
        }
      }
    });
    if (existing) return {
      registration: existing,
      communityId: existing.isEligible ? drive.communityId : null
    };
    let communityId = drive.communityId;
    if (checked.isEligible) {
      communityId = await ensureDriveCommunity(tx, drive);
      await tx.communityMember.upsert({
        where: {
          communityId_userId: {
            communityId,
            userId: studentUserId
          }
        },
        update: {
          status: 'ACTIVE'
        },
        create: {
          communityId,
          userId: studentUserId
        }
      });
      for (const i of drive.invitations.filter(i => i.status === 'ACCEPTED')) await tx.communityMember.upsert({
        where: {
          communityId_userId: {
            communityId,
            userId: i.alumniId
          }
        },
        update: {
          status: 'ACTIVE',
          role: 'MODERATOR'
        },
        create: {
          communityId,
          userId: i.alumniId,
          role: 'MODERATOR'
        }
      });
    }
    const registration = await tx.placementRegistration.create({
      data: {
        driveId,
        studentId: studentUserId,
        rollNumber,
        ...checked,
        status: checked.isEligible ? 'ENROLLED' : 'REJECTED_CRITERIA'
      }
    });
    return {
      registration,
      communityId: checked.isEligible ? communityId : null
    };
  }, {
    timeout: 20000
  });
  await notifyAdmins('company_connect:student_registered', {
    driveId
  });
  return {
    success: true,
    ...result,
    isEligible: result.registration.isEligible,
    drive: await getDriveById(driveId, {
      role: 'STUDENT',
      userId: studentUserId
    })
  };
}
module.exports = {
  retryInviteEmails,
  getSearchContext,
  respondFromEmail,
  getDrives,
  getDriveById,
  createDrive,
  closeDrive,
  searchAlumniForCompany,
  sendAlumniInvites,
  respondAlumniInvite,
  broadcastToStudents,
  registerStudentForDrive
};
