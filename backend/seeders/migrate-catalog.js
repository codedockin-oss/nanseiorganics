/**
 * migrate-catalog.js — puts the storefront's 16 products (backend/data/catalog.json) into the database,
 * with their pack sizes, so the admin panel controls names, prices, MRP and stock.
 *
 *   cd backend && node seeders/migrate-catalog.js            (shows what would change, changes nothing)
 *   cd backend && node seeders/migrate-catalog.js --apply    (saves)
 *
 * Safe to run more than once:
 *   - a product is matched by its storefront number (legacyId), else by name; it is only created if neither exists
 *   - sizes are only written to products that have none yet, so prices the admin has edited are never overwritten
 *     (add --reset-sizes to replace them from the file on purpose)
 *   - nothing is deleted
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const path = require('path');
const mongoose = require('mongoose');
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['1.1.1.1', '8.8.8.8']);
const Product = require('../models/Product');

const APPLY = process.argv.includes('--apply');
const RESET = process.argv.includes('--reset-sizes');
const CATEGORY = { 'Rice Varieties': 'rice', 'Dried Flowers': 'flowers', 'Beverages': 'beverages', 'Flour Varieties': 'flour', 'Other Products': 'other' };
const norm = s => String(s || '').toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z]/g, '');
// names the products were seeded with in the database (seed.js), so they are matched instead of duplicated
const ALIASES = {
  1: ['Karunguruvai Rice'], 2: ['Karuppu Kavuni Rice', 'Black Kavuni Rice'], 3: ['Arubatham Kuruvai Rice'], 4: ['Poongar Rice'],
  5: ['Mappillai Samba Rice', 'Mani Samba Rice'], 6: ['Iluppai Poo Samba Rice', 'Iluppai Poo Samba White Rice'], 7: ['Vellai Kavuni Rice', 'White Kavuni Rice'],
  8: ['Paneer Rose', 'Panneer Rose'], 9: ['Hibiscus Flower'], 10: ['Aavaram Flower', 'Avarampoo'], 11: ['Butterfly Pea Flower', 'Sangupoo', 'Sangu Poo'],
  12: ['Organic Rose Milk', 'Organic Real Rose Milk', 'Rose Milk'], 13: ['Hibiscus Sherbet'], 14: ['Idiyappam Flour', 'Hand-pounded Rice Idiyappam Flour'],
  15: ['Health Mix Powder', 'Black Urad Dal Health Mix Powder'], 16: ['Country Fig Powder', 'Natural Fig Powder', 'Fig Powder'],
};
const catalog = require(path.join(__dirname, '../data/catalog.json'));

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const all = await Product.find().lean();
  let created = 0, updated = 0;
  for (const c of catalog) {
    const names = [c.name].concat(ALIASES[c.legacyId] || []).map(norm);
    const p = all.find(x => x.legacyId === c.legacyId) || all.find(x => x.legacyId == null && names.includes(norm(x.name)));
    const sizes = c.sizes.map(z => ({ sku: z.sku, label: z.label, amount: z.amount, unit: z.unit, price: z.price, mrp: z.mrp, stock: z.stock, active: true }));
    if (!p) {
      created++;
      console.log(`+ create #${c.legacyId} ${c.name}  (${sizes.map(z => z.label + ' ₹' + z.price).join(', ')})`);
      if (APPLY) {
        await Product.create({
          legacyId: c.legacyId, name: c.name, category: CATEGORY[c.category] || 'other', description: c.description || c.name,
          tagline: c.tagline, images: (c.images || []).map(url => ({ url })), sizes, price: sizes[0].price, oldPrice: sizes[0].mrp,
          stock: 0, unit: 'pack', weight: 1, badge: ['hot', 'new', 'sale'].includes(c.badge) ? c.badge : undefined,
          section: c.section || undefined, howToUse: c.howToUse, shelfLife: c.shelfLife, countryOfOrigin: c.countryOfOrigin || 'India',
          gstRate: 5, isActive: true,
        });
      }
      continue;
    }
    const set = {};
    if (p.legacyId == null) set.legacyId = c.legacyId;
    if (!p.sizes || !p.sizes.length || RESET) { set.sizes = sizes; set.price = sizes[0].price; set.oldPrice = sizes[0].mrp; }
    if (!p.countryOfOrigin) set.countryOfOrigin = 'India';
    if (!p.images || !p.images.length) set.images = (c.images || []).map(url => ({ url }));
    if (!Object.keys(set).length) { console.log(`= #${c.legacyId} ${p.name}: already up to date`); continue; }
    updated++;
    console.log(`~ #${c.legacyId} ${p.name}: ${Object.keys(set).join(', ')}${set.sizes ? '  (' + sizes.map(z => z.label + ' ₹' + z.price).join(', ') + ')' : ''}`);
    if (APPLY) await Product.updateOne({ _id: p._id }, { $set: set });
  }
  console.log(`\n${created} to create, ${updated} to update.` + (APPLY ? ' Saved.' : ' Nothing saved: run again with --apply.'));
  console.log('Stock starts as "not tracked" for every size. Enter real counts in the admin panel (Products > Edit) to start tracking.');
  await mongoose.disconnect();
}).catch(e => { console.error(e.message); process.exit(1); });
