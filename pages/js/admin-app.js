/* Nansei Organics store admin — the pages. Shared parts are in admin-core.js (window.A). */
(function () {
  'use strict';
  const { $, $$, esc, rupee, icon } = A;

  const CATS = [['rice', 'Rice'], ['flowers', 'Dried flowers'], ['beverages', 'Drinks'], ['flour', 'Flour and mixes'], ['other', 'Other']];
  const catName = k => (CATS.find(c => c[0] === k) || [0, k || '—'])[1];
  const ST = {
    Pending: ['Placed', 'b-amber'], Processing: ['Confirmed', 'b-blue'], Packed: ['Packed', 'b-gold'],
    Shipped: ['Shipped', 'b-green'], Delivered: ['Delivered', 'b-forest'], Cancelled: ['Cancelled', 'b-red'], Refunded: ['Refunded', 'b-grey'],
  };
  const statusBadge = s => { const x = ST[s] || [s || '—', 'b-grey']; return '<span class="badge ' + x[1] + '">' + esc(x[0]) + '</span>'; };
  const payBadge = o => o.isPaid ? '<span class="badge b-green">Paid</span>' : o.paymentMethod === 'COD' ? (o.orderStatus === 'Delivered' ? '<span class="badge b-amber">COD not marked paid</span>' : '<span class="badge b-grey">Cash on delivery</span>') : (o.orderStatus === 'Cancelled' ? '<span class="badge b-grey">Unpaid</span>' : '<span class="badge b-red">Payment pending</span>');
  const custName = o => (o.user && (o.user.name || o.user.email)) || (o.shippingAddress && o.shippingAddress.fullName) || 'Guest';
  const itemCount = o => (o.items || []).reduce((n, i) => n + (Number(i.quantity) || 0), 0);
  const isLive = p => p.isActive !== false;
  const trackedSizes = p => (p.sizes || []).filter(z => z.active !== false && z.stock != null);
  const totalStock = p => { const t = trackedSizes(p); return t.length ? t.reduce((n, z) => n + z.stock, 0) : null; };
  const soldOut = p => { const live = (p.sizes || []).filter(z => z.active !== false); return live.length > 0 && live.every(z => z.stock === 0); };
  const lowAt = p => p.lowStockAt != null ? p.lowStockAt : 5;
  const isLow = p => (p.sizes || []).some(z => z.active !== false && z.stock != null && z.stock > 0 && z.stock <= lowAt(p));
  const priceRange = p => { const ps = (p.sizes || []).filter(z => z.active !== false).map(z => z.price); if (!ps.length) return rupee(p.price); const a = Math.min(...ps), b = Math.max(...ps); return a === b ? rupee(a) : rupee(a) + ' – ' + rupee(b); };
  const productLink = p => 'product.html?id=' + encodeURIComponent(p.legacyId || p._id);
  const set = (o, path, v) => { const k = path.split('.'); let t = o; k.slice(0, -1).forEach(x => { if (!t[x] || typeof t[x] !== 'object') t[x] = {}; t = t[x]; }); t[k[k.length - 1]] = v; };
  const get = (o, path) => path.split('.').reduce((t, k) => (t == null ? undefined : t[k]), o);
  const clone = o => JSON.parse(JSON.stringify(o == null ? null : o));
  /** read every [data-f] field inside root into an object (checkboxes become true/false) */
  function collect(root) { const out = {}; $$('[data-f]', root).forEach(el => set(out, el.dataset.f, el.type === 'checkbox' ? el.checked : el.value.trim())); return out; }
  function fill(root, obj) { $$('[data-f]', root).forEach(el => { const v = get(obj, el.dataset.f); if (el.type === 'checkbox') el.checked = !!v; else el.value = v == null ? '' : v; }); }
  /** mark the page as changed when any field inside root changes */
  function watch(root, handlers) { const on = () => A.setDirty(handlers); root.addEventListener('input', on); root.addEventListener('change', on); }

  /* shared store settings: a save always sends the whole record (the server replaces it) */
  let SETTINGS = null;
  async function loadSettings(force) { if (!SETTINGS || force) { const r = await A.api('GET', '/settings/admin'); SETTINGS = { effective: r.effective || {}, saved: r.data || {} }; } return SETTINGS; }
  async function saveSettings(patch) {
    const e = clone(SETTINGS.effective);
    (function merge(t, s) { Object.keys(s).forEach(k => { if (s[k] && typeof s[k] === 'object' && !Array.isArray(s[k])) { if (!t[k] || typeof t[k] !== 'object') t[k] = {}; merge(t[k], s[k]); } else t[k] = s[k]; }); })(e, patch);
    const body = { storeName: e.storeName, contact: e.contact, legal: e.legal, shipping: e.shipping, announcement: e.announcement, homepage: e.homepage, social: e.social, footer: e.footer };
    const r = await A.api('PUT', '/settings', body);
    SETTINGS = { effective: r.effective || e, saved: r.data || {} };
    return SETTINGS;
  }

  const sw = (f, label, hint) => '<label class="switch"><input type="checkbox" data-f="' + f + '"/><i></i><span>' + label + (hint ? '<small class="muted" style="display:block;font-weight:500;font-size:12px">' + hint + '</small>' : '') + '</span></label>';
  const field = (f, label, opt) => {
    opt = opt || {};
    const attrs = (opt.type ? ' type="' + opt.type + '"' : '') + (opt.max ? ' maxlength="' + opt.max + '"' : '') + (opt.min != null ? ' min="' + opt.min + '"' : '') + (opt.ph ? ' placeholder="' + esc(opt.ph) + '"' : '') + (opt.step ? ' step="' + opt.step + '"' : '');
    const input = opt.area ? '<textarea class="in" data-f="' + f + '" id="f-' + f + '" rows="' + (opt.rows || 4) + '"' + attrs + '></textarea>'
      : opt.options ? '<select class="sel" data-f="' + f + '" id="f-' + f + '">' + opt.options.map(([v, l]) => '<option value="' + esc(v) + '">' + esc(l) + '</option>').join('') + '</select>'
        : opt.prefix ? '<div class="prefix"><span>' + opt.prefix + '</span><input class="in" data-f="' + f + '" id="f-' + f + '"' + attrs + '/></div>'
          : '<input class="in" data-f="' + f + '" id="f-' + f + '"' + attrs + '/>';
    return '<div class="field' + (opt.full ? ' full' : '') + '"><label for="f-' + f + '">' + label + '</label>' + input + (opt.hint ? '<p class="hint">' + opt.hint + '</p>' : '') + '</div>';
  };

  /* ═════════════════════ HOME (dashboard) ═════════════════════
     A period (today, 7, 30, 90 days, 12 months) compared with the same length of time just before it,
     showing the earlier figure as well as the change. */
  const PERIODS = [['today', 'Today'], ['7', '7 days'], ['30', '30 days'], ['90', '90 days'], ['365', '12 months']];
  const DAY = 86400000;
  function periodRange(p) {
    const now = new Date(), start = new Date(now); start.setHours(0, 0, 0, 0);
    if (p !== 'today') start.setTime(start.getTime() - (Number(p) - 1) * DAY);
    const len = now - start, prevStart = new Date(start.getTime() - (p === 'today' ? DAY : len));
    return { start, end: now, prevStart, prevEnd: start };
  }
  const shortDate = d => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  function delta(cur, prev, money) {
    if (!prev && !cur) return '<span class="delta flat">no change</span>';
    if (!prev) return '<span class="delta up">new</span>';
    const pct = Math.round((cur - prev) / prev * 100);
    return '<span class="delta ' + (pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat') + '">' + (pct > 0 ? '↑ ' : pct < 0 ? '↓ ' : '') + Math.abs(pct) + '%</span>';
  }
  function buckets(p, r) {
    const out = [];
    if (p === 'today') { for (let h = 0; h < 24; h++) out.push({ label: h % 3 ? '' : (h === 0 ? '12a' : h < 12 ? h + 'a' : h === 12 ? '12p' : (h - 12) + 'p'), sub: h + ':00', key: x => new Date(x).getHours() === h }); return out; }
    if (p === '365') { for (let i = 11; i >= 0; i--) { const d = new Date(r.end.getFullYear(), r.end.getMonth() - i, 1); out.push({ label: d.toLocaleString('en-IN', { month: 'short' }), sub: String(d.getFullYear()), from: d, to: new Date(d.getFullYear(), d.getMonth() + 1, 1) }); } return out; }
    const step = p === '90' ? 7 : 1;
    for (let t = r.start.getTime(); t <= r.end.getTime(); t += step * DAY) { const d = new Date(t); out.push({ label: step === 7 || Number(p) <= 7 ? shortDate(d) : (d.getDate() === 1 || out.length === 0 || d.getDate() % 5 === 0 ? String(d.getDate()) : ''), sub: step === 7 ? 'week of ' + shortDate(d) : shortDate(d), from: d, to: new Date(t + step * DAY) }); }
    return out;
  }
  A.route('dashboard', async v => {
    const p = PERIODS.some(x => x[0] === A.query().get('p')) ? A.query().get('p') : '30';
    const r = periodRange(p);
    const [stats, orders, prods, revs, st, custs, blogs, news, conn] = await Promise.allSettled([A.api('GET', '/orders/admin/stats'), A.api('GET', '/orders?limit=2000'), A.load('products', true), A.load('reviews', true), loadSettings(), A.load('customers', true), A.api('GET', '/blogs/admin/all'), A.api('GET', '/news/admin/all'), A.api('GET', '/settings/status')]);
    const ok = x => x.status === 'fulfilled';
    const d = ok(stats) ? stats.value.data || {} : {};
    const O = ok(orders) ? orders.value.data || [] : [];
    const totalOrders = ok(orders) ? orders.value.total || O.length : 0;
    const PR = ok(prods) ? prods.value : [], RV = ok(revs) ? revs.value : [], CU = ok(custs) ? custs.value : [];
    const inR = (x, a, b) => { const t = new Date(x).getTime(); return t >= a.getTime() && t < b.getTime() + 1; };
    const counted = o => !['Cancelled', 'Refunded'].includes(o.orderStatus);
    const cur = O.filter(o => inR(o.createdAt, r.start, r.end)), prev = O.filter(o => inR(o.createdAt, r.prevStart, r.prevEnd) && new Date(o.createdAt) < r.start);
    const sum = l => l.filter(counted).reduce((n, o) => n + (o.totalPrice || 0), 0);
    const cnt = l => l.filter(counted).length;
    const S = { sales: sum(cur), orders: cnt(cur), aov: cnt(cur) ? sum(cur) / cnt(cur) : 0, cust: CU.filter(c => inR(c.createdAt, r.start, r.end)).length };
    const P = { sales: sum(prev), orders: cnt(prev), aov: cnt(prev) ? sum(prev) / cnt(prev) : 0, cust: CU.filter(c => inR(c.createdAt, r.prevStart, r.prevEnd) && new Date(c.createdAt) < r.start).length };
    const prevLabel = p === 'today' ? 'yesterday' : shortDate(r.prevStart) + ' – ' + shortDate(new Date(r.prevEnd.getTime() - 1));

    // to do (not tied to the period)
    const count = s => O.filter(o => o.orderStatus === s).length;
    const awaitingPay = O.filter(o => !o.isPaid && o.paymentMethod !== 'COD' && counted(o)).length;
    const shipErr = O.filter(o => o.shippingError && ['Pending', 'Processing', 'Packed'].includes(o.orderStatus)).length;
    const watch = [];
    PR.filter(isLive).forEach(pp => (pp.sizes || []).forEach(z => { if (z.active === false || z.stock == null) return; if (z.stock <= lowAt(pp)) watch.push([pp, z]); }));
    const outN = watch.filter(w => w[1].stock <= 0).length, lowN = watch.length - outN;
    const noReply = RV.filter(x => !(x.reply && x.reply.text) && x.isApproved !== false).length;
    const legal = (ok(st) && st.value.effective.legal) || {};
    setCounts(count('Pending') + count('Processing') + count('Packed'), watch.length, noReply);
    const todo = [
      [count('Pending'), 'Orders to confirm', 'New orders waiting for you to accept them', '#/orders?tab=Pending', 't-amber', 'bag'],
      [count('Processing'), 'Orders to pack', 'Confirmed and waiting to be packed', '#/orders?tab=Processing', 't-blue', 'box'],
      [count('Packed'), 'Ready to ship', 'Packed; book the courier or enter the AWB', '#/orders?tab=Packed', 't-gold', 'truck'],
      [shipErr, 'Shipment bookings failed', 'Open them to retry or ship by hand', '#/orders?tab=problem', 't-red', 'alert'],
      [awaitingPay, 'Online payments not received', 'Prepaid orders without a confirmed payment', '#/orders?tab=unpaid', 't-red', 'card'],
      [outN, 'Sizes sold out', 'Customers cannot buy these until you add stock', '#/inventory?tab=out', 't-red', 'stock'],
      [lowN, 'Sizes running low', 'At or below the warning level you set', '#/inventory?tab=low', 't-amber', 'stock'],
      [noReply, 'Reviews without a reply', 'A short answer helps other shoppers', '#/reviews?tab=noreply', 't-green', 'msg'],
    ].filter(t => t[0] > 0);
    if (!legal.fssai) todo.push(['', 'Add your FSSAI licence number', 'Food sellers in India show it on the site and on packs', '#/settings?s=legal', 't-gold', 'gear']);
    const cs = ok(conn) ? conn.value.data || {} : null;
    if (cs && !(cs.payments || {}).razorpay) todo.unshift(['', 'Online payments are not set up', 'Customers can only pay cash on delivery until Razorpay is connected', '#/settings?s=connections', 't-red', 'card']);
    else if (cs && (cs.payments || {}).mode === 'test') todo.unshift(['', 'Razorpay is in test mode', 'Payments are not real until you switch to live keys', '#/settings?s=connections', 't-amber', 'card']);
    if (cs && !(cs.email || {}).configured) todo.push(['', 'Order emails are not set up', 'Customers get no confirmation email yet', '#/settings?s=connections', 't-amber', 'msg']);

    // chart: this period, with the previous period as a line
    const B = buckets(p, r);
    const shift = p === 'today' ? DAY : (p === '365' ? null : r.start - r.prevStart);
    const series = B.map(b => {
      const hit = o => counted(o) && (b.key ? inR(o.createdAt, r.start, r.end) && b.key(o.createdAt) : inR(o.createdAt, b.from, new Date(b.to.getTime() - 1)));
      const prevHit = o => {
        if (!counted(o)) return false;
        if (b.key) return inR(o.createdAt, r.prevStart, new Date(r.prevEnd.getTime() - 1)) && b.key(o.createdAt);
        if (shift == null) { const f = new Date(b.from); f.setFullYear(f.getFullYear() - 1); const t = new Date(b.to); t.setFullYear(t.getFullYear() - 1); return inR(o.createdAt, f, new Date(t.getTime() - 1)); }
        return inR(o.createdAt, new Date(b.from.getTime() - shift), new Date(b.to.getTime() - shift - 1));
      };
      return { label: b.label, sub: b.sub, value: O.filter(hit).reduce((n, o) => n + (o.totalPrice || 0), 0), prev: O.filter(prevHit).reduce((n, o) => n + (o.totalPrice || 0), 0) };
    });

    // breakdowns for the period
    const byStatus = Object.keys(ST).map(k => [k, cur.filter(o => o.orderStatus === k).length]).filter(x => x[1]);
    const cod = cur.filter(o => counted(o) && o.paymentMethod === 'COD'), online = cur.filter(o => counted(o) && o.paymentMethod !== 'COD');
    const sold = {};
    cur.filter(counted).forEach(o => (o.items || []).forEach(i => { const k = i.name; sold[k] = sold[k] || { name: k, qty: 0, rev: 0, image: i.image }; sold[k].qty += Number(i.quantity) || 0; sold[k].rev += (Number(i.price) || 0) * (Number(i.quantity) || 0); }));
    const best = Object.values(sold).sort((a, b) => b.rev - a.rev).slice(0, 5), topRev = best.length ? best[0].rev : 1;
    const posts = [ok(blogs) ? blogs.value.data || [] : [], ok(news) ? news.value.data || [] : []];
    const drafts = posts.map(l => l.filter(x => x.isActive === false).length);
    const lastPub = posts.map(l => l.filter(x => x.isActive !== false)[0]);
    const hour = new Date().getHours(), hi = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const first = (A.me && (A.me.firstName || (A.me.name || '').split(' ')[0])) || '';
    const kpi = (label, val, curN, prevN, prevTxt, href) => '<div class="card kpi' + (href ? ' link" onclick="A.go(\'' + href + '\')' : '') + '"><small>' + label + '</small><b>' + val + delta(curN, prevN) + '</b><span class="prev">' + prevTxt + ' ' + prevLabel + '</span></div>';

    v.innerHTML = A.head(esc(hi + (first ? ', ' + first : '')), 'How the shop is doing, and what needs you today.', '<a class="btn" href="index.html" target="_blank" rel="noopener">' + icon('ext') + 'View shop</a><a class="btn pri" href="#/orders">Orders</a>') +
      '<div class="period"><div class="seg" role="tablist" aria-label="Period">' + PERIODS.map(([k, l]) => '<button type="button" role="tab" aria-selected="' + (k === p) + '" class="' + (k === p ? 'on' : '') + '" data-p="' + k + '">' + l + '</button>').join('') + '</div><span class="muted">' + (p === 'today' ? 'Today so far, compared with yesterday' : shortDate(r.start) + ' – ' + shortDate(r.end) + ', compared with the ' + (p === '365' ? '12 months' : p + ' days') + ' before') + '</span>' + (totalOrders > O.length ? '<span class="muted">· based on the latest ' + O.length + ' orders</span>' : '') + '</div>' +
      '<div class="grid g4" style="margin-bottom:16px">' +
      kpi('Sales', rupee(Math.round(S.sales)), S.sales, P.sales, rupee(Math.round(P.sales)), '#/orders') +
      kpi('Orders', S.orders, S.orders, P.orders, P.orders, '#/orders') +
      kpi('Average order', rupee(Math.round(S.aov)), S.aov, P.aov, rupee(Math.round(P.aov))) +
      kpi('New customers', S.cust, S.cust, P.cust, P.cust, '#/customers') + '</div>' +
      '<div class="split" style="margin-bottom:16px"><div class="card"><div class="card-h"><h2>Sales</h2><span class="sp"></span><div class="legend"><span><i style="background:#2d5a3d"></i>This period</span><span><i style="background:#c9a84c;height:3px;vertical-align:3px"></i>Period before</span></div></div><div class="card-b"><div class="chart" id="revChart"></div></div></div>' +
      '<div class="card"><div class="card-h"><h2>To do</h2><span class="sp"></span>' + (todo.length ? '<small>' + todo.length + '</small>' : '') + '</div>' +
      (todo.length ? todo.map(t => '<a class="todo" href="' + t[3] + '"><i class="' + t[4] + '">' + icon(t[5]) + '</i><div><b>' + esc(t[1]) + '</b><span>' + esc(t[2]) + '</span></div>' + (t[0] !== '' ? '<em>' + t[0] + '</em>' : '') + '</a>').join('') : '<div class="empty"><b>All caught up</b>No orders, stock or reviews need you right now.</div>') + '</div></div>' +
      '<div class="grid g3" style="margin-bottom:16px">' +
      '<div class="card"><div class="card-h"><h2>Top products</h2><span class="sp"></span><small>This period</small></div><div class="card-b tight">' + (best.length ? best.map(b => '<div class="bar-row"><span class="small"><b>' + esc(b.name) + '</b> · ' + A.plural(b.qty, 'pack') + '</span><b class="small tab-nums">' + rupee(b.rev) + '</b><span class="track"><i style="width:' + Math.max(4, Math.round(b.rev / topRev * 100)) + '%"></i></span></div>').join('') : '<p class="muted small" style="padding:10px 0">No sales in this period yet.</p>') + '</div></div>' +
      '<div class="card"><div class="card-h"><h2>Orders by status</h2><span class="sp"></span><small>This period</small></div><div class="card-b tight">' + (byStatus.length ? byStatus.map(([k, n]) => '<a class="bar-row" href="#/orders?tab=' + k + '" style="text-decoration:none;color:inherit"><span class="small">' + statusBadge(k) + '</span><b class="small">' + n + '</b><span class="track"><i style="width:' + Math.round(n / cur.length * 100) + '%;background:' + (k === 'Cancelled' || k === 'Refunded' ? '#d9a3a3' : '#2d5a3d') + '"></i></span></a>').join('') : '<p class="muted small" style="padding:10px 0">No orders in this period.</p>') +
      '<p class="lbl" style="margin-top:12px">How customers paid</p>' + (cod.length + online.length ? '<div class="mix"><i style="width:' + (online.length / (cod.length + online.length) * 100) + '%;background:#2d5a3d"></i><i style="width:' + (cod.length / (cod.length + online.length) * 100) + '%;background:#c9a84c"></i></div><div class="mix-l"><span><b>' + online.length + '</b> online · ' + rupee(sum(online)) + '</span><span><b>' + cod.length + '</b> cash on delivery · ' + rupee(sum(cod)) + '</span></div>' : '<p class="muted small">No paid orders yet.</p>') + '</div></div>' +
      '<div class="card"><div class="card-h"><h2>Stock to watch</h2><span class="sp"></span><a class="btn xs" href="#/inventory?tab=low">Stock</a></div><div class="card-b tight">' + (watch.length ? watch.sort((a, b) => a[1].stock - b[1].stock).slice(0, 6).map(([pp, z]) => '<div class="line-item"><img class="thumb" src="' + esc(A.firstImg(pp)) + '" alt=""/><div style="flex:1;min-width:0"><a href="#/products/' + esc(pp._id) + '"><b class="small">' + esc(pp.name) + '</b></a><div class="q">' + esc(z.label) + '</div></div>' + (z.stock > 0 ? '<span class="badge b-amber">' + z.stock + ' left</span>' : '<span class="badge b-red">Sold out</span>') + '</div>').join('') : '<p class="muted small" style="padding:10px 0">Nothing is running low. Only sizes with a stock count are watched.</p>') + '</div></div></div>' +
      '<div class="split"><div class="card"><div class="card-h"><h2>Latest orders</h2><span class="sp"></span><a class="btn sm" href="#/orders">All orders</a></div><div class="tbl"><table><tbody>' +
      (O.slice(0, 7).map(o => '<tr class="rowlink" onclick="A.go(\'#/orders/' + esc(o._id) + '\')"><td><b>' + esc(o.orderNumber || '—') + '</b><div class="muted small">' + esc(custName(o)) + '</div></td><td class="small muted hide-sm">' + A.ago(o.createdAt) + '</td><td>' + statusBadge(o.orderStatus) + '</td><td class="num"><b>' + rupee(o.totalPrice) + '</b></td></tr>').join('') || '<tr><td><div class="empty"><b>No orders yet</b>New orders appear here as they come in.</div></td></tr>') +
      '</tbody></table></div></div>' +
      '<div class="card"><div class="card-h"><h2>Blogs and news</h2></div><div class="card-b stack">' +
      [['Blogs', '#/blogs', '#/blogs/new', 'Write an article', 0], ['News', '#/news', '#/news/new', 'Add news', 1]].map(([t, h, n, l, i]) => '<div class="line-item" style="padding:0"><div style="flex:1;min-width:0"><a href="' + h + '"><b>' + t + '</b></a><div class="q">' + (lastPub[i] ? 'Last published ' + A.ago(lastPub[i].publishedAt || lastPub[i].createdAt) : 'Nothing published yet') + (drafts[i] ? ' · ' + A.plural(drafts[i], 'draft') : '') + '</div></div><a class="btn sm" href="' + n + '">' + icon('plus', 14) + l + '</a></div>').join('') +
      '</div></div></div>';
    $$('.period .seg button', v).forEach(b => { b.onclick = () => A.go('#/?p=' + b.dataset.p); });
    A.barChart($('#revChart'), series, (n, axis) => axis ? A.rupeeShort(n) : rupee(n));
  }, 'Home');


  function setCounts(toShip, stock, reviews) {
    const s = (id, n) => { const el = $(id); if (!el) return; el.textContent = n; el.hidden = !n; };
    if (toShip != null) s('#cOrders', toShip); if (stock != null) s('#cLow', stock); if (reviews != null) s('#cReviews', reviews);
  }

  /* ═════════════════════ ORDERS ═════════════════════ */
  let ORDERS = [];
  A.route('orders', async (v, parts) => {
    if (parts[0]) return orderPage(v, parts[0]);
    const q = A.query();
    v.innerHTML = A.head('Orders', 'Newest first. Click an order to confirm, pack, ship or print it.', '<button class="btn" type="button" id="oCsv">' + icon('dl') + 'Export</button>') + '<div id="oTable"></div>';
    const res = await A.api('GET', '/orders?limit=500');
    ORDERS = res.data || [];
    const total = res.total || ORDERS.length;
    const T = A.table({
      el: $('#oTable'), rows: () => filterOrders(ORDERS), key: o => o._id, placeholder: 'Order number, customer, phone or city', perPage: 40, q: q.get('q') || '', tab: q.get('tab') || 'all',
      tools: '<select class="sel" id="oWhen" aria-label="Order date"><option value="">Any date</option><option value="today">Today</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="month">This month</option><option value="custom">Choose dates…</option></select>' +
        '<span id="oRange" hidden><input class="in" type="date" id="oFrom" aria-label="From"/> <span class="muted small">to</span> <input class="in" type="date" id="oTo" aria-label="To"/></span>' +
        '<select class="sel" id="oPay" aria-label="Payment"><option value="">Any payment</option><option value="online">Paid online</option><option value="cod">Cash on delivery</option></select><span class="small muted" id="oSum" style="margin-left:auto"></span>',
      onDraw: list => { const el = $('#oSum'); if (!el) return; const live = list.filter(o => !['Cancelled', 'Refunded'].includes(o.orderStatus)); el.textContent = A.plural(list.length, 'order') + ' · ' + rupee(live.reduce((n, o) => n + (o.totalPrice || 0), 0)) + ' not counting cancelled'; },
      tabs: [['all', 'All'], ['Pending', 'Placed', o => o.orderStatus === 'Pending'], ['Processing', 'Confirmed', o => o.orderStatus === 'Processing'], ['Packed', 'Packed', o => o.orderStatus === 'Packed'], ['Shipped', 'Shipped', o => o.orderStatus === 'Shipped'], ['Delivered', 'Delivered', o => o.orderStatus === 'Delivered'], ['Cancelled', 'Cancelled', o => o.orderStatus === 'Cancelled' || o.orderStatus === 'Refunded'], ['unpaid', 'Payment pending', o => !o.isPaid && o.paymentMethod !== 'COD' && !['Cancelled', 'Refunded'].includes(o.orderStatus)], ['problem', 'Shipping problem', o => !!o.shippingError && ['Pending', 'Processing', 'Packed'].includes(o.orderStatus)]],
      search: (o, s) => [o.orderNumber, custName(o), o.user && o.user.email, o.shippingAddress && o.shippingAddress.phone, o.shippingAddress && o.shippingAddress.city, o.trackingNumber].some(x => String(x || '').toLowerCase().includes(s)),
      onOpen: o => A.go('#/orders/' + o._id), onState: s => A.setQuery({ tab: s.tab, q: s.q }),
      cols: [
        { k: 'no', label: 'Order', sort: o => o.orderNumber || '', html: o => '<b>' + esc(o.orderNumber || '—') + '</b>' + (o.couponCode ? '<div class="muted small">Code ' + esc(o.couponCode) + '</div>' : '') },
        { k: 'date', label: 'Date', sort: o => +new Date(o.createdAt), html: o => '<span class="small" title="' + esc(A.dateTime(o.createdAt)) + '">' + A.ago(o.createdAt) + '</span>' },
        { k: 'cust', label: 'Customer', sort: o => custName(o).toLowerCase(), html: o => esc(custName(o)) + '<div class="muted small">' + esc((o.shippingAddress || {}).city || '') + '</div>' },
        { k: 'items', label: 'Items', cls: 'hide-sm', sort: itemCount, html: o => '<span class="small">' + A.plural(itemCount(o), 'item') + '</span>' },
        { k: 'pay', label: 'Payment', cls: 'hide-sm', html: payBadge },
        { k: 'st', label: 'Status', sort: o => Object.keys(ST).indexOf(o.orderStatus), html: o => statusBadge(o.orderStatus) + (o.shippingError && ['Pending', 'Processing', 'Packed'].includes(o.orderStatus) ? ' <span class="badge b-red plain" title="' + esc(o.shippingError) + '">!</span>' : '') },
        { k: 'tot', label: 'Total', num: true, sort: o => o.totalPrice || 0, html: o => '<b>' + rupee(o.totalPrice) + '</b>' },
      ],
      bulk: [
        ['Confirm orders', list => bulkStatus(list, 'Processing', ['Pending'])],
        ['Mark packed', list => bulkStatus(list, 'Packed', ['Processing'])],
        ['Print packing slips', list => { printSlips(list); return false; }],
        ['Export selected', list => { exportOrders(list); return false; }],
      ],
      empty: '<div class="empty"><b>No orders yet</b>When customers order, they appear here.</div>',
    });
    if (total > ORDERS.length) A.toast('Showing the latest ' + ORDERS.length + ' of ' + total + ' orders');
    const refilter = () => { $('#oRange').hidden = $('#oWhen').value !== 'custom'; T.state.page = 1; T.state.sel.clear(); T.draw(); };
    ['#oWhen', '#oPay', '#oFrom', '#oTo'].forEach(id => $(id).addEventListener('change', refilter));
    $('#oCsv').onclick = () => exportOrders(T.filtered());
    async function bulkStatus(list, status, from) {
      const ok = list.filter(o => from.includes(o.orderStatus));
      if (!ok.length) { A.toast('None of the selected orders can move to ' + ST[status][0].toLowerCase(), true); return false; }
      if (!await A.confirm(ST[status][0] + ' ' + A.plural(ok.length, 'order') + '?', ok.length < list.length ? (list.length - ok.length) + ' selected order(s) are at another step and will be left as they are.' : 'The customers can see the new status on their order page.', ST[status][0] + ' ' + A.plural(ok.length, 'order'))) return false;
      await A.each(ok, async o => { await A.api('PUT', '/orders/' + o._id + '/status', { status }); o.orderStatus = status; }, ST[status][0]);
      T.draw();
    }
  }, 'Orders');

  /** the orders list narrowed by the date and payment boxes above it */
  function filterOrders(list) {
    const w = $('#oWhen') ? $('#oWhen').value : '', pay = $('#oPay') ? $('#oPay').value : '';
    const d0 = new Date(); d0.setHours(0, 0, 0, 0);
    let from = null, to = null;
    if (w === 'today') from = d0;
    else if (w === '7' || w === '30') from = new Date(d0.getTime() - (Number(w) - 1) * 864e5);
    else if (w === 'month') from = new Date(d0.getFullYear(), d0.getMonth(), 1);
    else if (w === 'custom') { const a = $('#oFrom').value, b = $('#oTo').value; if (a) from = new Date(a + 'T00:00'); if (b) to = new Date(b + 'T23:59:59.999'); }
    return list.filter(o => { const t = new Date(o.createdAt); if (from && t < from) return false; if (to && t > to) return false; if (pay === 'cod' && o.paymentMethod !== 'COD') return false; if (pay === 'online' && o.paymentMethod === 'COD') return false; return true; });
  }
  function exportOrders(list) {
    A.csv('orders', ['Order', 'Date', 'Customer', 'Email', 'Phone', 'City', 'State', 'Pincode', 'Items', 'Subtotal', 'Delivery', 'GST', 'COD fee', 'Discount', 'Total', 'Payment', 'Paid', 'Status', 'Courier', 'AWB'],
      list.map(o => { const a = o.shippingAddress || {}; return [o.orderNumber, A.dateTime(o.createdAt), custName(o), (o.user && o.user.email) || a.email || '', a.phone, a.city, a.state, a.pincode, (o.items || []).map(i => i.name + ' ' + (i.selectedQuantity || '') + ' x' + i.quantity).join('; '), o.itemsPrice, o.shippingPrice, o.taxPrice, o.codFee, o.discount, o.totalPrice, o.paymentMethod, o.isPaid ? 'yes' : 'no', (ST[o.orderStatus] || [o.orderStatus])[0], o.courierService, o.trackingNumber]; }));
  }

  async function orderPage(v, id) {
    v.classList.add('narrow');
    const o = (await A.api('GET', '/orders/' + encodeURIComponent(id))).data;
    if (!o || !o._id) throw new Error('Order not found');
    const st = await loadSettings().catch(() => null);
    const a = o.shippingAddress || {}, u = o.user || {}, s = o.orderStatus, n = x => Number(x) || 0;
    const phone = String(a.phone || u.phone || '').replace(/\D/g, '');
    const wa = phone ? 'https://wa.me/' + (phone.length === 10 ? '91' + phone : phone) + '?text=' + encodeURIComponent('Hello ' + (a.fullName || '') + ', this is Nansei Organics about your order ' + (o.orderNumber || '') + '.') : '';
    const open = ['Pending', 'Processing', 'Packed'].includes(s);
    const flow = ['Pending', 'Processing', 'Packed', 'Shipped', 'Delivered'];
    const at = { Pending: o.createdAt, Delivered: o.deliveredAt };
    const idx = flow.indexOf(s);
    const steps = s === 'Cancelled' || s === 'Refunded'
      ? '<div class="note-box">This order was ' + (s === 'Refunded' ? 'refunded' : 'cancelled') + (o.cancelledAt ? ' on ' + A.dateTime(o.cancelledAt) : '') + '.' + (o.cancellationReason ? ' Reason: ' + esc(o.cancellationReason) : '') + ' Stock was put back.</div>'
      : '<div class="steps">' + flow.map((f, i) => '<div class="step' + (i <= idx ? ' done' : '') + (i === idx ? ' now' : '') + '">' + ST[f][0] + (at[f] && i <= idx ? '<small>' + A.date(at[f]) + '</small>' : '') + '</div>').join('') + '</div>';
    const rows = [['Items', n(o.itemsPrice)], ['Delivery', n(o.shippingPrice)]];
    if (n(o.taxPrice)) rows.push(['GST', n(o.taxPrice)]);
    if (n(o.codFee)) rows.push(['Cash on delivery fee', n(o.codFee)]);
    if (n(o.discount)) rows.push(['Discount' + (o.couponCode ? ' (' + o.couponCode + ')' : ''), -n(o.discount)]);
    const next = { Pending: ['Processing', 'Confirm order'], Processing: ['Packed', 'Mark packed'], Shipped: ['Delivered', 'Mark delivered'] }[s];
    const events = (o.trackingEvents || []).slice().sort((x, y) => new Date(y.at) - new Date(x.at));
    v.innerHTML = A.head(esc(o.orderNumber || 'Order') + ' ' + statusBadge(s) + ' ' + payBadge(o), 'Placed ' + A.dateTime(o.createdAt) + ' · ' + esc(o.paymentMethod === 'COD' ? 'Cash on delivery' : (o.paymentMethod || '')),
      '<button class="btn" type="button" id="oPrint">' + icon('print') + 'Packing slip</button><button class="btn" type="button" id="oInv">' + icon('print') + 'Invoice</button>' +
      (next ? '<button class="btn pri" type="button" id="oNext">' + next[1] + '</button>' : '') + (open ? '<button class="btn ' + (s === 'Packed' ? 'pri' : '') + '" type="button" id="oShip">' + icon('truck') + 'Ship</button>' : ''),
      ['#/orders', 'Orders']) +
      '<div class="split"><div>' +
      '<div class="card"><div class="card-b">' + steps + '</div></div>' +
      (o.shippingError && open ? '<div class="card"><div class="card-b"><div class="note-box"><b>Shiprocket could not book this shipment.</b> ' + esc(o.shippingError) + '</div></div></div>' : '') +
      '<div class="card"><div class="card-h"><h2>Items</h2><span class="sp"></span><small>' + A.plural(itemCount(o), 'item') + '</small></div><div class="card-b tight">' +
      (o.items || []).map(it => { const pid = it.product && (it.product._id || it.product); return '<div class="line-item"><img class="thumb lg" src="' + esc(A.thumb((it.product && it.product.images && it.product.images[0] && it.product.images[0].url) || it.image, 112)) + '" alt=""/><div style="flex:1;min-width:0">' + (pid ? '<a href="#/products/' + esc(pid) + '"><b>' + esc(it.name) + '</b></a>' : '<b>' + esc(it.name) + '</b>') + '<div class="q">' + esc(it.selectedQuantity || '') + (it.sku ? ' · ' + esc(it.sku) : '') + ' · ' + rupee(it.price) + ' × ' + esc(it.quantity) + '</div></div><b class="tab-nums">' + rupee(n(it.price) * n(it.quantity)) + '</b></div>'; }).join('') +
      '<div style="padding:10px 0 4px">' + rows.map(([k, x]) => '<div class="tot"><span class="muted">' + esc(k) + '</span><span class="tab-nums">' + (x < 0 ? '− ' + rupee(-x) : rupee(x)) + '</span></div>').join('') + '<div class="tot big"><span>Total</span><span class="tab-nums">' + rupee(o.totalPrice) + '</span></div></div></div>' +
      '<div class="card-f">' + payBadge(o) + '<span class="small muted">' + esc(o.paymentInfo && o.paymentInfo.id ? 'Payment ID ' + o.paymentInfo.id : '') + '</span><span style="flex:1"></span>' + (!o.isPaid && s !== 'Cancelled' ? '<button class="btn sm" type="button" id="oPaid">Mark payment received</button>' : '') + '</div></div>' +
      '<div class="card"><div class="card-h"><h2>Shipping</h2></div><div class="card-b">' + (o.trackingNumber ? '<dl class="kv"><dt>Courier</dt><dd>' + esc(o.courierService || '—') + '</dd><dt>AWB</dt><dd>' + esc(o.trackingNumber) + ' <button class="linkbtn small" type="button" data-copy="' + esc(o.trackingNumber) + '">Copy</button></dd>' + (/^https:\/\//.test(o.trackingUrl || '') ? '<dt>Tracking</dt><dd><a href="' + esc(o.trackingUrl) + '" target="_blank" rel="noopener">Open tracking page</a></dd>' : '') + (o.shipmentStatus ? '<dt>Courier says</dt><dd>' + esc(o.shipmentStatus) + '</dd>' : '') + (o.estimatedDelivery ? '<dt>Expected</dt><dd>' + A.date(o.estimatedDelivery) + '</dd>' : '') + '</dl>' : '<p class="muted">' + (open ? 'Not shipped yet. Use Ship to book Shiprocket or enter the courier details yourself.' : 'No shipment details recorded.') + '</p>') +
      (events.length ? '<div class="feed" style="margin-top:14px">' + events.slice(0, 12).map(e => '<div><b>' + esc(e.activity || e.status || '') + '</b><small>' + esc([e.location, A.dateTime(e.at)].filter(Boolean).join(' · ')) + '</small></div>').join('') + '</div>' : '') + '</div></div>' +
      '</div><aside>' +
      '<div class="card"><div class="card-h"><h2>Customer</h2></div><div class="card-b"><b>' + esc(u.name || a.fullName || 'Guest') + '</b><div class="small muted" style="line-height:1.7">' + esc(u.email || a.email || '') + '<br>' + esc(u.phone || a.phone || '') + '</div>' +
      '<div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">' + (wa ? '<a class="btn sm" href="' + esc(wa) + '" target="_blank" rel="noopener">' + icon('msg') + 'WhatsApp</a>' : '') + (phone ? '<a class="btn sm" href="tel:' + esc(phone) + '">Call</a>' : '') + (u._id ? '<a class="btn sm" href="#/customers/' + esc(u._id) + '">Profile</a>' : '') + '</div></div></div>' +
      '<div class="card"><div class="card-h"><h2>Ship to</h2><span class="sp"></span><button class="btn xs" type="button" data-copy="' + esc([a.fullName, a.addressLine1, a.addressLine2, [a.city, a.state].filter(Boolean).join(', ') + ' ' + (a.pincode || ''), a.phone].filter(Boolean).join('\n')) + '">' + icon('copy', 13) + 'Copy</button></div><div class="card-b addr">' + [a.fullName, a.addressLine1, a.addressLine2, [a.city, a.state].filter(Boolean).join(', ') + (a.pincode ? ' – ' + a.pincode : ''), a.phone].filter(Boolean).map(esc).join('<br>') + '</div></div>' +
      '<div class="card"><div class="card-h"><h2>Private note</h2></div><div class="card-b"><textarea class="in" id="oNote" rows="3" maxlength="1000" placeholder="Only admins see this">' + esc(o.notes || '') + '</textarea><button class="btn sm" type="button" id="oNoteSave" style="margin-top:8px">Save note</button></div></div>' +
      '<div class="card"><div class="card-b" style="display:flex;flex-direction:column;gap:8px">' +
      (open || s === 'Shipped' ? '<button class="btn red" type="button" id="oCancel">Cancel order</button>' : '') +
      ((s === 'Cancelled' || s === 'Delivered') && o.isPaid ? '<button class="btn" type="button" id="oRefund">Mark refunded</button>' : '') +
      '<p class="hint">Cancelling puts the stock back and releases a Shiprocket booking. Mark refunded after the money has reached the customer.</p></div></div>' +
      '</aside></div>';
    const setS = async (status, extra, msg) => { await A.api('PUT', '/orders/' + o._id + '/status', Object.assign({ status }, extra || {})); A.toast(msg || 'Order updated'); A.refresh(); };
    v.onclick = e => { const c = e.target.closest('[data-copy]'); if (c) navigator.clipboard.writeText(c.dataset.copy).then(() => A.toast('Copied')); };
    $('#oPrint').onclick = () => printSlips([o]);
    $('#oInv').onclick = () => printInvoice(o, st && st.effective);
    if ($('#oNext')) $('#oNext').onclick = async e => { e.target.classList.add('busy'); try { await setS(next[0], null, 'Order ' + ST[next[0]][0].toLowerCase()); } catch (er) { A.toast(er.message, true); e.target.classList.remove('busy'); } };
    if ($('#oPaid')) $('#oPaid').onclick = async () => { if (await A.confirm('Mark payment received?', 'Do this when the money for ' + esc(o.orderNumber) + ' has reached your account.', 'Mark paid')) setS(s, { isPaid: true }, 'Payment recorded').catch(er => A.toast(er.message, true)); };
    $('#oNoteSave').onclick = () => A.api('PUT', '/orders/' + o._id + '/status', { status: s, notes: $('#oNote').value }).then(() => A.toast('Note saved'), er => A.toast(er.message, true));
    if ($('#oCancel')) $('#oCancel').onclick = async () => { if (await A.confirm('Cancel ' + esc(o.orderNumber) + '?', 'Stock goes back on the shelf and any courier booking is released. If the customer paid online, refund them in Razorpay and then mark the order refunded.', 'Cancel order', true)) setS('Cancelled', null, 'Order cancelled').catch(er => A.toast(er.message, true)); };
    if ($('#oRefund')) $('#oRefund').onclick = async () => { if (await A.confirm('Mark as refunded?', 'Only after the money has gone back to the customer.', 'Mark refunded')) setS('Refunded', null, 'Marked refunded').catch(er => A.toast(er.message, true)); };
    if ($('#oShip')) $('#oShip').onclick = () => shipDrawer(o, setS);
  }

  function shipDrawer(o, setS) {
    A.drawer('Ship ' + (o.orderNumber || ''), '<div class="stack"><div class="card"><div class="card-b"><h2 style="font-size:15px;color:var(--forest);margin-bottom:6px">Book with Shiprocket</h2><p class="small muted" style="margin-bottom:12px">Creates the shipment, picks a courier and fills in the AWB and tracking link. Needs the Shiprocket login on the server.</p><button class="btn gold" type="button" id="srBtn">' + icon('truck') + 'Book shipment</button></div></div>' +
      '<div class="card"><div class="card-b"><h2 style="font-size:15px;color:var(--forest);margin-bottom:12px">Or enter it yourself</h2><div class="form">' +
      '<div class="field"><label for="sC">Courier</label><input class="in" id="sC" placeholder="DTDC, India Post…" value="' + esc(o.courierService || '') + '"/></div>' +
      '<div class="field"><label for="sA">AWB / tracking number</label><input class="in" id="sA" value="' + esc(o.trackingNumber || '') + '"/></div>' +
      '<div class="field full"><label for="sU">Tracking link</label><input class="in" id="sU" placeholder="https://…" value="' + esc(o.trackingUrl || '') + '"/></div>' +
      '<div class="field"><label for="sE">Expected delivery</label><input class="in" type="date" id="sE"/></div></div></div></div></div>',
      '<button class="btn" type="button" data-close>Close</button><button class="btn pri" type="button" id="sGo">Mark shipped</button>');
    $('#srBtn').onclick = async e => { const b = e.target.closest('button'); b.classList.add('busy'); try { await A.api('POST', '/shipping/' + o._id + '/ship', null, { timeout: 45000 }); A.toast('Shipment booked'); A.closeDrawer(); A.refresh(); } catch (er) { A.toast(er.message, true); b.classList.remove('busy'); } };
    $('#sGo').onclick = async () => {
      const awb = $('#sA').value.trim(), courier = $('#sC').value.trim(), url = $('#sU').value.trim();
      if (!awb || !courier) { A.toast('Enter the courier and the AWB number from the courier receipt', true); return; }
      if (url && !/^https:\/\//i.test(url)) { A.toast('The tracking link must start with https://', true); return; }
      try { A.closeDrawer(); await setS('Shipped', { trackingNumber: awb, courierService: courier, trackingUrl: url, estimatedDelivery: $('#sE').value || undefined }, 'Marked shipped'); } catch (er) { A.toast(er.message, true); }
    };
  }

  function printWin(title, body) {
    const w = window.open('', '_blank', 'width=760,height=900'); if (!w) { A.toast('Allow pop-ups for this site to print', true); return; }
    w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + esc(title) + '</title><style>body{font-family:Arial,sans-serif;margin:32px;color:#17241b;font-size:13px}h1{font-size:22px;margin:0;color:#0f2218}table{width:100%;border-collapse:collapse;margin:16px 0}td,th{border-bottom:1px solid #ddd;padding:7px 6px;text-align:left}th{font-size:11px;text-transform:uppercase;color:#666}.r{text-align:right}.to{border:2px solid #0f2218;padding:14px;font-size:15px;line-height:1.6;margin-top:14px}.slip{page-break-after:always}.slip:last-child{page-break-after:auto}.muted{color:#666}.hd{display:flex;justify-content:space-between;gap:20px}</style></head><body>' + body + '</' + 'body></' + 'html>');
    w.document.close(); w.focus(); setTimeout(() => w.print(), 250);
  }
  function printSlips(list) {
    printWin('Packing slips', list.map(o => { const a = o.shippingAddress || {}; return '<div class="slip"><div class="hd"><div><h1>Nansei Organics</h1><p class="muted">Packing slip</p></div><div class="r"><b>' + esc(o.orderNumber) + '</b><br>' + A.date(o.createdAt) + '<br>' + (o.paymentMethod === 'COD' && !o.isPaid ? '<b>COLLECT ' + rupee(o.totalPrice) + ' (COD)</b>' : 'Prepaid') + '</div></div>' +
      '<div class="to"><b>Ship to</b><br>' + [a.fullName, a.addressLine1, a.addressLine2, [a.city, a.state].filter(Boolean).join(', ') + ' – ' + (a.pincode || ''), 'Phone ' + (a.phone || '')].filter(Boolean).map(esc).join('<br>') + '</div>' +
      '<table><tr><th>Item</th><th>Size</th><th>Code</th><th class="r">Qty</th><th>Packed</th></tr>' + (o.items || []).map(i => '<tr><td>' + esc(i.name) + '</td><td>' + esc(i.selectedQuantity || '') + '</td><td>' + esc(i.sku || '') + '</td><td class="r">' + esc(i.quantity) + '</td><td>☐</td></tr>').join('') + '</table></div>'; }).join(''));
  }
  function printInvoice(o, st) {
    st = st || {}; const lg = st.legal || {}, c = st.contact || {}, a = o.shippingAddress || {}, n = x => Number(x) || 0;
    printWin('Invoice ' + o.orderNumber, '<div class="hd"><div><h1>' + esc(lg.businessName || st.storeName || 'Nansei Organics') + '</h1><p class="muted">' + esc(c.address || '') + '<br>' + esc([c.phone, c.email].filter(Boolean).join(' · ')) + (lg.gstin ? '<br>GSTIN ' + esc(lg.gstin) : '') + (lg.fssai ? '<br>FSSAI Lic. No. ' + esc(lg.fssai) : '') + '</p></div><div class="r"><h1>Invoice</h1><p>No. <b>' + esc(o.orderNumber) + '</b><br>Date ' + A.date(o.createdAt) + '<br>' + (o.isPaid ? 'Paid' : o.paymentMethod === 'COD' ? 'Cash on delivery' : 'Payment pending') + '</p></div></div>' +
      '<p style="margin-top:18px"><b>Bill to</b><br>' + [a.fullName, a.addressLine1, a.addressLine2, [a.city, a.state].filter(Boolean).join(', ') + ' – ' + (a.pincode || ''), a.phone].filter(Boolean).map(esc).join('<br>') + '</p>' +
      '<table><tr><th>Item</th><th>Size</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Amount</th></tr>' + (o.items || []).map(i => '<tr><td>' + esc(i.name) + '</td><td>' + esc(i.selectedQuantity || '') + '</td><td class="r">' + esc(i.quantity) + '</td><td class="r">' + rupee(i.price) + '</td><td class="r">' + rupee(n(i.price) * n(i.quantity)) + '</td></tr>').join('') +
      '<tr><td colspan="4" class="r">Items</td><td class="r">' + rupee(o.itemsPrice) + '</td></tr>' + (n(o.discount) ? '<tr><td colspan="4" class="r">Discount' + (o.couponCode ? ' (' + esc(o.couponCode) + ')' : '') + '</td><td class="r">− ' + rupee(o.discount) + '</td></tr>' : '') + (n(o.taxPrice) ? '<tr><td colspan="4" class="r">GST</td><td class="r">' + rupee(o.taxPrice) + '</td></tr>' : '') +
      '<tr><td colspan="4" class="r">Delivery</td><td class="r">' + rupee(o.shippingPrice) + '</td></tr>' + (n(o.codFee) ? '<tr><td colspan="4" class="r">Cash on delivery fee</td><td class="r">' + rupee(o.codFee) + '</td></tr>' : '') +
      '<tr><td colspan="4" class="r"><b>Total</b></td><td class="r"><b>' + rupee(o.totalPrice) + '</b></td></tr></table><p class="muted">Thank you for buying from our farm.</p>');
  }

  /* ═════════════════════ PRODUCTS ═════════════════════ */
  A.route('products', async (v, parts) => {
    if (parts[0]) return productPage(v, parts[0]);
    const q = A.query();
    v.innerHTML = A.head('Products', 'Everything on the shop. Click a product to edit its photos, sizes, prices and stock.', '<button class="btn" type="button" id="pCsv">' + icon('dl') + 'Export</button><a class="btn pri" href="#/products/new">' + icon('plus') + 'Add product</a>') + '<div id="pTable"></div>';
    let PR = await A.load('products', true);
    const T = A.table({
      el: $('#pTable'), rows: () => { const c = $('#pCat'); return c && c.value ? PR.filter(p => p.category === c.value) : PR; }, key: p => p._id, placeholder: 'Search by name or size code', q: q.get('q') || '', tab: q.get('tab') || 'all',
      tools: '<select class="sel" id="pCat" aria-label="Category"><option value="">All categories</option>' + CATS.map(([k, l]) => '<option value="' + k + '">' + l + '</option>').join('') + '</select>',
      tabs: [['all', 'All'], ['live', 'On the shop', isLive], ['hidden', 'Hidden', p => !isLive(p)], ['out', 'Sold out', soldOut], ['low', 'Running low', isLow], ['featured', 'Featured', p => !!p.isFeatured]],
      search: (p, s) => String(p.name).toLowerCase().includes(s) || (p.sizes || []).some(z => String(z.sku || '').toLowerCase().includes(s)) || String(p.legacyId || '') === s,
      onOpen: p => A.go('#/products/' + p._id), onState: s => A.setQuery({ tab: s.tab, q: s.q }),
      cols: [
        { k: 'name', label: 'Product', sort: p => String(p.name).toLowerCase(), html: p => '<div class="cell"><img class="thumb" src="' + esc(A.firstImg(p)) + '" alt="" loading="lazy"/><div><b>' + esc(p.name) + '</b><small>' + (p.legacyId ? 'Shop no. ' + esc(p.legacyId) + ' · ' : '') + A.plural((p.images || []).length, 'photo') + '</small></div></div>' },
        { k: 'st', label: 'Status', sort: p => isLive(p) ? 0 : 1, html: p => (isLive(p) ? '<span class="badge b-green">On the shop</span>' : '<span class="badge b-grey">Hidden</span>') + (p.isFeatured ? ' <span class="badge b-gold plain">Featured</span>' : '') },
        { k: 'cat', label: 'Category', cls: 'hide-sm', sort: p => catName(p.category), html: p => '<span class="small">' + esc(catName(p.category)) + '</span>' },
        { k: 'price', label: 'Price', sort: p => p.price || 0, html: p => '<span class="small tab-nums">' + priceRange(p) + '</span><div class="muted small">' + A.plural((p.sizes || []).filter(z => z.active !== false).length, 'size') + '</div>' },
        { k: 'stock', label: 'Stock', num: true, sort: p => totalStock(p) == null ? 1e9 : totalStock(p), html: p => { const t = totalStock(p); return soldOut(p) ? '<span class="badge b-red">Sold out</span>' : t == null ? '<span class="muted small">Not counted</span>' : (isLow(p) ? '<span class="badge b-amber">' + t + ' left</span>' : '<b>' + t + '</b>'); } },
      ],
      bulk: [
        ['Show on shop', list => bulkPut(list, { isActive: true }, 'Shown')],
        ['Hide from shop', list => bulkPut(list, { isActive: false }, 'Hidden')],
        ['Feature on home page', list => bulkPut(list, { isFeatured: true }, 'Featured')],
        ['Delete products', async list => { if (!await A.confirm('Delete ' + A.plural(list.length, 'product') + '?', 'They disappear from the shop for good. Past orders keep their details. To take a product off the shop for a while, hide it instead.', 'Delete ' + A.plural(list.length, 'product'), true)) return false; await A.each(list, p => A.api('DELETE', '/products/' + p._id), 'Deleted'); PR = await A.load('products', true); T.draw(); }, true],
      ],
      empty: '<div class="empty"><b>No products yet</b>Add your first product with photos, sizes and prices.<br><a class="btn pri" href="#/products/new">Add product</a></div>',
    });
    $('#pCat').onchange = () => { T.state.page = 1; T.state.sel.clear(); T.draw(); };
    async function bulkPut(list, body, verb) { await A.each(list, async p => { await A.api('PUT', '/products/' + p._id, body); Object.assign(p, body); }, verb); A.forget('products'); T.draw(); }
    $('#pCsv').onclick = () => A.csv('products', ['Shop no.', 'Name', 'Category', 'On shop', 'Featured', 'Size', 'Code', 'Price', 'MRP', 'Stock', 'Size on'], PR.flatMap(p => (p.sizes && p.sizes.length ? p.sizes : [{}]).map(z => [p.legacyId || '', p.name, catName(p.category), isLive(p) ? 'yes' : 'no', p.isFeatured ? 'yes' : 'no', z.label || '', z.sku || '', z.price != null ? z.price : p.price, z.mrp || '', z.stock == null ? '' : z.stock, z.active === false ? 'no' : 'yes'])));
  }, 'Products');

  /* the product editor: one page, saved with the bar at the top */
  async function productPage(v, id) {
    const isNew = id === 'new';
    const all = await A.load('products');
    let orig = isNew ? (A._draft || { name: '', category: 'rice', isActive: true, sizes: [{ label: '', price: '', mrp: '', stock: '', active: true }], images: [], countryOfOrigin: 'India', lowStockAt: 5, section: 'category', badge: 'new' }) : all.find(p => p._id === id);
    A._draft = null;
    if (!orig && !isNew) { const r = await A.api('GET', '/products/' + id).catch(() => null); orig = r && r.product; }
    if (!orig) throw new Error('This product was not found. It may have been deleted.');
    let P = clone(orig);
    P.howToUse = Array.isArray(P.howToUse) ? P.howToUse.join('\n') : (P.howToUse || '');
    let IM = (P.images || []).map(i => ({ url: String((i && (i.url || i)) || ''), alt: (i && i.alt) || '' })).filter(i => i.url);
    v.innerHTML = A.head(isNew ? 'Add product' : esc(P.name), isNew ? 'Fill in the name, photos and at least one size with a price.' : (isLive(P) ? '<span class="badge b-green">On the shop</span>' : '<span class="badge b-grey">Hidden</span>') + ' &nbsp;Last changed ' + A.ago(P.updatedAt),
      isNew ? '' : '<a class="btn" href="' + esc(productLink(P)) + '" target="_blank" rel="noopener">' + icon('ext') + 'View on shop</a><button class="btn" type="button" id="pDup">' + icon('copy') + 'Duplicate</button>', ['#/products', 'Products']) +
      '<form class="split" id="pf" onsubmit="return false" novalidate><div>' +
      '<div class="card"><div class="card-b form">' + field('name', 'Name', { full: true, max: 200, ph: 'Karunguruvai Rice' }) + field('tagline', 'One-line description', { full: true, max: 200, ph: 'Shown under the name on the product page', hint: 'Keep it to one short sentence.' }) +
      '<div class="field full"><label for="f-description">Description <span class="count-hint" id="dCount"></span></label><textarea class="in" data-f="description" id="f-description" rows="7" maxlength="2000" placeholder="Where it is grown, how it tastes, how families use it"></textarea></div></div></div>' +
      '<div class="card"><div class="card-h"><h2>Photos</h2><span class="sp"></span><button class="btn sm" type="button" id="imLib">' + icon('image') + 'From photo library</button><button class="btn sm" type="button" id="imUrl">Add by link</button></div><div class="card-b"><div class="photos" id="imGrid"></div><p class="hint" style="margin-top:10px">The first photo is used on product cards. Drag photos to change the order. Square photos with the pack in the centre look best; large photos are shrunk before upload.</p></div></div>' +
      '<div class="card"><div class="card-h"><h2>Sizes, prices and stock</h2><span class="sp"></span><span class="small muted" id="presetHint"></span></div><div class="card-b" style="overflow-x:auto"><table class="sizes"><thead><tr><th>Size</th><th>Price ₹</th><th>MRP ₹</th><th></th><th>In stock</th><th>Code</th><th>On sale</th><th></th></tr></thead><tbody id="zRows"></tbody></table>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;align-items:center"><button class="btn sm" type="button" id="zAdd">' + icon('plus') + 'Add size</button><span id="zPresets" style="display:flex;gap:6px;flex-wrap:wrap"></span></div>' +
      '<p class="hint" style="margin-top:10px">Leave “In stock” empty for sizes you do not count. With a number, the shop stops selling that size at 0 and orders take stock off by themselves. The code is made for you if left empty; orders use it to match the size.</p></div></div>' +
      '<div class="card"><div class="card-h"><h2>Use and storage</h2></div><div class="card-b form">' + field('howToUse', 'How to use or cook', { full: true, area: true, rows: 4, max: 2000, ph: 'Soak 6 hours. Cook 1 cup rice with 3 cups water…' }) + field('shelfLife', 'Shelf life', { max: 80, ph: '6 months from packing' }) + field('countryOfOrigin', 'Country of origin', { max: 60 }) + field('packedBy', 'Packed by', { full: true, max: 200, ph: 'Name and address shown on the pack' }) + '</div></div>' +
      '<div class="card"><div class="card-h"><h2>Search engine listing</h2></div><div class="card-b form"><div class="full"><div class="gprev" id="gprev"></div></div>' + field('metaTitle', 'Page title <span class="count-hint" id="mtC"></span>', { full: true, max: 70, ph: 'Uses the product name when empty' }) + field('metaDescription', 'Page description <span class="count-hint" id="mdC"></span>', { full: true, area: true, rows: 2, max: 170, ph: 'Uses the start of the description when empty' }) + '</div></div>' +
      '</div><aside>' +
      '<div class="card"><div class="card-h"><h2>Status</h2></div><div class="card-b stack">' + sw('isActive', 'Show on the shop', 'Hidden products cannot be found or ordered') + sw('isFeatured', 'Feature this product') +
      field('section', 'Home page row', { options: [['category', 'Only in its category row'], ['new', 'Also in “Fresh from nature” (new)'], ['bestseller', 'Also in “Nature’s favourites”']] }) +
      field('badge', 'Card label', { options: [['new', 'New'], ['sale', 'Sale (shows % off)'], ['hot', 'Popular'], ['bestseller', 'Bestseller']] }) + '</div></div>' +
      '<div class="card"><div class="card-h"><h2>Category</h2></div><div class="card-b">' + field('category', 'Category', { options: CATS }) + '</div></div>' +
      '<div class="card"><div class="card-h"><h2>Tax</h2></div><div class="card-b form">' + field('hsn', 'HSN code', { max: 8, ph: '1006' }) + field('gstRate', 'GST %', { type: 'number', min: 0, step: '0.5', ph: '5' }) + '</div></div>' +
      '<div class="card"><div class="card-h"><h2>Stock warning and links</h2></div><div class="card-b form">' + field('lowStockAt', 'Warn at or below', { type: 'number', min: 0, hint: 'Per size' }) + field('legacyId', 'Shop number', { type: 'number', min: 1, hint: 'Keeps product.html?id=N links working' }) + '</div></div>' +
      (isNew ? '' : '<div class="card"><div class="card-b"><button class="btn red" type="button" id="pDel" style="width:100%">' + icon('trash') + 'Delete product</button><p class="hint">Hiding keeps it for later. Deleting removes it for good; past orders keep their details.</p></div></div>') +
      '</aside></form>';
    const f = $('#pf');
    fill(f, P); $('[data-f=isActive]').checked = P.isActive !== false; if (!P.section) $('#f-section').value = 'category'; if (!P.badge) $('#f-badge').value = 'new';
    const zBody = $('#zRows');
    const zRow = z => { z = z || {}; const off = z.mrp && z.price && Number(z.mrp) > Number(z.price) ? Math.round((1 - z.price / z.mrp) * 100) + '% off' : ''; return '<tr><td><input class="in" data-z="label" placeholder="500 g" maxlength="30" value="' + esc(z.label || '') + '" aria-label="Size"/></td><td><input class="in" data-z="price" type="number" min="1" style="width:92px" value="' + esc(z.price ?? '') + '" aria-label="Price"/></td><td><input class="in" data-z="mrp" type="number" min="0" style="width:92px" value="' + esc(z.mrp ?? '') + '" aria-label="MRP"/></td><td class="off">' + off + '</td><td><input class="in" data-z="stock" type="number" min="0" style="width:86px" placeholder="—" value="' + esc(z.stock ?? '') + '" aria-label="In stock"/></td><td><input class="in" data-z="sku" placeholder="auto" maxlength="40" style="width:120px" value="' + esc(z.sku || '') + '" aria-label="Code"/></td><td><label class="switch"><input type="checkbox" data-z="active" ' + (z.active === false ? '' : 'checked') + ' aria-label="On sale"/><i></i></label></td><td style="white-space:nowrap"><button class="btn xs icon ghost" type="button" data-zm="-1" aria-label="Move up">' + icon('up', 14) + '</button><button class="btn xs icon ghost" type="button" data-zm="1" aria-label="Move down">' + icon('down', 14) + '</button><button class="btn xs icon ghost" type="button" data-zd aria-label="Remove size">' + icon('x', 14) + '</button></td></tr>'; };
    zBody.innerHTML = (P.sizes && P.sizes.length ? P.sizes : [{}]).map(zRow).join('');
    const PRESETS = { rice: ['500 g', '1 kg', '2 kg', '5 kg'], flour: ['500 g', '1 kg', '2 kg'], flowers: ['50 g', '100 g', '250 g'], beverages: ['200 ml', '500 ml', '1 L'], other: ['100 g', '250 g', '500 g', '1 kg'] };
    const drawPresets = () => { const have = $$('[data-z=label]', zBody).map(i => i.value.trim().toLowerCase()); const list = (PRESETS[$('#f-category').value] || []).filter(l => !have.includes(l.toLowerCase())); $('#zPresets').innerHTML = list.length ? '<span class="small muted">Quick add:</span>' + list.map(l => '<button class="btn xs" type="button" data-preset="' + esc(l) + '">' + esc(l) + '</button>').join('') : ''; };
    drawPresets();
    zBody.addEventListener('input', e => { const tr = e.target.closest('tr'); if (!tr) return; const p = Number($('[data-z=price]', tr).value), m = Number($('[data-z=mrp]', tr).value); $('.off', tr).textContent = m > p && p > 0 ? Math.round((1 - p / m) * 100) + '% off' : ''; if (e.target.dataset.z === 'label') drawPresets(); });
    zBody.addEventListener('click', e => { const tr = e.target.closest('tr'); if (!tr) return; if (e.target.closest('[data-zd]')) { if ($$('tr', zBody).length === 1) { A.toast('A product needs at least one size', true); return; } tr.remove(); drawPresets(); A.setDirty(H); } const m = e.target.closest('[data-zm]'); if (m) { const o = m.dataset.zm === '-1' ? tr.previousElementSibling : tr.nextElementSibling; if (o) { m.dataset.zm === '-1' ? zBody.insertBefore(tr, o) : zBody.insertBefore(o, tr); A.setDirty(H); } } });
    $('#zAdd').onclick = () => { zBody.insertAdjacentHTML('beforeend', zRow({})); $$('[data-z=label]', zBody).pop().focus(); A.setDirty(H); };
    $('#zPresets').onclick = e => { const b = e.target.closest('[data-preset]'); if (!b) return; const empty = $$('tr', zBody).find(tr => !$('[data-z=label]', tr).value.trim() && !$('[data-z=price]', tr).value.trim()); if (empty) $('[data-z=label]', empty).value = b.dataset.preset; else zBody.insertAdjacentHTML('beforeend', zRow({ label: b.dataset.preset })); drawPresets(); A.setDirty(H); };
    $('#f-category').addEventListener('change', drawPresets);

    // photos: upload, drag to reorder, make main, describe, remove
    const grid = $('#imGrid');
    function drawIm() {
      grid.innerHTML = IM.map((im, i) => '<div class="pt' + (i === 0 ? ' ph-main' : '') + (im.busy ? ' busy' : '') + '" draggable="' + (!im.busy) + '" data-i="' + i + '"><img src="' + esc(im.preview || A.media(im.url) || A.NOIMG) + '" alt="' + esc(im.alt || '') + '"/>' + (i === 0 && !im.busy ? '<span class="cv">Main photo</span>' : '') +
        (im.busy ? '' : '<div class="ops">' + (i ? '<button type="button" data-a="main" title="Make main photo" aria-label="Make main photo">' + icon('star', 14) + '</button>' : '') + '<button type="button" data-a="alt" title="Describe the photo" aria-label="Describe the photo">' + icon('edit', 14) + '</button><button type="button" data-a="del" title="Remove" aria-label="Remove photo">' + icon('trash', 14) + '</button></div>') + '</div>').join('') +
        '<label class="drop" id="imDrop">' + icon('upload', 22) + '<b>Add photos</b>or drop files here<input type="file" accept="image/*" multiple hidden id="imFile"/></label>';
      $('#imFile').onchange = e => { addFiles(e.target.files); e.target.value = ''; };
      A.dropTarget($('#imDrop'), addFiles);
    }
    let dragI = null;
    grid.addEventListener('dragstart', e => { const t = e.target.closest('.pt'); if (!t) return; dragI = Number(t.dataset.i); t.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(dragI)); });
    grid.addEventListener('dragend', e => { const t = e.target.closest('.pt'); if (t) t.classList.remove('dragging'); $$('.pt.over', grid).forEach(x => x.classList.remove('over')); dragI = null; });
    grid.addEventListener('dragover', e => { const t = e.target.closest('.pt'); if (dragI == null || !t) return; e.preventDefault(); $$('.pt.over', grid).forEach(x => x !== t && x.classList.remove('over')); t.classList.add('over'); });
    grid.addEventListener('drop', e => { const t = e.target.closest('.pt'); if (dragI == null || !t) return; e.preventDefault(); const to = Number(t.dataset.i); const [x] = IM.splice(dragI, 1); IM.splice(to, 0, x); dragI = null; drawIm(); A.setDirty(H); });
    grid.addEventListener('click', async e => {
      const b = e.target.closest('[data-a]'); if (!b) return; e.preventDefault();
      const i = Number(b.closest('.pt').dataset.i);
      if (b.dataset.a === 'main') { const [x] = IM.splice(i, 1); IM.unshift(x); }
      if (b.dataset.a === 'del') IM.splice(i, 1);
      if (b.dataset.a === 'alt') { const t = await A.ask('Describe the photo', 'What the photo shows (read out by screen readers and used by search engines)', IM[i].alt || $('#f-name').value, 'Save'); if (t === null) return; IM[i].alt = t.trim(); }
      drawIm(); A.setDirty(H);
    });
    async function addFiles(files) {
      const list = [...files].filter(x => /^image\//.test(x.type)); if (!list.length) { A.toast('Choose photo files (JPEG, PNG or WebP)', true); return; }
      const slots = list.map(x => { const o = { busy: true, preview: URL.createObjectURL(x), alt: $('#f-name').value.trim() }; IM.push(o); return o; });
      drawIm(); A.setDirty(H);
      let ok = 0;
      for (let k = 0; k < list.length; k++) { const o = slots[k]; try { const m = await A.upload(list[k]); o.url = m.url; ok++; } catch (er) { A.toast(er.message, true); IM.splice(IM.indexOf(o), 1); } o.busy = false; URL.revokeObjectURL(o.preview); delete o.preview; drawIm(); }
      if (ok) A.toast(A.plural(ok, 'photo') + ' added. Save to keep them.');
    }
    $('#imLib').onclick = async () => { const us = await A.pickPhotos(true); if (!us.length) return; us.forEach(u => IM.push({ url: u, alt: $('#f-name').value.trim() })); drawIm(); A.setDirty(H); };
    $('#imUrl').onclick = async () => { const u = await A.ask('Add a photo by link', 'Photo link (https://…)', '', 'Add photo'); if (!u) return; if (!A.okLink(u.trim())) { A.toast('Use a link that starts with https://', true); return; } IM.push({ url: u.trim(), alt: $('#f-name').value.trim() }); drawIm(); A.setDirty(H); };
    drawIm();

    // counters and the Google preview
    const gp = () => { const t = $('#f-metaTitle').value || $('#f-name').value || 'Product name', d = $('#f-metaDescription').value || $('#f-description').value.slice(0, 160) || 'Description'; $('#gprev').innerHTML = '<div class="u">www.nanseiorg.in › product</div><div class="t">' + esc(t.slice(0, 70)) + ' | Nansei Organics</div><div class="d">' + esc(d.slice(0, 165)) + '</div>'; $('#mtC').textContent = $('#f-metaTitle').value.length + '/70'; $('#mdC').textContent = $('#f-metaDescription').value.length + '/170'; $('#dCount').textContent = $('#f-description').value.length + '/2000'; };
    f.addEventListener('input', gp); gp();

    const H = { save, discard: () => { A.setDirty(null); A.refresh(); } };
    watch(f, H);
    async function save() {
      const x = collect(f);
      if (!x.name) { A.toast('Give the product a name', true); $('#f-name').focus(); return; }
      if (!x.description) { A.toast('Add a description', true); $('#f-description').focus(); return; }
      if (IM.some(i => i.busy)) { A.toast('Wait for the photos to finish uploading', true); return; }
      const sizes = $$('tr', zBody).map(tr => { const o = {}; $$('[data-z]', tr).forEach(i => { o[i.dataset.z] = i.type === 'checkbox' ? i.checked : i.value.trim(); }); return o; }).filter(z => z.label || z.price);
      if (!sizes.length) { A.toast('Add at least one size with a price', true); return; }
      const bad = sizes.find(z => !z.label || !(Number(z.price) >= 1)); if (bad) { A.toast((bad.label || 'A size') + ': give it a name and a price', true); return; }
      const lower = sizes.find(z => z.mrp && Number(z.mrp) < Number(z.price)); if (lower) { A.toast(lower.label + ': the MRP cannot be lower than the price', true); return; }
      const unitOf = l => /ml|\bl\b|litre/i.test(l) ? 'ml' : /pc|piece/i.test(l) ? 'piece' : 'g';
      const body = {
        name: x.name, tagline: x.tagline, description: x.description, category: x.category, badge: x.badge, section: x.section,
        images: IM.filter(i => i.url).map(i => ({ url: i.url, alt: i.alt || '' })),
        sizes: sizes.map(z => { const old = (P.sizes || []).find(o => o.sku && o.sku === z.sku); return { label: z.label, price: z.price, mrp: z.mrp, stock: z.stock, sku: z.sku, active: z.active, unit: unitOf(z.label), amount: old && old.label === z.label ? old.amount : undefined }; }),
        howToUse: x.howToUse, shelfLife: x.shelfLife, countryOfOrigin: x.countryOfOrigin, packedBy: x.packedBy, metaTitle: x.metaTitle, metaDescription: x.metaDescription,
        hsn: x.hsn, gstRate: x.gstRate === '' ? undefined : Number(x.gstRate), lowStockAt: Number(x.lowStockAt || 0), legacyId: x.legacyId,
        isActive: x.isActive, isFeatured: x.isFeatured,
      };
      try {
        const r = await A.api(isNew ? 'POST' : 'PUT', '/products' + (isNew ? '' : '/' + id), body);
        A.forget('products'); A.setDirty(null);
        A.toast(isNew ? 'Product added' : 'Saved');
        const nid = (r.product && r.product._id) || id;
        if (isNew) A.go('#/products/' + nid); else A.refresh();
      } catch (er) { A.toast(er.message, true); }
    }
    if ($('#pDel')) $('#pDel').onclick = async () => { if (!await A.confirm('Delete ' + esc(P.name) + '?', 'It disappears from the shop for good. Past orders keep their details.', 'Delete product', true)) return; try { await A.api('DELETE', '/products/' + id); A.forget('products'); A.setDirty(null); A.toast('Product deleted'); A.go('#/products'); } catch (er) { A.toast(er.message, true); } };
    if ($('#pDup')) $('#pDup').onclick = () => {
      const c = clone(orig); ['_id', 'legacyId', 'slug', 'sku', 'rating', 'numReviews', 'reviews', 'createdAt', 'updatedAt', '__v'].forEach(k => delete c[k]);
      c.name = orig.name + ' (copy)'; c.isActive = false; c.sizes = (c.sizes || []).map(z => ({ label: z.label, price: z.price, mrp: z.mrp, stock: z.stock, active: z.active }));
      A._draft = c; A.go('#/products/new'); A.toast('This copy stays hidden until you switch on “Show on the shop”.');
    };
  }

  /* ═════════════════════ STOCK ═════════════════════ */
  A.route('inventory', async v => {
    const q = A.query();
    v.innerHTML = A.head('Stock', 'Every size of every product. Type a number and press Enter, or use − and +.', '<button class="btn" type="button" id="iCsv">' + icon('dl') + 'Export</button>') + '<div id="iTable"></div><p class="hint" style="margin-top:12px">Orders take stock off by themselves and cancelled orders put it back. Sizes left empty are not counted and never show as sold out.</p>';
    const PR = await A.load('products', true);
    const R = []; PR.forEach(p => (p.sizes || []).forEach(z => R.push({ p, z, k: p._id + '|' + (z.sku || z.label) })));
    const state = r => r.z.stock == null ? 'none' : r.z.stock <= 0 ? 'out' : r.z.stock <= lowAt(r.p) ? 'low' : 'ok';
    const T = A.table({
      el: $('#iTable'), rows: () => R, key: r => r.k, placeholder: 'Search product or size code', perPage: 60, tab: q.get('tab') || 'all',
      tabs: [['all', 'All sizes'], ['low', 'Running low', r => state(r) === 'low'], ['out', 'Sold out', r => state(r) === 'out'], ['none', 'Not counted', r => state(r) === 'none'], ['hidden', 'Hidden products', r => !isLive(r.p)]],
      search: (r, s) => String(r.p.name).toLowerCase().includes(s) || String(r.z.sku || '').toLowerCase().includes(s) || String(r.z.label).toLowerCase().includes(s),
      onState: s => A.setQuery({ tab: s.tab }),
      cols: [
        { k: 'p', label: 'Product', sort: r => String(r.p.name).toLowerCase(), html: r => '<div class="cell"><img class="thumb" src="' + esc(A.firstImg(r.p)) + '" alt="" loading="lazy"/><div><a href="#/products/' + esc(r.p._id) + '"><b>' + esc(r.p.name) + '</b></a><small>' + (isLive(r.p) ? '' : 'Hidden · ') + (r.z.active === false ? 'Size switched off' : catName(r.p.category)) + '</small></div></div>' },
        { k: 'z', label: 'Size', sort: r => r.z.label, html: r => '<b>' + esc(r.z.label) + '</b><div class="muted small">' + esc(r.z.sku || '') + '</div>' },
        { k: 'pr', label: 'Price', num: true, cls: 'hide-sm', sort: r => r.z.price, html: r => rupee(r.z.price) },
        { k: 's', label: 'In stock', sort: r => r.z.stock == null ? 1e9 : r.z.stock, html: r => '<div style="display:flex;gap:4px;align-items:center"><button class="btn sm icon" type="button" data-d="-1" aria-label="One less"' + (r.z.stock == null || !r.z.sku ? ' disabled' : '') + '>−</button><input class="in sm" style="width:76px;text-align:right" type="number" min="0" placeholder="—" data-s value="' + esc(r.z.stock ?? '') + '" aria-label="Stock for ' + esc(r.p.name + ' ' + r.z.label) + '"' + (r.z.sku ? '' : ' disabled title="Save the product once to give this size a code"') + '/><button class="btn sm icon" type="button" data-d="1" aria-label="One more"' + (r.z.sku ? '' : ' disabled') + '>+</button></div>' },
        { k: 'st', label: '', html: r => ({ out: '<span class="badge b-red">Sold out</span>', low: '<span class="badge b-amber">Running low</span>', none: '<span class="muted small">Not counted</span>', ok: '' })[state(r)] },
      ],
      bulk: [
        ['Set stock', async list => { const n = await A.ask('Set stock for ' + A.plural(list.length, 'size'), 'How many are on the shelf for each selected size?', '', 'Set stock'); if (n === null) return false; if (!/^\d+$/.test(n.trim())) { A.toast('Enter a whole number, 0 or more', true); return false; } await A.each(list.filter(r => r.z.sku), r => setStock(r, { stock: Number(n) }), 'Stock set'); T.draw(); }],
        ['Stop counting', async list => { await A.each(list.filter(r => r.z.sku), r => setStock(r, { stock: null }), 'No longer counted'); T.draw(); }],
      ],
      empty: '<div class="empty"><b>No sizes yet</b>Add sizes to your products first.</div>',
    });
    async function setStock(r, body) { const d = (await A.api('PATCH', '/products/' + r.p._id + '/stock', Object.assign({ sku: r.z.sku }, body))).data; r.z.stock = d.stock; r.p.stock = d.productStock; A.forget('products'); return d; }
    const tbl = $('#iTable');
    tbl.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('[data-s]')) e.target.blur(); });
    tbl.addEventListener('change', async e => {
      if (!e.target.matches('[data-s]')) return;
      const r = R.find(x => x.k === e.target.closest('tr').dataset.key), raw = e.target.value.trim();
      if (raw !== '' && !/^\d+$/.test(raw)) { A.toast('Enter a whole number, 0 or more', true); return; }
      try { const d = await setStock(r, { stock: raw === '' ? null : Number(raw) }); A.toast(r.p.name + ' ' + d.label + ': ' + (d.stock == null ? 'no longer counted' : d.stock + ' in stock')); T.draw(); } catch (er) { A.toast(er.message, true); }
    });
    tbl.addEventListener('click', async e => {
      const b = e.target.closest('[data-d]'); if (!b) return;
      const r = R.find(x => x.k === b.closest('tr').dataset.key);
      try { await setStock(r, { delta: Number(b.dataset.d) }); T.draw(); } catch (er) { A.toast(er.message, true); }
    });
    $('#iCsv').onclick = () => A.csv('stock', ['Product', 'Size', 'Code', 'Price', 'In stock', 'On shop'], T.filtered().map(r => [r.p.name, r.z.label, r.z.sku, r.z.price, r.z.stock == null ? '' : r.z.stock, isLive(r.p) && r.z.active !== false ? 'yes' : 'no']));
  }, 'Stock');


  /* ═════════════════════ CUSTOMERS ═════════════════════ */
  A.route('customers', async (v, parts) => {
    if (parts[0]) return customerPage(v, parts[0]);
    v.innerHTML = A.head('Customers', 'Everyone with an account. Spend counts all their orders.', '<button class="btn" type="button" id="cCsv">' + icon('dl') + 'Export</button>') + '<div id="cTable"></div>';
    const C = await A.load('customers', true);
    const nm = c => c.name || ((c.firstName || '') + ' ' + (c.lastName || '')).trim() || c.email;
    const T = A.table({
      el: $('#cTable'), rows: () => C, key: c => c._id, placeholder: 'Name, email or phone',
      tabs: [['all', 'All'], ['buyers', 'Have ordered', c => (c.orderCount || 0) > 0], ['repeat', 'Ordered twice or more', c => (c.orderCount || 0) > 1], ['none', 'No orders yet', c => !(c.orderCount > 0)]],
      search: (c, s) => [nm(c), c.email, c.phone].some(x => String(x || '').toLowerCase().includes(s)),
      onOpen: c => A.go('#/customers/' + c._id),
      sort: 'joined', dir: 'desc',
      cols: [
        { k: 'n', label: 'Customer', sort: c => nm(c).toLowerCase(), html: c => '<div class="cell"><span class="av">' + esc(nm(c).split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()) + '</span><div><b>' + esc(nm(c)) + (c.role === 'admin' ? ' <span class="badge b-forest plain">Admin</span>' : '') + '</b><small>' + esc(c.email) + '</small></div></div>' },
        { k: 'ph', label: 'Phone', cls: 'hide-sm', html: c => '<span class="small">' + esc(c.phone || '—') + '</span>' },
        { k: 'joined', label: 'Joined', sort: c => +new Date(c.createdAt), html: c => '<span class="small">' + A.date(c.createdAt) + '</span>' },
        { k: 'o', label: 'Orders', num: true, sort: c => c.orderCount || 0, html: c => String(c.orderCount || 0) },
        { k: 's', label: 'Spent', num: true, sort: c => c.totalSpent || 0, html: c => '<b>' + rupee(c.totalSpent) + '</b>' },
      ],
      empty: '<div class="empty"><b>No customers yet</b>People who create an account appear here.</div>',
    });
    $('#cCsv').onclick = () => A.csv('customers', ['Name', 'Email', 'Phone', 'Joined', 'Orders', 'Spent'], T.filtered().map(c => [nm(c), c.email, c.phone, A.date(c.createdAt), c.orderCount || 0, c.totalSpent || 0]));
  }, 'Customers');

  async function customerPage(v, id) {
    v.classList.add('narrow');
    const [C, O] = await Promise.all([A.load('customers'), A.api('GET', '/orders?limit=500').then(r => r.data || [])]);
    const c = C.find(x => x._id === id); if (!c) throw new Error('Customer not found');
    const nm = c.name || ((c.firstName || '') + ' ' + (c.lastName || '')).trim() || c.email;
    const mine = O.filter(o => o.user && String(o.user._id || o.user) === String(id));
    const live = mine.filter(o => !['Cancelled', 'Refunded'].includes(o.orderStatus));
    const spent = live.reduce((n, o) => n + (o.totalPrice || 0), 0);
    const phone = String(c.phone || '').replace(/\D/g, '');
    const last = mine[0] && mine[0].shippingAddress;
    v.innerHTML = A.head(esc(nm) + (c.role === 'admin' ? ' <span class="badge b-forest plain">Admin</span>' : ''), 'Customer since ' + A.date(c.createdAt), (phone ? '<a class="btn" target="_blank" rel="noopener" href="https://wa.me/' + (phone.length === 10 ? '91' + phone : phone) + '">' + icon('msg') + 'WhatsApp</a>' : '') + '<a class="btn" href="mailto:' + esc(c.email) + '">Email</a>', ['#/customers', 'Customers']) +
      '<div class="grid g3" style="margin-bottom:16px"><div class="card kpi"><small>Orders</small><b>' + mine.length + '</b><span>' + (mine.length - live.length) + ' cancelled</span></div><div class="card kpi"><small>Spent</small><b>' + rupee(spent) + '</b><span>Orders not cancelled</span></div><div class="card kpi"><small>Average order</small><b>' + rupee(live.length ? Math.round(spent / live.length) : 0) + '</b><span>' + (mine[0] ? 'Last order ' + A.ago(mine[0].createdAt) : 'No orders yet') + '</span></div></div>' +
      '<div class="split"><div class="card"><div class="card-h"><h2>Orders</h2></div><div class="tbl"><table><tbody>' + (mine.map(o => '<tr class="rowlink" onclick="A.go(\'#/orders/' + esc(o._id) + '\')"><td><b>' + esc(o.orderNumber) + '</b><div class="muted small">' + A.dateTime(o.createdAt) + '</div></td><td class="small hide-sm">' + A.plural(itemCount(o), 'item') + '</td><td>' + statusBadge(o.orderStatus) + '</td><td class="num"><b>' + rupee(o.totalPrice) + '</b></td></tr>').join('') || '<tr><td><div class="empty">No orders in the latest 500.</div></td></tr>') + '</tbody></table></div></div>' +
      '<aside><div class="card"><div class="card-h"><h2>Contact</h2></div><div class="card-b"><dl class="kv"><dt>Email</dt><dd>' + esc(c.email) + '</dd><dt>Phone</dt><dd>' + esc(c.phone || '—') + '</dd></dl>' + (last ? '<p class="lbl" style="margin-top:14px">Last delivery address</p><div class="addr small">' + [last.addressLine1, last.addressLine2, [last.city, last.state].filter(Boolean).join(', ') + ' ' + (last.pincode || '')].filter(Boolean).map(esc).join('<br>') + '</div>' : '') + '</div></div>' +
      '<div class="card"><div class="card-b" style="display:flex;flex-direction:column;gap:8px">' + (c.role !== 'admin' ? '<button class="btn" type="button" id="cAdmin">Give admin access</button>' : '') + '<button class="btn red" type="button" id="cDel">Delete account</button><p class="hint">Deleting removes their login. Their orders stay on record.</p></div></div></aside></div>';
    if ($('#cAdmin')) $('#cAdmin').onclick = async () => { if (!await A.confirm('Give ' + esc(nm) + ' admin access?', 'They will see every order and customer and can change the whole shop. Only do this for people who run the store with you.', 'Give admin access', true)) return; try { await A.api('PUT', '/users/' + id + '/role', { role: 'admin' }); A.forget('customers'); A.toast('Admin access given'); A.refresh(); } catch (er) { A.toast(er.message, true); } };
    $('#cDel').onclick = async () => { if (!await A.confirm('Delete ' + esc(nm) + '’s account?', 'This cannot be undone. Their orders stay on record.', 'Delete account', true)) return; try { await A.api('DELETE', '/users/' + id); A.forget('customers'); A.toast('Account deleted'); A.go('#/customers'); } catch (er) { A.toast(er.message, true); } };
  }

  /* ═════════════════════ COUPONS ═════════════════════ */
  A.route('coupons', async v => {
    v.innerHTML = A.head('Coupons', 'Codes customers type at checkout. The server checks dates, minimum order and how many times a code can be used.', '<button class="btn pri" type="button" id="kNew">' + icon('plus') + 'Create coupon</button>') + '<div id="kTable"></div>';
    let K = await A.load('coupons', true);
    const now = Date.now();
    const stOf = c => !c.isActive ? 'off' : c.validUntil && new Date(c.validUntil) < now ? 'expired' : c.validFrom && new Date(c.validFrom) > now ? 'scheduled' : c.usageLimit && c.usedCount >= c.usageLimit ? 'used' : 'active';
    const SB = { active: ['Active', 'b-green'], scheduled: ['Starts later', 'b-blue'], expired: ['Expired', 'b-red'], used: ['Used up', 'b-red'], off: ['Off', 'b-grey'] };
    const T = A.table({
      el: $('#kTable'), rows: () => K, key: c => c._id, placeholder: 'Search codes',
      tabs: [['all', 'All'], ['active', 'Active', c => stOf(c) === 'active'], ['scheduled', 'Starts later', c => stOf(c) === 'scheduled'], ['ended', 'Ended or off', c => ['expired', 'used', 'off'].includes(stOf(c))]],
      search: (c, s) => String(c.code).toLowerCase().includes(s) || String(c.description || '').toLowerCase().includes(s),
      onOpen: c => editCoupon(c),
      cols: [
        { k: 'c', label: 'Code', sort: c => c.code, html: c => '<b style="letter-spacing:.06em">' + esc(c.code) + '</b><div class="muted small">' + esc(c.description || '') + '</div>' },
        { k: 'd', label: 'Discount', html: c => c.discountType === 'percentage' ? esc(c.discountValue) + '% off' + (c.maxDiscount ? '<div class="muted small">up to ' + rupee(c.maxDiscount) + '</div>' : '') : rupee(c.discountValue) + ' off' },
        { k: 'm', label: 'Minimum order', cls: 'hide-sm', html: c => c.minOrderAmount ? rupee(c.minOrderAmount) : '<span class="muted">None</span>' },
        { k: 'v', label: 'Valid', cls: 'hide-sm', sort: c => +new Date(c.validUntil || 0), html: c => '<span class="small">' + A.date(c.validFrom) + ' – ' + A.date(c.validUntil) + '</span>' },
        { k: 'u', label: 'Used', num: true, sort: c => c.usedCount || 0, html: c => (c.usedCount || 0) + (c.usageLimit ? ' / ' + c.usageLimit : '') },
        { k: 's', label: 'Status', html: c => '<span class="badge ' + SB[stOf(c)][1] + '">' + SB[stOf(c)][0] + '</span>' },
      ],
      bulk: [
        ['Turn on', async list => { await A.each(list, c => A.api('PUT', '/coupons/' + c._id, { isActive: true }).then(() => { c.isActive = true; }), 'Turned on'); }],
        ['Turn off', async list => { await A.each(list, c => A.api('PUT', '/coupons/' + c._id, { isActive: false }).then(() => { c.isActive = false; }), 'Turned off'); }],
        ['Delete coupons', async list => { if (!await A.confirm('Delete ' + A.plural(list.length, 'coupon') + '?', 'Customers will no longer be able to use these codes.', 'Delete', true)) return false; await A.each(list, c => A.api('DELETE', '/coupons/' + c._id), 'Deleted'); K = await A.load('coupons', true); }, true],
      ],
      empty: '<div class="empty"><b>No coupons yet</b>Codes shown in the offer bar only work once you create them here.</div>',
    });
    $('#kNew').onclick = () => editCoupon(null);
    if (A.query().get('new')) { A.setQuery({ new: null }); editCoupon(null); }
    function editCoupon(c) {
      const isNew = !c; c = c || { discountType: 'percentage', isActive: true, validFrom: new Date(), minOrderAmount: 0 };
      const di = d => d ? new Date(d).toISOString().slice(0, 10) : '';
      A.drawer(isNew ? 'Create coupon' : 'Edit ' + c.code, '<div class="form" id="kf">' +
        '<div class="field full"><label for="kc">Code</label><div style="display:flex;gap:8px"><input class="in" id="kc" data-f="code" maxlength="30" style="flex:1;text-transform:uppercase;letter-spacing:.06em" placeholder="NANSEI10"/><button class="btn" type="button" id="kGen">Make one</button></div></div>' +
        field('description', 'Description', { full: true, max: 200, ph: 'First order offer' }) +
        field('discountType', 'Type', { options: [['percentage', 'Percentage off'], ['fixed', 'Amount off (₹)']] }) + field('discountValue', 'Discount', { type: 'number', min: 1 }) +
        field('minOrderAmount', 'Minimum order', { type: 'number', min: 0, prefix: '₹' }) + field('maxDiscount', 'Largest discount', { type: 'number', min: 0, prefix: '₹', ph: 'No cap', hint: 'For percentage codes' }) +
        field('validFrom', 'Starts', { type: 'date' }) + field('validUntil', 'Ends', { type: 'date', hint: 'Empty = one year from today' }) +
        field('usageLimit', 'Total uses allowed', { type: 'number', min: 0, ph: 'Unlimited' }) + '<div class="field" style="align-self:end">' + sw('isActive', 'Active') + '</div></div>',
        (isNew ? '' : '<button class="btn red" type="button" id="kDel" style="margin-right:auto">Delete</button>') + '<button class="btn" type="button" data-close>Cancel</button><button class="btn pri" type="button" id="kSave">' + (isNew ? 'Create coupon' : 'Save') + '</button>');
      fill($('#kf'), Object.assign({}, c, { validFrom: di(c.validFrom), validUntil: di(c.validUntil) }));
      $('#kGen').onclick = () => { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = 'NANSEI'; for (let i = 0; i < 4; i++) s += a[Math.floor(Math.random() * a.length)]; $('#kc').value = s; };
      $('#kSave').onclick = async e => {
        const b = collect($('#kf')); b.code = String(b.code || '').toUpperCase().replace(/\s+/g, '');
        if (!b.code || !b.discountValue) { A.toast('A code and a discount are needed', true); return; }
        if (b.discountType === 'percentage' && Number(b.discountValue) > 90) { A.toast('Percentage discounts above 90% are not allowed here', true); return; }
        e.target.classList.add('busy');
        try { await A.api(isNew ? 'POST' : 'PUT', '/coupons' + (isNew ? '' : '/' + c._id), b); A.closeDrawer(); A.toast(isNew ? 'Coupon created' : 'Coupon saved'); K = await A.load('coupons', true); T.draw(); } catch (er) { A.toast(er.message, true); e.target.classList.remove('busy'); }
      };
      if ($('#kDel')) $('#kDel').onclick = async () => { if (!await A.confirm('Delete ' + esc(c.code) + '?', 'Customers will no longer be able to use it.', 'Delete coupon', true)) return; try { await A.api('DELETE', '/coupons/' + c._id); A.closeDrawer(); A.toast('Coupon deleted'); K = await A.load('coupons', true); T.draw(); } catch (er) { A.toast(er.message, true); } };
    }
  }, 'Coupons');

  /* ═════════════════════ REVIEWS ═════════════════════ */
  A.route('reviews', async v => {
    const q = A.query();
    v.innerHTML = A.head('Reviews', 'You can reply to, hide or remove a review. You cannot change what a customer wrote.') + '<div id="rTable"></div>';
    let R = await A.load('reviews', true);
    const hidden = r => r.isApproved === false;
    const stars = n => '<span style="color:var(--gold-dk);letter-spacing:1px">' + '★'.repeat(Math.round(n || 0)) + '<span style="color:#ddd5c4">' + '★'.repeat(5 - Math.round(n || 0)) + '</span></span>';
    const T = A.table({
      el: $('#rTable'), rows: () => R, key: r => r._id, placeholder: 'Search reviews', tab: q.get('tab') || 'all',
      tabs: [['all', 'All'], ['noreply', 'Needs a reply', r => !(r.reply && r.reply.text) && !hidden(r)], ['low', '3 stars or less', r => (r.rating || 0) <= 3], ['hidden', 'Hidden', hidden]],
      search: (r, s) => [r.comment, r.title, r.product && r.product.name, r.user && r.user.name].some(x => String(x || '').toLowerCase().includes(s)),
      cols: [
        { k: 'r', label: 'Review', html: r => { const t = r.comment || r.text || ''; return '<div style="max-width:560px">' + stars(r.rating) + ' <b>' + esc(r.title || '') + '</b><div class="small" style="margin-top:3px">' + esc(t.slice(0, 260)) + (t.length > 260 ? '…' : '') + '</div>' + (hidden(r) ? '<div class="small" style="margin-top:4px"><span class="badge b-grey">Hidden</span> <span class="muted">' + esc(r.hiddenReason || '') + '</span></div>' : '') + (r.reply && r.reply.text ? '<div class="small" style="margin-top:6px;padding:6px 10px;background:var(--warm);border-left:3px solid var(--gold);border-radius:0 6px 6px 0"><b>Your reply:</b> ' + esc(r.reply.text) + '</div>' : '') + '</div>'; } },
        { k: 'p', label: 'Product', cls: 'hide-sm', sort: r => (r.product && r.product.name) || '', html: r => '<span class="small"><b>' + esc((r.product && r.product.name) || '—') + '</b><br>' + esc((r.user && r.user.name) || r.name || '') + '</span>' },
        { k: 'd', label: 'Date', sort: r => +new Date(r.createdAt), html: r => '<span class="small">' + A.date(r.createdAt) + '</span>' },
        { k: 'a', label: '', html: r => '<div style="display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap"><button class="btn sm" type="button" data-rep="' + esc(r._id) + '">' + (r.reply && r.reply.text ? 'Edit reply' : 'Reply') + '</button><button class="btn sm" type="button" data-hide="' + esc(r._id) + '">' + (hidden(r) ? 'Show' : 'Hide') + '</button><button class="btn sm red icon" type="button" data-del="' + esc(r._id) + '" aria-label="Delete review">' + icon('trash', 14) + '</button></div>' },
      ],
      empty: '<div class="empty"><b>No reviews yet</b>Reviews from customers who bought appear here.</div>',
    });
    const reload = async () => { R = await A.load('reviews', true); T.draw(); setCounts(null, null, R.filter(r => !(r.reply && r.reply.text) && !hidden(r)).length); };
    $('#rTable').addEventListener('click', async e => {
      const b = e.target.closest('[data-rep],[data-hide],[data-del]'); if (!b) return;
      const r = R.find(x => x._id === (b.dataset.rep || b.dataset.hide || b.dataset.del));
      try {
        if (b.dataset.rep) { const t = await A.ask('Reply to this review', 'Your reply is shown under the review. Leave empty to remove it.', (r.reply && r.reply.text) || '', 'Save reply', true); if (t === null) return; await A.api('PUT', '/reviews/' + r._id + '/reply', { text: t }); A.toast('Reply saved'); }
        if (b.dataset.hide) { let reason = ''; if (!hidden(r)) { reason = await A.ask('Hide this review', 'Why? (kept for your records)', 'Not about the product', 'Hide review'); if (reason === null) return; } await A.api('PATCH', '/reviews/' + r._id + '/visibility', { hidden: !hidden(r), reason }); A.toast(hidden(r) ? 'Review shown again' : 'Review hidden'); }
        if (b.dataset.del) { if (!await A.confirm('Delete this review?', 'It is removed for good.', 'Delete review', true)) return; await A.api('DELETE', '/reviews/' + r._id); A.toast('Review deleted'); }
        reload();
      } catch (er) { A.toast(er.message, true); }
    });
  }, 'Reviews');

  /* ═════════════════════ HOME PAGE CONTENT ═════════════════════ */
  A.route('homepage', async v => {
    const [S, PR] = await Promise.all([loadSettings(true), A.load('products').catch(() => [])]);
    const e = S.effective, hp = e.homepage || {};
    v.classList.add('narrow');
    v.innerHTML = A.head('Home page', 'What visitors see first. Changes reach the shop within a minute of saving.', '<a class="btn" href="index.html" target="_blank" rel="noopener">' + icon('ext') + 'Preview home page</a>') +
      '<div id="hf">' +
      '<div class="card"><div class="card-h"><h2>Hero</h2><span class="sp"></span>' + sw('homepage.showHero', 'Show') + '</div><div class="card-b form">' +
      field('homepage.heroEyebrow', 'Small line above the title', { max: 80 }) + field('homepage.heroCtaText', 'Button text', { max: 50 }) +
      field('homepage.heroTitle', 'Title', { max: 120 }) + field('homepage.heroEmphasis', 'Highlighted word', { max: 60 }) +
      field('homepage.heroDescription', 'Description', { full: true, area: true, rows: 3, max: 300 }) +
      field('homepage.heroCtaHref', 'Button link', { full: true, max: 300, ph: '#products or collection.html?category=rice' }) +
      field('homepage.heroMediaType', 'Background', { options: [['video', 'Video'], ['image', 'Photo']] }) +
      '<div class="field"><label for="f-homepage.heroMediaUrl">Background link</label><div style="display:flex;gap:6px"><input class="in" data-f="homepage.heroMediaUrl" id="f-homepage.heroMediaUrl" maxlength="500" style="flex:1" placeholder="https://…"/><button class="btn" type="button" id="heroPick">Choose photo</button></div><p class="hint">A photo from your library, or a direct https:// link to an .mp4 video.</p></div>' +
      '</div></div>' +
      '<div class="card"><div class="card-h"><h2>Sections</h2></div><div class="card-b grid g2">' + sw('homepage.showCategories', 'Shop by category') + sw('homepage.showProducts', 'Product rows') + sw('homepage.showBlog', 'Journal (blog)') + sw('homepage.showFaq', 'Questions and answers') + sw('homepage.showReels', 'Farm reels that slide in') + '</div></div>' +
      '<div class="card"><div class="card-h"><h2>Announcement bar</h2><span class="sp"></span>' + sw('announcement.enabled', 'Show') + '</div><div class="card-b"><div id="annRows"></div><button class="btn sm" type="button" id="annAdd">' + icon('plus') + 'Add a line</button><p class="hint">Lines rotate every few seconds. While empty, the bar shows your free-delivery amount. Codes only work once you create them under Coupons.</p></div></div>' +
      '<div class="card"><div class="card-h"><h2>Moments from our farm</h2><span class="sp"></span><button class="btn sm" type="button" id="galLib">' + icon('image') + 'Add photos</button></div><div class="card-b"><div id="galRows"></div><p class="hint">Shown in this order. While the list is empty the home page keeps its built-in farm photos.</p></div></div>' +
      '<div class="card"><div class="card-h"><h2>Farm reels</h2><span class="sp"></span><button class="btn sm" type="button" id="reelAdd">' + icon('plus') + 'Add a reel</button></div><div class="card-b"><div id="reelRows"></div><p class="hint">Short upright videos. Paste a direct https:// link to an .mp4 file; under 15 MB plays smoothly on phones. While empty, the built-in reels are shown.</p></div></div>' +
      '</div>';
    const root = $('#hf');
    fill(root, e);
    const acts = '<div class="hacts"><button class="btn xs icon ghost" type="button" data-mv="-1" aria-label="Move up">' + icon('up', 14) + '</button><button class="btn xs icon ghost" type="button" data-mv="1" aria-label="Move down">' + icon('down', 14) + '</button><button class="btn xs icon ghost" type="button" data-rm aria-label="Remove">' + icon('x', 14) + '</button></div>';
    const annRow = i => { i = i || {}; return '<div class="hrow" style="grid-template-columns:minmax(0,1fr) auto"><div class="hf"><input class="in" data-k="text" maxlength="140" placeholder="Free delivery on orders above ₹999" value="' + esc(i.text || '') + '" aria-label="Text"/><input class="in" data-k="code" maxlength="30" placeholder="Code (optional)" value="' + esc(i.code || '') + '" aria-label="Code"/><input class="in" data-k="link" maxlength="300" placeholder="Link (optional)" value="' + esc(i.link || '') + '" aria-label="Link"/></div>' + acts + '</div>'; };
    const galRow = g => { g = g || {}; return '<div class="hrow"><img class="hthumb" src="' + esc(A.media(g.image) || A.NOIMG) + '" alt=""/><div class="hf"><div style="display:flex;gap:6px"><input class="in" data-k="image" maxlength="600" placeholder="Photo link" value="' + esc(g.image || '') + '" aria-label="Photo"/><button class="btn sm" type="button" data-pick>Choose</button></div><input class="in" data-k="caption" maxlength="120" placeholder="Caption, e.g. Paddy nursery beds" value="' + esc(g.caption || '') + '" aria-label="Caption"/><input class="in" data-k="tag" maxlength="40" placeholder="Label, e.g. Nursery" value="' + esc(g.tag || '') + '" aria-label="Label"/></div>' + acts + '</div>'; };
    const opts = sel => '<option value="">No product link</option>' + PR.filter(isLive).map(p => { const val = String(p.legacyId || p._id); return '<option value="' + esc(val) + '"' + (String(sel || '') === val ? ' selected' : '') + '>' + esc(p.name) + '</option>'; }).join('');
    const reelRow = r => { r = r || {}; return '<div class="hrow"><span class="hthumb vid">' + icon('video', 22) + '</span><div class="hf"><input class="in" data-k="video" maxlength="600" placeholder="https://….mp4" value="' + esc(r.video || '') + '" aria-label="Video link"/><input class="in" data-k="title" maxlength="120" placeholder="Title, e.g. Morning on the farm pond" value="' + esc(r.title || '') + '" aria-label="Title"/><input class="in" data-k="tag" maxlength="40" placeholder="Label" value="' + esc(r.tag || '') + '" aria-label="Label"/><select class="sel" data-k="productId" aria-label="Product shown with the reel" style="grid-column:1/-1">' + opts(r.productId) + '</select></div>' + acts + '</div>'; };
    $('#annRows').innerHTML = ((e.announcement || {}).items || []).map(annRow).join('');
    $('#galRows').innerHTML = (hp.gallery || []).map(galRow).join('');
    $('#reelRows').innerHTML = (hp.reels || []).map(reelRow).join('');
    const H = { save, discard: () => { A.setDirty(null); A.refresh(); } };
    watch(root, H);
    root.addEventListener('click', async ev => {
      const row = ev.target.closest('.hrow');
      if (ev.target.closest('[data-rm]')) { row.remove(); A.setDirty(H); return; }
      const mv = ev.target.closest('[data-mv]'); if (mv) { const o = mv.dataset.mv === '-1' ? row.previousElementSibling : row.nextElementSibling; if (o) { mv.dataset.mv === '-1' ? row.parentNode.insertBefore(row, o) : row.parentNode.insertBefore(o, row); A.setDirty(H); } return; }
      if (ev.target.closest('[data-pick]')) { const us = await A.pickPhotos(false); if (!us.length) return; $('[data-k=image]', row).value = us[0]; $('.hthumb', row).src = A.media(us[0]); A.setDirty(H); }
    });
    root.addEventListener('input', ev => { if (ev.target.dataset.k === 'image') { const r = ev.target.closest('.hrow'); $('.hthumb', r).src = A.media(ev.target.value) || A.NOIMG; } });
    $('#annAdd').onclick = () => { if ($$('#annRows .hrow').length >= 8) { A.toast('Up to 8 lines', true); return; } $('#annRows').insertAdjacentHTML('beforeend', annRow()); A.setDirty(H); };
    $('#galLib').onclick = async () => { const us = await A.pickPhotos(true); us.forEach(u => $('#galRows').insertAdjacentHTML('beforeend', galRow({ image: u }))); if (us.length) A.setDirty(H); };
    $('#reelAdd').onclick = () => { $('#reelRows').insertAdjacentHTML('beforeend', reelRow()); A.setDirty(H); };
    $('#heroPick').onclick = async () => { const us = await A.pickPhotos(false); if (!us.length) return; $('[data-f="homepage.heroMediaUrl"]').value = us[0]; $('[data-f="homepage.heroMediaType"]').value = 'image'; A.setDirty(H); };
    const rows = id => $$('#' + id + ' .hrow').map(r => { const o = {}; $$('[data-k]', r).forEach(i => { o[i.dataset.k] = i.value.trim(); }); return o; });
    async function save() {
      const x = collect(root);
      x.announcement.items = rows('annRows').filter(i => i.text);
      x.homepage.gallery = rows('galRows').filter(g => g.image);
      x.homepage.reels = rows('reelRows').filter(r => r.video);
      const bg = x.homepage.gallery.find(g => !A.okLink(g.image)); if (bg) { A.toast('This gallery photo link cannot be used: ' + bg.image, true); return; }
      const br = x.homepage.reels.find(r => !A.okLink(r.video)); if (br) { A.toast('Reel videos need an https:// link: ' + br.video, true); return; }
      if (A.isMedia(x.homepage.heroMediaUrl)) x.homepage.heroMediaUrl = x.homepage.heroMediaUrl.slice(1);   // saved as api/media/… (a page-relative link the server accepts)
      try { await saveSettings(x); A.setDirty(null); A.toast('Home page saved. The shop shows it within a minute.'); } catch (er) { A.toast(er.message, true); }
    }
  }, 'Home page');

  /* ═════════════════════ BLOGS AND NEWS ═════════════════════
     Two sections that share one list and one editor. Articles are written in a simple editor
     (headings, bold, lists, quotes, links, photos); the server keeps only that formatting. */
  const POSTS = {
    blogs: { kind: 'blog', path: '/blogs', title: 'Blogs', one: 'article', One: 'Article', newLabel: 'Write an article', page: 'blog.html', link: id => 'blog.html?post=' + encodeURIComponent(id),
      sub: 'Articles on the Blog page: rice varieties, recipes, traditions and life on the farm.', flag: ['featured', 'Feature on the blog page', 'Shown first and larger'],
      cats: [['rice', 'Rice varieties'], ['flowers', 'Dried flowers'], ['beverages', 'Drinks'], ['flour', 'Flour and mixes'], ['recipes', 'Recipes'], ['wellness', 'Traditions'], ['sustainability', 'On the farm']] },
    news: { kind: 'news', path: '/news', title: 'News', one: 'update', One: 'News update', newLabel: 'Add news', page: 'news.html', link: () => 'news.html',
      sub: 'Short updates on the News page: new products, farm milestones, events.', flag: ['pinned', 'Pin to the top', 'Stays above newer updates'],
      cats: [['product', 'New product'], ['community', 'Community'], ['milestone', 'Milestone'], ['certification', 'Certification'], ['award', 'Award']] },
  };
  const postState = x => x.isActive === false ? 'draft' : (x.publishedAt && new Date(x.publishedAt) > new Date()) ? 'scheduled' : 'live';
  const postBadge = x => ({ draft: '<span class="badge b-grey">Draft</span>', scheduled: '<span class="badge b-blue" title="' + esc(A.dateTime(x.publishedAt)) + '">Scheduled · ' + esc(A.date(x.publishedAt)) + '</span>', live: '<span class="badge b-green">Published</span>' })[postState(x)];
  const plainText = html => { const d = document.createElement('textarea'); d.innerHTML = String(html || '').replace(/<[^>]*>/g, ' '); return d.value.replace(/\s+/g, ' ').trim(); };   // tags become spaces so words in separate paragraphs stay apart
  const toParas = t => String(t || '').split(/\n\s*\n/).map(s => s.trim()).filter(Boolean).map(s => '<p>' + esc(s).replace(/\n/g, '<br>') + '</p>').join('');
  const localDT = d => { if (!d) return ''; const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16); };

  ['blogs', 'news'].forEach(key => A.route(key, (v, parts) => parts[0] ? postEditor(v, key, parts[0]) : postList(v, key), POSTS[key].title));

  async function postList(v, key) {
    const K = POSTS[key];
    v.innerHTML = A.head(K.title, K.sub, '<a class="btn" href="' + K.page + '" target="_blank" rel="noopener">' + icon('ext') + 'View ' + K.title.toLowerCase() + ' page</a><a class="btn pri" href="#/' + key + '/new">' + icon('plus') + K.newLabel + '</a>') + '<div id="postTable"></div>';
    let L = (await A.api('GET', K.path + '/admin/all')).data || [];
    const reload = async () => { L = (await A.api('GET', K.path + '/admin/all')).data || []; T.draw(); postCounts(); };
    const T = A.table({
      el: $('#postTable'), rows: () => L, key: x => x._id, placeholder: 'Search titles and tags', tab: A.query().get('tab') || 'all',
      tabs: [['all', 'All'], ['live', 'Published', x => postState(x) === 'live'], ['scheduled', 'Scheduled', x => postState(x) === 'scheduled'], ['draft', 'Drafts', x => postState(x) === 'draft'], ['flag', K.kind === 'blog' ? 'Featured' : 'Pinned', x => !!x[K.flag[0]]]],
      search: (x, s) => String(x.title).toLowerCase().includes(s) || (x.tags || []).some(t => t.includes(s)),
      onOpen: x => A.go('#/' + key + '/' + x._id), onState: s => A.setQuery({ tab: s.tab }),
      cols: [
        { k: 't', label: K.One, sort: x => String(x.title).toLowerCase(), html: x => '<div class="cell"><img class="thumb lg" src="' + esc(A.thumb(x.image, 112)) + '" alt="" loading="lazy" style="width:72px;height:48px"/><div style="min-width:0"><b>' + esc(x.title) + (x[K.flag[0]] ? ' <span class="badge b-gold plain">' + (K.kind === 'blog' ? 'Featured' : 'Pinned') + '</span>' : '') + '</b><small style="max-width:420px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(x.excerpt || plainText(x.content).slice(0, 110)) + '</small></div></div>' },
        { k: 's', label: 'Status', sort: x => postState(x), html: postBadge },
        { k: 'c', label: 'Category', cls: 'hide-sm', sort: x => x.catLabel || x.category, html: x => '<span class="small">' + esc(x.catLabel || (K.cats.find(c => c[0] === x.category) || [0, x.category])[1]) + '</span>' },
        { k: 'd', label: 'Date', sort: x => +new Date(x.publishedAt || x.createdAt), html: x => '<span class="small">' + A.date(x.publishedAt || x.createdAt) + '</span><div class="muted small">' + esc(x.readTime || '') + '</div>' },
      ],
      bulk: [
        ['Publish', async list => { await A.each(list, x => A.api('PUT', K.path + '/' + x._id, { isActive: true }), 'Published'); await reload(); }],
        ['Move to drafts', async list => { await A.each(list, x => A.api('PUT', K.path + '/' + x._id, { isActive: false }), 'Moved to drafts'); await reload(); }],
        ['Delete', async list => { if (!await A.confirm('Delete ' + A.plural(list.length, K.one) + '?', 'They are removed from the site for good.', 'Delete', true)) return false; await A.each(list, x => A.api('DELETE', K.path + '/' + x._id), 'Deleted'); await reload(); }, true],
      ],
      empty: '<div class="empty"><b>Nothing written yet</b>' + (K.kind === 'blog' ? 'Write about a rice variety, a recipe or a day on the farm.' : 'Share a new product or farm news.') + '<br><a class="btn pri" href="#/' + key + '/new">' + K.newLabel + '</a></div>',
    });
  }

  async function postEditor(v, key, id) {
    const K = POSTS[key], isNew = id === 'new';
    let P = isNew ? { isActive: false, category: K.cats[0][0], author: 'Nansei Farm Team', tags: [] } : null;
    if (!isNew) { const r = await A.api('GET', K.path + '/' + encodeURIComponent(id)).catch(() => null); P = r && r.data; if (!P) { const all = (await A.api('GET', K.path + '/admin/all')).data || []; P = all.find(x => x._id === id); } }
    if (!P) throw new Error('This ' + K.one + ' was not found. It may have been deleted.');
    const html0 = P.content || toParas(P.rawContent);
    const st = postState(P);
    v.innerHTML = A.head(isNew ? K.newLabel : 'Edit ' + K.one, isNew ? 'Saved as a draft until you choose Published.' : postBadge(P) + ' &nbsp;Last changed ' + A.ago(P.updatedAt),
      (!isNew && st === 'live' ? '<a class="btn" href="' + esc(K.link(P._id)) + '" target="_blank" rel="noopener">' + icon('ext') + 'View on site</a>' : ''), ['#/' + key, K.title]) +
      '<form class="split" id="pe" onsubmit="return false" novalidate><div>' +
      '<div class="card"><div class="card-b"><input class="post-title" data-f="title" id="f-title" maxlength="160" placeholder="Title" aria-label="Title"/>' +
      '<div class="rte-bar" id="rteBar" role="toolbar" aria-label="Formatting">' +
      '<button type="button" data-c="p" title="Normal text">Text</button><button type="button" data-c="h4" title="Heading">Heading</button><span class="sep"></span>' +
      '<button type="button" data-c="bold" title="Bold (Ctrl B)"><b>B</b></button><button type="button" data-c="italic" title="Italic (Ctrl I)"><i>I</i></button><span class="sep"></span>' +
      '<button type="button" data-c="insertUnorderedList" title="Bulleted list">• List</button><button type="button" data-c="insertOrderedList" title="Numbered list">1. List</button><button type="button" data-c="blockquote" title="Quote">“ Quote</button><span class="sep"></span>' +
      '<button type="button" data-c="link" title="Link">' + icon('ext', 14) + 'Link</button><button type="button" data-c="image" title="Add a photo">' + icon('image', 14) + 'Photo</button><span class="sep"></span>' +
      '<button type="button" data-c="removeFormat" title="Clear formatting">Clear</button><button type="button" data-c="undo" title="Undo (Ctrl Z)">↶</button><button type="button" data-c="redo" title="Redo">↷</button></div>' +
      '<div class="rte" id="rte" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Article text" data-ph="Start writing. Use Heading for sections; paste from anywhere and it comes in as plain text."></div>' +
      '<div class="rte-foot"><span id="wc"></span><span>Photos you add here are shrunk and uploaded to your store.</span></div><input type="file" accept="image/*" hidden id="rteFile"/></div></div>' +
      '<div class="card"><div class="card-h"><h2>Summary</h2></div><div class="card-b"><div class="field"><label for="f-excerpt">Short summary <span class="count-hint" id="exC"></span></label><textarea class="in" data-f="excerpt" id="f-excerpt" rows="3" maxlength="300" placeholder="Shown on the ' + K.title.toLowerCase() + ' page under the title"></textarea><p class="hint">Left empty, the first lines of the ' + K.one + ' are used.</p></div></div></div>' +
      '<div class="card"><div class="card-h"><h2>Search engine listing</h2></div><div class="card-b form"><div class="full"><div class="gprev" id="gprev"></div></div>' + field('metaTitle', 'Page title <span class="count-hint" id="mtC"></span>', { full: true, max: 70, ph: 'Uses the title when empty' }) + field('metaDescription', 'Page description <span class="count-hint" id="mdC"></span>', { full: true, area: true, rows: 2, max: 170, ph: 'Uses the summary when empty' }) + '</div></div>' +
      '</div><aside>' +
      '<div class="card"><div class="card-h"><h2>Publishing</h2></div><div class="card-b stack"><div class="seg" id="pubSeg" role="tablist" aria-label="Status"><button type="button" data-v="0">Draft</button><button type="button" data-v="1">Published</button></div>' +
      '<div class="field"><label for="f-pubAt">Publish date</label><input class="in" type="datetime-local" id="f-pubAt" style="width:100%"/><p class="hint" id="pubHint">Empty = the moment you publish. A future date keeps it hidden until then.</p></div>' +
      sw(K.flag[0], K.flag[1], K.flag[2]) + '</div></div>' +
      '<div class="card"><div class="card-h"><h2>Cover photo</h2></div><div class="card-b stack"><div class="cover" id="cover" tabindex="0" role="button" aria-label="Choose a cover photo"></div><input type="file" accept="image/*" hidden id="coverFile"/>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn sm" type="button" id="coverUp">' + icon('upload', 14) + 'Upload</button><button class="btn sm" type="button" id="coverPick">Earlier uploads</button><button class="btn sm ghost" type="button" id="coverDel">Remove</button></div>' +
      '<div class="field"><label for="f-imageAlt">Describe the photo</label><input class="in" data-f="imageAlt" id="f-imageAlt" maxlength="200" style="width:100%" placeholder="Hibiscus petals drying on a mat"/></div></div></div>' +
      '<div class="card"><div class="card-h"><h2>Details</h2></div><div class="card-b stack">' + field('category', 'Category', { options: K.cats }) +
      (K.kind === 'blog' ? field('author', 'Author', { max: 80 }) + '<div class="field"><label for="tagIn">Tags</label><div class="tagbox" id="tagbox"><input id="tagIn" placeholder="Type and press Enter" maxlength="30"/></div><p class="hint">Up to 8, used by the search on the blog page.</p></div>' : '') +
      field('readTime', 'Read time', { max: 20, ph: 'Worked out for you' }) + '</div></div>' +
      '<div class="card"><div class="card-h"><h2>How it looks in the list</h2></div><div class="card-b"><div class="post-card" id="pcard"></div></div></div>' +
      (isNew ? '' : '<div class="card"><div class="card-b"><button class="btn red" type="button" id="peDel" style="width:100%">' + icon('trash') + 'Delete ' + K.one + '</button></div></div>') +
      '</aside></form>';
    const f = $('#pe'), rte = $('#rte');
    fill(f, P); rte.innerHTML = html0;
    const AKEY = 'adm_draft_' + key + '_' + (isNew ? 'new' : P._id);
    const forget = () => { try { localStorage.removeItem(AKEY); } catch (e) { /* */ } };
    $('#f-pubAt').value = localDT(P.publishedAt);
    let pub = P.isActive !== false, cover = P.image || '', tags = (P.tags || []).slice();
    const H = { save, discard: () => { forget(); A.setDirty(null); A.refresh(); } };
    const dirty = () => A.setDirty(H);
    watch(f, H);
    try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (e) { /* older browsers */ }

    // publishing state
    const drawPub = () => { $$('#pubSeg button').forEach(b => b.classList.toggle('on', (b.dataset.v === '1') === pub)); const t = $('#f-pubAt').value; $('#pubHint').textContent = pub && t && new Date(t) > new Date() ? 'Scheduled: it appears on the site on ' + A.dateTime(new Date(t)) + '.' : 'Empty = the moment you publish. A future date keeps it hidden until then.'; };
    $('#pubSeg').onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; pub = b.dataset.v === '1'; drawPub(); dirty(); };
    $('#f-pubAt').addEventListener('input', drawPub);
    drawPub();

    // cover photo
    const drawCover = () => { const c = $('#cover'); c.classList.toggle('has', !!cover); c.innerHTML = cover ? '<img src="' + esc(A.media(cover) || A.NOIMG) + '" alt=""/>' : '<div>' + icon('upload', 22) + '<br>Drop a photo here or click to upload<br><span style="font-weight:500">16:9 landscape looks best</span></div>'; drawCard(); };
    const upCover = async files => { const fl = [...files].find(x => /^image\//.test(x.type)); if (!fl) return; $('#cover').innerHTML = '<div>Uploading…</div>'; try { const m = await A.upload(fl); cover = m.url; if (!$('#f-imageAlt').value) $('#f-imageAlt').value = $('#f-title').value; dirty(); } catch (er) { A.toast(er.message, true); } drawCover(); };
    $('#cover').onclick = () => $('#coverFile').click();
    $('#cover').onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('#coverFile').click(); } };
    $('#coverUp').onclick = () => $('#coverFile').click();
    $('#coverFile').onchange = e => { upCover(e.target.files); e.target.value = ''; };
    A.dropTarget($('#cover'), upCover);
    $('#coverPick').onclick = async () => { const us = await A.pickPhotos(false); if (us.length) { cover = us[0]; dirty(); drawCover(); } };
    $('#coverDel').onclick = () => { cover = ''; dirty(); drawCover(); };

    // tags (blog)
    const drawTags = () => { const box = $('#tagbox'); if (!box) return; $$('span', box).forEach(x => x.remove()); tags.forEach((t, i) => box.insertBefore(Object.assign(document.createElement('span'), { innerHTML: esc(t) + '<button type="button" aria-label="Remove tag ' + esc(t) + '" data-i="' + i + '">×</button>' }), $('#tagIn'))); };
    if ($('#tagbox')) {
      $('#tagIn').addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ',') && e.target.value.trim()) { e.preventDefault(); const t = e.target.value.trim().toLowerCase().slice(0, 30); if (!tags.includes(t) && tags.length < 8) tags.push(t); e.target.value = ''; drawTags(); dirty(); } else if (e.key === 'Backspace' && !e.target.value && tags.length) { tags.pop(); drawTags(); dirty(); } });
      $('#tagbox').addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) { tags.splice(Number(b.dataset.i), 1); drawTags(); dirty(); } else $('#tagIn').focus(); });
      drawTags();
    }

    // editor toolbar
    const exec = (c, val) => { rte.focus(); document.execCommand(c, false, val); dirty(); syncBar(); count(); };
    $('#rteBar').addEventListener('mousedown', e => { if (e.target.closest('button')) e.preventDefault(); });   // keep the text selection
    $('#rteBar').onclick = async e => {
      const b = e.target.closest('[data-c]'); if (!b) return;
      const c = b.dataset.c;
      if (c === 'p' || c === 'h4' || c === 'blockquote') return exec('formatBlock', '<' + c + '>');
      if (c === 'link') {
        const sel = window.getSelection(), range = sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
        const u = await A.ask('Add a link', 'Link (https://…, or a page of this site such as product.html?id=1)', 'https://', 'Add link');
        if (!u || u === 'https://') return;
        if (!/^(https:\/\/|mailto:|tel:|[a-z0-9-]+\.html)/i.test(u.trim())) { A.toast('Use a link that starts with https://', true); return; }
        rte.focus(); if (range) { sel.removeAllRanges(); sel.addRange(range); }
        if (sel.isCollapsed) exec('insertHTML', '<a href="' + esc(u.trim()) + '">' + esc(u.trim()) + '</a>'); else exec('createLink', u.trim());
        return;
      }
      if (c === 'image') { $('#rteFile').click(); return; }
      exec(c);
    };
    let savedRange = null;
    rte.addEventListener('blur', () => { const s = window.getSelection(); if (s.rangeCount && rte.contains(s.anchorNode)) savedRange = s.getRangeAt(0).cloneRange(); });
    $('#rteFile').onchange = async e => {
      const fl = e.target.files[0]; e.target.value = ''; if (!fl) return;
      A.toast('Uploading photo…');
      try {
        const m = await A.upload(fl);
        rte.focus(); if (savedRange) { const s = window.getSelection(); s.removeAllRanges(); s.addRange(savedRange); }
        exec('insertHTML', '<img src="' + esc(m.url) + '" alt="' + esc($('#f-title').value) + '"><p><br></p>');
      } catch (er) { A.toast(er.message, true); }
    };
    rte.addEventListener('paste', e => {
      const t = (e.clipboardData || window.clipboardData).getData('text/plain'); if (!t) return;
      e.preventDefault();
      exec('insertHTML', t.includes('\n') ? toParas(t) : esc(t));
    });
    rte.addEventListener('drop', e => { const fl = e.dataTransfer && [...e.dataTransfer.files].find(x => /^image\//.test(x.type)); if (!fl) return; e.preventDefault(); const dt = new DataTransfer(); dt.items.add(fl); $('#rteFile').files = dt.files; $('#rteFile').onchange({ target: $('#rteFile') }); });
    rte.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); e.stopPropagation(); $('[data-c=link]').click(); } });
    const syncBar = () => { ['bold', 'italic', 'insertUnorderedList', 'insertOrderedList'].forEach(c => { const b = $('[data-c=' + c + ']'); try { b.classList.toggle('on', document.queryCommandState(c)); } catch (er) { /* */ } }); let blk = ''; try { blk = String(document.queryCommandValue('formatBlock') || '').toLowerCase(); } catch (er) { /* */ } ['p', 'h4', 'blockquote'].forEach(c => $('[data-c=' + c + ']').classList.toggle('on', blk === c)); };
    document.addEventListener('selectionchange', () => { if (document.activeElement === rte) syncBar(); });
    const count = () => { const w = plainText(rte.innerHTML).split(' ').filter(Boolean).length; $('#wc').textContent = A.plural(w, 'word') + ' · about ' + Math.max(1, Math.round(w / 200)) + ' min read'; $('#f-readTime').placeholder = Math.max(1, Math.round(w / 200)) + (K.kind === 'news' ? ' min read' : ' min') + ' (worked out for you)'; };
    rte.addEventListener('input', () => { dirty(); count(); drawCard(); });

    // live previews
    const drawCard = () => { const t = $('#f-title').value || 'Title', ex = $('#f-excerpt').value || plainText(rte.innerHTML).slice(0, 140); $('#pcard').innerHTML = '<div class="pc-img">' + (cover ? '<img src="' + esc(A.media(cover)) + '" alt=""/>' : '') + '</div><div class="pc-b"><small>' + esc((K.cats.find(c => c[0] === $('#f-category').value) || [0, ''])[1]) + '</small><b>' + esc(t) + '</b><p>' + esc(ex.slice(0, 150)) + '</p></div>'; };
    const gp = () => { const t = $('#f-metaTitle').value || $('#f-title').value || 'Title', d = $('#f-metaDescription').value || $('#f-excerpt').value || plainText(rte.innerHTML).slice(0, 160) || 'Summary'; $('#gprev').innerHTML = '<div class="u">www.nanseiorg.in › ' + K.page.replace('.html', '') + '</div><div class="t">' + esc(t.slice(0, 70)) + ' | Nansei Organics</div><div class="d">' + esc(d.slice(0, 165)) + '</div>'; $('#mtC').textContent = $('#f-metaTitle').value.length + '/70'; $('#mdC').textContent = $('#f-metaDescription').value.length + '/170'; $('#exC').textContent = $('#f-excerpt').value.length + '/300'; };
    f.addEventListener('input', () => { gp(); drawCard(); });
    f.addEventListener('change', drawCard);
    drawCover(); gp(); count(); syncBar();
    f.addEventListener('input', A.debounce(() => { try { localStorage.setItem(AKEY, JSON.stringify({ title: $('#f-title').value, html: rte.innerHTML, excerpt: $('#f-excerpt').value, at: Date.now() })); } catch (e) { /* storage full or private */ } }, 1200));
    try {
      const d = JSON.parse(localStorage.getItem(AKEY) || 'null');
      if (d && d.at > +new Date(P.updatedAt || 0) && (d.html !== html0 || d.title !== (P.title || ''))) A.toast('Unsaved writing from ' + A.ago(d.at) + ' was kept in this browser', false, { label: 'Restore', ms: 20000, fn: () => { $('#f-title').value = d.title || ''; rte.innerHTML = d.html || ''; $('#f-excerpt').value = d.excerpt || ''; dirty(); count(); gp(); drawCard(); } });
    } catch (e) { /* */ }
    if (isNew) setTimeout(() => $('#f-title').focus(), 50);

    async function save() {
      const x = collect(f);
      if (!x.title) { A.toast('Give it a title', true); $('#f-title').focus(); return; }
      // browsers sometimes wrap a list or heading inside a paragraph; unwrap it so the page stays valid
      const html = rte.innerHTML.replace(/<p>\s*(<(ul|ol|h4|blockquote)\b[\s\S]*?<\/\2>)\s*<\/p>/gi, '$1').replace(/(<p><br><\/p>\s*)+$/i, '').trim();
      if (!plainText(html) && !/<img/i.test(html)) { A.toast('Write some text first', true); rte.focus(); return; }
      const when = $('#f-pubAt').value;
      const body = {
        title: x.title, content: html, excerpt: x.excerpt, category: x.category, catLabel: (K.cats.find(c => c[0] === x.category) || [0, x.category])[1],
        image: cover, imageAlt: x.imageAlt, readTime: x.readTime, metaTitle: x.metaTitle, metaDescription: x.metaDescription,
        isActive: pub, publishedAt: when ? new Date(when).toISOString() : (pub && !P.publishedAt ? new Date().toISOString() : (P.publishedAt || null)),
      };
      body[K.flag[0]] = !!x[K.flag[0]];
      if (K.kind === 'blog') { body.author = x.author; body.tags = tags; }
      try {
        const r = await A.api(isNew ? 'POST' : 'PUT', K.path + (isNew ? '' : '/' + P._id), body);
        A.setDirty(null); postCounts(); forget();
        const saved = r.data || {};
        A.toast(!pub ? 'Saved as a draft' : postState(saved) === 'scheduled' ? 'Scheduled for ' + A.dateTime(saved.publishedAt) : 'Published', false, pub && postState(saved) === 'live' ? { label: 'View', fn: () => window.open(K.link(saved._id), '_blank', 'noopener') } : null);
        if (isNew) A.go('#/' + key + '/' + saved._id); else A.refresh();
      } catch (er) { A.toast(er.message, true); }
    }
    if ($('#peDel')) $('#peDel').onclick = async () => { if (!await A.confirm('Delete this ' + K.one + '?', 'It is removed from the site for good.', 'Delete ' + K.one, true)) return; try { await A.api('DELETE', K.path + '/' + P._id); A.setDirty(null); forget(); A.toast('Deleted'); postCounts(); A.go('#/' + key); } catch (er) { A.toast(er.message, true); } };
  }

  /* drafts waiting, shown next to Blogs and News in the menu */
  function postCounts() {
    [['/blogs', '#cBlogs'], ['/news', '#cNews']].forEach(([path, el]) => A.api('GET', path + '/admin/all').then(r => { const n = (r.data || []).filter(x => x.isActive === false).length; const e = $(el); e.textContent = n; e.hidden = !n; e.title = A.plural(n, 'draft'); }, () => {}));
  }


  /* ═════════════════════ SETTINGS ═════════════════════ */
  A.route('settings', async v => {
    const S = await loadSettings(true);
    const sec = A.query().get('s') || 'store';
    v.classList.add('narrow');
    const SECS = [['store', 'Store and contact'], ['delivery', 'Delivery and payment'], ['legal', 'Legal details'], ['social', 'Social and footer'], ['connections', 'Connections']];
    v.innerHTML = A.head('Settings', S.saved && S.saved.updatedAt ? 'Last saved ' + A.dateTime(S.saved.updatedAt) : 'Not saved yet: the shop uses the values shown.', '<div class="seg">' + SECS.map(([k, l]) => '<button type="button" data-s="' + k + '" class="' + (k === sec ? 'on' : '') + '">' + l + '</button>').join('') + '</div>') +
      '<div id="sf">' +
      '<div class="card" data-sec="store"><div class="card-h"><h2>Store and contact</h2></div><div class="card-b form">' + field('storeName', 'Store name', { max: 80 }) + field('contact.email', 'Email', { type: 'email', max: 120 }) + field('contact.phone', 'Phone', { max: 20 }) + field('contact.whatsapp', 'WhatsApp number', { max: 20, ph: '91XXXXXXXXXX', hint: 'With the country code, digits only.' }) + field('contact.address', 'Address', { full: true, max: 300, hint: 'Shown in the footer and on invoices; the footer map uses it too.' }) + '</div></div>' +
      '<div class="card" data-sec="delivery"><div class="card-h"><h2>Delivery and payment</h2></div><div class="card-b form">' + field('shipping.freeShippingAbove', 'Free delivery above', { type: 'number', min: 0, prefix: '₹' }) + field('shipping.shippingFee', 'Delivery fee below that', { type: 'number', min: 0, prefix: '₹', hint: '0 means delivery is always free.' }) + '<div class="field full"><p class="hint" style="margin:0">Payments are online only, through Razorpay. Cash on delivery is switched off.</p></div>' + field('shipping.dispatchNote', 'Dispatch note', { max: 160, ph: 'Packed and dispatched within 2 working days', hint: 'Shown on product pages.' }) + '</div></div>' +
      '<div class="card" data-sec="legal"><div class="card-h"><h2>Legal details</h2></div><div class="card-b form">' + field('legal.businessName', 'Registered business name', { max: 120 }) + field('legal.gstin', 'GSTIN', { max: 15 }) + field('legal.fssai', 'FSSAI licence number', { max: 20, hint: '14 digits. Shown in the footer.' }) + '<div></div>' + field('legal.grievanceName', 'Grievance officer', { max: 80 }) + field('legal.grievanceEmail', 'Grievance email', { type: 'email', max: 120 }) + field('legal.grievancePhone', 'Grievance phone', { max: 20 }) + '<div class="full"><p class="hint">India’s e-commerce rules ask online sellers to name a grievance officer and to acknowledge complaints within 48 hours.</p></div></div></div>' +
      '<div class="card" data-sec="social"><div class="card-h"><h2>Social links and footer</h2></div><div class="card-b form">' + field('social.instagram', 'Instagram', { max: 300, ph: 'https://instagram.com/…' }) + field('social.facebook', 'Facebook', { max: 300, ph: 'https://facebook.com/…' }) + field('social.youtube', 'YouTube', { max: 300, ph: 'https://youtube.com/…' }) + '<div></div>' + field('footer.about', 'Footer introduction', { full: true, area: true, rows: 3, max: 500 }) + '<div class="field full">' + sw('footer.showMap', 'Show the farm map in the footer') + '</div></div></div>' +
      '<div class="card" data-sec="connections"><div class="card-h"><h2>Connections</h2><span class="sp"></span><small>Read from the server</small></div><div class="card-b" id="connBody"><p class="muted">Checking…</p></div><div class="card-f"><span class="hint" style="margin:0">Keys are entered on the server (Render → Environment), never in this panel, so they do not pass through the browser.</span></div></div>' +
      '</div>';
    const root = $('#sf');
    A.api('GET', '/settings/status').then(r => drawConnections(r.data || {}), er => { $('#connBody').innerHTML = '<p class="muted">' + esc(er.message) + '</p>'; });
    fill(root, S.effective);
    const show = k => { $$('[data-sec]', root).forEach(c => { c.hidden = c.dataset.sec !== k; }); $$('.seg button', v).forEach(b => b.classList.toggle('on', b.dataset.s === k)); A.setQuery({ s: k === 'store' ? null : k }); };
    $('.seg', v).onclick = e => { const b = e.target.closest('[data-s]'); if (b) show(b.dataset.s); };
    show(sec);
    const H = { save, discard: () => { A.setDirty(null); A.refresh(); } };
    watch(root, H);
    async function save() {
      try { await saveSettings(collect(root)); A.setDirty(null); A.toast('Settings saved. The shop picks them up within a minute.'); }
      catch (er) { A.toast(er.message, true); }
    }
  }, 'Settings');

  /* which outside services the server is set up for (no keys are ever sent to the browser) */
  function drawConnections(c) {
    const base = /^https?:\/\//i.test(window.API_BASE || '') ? window.API_BASE.replace(/\/api\/?$/, '') : location.origin;
    const on = (yes, txt) => '<span class="badge ' + (yes ? 'b-green' : 'b-red') + '">' + esc(txt || (yes ? 'Connected' : 'Not set up')) + '</span>';
    const hook = (set, path) => '<div class="small" style="margin-top:6px">Webhook ' + (set ? '<span class="badge b-green plain">secret set</span>' : '<span class="badge b-amber plain">secret not set</span>') + ' <code style="font-size:12px;background:var(--warm);padding:2px 6px;border-radius:5px;word-break:break-all">' + esc(base + path) + '</code> <button class="linkbtn small" type="button" data-copy="' + esc(base + path) + '">Copy</button></div>';
    const p = c.payments || {}, e = c.email || {}, s = c.shipping || {}, w = c.webhooks || {};
    $('#connBody').innerHTML = '<div class="stack">' +
      '<div class="line-item"><i class="t-green" style="width:38px;height:38px;border-radius:10px;display:grid;place-items:center">' + icon('card', 18) + '</i><div style="flex:1;min-width:0"><b>Online payments · Razorpay</b><div class="q">' + (p.razorpay ? (p.mode === 'live' ? 'Live keys: real payments' : p.mode === 'test' ? 'Test keys: payments are not real' : 'Keys set') : 'Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET on the server. Until then only cash on delivery works.') + '</div>' + (p.razorpay ? hook(p.webhook, w.razorpay) : '') + '</div>' + on(p.razorpay, p.razorpay && p.mode === 'test' ? 'Test mode' : null) + '</div>' +
      '<div class="line-item"><i class="t-blue" style="width:38px;height:38px;border-radius:10px;display:grid;place-items:center">' + icon('msg', 18) + '</i><div style="flex:1;min-width:0"><b>Order emails · ' + esc(e.provider || 'Resend') + '</b><div class="q">' + (e.configured ? 'Sent from ' + esc(e.from || 'the default address') + (e.adminCopy ? ' · you get a copy of new orders' : '') : 'Set RESEND_API_KEY and EMAIL_FROM on the server. Customers get no confirmation email until then.') + '</div>' + (e.configured ? '<button class="btn sm" type="button" id="testMail" style="margin-top:8px">Send me a test email</button>' : '') + '</div>' + on(e.configured) + '</div>' +
      '<div class="line-item"><i class="t-gold" style="width:38px;height:38px;border-radius:10px;display:grid;place-items:center">' + icon('truck', 18) + '</i><div style="flex:1;min-width:0"><b>Shipping · Shiprocket</b><div class="q">' + (s.shiprocket ? (s.autoShip ? 'Books a courier by itself for new orders' : 'Creates the shipment; you buy the label in Shiprocket') + ' · pickup “' + esc(s.pickup) + '”' : 'Set SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD on the server. You can still enter courier and AWB by hand on each order.') + '</div>' + (s.shiprocket ? hook(s.webhook, w.shiprocket) : '') + '</div>' + on(s.shiprocket) + '</div>' +
      '<div class="line-item"><i class="t-amber" style="width:38px;height:38px;border-radius:10px;display:grid;place-items:center">' + icon('users', 18) + '</i><div style="flex:1;min-width:0"><b>Sign in with Google</b><div class="q">' + ((c.google || {}).signIn ? 'Customers can sign in with their Google account' : 'Optional. Set GOOGLE_CLIENT_ID on the server to offer it.') + '</div></div>' + on((c.google || {}).signIn, (c.google || {}).signIn ? 'On' : 'Off') + '</div></div>';
    $('#connBody').onclick = async ev => {
      const cp = ev.target.closest('[data-copy]'); if (cp) { navigator.clipboard.writeText(cp.dataset.copy).then(() => A.toast('Copied')); return; }
      if (ev.target.closest('#testMail')) { const b = $('#testMail'); b.classList.add('busy'); try { const r = await A.api('POST', '/settings/test-email'); A.toast(r.message || 'Test email sent'); } catch (er) { A.toast(er.message, true); } b.classList.remove('busy'); }
    };
  }

  /* new orders while the panel is open: a note, the menu count, the tab title and (if switched on) a soft chime */
  function watchOrders() {
    let last = null, unseen = 0, sound = false;
    try { sound = localStorage.getItem('adm_sound') === '1'; } catch (e) { /* private mode */ }
    const box = $('#soundOn'); if (box) { box.checked = sound; box.onchange = () => { sound = box.checked; try { localStorage.setItem('adm_sound', sound ? '1' : ''); } catch (e) { /* */ } if (sound) chime(); }; }
    const title = () => { document.title = (unseen ? '(' + unseen + ') ' : '') + document.title.replace(/^\(\d+\)\s*/, ''); };
    window.addEventListener('hashchange', () => setTimeout(title, 50));
    const seen = () => { if (!document.hidden && unseen) { unseen = 0; title(); } };
    document.addEventListener('visibilitychange', seen); window.addEventListener('focus', seen);
    function chime() {
      try {
        const ac = new (window.AudioContext || window.webkitAudioContext)(), t = ac.currentTime;
        [[660, 0], [880, 0.16]].forEach(([f, d]) => { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = f; o.type = 'sine'; g.gain.setValueAtTime(0.0001, t + d); g.gain.exponentialRampToValueAtTime(0.12, t + d + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.35); o.connect(g).connect(ac.destination); o.start(t + d); o.stop(t + d + 0.4); });
        setTimeout(() => ac.close(), 900);
      } catch (e) { /* no audio */ }
    }
    async function tick() {
      try {
        const list = (await A.api('GET', '/orders?limit=10')).data || [];
        const newest = list.length ? +new Date(list[0].createdAt) : 0;
        if (last === null) { last = newest; return; }
        const fresh = list.filter(o => +new Date(o.createdAt) > last);
        if (!fresh.length) return;
        last = newest;
        fresh.reverse().forEach(o => A.toast('New order ' + (o.orderNumber || '') + ' · ' + rupee(o.totalPrice) + ' · ' + custName(o), false, { label: 'Open', fn: () => A.go('#/orders/' + o._id), ms: 15000 }));
        if (document.hidden || !document.hasFocus()) { unseen += fresh.length; title(); }
        if (sound) chime();
        A.api('GET', '/orders/admin/stats').then(r => { const d = r.data || {}; setCounts((d.pendingOrders || 0) + (d.processingOrders || 0), null, null); }, () => {});
      } catch (e) { /* offline for a moment: try again next time */ }
    }
    tick(); setInterval(tick, 45000);
  }

  /* badge counts in the menu, then open the page */
  A.start().then(() => {
    postCounts(); watchOrders();
    Promise.allSettled([A.api('GET', '/orders/admin/stats'), A.load('products'), A.load('reviews')]).then(([s, p, r]) => {
      const d = s.status === 'fulfilled' ? s.value.data || {} : {};
      let n = 0; if (p.status === 'fulfilled') p.value.filter(isLive).forEach(x => (x.sizes || []).forEach(z => { if (z.active !== false && z.stock != null && z.stock <= lowAt(x)) n++; }));
      setCounts((d.pendingOrders || 0) + (d.processingOrders || 0), n, r.status === 'fulfilled' ? r.value.filter(x => !(x.reply && x.reply.text) && x.isApproved !== false).length : null);
    });
  });
})();
