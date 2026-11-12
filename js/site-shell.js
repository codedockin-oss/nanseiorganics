/*
 * Shared header, mobile menu, mobile bottom bar and footer for every storefront page.
 * Use:  <script src="../js/site-shell.js" data-part="header"></script>   (top of <body>)
 *       <script src="../js/site-shell.js" data-part="footer"></script>   (end of <body>)
 * Optional on the header tag: data-bottom-bar="off" for pages that already have their own sticky bar.
 *
 * It keeps the element ids the pages already use (searchInput, cartCount, wishlistCount, mobDrawer, ...)
 * so page scripts that update counts, show search suggestions or open the cart drawer keep working.
 */
(function () {
  var script = document.currentScript;
  var part = script && script.getAttribute('data-part');

  if (!window.NanseiShell) {
    var PAGE = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    var ON_HOME = PAGE === 'index.html' || PAGE === '';

    var ICON = {
      search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
      bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>',
      user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
      heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.8 4.6c-1.5-1.6-4-1.6-5.6 0L12 7.8 8.8 4.6c-1.5-1.6-4-1.6-5.6 0-1.6 1.7-1.6 4.3 0 6l8.8 9 8.8-9c1.6-1.7 1.6-4.3 0-6z"/></svg>',
      cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 002 1.58h9.78a2 2 0 001.95-1.57l1.65-7.43H5.12"/></svg>',
      home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
      shop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 9h18l-1.5 11a2 2 0 01-2 2h-11a2 2 0 01-2-2z"/><path d="M8 9V6a4 4 0 018 0v3"/></svg>',
      book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>',
      news: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 22h16a2 2 0 002-2V4a2 2 0 00-2-2H8a2 2 0 00-2 2v16a2 2 0 01-2 2zm0 0a2 2 0 01-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8z"/></svg>',
      leaf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 20A7 7 0 019.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>',
      box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><path d="M3.3 7L12 12l8.7-5"/><path d="M12 22V12"/></svg>',
      out: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>'
    };

    var CSS = [
      '.nsh-r button,.nsh-r input,.nsh-r img,.nsh-r p,.nsh-r ul,.nsh-r li,.nsh-r a,.nsh-r h3,.nsh-r span,.nsh-r nav,.nsh-r label{margin:0;padding:0;width:auto;height:auto;min-height:0;max-width:none;border:0;border-radius:0;background:none;box-shadow:none;font:inherit;color:inherit;letter-spacing:inherit;text-transform:none;text-align:left;float:none}',
      ':root{--nsh-forest-deep:#0f2218;--nsh-forest:#1a3a2a;--nsh-leaf:#4a8c5c;--nsh-gold-dk:#b8922a;--nsh-gold-lt:#e8c97a;--nsh-text-md:#3d5a45;--nsh-h:68px}',
      '.nsh-nav,.nsh-nav *,.nsh-drawer,.nsh-drawer *,.nsh-msearch,.nsh-msearch *,.nsh-bar,.nsh-bar *,.nsh-foot,.nsh-foot *{box-sizing:border-box}',
      '.nsh-nav{position:sticky;top:0;z-index:1000;background:#fff;border-bottom:1px solid rgba(26,58,42,.12);height:var(--nsh-h);font-family:"Inter",system-ui,sans-serif;line-height:1.2}',
      '.nsh-r .nsh-inner{max-width:1400px;margin:0 auto;display:flex;align-items:center;height:100%;padding:0 1.75rem;gap:1.25rem}',
      '.nsh-r .nsh-logo{flex-shrink:0;display:flex;align-items:center;text-decoration:none;order:1}',
      '.nsh-r .nsh-logo img{height:64px;width:auto;object-fit:contain;display:block}',
      '.nsh-r .nsh-search{position:relative;flex:1 1 260px;max-width:340px;min-width:220px;order:3}',
      '.nsh-r .nsh-search:focus-within{z-index:1002}',
      '.nsh-r .nsh-search input,.nsh-msearch input{width:100%;margin:0;padding:.5rem 2.6rem .5rem 1rem;background:#f0faf2;border:1px solid rgba(26,58,42,.15);border-radius:8px;font:400 .79rem/1.3 "Inter",system-ui,sans-serif;color:var(--nsh-forest-deep);outline:none;transition:background .2s,border-color .2s}',
      '.nsh-r .nsh-search input:focus,.nsh-msearch input:focus{background:#fff;border-color:var(--nsh-leaf)}',
      '.nsh-r .nsh-sbtn{position:absolute;right:.3rem;top:50%;transform:translateY(-50%);width:1.9rem;height:1.9rem;background:var(--nsh-gold-dk);border:none;border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--nsh-forest-deep);padding:0}',
      '.nsh-r .nsh-sbtn:hover{background:var(--nsh-gold-lt)}',
      '.nsh-r .nsh-sbtn svg{width:13px;height:13px}',
      '.nsh-nav .search-suggestions,.nsh-msearch .search-suggestions{display:none;position:absolute;top:calc(100% + 8px);left:0;right:0;background:#fff;border:1px solid rgba(26,58,42,.14);border-radius:12px;box-shadow:0 14px 34px rgba(10,30,15,.16);overflow:hidden;z-index:1200}',
      '.nsh-nav .search-suggestions.show,.nsh-msearch .search-suggestions.show{display:block}',
      '.nsh-r .nsh-links{display:flex;align-items:stretch;height:100%;list-style:none;margin:0;padding:0;order:2}',
      '.nsh-r .nsh-links li{display:flex;align-items:center;height:100%;margin:0}',
      '.nsh-r .nsh-link{position:relative;display:flex;align-items:center;height:100%;padding:0 .85rem;font:600 .79rem/1 "Inter",system-ui,sans-serif;letter-spacing:.02em;color:var(--nsh-forest-deep);text-decoration:none;white-space:nowrap;transition:color .2s}',
      '.nsh-r .nsh-link:hover,.nsh-r .nsh-link[aria-current="page"]{color:var(--nsh-leaf)}',
      '.nsh-r .nsh-link::after{content:"";position:absolute;bottom:0;left:50%;right:50%;height:2px;background:var(--nsh-gold-dk);transition:left .24s ease,right .24s ease}',
      '.nsh-r .nsh-link:hover::after,.nsh-r .nsh-link[aria-current="page"]::after{left:.7rem;right:.7rem}',
      '.nsh-r .nsh-actions{display:flex;align-items:center;gap:.7rem;margin-left:auto;flex-shrink:0;order:4}',
      '.nsh-r .nsh-divider{width:1px;height:18px;background:rgba(26,58,42,.15);flex-shrink:0}',
      '.nsh-r .nsh-orders{display:flex;align-items:center;gap:.35rem;font:600 .65rem/1 "Inter",system-ui,sans-serif;letter-spacing:.07em;text-transform:uppercase;color:var(--nsh-forest-deep);text-decoration:none;padding:.38rem .7rem;border:1px solid rgba(26,58,42,.2);border-radius:6px;white-space:nowrap;transition:all .2s}',
      '.nsh-r .nsh-orders svg{width:14px;height:14px}',
      '.nsh-r .nsh-orders:hover{color:var(--nsh-leaf);border-color:var(--nsh-leaf)}',
      '.nsh-r .nsh-icon{position:relative;display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:50%;border:none;cursor:pointer;background:none;color:var(--nsh-forest-deep);text-decoration:none;padding:0;transition:color .2s,background .2s}',
      '.nsh-r .nsh-icon svg{width:19px;height:19px}',
      '.nsh-r .nsh-icon:hover{color:var(--nsh-leaf);background:rgba(74,140,92,.08)}',
      '.nsh-r .nsh-account{width:auto;gap:5px;padding:0 8px;border-radius:20px}',
      '.nsh-r .nsh-account span{font:700 .72rem/1 "Inter",system-ui,sans-serif;color:var(--nsh-forest-deep)}',
      '.nsh-r .nsh-badge{position:absolute;top:-2px;right:-2px;background:#ef4444;color:#fff;font:800 .56rem/1 "Inter",system-ui,sans-serif;min-width:15px;height:15px;padding:0 3px;border-radius:30px;display:flex;align-items:center;justify-content:center;border:2px solid #fff;pointer-events:none}',
      '.nsh-r .nsh-admin{display:none;width:34px;height:34px;border-radius:50%;background:#2563eb;color:#fff;font:800 .65rem/1 "Inter",system-ui,sans-serif;align-items:center;justify-content:center;text-decoration:none;flex-shrink:0}',
      '.nsh-r .nsh-ham{display:none;background:none;border:none;cursor:pointer;flex-direction:column;gap:5px;padding:3px;flex-shrink:0}',
      '.nsh-r .nsh-ham span{display:block;width:22px;height:2px;background:var(--nsh-forest-deep);border-radius:2px;transition:all .3s}',
      '.nsh-r .nsh-ham.open span:nth-child(1){transform:rotate(45deg) translate(5px,5px)}',
      '.nsh-r .nsh-ham.open span:nth-child(2){opacity:0}',
      '.nsh-r .nsh-ham.open span:nth-child(3){transform:rotate(-45deg) translate(5px,-5px)}',
      '.nsh-drawer{display:none;position:fixed;top:var(--nsh-h);left:0;right:0;bottom:0;background:#fff;z-index:999;overflow-y:auto;padding:1.25rem 1.25rem 5rem;border-top:1px solid rgba(26,58,42,.1);font-family:"Inter",system-ui,sans-serif}',
      '.nsh-drawer a{display:flex;align-items:center;gap:.7rem;padding:.85rem 1rem;font-size:.9rem;font-weight:600;color:var(--nsh-forest-deep);text-decoration:none;border-radius:10px}',
      '.nsh-drawer a:hover,.nsh-drawer a[aria-current="page"]{background:#f0faf2}',
      '.nsh-drawer a svg{width:18px;height:18px;flex-shrink:0;color:var(--nsh-text-md)}',
      '.nsh-drawer hr{border:none;border-top:1px solid rgba(26,58,42,.08);margin:.5rem 0}',
      '.nsh-drawer .nsh-logout{display:none;color:#dc2626}',
      '.nsh-drawer .nsh-logout svg{color:#dc2626}',
      '.nsh-msearch{display:none;background:#fefce9;border-bottom:1px solid rgba(26,58,42,.08);padding:.5rem .85rem .6rem}',
      '.nsh-msearch .nsh-wrap{position:relative}',
      '.nsh-msearch input{font-size:16px;padding:.6rem 2.8rem .6rem 1rem;border-radius:10px;background:#fff}',
      '.nsh-bar{display:none;position:fixed;bottom:0;left:0;right:0;z-index:1080;background:#fff;border-top:1px solid rgba(26,58,42,.1);box-shadow:0 -4px 20px rgba(10,30,15,.1);padding:.45rem .5rem calc(.45rem + env(safe-area-inset-bottom,0px));font-family:"Inter",system-ui,sans-serif}',
      '.nsh-bar a{position:relative;display:flex;flex-direction:column;align-items:center;gap:3px;flex:1;padding:.3rem .2rem;color:var(--nsh-text-md);text-decoration:none;font-size:.58rem;font-weight:600;letter-spacing:.04em;border-radius:10px;-webkit-tap-highlight-color:transparent}',
      '.nsh-bar a svg{width:20px;height:20px}',
      '.nsh-bar a[aria-current="page"]{color:var(--nsh-forest-deep)}',
      '.nsh-bar a[aria-current="page"]::before{content:"";position:absolute;bottom:2px;left:50%;transform:translateX(-50%);width:4px;height:4px;border-radius:50%;background:var(--nsh-forest-deep)}',
      '.nsh-bar .nsh-iw{position:relative;display:flex}',
      '.nsh-bar .nsh-bbadge{position:absolute;top:-4px;right:-7px;background:#ef4444;color:#fff;font-size:.48rem;font-weight:800;min-width:14px;height:14px;padding:0 3px;border-radius:20px;display:flex;align-items:center;justify-content:center;border:1.5px solid #fff;line-height:1}',
      '@media(max-width:1180px) and (min-width:769px){.nsh-r .nsh-inner{padding:0 1rem;gap:.75rem}.nsh-r .nsh-links{display:none}.nsh-r .nsh-search{max-width:none;min-width:260px}.nsh-r .nsh-actions{gap:.45rem}}',
      '@media(max-width:768px){:root{--nsh-h:58px}.nsh-r .nsh-inner{padding:0 1rem;gap:.6rem}.nsh-r .nsh-links,.nsh-r .nsh-search,.nsh-r .nsh-orders,.nsh-r .nsh-divider{display:none}.nsh-r .nsh-ham{display:flex}.nsh-msearch{display:block}.nsh-r .nsh-logo img{height:48px}.nsh-r .nsh-icon{width:32px;height:32px}.nsh-r .nsh-icon svg{width:17px;height:17px}.nsh-r .nsh-account span{display:none}.nsh-bar{display:flex;align-items:center;justify-content:space-around;gap:.25rem}body.nsh-has-bar{padding-bottom:64px}}',
      /* footer (same look as the home page footer) */
      '.nsh-foot{background:#111827;color:#d1d5db;font-family:"Inter",system-ui,sans-serif;line-height:1.5}',
      '.nsh-r .nsh-fgrid{max-width:80rem;margin:0 auto;padding:3.5rem 1.5rem;display:grid;grid-template-columns:repeat(4,1fr);gap:2.5rem}',
      '.nsh-foot img{height:56px;width:auto;object-fit:contain;margin-bottom:.5rem;filter:brightness(0) invert(1)}',
      '.nsh-r .nsh-ftag{font-size:.52rem;letter-spacing:.16em;text-transform:uppercase;color:#6b7280;margin:0 0 .85rem}',
      '.nsh-foot p{margin:0}',
      '.nsh-r .nsh-fabout{color:#9ca3af;font-size:.875rem;line-height:1.65}',
      '.nsh-foot h3{font-family:"Inter",system-ui,sans-serif;font-weight:700;color:#fff;font-size:1rem;margin:0 0 1.25rem}',
      '.nsh-foot ul{list-style:none;margin:0;padding:0}',
      '.nsh-foot li{margin:0 0 .75rem;font-size:.875rem}',
      '.nsh-foot a{color:#9ca3af;text-decoration:none;transition:color .2s}',
      '.nsh-foot a:hover{color:#4ade80}',
      '.nsh-r .nsh-fbottom{border-top:1px solid #1f2937;padding:1.25rem 1rem}',
      '.nsh-r .nsh-fbottom div{max-width:1200px;margin:0 auto;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;font-size:.75rem;color:#6b7280}',
      '.nsh-r .nsh-fbottom nav{display:flex;flex-wrap:wrap;gap:16px}',
      '.nsh-r .nsh-fbottom a{color:#6b7280}',
      '@media(max-width:1023px){.nsh-r .nsh-fgrid{grid-template-columns:1fr 1fr}}',
      '@media(max-width:768px){.nsh-r .nsh-fgrid{gap:1.5rem;padding:2rem 1.25rem}.nsh-r .nsh-fgrid>div:first-child,.nsh-r .nsh-fgrid>div:last-child{grid-column:1/-1}}'
    ].join('\n');

    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function readJSON(k, d) { try { return JSON.parse(localStorage.getItem(k) || 'null') || d; } catch (e) { return d; } }
    function cur(page) { return PAGE === page ? ' aria-current="page"' : ''; }

    var Shell = window.NanseiShell = {
      injectStyle: function () {
        if (document.getElementById('nsh-style')) return;
        var st = document.createElement('style');
        st.id = 'nsh-style';
        st.textContent = CSS;
        document.head.appendChild(st);
        if (!document.querySelector('link[href*="family=Inter"]')) {
          var l = document.createElement('link');
          l.rel = 'stylesheet';
          l.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap';
          document.head.appendChild(l);
        }
      },

      header: function (bottomBar) {
        var shop = ON_HOME ? '#products' : 'index.html#products';
        var farm = ON_HOME ? '#gallery' : 'index.html#gallery';
        var promise = ON_HOME ? '#why-section' : 'index.html#why-section';
        var h = '' +
          '<header class="nsh-nav nsh-r" id="siteHeader">' +
          '<div class="nsh-inner">' +
          '<a class="nsh-logo" href="index.html" aria-label="Nansai Organics home"><img src="nansei_org_logo.svg" alt="Nansai Organics"/></a>' +
          '<div class="nsh-search" role="search">' +
          '<input id="searchInput" type="text" placeholder="Search products..." autocomplete="off" aria-label="Search products" onkeydown="if(event.key===\'Enter\')NanseiShell.search(this.value)" oninput="NanseiShell.suggest(this)"/>' +
          '<button type="button" class="nsh-sbtn" aria-label="Search" onclick="NanseiShell.search(document.getElementById(\'searchInput\').value)">' + ICON.search + '</button>' +
          '<div id="searchSuggestions" class="search-suggestions"></div>' +
          '</div>' +
          '<ul class="nsh-links">' +
          '<li><a class="nsh-link" href="' + shop + '">Shop</a></li>' +
          '<li><a class="nsh-link" href="' + farm + '">Farm</a></li>' +
          '<li><a class="nsh-link" href="' + promise + '">Our Promise</a></li>' +
          '<li><a class="nsh-link" href="blog.html"' + cur('blog.html') + '>Blog</a></li>' +
          '<li><a class="nsh-link" href="news.html"' + cur('news.html') + '>News</a></li>' +
          '</ul>' +
          '<div class="nsh-actions">' +
          '<a href="checkoutmyorderpage.html?page=orders" class="nsh-orders">' + ICON.bag + 'My Orders</a>' +
          '<a id="adminCircleBtn" class="nsh-admin" href="admin-panel.html" title="Admin panel">AD</a>' +
          '<span class="nsh-divider"></span>' +
          '<a id="navSignInBtn" href="login.html" class="nsh-icon nsh-account">' + ICON.user + '<span id="navSignInText">Sign In</span></a>' +
          '<a href="wishlist.html" class="nsh-icon" aria-label="Wishlist">' + ICON.heart + '<span class="nsh-badge" id="wishlistCount">0</span></a>' +
          '<button type="button" class="nsh-icon" aria-label="Cart" onclick="NanseiShell.openCart()">' + ICON.cart + '<span class="nsh-badge" id="cartCount">0</span></button>' +
          '<button type="button" class="nsh-ham" id="mobHam" aria-label="Open menu" aria-controls="mobDrawer" aria-expanded="false" onclick="NanseiShell.toggleDrawer()"><span></span><span></span><span></span></button>' +
          '</div></div></header>' +

          '<div id="mobDrawer" class="nsh-drawer nsh-r" style="display:none">' +
          '<a href="index.html"' + cur('index.html') + '>' + ICON.home + 'Home</a>' +
          '<a href="' + shop + '" onclick="NanseiShell.closeDrawer()">' + ICON.shop + 'Shop</a>' +
          '<a href="' + farm + '" onclick="NanseiShell.closeDrawer()">' + ICON.leaf + 'Our Farm</a>' +
          '<a href="blog.html"' + cur('blog.html') + '>' + ICON.book + 'Blog</a>' +
          '<a href="news.html"' + cur('news.html') + '>' + ICON.news + 'News</a>' +
          '<hr/>' +
          '<a id="mobSignInLink" href="login.html">' + ICON.user + '<span>Sign In</span></a>' +
          '<a href="checkoutmyorderpage.html?page=orders">' + ICON.box + 'My Orders</a>' +
          '<a href="wishlist.html"' + cur('wishlist.html') + '>' + ICON.heart + 'Wishlist</a>' +
          '<a href="#" onclick="NanseiShell.closeDrawer();NanseiShell.openCart();return false;">' + ICON.cart + 'Cart</a>' +
          '<a id="mobLogoutLink" class="nsh-logout" href="#" onclick="NanseiShell.logout();return false;">' + ICON.out + 'Log out</a>' +
          '</div>' +

          '<div class="nsh-msearch nsh-r" role="search"><div class="nsh-wrap">' +
          '<input id="mobSearchInput" type="search" placeholder="Search products..." autocomplete="off" enterkeyhint="search" aria-label="Search products" oninput="NanseiShell.suggest(this)" onkeydown="if(event.key===\'Enter\')NanseiShell.search(this.value)"/>' +
          '<button type="button" class="nsh-sbtn" aria-label="Search" onclick="NanseiShell.search(document.getElementById(\'mobSearchInput\').value)">' + ICON.search + '</button>' +
          '<div id="mobSearchSuggestions" class="search-suggestions"></div>' +
          '</div></div>';

        if (bottomBar) {
          h += '<nav class="nsh-bar nsh-r" id="nshBar" aria-label="Quick links">' +
            '<a href="index.html"' + cur('index.html') + '><span class="nsh-iw">' + ICON.home + '</span>Home</a>' +
            '<a href="' + shop + '"><span class="nsh-iw">' + ICON.shop + '</span>Shop</a>' +
            '<a href="blog.html"' + cur('blog.html') + '><span class="nsh-iw">' + ICON.book + '</span>Blog</a>' +
            '<a href="news.html"' + cur('news.html') + '><span class="nsh-iw">' + ICON.news + '</span>News</a>' +
            '<a href="#" onclick="NanseiShell.openCart();return false;"><span class="nsh-iw">' + ICON.cart + '<span class="nsh-bbadge" id="mobBarCartCount">0</span></span>Cart</a>' +
            '</nav>';
        }
        return h;
      },

      footer: function () {
        var shop = ON_HOME ? '#products' : 'index.html#products';
        var farm = ON_HOME ? '#gallery' : 'index.html#gallery';
        return '' +
          '<footer id="site-footer" class="nsh-foot nsh-r">' +
          '<div class="nsh-fgrid">' +
          '<div>' +
          '<img loading="lazy" decoding="async" src="nansei_org_logo.svg" alt="Nansai Organics"/>' +
          '<p class="nsh-ftag">Experience the Root of Nature</p>' +
          '<p class="nsh-fabout">Heritage rice, sun-dried flowers and stone-ground flours, grown and packed on our own farm in Tamil Nadu.</p>' +
          '</div>' +
          '<div><h3>Shop</h3><ul>' +
          '<li><a href="index.html">Home</a></li>' +
          '<li><a href="' + shop + '">All products</a></li>' +
          '<li><a href="' + farm + '">Our farm</a></li>' +
          '<li><a href="blog.html">Blog</a></li>' +
          '<li><a href="news.html">News</a></li>' +
          '</ul></div>' +
          '<div><h3>Customer Service</h3><ul>' +
          '<li><a href="checkoutmyorderpage.html?page=orders">Track your order</a></li>' +
          '<li><a href="refund-policy.html">Returns &amp; refunds</a></li>' +
          '<li><a href="privacy-policy.html">Privacy policy</a></li>' +
          '<li><a href="terms-and-conditions.html">Terms &amp; conditions</a></li>' +
          '</ul></div>' +
          '<div><h3>Contact Us</h3><ul id="nshContact">' +
          '<li><a id="nshEmail" href="mailto:athanyanis@gmail.com">athanyanis@gmail.com</a></li>' +
          '<li><a id="nshPhone" href="tel:+916382142578">+91 63821 42578</a></li>' +
          '<li><a id="nshWhatsapp" href="https://wa.me/916382142578" target="_blank" rel="noopener">WhatsApp us</a></li>' +
          '<li><span id="nshAddress" style="color:#9ca3af">Tamil Nadu, India</span></li>' +
          '<li id="nshFssai" style="display:none;color:#9ca3af"></li>' +
          '<li id="nshGrievance" style="display:none;color:#9ca3af"></li>' +
          '<li id="nshSocial" style="display:none"></li>' +
          '</ul></div>' +
          '</div>' +
          '<div class="nsh-fbottom"><div>' +
          '<span>&copy; ' + new Date().getFullYear() + ' NANSEI Organics. All rights reserved.</span>' +
          '<nav aria-label="Legal"><a href="privacy-policy.html">Privacy Policy</a><a href="terms-and-conditions.html">Terms &amp; Conditions</a><a href="refund-policy.html">Refund Policy</a></nav>' +
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
        document.querySelectorAll('#cartCount,#mobBarCartCount').forEach(function (el) { el.textContent = c; });
        document.querySelectorAll('#wishlistCount').forEach(function (el) { el.textContent = wish.length; });
      },
      /* contact details, FSSAI number and social links from the admin's store settings */
      applySettings: function (st) {
        if (!st || !st.contact) return;
        var c = st.contact, set = function (id, fn) { var el = document.getElementById(id); if (el) fn(el); };
        if (c.email) set('nshEmail', function (el) { el.href = 'mailto:' + c.email; el.textContent = c.email; });
        if (c.phone) set('nshPhone', function (el) { el.href = 'tel:' + c.phone.replace(/[^\d+]/g, ''); el.textContent = c.phone; });
        if (c.whatsapp) set('nshWhatsapp', function (el) { el.href = 'https://wa.me/' + String(c.whatsapp).replace(/\D/g, ''); });
        if (c.address) set('nshAddress', function (el) { el.textContent = c.address; });
        if (st.legal && st.legal.fssai) set('nshFssai', function (el) { el.textContent = 'FSSAI Lic. No. ' + st.legal.fssai; el.style.display = ''; });
        var lg = st.legal || {};
        if (lg.grievanceName && (lg.grievanceEmail || lg.grievancePhone)) set('nshGrievance', function (el) {
          el.innerHTML = 'Grievance officer: ' + esc(lg.grievanceName) + (lg.grievanceEmail ? ', <a href="mailto:' + esc(lg.grievanceEmail) + '">' + esc(lg.grievanceEmail) + '</a>' : '') + (lg.grievancePhone ? ', ' + esc(lg.grievancePhone) : '');
          el.style.display = '';
        });
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
        if (mob) { mob.href = 'account.html'; mob.lastChild.textContent = 'Hi, ' + first; }
        if (out) out.style.display = 'flex';
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
      var d = document.getElementById('mobDrawer'), ham = document.getElementById('mobHam');
      if (d && d.style.display === 'block' && !d.contains(e.target) && ham && !ham.contains(e.target)) Shell.closeDrawer();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') Shell.closeDrawer(); });
    /* the home page has its own toggleMobDrawer; give every other page the same name */
    if (typeof window.toggleMobDrawer !== 'function') window.toggleMobDrawer = function () { Shell.toggleDrawer(); };
  }

  var Shell = window.NanseiShell;
  Shell.injectStyle();
  if (part === 'header') {
    var bar = !(script.getAttribute('data-bottom-bar') === 'off');
    script.insertAdjacentHTML('afterend', Shell.header(bar));
    if (bar) document.body.classList.add('nsh-has-bar');
    Shell.updateCounts();
    Shell.applyUser();
  } else if (part === 'footer') {
    script.insertAdjacentHTML('afterend', Shell.footer());
    Shell.loadSettings();
  }
})();
