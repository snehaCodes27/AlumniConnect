/**
 * Auth Input Validation Utilities
 */

const validateEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

const validateStudentRegistration = (data) => {
  const errors = [];
  const { firstName, lastName, email, phone, password, confirmPassword } = data || {};

  if (!firstName || typeof firstName !== 'string' || !firstName.trim()) {
    errors.push('First name is required.');
  }

  if (!lastName || typeof lastName !== 'string' || !lastName.trim()) {
    errors.push('Last name is required.');
  }

  if (!email || !validateEmail(email)) {
    errors.push('A valid email address is required.');
  }

  if (!password || typeof password !== 'string' || password.length < 8) {
    errors.push('Password must be at least 8 characters long.');
  }

  if (password !== confirmPassword) {
    errors.push('Password and confirm password do not match.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

const validateAlumniRegistration = (data) => {
  const errors = [];
  const { firstName, lastName, email, phone, password, confirmPassword } = data || {};

  if (!firstName || typeof firstName !== 'string' || !firstName.trim()) {
    errors.push('First name is required.');
  }

  if (!lastName || typeof lastName !== 'string' || !lastName.trim()) {
    errors.push('Last name is required.');
  }

  if (!email || !validateEmail(email)) {
    errors.push('A valid email address is required.');
  }

  if (!password || typeof password !== 'string' || password.length < 8) {
    errors.push('Password must be at least 8 characters long.');
  }

  if (password !== confirmPassword) {
    errors.push('Password and confirm password do not match.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

const validateLogin = (data) => {
  const errors = [];
  const { email, password } = data || {};

  if (!email || !validateEmail(email)) {
    errors.push('A valid email address is required.');
  }

  if (!password || typeof password !== 'string') {
    errors.push('Password is required.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

module.exports = {
  validateEmail,
  validateStudentRegistration,
  validateAlumniRegistration,
  validateLogin,
};
