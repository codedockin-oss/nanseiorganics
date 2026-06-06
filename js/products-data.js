/* ════════════════════════════════
   QUANTITY CONFIG BY CATEGORY
════════════════════════════════ */
const QUANTITY_CONFIG = {
  flowers:   { unit: 'piece', options: [1, 5, 10, 25, 50] },
  rice:      { unit: 'kg',    options: [0.25, 0.5, 1, 2, 5] },
  flour:     { unit: 'kg',    options: [0.25, 0.5, 1, 2, 5] },
  beverages: { unit: 'ml',    options: [250, 500, 1000, 2000] },
  other:     { unit: 'kg',    options: [0.25, 0.5, 1, 2] },
};

function getQtyConfig(category) {
  return QUANTITY_CONFIG[category] || { unit: 'piece', options: [1, 2, 3, 5] };
}

function formatQtyLabel(val, unit) {
  if (unit === 'ml') return val >= 1000 ? (val / 1000) + ' liter' + (val > 1000 ? 's' : '') : val + ' ml';
  if (unit === 'kg') return val + ' kg';
  return val + (val === 1 ? ' piece' : ' pieces');
}

/* Build <select> options HTML for a product */
function qtyOptionsHTML(category) {
  const cfg = getQtyConfig(category);
  return cfg.options.map((v, i) =>
    `<option value="${v}" ${i === 0 ? 'selected' : ''}>${formatQtyLabel(v, cfg.unit)}</option>`
  ).join('');
}

/* Calculate total price given base price, selected qty value, and unit */
function calcPrice(basePrice, qtyVal, unit) {
  // basePrice is per-kg / per-liter / per-piece
  // For ml: basePrice is per-liter equivalent (stored as per-unit in products)
  // Products store price per kg / per 100g-equivalent / per piece
  // We treat price as: rice/flour/other → per kg, beverages → per 1000ml, flowers → per piece
  let multiplier = parseFloat(qtyVal);
  if (unit === 'ml') multiplier = parseFloat(qtyVal) / 1000;
  return Math.round(basePrice * multiplier);
}

/* ════════════════════════════════
   PRODUCTS DATA
════════════════════════════════ */
const products = [
  /* ── RICE VARIETIES (7) ── */
  { id: 1,  name: "Karunguruvai Rice",               category: "rice",      price: 180, oldPrice: 220, rating: 4.7, reviews: 142, badge: "hot",  section: "bestseller", image: "https://ik.imagekit.io/bq9dscs4g/agro%20store/images/Rice%20category/Karunguruvai%20Rice/Karunguruvai%20Rice.png?updatedAt=1776255900602" },
  { id: 2,  name: "Karuppu Kavuni (Black Kavuni Rice)", category: "rice",   price: 220, oldPrice: 270, rating: 4.8, reviews: 198, badge: "hot",  section: "bestseller", image: "https://ik.imagekit.io/bq9dscs4g/agro%20store/images/Rice%20category/Karuppu%20Kavuni%20Rice/Karuppu%20Kavuni%20Rice.png?updatedAt=1776255900741" },
  { id: 3,  name: "Arubatham Kuruvai Rice",           category: "rice",      price: 160, oldPrice: 200, rating: 4.5, reviews: 87,  badge: "new",  section: "new",        image: "https://ik.imagekit.io/bq9dscs4g/agro%20store/Rice%20category/Arubatham%20Kuruvai%20Rice/Arubatham%20Kuruvai%20Rice.png" },
  { id: 4,  name: "Poongar Rice",                    category: "rice",      price: 200, oldPrice: 250, rating: 4.6, reviews: 113, badge: "sale", section: "bestseller", image: "https://ik.imagekit.io/bq9dscs4g/agro%20store/images/Rice%20category/Poongar%20Rice/Poongar%20Rice.png?updatedAt=1776255900674" },
  { id: 5,  name: "Mappillai Samba (Mani Samba) Rice", category: "rice",    price: 210, oldPrice: 260, rating: 4.7, reviews: 156, badge: "hot",  section: "bestseller", image: "https://ik.imagekit.io/bq9dscs4g/agro%20store/Rice%20category/MAPPILLAI%20SAMBA%20RICE/MAPPILLAI%20SAMBA%20RICE.png" },
  { id: 6,  name: "Iluppai Poo Samba Rice",           category: "rice",      price: 195, oldPrice: 240, rating: 4.5, reviews: 74,  badge: "new",  section: "new",        image: "https://ik.imagekit.io/bq9dscs4g/agro%20store/images/Rice%20category/Iluppai%20Poo%20Samba%20White%20Rice/Iluppai%20Poo%20Samba%20White%20Rice.png?updatedAt=1776255900667" },
  { id: 7,  name: "Vellai Kavuni (White Kavuni Rice)", category: "rice",     price: 190, oldPrice: 235, rating: 4.6, reviews: 91,  badge: "new",  section: "new",        image: "https://ik.imagekit.io/bq9dscs4g/agro%20store/images/Rice%20category/White%20Kavuni%20Rice/White%20Kavuni%20Rice.png?updatedAt=1776255898240" },
  /* ── DRIED FLOWERS (4) ── */
  { id: 8,  name: "Paneer Rose (Fragrant Rose)",      category: "flowers",   price: 150, oldPrice: 190, rating: 4.8, reviews: 204, badge: "hot",  section: "bestseller", image: "https://ik.imagekit.io/bq9dscs4g/agro%20store/Flower%20category/DRIED%20Panner%20Rose/DRIED%20Panneer%20Rose.png" },
  { id: 9,  name: "Hibiscus Flower",                 category: "flowers",   price: 120, oldPrice: 155, rating: 4.6, reviews: 167, badge: "sale", section: "bestseller", image: "https://ik.imagekit.io/bq9dscs4g/agro%20store/Flower%20category/DRIED%20HIBISCUS/DRIED%20HIBISCUS.png",
    benefitsImage: "https://ik.imagekit.io/bq9dscs4g/agro%20store/Flower%20category/DRIED%20HIBISCUS/DRIED%20HIBISCUS%20BENEFITS.png",
    propertiesImage: "https://ik.imagekit.io/bq9dscs4g/agro%20store/Flower%20category/DRIED%20HIBISCUS/DRIED%20HIBISCUS%20PROPERTIES.png" },
  { id: 10, name: "Aavaram Flower",                  category: "flowers",   price: 110, oldPrice: 145, rating: 4.5, reviews: 88,  badge: "new",  section: "new",        image: "https://ik.imagekit.io/bq9dscs4g/agro%20store/Flower%20category/Dried%20Avarampoo/DRIED%20Avarampoo.png",
    benefitsImage: "https://ik.imagekit.io/bq9dscs4g/agro%20store/Flower%20category/Dried%20Avarampoo/DRIED%20Avarampoo%20BENEFITS.png",
    propertiesImage: "https://ik.imagekit.io/bq9dscs4g/agro%20store/Flower%20category/Dried%20Avarampoo/DRIED%20Avarampoo%20PROPERTIES.png" },
  { id: 11, name: "Sangupoo", category: "flowers",   price: 180, oldPrice: 220, rating: 4.7, reviews: 132, badge: "hot",  section: "bestseller", image: "https://ik.imagekit.io/bq9dscs4g/agro%20store/Flower%20category/DRIED%20SANGUPOO/Dried%20SANGUPOO.png",
    benefitsImage: "https://ik.imagekit.io/bq9dscs4g/agro%20store/Flower%20category/DRIED%20SANGUPOO/Dried%20SANGUPOO%20BENEFITS.png",
    propertiesImage: "https://ik.imagekit.io/bq9dscs4g/agro%20store/Flower%20category/DRIED%20SANGUPOO/Dried%20SANGUPOO%20Properties.png" },
  /* ── BEVERAGES (2) ── */
  { id: 12, name: "Organic Real Rose Milk",          category: "beverages", price: 140, oldPrice: 175, rating: 4.7, reviews: 219, badge: "hot",  section: "bestseller", image: "https://images.unsplash.com/photo-1600891964092-4316c288032e?w=500&auto=format&fit=crop" },
  { id: 13, name: "Hibiscus Sherbet",                category: "beverages", price: 130, oldPrice: 165, rating: 4.6, reviews: 143, badge: "sale", section: "bestseller", image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&auto=format&fit=crop" },
  /* ── FLOUR VARIETIES (2) ── */
  { id: 14, name: "Hand-pounded Rice Idiyappam Flour", category: "flour",   price: 160, oldPrice: 200, rating: 4.8, reviews: 178, badge: "hot",  section: "bestseller", image: "https://images.unsplash.com/photo-1603046891744-5d7f1f4b79fa?w=500&auto=format&fit=crop" },
  { id: 15, name: "Natural Fig Powder",              category: "flour",   price: 175, oldPrice: 215, rating: 4.6, reviews: 94,  badge: "new",  section: "new",        image: "https://ik.imagekit.io/bq9dscs4g/agro%20store/Power%20category/NATURAL%20FIG%20POWDER/NATURAL%20FIG%20POWDER.png",
    benefitsImage: "https://ik.imagekit.io/bq9dscs4g/agro%20store/Power%20category/NATURAL%20FIG%20POWDER/NATURAL%20FIG%20POWDER%20BENEFITS.png",
    propertiesImage: "https://ik.imagekit.io/bq9dscs4g/agro%20store/Power%20category/NATURAL%20FIG%20POWDER/NATURAL%20FIG%20POWDER%20PROPERTIES.png" },
  { id: 17, name: "Black Urad Dal Health Mix Powder", category: "flour",   price: 175, oldPrice: 215, rating: 4.6, reviews: 94,  badge: "new",  section: "new",        image: "https://ik.imagekit.io/bq9dscs4g/agro%20store/Power%20category/black%20urad%20dal%20health%20mix%20powder/black%20urad%20dal%20health%20mix%20powder.png",
    benefitsImage: "https://ik.imagekit.io/bq9dscs4g/agro%20store/Power%20category/black%20urad%20dal%20health%20mix%20powder/black%20urad%20dal%20health%20mix%20powder%20BENEFITS.png",
    propertiesImage: "https://ik.imagekit.io/bq9dscs4g/agro%20store/Power%20category/black%20urad%20dal%20health%20mix%20powder/black%20urad%20dal%20health%20mix%20powder%20PROPERTIES.png" },
  /* ── OTHER (1) ── */
  { id: 16, name: "Natural Fig Powder",              category: "other",     price: 200, oldPrice: 250, rating: 4.7, reviews: 61,  badge: "new",  section: "new",        image: "https://ik.imagekit.io/bq9dscs4g/agro%20store/Power%20category/NATURAL%20FIG%20POWDER/NATURAL%20FIG%20POWDER.png",
    benefitsImage: "https://ik.imagekit.io/bq9dscs4g/agro%20store/Power%20category/NATURAL%20FIG%20POWDER/NATURAL%20FIG%20POWDER%20BENEFITS.png",
    propertiesImage: "https://ik.imagekit.io/bq9dscs4g/agro%20store/Power%20category/NATURAL%20FIG%20POWDER/NATURAL%20FIG%20POWDER%20PROPERTIES.png" },
];
