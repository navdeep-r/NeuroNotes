const fc = require('fast-check');

/**
 * Generator for valid visual type values
 */
const visualTypeArb = fc.constantFrom('bar', 'line', 'pie', 'generic');

/**
 * Generator for chart dataset
 */
const datasetArb = fc.record({
  label: fc.string({ minLength: 1, maxLength: 50 }),
  data: fc.array(fc.float({ noNaN: true, noDefaultInfinity: true }), { minLength: 1, maxLength: 10 }),
  backgroundColor: fc.option(fc.array(fc.hexaString(), { minLength: 1, maxLength: 10 }), { nil: undefined }),
  borderColor: fc.option(fc.hexaString(), { nil: undefined }),
});

/**
 * Generator for chart data structure
 */
const chartDataArb = fc.record({
  labels: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 1, maxLength: 10 }),
  datasets: fc.array(datasetArb, { minLength: 1, maxLength: 3 }),
});

/**
 * Generator for valid visual data objects
 */
const visualDataArb = fc.record({
  type: visualTypeArb,
  title: fc.string({ minLength: 1, maxLength: 100 }),
  description: fc.option(fc.string({ minLength: 0, maxLength: 300 }), { nil: '' }),
  data: chartDataArb,
  sourceWindowId: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
});

module.exports = {
  visualTypeArb,
  chartDataArb,
  visualDataArb,
};
