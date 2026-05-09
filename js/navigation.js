/* ════════════════════════════════
   DESKTOP DROPDOWN SYSTEM
════════════════════════════════ */
const ddOverlay = document.getElementById('dd-overlay');

function closeAllDDs(except) {
  [document.getElementById('megaMenu'), document.getElementById('coDd'), document.getElementById('certDd')]
    .forEach(el => { if (el !== except) el.classList.remove('open'); });
  document.querySelectorAll('.nav-trigger').forEach(t => t.classList.remove('active'));
}

function toggleDD(triggerId, menuId) {
  const trigger = document.getElementById(triggerId);
  const menu = document.getElementById(menuId);
  const opening = !menu.classList.contains('open');
  closeAllDDs(opening ? menu : null);
  menu.classList.toggle('open', opening);
  if (trigger) trigger.classList.toggle('active', opening);
  ddOverlay.classList.toggle('show', opening);
}

// Event listeners
document.getElementById('shopTrigger')?.addEventListener('click', e => {
  e.stopPropagation();
  toggleDD('shopTrigger', 'megaMenu');
});

document.getElementById('coTrigger')?.addEventListener('click', e => {
  e.stopPropagation();
  document.getElementById('certDd')?.classList.remove('open');
  toggleDD('coTrigger', 'coDd');
});

document.getElementById('certTrigger')?.addEventListener('click', e => {
  e.preventDefault();
  e.stopPropagation();
  document.getElementById('coDd')?.classList.remove('open');
  document.getElementById('coTrigger')?.classList.remove('active');
  const cd = document.getElementById('certDd');
  const opening = !cd.classList.contains('open');
  cd.classList.toggle('open', opening);
  ddOverlay.classList.toggle('show', opening);
});

[document.getElementById('megaMenu'), document.getElementById('coDd'), document.getElementById('certDd')]
  .forEach(el => el?.addEventListener('click', e => e.stopPropagation()));

ddOverlay?.addEventListener('click', () => {
  closeAllDDs();
  ddOverlay.classList.remove('show');
});

document.addEventListener('click', () => {
  closeAllDDs();
  ddOverlay.classList.remove('show');
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeAllDDs();
    ddOverlay.classList.remove('show');
  }
});

// Mega sidebar hover
document.querySelectorAll('.side-item').forEach(item => {
  item.addEventListener('mouseenter', () => {
    document.querySelectorAll('.side-item').forEach(i => i.classList.remove('active'));
    document.querySelectorAll('.mega-panel').forEach(p => p.classList.remove('active'));
    item.classList.add('active');
    const t = document.querySelector(`.mega-panel[data-pid="${item.dataset.p}"]`);
    if (t) t.classList.add('active');
  });
});

/* ════════════════════════════════
   MOBILE HAMBURGER & DRAWER
════════════════════════════════ */
const mobHam = document.getElementById('mobHam');
const mobDrawer = document.getElementById('mobDrawer');

mobHam?.addEventListener('click', e => {
  e.stopPropagation();
  const open = mobDrawer.classList.toggle('open');
  mobHam.classList.toggle('open', open);
});

function closeMobDrawer() {
  mobDrawer?.classList.remove('open');
  mobHam?.classList.remove('open');
}

/* ════════════════════════════════
   MOBILE DRAWER TOGGLES
════════════════════════════════ */
function mToggleShop() {
  const p = document.getElementById('mobShopPanel');
  const b = document.getElementById('mobShopBtn');
  const o = p.classList.toggle('open');
  b.classList.toggle('active', o);
  document.getElementById('mobCoSub')?.classList.remove('open');
  document.getElementById('mobCoBtn')?.classList.remove('active');
}

function mToggleCo() {
  const s = document.getElementById('mobCoSub');
  const b = document.getElementById('mobCoBtn');
  const o = s.classList.toggle('open');
  b.classList.toggle('active', o);
  document.getElementById('mobShopPanel')?.classList.remove('open');
  document.getElementById('mobShopBtn')?.classList.remove('active');
}

function mToggleCert() {
  document.getElementById('mobCertSub')?.classList.toggle('open');
}

document.querySelectorAll('.mob-sid-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.mob-sid-item').forEach(i => i.classList.remove('active'));
    document.querySelectorAll('.mob-panel').forEach(p => p.classList.remove('active'));
    item.classList.add('active');
    const t = document.getElementById('mob-' + item.dataset.mp);
    if (t) t.classList.add('active');
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
  if (pg) pg.classList.add('active');
  if (bn) bn.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openShopFAB() {
  closeMobDrawer();
  mobDrawer?.classList.add('open');
  mobHam?.classList.add('open');
  if (!document.getElementById('mobShopPanel')?.classList.contains('open')) mToggleShop();
}
