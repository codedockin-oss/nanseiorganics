/* ==========================================================================
   Nansei Organics — motion: preloader, split headings, scroll reveals, counters,
   marquee, magnetic buttons, in-page anchors. Progressive: everything is visible
   without it (and when the visitor prefers reduced motion).
   ========================================================================== */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  var N = window.NANSEI = window.NANSEI || {};
  var reduced = N.reduced = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  N.fine = !!(window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches);
  var $$ = function (s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var vh = innerHeight, vw = innerWidth;

  /* ---------- ready gate (preloader) ---------- */
  var readyFns = [], isReady = false;
  N.onReady = function (fn) { isReady ? fn() : readyFns.push(fn); };
  function setReady() { if (isReady) return; isReady = true; readyFns.forEach(function (f) { f(); }); readyFns = []; }

  /* The opening screen is js/farm-loader.js (paddy shoots growing); reveals wait for it to finish. */
  function preloader() {
    if (window.NanseiLoader) window.NanseiLoader.onDone(setReady); else setReady();
  }

  /* ---------- split headings into words (each word slides up) ---------- */
  function splitEl(el) {
    if (el.classList.contains('is-split')) return;
    var wi = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (k) {
        if (k.nodeType === 3) {
          var frag = doc.createDocumentFragment();
          k.textContent.split(/(\s+)/).forEach(function (w) {
            if (!w) return;
            if (/^\s+$/.test(w)) { frag.appendChild(doc.createTextNode(' ')); return; }
            var o = doc.createElement('span'); o.className = 'split-w';
            var i = doc.createElement('span'); i.textContent = w; i.style.setProperty('--wi', wi++);
            o.appendChild(i); frag.appendChild(o);
          });
          node.replaceChild(frag, k);
        } else if (k.nodeType === 1 && k.tagName !== 'BR') {
          if (k.hasAttribute('data-nosplit') || k.tagName === 'IMG' || k.tagName === 'N-ICON') {
            var o2 = doc.createElement('span'); o2.className = 'split-w';
            var i2 = doc.createElement('span'); i2.style.setProperty('--wi', wi++);
            node.replaceChild(o2, k); i2.appendChild(k); o2.appendChild(i2);
          } else walk(k);
        }
      });
    })(el);
    el.classList.add('is-split');
  }

  /* ---------- reveal observer ---------- */
  var io = null, proxy = typeof Map !== 'undefined' ? new Map() : null, pending = [], sweepT = null;
  function show(el) { if (el.classList.contains('is-in')) return; if (el.hasAttribute('data-count')) countUp(el); el.classList.add('is-in'); }
  // safety net: anything already scrolled past (e.g. after a fast jump) is revealed too
  function sweep() {
    pending = pending.filter(function (el) {
      if (el.classList.contains('is-in')) return false;
      var r = (el._obs || el).getBoundingClientRect();
      if (r.top < vh * .92 && (r.width || r.height)) { show(el); return false; }
      return true;
    });
    if (!pending.length) { clearInterval(sweepT); sweepT = null; }
  }
  function initReveals(scope) {
    $$('[data-split]', scope).forEach(splitEl);
    $$('[data-stagger]', scope).forEach(function (p) { Array.prototype.forEach.call(p.children, function (c, i) { c.style.setProperty('--si', i); }); });
    var targets = $$('[data-reveal],[data-split],[data-stagger],[data-count]', scope).filter(function (el) { return !el.classList.contains('is-in'); });
    if (reduced || !('IntersectionObserver' in window) || !proxy) { targets.forEach(function (el) { el.classList.add('is-in'); if (el.hasAttribute('data-count')) countUp(el, true); }); return; }
    if (!io) io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target, list = proxy.get(el);
        if (list) { list.forEach(show); proxy.delete(el); }
        if (el._self) show(el);
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    targets.forEach(function (el) {
      if (/^clip/.test(el.getAttribute('data-reveal') || '') && el.parentElement) {   // clipped elements never "intersect", so watch the parent
        var p = el.parentElement, l = proxy.get(p) || [];
        l.push(el); proxy.set(p, l); io.observe(p); el._obs = p;
      } else { el._self = true; io.observe(el); }
      pending.push(el);
    });
    if (!sweepT) sweepT = setInterval(sweep, 450);
  }
  N.reveal = initReveals;

  /* ---------- counters ---------- */
  function countUp(el, instant) {
    if (el._counted) return; el._counted = true;
    var to = parseFloat(el.getAttribute('data-count')), dec = (String(to).split('.')[1] || '').length;
    var pre = el.getAttribute('data-prefix') || '', suf = el.getAttribute('data-suffix') || '';
    var fmt = function (v) { return pre + (dec ? v.toFixed(dec) : Math.round(v).toLocaleString('en-IN')) + suf; };
    if (instant || reduced) { el.textContent = fmt(to); return; }
    var s = performance.now(), d = 1800;
    (function t(now) { var p = clamp((now - s) / d, 0, 1), e = 1 - Math.pow(2, -10 * p); el.textContent = fmt(to * (p === 1 ? 1 : e)); if (p < 1) requestAnimationFrame(t); })(s);
  }

  /* ---------- marquee ---------- */
  var marquees = [];
  function Marquee(el) {
    var track = el.querySelector('.marquee__track'), group = track && track.querySelector('.marquee__group');
    if (!track || !group) return null;
    while (track.scrollWidth < vw * 2.2 && track.children.length < 12) track.appendChild(group.cloneNode(true));
    Array.prototype.forEach.call(track.children, function (g, i) { if (i) g.setAttribute('aria-hidden', 'true'); });
    el.classList.add('is-js');
    var x = 0, speed = parseFloat(el.getAttribute('data-speed') || '55'), last = performance.now(), gw = group.getBoundingClientRect().width, hover = false;
    el.addEventListener('mouseenter', function () { hover = true; }); el.addEventListener('mouseleave', function () { hover = false; });
    return {
      step: function () {
        var now = performance.now(), dt = Math.min(.05, (now - last) / 1000); last = now;
        if (reduced) return;
        x -= speed * dt * (hover ? .25 : 1);
        if (x <= -gw) x += gw;
        track.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0)';
      },
      resize: function () { gw = group.getBoundingClientRect().width; }
    };
  }
  function loop() { for (var i = 0; i < marquees.length; i++) marquees[i].step(); if (marquees.length) requestAnimationFrame(loop); }

  /* ---------- magnetic buttons ---------- */
  function magnetic() {
    if (!N.fine || reduced) return;
    $$('[data-magnetic]').forEach(function (el) {
      var s = parseFloat(el.getAttribute('data-magnetic')) || .3;
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect(), x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
        el.style.transition = 'transform .25s var(--ease)';
        el.style.transform = 'translate(' + (x * s).toFixed(1) + 'px,' + (y * s * 1.2).toFixed(1) + 'px)';
      });
      el.addEventListener('pointerleave', function () { el.style.transition = 'transform .9s var(--ease-back)'; el.style.transform = ''; });
    });
  }

  /* ---------- in-page anchors: scroll with the sticky header's height as offset ---------- */
  N.scrollTo = function (target, offset) {
    var el = typeof target === 'string' ? doc.querySelector(target) : target;
    if (!el) return;
    var off = offset == null ? -((parseInt(getComputedStyle(root).getPropertyValue('--ns-header-h'), 10) || 80) + 16) : offset;
    window.scrollTo({ top: el.getBoundingClientRect().top + scrollY + off, behavior: reduced ? 'auto' : 'smooth' });
  };
  function anchors() {
    doc.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a || a.getAttribute('href').length < 2) return;
      var el = null; try { el = doc.querySelector(a.getAttribute('href')); } catch (x) {}
      if (!el) return;
      e.preventDefault();
      N.scrollTo(el);
      history.replaceState(null, '', a.getAttribute('href'));
    });
  }

  /* ---------- accordion (FAQ etc.): one open at a time unless the list has data-multi ---------- */
  function accordion() {
    doc.addEventListener('click', function (e) {
      var q = e.target.closest && e.target.closest('.acc__q'); if (!q) return;
      var item = q.parentNode, acc = item.parentNode, open = !item.classList.contains('is-open');
      if (!acc.hasAttribute('data-multi')) $$('.acc__i.is-open', acc).forEach(function (o) {
        if (o !== item) { o.classList.remove('is-open'); var b = o.querySelector('.acc__q'); if (b) b.setAttribute('aria-expanded', 'false'); }
      });
      item.classList.toggle('is-open', open); q.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  /* ---------- boot ---------- */
  var booted = false;
  function boot() {
    if (booted) return; booted = true;
    $$('[data-marquee]').forEach(function (el) { var m = Marquee(el); if (m) marquees.push(m); });
    if (marquees.length) requestAnimationFrame(loop);
    magnetic();
    anchors();
    accordion();
    N.onReady(function () { initReveals(doc); root.classList.add('is-ready'); });
    preloader();
    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { var w = innerWidth; vh = innerHeight; if (w !== vw) { vw = w; marquees.forEach(function (m) { m.resize(); }); } }, 150);
    });
  }
  N.refreshMotion = function () { initReveals(doc); };
  // wait for DOMContentLoaded so page scripts have rendered first
  doc.addEventListener('DOMContentLoaded', boot);
  window.addEventListener('load', boot);
  if (doc.readyState === 'interactive' || doc.readyState === 'complete') boot();
})();
