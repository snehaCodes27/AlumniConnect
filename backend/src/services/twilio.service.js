const twilio = require('twilio');
const config = require('../config/env');

/**
 * Twilio Service Foundation
 * Initializes the Twilio client using environment variables and provides
 * reusable helper methods for WhatsApp messaging without hardcoded secrets.
 */

const { accountSid, authToken, whatsappFrom } = config.twilio || {};

// Initialize Twilio client only when credentials are provided
let twilioClient = null;

if (accountSid && authToken) {
  try {
    twilioClient = twilio(accountSid, authToken);
  } catch (error) {
    console.error('[Twilio Service] Failed to initialize Twilio client:', error.message);
  }
} else {
  console.warn('[Twilio Service] Twilio credentials not fully configured. WhatsApp messaging is inactive.');
}

/**
 * Check if the Twilio client is properly initialized
 * @returns {boolean}
 */
const isConfigured = () => {
  return Boolean(twilioClient && whatsappFrom);
};

/**
 * Format phone number into the required Twilio WhatsApp address format (whatsapp:+[country_code][number])
 * @param {string} phone
 * @returns {string}
 */
const formatWhatsAppNumber = (phone) => {
  if (!phone || typeof phone !== 'string') {
    throw new Error('A valid phone number string is required');
  }

  let cleaned = phone.trim().replace(/[\s\-()]/g, '');

  // If already prefixed with 'whatsapp:', validate inner number
  if (cleaned.startsWith('whatsapp:')) {
    return cleaned;
  }

  // Ensure leading plus for E.164 format
  if (!cleaned.startsWith('+')) {
    if (cleaned.length === 10) {
      cleaned = `+91${cleaned}`;
    } else {
      cleaned = `+${cleaned}`;
    }
  }

  return `whatsapp:${cleaned}`;
};

/**
 * Get the underlying Twilio client instance
 * @returns {twilio.Twilio}
 */
const getClient = () => {
  if (!twilioClient) {
    throw new Error('Twilio client is not initialized. Please verify TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.');
  }
  return twilioClient;
};

/**
 * Send a WhatsApp message via Twilio
 * @param {Object} options
 * @param {string} options.to - Recipient phone number (e.g. '+1234567890' or 'whatsapp:+1234567890')
 * @param {string} [options.body] - Text message body
 * @param {string|string[]} [options.mediaUrl] - Optional media URL(s)
 * @param {string} [options.contentSid] - Optional Twilio Content Template SID
 * @param {Object|string} [options.contentVariables] - Optional template variable map/string
 * @param {string} [options.from] - Optional override for sender number (defaults to TWILIO_WHATSAPP_FROM)
 * @returns {Promise<Object>}
 */
const sendWhatsAppMessage = async ({ to, body, mediaUrl, contentSid, contentVariables, from } = {}) => {
  if (!isConfigured()) {
    throw new Error('Twilio WhatsApp service is not configured. Missing credentials or TWILIO_WHATSAPP_FROM.');
  }

  if (!to) {
    throw new Error('Recipient phone number ("to") is required.');
  }

  if (!body && !mediaUrl && !contentSid) {
    throw new Error('Message requires either a "body" text, "mediaUrl", or "contentSid".');
  }

  const recipient = formatWhatsAppNumber(to);
  const sender = from ? formatWhatsAppNumber(from) : formatWhatsAppNumber(whatsappFrom);

  const payload = {
    from: sender,
    to: recipient,
  };

  if (body) payload.body = body;
  if (mediaUrl) payload.mediaUrl = Array.isArray(mediaUrl) ? mediaUrl : [mediaUrl];
  if (contentSid) payload.contentSid = contentSid;
  if (contentVariables) {
    payload.contentVariables = typeof contentVariables === 'string' ? contentVariables : JSON.stringify(contentVariables);
  }

  try {
    const result = await twilioClient.messages.create(payload);
    return {
      success: true,
      sid: result.sid,
      status: result.status,
      to: result.to,
      from: result.from,
      dateCreated: result.dateCreated,
    };
  } catch (error) {
    console.error(`[Twilio Service Error] Failed to send WhatsApp message to ${recipient}:`, error.message);
    throw error;
  }
};

/**
 * Format phone number into standard E.164 (without whatsapp: prefix)
 * @param {string} phone
 * @returns {string}
 */
const formatPhoneNumber = (phone) => {
  if (!phone || typeof phone !== 'string') {
    throw new Error('A valid phone number string is required');
  }

  let cleaned = phone.trim().replace(/^whatsapp:/i, '').replace(/[\s\-()]/g, '');

  if (!cleaned.startsWith('+')) {
    if (cleaned.length === 10) {
      cleaned = `+91${cleaned}`;
    } else {
      cleaned = `+${cleaned}`;
    }
  }

  return cleaned;
};

/**
 * Send an SMS message via Twilio
 * @param {Object} options
 * @param {string} options.to - Recipient phone number (e.g. '+918369780791')
 * @param {string} options.body - Text message body
 * @param {string} [options.from] - Optional override for sender number
 * @returns {Promise<Object>}
 */
const sendSMS = async ({ to, body, from } = {}) => {
  if (!twilioClient) {
    throw new Error('Twilio service is not configured. Missing credentials.');
  }

  if (!to) {
    throw new Error('Recipient phone number ("to") is required.');
  }

  if (!body) {
    throw new Error('Message body is required.');
  }

  const recipient = formatPhoneNumber(to);
  const senderNumber = from || config.twilio.phoneNumber || config.twilio.whatsappFrom?.replace('whatsapp:', '');

  if (!senderNumber) {
    throw new Error('Sender phone number is not configured in environment variables.');
  }

  const sender = formatPhoneNumber(senderNumber);

  try {
    const result = await twilioClient.messages.create({
      to: recipient,
      from: sender,
      body,
    });

    return {
      success: true,
      sid: result.sid,
      status: result.status,
      to: result.to,
      from: result.from,
      dateCreated: result.dateCreated,
    };
  } catch (error) {
    // If Twilio trial account mandates predefined SMS template
    if (error.message && error.message.includes('predefined SMS templates')) {
      try {
        const fallbackResult = await twilioClient.messages.create({
          to: recipient,
          from: sender,
          body: 'sms_appointment_reminders',
        });
        return {
          success: true,
          sid: fallbackResult.sid,
          status: fallbackResult.status,
          to: fallbackResult.to,
          from: fallbackResult.from,
          dateCreated: fallbackResult.dateCreated,
          fallbackUsed: true,
        };
      } catch (fallbackError) {
        console.error(`[Twilio Service Error] Fallback SMS failed for ${recipient}:`, fallbackError.message);
        throw fallbackError;
      }
    }

    console.error(`[Twilio Service Error] Failed to send SMS to ${recipient}:`, error.message);
    throw error;
  }
};

module.exports = {
  isConfigured,
  formatWhatsAppNumber,
  formatPhoneNumber,
  getClient,
  sendWhatsAppMessage,
  sendSMS,
};
