const express = require('express');
const prisma = require('../config/prisma');
const { authenticateToken, authorizeRoles } = require('../middleware/auth.middleware');
const {
  getDrives,
  getDriveById,
  searchAlumniForCompany,
  searchAndInviteAlumni,
  sendAlumniInvites,
  respondAlumniInvite,
  broadcastToStudents,
  registerStudentForDrive,
  createDrive,
  resetDriveState,
} = require('../services/companyConnect.service');

const { sendEmail } = require('../services/email.service');

const router = express.Router();

// ─── ADMIN ROUTES ──────────────────────────────────────────────────────────

// POST /api/company-connect/reset - Reset drive state for fresh demo
router.post('/reset', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const result = resetDriveState(req.body?.driveId);
    res.json({ success: true, message: 'Drive state reset.', drive: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/company-connect/test-email - Admin tests if email works
router.post('/test-email', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    const toEmail = req.body?.to || adminUser?.email || process.env.EMAIL_USER;
    const result = await sendEmail({
      to: toEmail,
      subject: '✅ AlumniConnect Email Test — Working!',
      html: `<div style="font-family:sans-serif;padding:24px;max-width:500px;margin:auto;background:#f0fdf4;border-radius:12px;border:1px solid #bbf7d0;">
        <h2 style="color:#15803d;margin:0 0 12px;">✅ Email is Working!</h2>
        <p style="color:#1e293b;">This is a test email from <strong>AlumniConnect Placement Cell</strong>.</p>
        <p style="color:#64748b;font-size:13px;">If you received this, email sending is configured correctly. Alumni invitation emails will be delivered to their inboxes.</p>
        <p style="color:#64748b;font-size:12px;margin-top:16px;">Sent at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
      </div>`,
    });
    if (result.success) {
      res.json({ success: true, message: `Test email sent to ${toEmail}! Check inbox (and Spam folder).`, messageId: result.messageId });
    } else {
      res.status(500).json({ success: false, error: result.error || result.message });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/company-connect/drives - Get all placement drives
router.get('/drives', authenticateToken, async (req, res) => {
  try {
    const drives = await getDrives();
    res.json({ success: true, drives });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/company-connect/drives/:id - Get single drive
router.get('/drives/:id', authenticateToken, async (req, res) => {
  try {
    const drive = await getDriveById(req.params.id);
    res.json({ success: true, drive });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/company-connect/drives - Admin creates new drive
router.post('/drives', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const drive = await createDrive(req.body);
    res.json({ success: true, drive });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/company-connect/search-alumni - AI search for matching alumni
router.post('/search-alumni', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const { companyName, prompt } = req.body;
    // Extract company name from prompt if not provided directly
    const searchTerm = companyName || extractCompanyFromPrompt(prompt || '');
    const alumni = await searchAlumniForCompany(searchTerm);
    res.json({ success: true, alumni, searchTerm });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/company-connect/search-invite - 1-Click: search alumni + create drive + send email invites
router.post('/search-invite', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const { companyName, driveDate, minCgpa, alumniIds } = req.body;
    if (!companyName) {
      return res.status(400).json({ success: false, error: 'companyName is required' });
    }
    const result = await searchAndInviteAlumni({ companyName, driveDate, minCgpa, alumniIds });
    if (result.success === false) {
      return res.status(404).json(result);
    }
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/company-connect/send-invites - Send invites to alumni
router.post('/send-invites', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const { driveId, alumniIds } = req.body;
    const result = await sendAlumniInvites({ driveId, alumniIds });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/company-connect/broadcast-students - Notify all students
router.post('/broadcast-students', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const { driveId } = req.body;
    const result = await broadcastToStudents({ driveId });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── ALUMNI ROUTES ──────────────────────────────────────────────────────────

// POST /api/company-connect/respond - Alumni responds to invite from dashboard
router.post('/respond', authenticateToken, authorizeRoles('ALUMNI'), async (req, res) => {
  try {
    const { driveId, action } = req.body;
    if (!driveId) {
      return res.status(400).json({ success: false, error: 'driveId is required' });
    }
    const result = await respondAlumniInvite({
      driveId,
      alumniId: req.user.userId || req.user.id,
      action,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/company-connect/email-respond - 1-Click Alumni Response (Silent — no landing page)
router.get('/email-respond', async (req, res) => {
  try {
    const { driveId, alumniId, action = 'ACCEPT' } = req.query;
    if (!driveId || !alumniId) {
      return res.status(204).end();
    }

    // Process silently in background
    await respondAlumniInvite({
      driveId,
      alumniId,
      action: action.toUpperCase(),
    });

    // Return a blank page that auto-closes — alumni sees NOTHING, no UI, no redirect
    res.setHeader('Content-Type', 'text/html');
    return res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title></title><script>window.onload=function(){setTimeout(function(){window.close();if(!window.closed){document.body.innerHTML='';document.title='';}},600);};</script><style>body{margin:0;padding:0;background:#fff;}</style></head><body></body></html>`);
  } catch (err) {
    console.error('[Email Respond Error]:', err);
    // Even on error — close silently
    res.setHeader('Content-Type', 'text/html');
    return res.send(`<!DOCTYPE html><html><head><title></title><script>window.onload=function(){setTimeout(function(){window.close();},400);};</script></head><body></body></html>`);
  }
});

// ─── STUDENT ROUTES ──────────────────────────────────────────────────────────

// POST /api/company-connect/register - Student registers for drive
router.post('/register', authenticateToken, authorizeRoles('STUDENT'), async (req, res) => {
  try {
    const { driveId, formDetails } = req.body;
    if (!driveId) {
      return res.status(400).json({ success: false, error: 'driveId is required' });
    }
    const result = await registerStudentForDrive({
      driveId,
      studentUserId: req.user.userId || req.user.id,
      formDetails: formDetails || {},
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── HELPER FUNCTIONS ──────────────────────────────────────────────────────

function extractCompanyFromPrompt(prompt) {
  // Simple extraction - look for company names after keywords
  const patterns = [
    /find alumni.*?(?:in|at|from|working at|who work(?:s)? (?:in|at|for))\s+(.+?)(?:\s+and|\s+or|$)/i,
    /alumni.*?(?:in|at|from)\s+(.+?)(?:\s|$)/i,
    /(?:search|find|get)\s+(.+?)\s+alumni/i,
  ];
  for (const pattern of patterns) {
    const match = prompt.match(pattern);
    if (match) return match[1].trim();
  }
  // Fallback: extract capitalized words as company name
  const words = prompt.match(/[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*/g);
  return words ? words[0] : prompt;
}

module.exports = router;
