
import validator from 'validator';

export const sanitizeInput = (input) => {
  if (typeof input === 'object' && input !== null) {
    const sanitized = {};
    for (const [key, value] of Object.entries(input)) {
      if (!key.startsWith('$')) {
        sanitized[key] = sanitizeInput(value);
      }
    }
    return sanitized;
  }
  
  if (typeof input === 'string') {
    return validator.escape(validator.trim(input));
  }
  
  return input;
};

export const sanitizeMiddleware = (req, res, next) => {
  if (req.body) req.body = sanitizeInput(req.body);
  if (req.query) req.query = sanitizeInput(req.query);
  if (req.params) req.params = sanitizeInput(req.params);
  next();
};