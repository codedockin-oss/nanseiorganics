'use strict';
// Coupons: what the admin panel sends becomes valid coupon fields.   cd backend && npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const { couponFields } = require('../routes/couponRoutes');

test('a new coupon gets dates, a description and an upper-case code', () => {
  const f = couponFields({ code: ' nansai10 ', discountType: 'percentage', discountValue: '10' }, true);
  assert.equal(f.code, 'NANSAI10');
  assert.equal(f.discountValue, 10);
  assert.ok(f.validFrom instanceof Date && f.validUntil instanceof Date);
  assert.ok(f.validUntil > f.validFrom);
  assert.equal(f.description, 'Coupon NANSAI10');
});

test('the older field names from the previous panel still work', () => {
  const f = couponFields({ code: 'X', discountType: 'fixed', discountValue: 50, maxUses: '20', expiresAt: '2030-01-01' }, true);
  assert.equal(f.usageLimit, 20);
  assert.equal(f.validUntil.getUTCFullYear(), 2030);
});

test('bad input is refused with a clear message', () => {
  assert.throws(() => couponFields({ code: '!!!', discountType: 'fixed', discountValue: 5 }, true), /code/);
  assert.throws(() => couponFields({ code: 'A', discountType: 'percentage', discountValue: 95 }, true), /90%/);
  assert.throws(() => couponFields({ code: 'A', discountType: 'fixed', discountValue: 0 }, true), /greater than 0/);
  assert.throws(() => couponFields({ code: 'A', discountType: 'fixed', discountValue: 5, validFrom: '2030-01-02', validUntil: '2030-01-01' }, true), /before the start/);
});

test('an edit only touches the fields that were sent', () => {
  assert.deepEqual(couponFields({ isActive: false }, false), { isActive: false });
  assert.equal(couponFields({ usageLimit: '' }, false).usageLimit, null);
});
