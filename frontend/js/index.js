/* ── State ── */
let cart     = JSON.parse(localStorage.getItem('cart'))     || [];
let wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];

/* ── Toast ── */
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ── Counter sync ── */
function syncCounters() {
  const total = cart.reduce((s,i) => s + i.qty, 0);
  ['cartCount','mobCartCnt'].forEach(id => { const e = document.getElementById(id); if(e) e.textContent = total; });
  const wl = document.getElementById('wishlistCount'); if(wl) wl.textContent = wishlist.length;
}

/* ════════════════════════════════
   DESKTOP DROPDOWN SYSTEM
════════════════════════════════ */
const ddOverlay = document.getElementById('dd-overlay');
function closeAllDDs(except) {
  [document.getElementById('megaMenu'), document.getElementById('coDd'), document.getElementById('certDd')]
    .forEach(el => { if(el !== except) el.classList.remove('open'); });
  document.querySelectorAll('.nav-trigger').forEach(t => t.classList.remove('active'));
}
function toggleDD(triggerId, menuId) {
  const trigger = document.getElementById(triggerId);
  const menu    = document.getElementById(menuId);
  const opening = !menu.classList.contains('open');
  closeAllDDs(opening ? menu : null);
  menu.classList.toggle('open', opening);
  if(trigger) trigger.classList.toggle('active', opening);
  ddOverlay.classList.toggle('show', opening);
}

document.getElementById('shopTrigger').addEventListener('click', e => { e.stopPropagation(); toggleDD('shopTrigger','megaMenu'); });
document.getElementById('coTrigger').addEventListener('click', e => {
  e.stopPropagation();
  document.getElementById('certDd').classList.remove('open');
  toggleDD('coTrigger','coDd');
});
document.getElementById('certTrigger').addEventListener('click', e => {
  e.preventDefault(); e.stopPropagation();
  document.getElementById('coDd').classList.remove('open');
  document.getElementById('coTrigger').classList.remove('active');
  const cd = document.getElementById('certDd');
  const opening = !cd.classList.contains('open');
  cd.classList.toggle('open', opening);
  ddOverlay.classList.toggle('show', opening);
});
[document.getElementById('megaMenu'), document.getElementById('coDd'), document.getElementById('certDd')]
  .forEach(el => el.addEventListener('click', e => e.stopPropagation()));
ddOverlay.addEventListener('click', () => { closeAllDDs(); ddOverlay.classList.remove('show'); });
document.addEventListener('click', () => { closeAllDDs(); ddOverlay.classList.remove('show'); });
document.addEventListener('keydown', e => { if(e.key==='Escape') { closeAllDDs(); ddOverlay.classList.remove('show'); } });

/* Mega sidebar hover */
document.querySelectorAll('.side-item').forEach(item => {
  item.addEventListener('mouseenter', () => {
    document.querySelectorAll('.side-item').forEach(i => i.classList.remove('active'));
    document.querySelectorAll('.mega-panel').forEach(p => p.classList.remove('active'));
    item.classList.add('active');
    const t = document.querySelector(`.mega-panel[data-pid="${item.dataset.p}"]`);
    if(t) t.classList.add('active');
  });
});

/* ════════════════════════════════
   MOBILE HAMBURGER
════════════════════════════════ */
const mobHam    = document.getElementById('mobHam');
const mobDrawer = document.getElementById('mobDrawer');
mobHam.addEventListener('click', e => {
  e.stopPropagation();
  const open = mobDrawer.classList.toggle('open');
  mobHam.classList.toggle('open', open);
});
function closeMobDrawer() {
  mobDrawer.classList.remove('open');
  mobHam.classList.remove('open');
}

/* ════════════════════════════════
   MOBILE DRAWER TOGGLES
════════════════════════════════ */
function mToggleShop() {
  const p = document.getElementById('mobShopPanel'), b = document.getElementById('mobShopBtn');
  const o = p.classList.toggle('open'); b.classList.toggle('active', o);
  document.getElementById('mobCoSub').classList.remove('open');
  document.getElementById('mobCoBtn').classList.remove('active');
}
function mToggleCo() {
  const s = document.getElementById('mobCoSub'), b = document.getElementById('mobCoBtn');
  const o = s.classList.toggle('open'); b.classList.toggle('active', o);
  document.getElementById('mobShopPanel').classList.remove('open');
  document.getElementById('mobShopBtn').classList.remove('active');
}
function mToggleCert() { document.getElementById('mobCertSub').classList.toggle('open'); }

document.querySelectorAll('.mob-sid-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.mob-sid-item').forEach(i => i.classList.remove('active'));
    document.querySelectorAll('.mob-panel').forEach(p => p.classList.remove('active'));
    item.classList.add('active');
    const t = document.getElementById('mob-' + item.dataset.mp);
    if(t) t.classList.add('active');
  });
});

/* ════════════════════════════════
   MOBILE BOTTOM NAV PAGE SWITCHING
════════════════════════════════ */
function switchPage(id) {
  closeMobDrawer();
  document.querySelectorAll('.mob-page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.bn-btn').forEach(b => b.classList.remove('active'));
  const pg = document.getElementById('mp-' + id);
  const bn = document.getElementById('bn-' + id);
  if(pg) pg.classList.add('active');
  if(bn) bn.classList.add('active');
  window.scrollTo({ top:0, behavior:'smooth' });
}
function openShopFAB() {
  closeMobDrawer();
  mobDrawer.classList.add('open'); mobHam.classList.add('open');
  if(!document.getElementById('mobShopPanel').classList.contains('open')) mToggleShop();
}

/* ════════════════════════════════
   HERO SLIDER
════════════════════════════════ */
(function(){
  const TOTAL=4, IMG_DUR=5000;
  let cur=0, pct=0, rafId=null, lastTS=null, dur=IMG_DUR;
  const track=document.getElementById('track');
  const fill=document.getElementById('timerFill');
  const idxEl=document.getElementById('currIdx');
  const slides=document.querySelectorAll('.slide');
  const dots=document.querySelectorAll('.dot');
  const muteBtn=document.getElementById('muteBtn');
  const video=document.getElementById('heroVideo');
  if(!track) return;
  function getDur(){ return cur===0?(video.duration&&isFinite(video.duration)?video.duration*1000:10000):IMG_DUR; }
  function updateMute(){ if(muteBtn){muteBtn.classList.toggle('visible',cur===0);muteBtn.textContent=video.muted?'[[icon:volume-x]]':'[[icon:volume-2]]';} }
  if(muteBtn) muteBtn.onclick=()=>{video.muted=!video.muted;updateMute();};
  function syncVideo(i){ if(i===0){video.currentTime=0;video.play().catch(()=>{});}else{video.pause();} }
  function goTo(i){
    slides[cur].classList.remove('active'); dots[cur].classList.remove('active');
    cur=((i%TOTAL)+TOTAL)%TOTAL;
    slides[cur].classList.add('active'); dots[cur].classList.add('active');
    track.style.transform=`translateX(-${cur*100}%)`;
    if(idxEl) idxEl.textContent=String(cur+1).padStart(2,'0');
    syncVideo(cur); updateMute(); resetTimer();
  }
  function resetTimer(){ cancelAnimationFrame(rafId); pct=0; lastTS=null; dur=getDur(); fill.style.transition='none'; fill.style.width='0%'; rafId=requestAnimationFrame(tick); }
  function tick(ts){
    if(!lastTS) lastTS=ts;
    if(cur===0) dur=getDur();
    pct+=((ts-lastTS)/dur)*100; lastTS=ts;
    fill.style.width=Math.min(pct,100)+'%';
    pct<100?rafId=requestAnimationFrame(tick):goTo(cur+1);
  }
  video.addEventListener('loadedmetadata',()=>{ if(cur===0) dur=getDur(); });
  document.getElementById('prevBtn').onclick=()=>goTo(cur-1);
  document.getElementById('nextBtn').onclick=()=>goTo(cur+1);
  dots.forEach(d=>d.onclick=()=>goTo(+d.dataset.i));
  document.addEventListener('keydown',e=>{if(e.key==='ArrowLeft')goTo(cur-1);if(e.key==='ArrowRight')goTo(cur+1);});
  let tx=0;
  track.addEventListener('touchstart',e=>{tx=e.touches[0].clientX;},{passive:true});
  track.addEventListener('touchend',e=>{const d=e.changedTouches[0].clientX-tx;if(Math.abs(d)>45)goTo(cur+(d<0?1:-1));});
  const shell=document.getElementById('sliderShell');
  shell.addEventListener('mouseenter',()=>cancelAnimationFrame(rafId));
  shell.addEventListener('mouseleave',()=>{lastTS=null;rafId=requestAnimationFrame(tick);});
  video.play().catch(()=>{}); updateMute(); resetTimer();
})();

/* ── Mobile slider ── */
(function(){
  const TOTAL=4, IMG_DUR=5000;
  let cur=0, pct=0, rafId=null, lastTS=null, dur=IMG_DUR;
  const track=document.getElementById('trackMob');
  const fill=document.getElementById('timerFillMob');
  const slides=document.querySelectorAll('#sliderShellMob .slide');
  const dots=document.querySelectorAll('#dotListMob .dot');
  const video=document.getElementById('heroVideoMob');
  if(!track) return;
  function getDur(){ return cur===0&&video&&video.duration&&isFinite(video.duration)?video.duration*1000:IMG_DUR; }
  function syncVideo(i){ if(!video) return; if(i===0){video.currentTime=0;video.play().catch(()=>{});}else video.pause(); }
  function goTo(i){
    slides[cur].classList.remove('active'); dots[cur].classList.remove('active');
    cur=((i%TOTAL)+TOTAL)%TOTAL;
    slides[cur].classList.add('active'); dots[cur].classList.add('active');
    track.style.transform=`translateX(-${cur*100}%)`;
    syncVideo(cur); resetTimer();
  }
  function resetTimer(){ cancelAnimationFrame(rafId); pct=0; lastTS=null; dur=getDur(); if(fill){fill.style.transition='none';fill.style.width='0%';} rafId=requestAnimationFrame(tick); }
  function tick(ts){
    if(!lastTS) lastTS=ts;
    if(cur===0) dur=getDur();
    pct+=((ts-lastTS)/dur)*100; lastTS=ts;
    if(fill) fill.style.width=Math.min(pct,100)+'%';
    pct<100?rafId=requestAnimationFrame(tick):goTo(cur+1);
  }
  document.getElementById('prevBtnMob').onclick=()=>goTo(cur-1);
  document.getElementById('nextBtnMob').onclick=()=>goTo(cur+1);
  dots.forEach(d=>d.onclick=()=>goTo(+d.dataset.mi));
  let tx=0;
  track.addEventListener('touchstart',e=>{tx=e.touches[0].clientX;},{passive:true});
  track.addEventListener('touchend',e=>{const d=e.changedTouches[0].clientX-tx;if(Math.abs(d)>40)goTo(cur+(d<0?1:-1));});
  if(video) video.play().catch(()=>{});
  resetTimer();
})();

/* ── Top Categories: ripple + scroll-trigger ── */
function tcRipple(e, card) {
  e.preventDefault();
  const r = document.createElement('span');
  r.className = 'tc-ripple';
  const rect = card.getBoundingClientRect();
  const x = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
  const y = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
  r.style.left = (x - rect.left) + 'px';
  r.style.top  = (y - rect.top)  + 'px';
  card.appendChild(r);
  setTimeout(() => r.remove(), 600);
}
(function(){
  const grid = document.getElementById('topCatGrid');
  if(!grid || !window.IntersectionObserver) return;
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if(en.isIntersecting) {
        grid.querySelectorAll('.top-cat-card').forEach((c,i) => {
          c.style.animationDelay = (0.04 + i * 0.06) + 's';
          c.style.animation = 'none';
          void c.offsetWidth;
          c.style.animation = '';
        });
        io.disconnect();
      }
    });
  }, { threshold: 0.15 });
  io.observe(grid);
})();

/* ═══════════════════ TYPING ANIMATION ═══════════════════ */
(function(){
  const products = [
    'Organic Wheat Flour...',
    'Cold-Pressed Oils...',
    'Wild Forest Honey...',
    'Premium Basmati Rice...',
    'A2 Cow Ghee...',
    'Organic Turmeric...',
    'Fresh Millets...',
    'Chia Seeds...',
    'Organic Jaggery...',
    'Tulsi Green Tea...'
  ];
  
  let currentIndex = 0;
  let currentText = '';
  let isDeleting = false;
  let charIndex = 0;
  
  const desktopPlaceholder = document.getElementById('searchPlaceholder');
  const mobilePlaceholder = document.getElementById('mobSearchPlaceholder');
  const desktopInput = document.getElementById('searchInput');
  const mobileInput = document.getElementById('mobSearchInput');
  
  function type() {
    const current = products[currentIndex];
    
    if (isDeleting) {
      currentText = current.substring(0, charIndex - 1);
      charIndex--;
    } else {
      currentText = current.substring(0, charIndex + 1);
      charIndex++;
    }
    
    if (desktopPlaceholder) desktopPlaceholder.textContent = 'Search ' + currentText;
    if (mobilePlaceholder) mobilePlaceholder.textContent = 'Search ' + currentText;
    
    let typeSpeed = isDeleting ? 50 : 100;
    
    if (!isDeleting && charIndex === current.length) {
      typeSpeed = 2000;
      isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
      isDeleting = false;
      currentIndex = (currentIndex + 1) % products.length;
      typeSpeed = 500;
    }
    
    setTimeout(type, typeSpeed);
  }
  
  if (desktopInput) {
    desktopInput.addEventListener('focus', () => {
      if (desktopPlaceholder) desktopPlaceholder.style.opacity = '0';
    });
    desktopInput.addEventListener('blur', () => {
      if (!desktopInput.value && desktopPlaceholder) desktopPlaceholder.style.opacity = '1';
    });
    desktopInput.addEventListener('input', () => {
      if (desktopPlaceholder) desktopPlaceholder.style.opacity = desktopInput.value ? '0' : '1';
    });
  }
  
  if (mobileInput) {
    mobileInput.addEventListener('focus', () => {
      if (mobilePlaceholder) mobilePlaceholder.style.opacity = '0';
    });
    mobileInput.addEventListener('blur', () => {
      if (!mobileInput.value && mobilePlaceholder) mobilePlaceholder.style.opacity = '1';
    });
    mobileInput.addEventListener('input', () => {
      if (mobilePlaceholder) mobilePlaceholder.style.opacity = mobileInput.value ? '0' : '1';
    });
  }
  
  setTimeout(type, 1000);
})();

/* Toggle Categories */
function toggleAllCategories(e) {
  e.preventDefault();
  const hiddenCats = document.querySelectorAll('.cat-hidden');
  const btn = document.getElementById('viewAllCatBtn');
  const isExpanded = hiddenCats[0]?.classList.contains('flex');
  
  if(isExpanded) {
    hiddenCats.forEach(cat => {
      cat.classList.remove('flex');
      cat.classList.add('hidden');
    });
    btn.textContent = 'View all →';
  } else {
    hiddenCats.forEach((cat, i) => {
      cat.classList.remove('hidden');
      cat.classList.add('flex');
      cat.style.animationDelay = (0.04 + (i + 4) * 0.06) + 's';
    });
    btn.textContent = 'Show less ↑';
  }
}

/* ── Init ── */
syncCounters();
