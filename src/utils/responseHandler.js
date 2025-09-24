
// Response format constants
const RESPONSE_FORMATS = {
  SUCCESS: 'success',
  ERROR: 'error'
};

// Success response helper
export const sendSuccess = (
  res,
  message = "Success",
  data = null,
  status = 200
) => {
  return res.status(status).json({
    status: RESPONSE_FORMATS.SUCCESS,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

// Error response helper
export const sendError = (
  res,
  message = "Something went wrong",
  status = 500,
  error = null
) => {
  const response = {
    status: RESPONSE_FORMATS.ERROR,
    message,
    timestamp: new Date().toISOString()
  };

  // Only include error details in development
  if (process.env.NODE_ENV === 'development' && error) {
    response.error = {
      name: error.name || 'Error',
      stack: error.stack
    };
  }

  return res.status(status).json(response);
};

// Common response messages
export const RESPONSE_MESSAGES = {
  CREATED: 'Resource created successfully',
  UPDATED: 'Resource updated successfully',
  DELETED: 'Resource deleted successfully',
  RETRIEVED: 'Resource retrieved successfully',
  NOT_FOUND: 'Resource not found',
  UNAUTHORIZED: 'Access denied',
  VALIDATION_ERROR: 'Validation failed',
  SERVER_ERROR: 'Internal server error'
};

// Status codes
export const STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500
};