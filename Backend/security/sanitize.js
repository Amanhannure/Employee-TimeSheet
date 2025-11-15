import validator from 'validator';

export const sanitizeInput = (input) => {
  if (typeof input === 'object' && input !== null && !Array.isArray(input)) {
    const sanitized = {};
    for (const [key, value] of Object.entries(input)) {
      // Skip prototype properties and keys that start with $
      if (Object.prototype.hasOwnProperty.call(input, key) && !key.startsWith('$')) {
        sanitized[key] = sanitizeInput(value);
      }
    }
    return sanitized;
  }
  
  if (Array.isArray(input)) {
    return input.map(item => sanitizeInput(item));
  }
  
  if (typeof input === 'string') {
    return validator.escape(validator.trim(input));
  }
  
  return input;
};

export const sanitizeMiddleware = (req, res, next) => {
  try {
    // Only sanitize body if it exists and is an object
    if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
      req.body = sanitizeInput(req.body);
    }
    
    // Only sanitize query if it exists and has properties
    if (req.query && typeof req.query === 'object' && Object.keys(req.query).length > 0) {
      const sanitizedQuery = sanitizeInput(req.query);
      // Create new query object instead of modifying original
      for (const key in sanitizedQuery) {
        if (Object.prototype.hasOwnProperty.call(sanitizedQuery, key)) {
          req.query[key] = sanitizedQuery[key];
        }
      }
    }
    
    next();
  } catch (error) {
    console.error('Sanitization error:', error);
    // Continue without sanitization rather than crashing
    next();
  }
};