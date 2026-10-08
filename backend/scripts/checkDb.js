const dotenv = require('dotenv');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function verifyDatabase() {
  console.log('--- AlumniConnect Database Verification ---');
  
  // 1. Verify Prisma installation
  console.log('[1] Prisma Client Installed: YES');
  
  // 2. Check DATABASE_URL in .env
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.log('[2] DATABASE_URL Configured: NO (Missing from .env)');
    return { success: false, reason: 'DATABASE_URL is missing' };
  }
  // Mask password for security
  const maskedUrl = dbUrl.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:****@');
  console.log(`[2] DATABASE_URL Configured: YES (${maskedUrl})`);
  
  // 3. Check PostgreSQL Connection
  console.log('[3] Testing PostgreSQL connection...');
  const prisma = new PrismaClient();
  
  try {
    await prisma.$connect();
    console.log('    PostgreSQL Connection: SUCCESSFUL');
    await prisma.$disconnect();
    return { success: true };
  } catch (error) {
    console.log('    PostgreSQL Connection: NOT REACHABLE');
    console.log(`    Details: ${error.message}`);
    await prisma.$disconnect();
    return { success: false, reason: error.message };
  }
}

verifyDatabase().then(() => process.exit(0));
