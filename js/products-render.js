/* ════════════════════════════════
   CART & WISHLIST FUNCTIONS
════════════════════════════════ */
/* updateQty kept for backward compat but no longer used by cards */
function updateQty(id, delta) {}

function addToCart(id) { addToCartWithQty(id); }

function addToCartWithQty(id) {
  const p = products.find(x => x.id === id);
  const sel = document.getElementById('qty-' + id);
  const cfg = getQtyConfig(p.category);
  const qtyVal = sel ? parseFloat(sel.value) : cfg.options[0];
  const unit = cfg.unit;
  const totalPrice = calcPrice(p.price, qtyVal, unit);
  const label = formatQtyLabel(qtyVal, unit);
  const ex = cart.find(x => x.id === id && x.qtyVal === qtyVal);
  if (ex) { ex.qty += 1; }
  else cart.push({ id: p.id, name: p.name, basePrice: p.price, price: totalPrice, image: p.image, qty: 1, qtyVal, unit, qtyLabel: label });
  localStorage.setItem('cart', JSON.stringify(cart));
  syncCounters();
  showToast(`[[icon:shopping-cart]] ${p.name} (${label}) added!`);
  if (typeof ActivityAPI !== 'undefined') ActivityAPI.log('add_to_cart', `Added "${p.name}" to cart`, { productId: p.id, productName: p.name, price: totalPrice });
  const btn = document.getElementById('cartbtn-' + id);
  if (btn) {
    btn.classList.add('added');
    btn.innerHTML = '<span>&#10003; Added!</span>';
    setTimeout(() => {
      btn.classList.remove('added');
      btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 002 1.58h9.78a2 2 0 001.95-1.57l1.65-7.43H5.12"/></svg><span>Add</span>';
    }, 1800);
  }
}

function toggleWishlist(id, btn) {
  const idx = wishlist.indexOf(id);
  if (idx > -1) {
    wishlist.splice(idx, 1);
    if (btn) {
      btn.classList.remove('liked');
      btn.querySelector('svg').setAttribute('fill', 'none');
      btn.querySelector('svg').setAttribute('stroke', '#6b7280');
    }
    showToast('[[icon:heart-crack]] Removed from wishlist');
    const p = products.find(x => x.id === id);
    if (p && typeof ActivityAPI !== 'undefined') ActivityAPI.log('wishlist_remove', `Removed "${p.name}" from wishlist`, { productId: p.id, productName: p.name });
  } else {
    wishlist.push(id);
    if (btn) {
      btn.classList.add('liked');
      btn.querySelector('svg').setAttribute('fill', '#ef4444');
      btn.querySelector('svg').setAttribute('stroke', '#ef4444');
    }
    showToast('[[icon:heart]] Added to wishlist!');
    const p = products.find(x => x.id === id);
    if (p && typeof ActivityAPI !== 'undefined') ActivityAPI.log('wishlist_add', `Added "${p.name}" to wishlist`, { productId: p.id, productName: p.name });
  }
  localStorage.setItem('wishlist', JSON.stringify(wishlist));
  localStorage.setItem('nansei_wishlist', JSON.stringify(wishlist));
  syncCounters();
}

/* ════════════════════════════════
   PRODUCT CARD HTML
════════════════════════════════ */
function prodCardHTML(p, i) {
  const d = disc(p);
  const isW = wishlist.includes(p.id);
  const badgeEl = p.badge === 'hot'
    ? `<span class="absolute top-2.5 left-2.5 bg-orange-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full z-10">[[icon:flame]] HOT</span>`
    : p.badge === 'new'
      ? `<span class="absolute top-2.5 left-2.5 bg-green-700 text-white text-[10px] font-black px-2 py-0.5 rounded-full z-10">[[icon:sparkles]] NEW</span>`
      : `<span class="absolute top-2.5 left-2.5 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full z-10">${d}% OFF</span>`;
  
  return `<div class="prod-card bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg border border-gray-100 flex flex-col cursor-pointer transition-all duration-300 hover:-translate-y-1 animate-fadeUp" style="animation-delay:${i * .05}s" onclick="window.location.href='product.html?id=${p.id}'">
    <div class="relative overflow-hidden bg-green-50" style="aspect-ratio:1;">
      ${badgeEl}
      <button onclick="toggleWishlist(${p.id},this);event.stopPropagation()" class="wish-btn ${isW ? 'liked' : ''} absolute top-2.5 right-2.5 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-md hover:scale-110 transition z-10">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="${isW ? '#ef4444' : 'none'}" stroke="${isW ? '#ef4444' : '#6b7280'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6c-1.5-1.6-4-1.6-5.6 0L12 7.8 8.8 4.6c-1.5-1.6-4-1.6-5.6 0-1.6 1.7-1.6 4.3 0 6l8.8 9 8.8-9c1.6-1.7 1.6-4.3 0-6z"/></svg>
      </button>
      <img src="${p.image}" alt="${p.name}" loading="lazy" class="prod-img w-full h-full object-cover transition-transform duration-500"/>
    </div>
    <div class="p-2 sm:p-2.5 flex flex-col flex-1 gap-1.5">
      <span class="text-[9px] font-black text-green-600 uppercase tracking-wider">${p.category}</span>
      <h3 class="font-bold text-xs text-gray-900 leading-snug line-clamp-2">${p.name}</h3>
      <div class="flex items-center gap-1"><span class="text-amber-400 text-[10px]">${stars(p.rating)}</span><span class="text-gray-400 text-[10px]">${p.rating}</span></div>
      <div class="flex items-center gap-1.5 flex-wrap mt-auto"><span class="text-green-700 font-black text-sm">₹${p.price}</span><span class="text-gray-400 text-[10px] line-through">₹${p.oldPrice}</span><span class="bg-amber-50 text-amber-600 text-[9px] font-black px-1 py-0.5 rounded-full border border-amber-200">${d}% off</span></div>
      <div class="flex items-center gap-1.5 mt-1">
        <select id="qty-${p.id}" onclick="event.stopPropagation()" onchange="event.stopPropagation()" class="border border-gray-300 rounded-lg text-xs font-bold text-gray-700 bg-gray-50 outline-none cursor-pointer" style="height:28px;padding:0 4px;max-width:90px;">
          ${qtyOptionsHTML(p.category)}
        </select>
        <button id="cartbtn-${p.id}" onclick="addToCartWithQty(${p.id})" class="cart-btn flex-1 bg-green-800 hover:bg-green-700 text-white text-[11px] font-bold py-1.5 rounded-lg flex items-center justify-center gap-1 transition">
          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 002 1.58h9.78a2 2 0 001.95-1.57l1.65-7.43H5.12"/></svg>
          <span>Add</span>
        </button>
      </div>
    </div>
  </div>`;
}

/* ════════════════════════════════
   SECTION RENDERING
════════════════════════════════ */
const sectionMeta = {
  new:        { icon: '[[icon:sparkles]]', label: 'New Arrivals',    sub: 'Just landed — fresh from the farm',           accent: '#059669' },
  bestseller: { icon: '[[icon:flame]]', label: 'Best Sellers',    sub: 'Most loved by thousands of families',          accent: '#d97706' },
  rice:       { icon: '[[icon:wheat]]', label: 'Rice Varieties',  sub: 'Heritage & traditional rice from Tamil Nadu',  accent: '#65a30d' },
  flowers:    { icon: '[[icon:flower-2]]', label: 'Dried Flowers',   sub: 'Sun-dried, aromatic & medicinal flowers',      accent: '#db2777' },
  beverages:  { icon: '[[icon:glass-water]]', label: 'Beverages',       sub: 'Natural drinks crafted with pure ingredients', accent: '#0891b2' },
  flour:      { icon: '[[icon:bowl]]', label: 'Flour Varieties', sub: 'Hand-pounded & stone-ground flours',           accent: '#ca8a04' },
  other:      { icon: '[[icon:leaf]]', label: 'Other Products',  sub: 'More goodness from nature',                    accent: '#16a34a' },
};

function sectionHTML(key, list) {
  const m = sectionMeta[key];
  const preview = list.slice(0, 5);
  const rest = list.slice(5);
  
  return `<div class="prod-section" id="sec-${key}" style="margin-bottom:3.5rem;">
    <div style="display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:1.25rem;padding-bottom:.75rem;border-bottom:2px solid rgba(26,58,42,.07);">
      <div>
        <div style="display:inline-flex;align-items:center;gap:5px;background:rgba(26,58,42,.06);border-radius:30px;padding:3px 12px 3px 8px;margin-bottom:6px;">
          <span style="font-size:.85rem;">${m.icon}</span>
          <span style="font-size:.6rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:${m.accent};">${m.label}</span>
        </div>
        <h2 style="font-family:'Cormorant Garamond',serif;font-size:clamp(1.4rem,2.5vw,1.9rem);font-weight:700;color:#1a2416;">${m.label}</h2>
        <p style="color:#7a9980;font-size:.8rem;margin-top:2px;">${m.sub}</p>
      </div>
      <button onclick="filterProdsScroll('${key}')" style="font-size:.75rem;font-weight:700;color:${m.accent};border:1.5px solid ${m.accent}33;padding:6px 18px;border-radius:30px;background:transparent;cursor:pointer;font-family:'DM Sans',sans-serif;white-space:nowrap;flex-shrink:0;transition:all .2s;" onmouseover="this.style.background='${m.accent}11'" onmouseout="this.style.background='transparent'">
        View All (${list.length}) &#8250;
      </button>
    </div>
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5">
      ${preview.map((p, i) => prodCardHTML(p, i)).join('')}
    </div>
    ${rest.length ? `
    <div id="expand-grid-${key}" style="display:none;" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5 mt-4">
      ${rest.map((p, i) => prodCardHTML(p, i + 5)).join('')}
    </div>
    <div class="text-center mt-4" id="expand-btn-wrap-${key}">
      <button onclick="expandSection('${key}')" style="font-size:.8rem;font-weight:700;color:${m.accent};border:1.5px solid ${m.accent}33;padding:8px 28px;border-radius:30px;background:${m.accent}08;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .2s;">
        Show ${rest.length} more &#8595;
      </button>
    </div>` : ''}
  </div>`;
}

function expandSection(key) {
  const g = document.getElementById('expand-grid-' + key);
  const w = document.getElementById('expand-btn-wrap-' + key);
  if (g) g.style.display = 'grid';
  if (w) w.style.display = 'none';
}

const SECTION_ORDER = ['new', 'bestseller', 'rice', 'flowers', 'beverages', 'flour', 'other'];

function renderSections() {
  const wrap = document.getElementById('productSections');
  const grid = document.getElementById('productGrid');
  const empty = document.getElementById('emptyState');
  if (!wrap) return;
  wrap.style.display = 'block';
  if (grid) grid.style.display = 'none';
  empty?.classList.add('hidden');
  wrap.innerHTML = SECTION_ORDER.map(key => {
    const list = key === 'new' ? products.filter(p => p.section === 'new') : key === 'bestseller' ? products.filter(p => p.section === 'bestseller') : products.filter(p => p.category === key);
    return list.length ? sectionHTML(key, list) : '';
  }).join('');
  const cnt = document.getElementById('prodCount');
  if (cnt) cnt.textContent = products.length + ' products';
}

function renderProducts(list) {
  const wrap = document.getElementById('productSections');
  const grid = document.getElementById('productGrid');
  const empty = document.getElementById('emptyState');
  if (!grid) return;
  if (!list.length) {
    if (wrap) wrap.style.display = 'none';
    grid.style.display = 'none';
    empty?.classList.remove('hidden');
    return;
  }
  if (wrap) wrap.style.display = 'none';
  empty?.classList.add('hidden');
  grid.style.display = 'grid';
  grid.innerHTML = list.map((p, i) => prodCardHTML(p, i)).join('');
  const cnt = document.getElementById('prodCount');
  if (cnt) cnt.textContent = list.length + ' product' + (list.length !== 1 ? 's' : '');
}

/* ════════════════════════════════
   MOBILE PRODUCT RENDERING
════════════════════════════════ */
function renderMobProducts(list) {
  const grid = document.getElementById('mobProductGrid');
  const empty = document.getElementById('mobEmptyState');
  if (!grid) return;
  if (!list.length) {
    grid.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';
  grid.innerHTML = list.map((p, i) => {
    const d = disc(p);
    const isW = wishlist.includes(p.id);
    const badge = p.badge === 'hot' ? `<span style="position:absolute;top:6px;left:6px;background:#f97316;color:#fff;font-size:.58rem;font-weight:800;padding:2px 7px;border-radius:20px;z-index:10;">[[icon:flame]] HOT</span>` : p.badge === 'new' ? `<span style="position:absolute;top:6px;left:6px;background:#166534;color:#fff;font-size:.58rem;font-weight:800;padding:2px 7px;border-radius:20px;z-index:10;">[[icon:sparkles]] NEW</span>` : `<span style="position:absolute;top:6px;left:6px;background:#ef4444;color:#fff;font-size:.58rem;font-weight:800;padding:2px 7px;border-radius:20px;z-index:10;">${d}% OFF</span>`;
    
    return `<div style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;display:flex;flex-direction:column;cursor:pointer;" onclick="window.location.href='product.html?id=${p.id}'">
      <div style="position:relative;overflow:hidden;background:#f0fdf4;aspect-ratio:1;">
        ${badge}
        <button onclick="toggleWishlist(${p.id},this);event.stopPropagation()" class="wish-btn ${isW ? 'liked' : ''}" style="position:absolute;top:6px;right:6px;width:26px;height:26px;background:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.15);border:none;cursor:pointer;z-index:10;transition:transform .2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="${isW ? '#ef4444' : 'none'}" stroke="${isW ? '#ef4444' : '#6b7280'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6c-1.5-1.6-4-1.6-5.6 0L12 7.8 8.8 4.6c-1.5-1.6-4-1.6-5.6 0-1.6 1.7-1.6 4.3 0 6l8.8 9 8.8-9c1.6-1.7 1.6-4.3 0-6z"/></svg>
        </button>
        <img src="${p.image}" alt="${p.name}" loading="lazy" style="width:100%;height:100%;object-fit:cover;"/>
      </div>
      <div style="padding:.4rem .5rem;display:flex;flex-direction:column;gap:2px;flex:1;">
        <span style="font-size:.5rem;font-weight:800;color:#16a34a;text-transform:uppercase;letter-spacing:.08em;">${p.category}</span>
        <h3 style="font-size:.65rem;font-weight:700;color:#1a2416;line-height:1.2;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${p.name}</h3>
        <div style="display:flex;align-items:center;gap:3px;"><span style="color:#f59e0b;font-size:.52rem;">${stars(p.rating)}</span><span style="color:#9ca3af;font-size:.5rem;">${p.rating}</span></div>
        <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;margin-top:auto;">
          <span style="color:#166634;font-weight:800;font-size:.75rem;">₹${p.price}</span>
          <span style="color:#9ca3af;font-size:.55rem;text-decoration:line-through;">₹${p.oldPrice}</span>
          <span style="font-size:.5rem;font-weight:700;background:#fef3c7;color:#92400e;padding:1px 4px;border-radius:8px;">${d}% off</span>
        </div>
        <div style="display:flex;align-items:center;gap:4px;margin-top:3px;">
          <select id="qty-${p.id}" onclick="event.stopPropagation()" onchange="event.stopPropagation()" style="height:24px;border:1px solid #d1d5db;border-radius:6px;font-size:.6rem;font-weight:700;color:#374151;background:#f3f4f6;padding:0 3px;outline:none;cursor:pointer;max-width:80px;font-family:'DM Sans',sans-serif;">
            ${qtyOptionsHTML(p.category)}
          </select>
          <button id="cartbtn-${p.id}" onclick="addToCartWithQty(${p.id})" class="cart-btn" style="flex:1;background:#166534;color:#fff;font-size:.6rem;font-weight:700;padding:5px;border-radius:6px;border:none;cursor:pointer;font-family:'DM Sans',sans-serif;display:flex;align-items:center;justify-content:center;gap:2px;">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 002 1.58h9.78a2 2 0 001.95-1.57l1.65-7.43H5.12"/></svg>
            <span>Add</span>
          </button>
        </div>
      </div>
    </div>`;
  }).join('');
}
