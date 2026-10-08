const { PrismaClient } = require('@prisma/client');

// Global PrismaClient instance for use across the application
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

module.exports = prisma;
