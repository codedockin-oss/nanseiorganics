// Page audit: loads every page at several viewports in real Chrome and reports
//   - JavaScript errors / failed same-origin requests
//   - horizontal overflow (the classic "mobile page scrolls sideways" bug)
//   - broken or empty images, leftover [[icon:..]] markers, damaged text (?, U+FFFD, gaps)
//   - dead "#" links and (on phones) too many tiny tap targets
// usage: node qa.js [pageFilter] [--shots] [--vw=1440,768,390]
const fs = require('fs');
const path = require('path');
const { PAGES_URL, launch, seedStorage, sleep } = require('./lib');

const args = process.argv.slice(2);
const filter = args.find(a => !a.startsWith('--'));
const shots = args.includes('--shots');
const vwArg = (args.find(a => a.startsWith('--vw=')) || '').slice(5);
const VIEWPORTS = (vwArg ? vwArg.split(',').map(Number) : [1440, 768, 390]).map(w => ({ w, h: w < 500 ? 844 : 900 }));
const PAGES = [
  'index.html', 'shop.html', 'shop.html?cat=rice', 'about.html', 'our-grains.html', 'faq.html', 'shipping.html', 'contact.html', 'bulk-orders.html', 'track-order.html', '404.html', 'product.html?id=1', 'product.html?id=8', 'product.html?id=12', 'wishlist.html',
  'checkout.html', 'checkout.html?page=orders', 'blog.html',
  'login.html', 'reset-password.html?token=demo', 'admin-panel.html',
  'privacy-policy.html', 'refund-policy.html', 'terms-and-conditions.html',
].filter(p => !filter || p.includes(filter));
const NEEDS_LOGIN = /wishlist|checkout|admin/;

/* runs inside the page */
function audit() {
  const out = {};
  out.overflowX = document.documentElement.scrollWidth - innerWidth;
  out.over = [...document.querySelectorAll('body *')].filter(e => {
    const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
    if (!(r.width > 0) || cs.position === 'fixed' || cs.visibility === 'hidden' || cs.display === 'none' || r.right <= innerWidth + 1) return false;
    for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) {          // clipped by a scroll container?
      if (/(hidden|auto|scroll|clip)/.test(getComputedStyle(p).overflowX) && p.getBoundingClientRect().right <= innerWidth + 1) return false;
    }
    return true;
  }).slice(0, 6).map(e => e.tagName + (e.id ? '#' + e.id : '') + '.' + String(e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className).slice(0, 30) + ' r=' + Math.round(e.getBoundingClientRect().right));
  out.brokenImgs = [...document.images].filter(i => i.complete && i.naturalWidth === 0 && i.getAttribute('src')).map(i => i.getAttribute('src').slice(0, 80)).slice(0, 8);
  out.emptyImgs = [...document.images].filter(i => !i.getAttribute('src')).length;
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT), bad = [];
  while (w.nextNode()) {
    const n = w.currentNode, t = n.nodeValue, p = n.parentElement;
    if (!p || ['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA'].includes(p.tagName) || !t.trim()) continue;
    if (/�/.test(t) || /(^|\s)\?(\s|$)|\?\d|^\s*\?|\s\?\s*$|\[\[icon:/.test(t) || /[A-Za-z0-9%.)!]  [A-Za-z(]/.test(t.trim())) bad.push(t.trim().slice(0, 60));
  }
  out.badText = [...new Set(bad)].slice(0, 10);
  // tiny tap targets (elements that enlarge their hit area with ::after are ignored)
  out.smallTap = [...document.querySelectorAll('a[href],button,input:not([type=hidden]),select,textarea,[role=button]')].filter(e => {
    const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
    if (!(r.width > 0 && r.height > 0) || cs.visibility === 'hidden' || cs.display === 'none' || e.offsetParent === null) return false;
    if (e.matches('.rel-wish-btn,.ac-dot,.dot')) return false;
    return r.height < 30 && r.width < 44;
  }).length;
  out.deadLinks = [...document.querySelectorAll('a[href]')].filter(a => ['#', '', 'javascript:void(0)'].includes(a.getAttribute('href'))).map(a => a.textContent.trim().slice(0, 20) || a.getAttribute('aria-label') || 'icon').slice(0, 8);
  out.h1 = document.querySelectorAll('h1').length;
  out.quirks = document.compatMode !== 'CSS1Compat';
  out.noAlt = [...document.images].filter(i => !i.hasAttribute('alt')).length;
  return out;
}

(async () => {
  const browser = await launch();
  fs.mkdirSync(path.join(__dirname, 'shots'), { recursive: true });
  let failures = 0;
  for (const pg of PAGES) {
    for (const vp of VIEWPORTS) {
      const ctx = await browser.createBrowserContext();
      const page = await ctx.newPage();
      await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: 1, isMobile: vp.w < 500, hasTouch: vp.w < 500 });
      const errors = [], failed = [];
      page.on('pageerror', e => errors.push('PAGEERROR ' + String(e.message).slice(0, 160)));
      page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console.error ' + m.text().slice(0, 160)); });
      page.on('response', r => { const u = r.url(); if (r.status() >= 400 && u.startsWith('http://127.0.0.1') && !u.endsWith('/favicon.ico')) failed.push('HTTP' + r.status() + ' ' + u.replace(/^http:\/\/127.0.0.1:\d+/, '')); });
      if (NEEDS_LOGIN.test(pg)) await seedStorage(page, { auth: true });
      let status = 'ok';
      try {
        await page.goto(PAGES_URL + pg, { waitUntil: 'networkidle2', timeout: 45000 });
        await sleep(1200);
        await page.evaluate(async () => { const h = document.documentElement.scrollHeight; for (let y = 0; y < h; y += 500) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 40)); } window.scrollTo(0, 0); });
        await sleep(500);
      } catch (e) { status = 'NAV-FAIL ' + e.message; }
      const res = await page.evaluate(audit).catch(e => ({ auditError: String(e) }));
      if (shots) await page.screenshot({ path: path.join(__dirname, 'shots', pg.replace(/[?=&.]/g, '_') + '_' + vp.w + '.png') }).catch(() => { });
      const problems = [];
      if (status !== 'ok') problems.push(status);
      if (res.auditError) problems.push(res.auditError);
      problems.push(...[...new Set(errors)].slice(0, 6), ...[...new Set(failed)].slice(0, 6));
      if (res.quirks) problems.push('QUIRKS-MODE (check for a BOM/blank line before <!DOCTYPE>)');
      if (res.overflowX > 1) problems.push('H-OVERFLOW ' + res.overflowX + 'px: ' + (res.over || []).join(' | '));
      if (res.brokenImgs && res.brokenImgs.length) problems.push('BROKEN-IMG ' + res.brokenImgs.join(' , '));
      if (res.emptyImgs) problems.push('EMPTY-IMG-SRC x' + res.emptyImgs);
      if (res.badText && res.badText.length) problems.push('TEXT-DAMAGE ' + JSON.stringify(res.badText));
      if (res.deadLinks && res.deadLinks.length) problems.push('DEAD-LINKS ' + JSON.stringify(res.deadLinks));
      if (res.noAlt) problems.push('IMG-WITHOUT-ALT x' + res.noAlt);
      if (vp.w < 500 && res.smallTap > 8) problems.push('SMALL-TAP-TARGETS ' + res.smallTap);
      if (problems.length) { failures++; console.log('x ' + pg + ' @' + vp.w + '\n   ' + problems.join('\n   ')); }
      else console.log('ok ' + pg + ' @' + vp.w);
      await page.close(); await ctx.close();
    }
  }
  await browser.close();
  console.log(failures ? `\n${failures} page/viewport combination(s) with problems` : '\nALL CLEAN');
  process.exit(failures ? 1 : 0);
})();
