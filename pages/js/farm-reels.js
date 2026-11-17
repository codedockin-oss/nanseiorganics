/* Farm reels — real clips from the farm on ImageKit.
 * <div data-farm-reels="rail"></div>  homepage reel rail
 * Desktop: a clip plays while the pointer is on it. Phones: the clip in the middle of the screen plays.
 * Tapping a clip opens the full-screen player with sound. Styles live in css/nansei.css.
 */
(function () {
  'use strict';
  var BASE = 'https://ik.imagekit.io/bq9dscs4g/agro%20store/';
  /* what is in each clip (watched before writing); `product` links a clip to the shop */
  var REELS = [
    { file: 'reel%205.mp4', tag: 'Dried flowers', title: 'Hibiscus, fresh off the plant and sun-dried', product: { id: 9, name: 'Hibiscus Flower' } },
    { file: 'reel%201.mp4', tag: 'On the farm', title: 'Morning on the farm pond' },
    { file: 'reel%203.mp4', tag: 'Fig powder', title: 'Country figs ripening on the trunk', product: { id: 16, name: 'Natural Fig Powder' } },
    { file: 'reel2.mp4', tag: 'On the farm', title: 'Banana and fig trees between the fields' },
    { file: 'reel4.mp4', tag: 'On the farm', title: 'Vines in flower along the fence' }
  ];
  window.NANSEI_REELS = REELS;
  var srcOf = function (r) { return r.src || BASE + r.file; };
  var barsHTML = function () { return REELS.map(function () { return '<i><b></b></i>'; }).join(''); };
  var onReelsChange = [];
  /* reels set in the admin (Store settings → Farm reels) replace the built-in ones */
  var lastSet = '';
  function fromSettings(st) {
    var list = st && st.homepage && st.homepage.reels;
    if (!list || !list.length) return;
    var key = JSON.stringify(list); if (key === lastSet) return; lastSet = key;
    var next = list.filter(function (r) { return r && r.video && (/^https:\/\//i.test(r.video) || /^(\.\/)?videos\//i.test(r.video)); }).map(function (r) {
      var prod = null;
      if (r.productId) {
        var cp = window.NanseiCatalog && window.NanseiCatalog.get(r.productId);
        var known = REELS.filter(function (x) { return x.product && String(x.product.id) === String(r.productId); })[0];
        prod = { id: r.productId, name: (cp && cp.name) || (known && known.product.name) || 'this product' };
      }
      return { src: r.video, tag: r.tag || '', title: r.title || '', product: prod };
    });
    if (!next.length) return;
    REELS.splice.apply(REELS, [0, REELS.length].concat(next));
    onReelsChange.forEach(function (fn) { try { fn(); } catch (e) { /* keep going */ } });
  }

  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var calm = (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) || (navigator.connection && navigator.connection.saveData);
  var canHover = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;
  var allCards = [];

  function cardHTML(r, i) {
    return '<article class="fr-card" role="listitem" tabindex="0" data-i="' + i + '" aria-label="Play clip: ' + esc(r.title) + '">' +
      '<video muted loop playsinline preload="none" data-src="' + esc(srcOf(r)) + '#t=0.6"></video>' +
      '<span class="fr-tag">' + esc(r.tag) + '</span>' +
      '<span class="fr-play" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></span>' +
      '<div class="fr-info"><span class="fr-num">' + String(i + 1).padStart(2, '0') + '</span><h3 class="fr-title">' + esc(r.title) + '</h3>' +
      (r.product ? '<a class="fr-shop" href="product.html?id=' + r.product.id + '">Shop ' + esc(r.product.name) + ' &rarr;</a>' : '') +
      '</div></article>';
  }
  function load(card) { var v = card.querySelector('video'); if (v && !v.getAttribute('src')) { v.src = v.dataset.src; v.preload = 'metadata'; } return v; }
  function play(card) { if (calm || viewerOpen()) return; var v = load(card); var p = v.play(); if (p && p.then) p.then(function () { card.classList.add('playing'); }, function () {}); }
  function stop(card) { var v = card.querySelector('video'); if (v && v.getAttribute('src')) v.pause(); card.classList.remove('playing'); }

  function mount(host) {
    var mode = host.getAttribute('data-farm-reels') === 'grid' ? 'grid' : 'rail';
    host.className = mode === 'grid' ? 'fr-grid' : 'fr-rail';
    host.setAttribute('role', 'list');
    host.innerHTML = REELS.map(cardHTML).join('');
    if (!host._watch) { host._watch = true; onReelsChange.push(function () { host.innerHTML = REELS.map(cardHTML).join(''); }); }
    var cards = [].slice.call(host.querySelectorAll('.fr-card'));
    allCards = allCards.concat(cards);

    var near = new IntersectionObserver(function (es) { if (es.some(function (e) { return e.isIntersecting; })) { cards.forEach(load); near.disconnect(); } }, { rootMargin: '500px 0px' });
    near.observe(host);

    if (canHover) {
      cards.forEach(function (c) { c.addEventListener('mouseenter', function () { play(c); }); c.addEventListener('mouseleave', function () { stop(c); }); });
    } else {
      var seen = new Map();
      var mid = new IntersectionObserver(function (es) {
        es.forEach(function (e) { seen.set(e.target, e.intersectionRatio); });
        var best = null, r = 0.6;
        seen.forEach(function (ratio, el) { if (ratio > r) { r = ratio; best = el; } });
        cards.forEach(function (c) { if (c === best) play(c); else stop(c); });
      }, { threshold: [0, 0.6, 0.8, 1] });
      cards.forEach(function (c) { mid.observe(c); });
    }
    cards.forEach(function (c) {
      c.addEventListener('click', function (e) { if (e.target.closest('.fr-shop')) return; open(Number(c.dataset.i)); });
      c.addEventListener('keydown', function (e) { if (e.target === c && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(Number(c.dataset.i)); } });
    });

    if (mode === 'rail') {
      var section = host.closest('section') || document;
      var arrows = [].slice.call(section.querySelectorAll('.fr-arrow'));
      var bar = section.querySelector('.fr-progress span');
      var sync = function () {
        var max = host.scrollWidth - host.clientWidth;
        if (arrows.length) { arrows[0].disabled = host.scrollLeft <= 4; arrows[1].disabled = host.scrollLeft >= max - 4; arrows[0].parentNode.style.visibility = max > 4 ? 'visible' : 'hidden'; }
        if (bar) { var part = host.clientWidth / host.scrollWidth; bar.style.width = (part * 100) + '%'; bar.style.transform = 'translateX(' + (max > 0 ? (host.scrollLeft / max) * (1 / part - 1) * 100 : 0) + '%)'; }
      };
      arrows.forEach(function (b) { b.addEventListener('click', function () { host.scrollBy({ left: Number(b.dataset.dir) * host.clientWidth * 0.8, behavior: 'smooth' }); }); });
      host.addEventListener('scroll', sync, { passive: true });
      window.addEventListener('resize', sync);
      sync();
    }
  }

  /* ---------- full-screen player (built once) ---------- */
  var V, vid, stage, bars, cur = 0, lastFocus = null, muted = false, viewerPreviousOverflow = '';
  function viewerOpen() { return V && !V.hidden; }
  function build() {
    if (V) return;
    V = document.createElement('div');
    V.id = 'frViewer'; V.hidden = true;
    V.setAttribute('role', 'dialog'); V.setAttribute('aria-modal', 'true'); V.setAttribute('aria-label', 'Farm reels');
    V.innerHTML =
      '<div class="frv-stage"><div class="frv-bars">' + barsHTML() + '</div>' +
      '<div class="frv-top"><span class="frv-count"></span>' +
      '<button type="button" class="frv-icon" data-a="mute" aria-label="Mute"><svg data-s="on" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></svg><svg data-s="off" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" hidden><path d="M11 5 6 9H2v6h4l5 4z"/><path d="m23 9-6 6M17 9l6 6"/></svg></button>' +
      '<button type="button" class="frv-icon" data-a="close" aria-label="Close">&times;</button></div>' +
      '<video playsinline preload="auto"></video><button type="button" class="frv-tap" data-a="toggle" aria-label="Pause or play"></button>' +
      '<div class="frv-bottom"><p class="frv-tag"></p><h3 class="frv-title"></h3><a class="frv-shop" href="#" hidden></a></div></div>' +
      '<button type="button" class="frv-nav frv-prev" data-a="prev" aria-label="Previous clip">&#8592;</button>' +
      '<button type="button" class="frv-nav frv-next" data-a="next" aria-label="Next clip">&#8594;</button>';
    document.body.appendChild(V);
    vid = V.querySelector('video'); stage = V.querySelector('.frv-stage'); bars = [].slice.call(V.querySelectorAll('.frv-bars i'));
    V.addEventListener('click', function (e) {
      var a = e.target.closest('[data-a]');
      if (e.target === V) return close();
      if (!a) return;
      var act = a.getAttribute('data-a');
      if (act === 'close') close();
      else if (act === 'prev') show(cur - 1);
      else if (act === 'next') show(cur + 1);
      else if (act === 'mute') { muted = !muted; vid.muted = muted; setMute(); }
      else if (act === 'toggle') { if (vid.paused) { vid.play(); stage.classList.remove('frv-paused'); } else { vid.pause(); stage.classList.add('frv-paused'); } }
    });
    vid.addEventListener('timeupdate', function () { if (vid.duration) bars[cur].firstChild.style.width = (vid.currentTime / vid.duration * 100) + '%'; });
    vid.addEventListener('ended', function () { show(cur + 1); });
    document.addEventListener('keydown', function (e) {
      if (!viewerOpen()) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); show(cur + 1); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); show(cur - 1); }
      else if (e.key === 'Tab') {
        var f = [].slice.call(V.querySelectorAll('button,a[href]')).filter(function (x) { return x.offsetParent && !x.hidden; });
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    });
    var sx = 0, sy = 0;
    stage.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    stage.addEventListener('touchend', function (e) {
      var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 45) return;
      if (Math.abs(dy) > Math.abs(dx)) { if (dy > 90 && cur === 0) close(); else show(cur + (dy < 0 ? 1 : -1)); }
      else show(cur + (dx < 0 ? 1 : -1));
    }, { passive: true });
  }
  function setMute() {
    V.querySelector('[data-s="on"]').hidden = muted; V.querySelector('[data-s="off"]').hidden = !muted;
    V.querySelector('[data-a="mute"]').setAttribute('aria-label', muted ? 'Turn sound on' : 'Mute');
  }
  function show(i) {
    if (bars.length !== REELS.length) { V.querySelector('.frv-bars').innerHTML = barsHTML(); bars = [].slice.call(V.querySelectorAll('.frv-bars i')); }
    cur = (i + REELS.length) % REELS.length;
    var r = REELS[cur];
    vid.src = srcOf(r); vid.muted = muted;
    var p = vid.play();
    if (p && p.catch) p.catch(function () { muted = true; vid.muted = true; setMute(); vid.play().catch(function () {}); });
    stage.classList.remove('frv-paused');
    V.querySelector('.frv-count').textContent = (cur + 1) + ' / ' + REELS.length;
    V.querySelector('.frv-tag').textContent = r.tag;
    V.querySelector('.frv-title').textContent = r.title;
    var shop = V.querySelector('.frv-shop');
    shop.hidden = !r.product;
    if (r.product) { shop.href = 'product.html?id=' + r.product.id; shop.textContent = 'Shop ' + r.product.name + ' →'; }
    bars.forEach(function (b, j) { b.firstChild.style.width = j < cur ? '100%' : '0'; });
  }
  function open(i) {
    build();
    lastFocus = document.activeElement;
    viewerPreviousOverflow = document.body.style.overflow;
    allCards.forEach(stop);
    V.hidden = false; document.body.style.overflow = 'hidden';
    show(i); setMute();
    V.querySelector('[data-a="close"]').focus();
  }
  function close() {
    vid.pause(); vid.removeAttribute('src'); vid.load();
    V.hidden = true; document.body.style.overflow = viewerPreviousOverflow;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
    try { document.dispatchEvent(new CustomEvent('nansei:reels-closed')); } catch (e) {}
  }
  window.NanseiReels = { open: open };

  /* ---------- floating reel: slides in from the side once the visitor scrolls ----------
   * <div data-farm-reels="float" data-after="600" data-mobile-bottom="84"></div>
   * Small 9:16 card over the page (never pushes content, so no layout shift), muted, moves to the next
   * clip when one ends. Close folds it into a "Reels" tab on the edge; that choice is kept for a day.
   */
  var FLOAT_KEY = 'nsh_reels_folded';
  function mountFloat(host) {
    if (host._done) return; host._done = true;
    var after = host.getAttribute('data-after') || '600';
    var mb = Number(host.getAttribute('data-mobile-bottom') || 84);
    var folded = false;
    try { var t = Number(localStorage.getItem(FLOAT_KEY) || 0); folded = t && Date.now() - t < 864e5; } catch (e) {}
    var i = 0;
    var box = document.createElement('div');
    box.className = 'frf'; box.style.setProperty('--frf-mb', mb + 'px');
    box.innerHTML =
      '<div class="frf-card" role="button" tabindex="0" aria-label="Watch farm reel">' +
        '<div class="frf-bars">' + barsHTML() + '</div>' +
        '<video muted playsinline preload="none"></video>' +
        '<button type="button" class="frf-x" aria-label="Hide reels">&times;</button>' +
        '<span class="frf-play" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M9 6.8v10.4c0 .7.8 1.1 1.4.7l7.5-5.2a.9.9 0 0 0 0-1.4l-7.5-5.2c-.6-.4-1.4 0-1.4.7Z" fill="currentColor"/></svg></span>' +
        '<div class="frf-info"><span class="frf-kicker frf-tag"></span><b class="frf-title"></b><span class="frf-cta">Watch reel <span aria-hidden="true">&rarr;</span></span></div>' +
      '</div>' +
      '<button type="button" class="frf-tab" aria-label="Show farm reels"><span class="frf-dot"></span>Reels</button>';
    document.body.appendChild(box);
    var card = box.querySelector('.frf-card'), v = box.querySelector('video'), bars = [].slice.call(box.querySelectorAll('.frf-bars i'));
    function setClip(n, autoplay) {
      if (bars.length !== REELS.length) { box.querySelector('.frf-bars').innerHTML = barsHTML(); bars = [].slice.call(box.querySelectorAll('.frf-bars i')); }
      i = (n + REELS.length) % REELS.length;
      var r = REELS[i];
      v.src = srcOf(r) + (calm ? '#t=0.6' : '');
      v.preload = calm ? 'metadata' : 'auto';
      box.querySelector('.frf-tag').textContent = r.tag;
      box.querySelector('.frf-title').textContent = r.title;
      bars.forEach(function (b, j) { b.firstChild.style.width = j < i ? '100%' : '0'; });
      if (autoplay && !calm) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
    }
    onReelsChange.push(function () { i = 0; if (shown && !folded) setClip(0, true); });
    v.addEventListener('timeupdate', function () { if (v.duration && bars[i]) bars[i].firstChild.style.width = (v.currentTime / v.duration * 100) + '%'; });
    v.addEventListener('ended', function () { setClip(i + 1, true); });
    var shown = false;
    var disabled = !!(window.NANSEI_SETTINGS && window.NANSEI_SETTINGS.homepage && window.NANSEI_SETTINGS.homepage.showReels === false);
    function show() {
      if (shown || disabled || viewerOpen()) return; shown = true;
      box.classList.add(folded ? 'folded' : 'in');
      if (!folded) setClip(i, true);
    }
    function onScroll() {
      if (after === 'hero') {
        var hero = document.getElementById('heroSection');
        if (hero ? hero.getBoundingClientRect().bottom <= 0 : window.scrollY > 600) show();
      } else if (window.scrollY > Number(after)) show();
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    document.addEventListener('nansei:settings', function (e) {
      var settings = e.detail || window.NANSEI_SETTINGS;
      disabled = !!(settings && settings.homepage && settings.homepage.showReels === false);
      if (disabled) {
        v.pause(); box.classList.remove('in', 'folded'); shown = false;
      } else onScroll();
    });
    function fold(e) {
      if (e) { e.stopPropagation(); e.preventDefault(); }
      folded = true; v.pause();
      box.classList.remove('in'); box.classList.add('folded');
      try { localStorage.setItem(FLOAT_KEY, String(Date.now())); } catch (er) {}
    }
    function unfold() {
      folded = false;
      box.classList.remove('folded'); box.classList.add('in');
      try { localStorage.removeItem(FLOAT_KEY); } catch (er) {}
      setClip(i, true);
    }
    box.querySelector('.frf-x').addEventListener('click', fold);
    box.querySelector('.frf-tab').addEventListener('click', unfold);
    function go() { v.pause(); open(i); }
    card.addEventListener('click', function (e) { if (!e.target.closest('.frf-x')) go(); });
    card.addEventListener('keydown', function (e) { if (e.target === card && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); go(); } });
    /* pause while the tab is hidden or the full-screen player is open; resume after */
    document.addEventListener('visibilitychange', function () { if (document.hidden) v.pause(); else if (shown && !folded && !viewerOpen() && !calm) v.play().catch(function () {}); });
    document.addEventListener('nansei:reels-closed', function () { if (shown && !folded && !calm) v.play().catch(function () {}); });
  }

  /* Instagram button from the admin's store settings */
  function insta(st) {
    var u = st && st.social && st.social.instagram;
    document.querySelectorAll('[data-insta]').forEach(function (a) { if (/^https:\/\//.test(u || '')) { a.href = u; a.hidden = false; } });
  }
  function init() {
    fromSettings(window.NANSEI_SETTINGS);
    document.addEventListener('nansei:settings', function (e) { fromSettings(e.detail || window.NANSEI_SETTINGS); });
    document.querySelectorAll('[data-farm-reels]').forEach(function (h) { if (h.getAttribute('data-farm-reels') === 'float') mountFloat(h); else mount(h); });
    if (window.NANSEI_SETTINGS) insta(window.NANSEI_SETTINGS);
    document.addEventListener('nansei:settings', function (e) { insta(e.detail); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
