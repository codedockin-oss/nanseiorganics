/**
 * export-snapshot.js — writes the current products (as the admin has set them) to data/catalog.json at the site root.
 * Pages show this copy instantly and use it if the server is asleep or down; the live server still has the last word.
 * Run after big catalogue changes, then publish the site:   cd backend && node seeders/export-snapshot.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['1.1.1.1', '8.8.8.8']);
const Product = require('../models/Product');
const CATEGORY = { rice: 'Rice Varieties', flowers: 'Dried Flowers', beverages: 'Beverages', flour: 'Flour Varieties', other: 'Other Products' };

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const list = await Product.find({ isActive: true, legacyId: { $ne: null }, 'sizes.0': { $exists: true } }).sort('legacyId').lean();
  const out = list.map(p => ({
    legacyId: p.legacyId, name: p.name, category: CATEGORY[p.category] || p.category, tagline: p.tagline || '',
    description: p.description || '', images: (p.images || []).map(i => i.url).filter(Boolean),
    sizes: (p.sizes || []).filter(z => z.active !== false).map(z => ({ sku: z.sku, label: z.label, amount: z.amount, unit: z.unit, price: z.price, mrp: z.mrp, stock: z.stock == null ? null : z.stock })),
    countryOfOrigin: p.countryOfOrigin || 'India',
  }));
  const dest = path.join(__dirname, '../../pages/data/catalog.json');
  fs.writeFileSync(dest, JSON.stringify(out, null, 2) + '\n');
  console.log(`Wrote ${out.length} products to ${dest}. Publish the site to update the copy shoppers see first.`);
  await mongoose.disconnect();
}).catch(e => { console.error(e.message); process.exit(1); });
