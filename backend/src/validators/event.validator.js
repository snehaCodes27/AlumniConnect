/**
 * Event Validator
 * Pure JS functions for validating Event creation, editing, and registration data.
 */

const EVENT_TYPES = ['WEBINAR', 'WORKSHOP', 'NETWORKING', 'SEMINAR', 'PANEL_DISCUSSION'];
const EVENT_STATUSES = ['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED'];

/**
 * Validate Event Creation Data
 */
function validateCreateEvent(data) {
  const errors = [];

  if (!data.title || typeof data.title !== 'string' || !data.title.trim()) {
    errors.push('Event title is required.');
  }

  if (!data.description || typeof data.description !== 'string' || !data.description.trim()) {
    errors.push('Event description is required.');
  }

  if (data.type && !EVENT_TYPES.includes(data.type)) {
    errors.push(`Invalid event type. Must be one of: ${EVENT_TYPES.join(', ')}`);
  }

  if (!data.speakerName || typeof data.speakerName !== 'string' || !data.speakerName.trim()) {
    errors.push('Speaker name is required.');
  }

  if (!data.startDate) {
    errors.push('Event start date & time is required.');
  } else {
    const start = new Date(data.startDate);
    if (isNaN(start.getTime())) {
      errors.push('Invalid start date format.');
    }
  }

  if (!data.endDate) {
    errors.push('Event end date & time is required.');
  } else {
    const end = new Date(data.endDate);
    if (isNaN(end.getTime())) {
      errors.push('Invalid end date format.');
    } else if (data.startDate && new Date(data.startDate) >= end) {
      errors.push('Event end date must be after start date.');
    }
  }

  if (data.maxCapacity !== undefined && data.maxCapacity !== null && data.maxCapacity !== '') {
    const capacity = parseInt(data.maxCapacity, 10);
    if (isNaN(capacity) || capacity <= 0) {
      errors.push('Maximum capacity must be a positive integer.');
    }
  }

  if (data.registrationDeadline) {
    const deadline = new Date(data.registrationDeadline);
    if (isNaN(deadline.getTime())) {
      errors.push('Invalid registration deadline date format.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate Event Update Data
 */
function validateUpdateEvent(data) {
  const errors = [];

  if (data.type && !EVENT_TYPES.includes(data.type)) {
    errors.push(`Invalid event type. Must be one of: ${EVENT_TYPES.join(', ')}`);
  }

  if (data.status && !EVENT_STATUSES.includes(data.status)) {
    errors.push(`Invalid event status. Must be one of: ${EVENT_STATUSES.join(', ')}`);
  }

  if (data.startDate && data.endDate) {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (start >= end) {
      errors.push('Event end date must be after start date.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

module.exports = {
  validateCreateEvent,
  validateUpdateEvent,
  EVENT_TYPES,
  EVENT_STATUSES,
};
