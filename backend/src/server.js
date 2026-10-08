const http = require('http');
const app = require('./app');
const config = require('./config/env');
const seedAdmin = require('./scripts/seedAdmin');
const { initSocket } = require('./socket');

const PORT = config.port;

// Create HTTP server wrapper around Express app
const server = http.createServer(app);

// Initialize Socket.IO on the HTTP server
initSocket(server);

server.listen(PORT, async () => {
  console.log(`[AlumniConnect Backend] Server & Socket.IO running in ${config.nodeEnv} mode on port ${PORT}`);
  console.log(`[AlumniConnect Backend] Health check available at: http://localhost:${PORT}/api/health`);

  // Run idempotent admin seed
  try {
    await seedAdmin();
  } catch (err) {
    console.error('[Admin Seed Startup Error]:', err.message);
  }
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('[AlumniConnect Backend] SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('[AlumniConnect Backend] Process terminated.');
  });
});

process.on('SIGINT', () => {
  console.log('[AlumniConnect Backend] SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('[AlumniConnect Backend] Process terminated.');
  });
});
