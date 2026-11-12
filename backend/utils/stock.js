'use strict';
/**
 * Stock per pack size. A size with stock = null is not tracked and is never touched here.
 *   takeStock(items, { strict })  - strict (cash on delivery): all-or-nothing, refuses if any size ran out meanwhile.
 *                                   not strict (already paid online): takes what was ordered even if that goes below zero,
 *                                   so the admin sees the shortfall instead of a paid order being lost.
 *   returnStock(items)            - puts the packs back (order cancelled).
 */
const mongoose = require('mongoose');

function tracked(items) {
  return (items || []).filter(i => i && i.sku && mongoose.Types.ObjectId.isValid(String(i.product)) && String(i.product).length === 24);
}

async function takeStock(items, { strict = true } = {}) {
  const Product = require('../models/Product');
  const done = [];
  for (const i of tracked(items)) {
    const q = Number(i.quantity) || 0;
    const match = { _id: i.product, sizes: { $elemMatch: { sku: i.sku, stock: strict ? { $gte: q } : { $ne: null } } } };
    const r = await Product.updateOne(match, { $inc: { 'sizes.$.stock': -q } });
    if (r.modifiedCount) { done.push(i); continue; }
    if (!strict) continue;
    // untracked sizes are fine; a tracked size that ran out is not
    const p = await Product.findOne({ _id: i.product, 'sizes.sku': i.sku }, { 'sizes.$': 1, name: 1 }).lean();
    const z = p && p.sizes && p.sizes[0];
    if (z && z.stock != null) {
      await returnStock(done);
      const err = new Error(z.stock > 0 ? `Only ${z.stock} of ${p.name} (${z.label}) left.` : `${p.name} (${z.label}) has just sold out.`);
      err.status = 409;
      throw err;
    }
  }
  return done;
}

async function returnStock(items) {
  const Product = require('../models/Product');
  for (const i of tracked(items)) {
    await Product.updateOne(
      { _id: i.product, sizes: { $elemMatch: { sku: i.sku, stock: { $ne: null } } } },
      { $inc: { 'sizes.$.stock': Number(i.quantity) || 0 } }
    );
  }
}

module.exports = { takeStock, returnStock };
