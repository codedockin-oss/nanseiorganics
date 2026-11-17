// Mobile layout audit for every storefront/admin page currently in pages/.
// Start the static server first, then run: node mobile-audit.js
const { launch, PAGES_URL, sleep } = require('./lib');

const PAGES = [
  'index.html', 'collection.html', 'product.html?id=2', 'blog.html', 'news.html',
  'wishlist.html', 'account.html', 'checkoutmyorderpage.html', 'login.html',
  'reset-password.html', 'admin-login.html', 'admin-panel.html', 'privacy-policy.html',
  'refund-policy.html', 'terms-and-conditions.html', 'track-order.html',
];
const widthArg = /^\d+$/.test(process.argv[2] || '') ? process.argv[2] : process.argv[3];
const routeFilter = widthArg === process.argv[2] ? '' : (process.argv[2] || '');
const ROUTES = PAGES.filter(route => !routeFilter || route.includes(routeFilter));
const WIDTHS = widthArg ? [Number(widthArg)] : [320, 360, 390, 430];

(async () => {
  const browser = await launch();
  let failures = 0;
  for (const width of WIDTHS) {
    for (const route of ROUTES) {
      const page = await browser.newPage();
      await page.setViewport({ width, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      try {
        if (route === 'admin-panel.html') {
          await page.evaluateOnNewDocument(() => {
            localStorage.setItem('nansai_token', 'mobile-audit-token');
            window.fetch = async url => {
              const data = String(url).includes('/auth/me')
                ? { success: true, user: { name: 'Mobile Audit', email: 'audit@example.com', role: 'admin' } }
                : { success: true, data: [], products: [] };
              return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
            };
          });
        }
        await page.goto(PAGES_URL + route, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await sleep(700);
        if (route === 'index.html') {
          await page.evaluate(() => window.scrollTo(0, document.getElementById('heroSection').getBoundingClientRect().bottom + window.scrollY + 1));
          await sleep(350);
          const previewShown = await page.$eval('.frf', el => el.classList.contains('in')).catch(() => false);
          const viewerAutoOpened = await page.$eval('#frViewer', el => !el.hidden).catch(() => false);
          if (!previewShown) errors.push('side reel preview did not appear after scrolling past the hero');
          if (viewerAutoOpened) errors.push('full-screen reel viewer opened without a tap');
          if (previewShown) {
            await page.click('.frf-card');
            await sleep(100);
            const viewerOpened = await page.$eval('#frViewer', el => !el.hidden).catch(() => false);
            if (!viewerOpened) errors.push('tapping the side preview did not open the reel viewer');
            if (viewerOpened) await page.keyboard.press('Escape');
          }
        }
        const tapAudit = await page.evaluate(async () => {
          const inspect = () => [...document.querySelectorAll('button,input:not([type=hidden]),select,textarea,[role=button],.nsh-bar a')].filter(el => {
            const r = el.getBoundingClientRect(), s = getComputedStyle(el);
            if (!(r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && s.display !== 'none' && s.visibility !== 'hidden' && el.offsetParent !== null)) return false;
            for (let p = el; p && p !== document.body; p = p.parentElement) {
              const ps = getComputedStyle(p);
              if (p.hidden || p.getAttribute('aria-hidden') === 'true' || ps.visibility === 'hidden' || ps.pointerEvents === 'none' || Number(ps.opacity) < .05) return false;
            }
            return r.width < 40 || r.height < 36;
          });
          let max = 0, samples = [];
          for (let y = 0; y <= document.documentElement.scrollHeight; y += Math.max(360, innerHeight * .8)) {
            window.scrollTo(0, y);
            await new Promise(resolve => setTimeout(resolve, 55));
            const small = inspect();
            if (small.length > max) {
              max = small.length;
              samples = small.slice(0, 6).map(el => el.tagName + '.' + String(el.className || '').slice(0, 24) + ' ' + Math.round(el.getBoundingClientRect().width) + 'x' + Math.round(el.getBoundingClientRect().height));
            }
          }
          window.scrollTo(0, 0);
          return { max, samples };
        });
        await sleep(120);
        const result = await page.evaluate(() => {
          const offenders = [...document.querySelectorAll('body *')].filter(el => {
            const r = el.getBoundingClientRect(), s = getComputedStyle(el);
            if (!r.width || s.display === 'none' || s.visibility === 'hidden' || s.position === 'fixed' || r.right <= innerWidth + 1) return false;
            for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
              if (/(hidden|auto|scroll|clip)/.test(getComputedStyle(p).overflowX) && p.getBoundingClientRect().right <= innerWidth + 1) return false;
            }
            return true;
          }).slice(0, 5).map(el => el.tagName + (el.id ? '#' + el.id : '') + '.' + String(el.className || '').slice(0, 24) + ' right=' + Math.round(el.getBoundingClientRect().right));
          return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, offenders };
        });
        const issues = [];
        if (result.scrollWidth > result.width + 1) issues.push('horizontal overflow ' + result.scrollWidth + 'px; ' + result.offenders.join(', '));
        if (tapAudit.max > 5) issues.push(tapAudit.max + ' small controls in one viewport: ' + tapAudit.samples.join(', '));
        if (errors.length) issues.push('JS errors: ' + errors.join(' | ').slice(0, 180));
        if (issues.length) { failures++; console.log('FAIL ' + width + ' ' + route + ' — ' + issues.join('; ')); }
        else console.log('OK   ' + width + ' ' + route);
      } catch (e) {
        failures++;
        console.log('FAIL ' + width + ' ' + route + ' — ' + e.message.slice(0, 160));
      }
      await page.close();
    }
  }
  await browser.close();
  console.log('\nMobile layout issues: ' + failures);
  process.exitCode = failures ? 1 : 0;
})().catch(e => { console.error(e); process.exit(1); });
