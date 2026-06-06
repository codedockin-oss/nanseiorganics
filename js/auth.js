/**
 * Nansai Organics — Production Auth & Session Manager v2
 * Fixes: broadcast race, clearSession wipe, cross-tab sync, back-button, token expiry
 */
(function (window) {
  'use strict';

  // Session-only keys — cleared on logout (NOT cart/wishlist — those live in DB)
  const SESSION_KEYS = [
    'nansai_token', 'nansai_user', 'nansai_activity',
    'nansai_admin_token', 'admin_token', 'admin_user',
    'checkoutDraft', 'checkoutAddress', 'checkoutPayment',
    'mkOrders', 'selectedProduct',
    'ordersCache', 'profileCache', 'addressesCache',
    'recommendations', 'personalizedRecommendations',
    'coupons', 'rewardPoints', 'savedPayments', 'savedPaymentPreferences',
    'notifications', 'reviewsDraft',
    'searchHistory', 'search_history',
    'recentlyViewed', 'recently_viewed',
  ];

  // UI cache keys for cart/wishlist — clear on logout so UI shows empty
  // (actual data stays in MongoDB and is restored on next login)
  const UI_CACHE_KEYS = ['cart', 'wishlist', 'nansei_wishlist'];

  // Prefix-based keys to also clear (user-specific address cache, firebase)
  const CLEAR_PREFIXES = ['nansai_addresses_', 'firebase:', 'firebase-heartbeat', 'firebase-installations'];

  const PROTECTED_PAGES = ['account', 'checkoutmyorderpage', 'admin-panel', 'wishlist'];
  const AUTH_PAGES      = ['login', 'register', 'reset-password'];

  let _tabSyncInit = false;
  let _backGuardInit = false;
  let _channel = null;

  // ── Token helpers ──────────────────────────────────────────────────────────
  function getToken() {
    return localStorage.getItem('nansai_token');
  }

  function getUser() {
    try { return JSON.parse(localStorage.getItem('nansai_user') || 'null'); }
    catch (_) { return null; }
  }

  function decodeJwt(token) {
    try {
      const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(decodeURIComponent(
        Array.from(atob(b64)).map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
      ));
    } catch (_) { return null; }
  }

  function isTokenExpired(token) {
    const p = decodeJwt(token);
    return !p || (p.exp && p.exp * 1000 <= Date.now());
  }

  // ── Storage cleanup ────────────────────────────────────────────────────────
  function _wipeStorage(storage) {
    const toRemove = [];
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (!k) continue;
      if (SESSION_KEYS.includes(k) || UI_CACHE_KEYS.includes(k)) { toRemove.push(k); continue; }
      if (CLEAR_PREFIXES.some(p => k.startsWith(p))) toRemove.push(k);
    }
    toRemove.forEach(k => storage.removeItem(k));
  }

  function _clearCookies() {
    const domains = new Set([location.hostname]);
    const parts = location.hostname.split('.');
    if (parts.length > 1) domains.add('.' + parts.slice(-2).join('.'));
    document.cookie.split(';').forEach(c => {
      const name = c.split('=')[0].trim();
      if (!name) return;
      domains.forEach(d => {
        document.cookie = `${name}=;expires=Thu,01 Jan 1970 00:00:00 GMT;path=/;domain=${d}`;
      });
      document.cookie = `${name}=;expires=Thu,01 Jan 1970 00:00:00 GMT;path=/`;
    });
  }

  async function _clearCaches() {
    if ('caches' in window) {
      try { const keys = await caches.keys(); await Promise.all(keys.map(k => caches.delete(k))); } catch (_) {}
    }
    if ('indexedDB' in window && typeof indexedDB.databases === 'function') {
      try { const dbs = await indexedDB.databases(); dbs.forEach(db => db.name && indexedDB.deleteDatabase(db.name)); } catch (_) {}
    }
    if ('serviceWorker' in navigator) {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      } catch (_) {}
    }
  }

  function _resetUI() {
    window.dispatchEvent(new CustomEvent('nansai:session-cleared'));
    document.querySelectorAll('#cartCount,#mobCartCnt,#cartBadge,#wishlistCount,#wishlistBadge')
      .forEach(el => { el.textContent = '0'; });
  }

  function clearSession() {
    _wipeStorage(localStorage);
    _wipeStorage(sessionStorage);
    // Clear cart/wishlist UI cache — DB data stays intact in MongoDB
    ['cart', 'wishlist', 'nansei_wishlist', 'nansai_logout_ts'].forEach(k => {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    });
    _clearCookies();
    _clearCaches();
    _resetUI();
    if (window.history?.replaceState) {
      window.history.replaceState({ nansaiLoggedOut: true }, document.title, window.location.href);
    }
  }

  // ── Broadcast logout to all tabs ───────────────────────────────────────────
  function _broadcast() {
    // BroadcastChannel is reliable and doesn't have the set/remove race condition
    try {
      if (!_channel && 'BroadcastChannel' in window) {
        _channel = new BroadcastChannel('nansai-auth');
      }
      if (_channel) _channel.postMessage({ type: 'logout', at: Date.now() });
    } catch (_) {}

    // localStorage fallback for Safari (doesn't support BroadcastChannel in some versions)
    // Use a timestamp value — other tabs read the value, not just the key existence
    try {
      localStorage.setItem('nansai_logout_ts', String(Date.now()));
    } catch (_) {}
  }

  // ── Logout ─────────────────────────────────────────────────────────────────
  async function logout() {
    const token = getToken();
    if (token) {
      try {
        await fetch((window.API_BASE || 'http://localhost:5000/api') + '/auth/logout', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
          cache: 'no-store',
          keepalive: true,
        });
      } catch (_) {}
    }
    clearSession();
    _broadcast();
    window.location.replace(_loginUrl());
  }

  // ── Route guards ───────────────────────────────────────────────────────────
  function requireAuth() {
    const token = getToken();
    if (!token || isTokenExpired(token)) {
      clearSession();
      window.location.replace(_loginUrl());
      return false;
    }
    return true;
  }

  function requireGuest() {
    const token = getToken();
    if (token && !isTokenExpired(token)) {
      const u = getUser();
      window.location.replace(_loginUrl().replace('login.html', u?.role === 'admin' ? 'admin-panel.html' : 'index.html'));
      return false;
    }
    return true;
  }

  // ── Auto-guard on every page load ─────────────────────────────────────────
  function _autoGuard() {
    const path = location.pathname.toLowerCase();
    const isAuth = AUTH_PAGES.some(p => path.includes(p));
    const isProt = PROTECTED_PAGES.some(p => path.includes(p));
    const token  = getToken();
    const valid  = token && !isTokenExpired(token);

    if (isAuth && valid) {
      const u = getUser();
      window.location.replace(_loginUrl().replace('login.html', u?.role === 'admin' ? 'admin-panel.html' : 'index.html'));
      return;
    }
    if (isProt && !valid) {
      clearSession();
      window.location.replace(_loginUrl());
    }
  }

  // ── Token expiry check ─────────────────────────────────────────────────────
  function checkTokenExpiry() {
    const token = getToken();
    if (!token) return;
    if (isTokenExpired(token)) {
      clearSession();
      _broadcast();
      window.location.replace(_loginUrl());
    }
  }

  // ── Cross-tab sync ─────────────────────────────────────────────────────────
  function syncAcrossTabs() {
    if (_tabSyncInit) return;
    _tabSyncInit = true;

    // BroadcastChannel (primary)
    try {
      if ('BroadcastChannel' in window) {
        if (!_channel) _channel = new BroadcastChannel('nansai-auth');
        _channel.onmessage = e => {
          if (e.data?.type === 'logout') { clearSession(); window.location.replace(_loginUrl()); }
        };
      }
    } catch (_) {}

    // storage event fallback (cross-origin tabs, Safari)
    window.addEventListener('storage', e => {
      // Another tab set the logout timestamp
      if (e.key === 'nansai_logout_ts' && e.newValue) {
        localStorage.removeItem('nansai_logout_ts'); // clean up
        clearSession();
        window.location.replace(_loginUrl());
        return;
      }
      // Token was removed in another tab while on a protected page
      if (e.key === 'nansai_token' && e.oldValue && !e.newValue && _isProtected()) {
        clearSession();
        window.location.replace(_loginUrl());
      }
    });
  }

  // ── Back-button protection ─────────────────────────────────────────────────
  function preventBackAfterLogout() {
    if (_backGuardInit) return;
    _backGuardInit = true;

    window.addEventListener('pageshow', e => {
      // bfcache restore (persisted = true) or back/forward navigation
      const nav = performance.getEntriesByType?.('navigation')?.[0] || {};
      if ((e.persisted || nav.type === 'back_forward') && _isProtected()) {
        const token = getToken();
        if (!token || isTokenExpired(token)) {
          clearSession();
          window.location.replace(_loginUrl());
        }
      }
    });

    window.addEventListener('popstate', e => {
      if (e.state?.nansaiLoggedOut || (_isProtected() && !getToken())) {
        clearSession();
        window.location.replace(_loginUrl());
      }
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  function _isProtected() {
    return PROTECTED_PAGES.some(p => location.pathname.toLowerCase().includes(p));
  }

  function _loginUrl() {
    return location.pathname.includes('/pages/') ? 'login.html' : 'pages/login.html';
  }

  function _installNoStoreMeta() {
    [['Cache-Control','no-store, no-cache, must-revalidate, private'],['Pragma','no-cache'],['Expires','0']]
      .forEach(([name, content]) => {
        if (!document.querySelector(`meta[http-equiv="${name}"]`)) {
          const m = document.createElement('meta');
          m.httpEquiv = name; m.content = content;
          document.head.appendChild(m);
        }
      });
  }

  // ── Run immediately ────────────────────────────────────────────────────────
  _autoGuard();

  // ── Public API ─────────────────────────────────────────────────────────────
  window.NansaiAuth = {
    logout, clearSession, requireAuth, requireGuest,
    syncAcrossTabs, preventBackAfterLogout, checkTokenExpiry,
    getToken, getUser, isLoggedIn: () => { const t = getToken(); return !!t && !isTokenExpired(t); },
  };

  document.addEventListener('DOMContentLoaded', () => {
    _installNoStoreMeta();
    checkTokenExpiry();
    syncAcrossTabs();
    preventBackAfterLogout();
  });

})(window);
