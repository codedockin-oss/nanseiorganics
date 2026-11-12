/**
 * reset-ratings.js — makes every product's star rating and review count match its published reviews.
 *
 * The product seed files used to write sample numbers (for example 4.7 stars from 142 reviews) into the
 * database. This replaces them with the real figures; products without reviews go back to 0 / 0 ("New").
 * Nothing is deleted. Run it once, and again any time the numbers look wrong:
 *
 *   cd backend && node seeders/reset-ratings.js            (shows what would change)
 *   cd backend && node seeders/reset-ratings.js --apply    (saves the changes)
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['1.1.1.1', '8.8.8.8']);
const Product = require('../models/Product');
const Review = require('../models/Review');

const apply = process.argv.includes('--apply');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const stats = await Review.aggregate([
    { $match: { isApproved: true } },
    { $group: { _id: '$product', avg: { $avg: '$rating' }, count: { $sum: 1 }, ids: { $push: '$_id' } } }
  ]);
  const byProduct = new Map(stats.map(s => [String(s._id), s]));
  const products = await Product.find().select('name rating numReviews').lean();
  let changed = 0;
  for (const p of products) {
    const s = byProduct.get(String(p._id));
    const rating = s ? Math.round(s.avg * 10) / 10 : 0;
    const numReviews = s ? s.count : 0;
    if (p.rating === rating && p.numReviews === numReviews) continue;
    changed++;
    console.log(`${p.name}: ${p.rating || 0} from ${p.numReviews || 0}  ->  ${rating} from ${numReviews}`);
    if (apply) await Product.updateOne({ _id: p._id }, { rating, numReviews, reviews: s ? s.ids : [] });
  }
  console.log(changed ? (apply ? `Updated ${changed} product(s).` : `${changed} product(s) would change. Run again with --apply to save.`) : 'All ratings already match the reviews.');
  await mongoose.disconnect();
}).catch(e => { console.error(e.message); process.exit(1); });
