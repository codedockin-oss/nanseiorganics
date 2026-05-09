require('dotenv').config();
const mongoose = require('mongoose');
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['1.1.1.1', '8.8.8.8']);

const Product = require('../models/Product');

const products = [

  /* ── RICE VARIETIES ── */
  {
    name: 'Karunguruvai Rice', category: 'rice', price: 180, oldPrice: 220,
    rating: 4.7, numReviews: 142, badge: 'hot', section: 'bestseller',
    stock: 100, unit: 'kg', weight: 1, isFeatured: true, isActive: true,
    tagline: 'Traditional medicinal rice from Tamil Nadu — low glycemic, high fiber, used in Siddha medicine.',
    description: 'Karunguruvai Rice is a traditional medicinal rice variety from Tamil Nadu, widely known for its powerful health benefits and natural nutrition. Used in Siddha medicine and traditional cooking, it is known for its low glycemic index and high fiber content. Karunguruvai rice is also widely used in preparing Karunguruvai rice kanji, which is considered highly beneficial for health.',
    images: [{ url: 'https://ik.imagekit.io/bq9dscs4g/agro%20store/images/Rice%20category/Karunguruvai%20Rice/Karunguruvai%20Rice.png?updatedAt=1776255900602' }],
    tags: ['rice', 'traditional', 'tamil', 'organic', 'low glycemic', 'siddha']
  },
  {
    name: 'Karuppu Kavuni Rice', category: 'rice', price: 220, oldPrice: 270,
    rating: 4.8, numReviews: 198, badge: 'hot', section: 'bestseller',
    stock: 80, unit: 'kg', weight: 1, isFeatured: true, isActive: true,
    tagline: 'Traditional black rice rich in antioxidants, fiber & nutrients — 100% natural and chemical-free.',
    description: 'Karuppu Kavuni Rice is a traditional black rice variety known for its rich nutritional value and health benefits. Sourced naturally and processed without chemicals, it is widely used in South Indian households for its medicinal properties. This rice is rich in iron, fiber, and antioxidants, making it a healthy choice for daily consumption.',
    images: [{ url: 'https://ik.imagekit.io/bq9dscs4g/agro%20store/images/Rice%20category/Karuppu%20Kavuni%20Rice/Karuppu%20Kavuni%20Rice.png?updatedAt=1776255900741' }],
    tags: ['rice', 'black rice', 'kavuni', 'antioxidant', 'iron']
  },
  {
    name: 'Arubatham Kuruvai Rice', category: 'rice', price: 160, oldPrice: 200,
    rating: 4.5, numReviews: 87, badge: 'new', section: 'new',
    stock: 120, unit: 'kg', weight: 1, isFeatured: false, isActive: true,
    tagline: '60-day traditional short-duration rice — light and easy to digest.',
    description: 'Arubatham Kuruvai is a 60-day short-duration traditional rice variety from Tamil Nadu. Known for its light texture and easy digestibility, it is ideal for everyday cooking and is especially recommended for the elderly and children.',
    images: [{ url: 'https://images.unsplash.com/photo-1514481538271-cf9f99627ab4?w=500&auto=format&fit=crop' }],
    tags: ['rice', 'traditional', 'kuruvai', 'soft', 'easy digest']
  },
  {
    name: 'Poongar Rice', category: 'rice', price: 200, oldPrice: 250,
    rating: 4.6, numReviews: 113, badge: 'sale', section: 'bestseller',
    stock: 90, unit: 'kg', weight: 1, isFeatured: true, isActive: true,
    tagline: 'Traditional red rice known for natural nutrients, good digestion & women\'s health — 100% organic and chemical-free.',
    description: 'Poongar Rice is a traditional red rice variety known for its natural nutritional value and health benefits. This organic rice is widely used in South India and is especially valued for supporting women\'s health and overall well-being. Rich in fiber and essential nutrients, making it a healthy choice for daily consumption.',
    images: [{ url: 'https://ik.imagekit.io/bq9dscs4g/agro%20store/images/Rice%20category/Poongar%20Rice/Poongar%20Rice.png?updatedAt=1776255900674' }],
    tags: ['rice', 'poongar', 'red rice', 'iron', 'women health']
  },
  {
    name: 'Mappillai Samba Rice', category: 'rice', price: 210, oldPrice: 260,
    rating: 4.7, numReviews: 156, badge: 'hot', section: 'bestseller',
    stock: 75, unit: 'kg', weight: 1, isFeatured: true, isActive: true,
    tagline: 'The bridegroom\'s rice — legendary strength-giving heritage variety.',
    description: 'Mappillai Samba, literally meaning bridegroom\'s rice, is a legendary Tamil Nadu heritage variety known for its strength-giving properties. Traditionally fed to bridegrooms before weddings, it is rich in iron, fiber and natural compounds that boost stamina and vitality.',
    images: [{ url: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=500&auto=format&fit=crop' }],
    tags: ['rice', 'mappillai samba', 'energy', 'traditional', 'stamina']
  },
  {
    name: 'Iluppai Poo Samba Rice', category: 'rice', price: 195, oldPrice: 240,
    rating: 4.5, numReviews: 74, badge: 'new', section: 'new',
    stock: 60, unit: 'kg', weight: 1, isFeatured: false, isActive: true,
    tagline: 'Traditional Tamil Nadu heritage rice — naturally aromatic, easy to digest and suitable for daily meals.',
    description: 'Iluppai Poo Samba White Rice is a traditional rice variety from Tamil Nadu, known for its natural aroma and soft texture. This rice is widely used in South Indian cooking and is valued for its easy digestion and health benefits.',
    images: [{ url: 'https://ik.imagekit.io/bq9dscs4g/agro%20store/images/Rice%20category/Iluppai%20Poo%20Samba%20White%20Rice/Iluppai%20Poo%20Samba%20White%20Rice.png?updatedAt=1776255900667' }],
    tags: ['rice', 'samba', 'fragrant', 'traditional', 'aromatic']
  },
  {
    name: 'Vellai Kavuni Rice', category: 'rice', price: 190, oldPrice: 235,
    rating: 4.6, numReviews: 91, badge: 'new', section: 'new',
    stock: 70, unit: 'kg', weight: 1, isFeatured: false, isActive: true,
    tagline: 'Traditional South Indian white rice — soft texture, easy digestion and a healthier alternative to polished white rice.',
    description: 'White Kavuni Rice is a traditional South Indian rice variety known for its soft texture, mild taste, and natural nutritional value. Widely used in daily cooking and considered a healthier alternative to polished white rice.',
    images: [{ url: 'https://ik.imagekit.io/bq9dscs4g/agro%20store/images/Rice%20category/White%20Kavuni%20Rice/White%20Kavuni%20Rice.png?updatedAt=1776255898240' }],
    tags: ['rice', 'kavuni', 'white', 'sticky', 'sweet']
  },

  /* ── DRIED FLOWERS ── */
  {
    name: 'Paneer Rose', category: 'flowers', price: 150, oldPrice: 190,
    rating: 4.8, numReviews: 204, badge: 'hot', section: 'bestseller',
    stock: 50, unit: 'g', weight: 100, isFeatured: true, isActive: true,
    tagline: 'Fragrant rose petals widely used for rose water, skin care, hair care and traditional herbal wellness.',
    description: 'Panneer Rose, also known as fragrant rose flower, is widely used in traditional Indian households for its natural aroma and health benefits. Panneer rose petals are commonly used to prepare panneer rose water, which is popular for face care and cooling drinks.',
    images: [{ url: 'https://images.unsplash.com/photo-1490750967868-88df5691cc5e?w=500&auto=format&fit=crop' }],
    tags: ['flowers', 'rose', 'paneer rose', 'dried', 'fragrant', 'skin care']
  },
  {
    name: 'Hibiscus Flower', category: 'flowers', price: 120, oldPrice: 155,
    rating: 4.6, numReviews: 167, badge: 'sale', section: 'bestseller',
    stock: 60, unit: 'g', weight: 100, isFeatured: true, isActive: true,
    tagline: 'Dried hibiscus flowers for herbal tea, hair care, skin care and natural home remedies.',
    description: 'Hibiscus dried flowers are widely used in herbal drinks, skincare, and traditional remedies. Known as Hibiscus sabdariffa, these flowers are popular for making hibiscus tea, which is valued for its refreshing taste and health benefits.',
    images: [{ url: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=500&auto=format&fit=crop' }],
    tags: ['flowers', 'hibiscus', 'vitamin C', 'hair care', 'tea', 'antioxidant']
  },
  {
    name: 'Aavaram Flower', category: 'flowers', price: 110, oldPrice: 145,
    rating: 4.5, numReviews: 88, badge: 'new', section: 'new',
    stock: 45, unit: 'g', weight: 100, isFeatured: false, isActive: true,
    tagline: 'Traditional Tanner\'s Cassia flower — cooling herbal tea, skin care and Ayurvedic wellness from Tamil Nadu.',
    description: 'Avarampoo, also known as Avaram Poo, is a traditional herbal flower widely used in Tamil Nadu for its natural health and skincare benefits. Avarampoo tea is especially popular for its natural cooling effect and is often used as a daily herbal drink.',
    images: [{ url: 'https://images.unsplash.com/photo-1490750967868-88df5691cc5e?w=500&auto=format&fit=crop' }],
    tags: ['flowers', 'aavaram', 'ayurvedic', 'skin', 'detox', 'cooling']
  },
  {
    name: 'Butterfly Pea Flower', category: 'flowers', price: 180, oldPrice: 220,
    rating: 4.7, numReviews: 132, badge: 'hot', section: 'bestseller',
    stock: 40, unit: 'g', weight: 50, isFeatured: true, isActive: true,
    tagline: 'Vivid blue Sangu Poo — color-changing herbal tea with memory, skin and hair benefits.',
    description: 'Butterfly Pea Flower, also known as Sangu Poo in Tamil, is a traditional herbal flower widely used for tea, skincare, and natural remedies. Known for its vibrant blue color, butterfly pea flower tea is popular for its health benefits and refreshing taste.',
    images: [{ url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&auto=format&fit=crop' }],
    tags: ['flowers', 'butterfly pea', 'blue', 'colour changing', 'tea', 'memory']
  },

  /* ── BEVERAGES ── */
  {
    name: 'Organic Rose Milk', category: 'beverages', price: 140, oldPrice: 175,
    rating: 4.7, numReviews: 219, badge: 'hot', section: 'bestseller',
    stock: 80, unit: 'ml', weight: 200, isFeatured: true, isActive: true,
    tagline: 'Pure rose milk mix — made from real Paneer Rose petals and natural sweeteners.',
    description: 'Our Organic Real Rose Milk mix is made from genuine Paneer Rose petals, natural sugar and a touch of cardamom. No artificial colors, no synthetic rose essence — just the pure, authentic taste of real rose milk as it should be.',
    images: [{ url: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=500&auto=format&fit=crop' }],
    tags: ['beverages', 'rose milk', 'organic', 'natural', 'traditional']
  },
  {
    name: 'Hibiscus Sherbet', category: 'beverages', price: 130, oldPrice: 165,
    rating: 4.6, numReviews: 143, badge: 'sale', section: 'bestseller',
    stock: 70, unit: 'ml', weight: 200, isFeatured: false, isActive: true,
    tagline: 'Traditional hibiscus sherbet mix — refreshing, tangy and naturally red.',
    description: 'Made from sun-dried Hibiscus sabdariffa flowers, natural sugar and a blend of cooling spices. This traditional sherbet mix makes a refreshing summer drink that is naturally rich in vitamin C and antioxidants.',
    images: [{ url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&auto=format&fit=crop' }],
    tags: ['beverages', 'hibiscus', 'sherbet', 'cooling', 'summer', 'vitamin C']
  },

  /* ── FLOUR VARIETIES ── */
  {
    name: 'Idiyappam Flour', category: 'flour', price: 160, oldPrice: 200,
    rating: 4.8, numReviews: 178, badge: 'hot', section: 'bestseller',
    stock: 100, unit: 'kg', weight: 1, isFeatured: true, isActive: true,
    tagline: 'Traditional hand-pounded rice flour — for soft, silky idiyappam.',
    description: 'Made from premium raw rice that is soaked, dried and hand-pounded using traditional methods. This idiyappam flour produces the softest, most silky string hoppers with a natural rice flavor that machine-milled flour cannot replicate.',
    images: [{ url: 'https://images.unsplash.com/photo-1603046891744-5d7f1f4b79fa?w=500&auto=format&fit=crop' }],
    tags: ['flour', 'idiyappam', 'rice flour', 'hand-pounded', 'traditional']
  },
  {
    name: 'Health Mix Powder', category: 'flour', price: 175, oldPrice: 215,
    rating: 4.6, numReviews: 94, badge: 'new', section: 'new',
    stock: 90, unit: 'kg', weight: 1, isFeatured: false, isActive: true,
    tagline: 'Protein-rich black urad dal health mix — for energy and strength.',
    description: 'A nutritious health mix made from roasted black urad dal (whole black gram) ground with traditional spices. Rich in protein, iron and B-vitamins, this mix can be consumed as a porridge, added to dosa batter or mixed with warm milk for a nutritious drink.',
    images: [{ url: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=500&auto=format&fit=crop' }],
    tags: ['flour', 'health mix', 'urad dal', 'protein', 'calcium']
  },

  /* ── OTHER ── */
  {
    name: 'Country Fig Powder', category: 'other', price: 200, oldPrice: 250,
    rating: 4.7, numReviews: 61, badge: 'new', section: 'new',
    stock: 55, unit: 'g', weight: 100, isFeatured: false, isActive: true,
    tagline: 'Sun-dried country fig powder — a natural digestive and energy tonic.',
    description: 'Made from sun-dried country figs (Ficus carica) ground into a fine powder. Country figs are known for their exceptional fiber content, natural digestive enzymes and high iron content. Used as a natural remedy for constipation, anemia and as an energy supplement.',
    images: [{ url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&auto=format&fit=crop' }],
    tags: ['other', 'fig', 'athi pazham', 'digestive', 'fibre', 'iron']
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');

    await Product.deleteMany({});
    console.log('🗑️  Cleared existing products');

    const withSlugs = products.map(p => ({
      ...p,
      slug: p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    }));

    const inserted = await Product.insertMany(withSlugs);
    console.log(`✅ Seeded ${inserted.length} Nansai Organics products`);

    await mongoose.disconnect();
    console.log('✅ Done!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err.message);
    process.exit(1);
  }
}

seed();
