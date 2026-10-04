// node card.js <width> <out>  -> screenshot of the first product cards on the shop page
const { launch, seedStorage, PAGES_URL, sleep } = require('./lib');
(async () => {
  const [w = '1440', out = 'card.png', open = ''] = process.argv.slice(2);
  const b = await launch(); const p = await b.newPage();
  await p.setViewport({ width: +w, height: +w < 700 ? 900 : 1000, deviceScaleFactor: 1.5, isMobile: +w < 700, hasTouch: +w < 700 });
  await seedStorage(p, { auth: true });
  await p.goto(PAGES_URL + 'shop.html', { waitUntil: 'networkidle2' }); await sleep(1500);
  await p.addStyleTag({ content: '.prod-card{animation:none!important}' });
  if (open) { await p.click('#productGrid .prod-card:nth-child(2) .pc-add'); await sleep(700); }
  const el = await p.$('#productGrid');
  const box = await el.boundingBox();
  await p.evaluate(y => window.scrollTo(0, y), box.y - 90); await sleep(900);
  await p.screenshot({ path: out });
  await b.close();
})();
