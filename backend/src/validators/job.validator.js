/**
 * Job Input Validation Utilities
 */

const validateCreateJob = (data) => {
  const errors = [];
  const { company, title, location, employmentType, workplaceType, description, deadline } = data || {};

  if (!company || typeof company !== 'string' || !company.trim()) {
    errors.push('Company name is required.');
  }

  if (!title || typeof title !== 'string' || !title.trim()) {
    errors.push('Job role / title is required.');
  }

  if (!location || typeof location !== 'string' || !location.trim()) {
    errors.push('Job location is required.');
  }

  if (!description || typeof description !== 'string' || description.trim().length < 20) {
    errors.push('Job description must be at least 20 characters long.');
  }

  const validTypes = ['FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'CONTRACT', 'REMOTE'];
  if (employmentType && !validTypes.includes(employmentType)) {
    errors.push('Employment type must be one of: FULL_TIME, PART_TIME, INTERNSHIP, CONTRACT, REMOTE.');
  }

  const validWorkplace = ['On-site', 'Remote', 'Hybrid'];
  if (workplaceType && !validWorkplace.includes(workplaceType)) {
    errors.push('Workplace type must be one of: On-site, Remote, Hybrid.');
  }

  if (deadline) {
    const deadlineDate = new Date(deadline);
    if (isNaN(deadlineDate.getTime())) {
      errors.push('Application deadline must be a valid date.');
    } else if (deadlineDate <= new Date()) {
      errors.push('Application deadline must be a future date.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

const validateUpdateJob = (data) => {
  const errors = [];
  const { employmentType, workplaceType, description, deadline, status } = data || {};

  if (description !== undefined && (typeof description !== 'string' || description.trim().length < 20)) {
    errors.push('Job description must be at least 20 characters long.');
  }

  const validTypes = ['FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'CONTRACT', 'REMOTE'];
  if (employmentType !== undefined && !validTypes.includes(employmentType)) {
    errors.push('Employment type must be one of: FULL_TIME, PART_TIME, INTERNSHIP, CONTRACT, REMOTE.');
  }

  const validWorkplace = ['On-site', 'Remote', 'Hybrid'];
  if (workplaceType !== undefined && !validWorkplace.includes(workplaceType)) {
    errors.push('Workplace type must be one of: On-site, Remote, Hybrid.');
  }

  const validStatus = ['ACTIVE', 'CLOSED', 'DRAFT'];
  if (status !== undefined && !validStatus.includes(status)) {
    errors.push('Status must be one of: ACTIVE, CLOSED, DRAFT.');
  }

  if (deadline) {
    const deadlineDate = new Date(deadline);
    if (isNaN(deadlineDate.getTime())) {
      errors.push('Application deadline must be a valid date.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

const validateApplyJob = (data) => {
  const errors = [];
  const { coverLetter } = data || {};

  if (coverLetter && typeof coverLetter === 'string' && coverLetter.trim().length > 3000) {
    errors.push('Cover letter must be under 3000 characters.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

const validateUpdateApplicationStatus = (data) => {
  const errors = [];
  const { status } = data || {};

  const validStatus = ['PENDING', 'REVIEWING', 'SHORTLISTED', 'INTERVIEW', 'SELECTED', 'REJECTED'];
  if (!status || !validStatus.includes(status)) {
    errors.push('Valid application status is required (REVIEWING, SHORTLISTED, INTERVIEW, SELECTED, REJECTED).');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

module.exports = {
  validateCreateJob,
  validateUpdateJob,
  validateApplyJob,
  validateUpdateApplicationStatus,
};
