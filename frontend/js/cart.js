/**
 * Hybrid Cart & Wishlist
 * - Logged in  → syncs with backend API
 * - Guest      → localStorage only
 */

/* ── helpers ── */
function _isLoggedIn() { return !!localStorage.getItem('nansai_token'); }
function _safeId(id)   { return String(id).replace(/[^a-zA-Z0-9_\-]/g, ''); }

function _lcCart()  { try { return JSON.parse(localStorage.getItem('cart') || '[]'); } catch { return []; } }
function _saveLC(c) { localStorage.setItem('cart', JSON.stringify(c)); }

function _lcWish()     { try { return JSON.parse(localStorage.getItem('wishlist') || '[]'); } catch { return []; } }
function _saveWish(w)  {
  localStorage.setItem('wishlist', JSON.stringify(w));
  localStorage.setItem('nansei_wishlist', JSON.stringify(w));
}

/* ════════════════════════════════
   CART
════════════════════════════════ */
const Cart = {
  /** Returns array of {id, name, price, image, qty} */
  async getItems() {
    if (_isLoggedIn()) {
      try {
        const { data } = await Promise.race([
          CartAPI.get(),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000))
        ]);
        return (data.items || []).map(i => ({
          id:    i.product._id,
          name:  i.product.name,
          price: i.product.price,
          oldPrice: i.product.oldPrice,
          image: i.product.images?.[0] || i.product.image || '',
          qty:   i.quantity
        }));
      } catch { /* fall through to localStorage */ }
    }
    return _lcCart();
  },

  async add(product, qty = 1) {
    if (_isLoggedIn()) {
      try {
        await CartAPI.add(_safeId(product.id || product._id), qty, product.price || 0);
        _updateBadge();
        return;
      } catch { /* fall through */ }
    }
    // localStorage
    const safeId = _safeId(product.id);
    const cart = _lcCart();
    const ex = cart.find(i => i.id === safeId);
    if (ex) ex.qty += qty;
    else cart.push({ id: safeId, name: product.name, price: product.price, oldPrice: product.oldPrice, image: product.image, qty });
    _saveLC(cart);
    _updateBadge();
  },

  async remove(productId) {
    const safeId = _safeId(productId);
    if (_isLoggedIn()) {
      try { await CartAPI.remove(safeId); _updateBadge(); return; } catch {}
    }
    const cart = _lcCart().filter(i => i.id !== safeId);
    _saveLC(cart);
    _updateBadge();
  },

  async clear() {
    if (_isLoggedIn()) {
      try { await CartAPI.clear(); } catch {}
    }
    _saveLC([]);
    _updateBadge();
  },

  async count() {
    const items = await this.getItems();
    return items.reduce((s, i) => s + (i.qty || 1), 0);
  }
};

/* ════════════════════════════════
   WISHLIST
════════════════════════════════ */
const Wish = {
  /** Returns array of product ids (numbers) */
  async getIds() {
    if (_isLoggedIn()) {
      try {
        const { data } = await Promise.race([
          WishlistAPI.get(),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000))
        ]);
        const ids = data.map(p => _safeId(typeof p === 'object' ? (p._id || p.id) : p));
        _saveWish(ids);
        return ids;
      } catch {}
    }
    return _lcWish();
  },

  async has(productId) {
    const safeId = _safeId(productId);
    const ids = await this.getIds();
    return ids.includes(safeId) || ids.includes(String(safeId));
  },

  async add(productId) {
    const safeId = _safeId(productId);
    if (_isLoggedIn()) {
      try { await WishlistAPI.add(safeId); } catch {}
    }
    const w = _lcWish();
    if (!w.includes(safeId)) w.push(safeId);
    _saveWish(w);
    _updateWishBadge();
  },

  async remove(productId) {
    const safeId = _safeId(productId);
    if (_isLoggedIn()) {
      try { await WishlistAPI.remove(safeId); } catch {}
    }
    _saveWish(_lcWish().filter(id => id !== safeId && id !== String(safeId)));
    _updateWishBadge();
  },

  async toggle(productId) {
    const safeId = _safeId(productId);
    const has = await this.has(safeId);
    if (has) { await this.remove(safeId); return false; }
    else      { await this.add(safeId);    return true;  }
  }
};

/* ════════════════════════════════
   BADGE SYNC
════════════════════════════════ */
async function _updateBadge() {
  const total = (await Cart.count());
  document.querySelectorAll('#cartCount, #mobCartCnt, #cartBadge').forEach(el => {
    if (el) el.textContent = total;
  });
}

async function _updateWishBadge() {
  const ids = await Wish.getIds();
  document.querySelectorAll('#wishlistCount').forEach(el => {
    if (el) el.textContent = ids.length;
  });
}

/* ── auto-sync badges on load ── */
document.addEventListener('DOMContentLoaded', () => {
  _updateBadge();
  _updateWishBadge();
});
