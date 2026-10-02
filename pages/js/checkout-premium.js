/**
 * Checkout + My Orders — premium behaviour (scroll reveals, orders hero stats, nav polish).
 * Pure progressive enhancement: if this file fails to load the page works exactly as before.
 */
(function () {
  'use strict';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- scroll reveal ---------------- */
  // page-wide but subtle: headings, field groups, cards, summary blocks, order cards
  // scroll reveals are for the My Orders view only - checkout stays still
  var ITEM = '.order-card';
  var SKIP = '#ordersList,.modal-box,#successOverlay,#processingOverlay';
  var REVEAL = [ITEM, '#ordersEmpty', '.ck-ord-hero', '.ck-stat'].join(',');

  var io = ('IntersectionObserver' in window) ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var el = e.target;
      io.unobserve(el);
      el.classList.add('ck-in');
      setTimeout(function () { el.classList.add('ck-done'); }, 1200);
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }) : null;

  function prepare(root) {
    if (reduce || !io) return;
    var nodes = (root.matches && root.matches(REVEAL) ? [root] : []).concat([].slice.call(root.querySelectorAll ? root.querySelectorAll(REVEAL) : []));
    var perParent = new Map();
    nodes.forEach(function (el) {
      if (el.__ckRv || !el.closest('#ordersPage') || el.closest('.modal-box')) return;
      if (el.matches(SKIP)) return;                                             // containers: their children animate instead
      if (!el.matches(ITEM) && el.querySelector(ITEM)) return;
      if (el.style.display === 'none' && !el.matches(ITEM)) { /* hidden steps still get observed; they reveal when shown */ }
      el.__ckRv = true;
      var n = perParent.get(el.parentNode) || 0;
      perParent.set(el.parentNode, n + 1);
      el.style.setProperty('--ck-d', Math.min(n, 5) * 0.05 + 's');
      el.classList.add('ck-rv');
      io.observe(el);
    });
  }

  function watch() {
    prepare(document.body);
    if (!('MutationObserver' in window) || reduce) return;
    var queued = false, pending = [];
    new MutationObserver(function (muts) {
      muts.forEach(function (m) { [].forEach.call(m.addedNodes, function (n) { if (n.nodeType === 1) pending.push(n); }); });
      if (queued || !pending.length) return;
      queued = true;
      requestAnimationFrame(function () {
        var list = pending; pending = []; queued = false;
        list.forEach(prepare);
        countStats();
      });
    }).observe(document.body, { childList: true, subtree: true });

    // safety net: never leave something invisible if the observer misses it
    setTimeout(function () {
      [].forEach.call(document.querySelectorAll('.ck-rv:not(.ck-in)'), function (el) {
        var r = el.getBoundingClientRect();
        if (r.width && r.top < window.innerHeight && r.bottom > 0) el.classList.add('ck-in');
      });
    }, 3500);
  }

  /* ---------------- nav polish ---------------- */
  function navPolish() {
    var nav = document.querySelector('body > nav');
    var ordersPage = document.getElementById('ordersPage');
    var btn = document.getElementById('navOrders');
    function upd() {
      if (nav) nav.classList.toggle('ck-scrolled', window.scrollY > 6);
    }
    window.addEventListener('scroll', upd, { passive: true });
    upd();
    if (ordersPage && btn && 'MutationObserver' in window) {
      var sync = function () { btn.classList.toggle('is-on', ordersPage.classList.contains('active')); };
      new MutationObserver(sync).observe(ordersPage, { attributes: true, attributeFilter: ['class'] });
      sync();
    }
  }

  /* ---------------- My Orders hero + live stats ---------------- */
  var statEls = null;
  function buildHero() {
    var page = document.getElementById('ordersPage');
    if (!page) return;
    var head = page.querySelector('#orderCountLabel');
    head = head && head.closest('div[style*="margin-bottom:40px"]');
    if (!head || head.classList.contains('ck-ord-hero')) return;
    head.classList.add('ck-ord-hero');
    var title = head.querySelector('h1');
    if (title) {
      var holder = title.parentNode;
      var eb = document.createElement('div');
      eb.className = 'ck-eyebrow';
      eb.textContent = 'Your purchases';
      holder.insertBefore(eb, title);
    }
    var stats = document.createElement('div');
    stats.className = 'ck-stats';
    stats.innerHTML =
      '<div class="ck-stat"><b data-ck-stat="all">0</b><span>Orders</span></div>' +
      '<div class="ck-stat"><b data-ck-stat="transit">0</b><span>In progress</span></div>' +
      '<div class="ck-stat"><b data-ck-stat="delivered">0</b><span>Delivered</span></div>';
    head.appendChild(stats);
    var tok = localStorage.getItem('nansai_token') || sessionStorage.getItem('nansai_token');
    if (tok) {
      var u = null; try { u = JSON.parse(localStorage.getItem('nansai_user') || 'null'); } catch (e) {}
      var who = document.createElement('div');
      who.className = 'ck-who';
      var first = ((u && (u.name || u.firstName)) || 'there').split(' ')[0];
      who.innerHTML = '<span></span><button type="button">Sign out</button>';
      who.firstChild.textContent = 'Hi, ' + first;
      who.lastChild.addEventListener('click', function () { if (window.Auth && Auth.logout) Auth.logout('login.html'); else { localStorage.removeItem('nansai_token'); localStorage.removeItem('nansai_user'); location.href = 'login.html'; } });
      head.appendChild(who);
    }
    statEls = {
      all: stats.querySelector('[data-ck-stat="all"]'),
      transit: stats.querySelector('[data-ck-stat="transit"]'),
      delivered: stats.querySelector('[data-ck-stat="delivered"]')
    };
  }

  function animateTo(el, target) {
    if (!el) return;
    var from = Number(el.textContent) || 0;
    if (from === target) return;
    if (reduce) { el.textContent = target; return; }
    var t0 = performance.now(), dur = 900;
    (function step(now) {
      var p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(from + (target - from) * e);
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }

  function countStats() {
    if (!statEls) return;
    var cards = document.querySelectorAll('#ordersList .order-card');
    var delivered = document.querySelectorAll('#ordersList .order-card .sb-delivered').length;
    var transit = document.querySelectorAll('#ordersList .order-card .sb-shipped, #ordersList .order-card .sb-processing').length;
    animateTo(statEls.all, cards.length);
    animateTo(statEls.transit, transit);
    animateTo(statEls.delivered, delivered);
  }

  function init() {
    buildHero();
    navPolish();
    watch();
    countStats();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
