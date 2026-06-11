const fs = require('fs');
let html = fs.readFileSync('pages/product.html', 'utf8');

// ── 1. Fix ALL corrupted characters ──────────────────────────────────────────
html = html.replace(/\?"/g, '--');
html = html.replace(/A«/g, '½');
html = html.replace(/\u0007\?/g, '═');

// ── 2. Remove ALL external script tags ───────────────────────────────────────
html = html.replace(/<script src="\.\.\/js\/config\.js"><\/script>\s*/g, '');
html = html.replace(/<script src="\.\.\/js\/auth\.js"><\/script>\s*/g, '');
html = html.replace(/<script src="\.\.\/frontend\/js\/api\.js"[^>]*><\/script>\s*/g, '');
html = html.replace(/<script src="\.\.\/frontend\/js\/cart\.js"[^>]*><\/script>\s*/g, '');

// ── 3. Remove the old fallback stubs block entirely ───────────────────────────
html = html.replace(/<script>\s*\/\* Fallback stubs[\s\S]*?<\/script>\s*/g, '');

// Also remove the safety stubs block
html = html.replace(/<script>\s*\/\* Safety stubs[\s\S]*?_updateWishBadge[^\n]+\n[^\n]+\n<\/script>\s*/g, '');

// ── 4. Insert clean inline implementation right after <title> ─────────────────
const inlineScripts = `
<script>
/* ── Inline Cart / Wish / Counters (no backend required) ── */
window.API_BASE='';
window._updateBadge=function(){const c=JSON.parse(localStorage.getItem('cart')||'[]');const t=c.reduce((s,i)=>s+(i.qty||1),0);document.querySelectorAll('#cartCount').forEach(el=>{if(el)el.textContent=t;});};
window._updateWishBadge=function(){const w=JSON.parse(localStorage.getItem('wishlist')||'[]');document.querySelectorAll('#wishlistCount').forEach(el=>{if(el)el.textContent=w.length;});};
window.Cart={
  add(item){const c=JSON.parse(localStorage.getItem('cart')||'[]');const i=c.findIndex(x=>String(x.id)===String(item.id));if(i>-1)c[i].qty=(c[i].qty||1)+1;else c.push(Object.assign({},item,{qty:item.qty||1}));localStorage.setItem('cart',JSON.stringify(c));window._updateBadge();return Promise.resolve();},
  getItems(){return Promise.resolve(JSON.parse(localStorage.getItem('cart')||'[]'));},
  count(){const c=JSON.parse(localStorage.getItem('cart')||'[]');return Promise.resolve(c.reduce((s,i)=>s+(i.qty||1),0));},
  remove(id){const c=JSON.parse(localStorage.getItem('cart')||'[]').filter(x=>String(x.id)!==String(id));localStorage.setItem('cart',JSON.stringify(c));window._updateBadge();return Promise.resolve();}
};
window.Wish={
  has(id){const w=JSON.parse(localStorage.getItem('wishlist')||'[]');return Promise.resolve(w.some(x=>String(x)===String(id)));},
  toggle(id){const w=JSON.parse(localStorage.getItem('wishlist')||'[]');const idx=w.findIndex(x=>String(x)===String(id));let added;if(idx>-1){w.splice(idx,1);added=false;}else{w.push(id);added=true;}localStorage.setItem('wishlist',JSON.stringify(w));window._updateWishBadge();return Promise.resolve(added);},
  getIds(){return Promise.resolve(JSON.parse(localStorage.getItem('wishlist')||'[]'));}
};
/* Auth nav */
(function(){
  const user=JSON.parse(localStorage.getItem('nansai_user')||'null');
  const token=localStorage.getItem('nansai_token');
  document.addEventListener('DOMContentLoaded',function(){
    const link=document.getElementById('accountNavLink');
    const label=document.getElementById('accountLabel');
    const dropdown=document.getElementById('accountDropdown');
    if(user&&token&&link&&label){
      const firstName=(user.name||'User').split(' ')[0];
      label.textContent='Hi, '+firstName;
      link.removeAttribute('href');
      link.style.cursor='pointer';
      link.onclick=function(e){e.stopPropagation();if(dropdown)dropdown.style.display=dropdown.style.display==='block'?'none':'block';};
      document.addEventListener('click',function(){if(dropdown)dropdown.style.display='none';});
    }
  });
})();
</script>`;

// Insert after </title>
html = html.replace('</title>', '</title>' + inlineScripts);

// ── 5. Fix #mobBar CSS — remove display:none, add mobile media query ──────────
html = html.replace(
  /\/\* -- Mobile bar -- \*\/\s*#mobBar \{ display: none !important; \}/,
  `/* -- Mobile bar -- */
#mobBar { display: none; }
@media (max-width: 767px) { #mobBar { display: flex !important; } }`
);

// ── 6. Replace loadProduct with clean static-only version ────────────────────
const loadProductRegex = /\/\* --- LOAD - reads \?id= from URL --- \*\/\s*function loadProduct\(\)\s*\{[\s\S]*?^\}/m;
const newLoadProduct = `/* --- LOAD --- */
function loadProduct(){
  const id=new URLSearchParams(window.location.search).get('id')||'1';
  currentProduct=products.find(p=>String(p.id)===String(id))||products[0];
  document.title=currentProduct.name+' | NANSAI';
  try{render();}catch(e){console.error('render error',e);}
  try{renderRelated();}catch(e){}
  try{renderBlog();}catch(e){}
  try{updateCounters();}catch(e){}
  setTimeout(()=>{if(typeof observeBlogCards==='function')observeBlogCards();},150);
}`;
html = html.replace(loadProductRegex, newLoadProduct);

// ── 7. Deduplicate blank lines (more than 2 in a row → 1) ────────────────────
html = html.replace(/(\r?\n){3,}/g, '\n\n');

fs.writeFileSync('pages/product.html', html, 'utf8');
console.log('Done.');

// ── Verify ────────────────────────────────────────────────────────────────────
const checks = [
  ['config.js removed',    !html.includes('../js/config.js')],
  ['auth.js removed',      !html.includes('../js/auth.js')],
  ['api.js removed',       !html.includes('../frontend/js/api.js')],
  ['cart.js removed',      !html.includes('../frontend/js/cart.js')],
  ['Cart inlined',         html.includes('window.Cart={')],
  ['Wish inlined',         html.includes('window.Wish={')],
  ['mobBar media query',   html.includes('@media (max-width: 767px) { #mobBar { display: flex !important; } }')],
  ['loadProduct simple',   html.includes("products.find(p=>String(p.id)===String(id))")],
  ['No ?\" corruption',    !html.includes('?"')],
];
checks.forEach(([label,pass])=>console.log(pass?'  OK':'  FAIL',label));

// Syntax check the main script block
const scripts=[...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
const{execSync}=require('child_process');
scripts.forEach((sc,i)=>{
  try{
    fs.writeFileSync('_tmp_sc.js',sc,'utf8');
    execSync('node --check _tmp_sc.js',{encoding:'utf8'});
    console.log('  Script',i,'syntax OK');
  }catch(e){console.log('  Script',i,'SYNTAX ERROR:',e.stderr.split('\n')[1]||e.message);}
});
try{fs.unlinkSync('_tmp_sc.js');}catch(e){}
