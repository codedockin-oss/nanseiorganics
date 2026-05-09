/* ════════════════════════════════
   STATE MANAGEMENT
════════════════════════════════ */
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];

/* ════════════════════════════════
   UTILITY FUNCTIONS
════════════════════════════════ */
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), 2200);
}

function syncCounters() {
  const total = cart.reduce((s, i) => s + i.qty, 0);
  ['cartCount', 'mobCartCnt'].forEach(id => {
    const e = document.getElementById(id);
    if (e) e.textContent = total;
  });
  const wl = document.getElementById('wishlistCount');
  if (wl) wl.textContent = wishlist.length;
}

function stars(r) {
  return [1, 2, 3, 4, 5].map(i => i <= Math.floor(r) ? '★' : i - r < 1 ? '✦' : '☆').join('');
}

const disc = p => Math.round((1 - p.price / p.oldPrice) * 100);
