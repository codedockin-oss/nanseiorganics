/**
 * seed-products.js
 * Seeds all 16 products from the Nansai Organics website into MongoDB Atlas.
 * Run: node seeders/seed-products.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Product  = require('../models/Product');

const products = [
  {
    name: 'Karunguruvai Rice',
    description: 'A short-grain medicinal heritage rice with a glycemic index of just 51. Rich in anthocyanins, iron, and magnesium. Prescribed in Siddha medicine for over 2,000 years. Grown on our 25-acre certified organic farm in Tamil Nadu.',
    tagline: 'Ancient Tamil remedy — low GI, high nutrition',
    price: 180, oldPrice: 220,
    category: 'rice', unit: 'kg', weight: 1,
    badge: 'hot', section: 'bestseller',
    stock: 200, rating: 4.7, numReviews: 142,
    images: [{ url: 'https://ik.imagekit.io/bq9dscs4g/agro%20store/images/Rice%20category/Karunguruvai%20Rice/Karunguruvai%20Rice.png?updatedAt=1776255900602' }],
    benefits: ['Low glycemic index (51)', 'Rich in antioxidants', 'Supports blood sugar control', 'High in iron and magnesium'],
    nutritionalInfo: { calories: 350, protein: 8, carbs: 72, fat: 1.5, fiber: 5 },
    certifications: ['FSSAI'],
    howToUse: 'Soak for 30 minutes. Cook with 1:2.5 water ratio for 25-30 minutes.',
    shelfLife: '12 months in airtight container',
    tags: ['heritage', 'medicinal', 'low-gi', 'siddha'],
    isFeatured: true, isActive: true
  },
  {
    name: 'Karuppu Kavuni Rice',
    description: 'Black glutinous rice with one of the highest anthocyanin concentrations of any food. Rich in antioxidants comparable to blueberries. Traditional ceremonial grain of Tamil Nadu used in weddings and festivals.',
    tagline: 'Superfood black rice — antioxidant powerhouse',
    price: 220, oldPrice: 270,
    category: 'rice', unit: 'kg', weight: 1,
    badge: 'hot', section: 'bestseller',
    stock: 150, rating: 4.8, numReviews: 198,
    images: [{ url: 'https://ik.imagekit.io/bq9dscs4g/agro%20store/images/Rice%20category/Karuppu%20Kavuni%20Rice/Karuppu%20Kavuni%20Rice.png?updatedAt=1776255900741' }],
    benefits: ['Highest anthocyanin content', 'Supports heart health', 'Reduces LDL cholesterol', 'Anti-inflammatory'],
    nutritionalInfo: { calories: 340, protein: 9, carbs: 68, fat: 2, fiber: 6 },
    certifications: ['FSSAI'],
    howToUse: 'Soak overnight. Cook with 1:2.5 water ratio. Perfect for payasam and sweet pongal.',
    shelfLife: '12 months in airtight container',
    tags: ['black-rice', 'antioxidants', 'heritage', 'ceremonial'],
    isFeatured: true, isActive: true
  },
  {
    name: 'Arubatham Kuruvai Rice',
    description: 'The 60-day heritage rice — matures in just 60 days, requiring significantly less water than modern varieties. Light, easy to digest, and rich in zinc, magnesium, and phosphorus. Ideal for the elderly and children.',
    tagline: '60-day heritage rice — light and digestible',
    price: 160, oldPrice: 200,
    category: 'rice', unit: 'kg', weight: 1,
    badge: 'new', section: 'new',
    stock: 100, rating: 4.5, numReviews: 87,
    images: [{ url: 'https://images.unsplash.com/photo-1514481538271-cf9f99627ab4?w=500&auto=format&fit=crop' }],
    benefits: ['Easy to digest', 'Low water requirement', 'Rich in zinc and magnesium', 'Suitable for all ages'],
    nutritionalInfo: { calories: 345, protein: 7, carbs: 74, fat: 1, fiber: 3 },
    certifications: ['FSSAI'],
    howToUse: 'Cook with 1:2 water ratio for 20-25 minutes.',
    shelfLife: '12 months in airtight container',
    tags: ['heritage', 'short-duration', 'digestible'],
    isFeatured: false, isActive: true
  },
  {
    name: 'Poongar Rice',
    description: 'Heritage rice with 6.6mg iron per 100g — traditionally prescribed for women\'s health. Supports menstrual regularity, lactation, and iron-deficiency anemia. Low glycemic index of 41-46.',
    tagline: 'Women\'s heritage rice — iron-rich, hormone-balancing',
    price: 200, oldPrice: 250,
    category: 'rice', unit: 'kg', weight: 1,
    badge: 'sale', section: 'bestseller',
    stock: 120, rating: 4.6, numReviews: 113,
    images: [{ url: 'https://ik.imagekit.io/bq9dscs4g/agro%20store/images/Rice%20category/Poongar%20Rice/Poongar%20Rice.png?updatedAt=1776255900674' }],
    benefits: ['6.6mg iron per 100g', 'Supports menstrual health', 'Aids lactation', 'Low glycemic index (41-46)'],
    nutritionalInfo: { calories: 348, protein: 8, carbs: 71, fat: 1.5, fiber: 4 },
    certifications: ['FSSAI'],
    howToUse: 'Cook with 1:2.5 water ratio. Best as kanji (porridge) with ghee and rock sugar.',
    shelfLife: '12 months in airtight container',
    tags: ['womens-health', 'iron-rich', 'heritage', 'siddha'],
    isFeatured: false, isActive: true
  },
  {
    name: 'Mappillai Samba Rice',
    description: 'The Bridegroom\'s Rice — traditionally fed to grooms for strength and stamina. Long-grain reddish-brown rice rich in iron, zinc, and plant sterols. Provides slow, steady energy ideal for physical endurance.',
    tagline: 'Bridegroom\'s rice — strength and stamina builder',
    price: 210, oldPrice: 260,
    category: 'rice', unit: 'kg', weight: 1,
    badge: 'hot', section: 'bestseller',
    stock: 130, rating: 4.7, numReviews: 156,
    images: [{ url: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=500&auto=format&fit=crop' }],
    benefits: ['Builds physical stamina', 'Rich in iron and zinc', 'Supports hormonal health', 'Slow-release energy'],
    nutritionalInfo: { calories: 352, protein: 9, carbs: 70, fat: 2, fiber: 5 },
    certifications: ['FSSAI'],
    howToUse: 'Soak 1 hour. Cook with 1:2.5 water ratio for 30-35 minutes.',
    shelfLife: '12 months in airtight container',
    tags: ['heritage', 'stamina', 'mens-health', 'energy'],
    isFeatured: true, isActive: true
  },
  {
    name: 'Iluppai Poo Samba Rice',
    description: 'Named after the Mahua flower, this aromatic heritage rice fills your kitchen with a distinctive floral fragrance. Light, easy to digest, and suitable for everyday cooking. A rare variety from the Cauvery delta.',
    tagline: 'Floral aromatic heritage rice from Cauvery delta',
    price: 195, oldPrice: 240,
    category: 'rice', unit: 'kg', weight: 1,
    badge: 'new', section: 'new',
    stock: 80, rating: 4.5, numReviews: 74,
    images: [{ url: 'https://ik.imagekit.io/bq9dscs4g/agro%20store/images/Rice%20category/Iluppai%20Poo%20Samba%20White%20Rice/Iluppai%20Poo%20Samba%20White%20Rice.png?updatedAt=1776255900667' }],
    benefits: ['Distinctive floral aroma', 'Easy to digest', 'Moderate fiber content', 'Rare heritage variety'],
    nutritionalInfo: { calories: 346, protein: 7, carbs: 73, fat: 1, fiber: 3 },
    certifications: ['FSSAI'],
    howToUse: 'Cook with 1:2 water ratio for 20-25 minutes.',
    shelfLife: '12 months in airtight container',
    tags: ['aromatic', 'heritage', 'rare', 'everyday'],
    isFeatured: false, isActive: true
  },
  {
    name: 'Vellai Kavuni Rice',
    description: 'White glutinous Kavuni rice — the secret to perfect sweet pongal and payasam. Natural stickiness creates a silky, cohesive texture that modern rice cannot replicate. Minimally processed to retain calcium, phosphorus, and magnesium.',
    tagline: 'Perfect sticky rice for pongal and payasam',
    price: 190, oldPrice: 235,
    category: 'rice', unit: 'kg', weight: 1,
    badge: 'new', section: 'new',
    stock: 90, rating: 4.6, numReviews: 91,
    images: [{ url: 'https://ik.imagekit.io/bq9dscs4g/agro%20store/images/Rice%20category/White%20Kavuni%20Rice/White%20Kavuni%20Rice.png?updatedAt=1776255898240' }],
    benefits: ['Natural stickiness for perfect pongal', 'Rich in calcium and phosphorus', 'Minimally processed', 'Traditional festival rice'],
    nutritionalInfo: { calories: 348, protein: 7, carbs: 75, fat: 1, fiber: 2 },
    certifications: ['FSSAI'],
    howToUse: 'Cook with 1:2 water ratio. Ideal for sweet pongal, payasam, and rice cakes.',
    shelfLife: '12 months in airtight container',
    tags: ['glutinous', 'heritage', 'festival', 'pongal'],
    isFeatured: false, isActive: true
  },
  {
    name: 'Paneer Rose',
    description: 'Sun-dried Panneer Rose petals (Rosa damascena) from Tamil Nadu. Used for rose milk, face tonics, hair masks, and cooling drinks. Rich in phenylethanol, geraniol, and natural flavonoids. Shade-dried within 24 hours of harvest.',
    tagline: 'Tamil Nadu\'s fragrant rose — beauty and wellness',
    price: 150, oldPrice: 190,
    category: 'flowers', unit: 'g', weight: 50,
    badge: 'hot', section: 'bestseller',
    stock: 180, rating: 4.8, numReviews: 204,
    images: [{ url: 'https://images.unsplash.com/photo-1490750967868-88df5691cc5e?w=500&auto=format&fit=crop' }],
    benefits: ['Natural skin toner', 'Supports hair growth', 'Cooling and digestive', 'Anti-inflammatory'],
    howToUse: 'Steep 15-20 petals in warm milk for rose milk. Use as face tonic or hair mask.',
    shelfLife: '18 months in airtight container away from sunlight',
    tags: ['rose', 'skincare', 'haircare', 'cooling', 'ayurveda'],
    isFeatured: true, isActive: true
  },
  {
    name: 'Hibiscus Flower',
    description: 'Sun-dried Hibiscus sabdariffa (Sembaruthi) flowers. Clinically proven to reduce systolic blood pressure by up to 7.2 mmHg. Rich in Vitamin C and anthocyanins. Supports liver health, reduces cholesterol, and promotes hair growth.',
    tagline: 'Blood pressure flower — 8 proven health benefits',
    price: 120, oldPrice: 155,
    category: 'flowers', unit: 'g', weight: 50,
    badge: 'sale', section: 'bestseller',
    stock: 200, rating: 4.6, numReviews: 167,
    images: [{ url: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=500&auto=format&fit=crop' }],
    benefits: ['Lowers blood pressure', 'Rich in Vitamin C', 'Supports liver health', 'Promotes hair growth', 'Anti-inflammatory'],
    howToUse: 'Steep 1 tbsp in 250ml boiling water for 8 minutes. Drink daily for cardiovascular benefits.',
    shelfLife: '18 months in airtight container',
    tags: ['hibiscus', 'blood-pressure', 'vitamin-c', 'hair-growth', 'ayurveda'],
    isFeatured: true, isActive: true
  },
  {
    name: 'Aavaram Flower',
    description: 'Dried Cassia auriculata (Avarampoo) flowers — a foundational herb of Siddha medicine. Enhances insulin sensitivity, supports blood sugar control, and has natural antibacterial properties for skin health.',
    tagline: 'Siddha medicine superstar for blood sugar control',
    price: 110, oldPrice: 145,
    category: 'flowers', unit: 'g', weight: 50,
    badge: 'new', section: 'new',
    stock: 150, rating: 4.5, numReviews: 88,
    images: [{ url: 'https://images.unsplash.com/photo-1490750967868-88df5691cc5e?w=500&auto=format&fit=crop' }],
    benefits: ['Supports blood sugar control', 'Enhances insulin sensitivity', 'Antibacterial for skin', 'Cooling herb'],
    howToUse: 'Boil 1 tsp in 300ml water for 10 minutes. Drink warm on empty stomach.',
    shelfLife: '18 months in airtight container',
    tags: ['siddha', 'diabetes', 'blood-sugar', 'cooling', 'skincare'],
    isFeatured: false, isActive: true
  },
  {
    name: 'Butterfly Pea Flower',
    description: 'Dried Clitoria ternatea flowers — the color-changing blue tea herb. Rich in ternatins (anthocyanins) that support cognitive function and eye health. Turns vivid violet with lemon juice. Used in Ayurveda for brain health.',
    tagline: 'Color-changing blue tea — brain and eye health',
    price: 180, oldPrice: 220,
    category: 'flowers', unit: 'g', weight: 50,
    badge: 'hot', section: 'bestseller',
    stock: 160, rating: 4.7, numReviews: 132,
    images: [{ url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&auto=format&fit=crop' }],
    benefits: ['Supports cognitive function', 'Rich in anthocyanins', 'Natural blue food color', 'Promotes hair growth', 'Eye health'],
    howToUse: 'Steep 8-10 flowers in hot water for 10 minutes. Add lemon for color change to violet.',
    shelfLife: '18 months in airtight container',
    tags: ['butterfly-pea', 'brain-health', 'blue-tea', 'ayurveda', 'natural-color'],
    isFeatured: true, isActive: true
  },
  {
    name: 'Organic Rose Milk',
    description: 'Authentic rose milk made from real Panneer Rose petals — not artificial essence. The traditional Tamil Nadu street-corner drink, now available farm-direct. Cooling, digestive, and naturally fragrant.',
    tagline: 'Authentic Tamil rose milk — real petals, real flavour',
    price: 140, oldPrice: 175,
    category: 'beverages', unit: 'g', weight: 100,
    badge: 'hot', section: 'bestseller',
    stock: 200, rating: 4.7, numReviews: 219,
    images: [{ url: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=500&auto=format&fit=crop' }],
    benefits: ['Natural rose fragrance', 'Cooling and digestive', 'No artificial essence', 'Traditional Tamil recipe'],
    howToUse: 'Steep 2 tbsp in 100ml hot water for 20 minutes. Mix with 200ml cold milk and sweeten.',
    shelfLife: '12 months in airtight container',
    tags: ['rose-milk', 'cooling', 'traditional', 'beverage'],
    isFeatured: true, isActive: true
  },
  {
    name: 'Hibiscus Sherbet',
    description: 'Traditional hibiscus sherbet concentrate made from sun-dried Hibiscus sabdariffa. Natural diuretic with organic acids that promote hydration and reduce body heat. 25-30mg natural Vitamin C per serving.',
    tagline: 'Summer\'s best natural cooler — 500-year history',
    price: 130, oldPrice: 165,
    category: 'beverages', unit: 'g', weight: 100,
    badge: 'sale', section: 'bestseller',
    stock: 180, rating: 4.6, numReviews: 143,
    images: [{ url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&auto=format&fit=crop' }],
    benefits: ['Natural cooling', 'Rich in Vitamin C', 'Reduces body heat', 'Natural diuretic'],
    howToUse: 'Simmer 2 tbsp in 250ml water for 15 minutes. Dilute 1:3 with chilled water. Add black salt and mint.',
    shelfLife: '12 months in airtight container',
    tags: ['sherbet', 'cooling', 'summer', 'vitamin-c', 'traditional'],
    isFeatured: false, isActive: true
  },
  {
    name: 'Idiyappam Flour',
    description: 'Hand-pounded rice flour for silk-soft idiyappam. Stone-ground at low temperature to preserve starch granule structure, natural oils, and B-vitamins. Superior water absorption creates delicate, structurally stable strings.',
    tagline: 'Hand-pounded flour for perfect silk-soft idiyappam',
    price: 160, oldPrice: 200,
    category: 'flour', unit: 'kg', weight: 1,
    badge: 'hot', section: 'bestseller',
    stock: 250, rating: 4.8, numReviews: 178,
    images: [{ url: 'https://images.unsplash.com/photo-1603046891744-5d7f1f4b79fa?w=500&auto=format&fit=crop' }],
    benefits: ['Hand-pounded, not machine-milled', 'Preserves natural nutrients', 'Superior texture', 'No additives'],
    howToUse: 'Mix 1 cup flour with 1 cup boiling water and ½ tsp salt. Press through idiyappam press. Steam 8-10 minutes.',
    shelfLife: '6 months in airtight container',
    tags: ['idiyappam', 'rice-flour', 'hand-pounded', 'stone-ground'],
    isFeatured: true, isActive: true
  },
  {
    name: 'Health Mix Powder',
    description: 'Protein-rich health mix made from 12 roasted grains including black urad dal, ragi, wheat, and millets. 25g protein per 100g. Rich in iron (7mg/100g), B-vitamins, calcium, and phosphorus. Ready in 3 minutes.',
    tagline: '12-grain protein blend — complete breakfast in 3 minutes',
    price: 175, oldPrice: 215,
    category: 'flour', unit: 'kg', weight: 1,
    badge: 'new', section: 'new',
    stock: 200, rating: 4.6, numReviews: 94,
    images: [{ url: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=500&auto=format&fit=crop' }],
    benefits: ['25g protein per 100g', '7mg iron per 100g', 'Rich in B-vitamins', 'Supports bone health', 'Ready in 3 minutes'],
    nutritionalInfo: { calories: 380, protein: 25, carbs: 55, fat: 6, fiber: 8 },
    howToUse: 'Mix 3 tbsp with 200ml warm milk or water. Add jaggery and cardamom. Serve immediately.',
    shelfLife: '6 months in airtight container',
    tags: ['health-mix', 'protein', 'multigrain', 'breakfast', 'iron-rich'],
    isFeatured: false, isActive: true
  },
  {
    name: 'Country Fig Powder',
    description: 'Sun-dried country fig (Ficus carica) powder — concentrated source of dietary fiber, iron, calcium, and natural digestive enzymes. Addresses constipation, iron deficiency, and chronic fatigue. 4,000 years of traditional use.',
    tagline: 'Nature\'s answer to constipation, anemia and low energy',
    price: 200, oldPrice: 250,
    category: 'other', unit: 'g', weight: 100,
    badge: 'new', section: 'new',
    stock: 120, rating: 4.7, numReviews: 61,
    images: [{ url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&auto=format&fit=crop' }],
    benefits: ['Relieves constipation', 'Rich in iron', 'Natural digestive enzymes', 'Supports energy levels', 'Calcium-rich'],
    nutritionalInfo: { calories: 249, protein: 3, carbs: 64, fat: 1, fiber: 10 },
    howToUse: '1 tsp in warm water with lemon and honey as morning tonic. Add to smoothies or porridge.',
    shelfLife: '12 months in airtight container',
    tags: ['fig', 'digestive', 'iron-rich', 'fiber', 'ayurveda'],
    isFeatured: false, isActive: true
  }
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to Atlas:', mongoose.connection.db.databaseName);

  // Clear existing products
  const deleted = await Product.deleteMany({});
  console.log(`🗑  Cleared ${deleted.deletedCount} existing products`);

  // Insert all products one by one so pre('save') slug hook fires
  const inserted = [];
  for (const data of products) {
    const p = await new Product(data).save();
    inserted.push(p);
  }
  console.log(`✅ Seeded ${inserted.length} products:\n`);

  inserted.forEach((p, i) => {
    console.log(`  ${String(i+1).padStart(2,'0')}. ${p.name} — ₹${p.price} [${p.category}] [${p.section}]`);
  });

  await mongoose.disconnect();
  console.log('\n✅ Done!');
}

seed().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
