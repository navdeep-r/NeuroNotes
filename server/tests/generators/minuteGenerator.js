const fc = require('fast-check');

/**
 * Generator for valid minute window data objects
 */
const minuteDataArb = fc.record({
  startTime: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
  endTime: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
  transcript: fc.string({ minLength: 0, maxLength: 2000 }),
  speaker: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: '' }),
  processed: fc.boolean(),
});

module.exports = {
  minuteDataArb,
};
