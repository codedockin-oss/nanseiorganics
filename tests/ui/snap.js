// Quick visual check: node snap.js <page> [width] [outfile]  -> prints page errors / console errors and saves a full-page screenshot.
const { launch, seedStorage, PAGES_URL, sleep } = require('./lib');
(async () => {
  const [pg = 'index.html', w = '390', out = ''] = process.argv.slice(2);
  const b = await launch();
  const p = await b.newPage();
  await p.setViewport({ width: +w, height: 844, deviceScaleFactor: 2, isMobile: +w < 700, hasTouch: +w < 700 });
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/ERR_|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  await seedStorage(p, { auth: true, storage: { cart: [{ id: 1, name: 'Karunguruvai Rice', price: 180, oldPrice: 220, qty: 2, qtyLabel: '1 kg', image: '', unit: 'kg' }], wishlist: [1, 2, 12] } });
  await p.goto(PAGES_URL + pg, { waitUntil: 'networkidle2' });
  await sleep(1800);
  if (out) await p.screenshot({ path: out, fullPage: true });
  const ov = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  console.log(pg, '@' + w, 'overflow:', ov.sw > ov.cw + 1 ? ov.sw + '>' + ov.cw : 'none', '| errors:', errs.length ? '\n  ' + errs.join('\n  ') : 'none');
  await b.close();
})();
