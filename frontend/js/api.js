const API_BASE = window.API_BASE || 'http://localhost:5000/api';
const _ALLOWED_PATH = /^\/[a-zA-Z0-9\-_/?=&%+.]+$/;

/* ── helpers ── */
function getToken() {
  return localStorage.getItem('nansai_token');
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {})
  };
}

async function request(method, path, body = null) {
  if (!_ALLOWED_PATH.test(path)) throw new Error('Invalid request path');
  const res = await fetch(API_BASE + path, {
    method,
    headers: authHeaders(),
    cache: getToken() ? 'no-store' : 'default',
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const data = await res.json();
  if (res.status === 401 && getToken() && window.NansaiAuth && !path.startsWith('/auth/login')) {
    window.NansaiAuth.clearSession();
    window.location.replace(location.pathname.includes('/pages/') ? 'login.html' : 'pages/login.html');
  }
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

/* ════════════════════════════════
   AUTH
════════════════════════════════ */
const Auth = {
  async register(name, email, password, phone) {
    const data = await request('POST', '/auth/register', { name, email, password, phone });
    if (window.NansaiAuth) window.NansaiAuth.clearSession();
    else { sessionStorage.clear(); }
    localStorage.setItem('nansai_token', data.token);
    localStorage.setItem('nansai_user', JSON.stringify(data.user));
    return data;
  },

  async login(email, password) {
    const data = await request('POST', '/auth/login', { email, password });
    // Clear previous user's session keys only (not DB data)
    if (window.NansaiAuth) window.NansaiAuth.clearSession();
    else { sessionStorage.clear(); }
    // Set new session
    localStorage.setItem('nansai_token', data.token);
    localStorage.setItem('nansai_user', JSON.stringify(data.user));
    // Restore this user's cart + wishlist from DB into localStorage
    try {
      const cartData = await request('GET', '/cart');
      const items = (cartData.data && cartData.data.items) || [];
      const cartLC = items.map(i => ({
        id:       i.product._id || i.product,
        name:     i.product.name || '',
        price:    i.product.price || 0,
        oldPrice: i.product.oldPrice || 0,
        image:    i.product.images?.[0] || i.product.image || '',
        qty:      i.quantity
      }));
      localStorage.setItem('cart', JSON.stringify(cartLC));
    } catch (_) {}
    try {
      const wishData = await request('GET', '/wishlist');
      const ids = (wishData.data || []).map(p => String(typeof p === 'object' ? (p._id || p.id) : p));
      localStorage.setItem('wishlist', JSON.stringify(ids));
      localStorage.setItem('nansei_wishlist', JSON.stringify(ids));
    } catch (_) {}
    // Pre-fetch activity history
    try {
      const hist = await request('GET', '/users/activity');
      localStorage.setItem('nansai_activity', JSON.stringify(hist.data || []));
    } catch (_) {}
    return data;
  },

  logout() {
    if (window.NansaiAuth) {
      window.NansaiAuth.logout();
    } else {
      sessionStorage.clear();
      ['nansai_token','nansai_user','admin_token','admin_user','nansai_admin_token',
       'cart','wishlist','nansei_wishlist','nansai_activity','mkOrders'].forEach(k => localStorage.removeItem(k));
      window.location.replace('login.html');
    }
  },

  getUser() {
    const u = localStorage.getItem('nansai_user');
    return u ? JSON.parse(u) : null;
  },

  isLoggedIn() {
    return !!getToken();
  },

  async forgotPassword(email) {
    return request('POST', '/auth/forgot-password', { email });
  }
};

/* ════════════════════════════════
   PRODUCTS
════════════════════════════════ */
const Products = {
  async getAll(params = {}) {
    const query = new URLSearchParams(params).toString();
    const path  = query ? `/products?${query}` : '/products';
    return request('GET', path);
  },

  async getOne(id) {
    return request('GET', `/products/${id}`);
  },

  async search(q) {
    return request('GET', `/products?search=${encodeURIComponent(q)}`);
  },

  async getByCategory(category) {
    return request('GET', `/products?category=${category}`);
  },

  async getRelated(id) {
    return request('GET', `/products/${id}/related`);
  }
};

/* ════════════════════════════════
   CART
════════════════════════════════ */
const CartAPI = {
  async get() {
    return request('GET', '/cart');
  },

  async add(productId, quantity = 1, price = 0) {
    return request('POST', '/cart/add', { productId, quantity, price });
  },

  async remove(productId) {
    return request('DELETE', `/cart/remove/${productId}`);
  },

  async set(productId, quantity = 1) {
    return request('PUT', `/cart/set/${productId}`, { quantity });
  },

  async clear() {
    return request('DELETE', '/cart/clear');
  }
};

/* ════════════════════════════════
   ORDERS
════════════════════════════════ */
const Orders = {
  async create(orderData) {
    return request('POST', '/orders', orderData);
  },

  async getMyOrders() {
    return request('GET', '/orders/my-orders');
  },

  async getOne(id) {
    return request('GET', `/orders/${id}`);
  }
};

/* ════════════════════════════════
   WISHLIST
════════════════════════════════ */
const WishlistAPI = {
  async get() {
    return request('GET', '/wishlist');
  },

  async add(productId) {
    return request('POST', `/wishlist/add/${productId}`);
  },

  async remove(productId) {
    return request('DELETE', `/wishlist/remove/${productId}`);
  }
};

/* ════════════════════════════════
   ACTIVITY
════════════════════════════════ */
const ActivityAPI = {
  /**
   * Log an activity event to the backend (only when logged in).
   * @param {string} type  - e.g. 'add_to_cart', 'wishlist_add', 'view_product'
   * @param {string} description
   * @param {object} meta  - optional extra data
   */
  async log(type, description, meta = {}) {
    if (!getToken()) return;
    try {
      await request('POST', '/users/activity', { type, description, meta });
      // Refresh cached history
      const hist = await request('GET', '/users/activity');
      localStorage.setItem('nansai_activity', JSON.stringify(hist.data || []));
    } catch {}
  },

  /** Returns cached history (array, newest first). */
  getCached() {
    try { return JSON.parse(localStorage.getItem('nansai_activity') || '[]'); } catch { return []; }
  },

  /** Fetch fresh history from server and update cache. */
  async fetch() {
    if (!getToken()) return [];
    try {
      const hist = await request('GET', '/users/activity');
      const data = hist.data || [];
      localStorage.setItem('nansai_activity', JSON.stringify(data));
      return data;
    } catch { return this.getCached(); }
  }
};
