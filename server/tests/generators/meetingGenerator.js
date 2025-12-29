const fc = require('fast-check');

/**
 * Generator for valid meeting status values
 */
const meetingStatusArb = fc.constantFrom('live', 'completed', 'scheduled');

/**
 * Generator for participant arrays
 */
const participantsArb = fc.array(
  fc.string({ minLength: 1, maxLength: 50 }),
  { minLength: 0, maxLength: 10 }
);

/**
 * Generator for valid meeting data objects
 */
const meetingDataArb = fc.record({
  title: fc.string({ minLength: 1, maxLength: 200 }),
  status: meetingStatusArb,
  startTime: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
  endTime: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }), { nil: null }),
  participants: participantsArb,
  summary: fc.option(fc.string({ minLength: 0, maxLength: 1000 }), { nil: null }),
});

module.exports = {
  meetingStatusArb,
  participantsArb,
  meetingDataArb,
};
