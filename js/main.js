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
  const val = Number(r) || 0;
  const full = Math.floor(val);
  const half = val - full >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  const starFull = '<svg width="11" height="11" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" stroke-width="1" xmlns="http://www.w3.org/2000/svg"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>';
  const starHalf = '<svg width="11" height="11" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="hg"><stop offset="50%" stop-color="#f59e0b"/><stop offset="50%" stop-color="#d1d5db"/></linearGradient></defs><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill="url(#hg)" stroke="#f59e0b" stroke-width="1"/></svg>';
  const starEmpty = '<svg width="11" height="11" viewBox="0 0 24 24" fill="#d1d5db" stroke="#d1d5db" stroke-width="1" xmlns="http://www.w3.org/2000/svg"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>';
  return starFull.repeat(full) + starHalf.repeat(half) + starEmpty.repeat(empty);
}

function ratingText(p) {
  const count = Number(p?.reviews || p?.numReviews || 0);
  return count > 0 ? `${Number(p.rating || 0).toFixed(1)} (${count})` : 'No reviews yet';
}

const disc = p => Math.round((1 - p.price / p.oldPrice) * 100);
