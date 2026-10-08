const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const config = require('../config/env');

/**
 * Idempotent Admin Seed Script
 * Creates default Admin user if ADMIN_EMAIL does not already exist in the database.
 */
async function seedAdmin() {
  try {
    const adminEmail = config.adminEmail;
    const adminPassword = config.adminPassword;

    if (!adminEmail || !adminPassword) {
      console.warn('[Admin Seed] ADMIN_EMAIL or ADMIN_PASSWORD not defined in environment variables. Skipping admin seed.');
      return;
    }

    const normalizedEmail = adminEmail.trim().toLowerCase();

    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingAdmin) {
      console.log(`[Admin Seed] Admin user '${normalizedEmail}' already exists. Skipping creation.`);
      return;
    }

    // Hash admin password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(adminPassword, saltRounds);

    // Create admin user
    const newAdmin = await prisma.user.create({
      data: {
        firstName: 'System',
        lastName: 'Admin',
        email: normalizedEmail,
        passwordHash,
        role: 'ADMIN',
        isApproved: true,
        isVerified: true,
      },
    });

    console.log(`[Admin Seed] Admin user '${newAdmin.email}' created successfully.`);
  } catch (error) {
    console.error('[Admin Seed Error]:', error.message);
  }
}

// Allow direct CLI execution if invoked directly
if (require.main === module) {
  seedAdmin().then(() => {
    prisma.$disconnect();
    process.exit(0);
  });
}

module.exports = seedAdmin;
