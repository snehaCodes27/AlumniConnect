const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || 'alumniconnect_super_secret_jwt_key_2026_dev',
  adminEmail: process.env.ADMIN_EMAIL || 'admin@alumniconnect.com',
  adminPassword: process.env.ADMIN_PASSWORD || 'AdminPass123!',
  aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    whatsappFrom: process.env.TWILIO_WHATSAPP_FROM,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_WHATSAPP_FROM?.replace('whatsapp:', ''),
  },
  textbee: {
    apiKey: process.env.TEXTBEE_API_KEY,
    deviceId: process.env.TEXTBEE_DEVICE_ID,
  },
  email: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
};
