/*
 * Shared top bar, header, category row, mobile menu, mobile bottom bar and footer for every storefront page.
 * Layout follows Organic Mandya's storefront, in Nansei's forest green + gold, Quicksand font.
 * Use:  <script src="js/site-shell.js" data-part="header"></script>   (top of <body>)
 *       <script src="js/site-shell.js" data-part="footer"></script>   (end of <body>)
 * Optional on the header tag: data-bottom-bar="off" for pages with their own sticky bar.
 *
 * Keeps the element ids page scripts rely on (searchInput, mobSearchInput, searchSuggestions, cartCount,
 * wishlistCount, mobDrawer, navSignInBtn, navSignInText, mobSignInLink, mobLogoutLink, adminCircleBtn,
 * mobBarCartCount, nshWhatsapp, nshAddress, nshFssai, nshSocial).
 */
(function () {
  var script = document.currentScript;
  var part = script && script.getAttribute('data-part');

  if (!window.NanseiShell) {
    var PAGE = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    var ON_HOME = PAGE === 'index.html' || PAGE === '';

    var CATS = [
      ['rice', 'Heritage Rice'], ['flowers', 'Dried Flowers'], ['flour', 'Flours & Mixes'], ['beverages', 'Drinks'], ['other', 'Fig Powder & More']
    ];

    var I = function (d, w) { return '<svg viewBox="0 0 24 24" width="' + (w || 20) + '" height="' + (w || 20) + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>'; };
    var ICON = {
      search: I('<circle cx="11" cy="11" r="7.5"/><path d="m20.5 20.5-4.2-4.2"/>', 18),
      user: I('<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'),
      heart: I('<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>'),
      cart: I('<circle cx="9" cy="20" r="1.3"/><circle cx="18" cy="20" r="1.3"/><path d="M2.5 3h2.4l2.5 11.6a1.8 1.8 0 0 0 1.8 1.4h8.6a1.8 1.8 0 0 0 1.7-1.3L21.5 7H6"/>'),
      home: I('<path d="M3 10.5 12 3l9 7.5V20a1.5 1.5 0 0 1-1.5 1.5H15v-6H9v6H4.5A1.5 1.5 0 0 1 3 20z"/>'),
      grid: I('<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>'),
      play: I('<rect x="3" y="3" width="18" height="18" rx="4"/><path d="m10 8.5 5 3.5-5 3.5z"/>'),
      truck: I('<path d="M1.5 5.5h12v10h-12zM13.5 9h4l3 3v3.5h-7"/><circle cx="6" cy="18" r="1.8"/><circle cx="17" cy="18" r="1.8"/>', 18),
      chev: I('<path d="m6 9 6 6 6-6"/>', 16),
      leaf: I('<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10z"/><path d="M2 21c0-3 1.9-5.4 5.1-6 2.4-.5 4.9-2 5.9-3"/>', 18),
      map: I('<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>', 18),
      wa: '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.8 14.1c-.2.7-1.4 1.3-2 1.4-.5 0-1 .2-3.3-.7-2.8-1.1-4.6-4-4.7-4.1-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.9 2.1c.1.1.1.3 0 .5l-.3.5-.4.5c-.1.1-.3.3-.1.6.2.3.7 1.2 1.5 1.9 1 .9 1.9 1.2 2.2 1.4.3.1.4.1.6-.1l.9-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.1.1.7-.2 1.4z"/></svg>',
      out: I('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>', 18),
      box: I('<path d="M21 8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7z"/><path d="M3.3 7 12 12l8.7-5M12 22V12"/>', 18),
      book: I('<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2zM22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>', 18)
    };

    var F = '"Quicksand",system-ui,-apple-system,sans-serif';
    var FARM_MAP = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('Nansei Organics, Achankulam, near Srivilliputhur, Tamil Nadu, India');
    var CSS = [
      '.nsh-r,.nsh-r *{box-sizing:border-box}',
      '.nsh-r button,.nsh-r input,.nsh-r a,.nsh-r p,.nsh-r ul,.nsh-r li,.nsh-r h3,.nsh-r span,.nsh-r nav{margin:0;padding:0;border:0;background:none;box-shadow:none;font:inherit;color:inherit;letter-spacing:normal;text-transform:none;text-align:left;width:auto;height:auto;min-height:0;max-width:none;float:none;border-radius:0}',
      ':root{--nsh-forest:#0f2218;--nsh-forest-2:#1a3a2a;--nsh-mid:#2d5a3d;--nsh-leaf:#4a8c5c;--nsh-gold:#c9a84c;--nsh-gold-lt:#e8c97a;--nsh-cream:#f7f3ec;--nsh-tile:#eef3ee;--nsh-ink:#1a2416;--nsh-grey:#6b7a6f;--nsh-h:76px}',
      '.nsh-r{font-family:' + F + ';line-height:1.3;color:var(--nsh-ink)}',
      /* top bar */
      '.nsh-top{background:var(--nsh-forest);color:#f3efe6;font-size:.78rem;font-weight:600}',
      '.nsh-top .nsh-in{height:34px;display:flex;align-items:center;justify-content:space-between;gap:16px}',
      '.nsh-top .nsh-ann{flex:1;min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;text-align:center}',
      '.nsh-top .nsh-ann b{color:var(--nsh-gold-lt);font-weight:700}',
      '.nsh-top .nsh-help{display:flex;align-items:center;gap:14px;flex-shrink:0}',
      '.nsh-top a{color:#f3efe6;text-decoration:none;display:inline-flex;align-items:center;gap:6px}',
      '.nsh-top a:hover{color:var(--nsh-gold-lt)}',
      '.nsh-top .nsh-left{flex-shrink:0;display:flex;gap:14px}',
      /* header */
      '.nsh-in{max-width:1320px;margin:0 auto;padding:0 24px}',
      '.nsh-head{position:sticky;top:0;z-index:1000;background:#fff;box-shadow:0 1px 0 rgba(15,34,24,.08)}',
      '.nsh-head.scrolled{box-shadow:0 6px 24px rgba(15,34,24,.08)}',
      '.nsh-main{height:var(--nsh-h);display:flex;align-items:center;gap:18px}',
      '.nsh-logo{flex-shrink:0;display:flex;align-items:center;text-decoration:none}',
      '.nsh-logo img{height:58px;width:auto;display:block}',
      '.nsh-catbtn{display:flex;align-items:center;gap:8px;height:44px;padding:0 14px!important;border-radius:12px!important;font-weight:700!important;font-size:.92rem!important;color:var(--nsh-forest)!important;cursor:pointer;white-space:nowrap}',
      '.nsh-catbtn:hover,.nsh-catbtn[aria-expanded=true]{background:var(--nsh-tile)!important}',
      '.nsh-catbtn svg:last-child{transition:transform .2s}',
      '.nsh-catbtn[aria-expanded=true] svg:last-child{transform:rotate(180deg)}',
      '.nsh-catwrap{position:relative;flex-shrink:0}',
      '.nsh-catmenu{position:absolute;top:calc(100% + 10px);left:0;width:300px;background:#fff;border:1px solid rgba(15,34,24,.1);border-radius:16px;box-shadow:0 22px 50px rgba(15,34,24,.16);padding:8px;display:none;z-index:1300}',
      '.nsh-catmenu.open{display:block}',
      '.nsh-catmenu a{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-radius:10px;font-weight:600;font-size:.95rem;color:var(--nsh-ink);text-decoration:none}',
      '.nsh-catmenu a:hover{background:var(--nsh-tile);color:var(--nsh-forest)}',
      '.nsh-catmenu a span{color:var(--nsh-grey);font-size:.8rem;font-weight:500}',
      '.nsh-search{position:relative;flex:1;min-width:0;max-width:560px}',
      '.nsh-search input,.nsh-msearch input{width:100%!important;height:46px!important;padding:0 50px 0 20px!important;border:1.5px solid rgba(15,34,24,.14)!important;border-radius:30px!important;background:#f7f8f6!important;font:500 .92rem ' + F + '!important;color:var(--nsh-ink)!important;outline:none;transition:border-color .2s,background .2s}',
      '.nsh-search input:focus,.nsh-msearch input:focus{background:#fff!important;border-color:var(--nsh-mid)!important}',
      '.nsh-sbtn{position:absolute!important;right:5px;top:50%;transform:translateY(-50%);width:36px!important;height:36px!important;border-radius:50%!important;background:var(--nsh-forest)!important;color:#fff!important;display:grid!important;place-items:center;cursor:pointer}',
      '.nsh-sbtn:hover{background:var(--nsh-mid)!important}',
      '.nsh-head .search-suggestions,.nsh-msearch .search-suggestions{display:none;position:absolute;top:calc(100% + 8px);left:0;right:0;background:#fff;border:1px solid rgba(15,34,24,.12);border-radius:16px;box-shadow:0 18px 40px rgba(15,34,24,.16);overflow:hidden;z-index:1200}',
      '.nsh-head .search-suggestions.show,.nsh-msearch .search-suggestions.show{display:block}',
      '.nsh-track{display:inline-flex!important;align-items:center;gap:7px;height:42px;padding:0 16px!important;border:1.5px solid var(--nsh-mid)!important;border-radius:30px!important;color:var(--nsh-mid)!important;font-weight:700!important;font-size:.86rem!important;text-decoration:none;white-space:nowrap;flex-shrink:0}',
      '.nsh-track:hover{background:var(--nsh-mid)!important;color:#fff!important}',
      '.nsh-acts{display:flex;align-items:center;gap:4px;margin-left:auto;flex-shrink:0}',
      '.nsh-act{position:relative;display:flex!important;flex-direction:column;align-items:center;gap:3px;min-width:58px;padding:6px 6px!important;border-radius:12px!important;color:var(--nsh-ink)!important;text-decoration:none;cursor:pointer;font-size:.74rem!important;font-weight:600!important}',
      '.nsh-act:hover{background:var(--nsh-tile)!important;color:var(--nsh-forest)!important}',
      '.nsh-act .nsh-lbl{text-align:center!important;max-width:84px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}',
      '.nsh-badge{position:absolute!important;top:2px;right:12px;min-width:17px;height:17px;padding:0 4px!important;border-radius:20px!important;background:var(--nsh-gold)!important;color:var(--nsh-forest)!important;font-size:.64rem!important;font-weight:800!important;display:flex;align-items:center;justify-content:center;border:2px solid #fff!important}',
      '.nsh-admin{display:none;align-items:center;justify-content:center;width:34px;height:34px;border-radius:50%!important;background:var(--nsh-forest)!important;color:var(--nsh-gold-lt)!important;border:1px solid var(--nsh-gold)!important;font-weight:800!important;font-size:.66rem!important;text-decoration:none;flex-shrink:0}',
      '.nsh-ham{display:none!important;width:42px;height:42px;border-radius:12px!important;align-items:center;justify-content:center;cursor:pointer;flex-direction:column;gap:5px}',
      '.nsh-ham span{display:block;width:20px;height:2px;background:var(--nsh-forest)!important;border-radius:2px!important;transition:transform .25s,opacity .25s}',
      '.nsh-ham.open span:nth-child(1){transform:translateY(7px) rotate(45deg)}.nsh-ham.open span:nth-child(2){opacity:0}.nsh-ham.open span:nth-child(3){transform:translateY(-7px) rotate(-45deg)}',
      /* category row */
      '.nsh-cats{border-top:1px solid rgba(15,34,24,.07)}',
      '.nsh-cats ul{list-style:none;display:flex;align-items:center;gap:4px;height:48px;overflow-x:auto;scrollbar-width:none}',
      '.nsh-cats ul::-webkit-scrollbar{display:none}',
      '.nsh-cats ul.nsh-in{padding:0 24px}',
      '.nsh-cats a{display:inline-flex!important;align-items:center;gap:6px;height:34px;padding:0 14px!important;border-radius:20px!important;font-weight:600!important;font-size:.88rem!important;color:var(--nsh-ink)!important;text-decoration:none;white-space:nowrap}',
      '.nsh-cats a:hover,.nsh-cats a[aria-current=page]{background:var(--nsh-tile)!important;color:var(--nsh-forest)!important}',
      '.nsh-cats .nsh-hl{color:var(--nsh-mid)!important;font-weight:700!important}',
      '.nsh-cats .nsh-sep{width:1px;height:18px;background:rgba(15,34,24,.12);margin:0 6px;flex-shrink:0}',
      /* mobile search + drawer + bar */
      '.nsh-msearch{display:none;padding:0 14px 12px;background:#fff}',
      '.nsh-msearch .nsh-wrap{position:relative}',
      '.nsh-msearch input{font-size:16px!important;height:44px!important}',
      '.nsh-drawer{display:none;position:fixed;inset:0;z-index:1500;background:rgba(15,34,24,.45)}',
      '.nsh-drawer .nsh-panel{position:absolute;top:0;left:0;bottom:0;width:min(86vw,360px);background:#fff;overflow-y:auto;padding:18px 16px 90px;box-shadow:12px 0 40px rgba(0,0,0,.2);animation:nshIn .25s ease}',
      '@keyframes nshIn{from{transform:translateX(-30px);opacity:0}to{transform:none;opacity:1}}',
      '.nsh-drawer .nsh-ptop{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}',
      '.nsh-drawer .nsh-ptop img{height:46px}',
      '.nsh-drawer .nsh-x{width:40px;height:40px;border-radius:50%!important;background:var(--nsh-tile)!important;font-size:1.4rem!important;line-height:1;cursor:pointer;display:grid!important;place-items:center;color:var(--nsh-forest)!important}',
      '.nsh-drawer h3{font-size:.72rem!important;font-weight:700!important;letter-spacing:.14em!important;text-transform:uppercase!important;color:var(--nsh-grey)!important;margin:16px 6px 6px!important}',
      '.nsh-drawer a{display:flex!important;align-items:center;gap:12px;padding:13px 10px!important;border-radius:12px!important;font-weight:600!important;font-size:1rem!important;color:var(--nsh-ink)!important;text-decoration:none}',
      '.nsh-drawer a:hover,.nsh-drawer a[aria-current=page]{background:var(--nsh-tile)!important}',
      '.nsh-drawer a svg{color:var(--nsh-mid);flex-shrink:0}',
      '.nsh-drawer .nsh-catlink{justify-content:space-between}',
      '.nsh-drawer .nsh-logout{display:none!important;color:#b83232!important}',
      '.nsh-drawer .nsh-wa{margin-top:16px;background:var(--nsh-forest)!important;color:#fff!important;justify-content:center}',
      '.nsh-drawer .nsh-wa svg{color:#fff}',
      '.nsh-bar{display:none;position:fixed;left:0;right:0;bottom:0;z-index:1080;background:#fff;border-top:1px solid rgba(15,34,24,.08);box-shadow:0 -6px 24px rgba(15,34,24,.08);padding:6px 6px calc(6px + env(safe-area-inset-bottom,0px))}',
      '.nsh-bar a{position:relative;flex:1;display:flex!important;flex-direction:column;align-items:center;gap:3px;padding:5px 2px!important;font-size:.68rem!important;font-weight:600!important;color:var(--nsh-grey)!important;text-decoration:none;-webkit-tap-highlight-color:transparent;text-align:center!important}',
      '.nsh-bar a[aria-current=page]{color:var(--nsh-forest)!important}',
      '.nsh-bar a[aria-current=page] svg{color:var(--nsh-mid)}',
      '.nsh-bar .nsh-iw{position:relative;display:flex}',
      '.nsh-bar .nsh-bbadge{position:absolute!important;top:-5px;right:-9px;min-width:16px;height:16px;padding:0 3px!important;border-radius:20px!important;background:var(--nsh-gold)!important;color:var(--nsh-forest)!important;font-size:.6rem!important;font-weight:800!important;display:flex;align-items:center;justify-content:center;border:2px solid #fff!important}',
      '@media(max-width:1100px){.nsh-track{display:none!important}.nsh-act{min-width:52px}}',
      '@media(max-width:900px){:root{--nsh-h:64px}.nsh-in{padding:0 14px}.nsh-main{gap:8px}.nsh-catwrap,.nsh-search,.nsh-cats,.nsh-top .nsh-left{display:none}.nsh-ham{display:flex!important}.nsh-logo{margin-right:auto}.nsh-logo img{height:46px}.nsh-msearch{display:block}.nsh-act{min-width:44px;padding:6px 4px!important}.nsh-act .nsh-lbl{display:none}.nsh-badge{right:2px}.nsh-top .nsh-in{height:30px}.nsh-top{font-size:.72rem}.nsh-top .nsh-help a:not(.nsh-tw){display:none}}',
      '@media(max-width:900px){body.nsh-has-bar{padding-bottom:70px}.nsh-bar{display:flex}}',
      '@media(max-width:420px){.nsh-acts .nsh-wish{display:none!important}}',
      /* footer */
      '.nsh-foot{background:var(--nsh-forest);color:rgba(243,239,230,.78);font-family:' + F + ';margin-top:0}',
      '.nsh-foot a{color:rgba(243,239,230,.78)!important;text-decoration:none}',
      '.nsh-foot a:hover{color:var(--nsh-gold-lt)!important}',
      '.nsh-fpromise{border-bottom:1px solid rgba(243,239,230,.1)}',
      '.nsh-fpromise .nsh-in{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;padding-top:28px;padding-bottom:28px}',
      '.nsh-fpromise div{display:flex;align-items:center;gap:12px}',
      '.nsh-fpromise i{width:42px;height:42px;border-radius:50%;background:rgba(201,168,76,.14);color:var(--nsh-gold-lt);display:grid;place-items:center;flex-shrink:0;font-style:normal}',
      '.nsh-fpromise b{display:block;color:#fff;font-size:.95rem}',
      '.nsh-fpromise span{font-size:.8rem}',
      '.nsh-fgrid{display:grid;grid-template-columns:1.4fr 1fr 1fr 1.2fr;gap:36px;padding-top:48px;padding-bottom:40px}',
      '.nsh-flogo{height:62px;filter:brightness(0) invert(1);margin-bottom:14px}',
      '.nsh-fabout{font-size:.9rem;line-height:1.7;max-width:320px}',
      '.nsh-foot h3{color:#fff!important;font-size:1.02rem!important;font-weight:700!important;margin:0 0 16px!important}',
      '.nsh-foot ul{list-style:none}',
      '.nsh-foot li{margin:0 0 11px!important;font-size:.9rem}',
      '.nsh-fpay{margin-top:18px;display:flex;flex-wrap:wrap;gap:6px}',
      '.nsh-fpay span{font-size:.72rem;font-weight:700;letter-spacing:.06em;padding:5px 10px;border:1px solid rgba(243,239,230,.2);border-radius:20px}',
      '.nsh-fbottom{border-top:1px solid rgba(243,239,230,.1)}',
      '.nsh-fbottom .nsh-in{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;padding-top:18px;padding-bottom:18px;font-size:.8rem}',
      '.nsh-fbottom nav{display:flex;flex-wrap:wrap;gap:18px}',
      '@media(max-width:1000px){.nsh-fgrid{grid-template-columns:1fr 1fr}.nsh-fpromise .nsh-in{grid-template-columns:1fr 1fr}}',
      '@media(max-width:600px){.nsh-fgrid{grid-template-columns:1fr 1fr;gap:26px;padding-top:36px}.nsh-fgrid>div:first-child{grid-column:1/-1}.nsh-fpromise .nsh-in{gap:14px}.nsh-fpromise b{font-size:.86rem}.nsh-fpromise span{font-size:.74rem}.nsh-fpromise i{width:36px;height:36px}}'
    ].join('\n');

    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function readJSON(k, d) { try { return JSON.parse(localStorage.getItem(k) || 'null') || d; } catch (e) { return d; } }
    function cur(page) { return PAGE === page ? ' aria-current="page"' : ''; }
    function catHref(c) { return ON_HOME ? '#shop-' + c : 'index.html#shop-' + c; }

    var Shell = window.NanseiShell = {
      injectStyle: function () {
        if (document.getElementById('nsh-style')) return;
        if (!document.querySelector('link[href*="family=Quicksand"]')) {
          var l = document.createElement('link');
          l.rel = 'stylesheet';
          l.href = 'https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&display=swap';
          document.head.appendChild(l);
        }
        var st = document.createElement('style');
        st.id = 'nsh-style';
        st.textContent = CSS;
        document.head.appendChild(st);
      },

      header: function (bottomBar) {
        var h = '' +
          '<div class="nsh-top nsh-r"><div class="nsh-in">' +
          '<div class="nsh-left"><a href="track-order.html">' + ICON.truck + 'Track order</a></div>' +
          '<p class="nsh-ann" id="nshAnn">Free delivery on orders above <b>₹999</b> &middot; Packed at our farm in Achankulam</p>' +
          '<div class="nsh-help"><a class="nsh-tw" id="nshTopWa" href="https://wa.me/916382142578" target="_blank" rel="noopener">' + ICON.wa + '<span>Need help? WhatsApp us</span></a></div>' +
          '</div></div>' +

          '<header class="nsh-head nsh-r" id="siteHeader">' +
          '<div class="nsh-in nsh-main">' +
          '<button type="button" class="nsh-ham" id="mobHam" aria-label="Open menu" aria-controls="mobDrawer" aria-expanded="false" onclick="NanseiShell.toggleDrawer()"><span></span><span></span><span></span></button>' +
          '<a class="nsh-logo" href="index.html" aria-label="Nansei Organics home"><img src="nansei_org_logo.svg" alt="Nansei Organics"/></a>' +
          '<div class="nsh-catwrap"><button type="button" class="nsh-catbtn" id="nshCatBtn" aria-expanded="false" aria-controls="nshCatMenu" onclick="NanseiShell.toggleCats()">' + ICON.grid + 'Shop by category' + ICON.chev + '</button>' +
          '<div class="nsh-catmenu" id="nshCatMenu" role="menu">' +
          CATS.map(function (c) { return '<a role="menuitem" href="' + catHref(c[0]) + '" onclick="return NanseiShell.goCat(\'' + c[0] + '\')">' + c[1] + '<span>&rarr;</span></a>'; }).join('') +
          '<a role="menuitem" href="' + (ON_HOME ? '#products' : 'index.html#products') + '" onclick="return NanseiShell.goCat(\'all\')">All products<span>&rarr;</span></a>' +
          '</div></div>' +
          '<div class="nsh-search" role="search">' +
          '<input id="searchInput" type="search" placeholder="Search heritage rice, dried flowers, flours…" autocomplete="off" aria-label="Search products"/>' +
          '<button type="button" class="nsh-sbtn" aria-label="Search">' + ICON.search + '</button>' +
          '<div id="searchSuggestions" class="search-suggestions"></div>' +
          '</div>' +
          '<a class="nsh-track" href="track-order.html"' + cur('track-order.html') + '>' + ICON.truck + 'Track order</a>' +
          '<div class="nsh-acts">' +
          '<a id="adminCircleBtn" class="nsh-admin" href="admin-panel.html" title="Admin panel">AD</a>' +
          '<a href="wishlist.html" class="nsh-act nsh-wish" aria-label="Wishlist"' + cur('wishlist.html') + '>' + ICON.heart + '<span class="nsh-lbl">Wishlist</span><span class="nsh-badge" id="wishlistCount">0</span></a>' +
          '<a id="navSignInBtn" href="login.html" class="nsh-act" aria-label="Account">' + ICON.user + '<span class="nsh-lbl" id="navSignInText">Sign in</span></a>' +
          '<button type="button" class="nsh-act" aria-label="Cart" onclick="NanseiShell.openCart()">' + ICON.cart + '<span class="nsh-lbl">Cart</span><span class="nsh-badge" id="cartCount">0</span></button>' +
          '</div></div>' +
          '<nav class="nsh-cats" aria-label="Categories"><ul class="nsh-in">' +
          CATS.map(function (c) { return '<li><a href="' + catHref(c[0]) + '" onclick="return NanseiShell.goCat(\'' + c[0] + '\')">' + c[1] + '</a></li>'; }).join('') +
          '<li class="nsh-sep" aria-hidden="true"></li>' +
          '<li><a href="video-reels.html"' + cur('video-reels.html') + '>Farm reels</a></li>' +
          '<li><a href="' + (ON_HOME ? '#gallery' : 'index.html#gallery') + '">Our farm</a></li>' +
          '<li><a href="blog.html"' + cur('blog.html') + '>Journal</a></li>' +
          '<li><a href="news.html"' + cur('news.html') + '>News</a></li>' +
          '<li><a href="' + FARM_MAP + '" target="_blank" rel="noopener">Map</a></li>' +
          '</ul></nav>' +
          '<div class="nsh-msearch" role="search"><div class="nsh-wrap">' +
          '<input id="mobSearchInput" type="search" placeholder="Search rice, flowers, flours…" autocomplete="off" enterkeyhint="search" aria-label="Search products"/>' +
          '<button type="button" class="nsh-sbtn" aria-label="Search">' + ICON.search + '</button>' +
          '<div id="mobSearchSuggestions" class="search-suggestions"></div>' +
          '</div></div>' +
          '</header>' +

          '<div id="mobDrawer" class="nsh-drawer nsh-r" style="display:none" onclick="if(event.target===this)NanseiShell.closeDrawer()">' +
          '<div class="nsh-panel" role="dialog" aria-modal="true" aria-label="Menu">' +
          '<div class="nsh-ptop"><img src="nansei_org_logo.svg" alt="Nansei Organics"/><button type="button" class="nsh-x" aria-label="Close menu" onclick="NanseiShell.closeDrawer()">&times;</button></div>' +
          '<a id="mobSignInLink" href="login.html">' + ICON.user + '<span>Sign in</span></a>' +
          '<h3>Shop by category</h3>' +
          CATS.map(function (c) { return '<a class="nsh-catlink" href="' + catHref(c[0]) + '" onclick="NanseiShell.closeDrawer();return NanseiShell.goCat(\'' + c[0] + '\')">' + c[1] + '<span>&rarr;</span></a>'; }).join('') +
          '<h3>Your orders</h3>' +
          '<a href="account.html"' + cur('account.html') + '>' + ICON.box + 'My orders</a>' +
          '<a href="track-order.html"' + cur('track-order.html') + '>' + ICON.truck + 'Track order</a>' +
          '<a href="wishlist.html"' + cur('wishlist.html') + '>' + ICON.heart + 'Wishlist</a>' +
          '<h3>From the farm</h3>' +
          '<a href="video-reels.html"' + cur('video-reels.html') + '>' + ICON.play + 'Farm reels</a>' +
          '<a href="' + (ON_HOME ? '#gallery' : 'index.html#gallery') + '" onclick="NanseiShell.closeDrawer()">' + ICON.leaf + 'Our farm</a>' +
          '<a href="blog.html"' + cur('blog.html') + '>' + ICON.book + 'Journal</a>' +
          '<a href="news.html"' + cur('news.html') + '>' + ICON.book + 'News</a>' +
          '<a href="' + FARM_MAP + '" target="_blank" rel="noopener">' + ICON.map + 'Map</a>' +
          '<a id="mobLogoutLink" class="nsh-logout" href="#" onclick="NanseiShell.logout();return false;">' + ICON.out + 'Log out</a>' +
          '<a class="nsh-wa" id="nshDrawerWa" href="https://wa.me/916382142578" target="_blank" rel="noopener">' + ICON.wa + 'Chat with us on WhatsApp</a>' +
          '</div></div>';

        if (bottomBar) {
          h += '<nav class="nsh-bar nsh-r" id="nshBar" aria-label="Quick links">' +
            '<a href="index.html"' + cur('index.html') + '><span class="nsh-iw">' + ICON.home + '</span>Home</a>' +
            '<a href="#" onclick="NanseiShell.toggleDrawer(true);return false;"><span class="nsh-iw">' + ICON.grid + '</span>Categories</a>' +
            '<a href="video-reels.html"' + cur('video-reels.html') + '><span class="nsh-iw">' + ICON.play + '</span>Reels</a>' +
            '<a href="' + FARM_MAP + '" target="_blank" rel="noopener"><span class="nsh-iw">' + ICON.map + '</span>Map</a>' +
            '<a href="account.html"' + cur('account.html') + '><span class="nsh-iw">' + ICON.user + '</span>Account</a>' +
            '<a href="#" onclick="NanseiShell.openCart();return false;"><span class="nsh-iw">' + ICON.cart + '<span class="nsh-bbadge" id="mobBarCartCount">0</span></span>Cart</a>' +
            '</nav>';
        }
        return h;
      },

      footer: function () {
        var P = function (icon, t, s) { return '<div><i>' + icon + '</i><p><b>' + t + '</b><span>' + s + '</span></p></div>'; };
        return '' +
          '<footer id="site-footer" class="nsh-foot nsh-r">' +
          '<div class="nsh-fpromise"><div class="nsh-in">' +
          P(ICON.leaf, 'Grown on our farm', 'Achankulam, near Srivilliputhur') +
          P(ICON.truck, 'Free delivery', '<span id="nshFreeAbove">On orders above ₹999</span>') +
          P(ICON.box, '7-day replacement', 'For damaged or wrong items') +
          P(ICON.cart, 'Secure payment', 'UPI, cards, net banking, COD') +
          '</div></div>' +
          '<div class="nsh-in nsh-fgrid">' +
          '<div>' +
          '<img class="nsh-flogo" loading="lazy" decoding="async" src="nansei_org_logo.svg" alt="Nansei Organics"/>' +
          '<p class="nsh-fabout">Heritage rice, sun-dried flowers and stone-ground flours, grown and packed on our own farm in Tamil Nadu.</p>' +
          '<div class="nsh-fpay"><span>UPI</span><span>CARDS</span><span>NET BANKING</span><span>COD</span></div>' +
          '</div>' +
          '<div><h3>Shop</h3><ul>' +
          CATS.map(function (c) { return '<li><a href="' + catHref(c[0]) + '" onclick="return NanseiShell.goCat(\'' + c[0] + '\')">' + c[1] + '</a></li>'; }).join('') +
          '</ul></div>' +
          '<div><h3>Help</h3><ul>' +
          '<li><a href="track-order.html"' + cur('track-order.html') + '>Track your order</a></li>' +
          '<li><a href="account.html">My orders</a></li>' +
          '<li><a href="refund-policy.html">Returns &amp; refunds</a></li>' +
          '<li><a href="privacy-policy.html">Privacy policy</a></li>' +
          '<li><a href="terms-and-conditions.html">Terms &amp; conditions</a></li>' +
          '</ul></div>' +
          '<div><h3>Contact</h3><ul id="nshContact">' +
          '<li><a id="nshWhatsapp" href="https://wa.me/916382142578" target="_blank" rel="noopener">WhatsApp us</a></li>' +
          '<li><span id="nshAddress">Achankulam, Tamil Nadu, India</span></li>' +
          '<li id="nshFssai" style="display:none"></li>' +
          '<li id="nshSocial" style="display:none"></li>' +
          '<li><a href="video-reels.html">Farm reels</a> &middot; <a href="blog.html">Journal</a> &middot; <a href="news.html">News</a></li>' +
          '</ul></div>' +
          '</div>' +
          '<div class="nsh-fbottom"><div class="nsh-in">' +
          '<span>&copy; ' + new Date().getFullYear() + ' Nansei Organics. All rights reserved.</span>' +
          '<nav aria-label="Legal"><a href="privacy-policy.html">Privacy</a><a href="terms-and-conditions.html">Terms</a><a href="refund-policy.html">Refunds</a></nav>' +
          '</div></div>' +
          '</footer>';
      },

      /* ---- behaviour ---- */
      search: function (q) {
        q = (q || '').trim();
        if (ON_HOME && typeof window.doSearch === 'function') {
          var a = document.getElementById('searchInput'), b = document.getElementById('mobSearchInput');
          if (a) a.value = q;
          if (b) b.value = q;
          window.doSearch();
          return;
        }
        location.href = 'index.html' + (q ? '?search=' + encodeURIComponent(q) : '#products');
      },
      suggest: function (input) {
        if (typeof window.handleSearchInput === 'function') window.handleSearchInput(input);
      },
      wireSearch: function () {
        ['searchInput', 'mobSearchInput'].forEach(function (id) {
          var input = document.getElementById(id);
          if (!input || input._nshSearchWired) return;
          input._nshSearchWired = true;
          input.addEventListener('input', function () { Shell.suggest(input); });
          input.addEventListener('keydown', function (event) {
            if (event.key === 'Enter') { event.preventDefault(); Shell.search(input.value); }
          });
        });
        document.querySelectorAll('.nsh-search .nsh-sbtn,.nsh-wrap .nsh-sbtn').forEach(function (button) {
          if (button._nshSearchWired) return;
          button._nshSearchWired = true;
          button.addEventListener('click', function () {
            var input = button.parentElement && button.parentElement.querySelector('input[type="search"],input[type="text"]');
            if (input) Shell.search(input.value);
          });
        });
        if (!document._nshSuggestionWired) {
          document._nshSuggestionWired = true;
          document.addEventListener('click', function (event) {
            var item = event.target.closest && event.target.closest('.suggestion-item[data-product-id]');
            if (item && typeof window.selectSearchSuggestion === 'function') {
              window.selectSearchSuggestion(item.getAttribute('data-product-id'));
            }
          });
        }
      },
      /* category links: filter in place on the home page, otherwise go there */
      goCat: function (cat) {
        Shell.toggleCats(false);
        if (!ON_HOME) return true;
        var pill = document.querySelector('#filterTabs .fpill[data-cat="' + cat + '"]');
        if (pill && typeof window.deskCatClick === 'function') { window.deskCatClick(pill, cat); history.replaceState(null, '', '#shop-' + cat); return false; }
        return true;
      },
      toggleCats: function (force) {
        var m = document.getElementById('nshCatMenu'), b = document.getElementById('nshCatBtn');
        if (!m) return;
        var open = typeof force === 'boolean' ? force : !m.classList.contains('open');
        m.classList.toggle('open', open);
        if (b) b.setAttribute('aria-expanded', open ? 'true' : 'false');
      },
      openCart: function () {
        if (typeof window.openCart === 'function') window.openCart();
        else location.href = 'checkoutmyorderpage.html';
      },
      toggleDrawer: function (force) {
        var d = document.getElementById('mobDrawer'), ham = document.getElementById('mobHam');
        if (!d) return;
        var open = typeof force === 'boolean' ? force : d.style.display !== 'block';
        d.style.display = open ? 'block' : 'none';
        if (ham) { ham.classList.toggle('open', open); ham.setAttribute('aria-expanded', open ? 'true' : 'false'); }
        document.body.style.overflow = open ? 'hidden' : '';
      },
      closeDrawer: function () { Shell.toggleDrawer(false); },
      logout: function () {
        if (window.Auth && typeof window.Auth.logout === 'function') { window.Auth.logout('index.html'); return; }
        ['nansai_token', 'nansai_user'].forEach(function (k) { localStorage.removeItem(k); sessionStorage.removeItem(k); });
        location.href = 'index.html';
      },
      updateCounts: function () {
        var cart = readJSON('cart', []), wish = readJSON('wishlist', []);
        var c = 0;
        for (var i = 0; i < cart.length; i++) c += Number(cart[i] && cart[i].qty) || 1;
        document.querySelectorAll('#cartCount,#mobBarCartCount').forEach(function (el) { el.textContent = c; el.style.display = c ? '' : 'none'; });
        document.querySelectorAll('#wishlistCount').forEach(function (el) { el.textContent = wish.length; el.style.display = wish.length ? '' : 'none'; });
      },
      /* WhatsApp, address, offers, FSSAI number and social links from the admin's store settings */
      applySettings: function (st) {
        if (!st) return;
        var c = st.contact || {}, set = function (id, fn) { var el = document.getElementById(id); if (el) fn(el); };
        var wa = c.whatsapp ? 'https://wa.me/' + String(c.whatsapp).replace(/\D/g, '') : '';
        if (wa) ['nshWhatsapp', 'nshTopWa', 'nshDrawerWa'].forEach(function (id) { set(id, function (el) { el.href = wa; }); });
        if (c.address) set('nshAddress', function (el) { el.textContent = c.address; });
        var sh = st.shipping || {};
        if (sh.freeShippingAbove > 0) set('nshFreeAbove', function (el) { el.textContent = 'On orders above ₹' + Number(sh.freeShippingAbove).toLocaleString('en-IN'); });
        var ann = st.announcement || {};
        var items = (ann.items || []).filter(function (i) { return i && i.text; });
        if (ann.enabled === false) set('nshAnn', function (el) { el.style.visibility = 'hidden'; });
        else if (items.length) set('nshAnn', function (el) {
          var k = 0, show = function () { var i = items[k % items.length]; el.innerHTML = (i.link ? '<a href="' + esc(i.link) + '">' : '') + esc(i.text) + (i.code ? ' &middot; code <b>' + esc(i.code) + '</b>' : '') + (i.link ? '</a>' : ''); k++; };
          show(); if (items.length > 1 && !el._t) el._t = setInterval(show, 4500);
        });
        else if (sh.freeShippingAbove > 0) set('nshAnn', function (el) { el.innerHTML = 'Free delivery on orders above <b>₹' + Number(sh.freeShippingAbove).toLocaleString('en-IN') + '</b> &middot; Packed at our farm in Achankulam'; });
        var lg = st.legal || {};
        if (lg.fssai) set('nshFssai', function (el) { el.textContent = 'FSSAI Lic. No. ' + lg.fssai; el.style.display = ''; });
        var so = st.social || {}, links = [];
        [['instagram', 'Instagram'], ['facebook', 'Facebook'], ['youtube', 'YouTube']].forEach(function (k) {
          if (so[k[0]] && /^https:\/\//i.test(so[k[0]])) links.push('<a href="' + esc(so[k[0]]) + '" target="_blank" rel="noopener">' + k[1] + '</a>');
        });
        if (links.length) set('nshSocial', function (el) { el.innerHTML = links.join(' &middot; '); el.style.display = ''; });
        window.NANSEI_SETTINGS = st;
        try { document.dispatchEvent(new CustomEvent('nansei:settings', { detail: st })); } catch (e) { /* old browsers */ }
      },
      loadSettings: function () {
        try { var cached = JSON.parse(localStorage.getItem('nsh_settings') || 'null'); if (cached) Shell.applySettings(cached); } catch (e) { /* ignore */ }
        var local = ['localhost', '127.0.0.1'].indexOf(location.hostname) >= 0 || location.protocol === 'file:';
        var base = window.API_BASE || (local ? 'http://localhost:5000/api' : '/api');
        fetch(base + '/settings').then(function (r) { return r.json(); }).then(function (d) {
          if (!d || !d.success) return;
          try { localStorage.setItem('nsh_settings', JSON.stringify(d.data)); } catch (e) { /* ignore */ }
          Shell.applySettings(d.data);
        }).catch(function () { /* keep the built-in details */ });
      },
      applyUser: function () {
        var user = readJSON('nansai_user', null);
        var token = localStorage.getItem('nansai_token') || sessionStorage.getItem('nansai_token');
        if (!user || !token) return;
        var first = (user.firstName || user.name || '').split(' ')[0] || 'there';
        var btn = document.getElementById('navSignInBtn'), txt = document.getElementById('navSignInText');
        var mob = document.getElementById('mobSignInLink'), out = document.getElementById('mobLogoutLink');
        if (btn) btn.href = 'account.html';
        if (txt) txt.textContent = 'Hi, ' + first;
        if (mob) { mob.href = 'account.html'; mob.lastChild.textContent = 'Hi, ' + first + ' — your account'; }
        if (out) out.style.setProperty('display', 'flex', 'important');
        if (user.role === 'admin') { var ad = document.getElementById('adminCircleBtn'); if (ad) ad.style.display = 'flex'; }
      }
    };

    /* keep the badges right whenever any page script saves the cart or wishlist */
    try {
      var origSet = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) {
        origSet.apply(this, arguments);
        if (k === 'cart' || k === 'wishlist') setTimeout(Shell.updateCounts, 0);
      };
    } catch (e) { /* ignore */ }
    window.addEventListener('storage', function (e) { if (e.key === 'cart' || e.key === 'wishlist') Shell.updateCounts(); });
    document.addEventListener('click', function (e) {
      var w = document.querySelector('.nsh-catwrap');
      if (w && !w.contains(e.target)) Shell.toggleCats(false);
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { Shell.closeDrawer(); Shell.toggleCats(false); } });
    window.addEventListener('scroll', function () { var h = document.getElementById('siteHeader'); if (h) h.classList.toggle('scrolled', window.scrollY > 10); }, { passive: true });
    /* index.html#shop-rice etc. opens that category on the home page */
    if (ON_HOME && /^#shop-/.test(location.hash)) {
      window.addEventListener('load', function () { setTimeout(function () { Shell.goCat(location.hash.slice(6)); }, 300); });
    }
    /* the home page has its own toggleMobDrawer; give every other page the same name */
    if (typeof window.toggleMobDrawer !== 'function') window.toggleMobDrawer = function () { Shell.toggleDrawer(); };
  }

  var Shell = window.NanseiShell;
  Shell.injectStyle();
  if (part === 'header') {
    var bar = !(script.getAttribute('data-bottom-bar') === 'off');
    script.insertAdjacentHTML('afterend', Shell.header(bar));
    Shell.wireSearch();
    if (bar) document.body.classList.add('nsh-has-bar');
    Shell.updateCounts();
    Shell.applyUser();
  } else if (part === 'footer') {
    script.insertAdjacentHTML('afterend', Shell.footer());
    Shell.loadSettings();
  }
})();
