const fc = require('fast-check');

/**
 * Generator for valid action status values
 */
const actionStatusArb = fc.constantFrom('pending', 'in-progress', 'completed');

/**
 * Generator for valid action data objects
 */
const actionDataArb = fc.record({
  content: fc.string({ minLength: 1, maxLength: 500 }),
  assignee: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
  status: fc.option(actionStatusArb, { nil: undefined }),
  sourceWindowId: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
});

/**
 * Generator for valid decision data objects
 */
const decisionDataArb = fc.record({
  content: fc.string({ minLength: 1, maxLength: 500 }),
  confidence: fc.float({ min: 0, max: 1, noNaN: true }),
  sourceWindowId: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
});

module.exports = {
  actionStatusArb,
  actionDataArb,
  decisionDataArb,
};
