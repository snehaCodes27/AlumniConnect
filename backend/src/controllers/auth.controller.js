const authService = require('../services/auth.service');
const {
  validateStudentRegistration,
  validateAlumniRegistration,
  validateLogin,
} = require('../validators/auth.validator');

/**
 * Handle Student Registration
 */
const registerStudent = async (req, res, next) => {
  try {
    const validation = validateStudentRegistration(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.errors.join(' '),
        errors: validation.errors,
      });
    }

    const result = await authService.registerStudent(req.body);
    return res.status(201).json({
      success: true,
      message: result.message,
      data: result.user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle Alumni Registration
 */
const registerAlumni = async (req, res, next) => {
  try {
    const validation = validateAlumniRegistration(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.errors.join(' '),
        errors: validation.errors,
      });
    }

    const result = await authService.registerAlumni(req.body);
    return res.status(201).json({
      success: true,
      message: result.message,
      data: result.user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle User Login
 */
const login = async (req, res, next) => {
  try {
    const validation = validateLogin(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.errors.join(' '),
        errors: validation.errors,
      });
    }

    const result = await authService.login(req.body);
    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        token: result.token,
        user: result.user,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Current User Profile
 */
const getCurrentUser = async (req, res, next) => {
  try {
    const user = await authService.getCurrentUser(req.user.userId);
    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle Logout
 */
const logout = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      message: 'Logout successful.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerStudent,
  registerAlumni,
  login,
  getCurrentUser,
  logout,
};
