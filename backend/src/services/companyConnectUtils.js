function fail(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}
function requiredText(value, label, max = 160) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) fail(`${label} is required (maximum ${max} characters).`);
  return value.trim();
}
function safeUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (['http:', 'https:'].includes(url.protocol)) return url.href;
  } catch {}
  fail('Provide a valid HTTP(S) meeting link.');
}
function validateDrive(input, now = new Date()) {
  const companyName = requiredText(input.companyName, 'Company name', 100);
  const driveDate = new Date(input.driveDate);
  if (!input.driveDate || !Number.isFinite(driveDate.getTime()) || driveDate.getTime() < new Date(now.toISOString().slice(0, 10)).getTime()) fail('Choose a current or future drive date.');
  const minCgpa = Number(input.minCgpa ?? 0);
  if (!Number.isFinite(minCgpa) || minCgpa < 0 || minCgpa > 10) fail('CGPA cutoff must be between 0 and 10.');
  const eligibleBranches = input.eligibleBranches ?? [];
  if (!Array.isArray(eligibleBranches) || eligibleBranches.length > 30 || eligibleBranches.some(b => typeof b !== 'string' || !b.trim() || b.length > 100)) fail('Invalid eligible branches.');
  const eligibleYears = input.eligibleYears ?? [];
  if (!Array.isArray(eligibleYears) || eligibleYears.some(y => !Number.isInteger(y) || y < 1 || y > 6)) fail('Eligible study years must be integers from 1 to 6.');
  return {
    companyName,
    driveDate,
    minCgpa,
    eligibleBranches: [...new Set(eligibleBranches.map(b => b.trim()))],
    eligibleYears: [...new Set(eligibleYears)],
    webinarLink: safeUrl(input.webinarLink)
  };
}
function eligibility(drive, profile) {
  const cgpa = profile?.cgpa == null ? null : Number(profile.cgpa),
    branch = profile?.branch?.trim() || null,
    currentYear = profile?.currentYear ?? null;
  const cgpaOk = cgpa !== null && Number.isFinite(cgpa) && cgpa >= 0 && cgpa <= 10 && cgpa >= Number(drive.minCgpa);
  const branchOk = !drive.eligibleBranches.length || !!branch && drive.eligibleBranches.some(b => b.trim().toLowerCase() === branch.toLowerCase());
  const yearOk = !drive.eligibleYears.length || drive.eligibleYears.includes(currentYear);
  return {
    cgpa,
    branch,
    currentYear,
    isEligible: cgpaOk && branchOk && yearOk,
    eligibilityReasons: [cgpa === null ? 'CGPA missing from profile' : `CGPA ${cgpa} / cutoff ${drive.minCgpa}: ${cgpaOk ? 'satisfied' : 'not satisfied'}`, branchOk ? 'Branch criterion satisfied' : 'Branch missing or not eligible', yearOk ? 'Study-year criterion satisfied' : 'Study year missing or not eligible']
  };
}
function viewDrive(drive, user, usersById = new Map()) {
  const invited = drive.invitations.map(i => {
    const u = usersById.get(i.alumniId);
    return {
      ...i,
      name: u ? `${u.firstName} ${u.lastName}` : 'Alumni',
      company: u?.alumniProfile?.currentCompany || null,
      ...(user.role === 'ADMIN' ? {
        email: u?.email
      } : {})
    };
  });
  const registered = drive.registrations.map(r => {
    const u = usersById.get(r.studentId);
    return {
      ...r,
      name: u ? `${u.firstName} ${u.lastName}` : 'Student',
      ...(user.role === 'ADMIN' ? {
        email: u?.email
      } : {})
    };
  });
  return {
    ...drive,
    driveDate: drive.driveDate.toISOString().slice(0, 10),
    minCgpa: Number(drive.minCgpa),
    announcementTime: drive.createdAt,
    invitations: undefined,
    registrations: undefined,
    broadcasts: undefined,
    invitedAlumni: user.role === 'ADMIN' ? invited : invited.filter(i => i.alumniId === user.userId),
    acceptedAlumni: invited.filter(i => i.status === 'ACCEPTED').map(({
      alumniId,
      name,
      company
    }) => ({
      alumniId,
      name,
      company
    })),
    registeredStudents: user.role === 'ADMIN' ? registered : registered.filter(r => r.studentId === user.userId),
    webinarLink: user.role === 'ADMIN' || invited.some(i => i.alumniId === user.userId && i.status === 'ACCEPTED') || registered.some(r => r.studentId === user.userId && r.isEligible) ? drive.webinarLink : null,
    communityId: user.role === 'ADMIN' || invited.some(i => i.alumniId === user.userId && i.status === 'ACCEPTED') || registered.some(r => r.studentId === user.userId && r.isEligible) ? drive.communityId : null
  };
}
module.exports = {
  fail,
  requiredText,
  safeUrl,
  validateDrive,
  eligibility,
  viewDrive
};
