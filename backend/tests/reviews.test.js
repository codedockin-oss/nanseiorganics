'use strict';
// Review text is stored as plain text and customers are shown by first name + last initial.   cd backend && npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const { cleanText, publicName } = require('../routes/reviewRoutes');

test('review text keeps words but drops HTML and control characters', () => {
  assert.equal(cleanText('<img src=x onerror=alert(1)>Lovely rice', 1000), 'Lovely rice');
  assert.equal(cleanText('  <b>Soft</b> idiyappam\u0007 ', 1000), 'Soft idiyappam');
  assert.equal(cleanText('Cooks in 20 min & tastes good', 1000), 'Cooks in 20 min & tastes good');
  assert.equal(cleanText('a'.repeat(50), 10), 'a'.repeat(10));
  assert.equal(cleanText(undefined, 10), '');
});

test('public name is first name and last initial only', () => {
  assert.equal(publicName({ firstName: 'Priya', lastName: 'Sundaram' }), 'Priya S.');
  assert.equal(publicName({ name: 'Arun Kumar Raj' }), 'Arun R.');
  assert.equal(publicName({ name: 'Meena' }), 'Meena');
  assert.equal(publicName(null), 'Customer');
});
