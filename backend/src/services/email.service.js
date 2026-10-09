const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (user && pass) {
    return nodemailer.createTransport({
      service: 'gmail',
      connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
      auth: {
        user: user.trim(),
        pass: pass.trim().replace(/\s+/g, ''), // Google app passwords often have spaces
      },
    });
  }

  // Fallback to SMTP config if provided
  if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
      port: parseInt(process.env.SMTP_PORT, 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  return null;
}

/**
 * Send an email with HTML template
 * @param {Object} options - { to, subject, html, text }
 */
async function sendEmail({ to, subject, html, text, replyTo }) {
  try {
    const transport = getTransporter();
    const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'alumniconnect.system@gmail.com';

    if (!transport) {
      console.warn(`[Email Service Notice] EMAIL_USER and EMAIL_PASS (App Password) are not yet configured in backend/.env. Mail to <${to}> was simulated: "${subject}"`);
      return { success: false, simulated: true, message: 'EMAIL_USER and EMAIL_PASS not set in .env' };
    }

    const info = await transport.sendMail({
      from: `"AlumniConnect Placement Cell" <${fromAddress}>`,
      to,
      subject,
      ...(replyTo ? { replyTo } : {}),
      text: text || html.replace(/<[^>]+>/g, ''),
      html,
    });

    console.log(`[Email Sent] Message sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[Email Error] Failed to send email to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Template for Alumni Placement Guidance Request
 */
function getAlumniPlacementInviteHtml({ alumniName, companyName, driveDate, webinarLink, dashboardLink, acceptUrl, declineUrl }) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f6fb; margin: 0; padding: 20px; color: #1e293b; }
      .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
      .header { background: linear-gradient(135deg, #1e1b4b 0%, #4338ca 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
      .badge { display: inline-block; background: #10b981; color: #ffffff; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.05em; }
      .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
      .content { padding: 32px 28px; line-height: 1.6; font-size: 15px; }
      .highlight-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 18px 20px; margin: 24px 0; }
      .highlight-box strong { color: #15803d; }
      .cta-btn { display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 15px; text-align: center; margin: 16px 0; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.4); }
      .footer { background: #f8fafc; padding: 20px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <span class="badge">Placement Guidance Request</span>
        <h1>Upcoming ${companyName} Placement Drive</h1>
      </div>
      <div class="content">
        <p>Dear <strong>${alumniName}</strong>,</p>
        <p>Greetings from your Alma Mater!</p>
        
        <div class="highlight-box">
          <p style="margin: 0 0 8px 0;">🏢 <strong>Company:</strong> ${companyName}</p>
          <p style="margin: 0 0 8px 0;">📅 <strong>Drive Date:</strong> ${driveDate}</p>
          <p style="margin: 0;">🎓 <strong>Target:</strong> Final & Pre-Final Year Engineering Students</p>
        </div>

        <p>
          In our college, on <strong>${driveDate}</strong>, <strong>${companyName}</strong> placement drive has been arranged. Since you are successfully working at / experienced with <strong>${companyName}</strong>, the Placement Cell and College Admin would like to request your mentorship.
        </p>

        <p>
          <strong>Can you please guide your juniors for this drive?</strong> Your insights regarding the interview rounds, technical expectations, and company culture will make a massive impact on their careers.
        </p>

        <div style="text-align: center; margin: 30px 0 16px;">
          <a href="${acceptUrl || dashboardLink || 'http://localhost:5173/alumni/dashboard'}" class="cta-btn" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
            ✅ Accept & Guide Juniors (1-Click)
          </a>
        </div>

        ${declineUrl ? `
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${declineUrl}" style="color: #64748b; font-size: 13px; text-decoration: underline;">
            Not available to mentor (Decline)
          </a>
        </div>
        ` : ''}

        <p style="font-size: 13px; color: #64748b; text-align: center;">
          ⚡ No login or dashboard navigation required — clicking Accept records your response automatically and notifies the Admin instantly.
        </p>
      </div>
      <div class="footer">
        <p>AlumniConnect Platform · College Placement Cell & Career Development Centre</p>
      </div>
    </div>
  </body>
  </html>
  `;
}

/**
 * Template for Student Placement Broadcast
 */
function getStudentPlacementBroadcastHtml({ studentName, companyName, driveDate, mentorNames, webinarLink, registrationLink }) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f6fb; margin: 0; padding: 20px; color: #1e293b; }
      .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
      .header { background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
      .badge { display: inline-block; background: #ef4444; color: #ffffff; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 12px; }
      .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
      .content { padding: 32px 28px; line-height: 1.6; font-size: 15px; }
      .info-box { background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 12px; padding: 18px 20px; margin: 24px 0; }
      .cta-btn { display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 15px; text-align: center; margin: 16px 0; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4); }
      .footer { background: #f8fafc; padding: 20px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <span class="badge">Placement Drive Announcement</span>
        <h1>${companyName} Placement Drive</h1>
      </div>
      <div class="content">
        <p>Dear <strong>${studentName}</strong>,</p>
        <p>We are delighted to announce that <strong>${companyName}</strong> placement drive is arranged in our college on <strong>${driveDate}</strong>.</p>
        
        <div class="info-box">
          <p style="margin: 0 0 8px 0;">🏢 <strong>Company:</strong> ${companyName}</p>
          <p style="margin: 0 0 8px 0;">📅 <strong>Drive Date:</strong> ${driveDate}</p>
          <p style="margin: 0 0 8px 0;">👥 <strong>Alumni Mentors Ready to Guide You:</strong> ${mentorNames}</p>
          <p style="margin: 0;">🎥 <strong>Live Preparation Webinar:</strong> <a href="${webinarLink}">${webinarLink}</a></p>
        </div>

        <p>
          Our esteemed alumni working at ${companyName} (${mentorNames}) have officially agreed to guide and mentor eligible students for this drive!
        </p>

        <p>
          If you are interested and meet the eligibility criteria (CGPA ≥ 6.0), please fill out the registration form immediately:
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${registrationLink || 'http://localhost:5173/student/placement'}" class="cta-btn">
            📝 Register & Check Eligibility Now
          </a>
        </div>
      </div>
      <div class="footer">
        <p>AlumniConnect Platform · Training & Placement Cell</p>
      </div>
    </div>
  </body>
  </html>
  `;
}

module.exports = {
  sendEmail,
  getAlumniPlacementInviteHtml,
  getStudentPlacementBroadcastHtml,
};
