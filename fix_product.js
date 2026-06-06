const fs = require('fs');
let html = fs.readFileSync('pages/product.html', 'utf8');

// ── 1. Remove external script tags ──────────────────────────────────────────
html = html.replace(/<script src="\.\.\/js\/config\.js"><\/script>\s*/g, '');
html = html.replace(/<script src="\.\.\/js\/auth\.js"><\/script>\s*/g, '');
html = html.replace(/<script src="\.\.\/frontend\/js\/api\.js"[^>]*><\/script>\s*/g, '');
html = html.replace(/<script src="\.\.\/frontend\/js\/cart\.js"[^>]*><\/script>\s*/g, '');

// ── 2. Replace the entire fallback-stubs block with full inline implementation
const oldBlock = /\/\* Fallback stubs[\s\S]*?_updateWishBadge=function\(\){[^}]+\}\};?\}\s*<\/script>/;

const newBlock = `window.API_BASE = '';

window._updateBadge = function(){
  const c = JSON.parse(localStorage.getItem('cart')||'[]');
  const t = c.reduce((s,i)=>s+(i.qty||1),0);
  document.querySelectorAll('#cartCount').forEach(el=>{ if(el) el.textContent=t; });
};
window._updateWishBadge = function(){
  const w = JSON.parse(localStorage.getItem('wishlist')||'[]');
  document.querySelectorAll('#wishlistCount').forEach(el=>{ if(el) el.textContent=w.length; });
};

window.Cart = {
  add(item){
    const c=JSON.parse(localStorage.getItem('cart')||'[]');
    const i=c.findIndex(x=>String(x.id)===String(item.id));
    if(i>-1) c[i].qty=(c[i].qty||1)+1; else c.push(Object.assign({},item,{qty:item.qty||1}));
    localStorage.setItem('cart',JSON.stringify(c));
    window._updateBadge();
    return Promise.resolve();
  },
  getItems(){ return Promise.resolve(JSON.parse(localStorage.getItem('cart')||'[]')); },
  count(){ const c=JSON.parse(localStorage.getItem('cart')||'[]'); return Promise.resolve(c.reduce((s,i)=>s+(i.qty||1),0)); },
  remove(id){ const c=JSON.parse(localStorage.getItem('cart')||'[]').filter(x=>String(x.id)!==String(id)); localStorage.setItem('cart',JSON.stringify(c)); window._updateBadge(); return Promise.resolve(); }
};

window.Wish = {
  has(id){ const w=JSON.parse(localStorage.getItem('wishlist')||'[]'); return Promise.resolve(w.some(x=>String(x)===String(id))); },
  toggle(id){
    const w=JSON.parse(localStorage.getItem('wishlist')||'[]');
    const idx=w.findIndex(x=>String(x)===String(id));
    let added;
    if(idx>-1){ w.splice(idx,1); added=false; } else { w.push(id); added=true; }
    localStorage.setItem('wishlist',JSON.stringify(w));
    window._updateWishBadge();
    return Promise.resolve(added);
  },
  getIds(){ return Promise.resolve(JSON.parse(localStorage.getItem('wishlist')||'[]')); }
};
</script>`;

html = html.replace(oldBlock, newBlock);

// ── 3. Fix #mobBar — remove display:none !important, show on mobile ──────────
html = html.replace(
  /\/\* -- Mobile bar -- \*\/\s*#mobBar \{ display: none !important; \}/,
  `/* -- Mobile bar -- */
#mobBar { display: none; }
@media (max-width: 767px) { #mobBar { display: flex !important; } }`
);

// ── 4. Fix loadProduct — skip API, go straight to static lookup ──────────────
const oldLoadProduct = /\/\* --- LOAD - reads \?id= from URL --- \*\/\nfunction loadProduct\(\) \{[\s\S]*?^\}/m;

const newLoadProduct = `/* --- LOAD - reads ?id= from URL --- */
function loadProduct() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id') || '1';
  currentProduct = products.find(p => String(p.id) === String(id)) || products[0];
  document.title = currentProduct.name + ' | NANSAI';
  try { render(); } catch(e) { console.error('render error', e); }
  try { renderRelated(); } catch(e) { console.error('renderRelated error', e); }
  try { renderBlog(); } catch(e) { console.error('renderBlog error', e); }
  try { updateCounters(); } catch(e) {}
  setTimeout(() => { if (typeof observeBlogCards === 'function') observeBlogCards(); }, 150);
}`;

html = html.replace(oldLoadProduct, newLoadProduct);

fs.writeFileSync('pages/product.html', html, 'utf8');
console.log('Done. Verifying...');

// Verify no external scripts remain
const checks = [
  ['config.js removed', !html.includes('../js/config.js')],
  ['auth.js removed', !html.includes('../js/auth.js')],
  ['api.js removed', !html.includes('../frontend/js/api.js')],
  ['cart.js removed', !html.includes('../frontend/js/cart.js')],
  ['Cart defined', html.includes('window.Cart = {')],
  ['Wish defined', html.includes('window.Wish = {')],
  ['mobBar media query', html.includes('#mobBar { display: flex !important; }')],
  ['loadProduct simplified', html.includes('products.find(p => String(p.id) === String(id))')],
];
checks.forEach(([label, pass]) => console.log(pass ? '  OK' : '  FAIL', label));
