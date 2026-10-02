/* ==========================================================================
   Nansei Organics — storefront logic shared by the home and shop pages:
   product cards, quantity picker, cart (localStorage "cart", read by checkout),
   wishlist, cart drawer, category filter and search. Data: js/catalog-data.js
   (replaced by the live API as soon as it answers).
   ========================================================================== */

/* the cart drawer is added to every page that loads this file */
(function () {
  if (document.getElementById('cartDrawer')) return;
  var wrap = document.createElement('div');
  wrap.innerHTML =
    '<div id="cartBackdrop" onclick="closeCart()" style="display:none;position:fixed;inset:0;background:rgba(8,18,12,.5);z-index:1400;backdrop-filter:blur(2px);"></div>' +
    '<div id="cartDrawer" role="dialog" aria-label="Your cart" style="position:fixed;top:0;right:0;bottom:0;width:min(400px,100vw);background:#fff;z-index:1401;transform:translateX(100%);transition:transform .4s cubic-bezier(.77,0,.18,1);display:flex;flex-direction:column;box-shadow:-8px 0 40px rgba(0,0,0,.18);">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;padding:1.1rem 1.25rem;border-bottom:1px solid rgba(201,168,76,.35);">' +
    '<h2 style="font-family:\'Cormorant Garamond\',serif;font-size:1.6rem;font-weight:700;color:#0f2218;margin:0;">Your Cart</h2>' +
    '<button onclick="closeCart()" aria-label="Close cart" style="width:36px;height:36px;border-radius:50%;border:1px solid rgba(15,34,24,.18);background:none;cursor:pointer;font-size:1rem;color:#0f2218;display:flex;align-items:center;justify-content:center;">&#10005;</button></div>' +
    '<div id="cartBody" style="flex:1;overflow-y:auto;padding:0 1.25rem;"></div>' +
    '<div id="cartFooter" style="display:none;padding:1rem 1.25rem;border-top:1px solid rgba(15,34,24,.1);"></div></div>';
  while (wrap.firstChild) document.body.appendChild(wrap.firstChild);
})();

/* ---- TOAST ---- */
function showToast(msg){
  let t=document.getElementById('toast');
  if(!t){ t=document.createElement('div'); t.id='toast'; t.setAttribute('role','status'); document.body.appendChild(t); }
  t.textContent=msg; t.classList.add('show');
  clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove('show'),2200);
}

/* ---- PRODUCTS (shared catalogue: js/catalog-data.js) ---- */
const products=(window.NS_PRODUCTS||[]).map(function(p){return Object.assign({},p);});

let wishlist=JSON.parse(localStorage.getItem('wishlist')||'[]');
let cart=JSON.parse(localStorage.getItem('cart')||'[]');

function stars(r){
  const val=Number(r)||0;
  const full=Math.floor(val);
  const half=val-full>=0.5?1:0;
  const empty=5-full-half;
  const sf='<svg width="11" height="11" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" stroke-width="1"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>';
  const sh='<svg width="11" height="11" viewBox="0 0 24 24"><defs><linearGradient id="hg"><stop offset="50%" stop-color="#f59e0b"/><stop offset="50%" stop-color="#d1d5db"/></linearGradient></defs><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill="url(#hg)" stroke="#f59e0b" stroke-width="1"/></svg>';
  const se='<svg width="11" height="11" viewBox="0 0 24 24" fill="#d1d5db" stroke="#d1d5db" stroke-width="1"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>';
  return sf.repeat(full)+sh.repeat(half)+se.repeat(empty);
}
function ratingText(p){const count=Number(p.reviews||p.numReviews||0);return count>0?Number(p.rating||0).toFixed(1)+' ('+count+')':'New';}
function disc(p){return Math.round((1-p.price/p.oldPrice)*100);}

function saveCart(){
  localStorage.setItem('cart',JSON.stringify(cart));
  syncCounters();
  // Sync to backend if logged in
  if(typeof CartAPI!=='undefined'&&localStorage.getItem('nansai_token')){
    cart.forEach(i=>{
      if(CartAPI.set) CartAPI.set(String(i.id),i.qty||1).catch(()=>{});
      else CartAPI.add(String(i.id),i.qty||1,i.selectedPrice??i.price,{selectedQuantity:i.selectedQuantity||i.qtyLabel,selectedUnit:i.selectedUnit||i.unit,selectedPrice:i.selectedPrice??i.price}).catch(()=>{});
    });
  }
}
function syncCounters(){
  const total=cart.reduce((s,i)=>s+(i.qty||1),0);
  document.querySelectorAll('#cartCount').forEach(el=>{if(el)el.textContent=total;});
  document.querySelectorAll('#wishlistCount').forEach(el=>{if(el)el.textContent=wishlist.length;});
  const mbc=document.getElementById('mobBarCartCount'); if(mbc) mbc.textContent=total;
  const mbw=document.getElementById('mobBarWishCount'); if(mbw) mbw.textContent=wishlist.length;
}

/* ---- PRODUCT CARD HTML ---- */
const floatClasses=['prod-float-1','prod-float-2','prod-float-3','prod-float-4','prod-float-5','prod-float-6'];
function prodCardHTML(p,i){
  const d=disc(p);
  const isW=wishlist.includes(p.id);
  const badgeEl=p.badge==='hot'
    ?`<span style="position:absolute;top:10px;left:10px;background:#f97316;color:#fff;font-size:.58rem;font-weight:800;padding:2px 9px;border-radius:20px;z-index:10;">${nanseiIcon('flame').replace('<svg','<svg width="11" height="11" style="vertical-align:-1px"')} HOT</span>`
    :p.badge==='new'
    ?`<span style="position:absolute;top:10px;left:10px;background:#166534;color:#fff;font-size:.58rem;font-weight:800;padding:2px 9px;border-radius:20px;z-index:10;">${nanseiIcon('sparkle').replace('<svg','<svg width="11" height="11" style="vertical-align:-1px"')} NEW</span>`
    :`<span style="position:absolute;top:10px;left:10px;background:#ef4444;color:#fff;font-size:.58rem;font-weight:800;padding:2px 9px;border-radius:20px;z-index:10;">${d}% OFF</span>`;
  const fc=floatClasses[i%floatClasses.length];
  return `<div class="prod-card bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col cursor-pointer ${fc}" style="flex-shrink:0;width:100%;overflow:visible;position:relative;z-index:1;" onclick="if(!event.defaultPrevented)window.location.href='product.html?id=${p.id}'">
    <div class="prod-img-wrap" style="border-radius:12px 12px 0 0;">
      ${badgeEl}
      <button onclick="toggleWish(${p.id},this);event.preventDefault();event.stopPropagation()" style="position:absolute;top:8px;right:8px;width:36px;height:36px;background:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(0,0,0,.18);border:none;cursor:pointer;z-index:10;transition:transform .2s;" onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="${isW?'#ef4444':'none'}" stroke="${isW?'#ef4444':'#ef4444'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transition:fill .2s,stroke .2s;"><path d="M20.8 4.6c-1.5-1.6-4-1.6-5.6 0L12 7.8 8.8 4.6c-1.5-1.6-4-1.6-5.6 0-1.6 1.7-1.6 4.3 0 6l8.8 9 8.8-9c1.6-1.7 1.6-4.3 0-6z"/></svg>
      </button>
      <img src="${p.image}" alt="${p.name}" loading="lazy" class="prod-img"/>
    </div>
    <div class="prod-info" style="overflow:visible;">
      <span style="font-size:.68rem;font-weight:400;color:#16a34a;text-transform:uppercase;letter-spacing:.1em;">${p.category}</span>
      <h3 style="font-size:.95rem;font-weight:700;color:#1a2416;line-height:1.3;font-family:'Inter',sans-serif;">${p.name}</h3>
      <div style="display:flex;align-items:center;gap:3px;overflow:hidden;"><span style="display:flex;align-items:center;gap:1px;flex-shrink:0;">${stars(p.rating)}</span><span style="color:#9ca3af;font-size:.72rem;margin-left:2px;font-family:'Inter',sans-serif;" class="rating-text">${ratingText(p)}</span></div>
      <div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-top:2px;">
        <span data-card-price style="color:#166534;font-weight:900;font-size:1.1rem;font-family:'Inter',sans-serif;">₹${p.price}</span>
        <span data-card-old style="color:#9ca3af;font-size:.78rem;text-decoration:line-through;font-family:'Inter',sans-serif;">₹${p.oldPrice}</span>
        <span data-card-disc style="background:#fef3c7;color:#92400e;font-size:.62rem;font-weight:700;padding:2px 6px;border-radius:20px;font-family:'Inter',sans-serif;">${d}% off</span>
      </div>
      <div id="cardbtn-area-${p.id}" class="prod-btn-area" style="margin-top:auto;">
        <button id="cartbtn-${p.id}" onclick="startQtySelect(${p.id},this);event.preventDefault();event.stopPropagation()" style="width:100%;background:var(--forest-deep);color:#fff;font-size:.72rem;font-weight:700;padding:9px 4px;border-radius:10px;border:none;cursor:pointer;font-family:'Roboto',sans-serif;display:flex;align-items:center;justify-content:center;gap:6px;transition:background .2s,transform .15s;box-shadow:0 3px 10px rgba(15,34,24,.25);" onmouseover="this.style.background='var(--forest-mid)';this.style.transform='translateY(-1px)'" onmouseout="this.style.background='var(--forest-deep)';this.style.transform='translateY(0)'">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 002 1.58h9.78a2 2 0 001.95-1.57l1.65-7.43H5.12"/></svg>
          Add to Cart
        </button>
      </div>
    </div>
  </div>`;
}

function renderSections(){ renderFlat(products,'all'); }

function renderFlat(list){
  const grid=document.getElementById('productGrid');
  const empty=document.getElementById('emptyState');
  if(!grid)return;
  const cnt=document.getElementById('prodCountText'); if(cnt) cnt.textContent=products.length;
  if(!list.length){ grid.innerHTML=''; grid.style.display='none'; empty.style.display='block'; return; }
  empty.style.display='none';
  grid.style.display='';
  grid.innerHTML=list.map(prodCardHTML).join('');
}

/* ---- QUANTITY CONFIG ---- */
const QTY_CFG={
  flowers:   {unit:'pcs',  options:[1,5,10,25]},
  rice:      {unit:'kg',   options:[0.25,0.5,1,2]},
  flour:     {unit:'kg',   options:[0.25,0.5,1,2]},
  beverages: {unit:'ml',   options:[250,500,1000,2000]},
  other:     {unit:'kg',   options:[0.25,0.5,1,2]},
};
function getQtyCfg(cat){ return QTY_CFG[cat]||{unit:'pcs',options:[1,2,3,5]}; }
function fmtQty(v,unit){
  if(unit==='ml') return v>=1000?(v/1000)+'L':v+'ml';
  if(unit==='kg') return v+'kg';
  return v+(v===1?' pc':' pcs');
}

const cardState={};

function animateCartIcon(){
  const targets=Array.from(document.querySelectorAll('[data-cart-animation-target],button[onclick*="openCart"],a[href="checkout.html"],a[href$="/checkout.html"]')).filter(el=>el.offsetParent!==null);
  const cartIcon=targets[0];
  if(!cartIcon)return;
  cartIcon.classList.remove('cart-fly');
  void cartIcon.offsetWidth;
  cartIcon.classList.add('cart-fly');
  cartIcon.addEventListener('animationend',()=>cartIcon.classList.remove('cart-fly'),{once:true});
}

function startQtySelect(id,triggerBtn){
  const p=products.find(x=>x.id===id); if(!p)return;
  const cfg=getQtyCfg(p.category);
  cardState[id]={qty:cfg.options[0],unit:cfg.unit};
  const area=triggerBtn?triggerBtn.closest('.prod-btn-area'):document.getElementById('cardbtn-area-'+id);
  const card=area?.closest('.prod-card');
  if(card){
    card.classList.add('card-lifted');
    card.style.zIndex='10';
  }
  const pills=cfg.options.map((v,i)=>
    `<button class="qty-pill${i===0?' selected':''}" onclick="selectPill(${id},${v},this);event.preventDefault();event.stopPropagation()">${fmtQty(v,cfg.unit)}</button>`
  ).join('');
  area.innerHTML=`<div class="qty-selector-area" onclick="event.preventDefault();event.stopPropagation()">
    <div class="qty-grid">${pills}</div>
    <button id="confirm-btn-${id}" class="qty-cart-btn" onclick="confirmAddToCart(${id},this);event.preventDefault();event.stopPropagation()">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 002 1.58h9.78a2 2 0 001.95-1.57l1.65-7.43H5.12"/></svg>
    </button>
  </div>
  <a href="product.html?id=${p.id}" onclick="event.stopPropagation()" style="display:block;width:100%;text-align:center;font-size:.68rem;font-weight:600;color:var(--forest-leaf);padding:5px 0 2px;text-decoration:none;letter-spacing:.03em;border-top:1px solid rgba(26,58,42,.07);margin-top:5px;transition:color .2s;" onmouseover="this.style.color='var(--forest-deep)'" onmouseout="this.style.color='var(--forest-leaf)'">View Product &rarr;</a>`;
}

function selectPill(id,val,btn){
  if(!cardState[id])return;
  cardState[id].qty=val;
  btn.closest('.qty-selector-area').querySelectorAll('.qty-pill').forEach(p=>p.classList.remove('selected'));
  btn.classList.add('selected');
  // update price on card dynamically
  const p=products.find(x=>x.id===id); if(!p)return;
  const {unit}=cardState[id];
  const totalPrice=unit==='ml'?Math.round(p.price*(val/1000)):Math.round(p.price*val);
  const oldTotal=unit==='ml'?Math.round(p.oldPrice*(val/1000)):Math.round(p.oldPrice*val);
  const d=Math.round((1-p.price/p.oldPrice)*100);
  const card=btn.closest('.prod-card'); if(!card)return;
  const priceEl=card.querySelector('[data-card-price]');
  const oldEl=card.querySelector('[data-card-old]');
  const discEl=card.querySelector('[data-card-disc]');
  if(priceEl) priceEl.textContent='₹'+totalPrice;
  if(oldEl)   oldEl.textContent='₹'+oldTotal;
  if(discEl)  discEl.textContent=d+'% off';
}

function confirmAddToCart(id,triggerBtn){
  const p=products.find(x=>x.id===id); if(!p)return;
  const {qty,unit}=cardState[id]||{qty:1,unit:'pcs'};
  const totalPrice=unit==='ml'?Math.round(p.price*(qty/1000)):Math.round(p.price*qty);
  const label=fmtQty(qty,unit);
  const ex=cart.find(i=>i.id===id&&i.qtyLabel===label);
  if(ex){ex.qty+=1;}else cart.push({id,name:p.name,price:totalPrice,basePrice:p.price,image:p.image,qty:1,qtyVal:qty,qtyLabel:label,unit,selectedQuantity:label,selectedUnit:unit,selectedPrice:totalPrice});
  saveCart();
  showToast(`${p.name} (${fmtQty(qty,unit)}) added to cart`);
  const confirmBtn=triggerBtn||null;
  if(confirmBtn){
    confirmBtn.classList.add('done');
    confirmBtn.innerHTML='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
    confirmBtn.classList.add('btn-bounce');
    confirmBtn.addEventListener('animationend',()=>confirmBtn.classList.remove('btn-bounce'),{once:true});
  }
  animateCartIcon();
  const area=triggerBtn?triggerBtn.closest('.prod-card')?.querySelector('.prod-btn-area'):null;
  const card=area?.closest('.prod-card');
  setTimeout(()=>{
    if(card){
      card.classList.remove('card-lifted');
      card.style.zIndex='1';
      if(card._floatClass) card.classList.add(card._floatClass);
    }
    area.innerHTML=`<button id="cartbtn-${id}" onclick="startQtySelect(${id},this);event.preventDefault();event.stopPropagation()" style="width:100%;background:var(--forest-deep);color:#fff;font-size:.72rem;font-weight:700;padding:9px 4px;border-radius:10px;border:none;cursor:pointer;font-family:'Roboto',sans-serif;display:flex;align-items:center;justify-content:center;gap:6px;transition:background .2s,transform .15s;box-shadow:0 3px 10px rgba(15,34,24,.25);" onmouseover="this.style.background='var(--forest-mid)';this.style.transform='translateY(-1px)'" onmouseout="this.style.background='var(--forest-deep)';this.style.transform='translateY(0)'">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 002 1.58h9.78a2 2 0 001.95-1.57l1.65-7.43H5.12"/></svg>
      Add to Cart
    </button>`;
  },1600);
}

function addDirectToCart(id, btn) {
  var p = products.find(function(x){ return x.id === id; });
  if (!p) return;
  var sel = document.getElementById('qty-' + id);
  var cfg = getQtyCfg(p.category);
  var qtyVal = sel ? parseFloat(sel.value) : cfg.options[0];
  var unit = cfg.unit;
  var totalPrice = unit === 'ml' ? Math.round(p.price * (qtyVal / 1000)) : Math.round(p.price * qtyVal);
  var label = fmtQty(qtyVal, unit);
  var ex = cart.find(function(i){ return i.id === id && i.qtyLabel === label; });
  if (ex) { ex.qty += 1; } else { cart.push({id:id, name:p.name, price:totalPrice, image:p.image, qty:1, qtyVal:qtyVal, qtyLabel:label, unit:unit, selectedQuantity:label, selectedUnit:unit, selectedPrice:totalPrice}); }
  saveCart();
  showToast(p.name + ' (' + label + ') added to cart!');
  if (btn) {
    var orig = btn.innerHTML;
    btn.innerHTML = 'Added!';
    btn.style.background = '#16a34a';
    setTimeout(function(){ btn.innerHTML = orig; btn.style.background = ''; }, 1800);
  }
}
function toggleWish(id,btn){
  const idx=wishlist.indexOf(id);
  const svg=btn?.querySelector('svg');
  if(idx>-1){
    wishlist.splice(idx,1);
    if(svg){ svg.setAttribute('fill','none'); svg.setAttribute('stroke','#9ca3af'); }
    if(btn){ btn.style.transform='scale(1.3)'; setTimeout(()=>btn.style.transform='scale(1)',200); }
    showToast('Removed from wishlist');
    if(typeof WishlistAPI!=='undefined'&&localStorage.getItem('nansai_token'))WishlistAPI.remove(String(id)).catch(()=>{});
  } else {
    wishlist.push(id);
    if(svg){ svg.setAttribute('fill','#ef4444'); svg.setAttribute('stroke','#ef4444'); }
    if(btn){ btn.style.transform='scale(1.4)'; setTimeout(()=>btn.style.transform='scale(1)',250); }
    showToast('Added to wishlist!');
    if(typeof WishlistAPI!=='undefined'&&localStorage.getItem('nansai_token'))WishlistAPI.add(String(id)).catch(()=>{});
  }
  localStorage.setItem('wishlist',JSON.stringify(wishlist));syncCounters();
}

/* ---- CATEGORY FILTER ---- */
const deskCatMeta={all:{label:'All Products',sub:'All 16 farm-fresh certified products'},new:{label:'New Arrivals',sub:'Just landed \u2014 fresh from the farm'},bestseller:{label:'Best Sellers',sub:'Most loved by thousands of families'},rice:{label:'Rice Varieties',sub:'Heritage & traditional rice from Tamil Nadu'},flowers:{label:'Dried Flowers',sub:'Sun-dried, aromatic & medicinal flowers'},beverages:{label:'Beverages',sub:'Natural drinks crafted with pure ingredients'},flour:{label:'Flour Varieties',sub:'Hand-pounded & stone-ground flours'},other:{label:'Other Products',sub:'More goodness from nature'}};

function deskCatClick(el,cat){
  document.querySelectorAll('.fpill').forEach(i=>i.classList.remove('active'));
  el.classList.add('active');
  filterProds(cat);
  document.getElementById('products')?.scrollIntoView({behavior:'smooth',block:'start'});
}
function filterProds(cat){
  window.__activeCat=cat;
  if(cat==='all'){renderSections();return;}
  let list;
  if(cat==='new') list=products.filter(p=>p.section==='new');
  else if(cat==='bestseller') list=products.filter(p=>p.section==='bestseller');
  else list=products.filter(p=>p.category===cat);
  renderFlat(list,cat);
}
function searchMatches(q){
  const term=String(q||'').trim().toLowerCase();
  if(!term) return [];
  return products.filter(p=>p.name.toLowerCase().includes(term)||p.category.toLowerCase().includes(term)||(p.description||p.desc||'').toLowerCase().includes(term)||(p.tagline||'').toLowerCase().includes(term));
}
function hideSearchSuggestions(){
  document.querySelectorAll('.search-suggestions').forEach(el=>{
    el.classList.remove('show');
    el.innerHTML='';
  });
}
function renderSearchSuggestions(input,matches){
  const box=input?.id==='mobSearchInput'?document.getElementById('mobSearchSuggestions'):document.getElementById('searchSuggestions');
  if(!box) return;
  if(!matches.length){ box.classList.remove('show'); box.innerHTML=''; return; }
  box.innerHTML=matches.slice(0,6).map(p=>`
    <button type="button" class="suggestion-item" onclick="selectSearchSuggestion(${p.id})">
      <img src="${p.image}" alt="${p.name}" loading="lazy">
      <span style="min-width:0;">
        <span class="suggestion-name">${p.name}</span>
        <span class="suggestion-meta">${p.category}</span>
      </span>
      <span class="suggestion-price">₹${p.price}</span>
    </button>
  `).join('');
  box.classList.add('show');
}
function handleSearchInput(input){
  const q=input.value.trim();
  const deskInp=document.getElementById('searchInput');
  const mobInp=document.getElementById('mobSearchInput');
  if(deskInp && input!==deskInp) deskInp.value=q;
  if(mobInp && input!==mobInp) mobInp.value=q;
  const hasGrid=!!document.getElementById('productGrid');
  if(!q){ hideSearchSuggestions(); if(hasGrid&&typeof window.nanseiShowAll==='function') window.nanseiShowAll(); else if(hasGrid) renderSections(); return; }
  const matches=searchMatches(q);
  renderSearchSuggestions(input,matches);
  if(hasGrid) renderFlat(matches,null);
}
function selectSearchSuggestion(id){
  const p=products.find(x=>x.id===id); if(!p)return;
  const deskInp=document.getElementById('searchInput');
  const mobInp=document.getElementById('mobSearchInput');
  if(deskInp) deskInp.value=p.name;
  if(mobInp) mobInp.value=p.name;
  hideSearchSuggestions();
  window.location.href='product.html?id='+encodeURIComponent(p.id);
}
function focusMobileSearch(event){
  if(event?.target?.closest('button,.suggestion-item')) return;
  const input=document.getElementById('mobSearchInput');
  if(!input) return;
  try {
    input.focus({preventScroll:true});
  } catch (_) {
    input.focus();
  }
  const end=input.value.length;
  try { input.setSelectionRange(end,end); } catch (_) {}
  if(input.value.trim()) renderSearchSuggestions(input,searchMatches(input.value));
}
function doSearch(shouldScroll = true){
  const deskInp = document.getElementById('searchInput');
  const mobInp = document.getElementById('mobSearchInput');
  const active = document.activeElement === mobInp ? mobInp : deskInp;
  const q = (active?.value || deskInp?.value || mobInp?.value || '').trim().toLowerCase();
  hideSearchSuggestions();
  if(!document.getElementById('productGrid')){            // no grid on this page (home): the shop page shows the results
    window.location.href='shop.html'+(q?'?search='+encodeURIComponent(q):'');
    return;
  }
  if(!q){ if(typeof window.nanseiShowAll==='function') window.nanseiShowAll(); else renderSections(); return; }
  if(deskInp) deskInp.value = q;
  if(mobInp) mobInp.value = q;
  const list=searchMatches(q);
  renderFlat(list,null);
  if(shouldScroll) (document.getElementById('shopTop')||document.getElementById('products'))?.scrollIntoView({behavior:'smooth',block:'start'});
}
document.addEventListener('click',e=>{
  if(!e.target.closest('.ns-search')&&!e.target.closest('.ns-msearch')) hideSearchSuggestions();
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape') hideSearchSuggestions();
});

/* ---- INIT ---- */
if(document.getElementById('productGrid')&&!window.NS_MANUAL_RENDER) renderSections();
syncCounters();


/* ---- LOAD PRODUCTS FROM API ---- */
(function(){
  const base = window.API_BASE || 'http://localhost:5000/api';
  fetch(base + '/products?limit=100')
    .then(r => r.json())
    .then(data => {
      if (!data.success || !data.products?.length) return;
      // Map API products to the same shape as static products
      const apiProds = data.products.map(p => ({
        id:       p._id,
        name:     p.name,
        category: p.category,
        price:    p.price,
        oldPrice: p.oldPrice || Math.round(p.price * 1.25),
        rating:   Number(p.numReviews || 0) > 0 ? Number(p.rating || 0) : 0,
        reviews:  p.numReviews || 0,
        badge:    p.badge || 'new',
        section:  p.section || 'category',
        image:    p.images?.[0]?.url || p.image || '',
        tagline:  p.tagline || '',
        desc:     p.description || '',
      }));
      // Replace static products array with API data
      products.length = 0;
      apiProds.forEach(p => products.push(p));
      syncCounters();
      document.dispatchEvent(new CustomEvent('nansei:products'));
      if(document.getElementById('productGrid')&&!window.NS_MANUAL_RENDER) filterProds(window.__activeCat || 'all');
      
    })
    .catch(() => { /* silently keep static data on error */ });
})();

/* ---- AUTO-SEARCH FROM URL PARAM ---- */
(function(){
  const q = new URLSearchParams(window.location.search).get('search');
  if(!q) return;
  const inp = document.getElementById('searchInput');
  const mob = document.getElementById('mobSearchInput');
  if(inp) inp.value = q;
  if(mob) mob.value = q;
  doSearch();
  setTimeout(()=>document.getElementById('products')?.scrollIntoView({behavior:'smooth'}), 300);
})();

/* ---- CART DRAWER ---- */
function openCart(){
  renderCartDrawer();
  document.getElementById('cartDrawer').style.transform='translateX(0)';
  document.getElementById('cartBackdrop').style.display='block';
  document.body.style.overflow='hidden';
}
function closeCart(){
  document.getElementById('cartDrawer').style.transform='translateX(100%)';
  document.getElementById('cartBackdrop').style.display='none';
  document.body.style.overflow='';
}
function renderCartDrawer(){
  const body=document.getElementById('cartBody');
  const footer=document.getElementById('cartFooter');
  if(!body)return;
  if(!cart.length){
    body.innerHTML='<div style="text-align:center;padding:3rem 1rem;"><div style="font-size:3rem;margin-bottom:.75rem;">'+nanseiIcon('bag')+'</div><p style="color:#9ca3af;font-weight:600;">Your cart is empty</p><button onclick="closeCart();document.getElementById(\'products\').scrollIntoView({behavior:\'smooth\'})" style="margin-top:1rem;background:var(--forest-deep);color:#fff;padding:.6rem 1.4rem;border-radius:8px;font-size:.8rem;font-weight:700;border:none;cursor:pointer;">Shop Now</button></div>';
    if(footer)footer.style.display='none';
    return;
  }
  const total=cart.reduce((s,i)=>s+i.price*(i.qty||1),0);
  body.innerHTML=cart.map((item,idx)=>{
    const prod=products.find(p=>p.id===item.id);
    const label=item.qtyLabel||'';
    const unitPrice=item.price;
    return `<div style="display:flex;gap:.85rem;align-items:center;padding:.85rem 0;border-bottom:1px solid rgba(26,58,42,.07);">
      <div style="width:56px;height:56px;border-radius:8px;overflow:hidden;flex-shrink:0;background:#f0fdf4;"><img src="${prod?.image||''}" style="width:100%;height:100%;object-fit:cover;"/></div>
      <div style="flex:1;min-width:0;">
        <p style="font-size:.78rem;font-weight:700;color:#1a2416;line-height:1.3;">${item.name}</p>
        <p style="font-size:.68rem;color:#6b7280;font-weight:500;margin-top:1px;">${label}</p>
        <p style="font-size:.72rem;color:#166534;font-weight:700;margin-top:2px;">&#8377;${unitPrice} &times; ${item.qty||1} = <strong>&#8377;${unitPrice*(item.qty||1)}</strong></p>
      </div>
      <div style="display:flex;align-items:center;gap:4px;">
        <button onclick="cartQty(${idx},-1)" style="width:24px;height:24px;border:1px solid #d1d5db;border-radius:5px;background:#f3f4f6;cursor:pointer;font-weight:700;font-size:.75rem;">&#8722;</button>
        <span style="font-size:.78rem;font-weight:700;min-width:18px;text-align:center;">${item.qty||1}</span>
        <button onclick="cartQty(${idx},1)" style="width:24px;height:24px;border:1px solid #d1d5db;border-radius:5px;background:#f3f4f6;cursor:pointer;font-weight:700;font-size:.75rem;">+</button>
        <button onclick="removeFromCart(${idx})" style="width:24px;height:24px;border:none;background:none;cursor:pointer;color:#ef4444;font-size:.85rem;margin-left:2px;">&#10005;</button>
      </div>
    </div>`;
  }).join('');
  if(footer){
    footer.style.display='block';
    footer.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.85rem;"><span style="font-size:.82rem;font-weight:600;color:#6b7280;">Subtotal</span><span style="font-size:1rem;font-weight:800;color:#166534;">₹${total}</span></div><a href="checkout.html" style="display:block;text-align:center;background:var(--forest-deep);color:#fff;padding:.75rem;border-radius:10px;font-weight:700;font-size:.85rem;text-decoration:none;">Proceed to Checkout &rarr;</a>`;
  }
}
function cartQty(idx,delta){
  const item=cart[idx];
  if(!item)return;
  item.qty=Math.max(1,(item.qty||1)+delta);
  // recalculate price from basePrice  qtyVal so the correct amount is always shown
  if(item.basePrice&&item.qtyVal&&item.unit){
    const m=item.unit==='ml'?item.qtyVal/1000:item.qtyVal;
    item.price=Math.round(item.basePrice*m);
  }
  saveCart();renderCartDrawer();
}
function removeFromCart(idx){
  cart.splice(idx,1);
  saveCart();renderCartDrawer();
}


