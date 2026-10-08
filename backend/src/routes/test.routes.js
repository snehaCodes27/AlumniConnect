const express = require('express');
const { authenticateToken } = require('../middleware/auth.middleware');
const { sendWhatsAppMessage, sendSMS, isConfigured } = require('../services/twilio.service');

const router = express.Router();

/**
 * POST /api/test/sms
 * Protected test endpoint to verify Twilio SMS dispatch.
 * Accepts { phone / to, message / body }
 */
router.post('/sms', authenticateToken, async (req, res, next) => {
  try {
    const { phone, to, message, body } = req.body;
    const recipient = phone || to;
    const messageContent = message || body;

    if (!recipient) {
      return res.status(400).json({
        success: false,
        message: 'Recipient phone number is required (field: "phone" or "to").',
      });
    }

    if (!messageContent) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required (field: "message" or "body").',
      });
    }

    const result = await sendSMS({
      to: recipient,
      body: messageContent,
    });

    return res.status(200).json({
      success: true,
      message: 'Twilio SMS sent successfully.',
      data: {
        sid: result.sid,
        status: result.status,
        to: result.to,
        from: result.from,
        dateCreated: result.dateCreated,
      },
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to dispatch SMS message.',
      code: error.code || null,
    });
  }
});

/**
 * POST /api/test/whatsapp
 * Temporary protected test endpoint to verify Twilio WhatsApp integration.
 * Accepts { phone / to, message / body }
 */
router.post('/whatsapp', authenticateToken, async (req, res, next) => {
  try {
    const { phone, to, message, body, contentSid, contentVariables } = req.body;
    const recipient = phone || to;
    const messageContent = message || body;

    if (!recipient) {
      return res.status(400).json({
        success: false,
        message: 'Recipient phone number is required (field: "phone" or "to").',
      });
    }

    if (!messageContent && !contentSid) {
      return res.status(400).json({
        success: false,
        message: 'Message content or contentSid is required.',
      });
    }

    if (!isConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Twilio WhatsApp service is not configured.',
      });
    }

    const result = await sendWhatsAppMessage({
      to: recipient,
      body: messageContent,
      contentSid,
      contentVariables,
    });

    return res.status(200).json({
      success: true,
      message: 'Twilio WhatsApp message sent successfully.',
      data: {
        sid: result.sid,
        status: result.status,
        to: result.to,
        from: result.from,
        dateCreated: result.dateCreated,
      },
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to dispatch WhatsApp message.',
      code: error.code || null,
    });
  }
});

module.exports = router;
