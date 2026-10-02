// End-to-end user flows in real Chrome against the static site + mock API.
// usage: node flows.js [nameFilter]
const { PAGES_URL, API_PORT, launch, seedStorage, sleep } = require('./lib');

const filter = process.argv[2];
let browser;
const tests = [];
const add = (name, fn) => { if (!filter || name.toLowerCase().includes(filter.toLowerCase())) tests.push({ name, fn }); };
const check = (cond, msg) => { if (!cond) throw new Error(msg); };

async function newPage(width, { auth = false, storage = null } = {}) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  const mobile = width < 500;
  await page.setViewport({ width, height: mobile ? 844 : 900, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
  page.__errors = [];
  page.on('pageerror', e => page.__errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) page.__errors.push('console: ' + m.text().slice(0, 140)); });
  if (auth || storage) await seedStorage(page, { auth, storage });
  page.__ctx = ctx;
  return page;
}
const go = async (page, path) => { await page.goto(PAGES_URL + path, { waitUntil: 'networkidle2', timeout: 45000 }); await sleep(900); };
const ls = (page, k) => page.evaluate(k => JSON.parse(localStorage.getItem(k) || 'null'), k);
const text = (page, sel) => page.$eval(sel, e => e.textContent.trim()).catch(() => null);
const done = async page => { check(!page.__errors.length, page.__errors.join(' | ')); await page.__ctx.close(); };

/* ---------------- HOME ---------------- */
add('home: hero slider moves with the arrows and the dots', async () => {
  const p = await newPage(1440); await go(p, 'index.html');
  const cur = () => p.$$eval('.hb__slide', s => s.findIndex(x => x.classList.contains('is-active')));
  check(await cur() === 0, 'first slide should be active');
  await p.hover('#hero'); await p.click('#hbNext'); await sleep(1100);
  check(await cur() === 1, 'next did not advance');
  await p.click('#hbPrev'); await sleep(1100);
  check(await cur() === 0, 'prev did not return');
  await p.click('#hbDots button:nth-child(3)'); await sleep(1100);
  check(await cur() === 2, 'dot did not jump to slide 3');
  check((await p.$$('.hb__slide')).length === 4, 'expected 4 slides');
  await done(p);
});
add('home: collection tiles and product tabs work, and lead to the shop', async () => {
  const p = await newPage(1440); await go(p, 'index.html');
  check((await p.$$('#catTiles .cat-tile')).length === 4, 'expected 4 category tiles');
  check((await p.$$eval('#latestGrid .prod-card', e => e.length)) === 8, 'latest grid should show 8 products');
  await p.click('#latestTabs [data-k="flowers"]'); await sleep(800);
  const cats = await p.$$eval('#latestGrid .prod-info > span:first-child', e => [...new Set(e.map(x => x.textContent.trim().toLowerCase()))]);
  check(cats.length === 1 && cats[0] === 'flowers', 'flowers tab wrong: ' + cats);
  check(/shop\.html\?cat=flowers/.test(await p.$eval('#latestBtn', e => e.getAttribute('href'))), 'View all should follow the tab');
  await Promise.all([p.waitForNavigation({ waitUntil: 'domcontentloaded' }), p.click('#catTiles .cat-tile:nth-child(1)')]);
  check(/shop\.html\?cat=rice/.test(p.url()), 'tile should open the shop filtered: ' + p.url());
  await done(p);
});
add('shop: category pills, sort, density and the URL stay in step', async () => {
  const p = await newPage(1440); await go(p, 'shop.html');
  check((await p.$$eval('#productGrid .prod-card', e => e.length)) > 10, 'all products should load');
  await p.click('#shopPills [data-k="flowers"]'); await sleep(700);
  const names = await p.$$eval('#productGrid .prod-card h3', els => els.map(e => e.textContent));
  check(names.length === 4 && names.every(n => /rose|hibiscus|aavaram|sangupoo/i.test(n)), 'flowers filter wrong: ' + names);
  check(/cat=flowers/.test(p.url()) && /Dried/.test(await text(p, '#shopTitle')), 'URL / title did not follow: ' + p.url());
  await p.select('#shopSort', 'price-asc'); await sleep(700);
  const prices = await p.$$eval('#productGrid [data-card-price]', e => e.map(x => Number(x.textContent.replace(/[^\d]/g, ''))));
  check(prices.every((v, i) => !i || v >= prices[i - 1]), 'prices not ascending: ' + prices);
  await p.click('.dens button[data-cols="3"]');
  check(await p.$eval('#productGrid', e => e.getAttribute('data-cols')) === '3', 'density did not change');
  await p.click('#shopPills [data-k="all"]'); await sleep(700);
  check((await p.$$eval('#productGrid .prod-card', e => e.length)) > 10, 'All view did not restore');
  const q = await newPage(1440); await go(q, 'shop.html?cat=beverages');
  check(await q.$eval('#shopPills [data-k="beverages"]', e => e.classList.contains('is-active')), 'deep link did not select the category');
  check((await q.$$eval('#productGrid .prod-card', e => e.length)) === 2, 'beverages should show 2');
  await q.__ctx.close();
  await done(p);
});
add('shop: header search narrows results and clears; on the home page Enter opens the shop', async () => {
  const p = await newPage(1440); await go(p, 'shop.html');
  await p.type('#searchInput', 'kavuni'); await sleep(600);
  const names = await p.$$eval('#productGrid .prod-card h3', els => els.map(e => e.textContent));
  check(names.length === 2 && names.every(n => /kavuni/i.test(n)), 'search results wrong: ' + names);
  await p.focus('#searchInput'); await p.keyboard.down('Control'); await p.keyboard.press('KeyA'); await p.keyboard.up('Control'); await p.keyboard.press('Backspace'); await sleep(700);
  check((await p.$$eval('#productGrid .prod-card', e => e.length)) > 10, 'clearing search did not restore the list');
  await done(p);
  const h = await newPage(1440); await go(h, 'index.html');
  await h.click('#searchInput'); await h.type('#searchInput', 'rose');
  await Promise.all([h.waitForNavigation({ waitUntil: 'domcontentloaded' }), h.keyboard.press('Enter')]); await sleep(1500);
  check(/shop\.html\?search=rose/.test(h.url()), 'Enter on home should open the shop search: ' + h.url());
  const hits = await h.$$eval('#productGrid .prod-card h3', e => e.map(x => x.textContent));
  check(hits.length === 2 && hits.every(n => /rose/i.test(n)), 'shop did not show the rose results: ' + hits);
  await h.__ctx.close();
});
add('shop: add to cart, drawer, qty, remove', async () => {
  const p = await newPage(1440); await go(p, 'shop.html');
  await p.click('#productGrid .prod-card:first-child button[id^="cartbtn-"]'); await sleep(400);
  await p.click('#productGrid .prod-card:first-child .qty-pill:nth-child(3)'); await sleep(200);
  await p.click('#productGrid .prod-card:first-child .qty-cart-btn'); await sleep(500);
  check(await text(p, '#cartCount') === '1', 'cart badge not 1');
  const cart = await ls(p, 'cart'); check(cart && cart.length === 1 && cart[0].qty === 1, 'cart storage wrong: ' + JSON.stringify(cart));
  await p.evaluate(() => openCart()); await sleep(500);
  check((await p.$$eval('#cartBody > div', e => e.length)) === 1, 'cart drawer row missing');
  await p.evaluate(() => cartQty(0, 1)); await sleep(200);
  check((await ls(p, 'cart'))[0].qty === 2, 'qty + failed');
  await p.evaluate(() => removeFromCart(0)); await sleep(200);
  check((await ls(p, 'cart')).length === 0, 'remove failed');
  await done(p);
});
add('shop: wishlist heart toggles + persists', async () => {
  const p = await newPage(1440); await go(p, 'shop.html');
  await p.click('#productGrid .prod-card:first-child button[onclick^="toggleWish"]'); await sleep(300);
  check((await ls(p, 'wishlist') || []).length === 1, 'wishlist not stored');
  check(await text(p, '#wishlistCount') === '1', 'wishlist badge not updated');
  await p.click('#productGrid .prod-card:first-child button[onclick^="toggleWish"]'); await sleep(300);
  check((await ls(p, 'wishlist')).length === 0, 'wishlist remove failed');
  await done(p);
});
add('home: gallery lightbox, video modal', async () => {
  const p = await newPage(1440); await go(p, 'index.html');
  await p.evaluate(() => document.querySelector('.bento-item').click()); await sleep(300);
  check(await p.$eval('#lightbox', e => e.classList.contains('open')), 'lightbox did not open');
  await p.click('#lightbox-close'); await sleep(200);
  check(!(await p.$eval('#lightbox', e => e.classList.contains('open'))), 'lightbox did not close');
  await p.evaluate(() => document.querySelector('.featured-video-wrap').click()); await sleep(300);
  check(await p.$eval('#video-modal', e => getComputedStyle(e).display) === 'flex', 'video modal did not open');
  await p.keyboard.press('Escape'); await sleep(300);
  check(await p.$eval('#video-modal', e => getComputedStyle(e).display) === 'none', 'video modal did not close');
  await done(p);
});
add('home gallery: six unique photos, lightbox next/prev/keys/close, no founder story', async () => {
  const p = await newPage(1440); await go(p, 'index.html');
  const srcs = await p.$$eval('#gallery .bento-item img', e => e.map(i => i.getAttribute('src')));
  check(srcs.length === 6 && new Set(srcs).size === 6, 'gallery should have 6 unique photos, has ' + srcs.length + ' / ' + new Set(srcs).size);
  check(!(await p.$('#founder')) && !/Meet the Farmer|Pichai/i.test(await p.evaluate(() => document.body.innerText)), 'founder story is still on the page');
  await p.evaluate(() => document.querySelectorAll('#gallery .bento-item')[1].click()); await sleep(300);
  check(await text(p, '#lightbox-count') === '02 / 06', 'counter wrong: ' + await text(p, '#lightbox-count'));
  const cap2 = await text(p, '#lightbox-caption');
  await p.click('#lightbox-next'); await sleep(200);
  check(await text(p, '#lightbox-count') === '03 / 06' && await text(p, '#lightbox-caption') !== cap2, 'next did not advance');
  await p.keyboard.press('ArrowLeft'); await sleep(200);
  check(await text(p, '#lightbox-count') === '02 / 06', 'ArrowLeft did not go back');
  await p.evaluate(() => document.getElementById('lightbox-prev').click()); await p.evaluate(() => document.getElementById('lightbox-prev').click()); await sleep(200);
  check(await text(p, '#lightbox-count') === '06 / 06', 'previous did not wrap around');
  await p.keyboard.press('Escape'); await sleep(250);
  check(!(await p.$eval('#lightbox', e => e.classList.contains('open'))), 'Escape did not close the lightbox');
  await done(p);
});
add('site: no page links to a removed section or page', async () => {
  const bad = [];
  for (const pg of ['index', 'shop', 'about', 'faq', 'contact', 'shipping', 'track-order', 'product', 'wishlist', 'blog', 'login', 'checkout', 'privacy-policy', 'refund-policy', 'terms-and-conditions']) {
    const html = await (await fetch(PAGES_URL + pg + '.html')).text();
    for (const needle of ['#founder', 'news.html', 'account.html', '#why-section', 'video-reels']) if (html.includes(needle)) bad.push(pg + ' -> ' + needle);
  }
  check(!bad.length, 'stale links: ' + bad.join(', '));
});
add('nav: Shop / Farm / Help menus open by click and hover, Escape closes, everything is reachable', async () => {
  const p = await newPage(1440); await go(p, 'index.html');
  const open = sel => p.$eval(sel, e => e.classList.contains('is-open'));
  await p.click('.ns-links .ns-item:nth-child(1) > .ns-link'); await sleep(450);
  check(await open('.ns-links .ns-item:nth-child(1)'), 'Shop menu did not open on click');
  const shopLinks = await p.$$eval('#nsm-shop a', a => a.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
  for (const want of ['Rice', 'Dried flowers', 'Beverages', 'Flour & mixes', 'New arrivals', 'Best sellers', 'All products']) check(shopLinks.some(t => t.startsWith(want)), 'Shop menu is missing ' + want);
  await p.keyboard.press('Escape'); await sleep(300);
  check(!(await open('.ns-links .ns-item:nth-child(1)')), 'Escape did not close the menu');
  await p.hover('.ns-links .ns-item:nth-child(2) > .ns-link'); await sleep(600);
  check(await open('.ns-links .ns-item:nth-child(2)'), 'Farm menu did not open on hover');
  const farm = await p.$$eval('#nsm-farm a', a => a.map(x => x.getAttribute('href')));
  check(['index.html#mill-heritage-section', 'index.html#films', 'index.html#gallery'].every(h => farm.includes(h)), 'Farm menu links wrong: ' + farm);
  await p.hover('.ns-links .ns-item:nth-child(4) > .ns-link'); await sleep(700);
  check(await open('.ns-links .ns-item:nth-child(4)') && !(await open('.ns-links .ns-item:nth-child(2)')), 'moving to Help should close Farm and open Help');
  const help = await p.$$eval('#nsm-help a', a => a.map(x => x.getAttribute('href')));
  check(['track-order.html', 'shipping.html', 'refund-policy.html', 'faq.html', 'contact.html'].every(h => help.includes(h)), 'Help menu links wrong: ' + help);
  check(await p.$eval('.ns-links a.ns-link[href="blog.html"]', e => e.getBoundingClientRect().width > 0), 'Blogs link missing');
  for (const sel of ['.ns-orders', '.ns-icon[href="wishlist.html"]', '[data-ns-cart]']) check(await p.$eval(sel, e => e.getBoundingClientRect().width > 0), sel + ' not visible in the header');
  await done(p);
});
add('nav: a category in the menu filters the shop in place; from any other page it opens the shop filtered', async () => {
  const p = await newPage(1440); await go(p, 'shop.html');
  await p.click('.ns-links .ns-item:nth-child(1) > .ns-link'); await sleep(400);
  await p.click('#nsm-shop a[data-ns-cat="flowers"]'); await sleep(900);
  const cats = await p.$$eval('#productGrid .prod-info > span:first-child', e => [...new Set(e.map(x => x.textContent.trim().toLowerCase()))]);
  check(cats.length === 1 && cats[0] === 'flowers', 'in-page filter wrong: ' + cats);
  check(await p.$eval('#shopPills [data-k="flowers"]', e => e.classList.contains('is-active')), 'pill not highlighted');
  check(!(await p.$eval('.ns-links .ns-item:nth-child(1)', e => e.classList.contains('is-open'))), 'menu should close after choosing');
  await p.__ctx.close();
  const q = await newPage(1440); await go(q, 'about.html');
  await q.hover('.ns-links .ns-item:nth-child(1) > .ns-link'); await sleep(600);
  await Promise.all([q.waitForNavigation({ waitUntil: 'domcontentloaded' }), q.click('#nsm-shop a[data-ns-cat="beverages"]')]); await sleep(1500);
  check(/shop\.html\?cat=beverages/.test(q.url()), 'did not open the shop with the category: ' + q.url());
  check((await q.$$eval('#productGrid .prod-card', e => e.length)) === 2, 'shop did not open filtered');
  await q.__ctx.close();
});
add('search: suggestions appear as you type on every page and lead to the product', async () => {
  const h = await newPage(1440); await go(h, 'index.html');
  await h.click('#searchInput'); await h.type('#searchInput', 'kav', { delay: 25 }); await sleep(500);
  const hv = await h.$$eval('#searchSuggestions .suggestion-item', e => e.map(x => { const r = x.getBoundingClientRect(); return { t: x.innerText.replace(/\s+/g, ' ').trim(), w: r.width, h: r.height }; }));
  check(hv.length === 2 && hv.every(x => x.w > 150 && x.h > 30), 'home suggestions are collapsed or missing: ' + JSON.stringify(hv));
  await done(h);
  for (const [pg, w] of [['product.html?id=1', 1440], ['privacy-policy.html', 1440], ['product.html?id=1', 390]]) {
    const p = await newPage(w); await go(p, pg);
    const sel = w < 500 ? '.ns-msearch input' : '.ns-search input';
    await p.click(sel); await p.type(sel, 'kav', { delay: 25 }); await sleep(900);
    const items = await p.$$eval('.search-suggestions.show .suggestion-item', e => e.map(x => { const r = x.getBoundingClientRect(); return { t: x.innerText.replace(/\s+/g, ' ').trim(), w: r.width, h: r.height }; }));
    check(items.length === 2 && items.every(x => x.w > 150 && x.h > 30), pg + ' @' + w + ' suggestions wrong: ' + JSON.stringify(items));
    await Promise.all([p.waitForNavigation({ waitUntil: 'domcontentloaded' }), p.click('.search-suggestions.show .suggestion-item')]);
    check(/product\.html\?id=2/.test(p.url()), 'suggestion did not open the product: ' + p.url());
    await done(p);
  }
  const e = await newPage(1440); await go(e, 'product.html?id=1');
  await e.click('.ns-search input'); await e.type('.ns-search input', 'zzzz'); await sleep(700);
  check(/No products match/.test(await e.$eval('.search-suggestions', x => x.innerText)), 'no empty-state message');
  await e.keyboard.press('Enter'); await e.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => { }); await sleep(1500);
  check(/search=zzzz/.test(e.url()), 'Enter should open the full search on the home page: ' + e.url());
  await e.__ctx.close();
});
add('nav: account menu follows sign-in state, sign out works', async () => {
  const out = await newPage(1440); await go(out, 'blog.html');
  await out.click('.ns-acct > button'); await sleep(400);
  check(/Sign in/.test(await out.$eval('#nsm-acct', e => e.innerText)) && await out.$eval('#nsm-acct [data-ns-show="out"]', e => !e.hidden), 'signed-out menu should offer Sign in');
  check(await out.$eval('#nsm-acct [data-ns-show="in"]', e => e.hidden) && await out.$eval('#nsm-acct [data-ns-show="admin"]', e => e.hidden), 'signed-in items leaked to a guest');
  await out.__ctx.close();
  const inn = await newPage(1440, { auth: true }); await go(inn, 'product.html?id=1');
  check(/Test/.test(await text(inn, '.ns-acct-label')), 'header should greet the user, got ' + await text(inn, '.ns-acct-label'));
  await inn.click('.ns-acct > button'); await sleep(400);
  const menu = await inn.$eval('#nsm-acct', e => e.innerText);
  check(/Test User/.test(menu) && /My orders/.test(menu) && /Wishlist/.test(menu) && /Sign out/.test(menu), 'signed-in menu incomplete: ' + menu.replace(/\s+/g, ' '));
  check(/Admin panel/.test(menu), 'admin should see the admin link');
  await Promise.all([inn.waitForNavigation({ waitUntil: 'domcontentloaded' }), inn.click('#nsm-acct [data-ns-logout]')]); await sleep(500);
  check(/login\.html/.test(inn.url()), 'sign out did not go to login');
  check(!(await inn.evaluate(() => localStorage.getItem('nansai_token'))), 'token still stored after sign out');
  await inn.__ctx.close();
});
add('nav: the same menu is on every storefront page, with a mobile drawer that reaches everything', async () => {
  const bad = [];
  for (const pg of ['index', 'shop', 'about', 'faq', 'contact', 'shipping', 'bulk-orders', 'track-order', 'our-grains', '404', 'product', 'wishlist', 'blog', 'privacy-policy', 'refund-policy', 'terms-and-conditions']) {
    const html = await (await fetch(PAGES_URL + pg + '.html')).text();
    for (const id of ['nsm-shop', 'nsm-farm', 'nsm-help', 'nsm-acct', 'nsDrawer']) if (!html.includes('id="' + id + '"')) bad.push(pg + ' lacks ' + id);
  }
  check(!bad.length, bad.join(', '));
  const p = await newPage(390); await go(p, 'product.html?id=1');
  await p.click('.ns-burger'); await sleep(400);
  const groups = await p.$$eval('.ns-drawer summary', s => s.map(x => x.textContent.trim()));
  check(['Shop', 'Farm', 'Help'].every(g => groups.includes(g)), 'drawer groups: ' + groups);
  const flat = await p.$$eval('.ns-drawer nav > a', a => a.map(x => x.textContent.trim()));
  check(['Blogs', 'My Orders', 'Wishlist', 'Cart'].every(g => flat.includes(g)), 'drawer links: ' + flat);
  await p.evaluate(() => { document.querySelector('.ns-drawer details').open = true; });
  check((await p.$$eval('.ns-drawer details:first-of-type a', a => a.length)) >= 8, 'Shop group should list every category');
  check((await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 1, 'sideways scroll with the drawer open');
  await done(p);
});
add('home mobile: drawer, back-to-top, no sideways scroll, hero fits', async () => {
  const p = await newPage(390); await go(p, 'index.html');
  check((await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 1, 'horizontal scroll on mobile');
  const hero = await p.$eval('#hero', e => e.getBoundingClientRect().height);
  check(hero > 380 && hero < 640, 'hero height odd on a phone: ' + hero);
  await p.click('.ns-burger'); await sleep(400);
  check(await p.$eval('.ns-drawer', e => !e.hidden), 'drawer not open');
  await p.click('.ns-drawer-x'); await sleep(300);
  check(await p.$eval('.ns-drawer', e => e.hidden), 'drawer did not close');
  await p.evaluate(() => window.scrollTo(0, 2500)); await sleep(700);
  check(await p.$eval('#nsToTop', e => e.classList.contains('show')), 'back-to-top not shown');
  await p.click('#nsToTop'); await sleep(1200);
  check((await p.evaluate(() => scrollY)) < 50, 'back-to-top did not scroll up');
  await done(p);
});
/* ---------------- PRODUCT ---------------- */
add('product: variant changes price, add to cart, buy now', async () => {
  const p = await newPage(1440); await go(p, 'product.html?id=1');
  const p0 = await text(p, '#pPriceEl');
  await p.click('#variantBtns button:nth-child(2)'); await sleep(300);
  check(p0 !== await text(p, '#pPriceEl'), 'price did not change');
  await p.click('#atcBtn'); await sleep(600);
  check((await ls(p, 'cart')).length === 1, 'cart empty after add');
  check(await text(p, '#cartCount') === '1', 'header cart badge not updated');
  await p.evaluate(() => buyNow()); await p.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => { }); await sleep(1200);
  check(/checkout/.test(p.url()), 'buy now did not reach checkout');
  await done(p);
});
add('product: cart price equals displayed price for every rice variant, no double add', async () => {
  const p = await newPage(1440); await go(p, 'product.html?id=1');
  const variants = await p.$$eval('#variantBtns button', b => b.length);
  for (let n = 1; n <= variants; n++) {
    await p.evaluate(() => localStorage.removeItem('cart'));
    await p.click(`#variantBtns button:nth-child(${n})`); await sleep(120);
    const shown = Number((await text(p, '#pPriceEl')).replace(/[^\d]/g, ''));
    await p.click('#atcBtn'); await sleep(250);
    const c = (await ls(p, 'cart'))[0];
    check(c.price === shown, `variant ${n}: cart price ${c.price} != shown ${shown}`);
    check(c.qty === 1, `variant ${n}: qty ${c.qty} (double add?)`);
  }
  await done(p);
});
add('product: dried flower price is per piece', async () => {
  const p = await newPage(1440); await go(p, 'product.html?id=8');
  check(await text(p, '#pPriceEl') === '₹150', 'flower price wrong: ' + await text(p, '#pPriceEl'));
  await p.click('button[onclick="changeFlowerQty(1)"]'); await sleep(200);
  check(await text(p, '#pPriceEl') === '₹300', 'flower qty 2 price wrong');
  await done(p);
});
add('product: beverage litre pricing, stepper multiplies', async () => {
  const p = await newPage(1440); await go(p, 'product.html?id=12');
  check(await text(p, '#pPriceEl') === '₹28', 'beverage 200ml price wrong');
  await p.click('#variantBtns button:nth-child(3)'); await sleep(120);
  check(await text(p, '#pPriceEl') === '₹140', '1L price wrong');
  await p.click('button[onclick="changeFlowerQty(1)"]'); await sleep(120);
  check(await text(p, '#pPriceEl') === '₹280', 'stepper did not double the price');
  await done(p);
});
add('product mobile: sticky-bar stepper updates number and price', async () => {
  const p = await newPage(390); await go(p, 'product.html?id=2');
  const before = await text(p, '#pPriceEl');
  await p.click('#mobBar button[onclick="changeFlowerQty(1)"]'); await sleep(150);
  check(await text(p, '#mobQtyVal') === '2', 'mobile qty label did not change');
  check(await text(p, '#pPriceEl') !== before, 'price did not change with qty');
  check((await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 1, 'horizontal scroll');
  await done(p);
});
add('product: Buy Now keeps the existing cart', async () => {
  const cart = [{ id: 8, name: 'Paneer Rose', price: 150, basePrice: 150, image: '', qty: 1, qtyVal: 1, qtyLabel: '1 pc', unit: 'pcs' }];
  const p = await newPage(1440, { storage: { cart } }); await go(p, 'product.html?id=1');
  await p.evaluate(() => buyNow()); await p.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => { }); await sleep(800);
  check((await ls(p, 'cart')).length === 2, 'existing cart item was lost');
  await p.__ctx.close();
});
add('product: tabs switch, removed sections stay removed', async () => {
  const p = await newPage(1440); await go(p, 'product.html?id=2');
  for (const t of ['benefits', 'nutrients', 'howtouse', 'specs']) {
    await p.evaluate(t => switchTab(t, document.querySelector(`[onclick^="switchTab('${t}'"]`)), t); await sleep(150);
    check(await p.$eval('#tab-' + t, e => e.classList.contains('active')), 'tab ' + t + ' did not activate');
  }
  check(!(await p.$('#nsVideos')) && !(await p.$('#nsGallery')) && !(await p.$('#nsStoryBar')), 'removed sections are back');
  check(!/Watch\s*&\s*Learn/i.test(await p.evaluate(() => document.body.innerText)), 'Watch & Learn text is back');
  await done(p);
});

/* ---------------- WISHLIST / CHECKOUT / ACCOUNT ---------------- */
add('wishlist: render, filter, add all, remove', async () => {
  const p = await newPage(1440, { auth: true, storage: { wishlist: ['1', '8', '12'] } }); await go(p, 'wishlist.html');
  check((await p.$$eval('#wishGrid .wish-card', e => e.length)) === 3, 'expected 3 cards');
  check(await text(p, '#statCount') === '3', 'stat count wrong');
  await p.click('#filterRow .fpill[data-cat="flowers"]'); await sleep(400);
  check((await p.$$eval('#wishGrid .wish-card', e => e.length)) === 1, 'flower filter wrong');
  await p.click('#filterRow .fpill[data-cat="all"]'); await sleep(300);
  await p.evaluate(() => addAllToCart()); await sleep(300);
  check((await ls(p, 'cart')).length === 3, 'add-all did not add 3 items');
  await p.evaluate(() => removeFromWishlist('1')); await sleep(700);
  check((await p.$$eval('#wishGrid .wish-card', e => e.length)) === 2, 'remove did not update grid');
  await done(p);
});
add('checkout: cart step shows totals, no damaged text', async () => {
  const cart = [{ id: 1, name: 'Karunguruvai Rice', price: 180, basePrice: 180, image: '', qty: 2, qtyVal: 1, qtyLabel: '1kg', unit: 'kg' }];
  const p = await newPage(1440, { auth: true, storage: { cart } }); await go(p, 'checkout.html');
  const body = await p.evaluate(() => document.body.innerText);
  check(body.includes('₹360'), 'subtotal 360 not shown');
  check(!/Pay Now \?/.test(body), 'damaged "Pay Now ?" text');
  await done(p);
});
const CART_1 = [{ id: 1, name: 'Karunguruvai Rice', price: 180, basePrice: 180, image: '', qty: 2, qtyVal: 1, qtyLabel: '1kg', unit: 'kg' }];
const fillAddress = (p) => p.evaluate(() => {
  const set = (id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('blur', { bubbles: true })); };
  set('coName', 'Asha Raman'); set('coMobile', '9876543210'); set('coAddr1', '12 Farm Road'); set('coCity', 'Thanjavur'); set('coPin', '613001'); set('coState', 'Tamil Nadu');
});
add('checkout: asks for the address every time (no saved addresses UI)', async () => {
  const p = await newPage(1440, { auth: true, storage: { cart: CART_1 } }); await go(p, 'checkout.html');
  check(await p.$eval('#newAddrForm', e => getComputedStyle(e).display !== 'none'), 'address form is not visible');
  check(!(await p.$('#addrGrid')), 'saved-address grid is back');
  await p.evaluate(() => goToPayment()); await sleep(300);
  check(await p.evaluate(() => !document.getElementById('step2') || !document.getElementById('step2').classList.contains('active')), 'moved on without an address');
  await done(p);
});
add('checkout: COD order reaches the API with the right pincode/city, address is not stored', async () => {
  const p = await newPage(1440, { auth: true, storage: { cart: CART_1 } }); await go(p, 'checkout.html');
  await fillAddress(p); await sleep(1500);
  await p.evaluate(() => { document.getElementById('coState').value = 'Tamil Nadu'; document.getElementById('coCity').value = 'Thanjavur'; });
  await p.evaluate(() => goToPayment()); await sleep(900);
  await p.evaluate(() => { goStep(3); selectGateway('cod'); initiateRazorpay(); }); await sleep(4300);
  const order = await (await fetch(`http://127.0.0.1:${API_PORT}/api/__last_order`)).json();
  const sa = order.shippingAddress || {};
  check(sa.pincode === '613001', 'pincode sent to API was ' + sa.pincode);
  check(/^thanjavur$/i.test(sa.city || ''), 'city sent to API was ' + sa.city);
  check(await p.evaluate(() => document.getElementById('successOverlay').classList.contains('show')), 'order success screen not shown');
  const keys = await p.evaluate(() => Object.keys(localStorage).filter(k => /addr/i.test(k)));
  check(keys.length === 0, 'address was saved to storage: ' + keys.join(','));
  await done(p);
});
add('my orders: only orders, greets the user, scroll reveal on, sign out works', async () => {
  const p = await newPage(1440, { auth: true }); await go(p, 'checkout.html?page=orders');
  check(await p.$eval('#ordersPage', e => e.classList.contains('active')), 'orders view not active');
  check(!(await p.$('#page-addresses, #page-profile, #page-security')), 'account sections are back');
  check(/Hi,\s*Test/.test(await p.evaluate(() => document.body.innerText)), 'greeting missing');
  check((await p.$$('.ck-stat')).length === 3, 'stats missing');
  await p.evaluate(() => [...document.querySelectorAll('.ck-who button')][0].click()); await sleep(1200);
  check(/login\.html/.test(p.url()), 'sign out did not go to login');
  await p.__ctx.close();
});
const resetMock = () => fetch(`http://127.0.0.1:${API_PORT}/api/__reset`, { method: 'POST' });
add('my orders: Track Package shows the courier scans, tracking number and a live link', async () => {
  await resetMock();
  const p = await newPage(1440, { auth: true }); await go(p, 'checkout.html?page=orders');
  check(/track package/i.test(await p.evaluate(() => document.getElementById('ordersList').innerText)), 'no Track Package button on the shipped order');
  await p.evaluate(() => openTrack('NO-1003')); await sleep(900);
  const info = await p.evaluate(() => ({
    awb: document.getElementById('trackNumber').textContent, eta: document.getElementById('trackETA').textContent,
    rows: [...document.querySelectorAll('#trackTimeline .timeline-item p:first-child')].map(e => e.textContent),
    link: (() => { const a = document.getElementById('trackLink'); return { href: a.href, shown: getComputedStyle(a).display !== 'none' }; })(),
  }));
  check(/Delhivery/.test(info.awb) && /AWB10033/.test(info.awb), 'courier / tracking number missing: ' + info.awb);
  check(info.rows.length === 3 && info.rows[0] === 'Departed from hub' && info.rows[2] === 'Picked up from the farm', 'scans wrong or not newest-first: ' + info.rows);
  check(info.link.shown && /shiprocket\.co\/tracking\/AWB10033/.test(info.link.href), 'live tracking link missing');
  check(/Expected by/.test(info.eta), 'delivery estimate missing: ' + info.eta);
  await done(p);
});
add('my orders: invoice opens and cancel works on real orders; a dispatched order cannot be cancelled', async () => {
  await resetMock();
  const p = await newPage(1440, { auth: true }); await go(p, 'checkout.html?page=orders');
  await p.evaluate(() => openInvoice('NO-1002')); await sleep(300);
  check(await p.$eval('#invoiceModal', e => e.classList.contains('open')) && /NO-1002/.test(await text(p, '#inv-id')), 'invoice did not open for a server order');
  await p.evaluate(() => closeModal('invoiceModal'));
  await p.evaluate(() => { openCancel('NO-1003'); document.getElementById('cancelReason').selectedIndex = 1; confirmCancel(); }); await sleep(800);
  check(/dispatched/i.test(await text(p, '#toast')), 'a shipped order should refuse cancellation, toast: ' + await text(p, '#toast'));
  await p.evaluate(() => closeModal('cancelModal'));
  await p.evaluate(() => { openCancel('NO-1002'); document.getElementById('cancelReason').selectedIndex = 1; confirmCancel(); }); await sleep(1500);
  const card = await p.evaluate(() => [...document.querySelectorAll('.order-card')].find(c => c.innerText.includes('NO-1002')).innerText);
  check(/Cancelled/i.test(card), 'order was not shown as cancelled after the server accepted it');
  await resetMock();
  await p.__ctx.close();
});
add('home: removed sections stay removed, sections present, no news link', async () => {
  const p = await newPage(1440); await go(p, 'index.html');
  for (const id of ['midParallax', 'why-section', 'blog-section', 'blog-modal', 'desk-offer-bar', 'founder']) check(!(await p.$('#' + id)), id + ' is back');
  for (const id of ['hero', 'collection', 'products', 'mill-heritage-section', 'gallery', 'faqTeaser']) check(await p.$('#' + id), id + ' is missing');
  check(!(await p.$('.bulk-band, #fan')) && !/Stocking up or gifting/i.test(await p.evaluate(() => document.body.innerText)), 'the bulk & gifting band should be gone from the home page');
  check(!(await p.$('a[href*="news"]')), 'news link present');
  check(await p.$eval('.announce', e => e.getBoundingClientRect().height > 20), 'announcement bar missing');
  await done(p);
});
add('shop: product cards keep the float + hover-lift effect', async () => {
  const p = await newPage(1440); await go(p, 'shop.html');
  const anim = await p.$$eval('#productGrid .prod-card', els => els.map(e => getComputedStyle(e).animationName));
  check(anim.length >= 8 && anim.every(a => a === 'floatCard'), 'cards are not floating: ' + [...new Set(anim)]);
  await p.click('#productGrid .prod-card:nth-child(2) button[id^="cartbtn-"]'); await sleep(600);
  const lifted = await p.$eval('#productGrid .prod-card:nth-child(2)', e => ({ cls: e.classList.contains('card-lifted'), anim: getComputedStyle(e).animationName }));
  check(lifted.cls && lifted.anim === 'none', 'card did not lift when the quantity picker opened');
  check((await p.$$('#productGrid .prod-card:nth-child(2) .qty-pill')).length === 4, 'quantity pills missing');
  await done(p);
});
add('checkout mobile: validation, 3 steps, no sideways scroll', async () => {
  const cart = [{ id: 1, name: 'Karunguruvai Rice', price: 180, basePrice: 180, image: '', qty: 2, qtyVal: 1, qtyLabel: '1kg', unit: 'kg' }];
  const p = await newPage(390, { auth: true, storage: { cart } }); await go(p, 'checkout.html');
  const sx = () => p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  check((await sx()) <= 1, 'sideways scroll on step 1');
  await p.evaluate(() => goToPayment()); await sleep(400);
  check((await p.$$eval('#newAddrForm .co-err-msg', e => e.filter(x => getComputedStyle(x).display !== 'none' && x.textContent.trim()).length)) >= 4, 'empty form did not show the field errors');
  check(await p.evaluate(() => getComputedStyle(document.getElementById('step1')).display !== 'none'), 'moved on with an empty form');
  await fillAddress(p); await sleep(1500);
  await p.evaluate(() => { document.getElementById('coState').value = 'Tamil Nadu'; document.getElementById('coCity').value = 'Thanjavur'; });
  await p.evaluate(() => goToPayment()); await sleep(900);
  check(await p.evaluate(() => getComputedStyle(document.getElementById('step2')).display !== 'none'), 'step 2 did not open');
  check((await sx()) <= 1, 'sideways scroll on step 2');
  const body2 = await p.evaluate(() => document.getElementById('step2').innerText);
  check(/Asha Raman/.test(body2) && /613001/.test(body2) && /Thanjavur/i.test(body2), 'step 2 does not show the entered address');
  await p.evaluate(() => goStep(3)); await sleep(700);
  check((await sx()) <= 1, 'sideways scroll on step 3');
  await done(p);
});
add('checkout: empty cart shows only the empty state with a way back to the shop', async () => {
  const p = await newPage(1440, { auth: true, storage: { cart: [] } }); await go(p, 'checkout.html');
  check(await p.$eval('#emptyCart', e => getComputedStyle(e).display !== 'none'), 'empty state missing');
  check(await p.$eval('#newAddrForm', e => getComputedStyle(e).display === 'none'), 'delivery form shown with an empty cart');
  check(await p.$eval('#emptyCart a[href*="index.html"]', e => e.getBoundingClientRect().width > 0), 'no link back to the shop');
  await done(p);
});
add('my orders mobile: header fits, cards fit, no sideways scroll', async () => {
  const p = await newPage(390, { auth: true }); await go(p, 'checkout.html?page=orders');
  check((await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 1, 'sideways scroll');
  const r = await p.evaluate(() => { const t = document.querySelector('#ordersPage h1').getBoundingClientRect(), w = document.querySelector('.ck-who').getBoundingClientRect(); return { overlap: !(t.right <= w.left || w.right <= t.left || t.bottom <= w.top || w.bottom <= t.top) }; });
  check(!r.overlap, 'Sign out overlaps the My Orders title');
  check((await p.$$('.order-card')).length === 3, 'order cards missing');
  await done(p);
});

/* ---------------- LOGIN / CONTENT PAGES ---------------- */
add('info pages: load clean, show the shared announcement bar, footer and settings', async () => {
  for (const pg of ['about.html', 'our-grains.html', 'faq.html', 'shipping.html', 'contact.html', 'bulk-orders.html', 'track-order.html', '404.html', 'privacy-policy.html']) {
    const p = await newPage(1440); await go(p, pg);
    check(await p.$('.announce') && await p.$('.nf') && await p.$('.ns-header'), pg + ' is missing the shared shell');
    check(/\+91 63821 42578|63821 42578/.test(await p.$eval('.announce', e => e.innerText)) || /@/.test(await p.$eval('.announce', e => e.innerText)), pg + ': announcement bar has no contact');
    check(!/undefined|\[object|NaN/.test(await p.evaluate(() => document.body.innerText)), pg + ' shows broken text');
    check(await p.$('.wa-float'), pg + ': WhatsApp button missing');
    await done(p);
  }
});
add('faq: accordions open one at a time; settings fill the answers', async () => {
  const p = await newPage(1440); await go(p, 'faq.html');
  const open = () => p.$$eval('.acc__i.is-open', e => e.length);
  check(await open() === 4 ? false : true, 'unexpected open state');
  const groupOpen = () => p.$eval('.faq-group:first-child', g => g.querySelectorAll('.acc__i.is-open').length);
  await p.click('.faq-group:first-child .acc__i:nth-child(2) .acc__q'); await sleep(500);
  check(await groupOpen() === 1 && await p.$eval('.faq-group:first-child .acc__i:nth-child(2)', e => e.classList.contains('is-open')), 'second question should be the only one open');
  check(/₹999/.test(await p.evaluate(() => document.body.innerText)), 'free-delivery amount from settings is missing');
  check(!/undefined|\{\{/.test(await p.evaluate(() => document.body.innerText)), 'unfilled placeholders in the FAQ');
  await done(p);
});
add('contact + bulk: validation, and the message is composed for WhatsApp / email', async () => {
  const p = await newPage(1440); await go(p, 'contact.html');
  await p.click('#cMail'); await sleep(200);
  check(!(await p.$eval('#cErr', e => e.hidden)), 'empty form should explain what is missing');
  await p.type('#cName', 'Asha'); await p.type('#cMsg', 'Do you ship to Chennai?');
  const wa = await p.evaluate(() => { let url = null; window.open = u => { url = u; return null; }; document.getElementById('cWa').click(); return url; });
  check(/^https:\/\/wa\.me\/916382142578\?text=/.test(wa || '') && /Chennai/.test(decodeURIComponent(wa)), 'WhatsApp link wrong: ' + wa);
  await done(p);
  const b = await newPage(1440); await go(b, 'bulk-orders.html');
  await b.type('#bName', 'Ravi'); await b.type('#bMsg', '20 hampers of rice and flowers');
  const w2 = await b.evaluate(() => { let url = null; window.open = u => { url = u; return null; }; document.getElementById('bWa').click(); return url; });
  check(/Bulk%20enquiry/.test(w2 || '') && /hampers/.test(decodeURIComponent(w2)), 'bulk WhatsApp message wrong: ' + w2);
  await done(b);
});
add('track order: lookup shows courier scans; wrong mobile gives a clear message; courier-number tab opens the tracker', async () => {
  const p = await newPage(1440); await go(p, 'track-order.html');
  await p.type('#tNum', 'NO-1003'); await p.type('#tPhone', '9000000000'); await p.click('#tGo'); await sleep(900);
  check(!(await p.$eval('#tErr', e => e.hidden)) && /could not find/i.test(await text(p, '#tErr')), 'wrong mobile should say it could not find the order');
  await p.evaluate(() => { document.getElementById('tPhone').value = ''; }); await p.type('#tPhone', '98765 43210'); await p.click('#tGo'); await sleep(1200);
  const res = await text(p, '#tResult');
  check(/NO-1003/.test(res) && /Delhivery/.test(res) && /AWB10033/.test(res), 'result missing order details: ' + res);
  check((await p.$$('#tResult .tl__i')).length === 3 && /Departed from hub/.test(await p.$eval('#tResult .tl__i', e => e.innerText)), 'scans missing or not newest first');
  check(/shiprocket\.co\/tracking\/AWB10033/.test(await p.$eval('#tResult a', e => e.href)), 'courier link missing');
  await p.click('.seg button[data-t="awb"]');
  check(!(await p.$eval('#tAwb', e => e.hidden)) && await p.$eval('#tOrder', e => e.hidden), 'tabs did not switch');
  await done(p);
});
add('policies: the contents list follows the page and the contact details come from settings', async () => {
  const p = await newPage(1440); await go(p, 'refund-policy.html');
  check((await p.$$('#toc a')).length >= 7, 'contents list should list every section');
  await p.click('#toc a:nth-child(4)'); await sleep(1200);
  check(await p.$eval('#toc a:nth-child(4)', e => e.classList.contains('is-active')), 'contents list did not follow the click');
  const txt = await p.evaluate(() => document.getElementById('doc').innerText);
  check(/\+91 63821 42578/.test(txt) && !/undefined/.test(txt), 'contact details missing from the policy text');
  await done(p);
});
add('farm loader: every page opens with the dawn-over-the-paddy screen, no numbers, and it always leaves', async () => {
  for (const pg of ['index', 'shop', 'product', 'wishlist', 'blog', 'about', 'our-grains', 'faq', 'contact', 'shipping', 'track-order', 'bulk-orders', 'privacy-policy', 'refund-policy', 'terms-and-conditions', '404', 'login', 'checkout']) {
    const html = await (await fetch(PAGES_URL + pg + '.html')).text();
    check(/<head[^>]*>\s*<script src="js\/farm-loader\.js(\?[^"]*)?"/.test(html), pg + ': farm-loader.js is not the first script in <head>');
  }
  for (const [pg, text] of [['login.html', /farm gate/i], ['checkout.html', /harvest/i], ['index.html', /root of nature/i], ['shop.html', /gathering/i]]) {
    const ctx = await browser.createBrowserContext(); const p = await ctx.newPage(); await p.setViewport({ width: 1280, height: 800 });
    p.goto(PAGES_URL + pg + '?loader=1', { waitUntil: 'domcontentloaded' }).catch(() => { }); await sleep(450);
    const info = await p.evaluate(() => { const l = document.querySelector('.nl'); return l ? { txt: l.innerText, scene: !!l.querySelector('svg .stalk') && !!l.querySelector('.sunbody'), digits: /\d/.test(l.innerText) } : null; });
    check(info && text.test(info.txt) && info.scene, pg + ': loader missing: ' + JSON.stringify(info));
    check(!info.digits, pg + ': loader should not show numbers');
    await sleep(3600);
    check(!(await p.$('.nl')), pg + ': loader did not leave the page');
    await ctx.close();
  }
  // once per visit: a real visitor sees it on the first page only
  const ctx = await browser.createBrowserContext(); const p = await ctx.newPage(); await p.setViewport({ width: 1280, height: 800 });
  p.goto(PAGES_URL + 'about.html?loader=auto', { waitUntil: 'domcontentloaded' }).catch(() => { }); await sleep(500);
  check(await p.$('.nl'), 'first page of a visit should show the loader');
  await sleep(3200);
  await p.goto(PAGES_URL + 'faq.html?loader=auto', { waitUntil: 'domcontentloaded' }); await sleep(300);
  check(!(await p.$('.nl')), 'second page of the same visit must open instantly, without the loader');
  check(await p.$('main'), 'second page should already be visible');
  await ctx.close();
});
add('login: validation and forgot-password', async () => {
  const p = await newPage(1440); await go(p, 'login.html');
  await p.click('#loginButton'); await sleep(300);
  check((await p.evaluate(() => document.body.innerText)).toLowerCase().includes('email is required'), 'no validation message');
  await p.type('#loginEmail', 'shopper@example.com');
  await p.click('.forgot'); await sleep(700);
  const body = await p.evaluate(() => document.body.innerText);
  check(/reset link/i.test(body), 'forgot-password confirmation missing');
  check(!/placeholder/i.test(body), 'developer placeholder text visible');
  await done(p);
});
add('blog: search works', async () => {
  const p = await newPage(1440); await go(p, 'blog.html');
  await p.type('#blogSearchInput', 'kavuni'); await sleep(600);
  check((await p.$$eval('[class*="article"], .blog-card', e => e.length)) > 0, 'no cards after search');
  await done(p);
});
add('policies: load with shared header/footer, mobile drawer opens', async () => {
  for (const pg of ['privacy-policy.html', 'refund-policy.html', 'terms-and-conditions.html']) {
    const p = await newPage(390); await go(p, pg);
    check((await p.$('.ns-header')) && (await p.$('.nf')), pg + ' missing header/footer');
    await p.click('.ns-burger'); await sleep(300);
    check(await p.$eval('.ns-drawer', e => !e.hidden), pg + ' drawer did not open');
    await done(p);
  }
});

(async () => {
  browser = await launch();
  let fail = 0;
  for (const t of tests) {
    try { await t.fn(); console.log('PASS  ' + t.name); }
    catch (e) { fail++; console.log('FAIL  ' + t.name + '\n        ' + e.message); }
  }
  await browser.close();
  console.log(`\n${tests.length - fail}/${tests.length} flows passed`);
  process.exit(fail ? 1 : 0);
})();
