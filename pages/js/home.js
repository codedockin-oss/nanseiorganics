/* Nansei Organics — home page */
(function () {
  'use strict';
  var N = window.NANSEI || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var P = function () { return typeof products !== 'undefined' ? products : []; };   // js/store.js
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  /* ---------- hero banner: one photo per slide, slides move sideways ---------- */
  var hb = $('#hero');
  if (hb) {
    var slides = $$('.hb__slide', hb), n = slides.length, cur = 0, DUR = 5500, dots = $('#hbDots');
    hb.style.setProperty('--hb-dur', DUR + 'ms');
    dots.innerHTML = slides.map(function (s, i) { return '<button aria-label="Show slide ' + (i + 1) + '"' + (i === 0 ? ' class="is-on"' : '') + '><i></i></button>'; }).join('');
    var dotBtns = $$('button', dots);
    var go = function (i, dir) {
      i = (i + n) % n; if (i === cur) return;
      dir = dir || (i > cur ? 1 : -1);
      var prev = slides[cur], next = slides[i];
      next.style.transition = 'none'; next.style.transform = 'translate3d(' + (dir * 100) + '%,0,0)';
      void next.offsetWidth;
      next.style.transition = ''; next.style.transform = '';
      next.classList.add('is-active'); next.removeAttribute('aria-hidden'); next.removeAttribute('tabindex');
      prev.classList.remove('is-active'); prev.setAttribute('aria-hidden', 'true'); prev.setAttribute('tabindex', '-1');
      prev.style.transform = 'translate3d(' + (-dir * 100) + '%,0,0)';
      $$('img[loading="lazy"]', next).forEach(function (im) { im.loading = 'eager'; });
      cur = i;
      dotBtns.forEach(function (d) { d.classList.remove('is-on'); });
      void dots.offsetWidth;
      dotBtns[cur].classList.add('is-on');
      $$('img[loading="lazy"]', slides[(cur + 1) % n]).forEach(function (im) { im.loading = 'eager'; });
    };
    if (N.reduced) hb.classList.add('no-auto');
    else dots.addEventListener('animationend', function (e) { if (e.target.parentNode === dotBtns[cur]) go(cur + 1, 1); });
    dotBtns.forEach(function (d, i) { d.addEventListener('click', function () { go(i); }); });
    $('#hbPrev').addEventListener('click', function () { go(cur - 1, -1); });
    $('#hbNext').addEventListener('click', function () { go(cur + 1, 1); });
    hb.addEventListener('mouseenter', function () { hb.classList.add('is-paused'); });
    hb.addEventListener('mouseleave', function () { hb.classList.remove('is-paused'); });
    hb.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') go(cur + 1, 1); if (e.key === 'ArrowLeft') go(cur - 1, -1); });
    var sx = null, sy = null, swiped = false;
    hb.addEventListener('pointerdown', function (e) { swiped = false; if (e.pointerType !== 'mouse') { sx = e.clientX; sy = e.clientY; } });
    hb.addEventListener('pointerup', function (e) {
      if (sx == null) return; var dx = e.clientX - sx, dy = e.clientY - sy; sx = null;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.2) { swiped = true; go(cur + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1); }
    });
    hb.addEventListener('click', function (e) { if (swiped) { e.preventDefault(); e.stopPropagation(); swiped = false; } }, true);
    if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { if (!en[0].isIntersecting) hb.classList.add('is-paused'); else if (!hb.matches(':hover')) hb.classList.remove('is-paused'); }, { threshold: .25 }).observe(hb);
  }

  /* ---------- shop the collection: category tiles ---------- */
  var TILES = [['rice', 'Heritage', 'rice'], ['flowers', 'Dried', 'flowers'], ['beverages', 'Natural', 'beverages'], ['flour', 'Stone-ground', 'flours']];
  function buildTiles() {
    var el = $('#catTiles'); if (!el) return;
    el.innerHTML = TILES.map(function (t) {
      var list = P().filter(function (p) { return p.category === t[0]; }); if (!list.length) return '';
      return '<a class="cat-tile" href="shop.html?cat=' + t[0] + '">' +
        '<div class="cat-tile__img"><img src="' + esc(list[0].image) + '" alt="' + esc(t[1] + ' ' + t[2]) + '" loading="lazy"></div>' +
        '<span class="cat-tile__n">' + list.length + (list.length === 1 ? ' product' : ' products') + '</span>' +
        '<div class="cat-tile__body"><p class="cat-tile__name">' + t[1] + '<span>' + t[2] + '</span></p><span class="cat-tile__go">' + nanseiIcon('arrow-right').replace('<svg', '<svg width="16" height="16"') + '</span></div></a>';
    }).join('');
    if (N.reveal) N.reveal(el);
  }

  /* ---------- shop the latest ---------- */
  var TABS = [['all', 'All'], ['new', 'New arrivals'], ['bestseller', 'Best sellers'], ['rice', 'Rice'], ['flowers', 'Flowers'], ['beverages', 'Beverages'], ['flour', 'Flour']];
  var curTab = 'all', tabs = $('#latestTabs'), grid = $('#latestGrid');
  function listFor(k) {
    var l = P();
    if (k === 'all') return l.slice(0, 8);
    if (k === 'new' || k === 'bestseller') return l.filter(function (p) { return p.section === k; }).slice(0, 8);
    return l.filter(function (p) { return p.category === k; }).slice(0, 8);
  }
  function renderLatest(animate) {
    if (!grid) return;
    var html = listFor(curTab).map(function (p, i) { return prodCardHTML(p, i); }).join('');
    var href = curTab === 'all' ? 'shop.html' : 'shop.html?cat=' + curTab;
    var all = $('#latestAll'), btn = $('#latestBtn');
    if (all) all.setAttribute('href', href);
    if (btn) btn.setAttribute('href', href);
    if (!animate) { grid.innerHTML = html; return; }
    grid.classList.add('is-out');
    setTimeout(function () { grid.innerHTML = html; grid.classList.remove('is-out'); }, 320);
  }
  if (tabs && grid) {
    tabs.innerHTML = TABS.map(function (t, i) { return '<button class="pill' + (i ? '' : ' is-active') + '" role="tab" aria-selected="' + (i ? 'false' : 'true') + '" data-k="' + t[0] + '">' + t[1] + '</button>'; }).join('');
    tabs.addEventListener('click', function (e) {
      var b = e.target.closest('[data-k]'); if (!b || b.getAttribute('data-k') === curTab) return;
      curTab = b.getAttribute('data-k');
      $$('.pill', tabs).forEach(function (x) { var on = x === b; x.classList.toggle('is-active', on); x.setAttribute('aria-selected', on); });
      renderLatest(true);
    });
  }

  function build() { buildTiles(); renderLatest(false); }
  build();
  document.addEventListener('nansei:products', function () { build(); });
  window.nanseiShowAll = function () { curTab = 'all'; renderLatest(false); };

  /* ---------- "ways to enjoy it": the picture you hover opens up ---------- */
  var occ = $('#occ');
  if (occ) {
    var items = $$('.occ__i', occ), coarse = window.matchMedia && matchMedia('(hover: none)').matches;
    var open = function (it) { items.forEach(function (x) { x.classList.toggle('is-active', x === it); }); };
    items.forEach(function (it) {
      it.addEventListener('mouseenter', function () { if (!coarse && innerWidth > 899) open(it); });
      it.addEventListener('focus', function () { open(it); });
      it.addEventListener('click', function (e) { if (!it.classList.contains('is-active') && (coarse || innerWidth <= 899)) { e.preventDefault(); open(it); } });
    });
  }

  /* ---------- YouTube thumbnails + titles for the hand-mill films (only the video ID is needed in the markup) ---------- */
  $$('#mill-heritage-section [data-yt]').forEach(function (el) {
    var id = el.getAttribute('data-yt'), img = el.querySelector('img');
    if (img) {
      var tries = ['maxresdefault', 'sddefault', 'hqdefault'], i = 0;
      var next = function () { if (i < tries.length) img.src = 'https://i.ytimg.com/vi/' + id + '/' + tries[i++] + '.jpg'; };
      img.addEventListener('load', function () { if (img.naturalWidth <= 120 && i < tries.length) next(); });   // YouTube answers a missing maxres with a 120px grey stub
      img.addEventListener('error', next);
      i = 0; next();
    }
    var title = el.querySelector('.mh-vtitle');
    if (title && !title.textContent.trim()) {
      fetch('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + id))
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) { if (d && d.title) { title.textContent = d.title; el.setAttribute('aria-label', 'Play: ' + d.title); } })
        .catch(function () { title.textContent = 'Watch the film'; });
    }
  });

  /* ---------- video modal ---------- */
  window.openVideoModal = function (src) {
    var modal = $('#video-modal'), iframe = $('#video-iframe'), video = $('#video-native');
    if (src.indexOf('.mp4') > -1) { iframe.style.display = 'none'; iframe.src = ''; video.src = src; video.style.display = 'block'; }
    else { video.style.display = 'none'; video.src = ''; iframe.src = src + (src.indexOf('?') > -1 ? '&' : '?') + 'autoplay=1'; iframe.style.display = 'block'; }
    modal.style.display = 'flex'; document.body.style.overflow = 'hidden';
  };
  window.closeVideoModal = function () {
    var modal = $('#video-modal'); if (!modal) return;
    modal.style.display = 'none';
    var iframe = $('#video-iframe'); iframe.src = ''; iframe.style.display = 'none';
    var video = $('#video-native'); video.src = ''; video.pause(); video.style.display = 'none';
    document.body.style.overflow = '';
  };
  var vm = $('#video-modal');
  if (vm) {
    $('#video-modal-close').addEventListener('click', window.closeVideoModal);
    vm.addEventListener('click', function (e) { if (e.target === vm) window.closeVideoModal(); });
  }

  /* ---------- gallery lightbox ---------- */
  var lbIndex = 0;
  var lbItems = function () { return $$('#gallery .bento-item'); };
  function showLightbox(i) {
    var items = lbItems(); if (!items.length) return;
    lbIndex = (i + items.length) % items.length;
    var img = items[lbIndex].querySelector('img');
    $('#lightbox-img').src = img.src.replace(/w=\d+/, 'w=1400');
    $('#lightbox-img').alt = img.alt;
    $('#lightbox-caption').textContent = img.dataset.caption || '';
    $('#lightbox-count').textContent = String(lbIndex + 1).padStart(2, '0') + ' / ' + String(items.length).padStart(2, '0');
  }
  window.openLightbox = function (card) { showLightbox(lbItems().indexOf(card)); $('#lightbox').classList.add('open'); document.body.style.overflow = 'hidden'; };
  function closeLightbox() { $('#lightbox').classList.remove('open'); document.body.style.overflow = ''; }
  var lb = $('#lightbox');
  if (lb) {
    $('#lightbox-close').addEventListener('click', closeLightbox);
    $('#lightbox-prev').addEventListener('click', function (e) { e.stopPropagation(); showLightbox(lbIndex - 1); });
    $('#lightbox-next').addEventListener('click', function (e) { e.stopPropagation(); showLightbox(lbIndex + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) closeLightbox(); });
    var tx = 0;
    lb.addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) { var d = e.changedTouches[0].clientX - tx; if (Math.abs(d) > 50) showLightbox(lbIndex + (d < 0 ? 1 : -1)); });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { window.closeVideoModal(); if (lb) closeLightbox(); return; }
    if (lb && lb.classList.contains('open')) {
      if (e.key === 'ArrowLeft') { e.stopImmediatePropagation(); showLightbox(lbIndex - 1); }
      if (e.key === 'ArrowRight') { e.stopImmediatePropagation(); showLightbox(lbIndex + 1); }
    }
  }, true);
})();
