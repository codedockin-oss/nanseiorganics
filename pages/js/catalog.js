/*
 * NanseiCatalog — the one place pages get product names, prices, pack sizes and stock from.
 *   1. the copy saved in this browser last time (instant)
 *   2. data/catalog.json published with the site (instant, works if the server is asleep or down)
 *   3. the live server (GET /api/products) — what the admin edits; replaces the above when it answers
 * Only products that have pack sizes are taken from the server, so nothing changes until the catalogue is migrated.
 * The server re-checks every price when an order is placed, so a stale copy can never undercharge.
 *
 * Use:  NanseiCatalog.get(1)            -> product or null   (storefront number or database id)
 *       NanseiCatalog.onUpdate(fn)      -> fn(catalog) now (if loaded) and after every refresh
 */
(function () {
  if (window.NanseiCatalog) return;
  var CACHE_KEY = 'ns_catalog_v1';
  var local = ['localhost', '127.0.0.1'].indexOf(location.hostname) >= 0 || location.protocol === 'file:';
  var API = window.API_BASE || (local ? 'http://localhost:5000/api' : '/api');
  var CATEGORY = { rice: 'Rice Varieties', flowers: 'Dried Flowers', beverages: 'Beverages', flour: 'Flour Varieties', other: 'Other Products' };
  var listeners = [];
  var state = { products: [], source: 'none' };

  function fromSnapshot(p) {
    return {
      id: p.legacyId, legacyId: p.legacyId, dbId: null, name: p.name, category: p.category,
      image: (p.images || [])[0] || '', images: p.images || [], description: p.description || '',
      sizes: (p.sizes || []).map(function (z) { return { sku: z.sku, label: z.label, amount: z.amount, unit: z.unit, price: z.price, mrp: z.mrp, stock: z.stock == null ? null : z.stock, active: z.active !== false }; }),
      active: true,
    };
  }
  function fromApi(p) {
    var imgs = (p.images || []).map(function (i) { return i && (i.url || i); }).filter(Boolean);
    return {
      id: p.legacyId != null ? p.legacyId : p._id, legacyId: p.legacyId != null ? p.legacyId : null, dbId: p._id, name: p.name,
      category: CATEGORY[p.category] || p.category, image: imgs[0] || '', images: imgs, description: p.description || '',
      sizes: (p.sizes || []).filter(function (z) { return z.active !== false; }).map(function (z) {
        return { sku: z.sku, label: z.label, amount: z.amount, unit: z.unit, price: z.price, mrp: z.mrp, stock: z.stock == null ? null : z.stock, active: true };
      }),
      active: p.isActive !== false,
      rating: Number(p.numReviews || 0) > 0 ? Number(p.rating || 0) : 0, reviews: p.numReviews || 0,
    };
  }
  function publish(list, source) {
    state.products = list; state.source = source;
    listeners.forEach(function (fn) { try { fn(api); } catch (e) { console.warn('catalog listener', e); } });
  }
  function merge(base, live) {
    // live products (with sizes) win; snapshot products stay for anything the server does not have yet
    var out = base.slice();
    live.forEach(function (lp) {
      var i = out.findIndex(function (bp) { return (lp.legacyId != null && bp.legacyId === lp.legacyId) || (bp.dbId && bp.dbId === lp.dbId); });
      if (i >= 0) out[i] = lp; else out.push(lp);
    });
    return out.filter(function (p) { return p.active; });
  }

  var api = window.NanseiCatalog = {
    get products() { return state.products; },
    get source() { return state.source; },
    get: function (id) {
      var s = String(id);
      return state.products.find(function (p) { return String(p.id) === s || String(p.legacyId) === s || String(p.dbId) === s; }) || null;
    },
    /** the size to show first: the 1 kg / 1 L pack when there is one, otherwise the first */
    defaultSize: function (p) {
      if (!p || !p.sizes || !p.sizes.length) return null;
      return p.sizes.find(function (z) { return z.amount === 1000 && z.stock !== 0; }) || p.sizes.find(function (z) { return z.stock !== 0; }) || p.sizes[0];
    },
    size: function (p, skuOrLabel) {
      if (!p || !p.sizes) return null;
      var k = String(skuOrLabel || '').toUpperCase().replace(/\s+/g, '');
      return p.sizes.find(function (z) { return String(z.sku).toUpperCase() === k || String(z.label).toUpperCase().replace(/\s+/g, '') === k; }) || null;
    },
    onUpdate: function (fn) { listeners.push(fn); if (state.products.length) fn(api); },
    ready: null,
  };

  try { var cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); if (cached && cached.length) state.products = cached, state.source = 'saved'; } catch (e) { /* ignore */ }

  var snapshot = fetch('data/catalog.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : []; })
    .then(function (list) { return (list || []).map(fromSnapshot); }).catch(function () { return []; });

  api.ready = snapshot.then(function (snap) {
    if (state.source !== 'saved' && snap.length) publish(snap, 'snapshot');
    return fetch(API + '/products?limit=200').then(function (r) { return r.json(); }).then(function (d) {
      var live = ((d && d.products) || []).filter(function (p) { return p.sizes && p.sizes.length; }).map(fromApi);
      if (!live.length) { if (state.source === 'saved' && snap.length) publish(snap, 'snapshot'); return api; }
      // once the catalogue is migrated the server knows every product (and leaves out ones the admin switched off)
      var list = live.some(function (p) { return p.legacyId != null; }) ? live : merge(snap, live);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(list)); } catch (e) { /* ignore */ }
      publish(list, 'live');
      return api;
    }).catch(function () { return api; });
  });
})();
