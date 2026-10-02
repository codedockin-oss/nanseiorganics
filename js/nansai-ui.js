/**
 * NANSAI ORGANICS — shared UI behaviour (loaded on every page, no dependencies).
 *  - never lets a blocked/unsupported video autoplay surface as an unhandled rejection
 *  - scroll-progress bar, back-to-top button, header shadow on scroll
 *  - soft image fade-in + graceful fallback when an image fails to load
 *  - behaviour for the shared header (mobile drawer, live cart / wishlist counts, account label)
 *  - keeps the copyright year current
 */
(function () {
  'use strict';

  /* ---- media.play() returns a promise that rejects when autoplay is blocked / source unsupported.
          None of these are actionable for the visitor, so swallow them in one place. ---- */
  try {
    var nativePlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      var p = nativePlay.apply(this, arguments);
      if (p && typeof p.catch === 'function') p.catch(function () {});
      return p;
    };
  } catch (e) { /* very old browser: nothing to do */ }

  var FALLBACK_IMG =
    'data:image/svg+xml;utf8,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none">' +
      '<rect width="120" height="120" rx="14" fill="#f0f7f2"/>' +
      '<path d="M34 86C34 86 44 40 88 34C88 34 84 74 34 86Z" fill="#4a8c5c" fill-opacity=".55"/>' +
      '<path d="M34 86C46 66 60 52 80 42" stroke="#1a3a2a" stroke-opacity=".35" stroke-width="2" stroke-linecap="round"/></svg>');

  function ready(fn) {
    if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn);
  }

  function readJSON(key, fallback) {
    try { var v = JSON.parse(localStorage.getItem(key) || 'null'); return v == null ? fallback : v; } catch (e) { return fallback; }
  }

  /* ---------------- images ---------------- */
  function handleImage(img) {
    if (img.__nsBound || img.classList.contains('ns-skip')) return;
    img.__nsBound = true;
    if (!img.hasAttribute('decoding')) img.decoding = 'async';
    if (!img.hasAttribute('alt')) img.setAttribute('alt', '');            // decorative unless the page says otherwise
    var fail = function () {
      if (img.classList.contains('ns-failed')) return;
      img.classList.add('ns-failed');
      img.removeAttribute('srcset');
      img.src = FALLBACK_IMG;
    };
    img.addEventListener('error', fail);
    if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) { fail(); return; }
    if (!(img.complete && img.naturalWidth > 0)) {
      img.classList.add('ns-shimmer');
      img.addEventListener('load', function () { img.classList.add('ns-ready'); }, { once: true });
    }
  }
  function watchImages() {
    Array.prototype.forEach.call(document.images, handleImage);
    if (!('MutationObserver' in window)) return;
    new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        Array.prototype.forEach.call(m.addedNodes, function (n) {
          if (n.nodeType !== 1) return;
          if (n.tagName === 'IMG') handleImage(n);
          else if (n.querySelectorAll) Array.prototype.forEach.call(n.querySelectorAll('img'), handleImage);
        });
      });
    }).observe(document.body, { childList: true, subtree: true });
  }

  /* ---------------- progress bar + back to top + header shadow ---------------- */
  function chrome() {
    var bar = document.createElement('div');
    bar.id = 'nsProgress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);

    var top = document.createElement('button');
    top.id = 'nsToTop';
    top.type = 'button';
    top.setAttribute('aria-label', 'Back to top');
    top.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
    top.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    });
    document.body.appendChild(top);

    var headers = document.querySelectorAll('.ns-header, .site-nav');
    var ticking = false;
    function update() {
      ticking = false;
      var y = window.pageYOffset || document.documentElement.scrollTop || 0;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0) + ')';
      top.classList.toggle('show', y > 700);
      Array.prototype.forEach.call(headers, function (h) { h.classList.toggle('is-scrolled', y > 8); });
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ---------------- announcement bar + WhatsApp button (content comes from js/store-config.js) ---------------- */
  function announce() {
    var C = window.NANSEI_CONFIG;
    if (!C || document.querySelector('.announce') || document.documentElement.hasAttribute('data-ns-minimal')) return;
    var ic = window.nanseiIcon || function () { return ''; };
    var bar = document.createElement('div');
    bar.className = 'announce'; bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Store announcements');
    var left = C.hasPhone()
      ? '<a href="' + C.wa('Hello ' + C.BRAND) + '" target="_blank" rel="noopener">' + ic('whatsapp') + '<span>Need help? <b>' + C.PHONE + '</b></span></a>'
      : '<a href="' + C.mail() + '">' + ic('mail') + '<span>' + C.EMAIL + '</span></a>';
    var msgs = [ic('truck') + '<span>' + C.freeShipText().replace(/(\u20B9\d+)/, '<b>$1</b>') + '</span>',
                ic('returns') + '<span><b>' + C.RETURN_DAYS + '-day</b> easy returns &amp; replacements</span>',
                ic('leaf') + '<span>Farm direct &middot; <b>certified organic</b></span>'];
    bar.innerHTML = '<div class="announce__in"><div class="announce__l">' + left + '</div>' +
      '<div class="announce__c" aria-live="polite">' + msgs.map(function (m, i) { return '<span' + (i ? '' : ' class="is-on"') + '>' + m + '</span>'; }).join('') + '</div>' +
      '<div class="announce__r"><a href="track-order.html">Track order</a><a href="faq.html">Help</a><a href="contact.html">Contact</a></div></div>';
    document.body.insertBefore(bar, document.body.firstChild);
    var spans = bar.querySelectorAll('.announce__c > span'), k = 0;
    if (spans.length > 1 && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      setInterval(function () { spans[k].classList.remove('is-on'); k = (k + 1) % spans.length; spans[k].classList.add('is-on'); }, 4200);
    }
  }
  function waFloat() {
    var C = window.NANSEI_CONFIG;
    if (!C || !C.hasPhone() || document.querySelector('.wa-float') || document.documentElement.hasAttribute('data-ns-minimal')) return;
    var a = document.createElement('a');
    a.className = 'wa-float'; a.href = C.wa('Hello ' + C.BRAND + ', I have a question.'); a.target = '_blank'; a.rel = 'noopener'; a.setAttribute('aria-label', 'Chat on WhatsApp');
    a.innerHTML = (window.nanseiIcon ? window.nanseiIcon('whatsapp') : 'WA');
    document.body.appendChild(a);
    var top = document.getElementById('nsToTop'); if (top) top.classList.add('has-wa');
  }

  /* ---------------- shared header: mega menus, account menu, mobile drawer, counts ---------------- */
  function sharedHeader() {
    var header = document.querySelector('.ns-header');
    if (!header) return;
    var hoverable = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    /* --- desktop menus (Shop / Farm / Help / Account): hover, click, keyboard --- */
    var items = Array.prototype.slice.call(header.querySelectorAll('.ns-item'));
    var scrim = document.createElement('div');
    scrim.className = 'ns-scrim';
    scrim.style.cssText = 'position:fixed;inset:0;z-index:990;background:rgba(8,18,12,.3);opacity:0;pointer-events:none;transition:opacity .3s';
    document.body.appendChild(scrim);
    var openTimer, closeTimer;
    function btnOf(it) { return it.querySelector(':scope > button'); }
    function setOpen(it, on) {
      it.classList.toggle('is-open', on);
      var b = btnOf(it); if (b) b.setAttribute('aria-expanded', on ? 'true' : 'false');
      var any = items.some(function (x) { return x.classList.contains('is-open') && !x.classList.contains('ns-acct'); });
      scrim.style.opacity = any ? '1' : '0';
    }
    function closeAll(except) { items.forEach(function (x) { if (x !== except && x.classList.contains('is-open')) setOpen(x, false); }); }
    items.forEach(function (it) {
      var b = btnOf(it); if (!b) return;
      b.addEventListener('click', function (e) { e.preventDefault(); var on = !it.classList.contains('is-open'); closeAll(it); setOpen(it, on); });
      if (hoverable) {
        it.addEventListener('mouseenter', function () { clearTimeout(closeTimer); openTimer = setTimeout(function () { closeAll(it); setOpen(it, true); }, 90); });
        it.addEventListener('mouseleave', function () { clearTimeout(openTimer); closeTimer = setTimeout(function () { setOpen(it, false); }, 200); });
      }
      it.addEventListener('focusout', function (e) { if (!e.relatedTarget || !it.contains(e.relatedTarget)) setOpen(it, false); });
      it.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && it.classList.contains('is-open')) { setOpen(it, false); b.focus(); }
        if (e.key === 'ArrowDown' && e.target === b) { e.preventDefault(); closeAll(it); setOpen(it, true); var a = it.querySelector('a, .ns-menu-btn'); if (a) a.focus(); }
      });
    });
    document.addEventListener('click', function (e) { if (!e.target.closest('.ns-item')) closeAll(); });
    header.addEventListener('click', function (e) { if (e.target.closest('.ns-mega a, .ns-menu a')) closeAll(); });

    /* --- mobile drawer --- */
    var burger = header.querySelector('.ns-burger');
    var drawer = header.querySelector('.ns-drawer');
    function setDrawer(open) {
      if (!burger || !drawer) return;
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      drawer.hidden = !open;
      header.classList.toggle('drawer-open', open);
      document.body.style.overflow = open ? 'hidden' : '';
      if (open) { var first = drawer.querySelector('.ns-drawer-x'); if (first) first.focus(); } else { burger.focus({ preventScroll: true }); }
    }
    if (burger && drawer) {
      burger.addEventListener('click', function () { setDrawer(drawer.hidden); });
      drawer.addEventListener('click', function (e) {
        if (e.target.closest('a') || e.target.closest('[data-ns-close]')) setDrawer(false);
      });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !drawer.hidden) setDrawer(false); });
      window.addEventListener('resize', function () { if (window.innerWidth > 1100 && !drawer.hidden) setDrawer(false); });
    }

    /* --- cart / wishlist counters --- */
    function counts() {
      var cart = readJSON('cart', []);
      var wish = readJSON('wishlist', []);
      var cartTotal = Array.isArray(cart) ? cart.reduce(function (s, i) { return s + (Number(i && i.qty) || 1); }, 0) : 0;
      var wishTotal = Array.isArray(wish) ? wish.length : 0;
      Array.prototype.forEach.call(header.querySelectorAll('[data-ns-count="cart"]'), function (el) { el.textContent = cartTotal; });
      Array.prototype.forEach.call(header.querySelectorAll('[data-ns-count="wishlist"]'), function (el) { el.textContent = wishTotal; });
    }
    Array.prototype.forEach.call(header.querySelectorAll('[data-ns-cart]'), function (cartLink) {
      cartLink.addEventListener('click', function (e) {
        if (typeof window.openCart === 'function') { e.preventDefault(); window.openCart(); }
      });
    });
    /* pages with sticky bars under the header read its live height from --ns-header-h */
    function setH() { document.documentElement.style.setProperty('--ns-header-h', header.offsetHeight + 'px'); }
    setH();
    if ('ResizeObserver' in window) new ResizeObserver(setH).observe(header); else window.addEventListener('resize', setH);

    counts();
    window.addEventListener('storage', counts);
    window.addEventListener('pageshow', counts);

    /* --- signed in / out --- */
    var user = readJSON('nansai_user', null);
    var token = null; try { token = localStorage.getItem('nansai_token'); } catch (e) {}
    var logged = !!(user && token);
    var full = logged ? String(user.name || ((user.firstName || '') + ' ' + (user.lastName || ''))).trim() : '';
    var first = full.split(/\s+/)[0] || 'there';
    Array.prototype.forEach.call(header.querySelectorAll('[data-ns-show]'), function (el) {
      var w = el.getAttribute('data-ns-show');
      el.hidden = !(w === 'in' ? logged : w === 'out' ? !logged : w === 'admin' ? (logged && user.role === 'admin') : true);
    });
    Array.prototype.forEach.call(header.querySelectorAll('[data-ns-name]'), function (el) { el.textContent = logged ? first : 'Sign in'; });
    Array.prototype.forEach.call(header.querySelectorAll('[data-ns-fullname]'), function (el) { el.textContent = full || first; });
    Array.prototype.forEach.call(header.querySelectorAll('[data-ns-email]'), function (el) { el.textContent = (user && user.email) || ''; });
    Array.prototype.forEach.call(header.querySelectorAll('[data-ns-initial]'), function (el) { el.textContent = (first[0] || '?').toUpperCase(); });
    Array.prototype.forEach.call(header.querySelectorAll('[data-ns-logout]'), function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        if (window.Auth && typeof window.Auth.logout === 'function') { window.Auth.logout('login.html'); return; }
        try { localStorage.removeItem('nansai_token'); localStorage.removeItem('nansai_user'); sessionStorage.removeItem('nansai_token'); } catch (x) {}
        window.location.href = 'login.html';
      });
    });
  }

  /* ---------------- header search: live product suggestions on pages other than home ---------------- */
  var scriptSrc = (document.currentScript && document.currentScript.src) || '';
  function searchSuggest() {
    if (typeof window.handleSearchInput === 'function') return;                 // pages that load js/store.js ship their own
    var inputs = document.querySelectorAll('.ns-search input[name="search"], .ns-msearch input[name="search"]');
    if (!inputs.length) return;
    var catalog = null, loading = false;
    function load(cb) {
      if (window.NS_PRODUCTS) { catalog = window.NS_PRODUCTS; return cb(); }
      if (loading || !scriptSrc) return;
      loading = true;
      var s = document.createElement('script');
      s.src = scriptSrc.replace(/nansai-ui\.js.*$/, 'catalog-data.js');
      s.onload = function () { catalog = window.NS_PRODUCTS || []; cb(); };
      document.head.appendChild(s);
    }
    function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    Array.prototype.forEach.call(inputs, function (input) {
      var form = input.form;
      var box = document.createElement('div');
      box.className = 'search-suggestions';
      box.setAttribute('role', 'listbox');
      form.appendChild(box);
      function hide() { box.classList.remove('show'); box.innerHTML = ''; }
      function show() {
        var q = input.value.trim().toLowerCase();
        if (!q || !catalog) return hide();
        var hits = catalog.filter(function (p) { return (p.name + ' ' + p.category).toLowerCase().indexOf(q) > -1; }).slice(0, 6);
        if (!hits.length) { box.innerHTML = '<div class="suggestion-empty">No products match &ldquo;' + esc(input.value.trim()) + '&rdquo;</div>'; box.classList.add('show'); return; }
        box.innerHTML = hits.map(function (p) {
          return '<a class="suggestion-item" role="option" href="product.html?id=' + encodeURIComponent(p.id) + '"><img src="' + esc(p.image) + '" alt="" loading="lazy"/>' +
            '<span style="min-width:0"><span class="suggestion-name">' + esc(p.name) + '</span><span class="suggestion-meta">' + esc(p.category) + '</span></span>' +
            '<span class="suggestion-price">&#8377;' + esc(p.price) + '</span></a>';
        }).join('') + '<a class="suggestion-all" href="shop.html?search=' + encodeURIComponent(input.value.trim()) + '">See all results for &ldquo;' + esc(input.value.trim()) + '&rdquo; &rarr;</a>';
        box.classList.add('show');
      }
      input.addEventListener('focus', function () { load(show); });
      input.addEventListener('input', function () { load(show); });
      input.addEventListener('keydown', function (e) { if (e.key === 'Escape') hide(); });
      document.addEventListener('click', function (e) { if (!form.contains(e.target)) hide(); });
    });
  }

  /* --- "Shop by category" links: the shop page filters in place (it defines window.nanseiFilterCat); elsewhere they simply open shop.html?cat=... --- */
  function categoryLinks() {
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('[data-ns-cat]');
      if (!a || e.defaultPrevented || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (typeof window.nanseiFilterCat !== 'function') return;
      e.preventDefault();
      window.nanseiFilterCat(a.getAttribute('data-ns-cat'), true);
    });
  }

  /* ---------------- [[icon:name]] markers rendered by page scripts after load (news feed, cards, modals...)
          Every page ships its own applyIcons(); not every page re-runs it for content it injects later. ---------------- */
  function watchIconMarkers() {
    if (!('MutationObserver' in window) || typeof window.nansaiApplyIcons !== 'function') return;
    var pending = false;
    function hasMarker(n) {
      return n.nodeType === 3 ? n.nodeValue.indexOf('[[icon:') > -1 : (n.nodeType === 1 && n.tagName !== 'SCRIPT' && n.tagName !== 'STYLE' && (n.textContent || '').indexOf('[[icon:') > -1);
    }
    new MutationObserver(function (muts) {
      if (pending) return;
      for (var i = 0; i < muts.length; i++) {
        var m = muts[i], found = false;
        if (m.type === 'characterData') found = hasMarker(m.target);
        for (var k = 0; !found && k < m.addedNodes.length; k++) found = hasMarker(m.addedNodes[k]);
        if (found) {
          pending = true;
          requestAnimationFrame(function () { pending = false; try { window.nansaiApplyIcons(document.body); } catch (e) {} });
          return;
        }
      }
    }).observe(document.body, { childList: true, characterData: true, subtree: true });
    try { window.nansaiApplyIcons(document.body); } catch (e) {}
  }

  /* ---------------- give icon-only buttons/links an accessible name ---------------- */
  var LABEL_RULES = [
    [/(rel-)?scroll-btn.*left/, 'Scroll left'],
    [/(rel-)?scroll-btn.*right/, 'Scroll right'],
    [/prevBtn|arrow-btn.*prev|^prev$/, 'Previous slide'],
    [/nextBtn|arrow-btn.*next|^next$/, 'Next slide'],
    [/dot/, 'Go to slide'],
    [/ac-dot/, 'Go to article'],
    [/mob-ham|ham-btn/, 'Open menu'],
    [/nav-search-btn|sb/, 'Search'],
    [/remove-btn/, 'Remove from wishlist'],
    [/rel-wish-btn|toggleWish|addToWishlist/, 'Add to wishlist'],
    [/qty-cart-btn|startQtySelect|confirmAddToCart|rel-add/, 'Add to cart'],
    [/closeCart|closeBlogModal|closeModal|close/i, 'Close'],
    [/openCart/, 'Open cart'],
    [/mute|Sound/i, 'Toggle sound']
  ];
  function autoLabel(root) {
    var els = (root || document).querySelectorAll('button, a[href], [role="button"]');
    Array.prototype.forEach.call(els, function (el) {
      if (el.getAttribute('aria-label') || el.title || (el.textContent || '').trim()) return;
      if (el.querySelector('img[alt]:not([alt=""])')) return;
      var hay = (el.id || '') + ' ' + (el.className && el.className.baseVal === undefined ? el.className : '') + ' ' + (el.getAttribute('onclick') || '');
      for (var i = 0; i < LABEL_RULES.length; i++) {
        if (LABEL_RULES[i][0].test(hay)) { el.setAttribute('aria-label', LABEL_RULES[i][1]); return; }
      }
    });
  }
  function watchLabels() {
    autoLabel(document);
    if (!('MutationObserver' in window)) return;
    var t = null;
    new MutationObserver(function () {
      if (t) return;
      t = setTimeout(function () { t = null; autoLabel(document); }, 300);
    }).observe(document.body, { childList: true, subtree: true });
  }

  /* ---------------- empty cart / wishlist badges are noise: hide them while they read 0 ---------------- */
  function watchBadges() {
    var sel = '.nav-badge, .ns-badge, .mob-bar-badge';
    function sync(el) { var v = (el.textContent || '').trim(); el.style.display = (v === '' || v === '0') ? 'none' : ''; }
    function bind(el) {
      if (el.__nsBadge) return; el.__nsBadge = true; sync(el);
      new MutationObserver(function () { sync(el); }).observe(el, { childList: true, characterData: true, subtree: true });
    }
    Array.prototype.forEach.call(document.querySelectorAll(sel), bind);
    if ('MutationObserver' in window) {
      new MutationObserver(function (muts) {
        muts.forEach(function (m) {
          Array.prototype.forEach.call(m.addedNodes, function (n) {
            if (n.nodeType !== 1) return;
            if (n.matches && n.matches(sel)) bind(n);
            if (n.querySelectorAll) Array.prototype.forEach.call(n.querySelectorAll(sel), bind);
          });
        });
      }).observe(document.body, { childList: true, subtree: true });
    }
  }

  ready(function () {
    watchBadges();
    watchIconMarkers();
    watchLabels();
    var y = String(new Date().getFullYear());
    Array.prototype.forEach.call(document.querySelectorAll('[data-ns-year]'), function (el) { el.textContent = y; });
    if (!document.documentElement.hasAttribute('data-ns-minimal')) chrome();
    watchImages();
    announce();
    sharedHeader();
    waFloat();
    categoryLinks();
    searchSuggest();
  });
})();
