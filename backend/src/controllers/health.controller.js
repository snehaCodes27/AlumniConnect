/**
 * Health check controller
 * Checks service availability
 */
const getHealthStatus = (req, res) => {
  return res.status(200).json({
    success: true,
    message: "AlumniConnect backend is running"
  });
};

module.exports = {
  getHealthStatus,
};
