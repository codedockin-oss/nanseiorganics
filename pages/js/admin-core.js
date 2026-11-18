/* Nansei Organics store admin — shared parts: server calls, routing, dialogs, photos, search, tables.
 * Pages live in admin-app.js and register themselves with A.route(name, fn).
 * Everything here talks to the store's own backend (API_BASE from config.js). */
(function () {
  'use strict';
  const A = window.A = {};
  const API_BASE = window.API_BASE || '/api';
  const $ = A.$ = (s, r) => (r || document).querySelector(s);
  const $$ = A.$$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const esc = A.esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  A.rupee = n => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  A.rupeeShort = n => { n = Number(n || 0); return n >= 1e7 ? '₹' + (n / 1e7).toFixed(1) + ' Cr' : n >= 1e5 ? '₹' + (n / 1e5).toFixed(1) + ' L' : n >= 1e3 ? '₹' + (n / 1e3).toFixed(1) + 'k' : '₹' + Math.round(n); };
  A.date = d => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  A.dateTime = d => d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—';
  A.ago = d => {
    if (!d) return '—'; const s = (Date.now() - new Date(d)) / 1000;
    if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + ' min ago'; if (s < 86400) return Math.floor(s / 3600) + ' h ago';
    if (s < 86400 * 7) return Math.floor(s / 86400) + ' d ago'; return A.date(d);
  };
  A.debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  A.token = () => localStorage.getItem('admin_token') || localStorage.getItem('nansai_token');
  A.plural = (n, w, ws) => n + ' ' + (n === 1 ? w : (ws || w + 's'));

  /* ───────── icons (inline, stroke) ───────── */
  const P = {
    plus: '<path d="M12 5v14M5 12h14"/>', x: '<path d="M18 6 6 18M6 6l12 12"/>', left: '<path d="m15 18-6-6 6-6"/>', right: '<path d="m9 18 6-6-6-6"/>',
    up: '<path d="m18 15-6-6-6 6"/>', down: '<path d="m6 9 6 6 6-6"/>', trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>', copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
    ext: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/>', star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>', image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
    box: '<path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7z"/>',
    bag: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0"/>', truck: '<path d="M1 3h15v13H1zM16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
    alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"/>', check: '<path d="M20 6 9 17l-5-5"/>',
    card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>', msg: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>', print: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/>',
    dl: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>', search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>', edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    grip: '<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>',
    video: '<rect x="2" y="5" width="15" height="14" rx="2"/><path d="m17 10 5-3v10l-5-3z"/>', users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>', home: '<path d="M3 10.5 12 3l9 7.5V21H3z"/>',
    tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z"/>', gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5z"/>', stock: '<path d="M4 7h16M4 12h16M4 17h10"/>',
  };
  A.icon = (n, s) => '<svg viewBox="0 0 24 24" width="' + (s || 16) + '" height="' + (s || 16) + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[n] || '') + '</svg>';

  /* ───────── server ───────── */
  A.api = async function api(method, path, body, opt) {
    opt = opt || {};
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), opt.timeout || 20000);
    let res, data;
    try {
      res = await fetch(API_BASE + path, { method, signal: ctl.signal, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + A.token() }, body: body ? JSON.stringify(body) : undefined });
      data = await res.json().catch(() => ({}));
    } catch (e) {
      throw new Error(e.name === 'AbortError' ? 'The server took too long to answer. If it was asleep, try again in a few seconds.' : 'Cannot reach the server. Check the connection and try again.');
    } finally { clearTimeout(t); }
    if (res.status === 401) { A.signOut(true); throw new Error('Your session has ended. Please sign in again.'); }
    if (res.status === 403) throw new Error('This account is not allowed to do that.');
    if (!res.ok || data.success === false) throw new Error(data.message || 'Something went wrong (' + res.status + ')');
    return data;
  };
  A.signOut = function (expired) {
    ['admin_token', 'admin_user', 'nansai_token', 'nansai_user', 'nansai_activity'].forEach(k => localStorage.removeItem(k));
    location.replace('admin-login.html' + (expired === true ? '?expired=1' : ''));
  };

  /* shared lists, loaded once and refreshed after changes */
  const cache = {};
  A.load = async (key, force) => {
    const src = { products: ['/products/admin/all?limit=500', 'products'], customers: ['/users', 'data'], media: ['/media', 'data'], coupons: ['/coupons', 'data'], reviews: ['/reviews/admin/all', 'data'] }[key];
    if (!cache[key] || force) cache[key] = A.api('GET', src[0]).then(d => d[src[1]] || []).catch(e => { delete cache[key]; throw e; });
    return cache[key];
  };
  A.forget = key => { delete cache[key]; };

  /* ───────── photo links ───────── */
  const API_ORIGIN = /^https?:\/\//i.test(API_BASE) ? API_BASE.replace(/\/api\/?$/, '') : '';
  A.NOIMG = "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 3'%3E%3Crect width='4' height='3' fill='%23efe9dd'/%3E%3C/svg%3E";
  A.isMedia = u => /^\/api\/media\/[a-f0-9]{24}$/i.test(String(u || ''));
  /** a link the shop can show: uploaded photo, https://…, or one of the site's own files */
  A.media = u => {
    u = String(u || '').trim();
    if (/^api\/media\/[a-f0-9]{24}$/i.test(u)) u = '/' + u;
    if (A.isMedia(u)) return API_ORIGIN + u;
    if (/^https:\/\/[^\s"'<>]+$/i.test(u)) return u;
    if (/^\/?pages\/(images|videos)\//i.test(u)) u = u.replace(/^\/?pages\//i, '');
    if (/^(\.\/)?(images|videos)\/[^"'<>]+$/i.test(u)) return u;
    return '';
  };
  A.okLink = u => !!A.media(u);
  A.thumb = (u, w) => { const m = A.media(u); if (!m) return A.NOIMG; return m.includes('ik.imagekit.io') && !/[?&]tr=/.test(m) ? m + (m.includes('?') ? '&' : '?') + 'tr=w-' + (w || 120) : m; };
  A.firstImg = p => { const im = p && p.images && p.images[0]; return A.thumb((im && (im.url || im)) || (p && p.image), 120); };
  A.absLink = u => { const m = A.media(u); return /^https?:/i.test(m) ? m : new URL(m, location.href).href; };
  A.kb = n => n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round((n || 0) / 1024)) + ' KB';

  /* shrink in the browser before upload: longest side 1600 px, WebP (JPEG where the browser has no WebP) */
  A.shrink = async function (file) {
    if (!/^image\//.test(file.type)) throw new Error(file.name + ' is not a photo');
    if (file.type === 'image/gif') { if (file.size > 4e6) throw new Error(file.name + ' is over 4 MB'); return { blob: file, w: 0, h: 0 }; }
    let bmp;
    try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
    catch (e) { throw new Error(file.name + ': this browser cannot open that photo type. Save it as JPEG or PNG and try again.'); }
    const s = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * s)), h = Math.max(1, Math.round(bmp.height * s));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); g.imageSmoothingQuality = 'high';
    const draw = bg => { g.clearRect(0, 0, w, h); if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); } g.drawImage(bmp, 0, 0, w, h); };
    const out = (t, q) => new Promise(r => c.toBlob(r, t, q));
    draw();
    let blob = await out('image/webp', 0.82);
    if (!blob || blob.type !== 'image/webp') { draw('#fff'); blob = await out('image/jpeg', 0.85); }
    if (bmp.close) bmp.close();
    if (s === 1 && /^image\/(jpeg|png|webp)$/.test(file.type) && blob && file.size <= blob.size) blob = file;
    if (!blob || blob.size > 4e6) throw new Error(file.name + ' is still over 4 MB after shrinking');
    return { blob, w, h };
  };
  A.upload = async function (file) {
    const { blob, w, h } = await A.shrink(file);
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 60000);
    let res, data;
    try {
      res = await fetch(API_BASE + '/media', { method: 'POST', body: blob, signal: ctl.signal, headers: {
        'Content-Type': blob.type || 'application/octet-stream', Authorization: 'Bearer ' + A.token(),
        'X-File-Name': encodeURIComponent(String(file.name || 'photo').slice(0, 140)), 'X-Width': String(w || ''), 'X-Height': String(h || '') } });
      data = await res.json().catch(() => ({}));
    } catch (e) { throw new Error(e.name === 'AbortError' ? 'The upload took too long. Check the connection and try again.' : 'Cannot reach the server to upload ' + file.name); }
    finally { clearTimeout(t); }
    if (res.status === 401) { A.signOut(true); throw new Error('Your session has ended.'); }
    if (!res.ok || data.success === false) throw new Error((data.message || 'Upload failed (' + res.status + ')') + ': ' + file.name);
    A.forget('media');
    return data.data;
  };
  A.uploadMany = async function (files, onEach) {
    const list = [...files].filter(f => f && f.size && /^image\//.test(f.type)); let ok = 0;
    if (!list.length) { A.toast('Choose photo files (JPEG, PNG or WebP)', true); return 0; }
    for (const f of list) { try { const m = await A.upload(f); ok++; onEach && onEach(m.url, m); } catch (e) { A.toast(e.message, true); } }
    if (ok) A.toast(A.plural(ok, 'photo') + ' uploaded');
    return ok;
  };
  /** drag files onto an element */
  A.dropTarget = function (el, onFiles) {
    let n = 0;
    el.addEventListener('dragenter', e => { if (!e.dataTransfer || ![...e.dataTransfer.types].includes('Files')) return; e.preventDefault(); n++; el.classList.add('on'); });
    el.addEventListener('dragover', e => { if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) e.preventDefault(); });
    el.addEventListener('dragleave', () => { if (--n <= 0) { n = 0; el.classList.remove('on'); } });
    el.addEventListener('drop', e => { if (!e.dataTransfer || !e.dataTransfer.files.length) return; e.preventDefault(); n = 0; el.classList.remove('on'); onFiles(e.dataTransfer.files); });
  };

  /* ───────── toasts ───────── */
  A.toast = function (msg, err, action) {
    const t = document.createElement('div'); t.className = 'toast' + (err ? ' err' : '');
    t.innerHTML = '<span>' + esc(msg) + '</span>' + (action ? '<button type="button">' + esc(action.label) + '</button>' : '');
    if (action) t.querySelector('button').onclick = () => { action.fn(); t.remove(); };
    $('#toasts').appendChild(t);
    setTimeout(() => t.remove(), action && action.ms ? action.ms : err ? 6000 : action ? 6000 : 3200);
  };

  /* ───────── drawer + modal ───────── */
  let lastFocus = null;
  A.drawer = function (title, body, foot) {
    lastFocus = document.activeElement;
    $('#drTitle').textContent = title; $('#drBody').innerHTML = body; $('#drFoot').innerHTML = foot || '';
    $('#drawer').classList.add('on'); $('#veil').classList.add('on');
    setTimeout(() => { const f = $('#drBody input,#drBody textarea,#drBody select'); (f || $('#drawer .x')).focus(); }, 60);
  };
  A.closeDrawer = function () { $('#drawer').classList.remove('on'); $('#veil').classList.remove('on'); if (lastFocus && lastFocus.focus) lastFocus.focus(); };
  A.drawerOpen = () => $('#drawer').classList.contains('on');
  let modalDone = null;
  A.modal = function (title, body, foot, wide) {
    $('#mdTitle').textContent = title; $('#mdBody').innerHTML = body; $('#mdFoot').innerHTML = foot || '';
    $('#mdBox').classList.toggle('wide', !!wide);
    $('#modal').classList.add('on');
    return new Promise(r => { modalDone = r; });
  };
  A.closeModal = function (v) { $('#modal').classList.remove('on'); const d = modalDone; modalDone = null; if (d) d(v); };
  /** confirm with a clear verb button; danger = red */
  A.confirm = function (title, text, okLabel, danger) {
    const p = A.modal(title, '<p>' + text + '</p>', '<button class="btn" type="button" data-v="0">Cancel</button><button class="btn ' + (danger ? 'red' : 'pri') + '" type="button" data-v="1">' + esc(okLabel || 'Continue') + '</button>');
    setTimeout(() => $('#mdFoot [data-v="1"]').focus(), 30);
    return p.then(v => v === true);
  };
  /** one text answer (null when cancelled) */
  A.ask = function (title, label, value, okLabel, multiline) {
    const f = multiline ? '<textarea class="in" id="askIn" rows="4" maxlength="1000">' + esc(value || '') + '</textarea>' : '<input class="in" id="askIn" style="width:100%" maxlength="300" value="' + esc(value || '') + '"/>';
    const p = A.modal(title, '<div class="field"><label for="askIn">' + esc(label) + '</label>' + f + '</div>', '<button class="btn" type="button" data-v="0">Cancel</button><button class="btn pri" type="button" data-v="ask">' + esc(okLabel || 'Save') + '</button>');
    setTimeout(() => { const i = $('#askIn'); i.focus(); if (!multiline) i.select(); i.addEventListener('keydown', e => { if (e.key === 'Enter' && !multiline) { e.preventDefault(); A.closeModal(i.value); } }); }, 30);
    return p.then(v => v === false || v === undefined || v === null ? null : v);
  };
  document.addEventListener('click', e => {
    const b = e.target.closest('#mdFoot [data-v]');
    if (b) { const v = b.dataset.v; A.closeModal(v === 'ask' ? $('#askIn').value : v === '1' ? true : v === '0' ? false : v); return; }
    if (e.target.closest('#modal [data-close]')) { A.closeModal(false); return; }
    if (e.target.closest('#drawer [data-close]') || e.target === $('#veil')) A.closeDrawer();
  });

  /* ───────── photo picker (library + upload) ───────── */
  A.pickPhotos = function (multi) {
    let sel = [];
    const draw = async reload => {
      const g = $('#pickGrid'); if (!g) return;
      if (reload) g.innerHTML = '<p class="muted">Loading…</p>';
      let list; try { list = await A.load('media', reload); } catch (e) { g.innerHTML = '<p class="muted">' + esc(e.message) + '</p>'; return; }
      g.innerHTML = list.length ? list.map(m => '<div class="lt pick' + (sel.includes(m.url) ? ' sel' : '') + '" role="button" tabindex="0" aria-pressed="' + sel.includes(m.url) + '" data-u="' + esc(m.url) + '"><div class="img"><img src="' + esc(A.media(m.url)) + '" alt="" loading="lazy"/></div><div class="meta"><b>' + esc(m.name || 'photo') + '</b>' + (m.width ? m.width + '×' + m.height : A.kb(m.size)) + '</div></div>').join('')
        : '<div class="empty" style="grid-column:1/-1"><b>No photos yet</b>Use “Upload new” to add some.</div>';
      $('#pickNote').textContent = sel.length ? sel.length + ' selected' : (multi ? 'Click photos to select them' : 'Click a photo to select it');
      $('#mdFoot [data-v="pick"]').disabled = !sel.length;
    };
    const p = A.modal(multi ? 'Choose from earlier uploads' : 'Choose an earlier upload',
      '<div class="dropzone" id="pickDrop" style="margin-bottom:14px;padding:14px">Drop photos here or <label class="linkbtn" style="cursor:pointer">upload new<input type="file" accept="image/*" multiple hidden id="pickFile"/></label></div><div class="lib" id="pickGrid"></div>',
      '<span class="muted small" id="pickNote" style="margin-right:auto"></span><button class="btn" type="button" data-v="0">Cancel</button><button class="btn pri" type="button" data-v="pick">' + (multi ? 'Use photos' : 'Use photo') + '</button>', true);
    const up = async files => { const fresh = []; $('#pickNote').textContent = 'Uploading…'; await A.uploadMany(files, u => fresh.push(u)); if (fresh.length) sel = multi ? sel.concat(fresh) : fresh.slice(-1); draw(true); };
    $('#pickFile').onchange = e => { up(e.target.files); e.target.value = ''; };
    A.dropTarget($('#pickDrop'), up);
    $('#pickGrid').onclick = e => { const t = e.target.closest('[data-u]'); if (!t) return; const u = t.dataset.u; sel = sel.includes(u) ? sel.filter(x => x !== u) : (multi ? sel.concat(u) : [u]); draw(false); };
    $('#pickGrid').onkeydown = e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset.u) { e.preventDefault(); e.target.click(); } };
    draw(true);
    return p.then(v => v === 'pick' ? sel.slice() : []);
  };

  /* ───────── unsaved changes ───────── */
  let dirty = null;   // { save: fn, discard: fn }
  A.setDirty = function (handlers) {
    dirty = handlers || null;
    $('#savebar').classList.toggle('on', !!dirty);
  };
  A.isDirty = () => !!dirty;
  $('#sbSave').onclick = async () => { if (!dirty) return; const b = $('#sbSave'); b.classList.add('busy'); try { await dirty.save(); } finally { b.classList.remove('busy'); } };
  $('#sbDiscard').onclick = () => { if (dirty && dirty.discard) dirty.discard(); A.setDirty(null); };
  window.addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

  /* ───────── router: #/products, #/products/<id>, #/orders/<id> … ───────── */
  const routes = {};
  A.route = (name, fn, title) => { routes[name] = { fn, title }; };
  A.go = href => { location.hash = href.replace(/^#?/, '#'); };
  let current = '', skipNext = false;
  async function render() {
    const parts = (location.hash.replace(/^#\/?/, '') || 'dashboard').split('?')[0].split('/');
    const name = routes[parts[0]] ? parts[0] : 'dashboard';
    const target = location.hash;
    if (skipNext) { skipNext = false; return; }
    if (dirty && current && current !== target) {
      const leave = await A.confirm('Leave without saving?', 'You have changes on this page that are not saved yet.', 'Leave page', true);
      if (!leave) { skipNext = true; location.hash = current; return; }
      A.setDirty(null);
    }
    current = target;
    $$('#nav a').forEach(a => a.classList.toggle('on', a.dataset.r === name));
    $('#side').classList.remove('on');
    A.closeDrawer();
    const v = $('#view'); v.className = 'view'; v.innerHTML = '<div class="card"><div class="card-b"><span class="skel" style="width:40%;margin-bottom:12px"></span><span class="skel" style="width:70%;margin-bottom:12px"></span><span class="skel" style="width:55%"></span></div></div>';
    document.title = (routes[name].title || 'Admin') + ' — Nansei admin';
    window.scrollTo(0, 0);
    try { await routes[name].fn(v, parts.slice(1), new URLSearchParams(location.hash.split('?')[1] || '')); }
    catch (e) { v.innerHTML = '<div class="card"><div class="empty"><b>This page could not load</b>' + esc(e.message) + '<br><button class="btn" type="button" onclick="location.reload()">Try again</button></div></div>'; }
  }
  A.refresh = render;
  window.addEventListener('hashchange', render);
  A.query = () => new URLSearchParams(location.hash.split('?')[1] || '');
  A.setQuery = obj => {   // keep filters in the address without re-rendering
    const q = A.query(); Object.keys(obj).forEach(k => { if (obj[k] == null || obj[k] === '' || obj[k] === 'all') q.delete(k); else q.set(k, obj[k]); });
    const base = location.hash.split('?')[0], s = q.toString(), next = base + (s ? '?' + s : '');
    current = next; history.replaceState(null, '', next);
  };

  /* ───────── page head ───────── */
  A.head = (title, sub, acts, back) => (back ? '<a class="back" href="' + back[0] + '">' + A.icon('left', 14) + esc(back[1]) + '</a>' : '') +
    '<div class="ph"><div class="ph-t"><h1>' + title + '</h1>' + (sub ? '<p>' + sub + '</p>' : '') + '</div><span class="sp"></span><div class="ph-acts">' + (acts || '') + '</div></div>';

  /* ───────── index table: tabs, search, sort, select, bulk, pages ─────────
     cfg: { el, rows(), cols:[{k,label,sort?,num?,cls?,html(r)}], key(r), onOpen(r), tabs:[[k,label,fn]], search(r,q), bulk:[[label,fn,danger]], perPage, empty, tools } */
  A.table = function (cfg) {
    const st = { tab: cfg.tab || (cfg.tabs ? cfg.tabs[0][0] : 'all'), q: cfg.q || '', sort: cfg.sort || null, dir: cfg.dir || 'asc', page: 1, sel: new Set() };
    const el = cfg.el;
    el.innerHTML = '<div class="card ix">' + (cfg.tabs ? '<div class="tabs" role="tablist"></div>' : '') +
      '<div class="ix-bar"><div class="search">' + A.icon('search', 15) + '<input class="in" type="search" placeholder="' + esc(cfg.placeholder || 'Search') + '" aria-label="Search" value="' + esc(st.q) + '"/></div>' + (cfg.tools || '') + '</div>' +
      '<div class="bulk" hidden></div><div class="tbl"><table><thead></thead><tbody></tbody></table></div><div class="pager"></div></div>';
    const tabsEl = $('.tabs', el), body = $('tbody', el), head = $('thead', el), bulkEl = $('.bulk', el), pager = $('.pager', el), si = $('.search input', el);
    const per = cfg.perPage || 50;
    function filtered() {
      let list = cfg.rows();
      if (cfg.tabs) { const t = cfg.tabs.find(x => x[0] === st.tab); if (t && t[2]) list = list.filter(t[2]); }
      const q = st.q.trim().toLowerCase(); if (q && cfg.search) list = list.filter(r => cfg.search(r, q));
      if (st.sort) { const c = cfg.cols.find(x => x.k === st.sort); const val = c.sort; list = list.slice().sort((a, b) => { const x = val(a), y = val(b); const r = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y)); return st.dir === 'asc' ? r : -r; }); }
      return list;
    }
    function drawTabs() {
      if (!tabsEl) return;
      const all = cfg.rows();
      tabsEl.innerHTML = cfg.tabs.map(([k, l, f]) => '<button type="button" role="tab" data-k="' + k + '" class="' + (k === st.tab ? 'on' : '') + '" aria-selected="' + (k === st.tab) + '">' + esc(l) + '<i>' + (f ? all.filter(f).length : all.length) + '</i></button>').join('');
    }
    function draw() {
      drawTabs();
      const list = filtered(), pages = Math.max(1, Math.ceil(list.length / per));
      if (st.page > pages) st.page = pages;
      const rows = list.slice((st.page - 1) * per, st.page * per);
      const keys = new Set(list.map(cfg.key)); [...st.sel].forEach(k => { if (!keys.has(k)) st.sel.delete(k); });
      const allOn = rows.length && rows.every(r => st.sel.has(cfg.key(r)));
      head.innerHTML = '<tr>' + (cfg.bulk ? '<th class="chk"><input type="checkbox" aria-label="Select all on this page" ' + (allOn ? 'checked' : '') + ' data-all/></th>' : '') +
        cfg.cols.map(c => '<th class="' + (c.num ? 'num ' : '') + (c.sort ? 'sort ' : '') + (c.cls || '') + '"' + (c.sort ? ' data-k="' + c.k + '"' + (st.sort === c.k ? ' data-dir="' + st.dir + '"' : '') + ' tabindex="0" aria-sort="' + (st.sort === c.k ? (st.dir === 'asc' ? 'ascending' : 'descending') : 'none') + '"' : '') + '>' + esc(c.label) + '</th>').join('') + '</tr>';
      body.innerHTML = rows.length ? rows.map(r => { const k = cfg.key(r); return '<tr class="' + (cfg.onOpen ? 'rowlink ' : '') + (st.sel.has(k) ? 'sel' : '') + '" data-key="' + esc(k) + '">' + (cfg.bulk ? '<td class="chk"><input type="checkbox" aria-label="Select" ' + (st.sel.has(k) ? 'checked' : '') + ' data-sel/></td>' : '') + cfg.cols.map(c => '<td class="' + (c.num ? 'num ' : '') + (c.cls || '') + '">' + c.html(r) + '</td>').join('') + '</tr>'; }).join('')
        : '<tr><td colspan="' + (cfg.cols.length + (cfg.bulk ? 1 : 0)) + '">' + (cfg.rows().length ? '<div class="empty"><b>Nothing matches</b>Try another tab or search.</div>' : (cfg.empty || '<div class="empty"><b>Nothing here yet</b></div>')) + '</td></tr>';
      pager.innerHTML = '<span>' + (list.length ? ((st.page - 1) * per + 1) + '–' + Math.min(list.length, st.page * per) + ' of ' + list.length : '0 results') + '</span>' + (pages > 1 ? '<div><button class="btn sm icon" type="button" data-pg="-1" aria-label="Previous page" ' + (st.page <= 1 ? 'disabled' : '') + '>' + A.icon('left') + '</button><span>Page ' + st.page + ' of ' + pages + '</span><button class="btn sm icon" type="button" data-pg="1" aria-label="Next page" ' + (st.page >= pages ? 'disabled' : '') + '>' + A.icon('right') + '</button></div>' : '');
      if (cfg.bulk) {
        bulkEl.hidden = !st.sel.size;
        bulkEl.innerHTML = '<b>' + st.sel.size + ' selected</b>' + cfg.bulk.map(([l, , d], i) => '<button class="btn' + (d ? ' red' : '') + '" type="button" data-b="' + i + '">' + esc(l) + '</button>').join('') + '<span style="flex:1"></span><button class="btn" type="button" data-clear>Clear</button>';
      }
      if (cfg.onDraw) cfg.onDraw(list);
    }
    if (tabsEl) tabsEl.onclick = e => { const b = e.target.closest('button[data-k]'); if (!b) return; st.tab = b.dataset.k; st.page = 1; st.sel.clear(); cfg.onState && cfg.onState(st); draw(); };
    si.addEventListener('input', A.debounce(() => { st.q = si.value; st.page = 1; cfg.onState && cfg.onState(st); draw(); }, 180));
    head.onclick = e => {
      if (e.target.matches('[data-all]')) { const list = filtered().slice((st.page - 1) * per, st.page * per); list.forEach(r => e.target.checked ? st.sel.add(cfg.key(r)) : st.sel.delete(cfg.key(r))); draw(); return; }
      const th = e.target.closest('th[data-k]'); if (!th) return;
      if (st.sort === th.dataset.k) st.dir = st.dir === 'asc' ? 'desc' : 'asc'; else { st.sort = th.dataset.k; st.dir = 'asc'; }
      draw();
    };
    head.onkeydown = e => { if (e.key === 'Enter' && e.target.matches('th[data-k]')) e.target.click(); };
    body.onclick = e => {
      const tr = e.target.closest('tr[data-key]'); if (!tr) return;
      if (e.target.matches('[data-sel]')) { const k = tr.dataset.key; e.target.checked ? st.sel.add(k) : st.sel.delete(k); draw(); return; }
      if (e.target.closest('td.chk')) return;
      if (e.target.closest('a,button,input,select,label,textarea')) return;
      const r = cfg.rows().find(x => String(cfg.key(x)) === tr.dataset.key);
      if (r && cfg.onOpen) cfg.onOpen(r, e);
    };
    pager.onclick = e => { const b = e.target.closest('[data-pg]'); if (!b) return; st.page += Number(b.dataset.pg); draw(); el.scrollIntoView({ block: 'start' }); };
    bulkEl.onclick = async e => {
      if (e.target.closest('[data-clear]')) { st.sel.clear(); draw(); return; }
      const b = e.target.closest('[data-b]'); if (!b) return;
      const picked = cfg.rows().filter(r => st.sel.has(String(cfg.key(r))));
      const done = await cfg.bulk[Number(b.dataset.b)][1](picked);
      if (done !== false) { st.sel.clear(); draw(); }
    };
    draw();
    return { draw, state: st, filtered };
  };

  /** run one async step per item, with a progress toast at the end */
  A.each = async function (items, fn, verb) {
    let ok = 0, bad = 0;
    for (const it of items) { try { await fn(it); ok++; } catch (e) { bad++; if (bad === 1) A.toast(e.message, true); } }
    A.toast((verb || 'Done') + ': ' + ok + (bad ? ', ' + bad + ' could not be changed' : ''), !!bad && !ok);
    return ok;
  };

  /* ───────── CSV download ───────── */
  A.csv = function (name, header, rows) {
    const cell = v => { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    const text = '﻿' + [header].concat(rows).map(r => r.map(cell).join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    a.download = name + '-' + new Date().toISOString().slice(0, 10) + '.csv'; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };

  /* ───────── bar chart (SVG) ───────── */
  A.barChart = function (el, data, fmt) {   // data: [{label, value, sub, prev?}] — prev is drawn as a line (the period before)
    const W = 600, H = 210, pad = 26, hasPrev = data.some(d => d.prev != null), max = Math.max(1, ...data.map(d => Math.max(d.value, d.prev || 0)));
    const step = (W - pad) / data.length, bw = Math.min(34, step * 0.62);
    const nice = v => { const p = Math.pow(10, Math.floor(Math.log10(v || 1))); return Math.ceil(v / p) * p; };
    const top = nice(max);
    let s = '<svg viewBox="0 0 ' + W + ' ' + (H + 24) + '" preserveAspectRatio="none" role="img" aria-label="Chart">';
    [0, .5, 1].forEach(f => { const y = H - f * (H - 10); s += '<line x1="' + pad + '" x2="' + W + '" y1="' + y + '" y2="' + y + '" stroke="#ece6d9" stroke-dasharray="' + (f ? '3 4' : '') + '"/><text x="' + (pad - 6) + '" y="' + (y + 4) + '" font-size="10" fill="#9aab9f" text-anchor="end" font-family="Quicksand" font-weight="600">' + (f ? (fmt ? fmt(top * f, true) : top * f) : '0') + '</text>'; });
    data.forEach((d, i) => {
      const h = Math.max(d.value ? 3 : 1, (d.value / top) * (H - 10)), x = pad + i * step + (step - bw) / 2, y = H - h;
      s += '<rect x="' + x + '" y="' + y + '" width="' + bw + '" height="' + h + '" rx="4" fill="' + (hasPrev || i !== data.length - 1 ? '#2d5a3d' : '#c9a84c') + '" data-i="' + i + '"><title>' + esc((d.sub || d.label) + ': ' + (fmt ? fmt(d.value) : d.value)) + '</title></rect>';
      s += '<text x="' + (x + bw / 2) + '" y="' + (H + 16) + '" font-size="10.5" fill="#6c8273" text-anchor="middle" font-family="Quicksand" font-weight="600">' + esc(d.label) + '</text>';
    });
    if (hasPrev) { const pts = data.map((d, i) => (pad + i * step + step / 2).toFixed(1) + ',' + (H - ((d.prev || 0) / top) * (H - 10)).toFixed(1)); s += '<polyline points="' + pts.join(' ') + '" fill="none" stroke="#c9a84c" stroke-width="2" stroke-dasharray="4 3" stroke-linejoin="round" pointer-events="none"/>'; }
    s += '</svg><div class="tip"></div>';
    el.innerHTML = s;
    const tip = $('.tip', el), svg = $('svg', el);
    svg.addEventListener('mousemove', e => {
      const r = e.target.closest('rect[data-i]'); if (!r) { tip.style.opacity = 0; return; }
      const d = data[Number(r.dataset.i)], b = r.getBoundingClientRect(), o = el.getBoundingClientRect();
      tip.innerHTML = esc(d.sub || d.label) + ' · <b>' + esc(fmt ? fmt(d.value) : d.value) + '</b>' + (d.prev != null ? '<br><span style="opacity:.8">Period before: ' + esc(fmt ? fmt(d.prev) : d.prev) + '</span>' : '');
      tip.style.left = (b.left - o.left + b.width / 2) + 'px'; tip.style.top = (b.top - o.top) + 'px'; tip.style.opacity = 1;
    });
    svg.addEventListener('mouseleave', () => { tip.style.opacity = 0; });
  };
  A.spark = function (values) {
    const max = Math.max(1, ...values), W = 84, H = 30;
    const pts = values.map((v, i) => (i * W / Math.max(1, values.length - 1)).toFixed(1) + ',' + (H - 2 - v / max * (H - 4)).toFixed(1)).join(' ');
    return '<svg class="spark" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true"><polyline points="' + pts + '" fill="none" stroke="#c9a84c" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>';
  };

  /* ───────── search palette (Ctrl K) ───────── */
  const PAGES = [['Home', '#/', 'home'], ['Orders', '#/orders', 'bag'], ['Products', '#/products', 'box'], ['Add a product', '#/products/new', 'plus'], ['Stock', '#/inventory', 'stock'], ['Customers', '#/customers', 'users'], ['Coupons', '#/coupons', 'tag'], ['Reviews', '#/reviews', 'star'], ['Home page content', '#/homepage', 'home'], ['Blogs', '#/blogs', 'book'], ['Write a blog article', '#/blogs/new', 'edit'], ['News', '#/news', 'book'], ['Add a news update', '#/news/new', 'edit'], ['Store settings', '#/settings', 'gear'], ['Delivery and payment settings', '#/settings?s=delivery', 'truck'], ['Legal details (GSTIN, FSSAI)', '#/settings?s=legal', 'gear']];
  let palItems = [], palOn = 0;
  async function palDraw() {
    const q = $('#palIn').value.trim().toLowerCase();
    const out = [];
    const pages = PAGES.filter(p => !q || p[0].toLowerCase().includes(q));
    if (pages.length) out.push(['Go to', pages.slice(0, q ? 6 : 8).map(p => ({ label: p[0], href: p[1], icon: p[2] }))]);
    if (q) {
      let prods = []; try { prods = await A.load('products'); } catch (e) { /* offline */ }
      const pm = prods.filter(p => String(p.name).toLowerCase().includes(q) || (p.sizes || []).some(z => String(z.sku || '').toLowerCase() === q)).slice(0, 6);
      if (pm.length) out.push(['Products', pm.map(p => ({ label: p.name, href: '#/products/' + p._id, img: A.firstImg(p), meta: p.isActive === false ? 'Hidden' : '' }))]);
      if (/^[a-z]{0,3}-?\d{2,}/i.test(q)) out.push(['Orders', [{ label: 'Find order “' + $('#palIn').value.trim() + '”', href: '#/orders?q=' + encodeURIComponent($('#palIn').value.trim()), icon: 'bag' }]]);
      let custs = []; try { custs = await A.load('customers'); } catch (e) { /* not loaded */ }
      const cm = custs.filter(c => [c.name, c.email, c.phone].some(x => String(x || '').toLowerCase().includes(q))).slice(0, 4);
      if (cm.length) out.push(['Customers', cm.map(c => ({ label: c.name || c.email, href: '#/customers/' + c._id, icon: 'users', meta: c.email }))]);
    }
    palItems = out.flatMap(g => g[1]); palOn = Math.min(palOn, Math.max(0, palItems.length - 1));
    let n = 0;
    $('#palList').innerHTML = out.length ? out.map(([g, items]) => '<div class="pal-g">' + esc(g) + '</div>' + items.map(it => { const i = n++; return '<div class="pal-i' + (i === palOn ? ' on' : '') + '" role="option" data-i="' + i + '">' + (it.img ? '<img src="' + esc(it.img) + '" alt=""/>' : '<span class="ic">' + A.icon(it.icon) + '</span>') + '<span>' + esc(it.label) + '</span>' + (it.meta ? '<small>' + esc(it.meta) + '</small>' : '') + '</div>'; }).join('')).join('')
      : '<div class="empty" style="padding:28px">Nothing found for “' + esc(q) + '”</div>';
  }
  A.openPalette = () => { $('#pal').classList.add('on'); $('#palIn').value = ''; palOn = 0; palDraw(); setTimeout(() => $('#palIn').focus(), 20); };
  const palClose = () => $('#pal').classList.remove('on');
  const palGo = i => { const it = palItems[i]; if (!it) return; palClose(); A.go(it.href); };
  $('#palIn').addEventListener('input', A.debounce(() => { palOn = 0; palDraw(); }, 120));
  $('#palIn').addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); palOn = (palOn + (e.key === 'ArrowDown' ? 1 : -1) + palItems.length) % Math.max(1, palItems.length); $$('#palList .pal-i').forEach((x, i) => x.classList.toggle('on', i === palOn)); const on = $('#palList .pal-i.on'); on && on.scrollIntoView({ block: 'nearest' }); }
    if (e.key === 'Enter') { e.preventDefault(); palGo(palOn); }
  });
  $('#palList').addEventListener('click', e => { const it = e.target.closest('[data-i]'); if (it) palGo(Number(it.dataset.i)); });
  $('#pal').addEventListener('click', e => { if (e.target.closest('[data-close]')) palClose(); });
  $('#searchBtn').onclick = A.openPalette;

  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); $('#pal').classList.contains('on') ? palClose() : A.openPalette(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && dirty) { e.preventDefault(); $('#sbSave').click(); return; }
    if (e.key !== 'Escape') return;
    if ($('#pal').classList.contains('on')) palClose();
    else if ($('#modal').classList.contains('on')) A.closeModal(false);
    else if (A.drawerOpen()) A.closeDrawer();
    else closeMenus();
  });

  /* ───────── keyboard: focus stays inside an open dialog; shortcuts ───────── */
  document.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const box = $('#pal').classList.contains('on') ? $('#pal .pal-c') : $('#modal').classList.contains('on') ? $('#mdBox') : A.drawerOpen() ? $('#drawer') : null;
    if (!box) return;
    const f = $$('a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select,textarea,[tabindex]:not([tabindex="-1"]),[contenteditable=true]', box).filter(x => x.offsetParent !== null);
    if (!f.length) return;
    if (!box.contains(document.activeElement)) { e.preventDefault(); f[0].focus(); return; }
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  });
  const KEYS = [['g h', 'Home', '#/'], ['g o', 'Orders', '#/orders'], ['g p', 'Products', '#/products'], ['g s', 'Stock', '#/inventory'], ['g c', 'Customers', '#/customers'], ['g b', 'Blogs', '#/blogs'], ['g n', 'News', '#/news'], ['g k', 'Coupons', '#/coupons'], ['g ,', 'Settings', '#/settings']];
  A.shortcuts = () => A.modal('Keyboard shortcuts', '<div class="kv" style="grid-template-columns:120px 1fr">' +
    [['Ctrl K', 'Search everything'], ['/', 'Search in the list on this page'], ['Ctrl S', 'Save changes'], ['Esc', 'Close a panel or dialog'], ['?', 'Show this list']].concat(KEYS.map(k => [k[0], 'Go to ' + k[1]])).map(([k, d]) => '<dt>' + k.split(' ').map(x => '<kbd>' + esc(x) + '</kbd>').join(' then ') + '</dt><dd>' + esc(d) + '</dd>').join('') + '</div>',
    '<button class="btn pri" type="button" data-v="1">Done</button>');
  let gWait = 0;
  document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target, typing = t.closest && t.closest('input,textarea,select,[contenteditable=true]');
    if (typing || $('#modal').classList.contains('on') || $('#pal').classList.contains('on')) return;
    if (e.key === '?') { e.preventDefault(); A.shortcuts(); return; }
    if (e.key === '/') { const si = $('#view .search input'); if (si) { e.preventDefault(); si.focus(); } return; }
    if (e.key === 'g') { gWait = Date.now(); return; }
    if (gWait && Date.now() - gWait < 1200) { gWait = 0; const k = KEYS.find(x => x[0] === 'g ' + e.key.toLowerCase()); if (k) { e.preventDefault(); A.go(k[2]); } }
  });

  /* ───────── shell bits ───────── */
  $('#ham').onclick = () => $('#side').classList.toggle('on');
  const menus = [['#meBtn', '#meMenu'], ['#newBtn', '#newMenu']];
  const closeMenus = except => menus.forEach(([b, m]) => { if (m === except) return; $(m).hidden = true; $(b).setAttribute('aria-expanded', 'false'); });
  menus.forEach(([b, m]) => { $(b).onclick = e => { e.stopPropagation(); const open = $(m).hidden; closeMenus(m); $(m).hidden = !open; $(b).setAttribute('aria-expanded', String(open)); }; $(m).addEventListener('click', e => { if (e.target.closest('a,button')) closeMenus(); }); });
  document.addEventListener('click', e => { if (!e.target.closest('.menu')) closeMenus(); if (!e.target.closest('#side,#ham') && $('#side').classList.contains('on')) $('#side').classList.remove('on'); });
  /* the menu can shrink to icons; remembered in this browser */
  const mini = on => { $('#app').classList.toggle('mini', on); $('#fold').setAttribute('aria-label', on ? 'Expand the menu' : 'Collapse the menu'); $('#fold').title = $('#fold').getAttribute('aria-label'); try { localStorage.setItem('adm_mini', on ? '1' : ''); } catch (e) { /* private mode */ } };
  $('#fold').onclick = () => mini(!$('#app').classList.contains('mini'));
  try { if (localStorage.getItem('adm_mini') === '1' && innerWidth > 860) mini(true); } catch (e) { /* private mode */ }
  $('#signOut').onclick = () => A.signOut();

  /* ───────── start: only admins get in ───────── */
  A.start = async function () {
    if (!A.token()) { location.replace('admin-login.html'); return; }
    try {
      const me = await A.api('GET', '/auth/me');
      const u = me.user || me.data;
      if (!u || u.role !== 'admin') { await A.modal('No admin access', '<p>This account is not an admin account. Sign in with the store’s admin account.</p>', '<button class="btn pri" type="button" data-v="1">Sign in again</button>'); A.signOut(); return; }
      A.me = u;
      const name = u.name || ((u.firstName || '') + ' ' + (u.lastName || '')).trim() || 'Admin';
      $('#meName').textContent = name; $('#meName2').textContent = name; $('#meEmail').textContent = u.email || '';
      $('#meAv').textContent = name.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
      $('#gate').remove(); $('#app').hidden = false;
      render();
    } catch (e) {
      $('#gate').innerHTML = '<div style="text-align:center;max-width:360px"><p style="margin-bottom:14px;color:var(--ink)">' + esc(e.message) + '</p><button class="btn pri" type="button" onclick="location.reload()">Try again</button> <button class="btn" type="button" onclick="A.signOut()">Sign in again</button></div>';
    }
  };
})();
