/**
 * Centralized Error Handler for MinuteFlow
 * 
 * Provides consistent error handling, logging, and response sanitization
 * across the application.
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

/**
 * List of sensitive patterns that should be removed from error messages
 * to prevent information leakage
 */
const SENSITIVE_PATTERNS = [
  /at\s+[\w.]+\s+\([^)]+\)/g,           // Stack trace lines: "at Function.name (path:line:col)"
  /at\s+[^\n]+/g,                        // Generic stack trace lines
  /\/[\w/.-]+\.js:\d+:\d+/g,             // File paths with line numbers
  /[A-Za-z]:\\[^\s]+/g,                  // Windows file paths
  /\/home\/[^\s]+/g,                     // Unix home paths
  /\/Users\/[^\s]+/g,                    // macOS user paths
  /\/usr\/[^\s]+/g,                      // Unix system paths
  /\/var\/[^\s]+/g,                      // Unix var paths
  /\/tmp\/[^\s]+/g,                      // Unix temp paths
  /node_modules\/[^\s]+/g,               // Node modules paths
  /Error:\s*\n/g,                        // Error prefix with newline
  /firebase-admin[^\s]*/gi,              // Firebase admin references
  /firestore[^\s]*/gi,                   // Firestore references (in paths)
  /FIREBASE_[A-Z_]+/g,                   // Firebase environment variable names
  /-----BEGIN[^-]+-----[\s\S]*?-----END[^-]+-----/g, // Private keys
  /projects\/[^/]+\/databases/g,         // Firestore project paths
  /serviceAccount[^\s]*/gi,              // Service account references
];

/**
 * List of internal error codes that should be mapped to generic messages
 */
const INTERNAL_ERROR_CODES = [
  'ECONNREFUSED',
  'ENOTFOUND',
  'ETIMEDOUT',
  'ECONNRESET',
  'EPIPE',
  'INTERNAL',
  'UNAVAILABLE',
  'DEADLINE_EXCEEDED',
  'RESOURCE_EXHAUSTED',
  'PERMISSION_DENIED',
  'UNAUTHENTICATED',
];

/**
 * Map of error types to user-friendly messages
 */
const ERROR_MESSAGES = {
  'ECONNREFUSED': 'Service temporarily unavailable',
  'ENOTFOUND': 'Service temporarily unavailable',
  'ETIMEDOUT': 'Request timed out',
  'ECONNRESET': 'Connection was reset',
  'EPIPE': 'Connection was lost',
  'INTERNAL': 'An internal error occurred',
  'UNAVAILABLE': 'Service temporarily unavailable',
  'DEADLINE_EXCEEDED': 'Request timed out',
  'RESOURCE_EXHAUSTED': 'Service temporarily unavailable',
  'PERMISSION_DENIED': 'Access denied',
  'UNAUTHENTICATED': 'Authentication required',
  'NOT_FOUND': 'Resource not found',
  'ALREADY_EXISTS': 'Resource already exists',
  'INVALID_ARGUMENT': 'Invalid request',
  'FAILED_PRECONDITION': 'Operation cannot be performed',
  'ABORTED': 'Operation was aborted',
  'OUT_OF_RANGE': 'Value out of range',
  'UNIMPLEMENTED': 'Operation not supported',
  'DATA_LOSS': 'Data integrity error',
  'CANCELLED': 'Operation was cancelled',
};

/**
 * Sanitize an error message by removing sensitive information
 * 
 * @param {string} message - The error message to sanitize
 * @returns {string} Sanitized error message
 */
function sanitizeErrorMessage(message) {
  if (!message || typeof message !== 'string') {
    return 'An error occurred';
  }

  let sanitized = message;

  // Remove sensitive patterns
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, '');
  }

  // Clean up multiple spaces and newlines
  sanitized = sanitized
    .replace(/\s+/g, ' ')
    .replace(/^\s+|\s+$/g, '')
    .trim();

  // If the message is empty after sanitization, return generic message
  if (!sanitized || sanitized.length < 3) {
    return 'An error occurred';
  }

  // Truncate very long messages
  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 200) + '...';
  }

  return sanitized;
}

/**
 * Get a user-friendly error message based on error code or type
 * 
 * @param {Error} error - The error object
 * @returns {string} User-friendly error message
 */
function getPublicErrorMessage(error) {
  if (!error) {
    return 'An error occurred';
  }

  // Check for known error codes
  const code = error.code || error.name;
  if (code && ERROR_MESSAGES[code]) {
    return ERROR_MESSAGES[code];
  }

  // Check if error code is internal (should not be exposed)
  if (code && INTERNAL_ERROR_CODES.includes(code)) {
    return 'An internal error occurred';
  }

  // For validation errors, we can be more specific
  if (error.name === 'ValidationError' || code === 'INVALID_ARGUMENT') {
    return 'Validation failed';
  }

  // For Firebase/Firestore errors, return generic message
  if (error.name === 'FirebaseError' || error.code?.startsWith?.('firestore/')) {
    return 'Database operation failed';
  }

  // Default: sanitize the original message
  return sanitizeErrorMessage(error.message);
}

/**
 * Handle an error with context logging and return a sanitized response
 * 
 * @param {Error} error - The error object
 * @param {string} context - Context string for logging (e.g., function name)
 * @returns {Object} Sanitized error response object
 * 
 * Requirements: 9.1, 9.4, 9.5
 */
function handleError(error, context) {
  // Log full error with context for debugging (Requirement 9.1)
  console.error(`[${context}]`, {
    message: error.message,
    code: error.code,
    name: error.name,
    stack: error.stack,
  });

  // Return sanitized error to client (Requirement 9.5)
  return {
    error: getPublicErrorMessage(error),
    // Never include: stack, internal codes, file paths
  };
}

/**
 * Sleep utility for retry delays
 * 
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute an operation with retry logic and exponential backoff
 * 
 * @param {Function} operation - Async function to execute
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retries (default: 3)
 * @param {number} options.baseDelay - Base delay in ms (default: 100)
 * @param {number} options.maxDelay - Maximum delay in ms (default: 5000)
 * @param {string} options.context - Context for logging
 * @returns {Promise<*>} Result of the operation
 * 
 * Requirements: 9.3
 */
async function withRetry(operation, options = {}) {
  const {
    maxRetries = 3,
    baseDelay = 100,
    maxDelay = 5000,
    context = 'operation',
  } = options;

  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Check if error is retryable
      if (!isRetryableError(error)) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        console.error(`[${context}] All ${maxRetries} retry attempts failed`);
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(Math.pow(2, attempt) * baseDelay, maxDelay);
      
      console.warn(`[${context}] Attempt ${attempt} failed, retrying in ${delay}ms...`, {
        error: error.message,
        code: error.code,
      });

      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Check if an error is retryable
 * 
 * @param {Error} error - The error to check
 * @returns {boolean} True if the error is retryable
 */
function isRetryableError(error) {
  const retryableCodes = [
    'ECONNREFUSED',
    'ENOTFOUND',
    'ETIMEDOUT',
    'ECONNRESET',
    'EPIPE',
    'UNAVAILABLE',
    'DEADLINE_EXCEEDED',
    'RESOURCE_EXHAUSTED',
    'ABORTED',
    'INTERNAL',
  ];

  const code = error.code || error.name;
  return retryableCodes.includes(code);
}

/**
 * Create an Express error handling middleware
 * 
 * @param {string} context - Context for logging
 * @returns {Function} Express middleware function
 */
function createErrorMiddleware(context = 'API') {
  return (err, req, res, next) => {
    const sanitizedError = handleError(err, context);
    
    // Determine status code
    let statusCode = 500;
    if (err.statusCode) {
      statusCode = err.statusCode;
    } else if (err.code === 'NOT_FOUND') {
      statusCode = 404;
    } else if (err.code === 'INVALID_ARGUMENT' || err.name === 'ValidationError') {
      statusCode = 400;
    } else if (err.code === 'PERMISSION_DENIED' || err.code === 'UNAUTHENTICATED') {
      statusCode = 403;
    }

    res.status(statusCode).json(sanitizedError);
  };
}

module.exports = {
  handleError,
  withRetry,
  sanitizeErrorMessage,
  getPublicErrorMessage,
  isRetryableError,
  createErrorMiddleware,
  sleep,
};
