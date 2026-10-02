const API_BASE = window.API_BASE || 'http://localhost:5000/api';
const _ALLOWED_PATH = /^\/[a-zA-Z0-9\-_/?:=&%+.]+$/;
const AUTH_KEYS = [
  'nansai_token',
  'nansai_user',
  'nansai_activity',
  'token',
  'user',
  'authToken',
  'jwt',
];

function getToken() {
  return localStorage.getItem('nansai_token') || sessionStorage.getItem('nansai_token');
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
  };
}

async function request(method, path, body = null) {
  if (!_ALLOWED_PATH.test(path)) throw new Error('Invalid request path');

  const res = await fetch(API_BASE + path, {
    method,
    headers: authHeaders(),
    credentials: 'include',
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && typeof Auth !== 'undefined') Auth.clearSession();
    throw new Error(data.message || 'Request failed');
  }
  return data;
}

function redirectPath(path) {
  if (/^https?:\/\//i.test(path)) return path;
  return path;
}

const Auth = {
  async register(firstName, lastName, email, password) {
    const data = await request('POST', '/auth/register', { firstName, lastName, email, password });
    this.persist(data.token, data.user);
    return data;
  },

  async login(email, password) {
    const data = await request('POST', '/auth/login', { email, password });
    this.persist(data.token, data.user);
    this.refreshActivity().catch(() => {});
    return data;
  },

  persist(token, user) {
    localStorage.setItem('nansai_token', token);
    localStorage.setItem('nansai_user', JSON.stringify(user));
  },

  clearSession() {
    AUTH_KEYS.forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });

    document.cookie.split(';').forEach((cookie) => {
      const name = cookie.split('=')[0].trim();
      if (!name) return;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${location.hostname}`;
    });

    window.NanseiAuthState = null;
  },

  async logout(redirectTo = 'login.html') {
    try {
      if (getToken()) await request('POST', '/auth/logout');
    } catch {}
    this.clearSession();
    window.location.href = redirectPath(redirectTo);
  },

  getUser() {
    try {
      return JSON.parse(localStorage.getItem('nansai_user') || sessionStorage.getItem('nansai_user') || 'null');
    } catch {
      return null;
    }
  },

  isLoggedIn() {
    return Boolean(getToken());
  },

  async refreshUser() {
    if (!getToken()) return null;
    const data = await request('GET', '/auth/me');
    const user = data.user || data.data;
    if (user) localStorage.setItem('nansai_user', JSON.stringify(user));
    return user;
  },

  requireAuth(loginPath = 'login.html') {
    if (!this.isLoggedIn()) {
      this.clearSession();
      window.location.replace(loginPath);
      return false;
    }
    this.refreshUser().catch(() => {
      this.clearSession();
      window.location.replace(loginPath);
    });
    return true;
  },

  redirectIfAuthenticated(target = 'index.html') {
    if (!this.isLoggedIn()) return;
    const user = this.getUser();
    window.location.replace(user?.role === 'admin' ? 'admin-panel.html' : target);
  },

  async forgotPassword(email) {
    return request('POST', '/auth/forgot-password', { email });
  },

  async refreshActivity() {
    if (!getToken()) return [];
    const hist = await request('GET', '/users/activity');
    const data = hist.data || [];
    localStorage.setItem('nansai_activity', JSON.stringify(data));
    return data;
  },
};

const Products = {
  async getAll(params = {}) {
    const query = new URLSearchParams(params).toString();
    return request('GET', query ? `/products?${query}` : '/products');
  },

  async getOne(id) {
    return request('GET', `/products/${id}`);
  },

  async search(q) {
    return request('GET', `/products?search=${encodeURIComponent(q)}`);
  },

  async getByCategory(category) {
    return request('GET', `/products?category=${encodeURIComponent(category)}`);
  },

  async getRelated(id) {
    return request('GET', `/products/${id}/related`);
  },
};

const CartAPI = {
  async get() {
    return request('GET', '/cart');
  },

  async add(productId, quantity = 1, price = 0, selection = {}) {
    return request('POST', '/cart/add', {
      productId,
      quantity,
      price,
      selectedQuantity: selection.selectedQuantity || selection.qtyLabel || selection.label,
      selectedUnit: selection.selectedUnit || selection.unit,
      selectedPrice: selection.selectedPrice ?? selection.price ?? price,
    });
  },

  async remove(productId) {
    return request('DELETE', `/cart/remove/${productId}`);
  },

  async clear() {
    return request('DELETE', '/cart/clear');
  },
};

const Orders = {
  async create(orderData) {
    return request('POST', '/orders', orderData);
  },

  async getMyOrders() {
    return request('GET', '/orders/my-orders');
  },

  async getOne(id) {
    return request('GET', `/orders/${id}`);
  },
};

const WishlistAPI = {
  async get() {
    return request('GET', '/wishlist');
  },

  async add(productId) {
    return request('POST', `/wishlist/add/${productId}`);
  },

  async remove(productId) {
    return request('DELETE', `/wishlist/remove/${productId}`);
  },
};

const ActivityAPI = {
  async log(type, description, meta = {}) {
    if (!getToken()) return;
    try {
      await request('POST', '/users/activity', { type, description, meta });
      await Auth.refreshActivity();
    } catch {}
  },

  getCached() {
    try {
      return JSON.parse(localStorage.getItem('nansai_activity') || '[]');
    } catch {
      return [];
    }
  },

  async fetch() {
    try {
      return await Auth.refreshActivity();
    } catch {
      return this.getCached();
    }
  },
};

const Discounts = {
  async getActive(productId = '') {
    return request('GET', productId ? `/discounts/active?productId=${encodeURIComponent(productId)}` : '/discounts/active');
  },

  async getAll() {
    return request('GET', '/discounts');
  },

  async create(discount) {
    return request('POST', '/discounts', discount);
  },

  async update(id, discount) {
    return request('PUT', `/discounts/${id}`, discount);
  },

  async toggle(id, isActive) {
    return request('PATCH', `/discounts/${id}/toggle`, { isActive });
  },

  async delete(id) {
    return request('DELETE', `/discounts/${id}`);
  },
};

window.Auth = Auth;
window.Products = Products;
window.CartAPI = CartAPI;
window.Orders = Orders;
window.WishlistAPI = WishlistAPI;
window.ActivityAPI = ActivityAPI;
window.Discounts = Discounts;
