/**
 * Alumni Profile Input Validation Utilities
 */

const validateAlumniOnboarding = (data) => {
  const errors = [];

  if (!data.fullName || !data.fullName.trim()) {
    errors.push('Full name is required.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

const validatePreviousCompany = (entry) => {
  const errors = [];

  if (!entry.companyName || !entry.companyName.trim()) {
    errors.push('Company name is required.');
  }

  return errors;
};

const validatePreviousCompanies = (companies) => {
  const errors = [];

  if (Array.isArray(companies)) {
    companies.forEach((entry, idx) => {
      const entryErrors = validatePreviousCompany(entry);
      if (entryErrors.length > 0) {
        errors.push(`Previous company #${idx + 1}: ${entryErrors.join(' ')}`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

module.exports = {
  validateAlumniOnboarding,
  validatePreviousCompany,
  validatePreviousCompanies,
};
