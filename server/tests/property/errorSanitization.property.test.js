/**
 * Property-Based Tests for Error Response Sanitization
 * Feature: firebase-migration
 * 
 * Property 10: Error Response Sanitization
 * For any API error response, the response body SHALL NOT contain internal
 * error details, stack traces, or sensitive system information.
 * 
 * Validates: Requirements 9.5
 */

const fc = require('fast-check');
const {
  handleError,
  sanitizeErrorMessage,
  getPublicErrorMessage,
} = require('../../src/utils/errorHandler');

/**
 * Generator for file paths (should be sanitized)
 */
const filePathArb = fc.oneof(
  // Unix paths
  fc.tuple(
    fc.constantFrom('/home/', '/Users/', '/var/', '/tmp/', '/usr/'),
    fc.array(fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789_-'), { minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 5 })
  ).map(([prefix, parts]) => prefix + parts.join('/')),
  // Windows paths
  fc.tuple(
    fc.constantFrom('C:\\', 'D:\\', 'E:\\'),
    fc.array(fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789_-'), { minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 5 })
  ).map(([prefix, parts]) => prefix + parts.join('\\')),
  // Node modules paths
  fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789_-'), { minLength: 1, maxLength: 20 })
    .map(name => `node_modules/${name}/index.js`)
);

/**
 * Generator for stack trace lines (should be sanitized)
 */
const stackTraceLineArb = fc.tuple(
  fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'), { minLength: 3, maxLength: 20 }),
  filePathArb,
  fc.integer({ min: 1, max: 1000 }),
  fc.integer({ min: 1, max: 100 })
).map(([funcName, path, line, col]) => `at ${funcName} (${path}:${line}:${col})`);

/**
 * Generator for full stack traces (should be sanitized)
 */
const stackTraceArb = fc.array(stackTraceLineArb, { minLength: 3, maxLength: 10 })
  .map(lines => lines.join('\n'));

/**
 * Generator for sensitive environment variable names
 */
const sensitiveEnvVarArb = fc.constantFrom(
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN'
);

/**
 * Generator for private key content (should be sanitized)
 */
const privateKeyArb = fc.stringOf(
  fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='),
  { minLength: 50, maxLength: 200 }
).map(content => `-----BEGIN PRIVATE KEY-----\n${content}\n-----END PRIVATE KEY-----`);

/**
 * Generator for Firestore project paths (should be sanitized)
 */
const firestoreProjectPathArb = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-'),
  { minLength: 5, maxLength: 20 }
).map(projectId => `projects/${projectId}/databases/(default)/documents`);

/**
 * Generator for error messages containing sensitive information
 */
const sensitiveErrorMessageArb = fc.oneof(
  // Error with stack trace
  fc.tuple(
    fc.string({ minLength: 5, maxLength: 50 }),
    stackTraceArb
  ).map(([msg, stack]) => `Error: ${msg}\n${stack}`),
  
  // Error with file path
  fc.tuple(
    fc.string({ minLength: 5, maxLength: 30 }),
    filePathArb
  ).map(([msg, path]) => `${msg} at ${path}`),
  
  // Error with environment variable
  fc.tuple(
    fc.string({ minLength: 5, maxLength: 30 }),
    sensitiveEnvVarArb
  ).map(([msg, envVar]) => `${msg}: ${envVar} is not defined`),
  
  // Error with private key
  fc.tuple(
    fc.string({ minLength: 5, maxLength: 30 }),
    privateKeyArb
  ).map(([msg, key]) => `${msg}: ${key}`),
  
  // Error with Firestore path
  fc.tuple(
    fc.string({ minLength: 5, maxLength: 30 }),
    firestoreProjectPathArb
  ).map(([msg, path]) => `${msg} at ${path}`)
);

/**
 * Generator for Error objects with sensitive information
 */
const sensitiveErrorArb = fc.tuple(
  sensitiveErrorMessageArb,
  fc.option(stackTraceArb, { nil: undefined }),
  fc.option(fc.constantFrom(
    'ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'INTERNAL', 'UNAVAILABLE'
  ), { nil: undefined })
).map(([message, stack, code]) => {
  const error = new Error(message);
  if (stack) error.stack = stack;
  if (code) error.code = code;
  return error;
});

/**
 * Patterns that should NEVER appear in sanitized output
 */
const FORBIDDEN_PATTERNS = [
  /at\s+[\w.]+\s+\([^)]+:\d+:\d+\)/,     // Stack trace with line numbers
  /\/home\/[^\s]+/,                       // Unix home paths
  /\/Users\/[^\s]+/,                      // macOS user paths
  /\/usr\/[^\s]+/,                        // Unix system paths
  /\/var\/[^\s]+/,                        // Unix var paths
  /\/tmp\/[^\s]+/,                        // Unix temp paths
  /[A-Za-z]:\\[^\s]+/,                    // Windows paths
  /node_modules\//,                       // Node modules
  /FIREBASE_[A-Z_]+/,                     // Firebase env vars
  /-----BEGIN[^-]+-----/,                 // Private key markers
  /-----END[^-]+-----/,                   // Private key markers
  /projects\/[^/]+\/databases/,           // Firestore project paths
  /serviceAccount/i,                      // Service account references
  /\.js:\d+:\d+/,                         // File paths with line numbers
];

/**
 * Check if a string contains any forbidden patterns
 */
function containsForbiddenPatterns(str) {
  if (!str || typeof str !== 'string') return false;
  return FORBIDDEN_PATTERNS.some(pattern => pattern.test(str));
}

describe('Property Tests: Error Response Sanitization', () => {
  /**
   * Property 10: Error Response Sanitization
   * 
   * Feature: firebase-migration, Property 10: Error Response Sanitization
   * Validates: Requirements 9.5
   */
  describe('Property 10: Error Response Sanitization', () => {
    /**
     * Test that sanitizeErrorMessage removes all sensitive patterns
     */
    it('sanitizeErrorMessage removes sensitive information from any error message', async () => {
      await fc.assert(
        fc.asyncProperty(sensitiveErrorMessageArb, async (message) => {
          const sanitized = sanitizeErrorMessage(message);
          
          // Sanitized message should not contain forbidden patterns
          expect(containsForbiddenPatterns(sanitized)).toBe(false);
          
          // Sanitized message should be a non-empty string
          expect(typeof sanitized).toBe('string');
          expect(sanitized.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Test that getPublicErrorMessage never exposes internal details
     */
    it('getPublicErrorMessage never exposes internal error details', async () => {
      await fc.assert(
        fc.asyncProperty(sensitiveErrorArb, async (error) => {
          const publicMessage = getPublicErrorMessage(error);
          
          // Public message should not contain forbidden patterns
          expect(containsForbiddenPatterns(publicMessage)).toBe(false);
          
          // Public message should be a non-empty string
          expect(typeof publicMessage).toBe('string');
          expect(publicMessage.length).toBeGreaterThan(0);
          
          // Public message should not contain the original stack trace
          if (error.stack) {
            expect(publicMessage).not.toContain(error.stack);
          }
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Test that handleError returns sanitized response objects
     */
    it('handleError returns sanitized response without sensitive information', async () => {
      // Suppress console.error during test
      const originalConsoleError = console.error;
      console.error = jest.fn();

      try {
        await fc.assert(
          fc.asyncProperty(
            sensitiveErrorArb,
            fc.string({ minLength: 3, maxLength: 30 }),
            async (error, context) => {
              const response = handleError(error, context);
              
              // Response should have error property
              expect(response).toHaveProperty('error');
              expect(typeof response.error).toBe('string');
              
              // Response error should not contain forbidden patterns
              expect(containsForbiddenPatterns(response.error)).toBe(false);
              
              // Response should NOT have stack property
              expect(response).not.toHaveProperty('stack');
              
              // Response should NOT have internal code property
              expect(response).not.toHaveProperty('code');
              
              // Response should NOT have internal details
              expect(response).not.toHaveProperty('details');
              expect(response).not.toHaveProperty('internalCode');
              
              // Stringify the response and check for forbidden patterns
              const responseStr = JSON.stringify(response);
              expect(containsForbiddenPatterns(responseStr)).toBe(false);
            }
          ),
          { numRuns: 100 }
        );
      } finally {
        console.error = originalConsoleError;
      }
    });

    /**
     * Test that stack traces are completely removed
     */
    it('completely removes stack traces from error responses', async () => {
      // Suppress console.error during test
      const originalConsoleError = console.error;
      console.error = jest.fn();

      try {
        await fc.assert(
          fc.asyncProperty(stackTraceArb, async (stackTrace) => {
            const error = new Error('Test error');
            error.stack = stackTrace;
            
            const response = handleError(error, 'test');
            const responseStr = JSON.stringify(response);
            
            // Response should not contain any part of the stack trace
            const stackLines = stackTrace.split('\n');
            for (const line of stackLines) {
              if (line.includes('at ')) {
                expect(responseStr).not.toContain(line);
              }
            }
          }),
          { numRuns: 100 }
        );
      } finally {
        console.error = originalConsoleError;
      }
    });

    /**
     * Test that file paths are never exposed
     */
    it('never exposes file paths in error responses', async () => {
      // Suppress console.error during test
      const originalConsoleError = console.error;
      console.error = jest.fn();

      try {
        await fc.assert(
          fc.asyncProperty(filePathArb, async (filePath) => {
            const error = new Error(`Error in ${filePath}`);
            
            const response = handleError(error, 'test');
            
            // Response should not contain the file path
            expect(response.error).not.toContain(filePath);
          }),
          { numRuns: 100 }
        );
      } finally {
        console.error = originalConsoleError;
      }
    });

    /**
     * Test that private keys are never exposed
     */
    it('never exposes private keys in error responses', async () => {
      // Suppress console.error during test
      const originalConsoleError = console.error;
      console.error = jest.fn();

      try {
        await fc.assert(
          fc.asyncProperty(privateKeyArb, async (privateKey) => {
            const error = new Error(`Key error: ${privateKey}`);
            
            const response = handleError(error, 'test');
            
            // Response should not contain the private key
            expect(response.error).not.toContain('BEGIN PRIVATE KEY');
            expect(response.error).not.toContain('END PRIVATE KEY');
          }),
          { numRuns: 100 }
        );
      } finally {
        console.error = originalConsoleError;
      }
    });
  });
});
