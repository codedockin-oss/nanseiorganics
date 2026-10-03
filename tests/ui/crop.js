// node crop.js <page> <width> <out> [height]  -> viewport-sized screenshot of the top of a page
const { launch, seedStorage, PAGES_URL, sleep } = require('./lib');
(async () => {
  const [pg, w, out, h = '900'] = process.argv.slice(2);
  const b = await launch(); const p = await b.newPage();
  await p.setViewport({ width: +w, height: +h, deviceScaleFactor: 1, isMobile: +w < 700, hasTouch: +w < 700 });
  await seedStorage(p, { auth: true });
  await p.goto(PAGES_URL + pg, { waitUntil: 'networkidle2' }); await sleep(2500);
  await p.screenshot({ path: out }); await b.close();
})();
