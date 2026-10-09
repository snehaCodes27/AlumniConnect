const service = require('../services/companyConnect.service');
const handle = operation => async (req, res, next) => {
  try {
    res.json(await operation(req));
  } catch (error) {
    next(error);
  }
};
const getDrives = handle(async req => ({
  success: true,
  drives: await service.getDrives(req.user),
  ...(req.user.role === 'ADMIN' ? {
    emailConfigured: Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS || process.env.SMTP_HOST && process.env.SMTP_PORT)
  } : {})
}));
const getDrive = handle(async req => ({
  success: true,
  drive: await service.getDriveById(req.params.id, req.user)
}));
const createDrive = handle(async req => ({
  success: true,
  drive: await service.createDrive(req.body, req.user.userId)
}));
const closeDrive = handle(async req => ({
  success: true,
  drive: await service.closeDrive(req.params.id)
}));
const searchAlumni = handle(async req => {
  const [alumni, context] = await Promise.all([service.searchAlumniForCompany(req.body.companyName), service.getSearchContext()]);
  return {
    success: true,
    searchTerm: req.body.companyName,
    alumni,
    context
  };
});
const sendInvites = handle(req => service.sendAlumniInvites(req.body));
const retryInvites = handle(req => service.retryInviteEmails(req.body));
const broadcastStudents = handle(req => service.broadcastToStudents(req.body));
const respond = handle(req => service.respondAlumniInvite({
  driveId: req.body.driveId,
  action: req.body.action,
  alumniId: req.user.userId
}));
const register = handle(req => service.registerStudentForDrive({
  driveId: req.body.driveId,
  formDetails: req.body.formDetails,
  studentUserId: req.user.userId
}));
async function emailRespond(req, res) {
  res.set({
    'Cache-Control': 'no-store',
    'Referrer-Policy': 'no-referrer'
  });
  // HEAD and declared prefetch requests do not count as a person's response.
  if (req.method !== 'GET' || /prefetch|preview/i.test(`${req.get('Purpose') || ''} ${req.get('Sec-Purpose') || ''}`)) return res.status(204).end();
  if (!req.query.token) return res.redirect(303, `${process.env.CLIENT_URL || 'http://localhost:5173'}/login`);
  try {
    await service.respondFromEmail(req.query.token);
    return res.status(204).end();
  } catch (error) {
    return res.status(error.statusCode || 500).type('text').send(error.statusCode ? error.message : 'Unable to save the response. Please retry.');
  }
}
function retired(req, res) {
  res.status(410).json({
    success: false,
    message: 'Use Create Drive and Send Invitations. Persisted drives are not reset.'
  });
}
module.exports = {
  getDrives,
  getDrive,
  createDrive,
  closeDrive,
  searchAlumni,
  sendInvites,
  retryInvites,
  broadcastStudents,
  respond,
  register,
  emailRespond,
  retired
};
