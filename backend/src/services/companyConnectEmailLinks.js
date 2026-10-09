const jwt = require('jsonwebtoken');
const {
  createHmac
} = require('crypto');
const config = require('../config/env');
const {
  fail
} = require('./companyConnectUtils');
// Separate signing key: email capabilities must never authenticate as application JWTs.
const key = () => createHmac('sha256', config.jwtSecret).update('company-connect-email-v1').digest('hex');
function signResponse(invitation, action) {
  return jwt.sign({
    invitationId: invitation.id,
    driveId: invitation.driveId,
    alumniId: invitation.alumniId,
    action
  }, key(), {
    algorithm: 'HS256',
    expiresIn: '7d',
    audience: 'placement-response',
    issuer: 'AlumniConnect'
  });
}
function verifyResponse(token) {
  if (typeof token !== 'string' || token.length > 2048) fail('Invalid invitation link.', 400);
  try {
    const data = jwt.verify(token, key(), {
      algorithms: ['HS256'],
      audience: 'placement-response',
      issuer: 'AlumniConnect'
    });
    if (!['ACCEPT', 'DECLINE'].includes(data.action) || !data.invitationId || !data.driveId || !data.alumniId) throw Error();
    return data;
  } catch {
    fail('This invitation link is invalid or expired.', 400);
  }
}
module.exports = {
  signResponse,
  verifyResponse
};
