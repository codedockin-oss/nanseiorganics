const { launch, seedStorage, PAGES_URL, sleep } = require('./lib');
(async () => {
  const b = await launch(); const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 });
  p.on('pageerror', e => console.log('pageerror', e.message));
  await seedStorage(p, { auth: true, storage: { wishlist: ['1', '8', '12'] } });
  await p.goto(PAGES_URL + 'wishlist.html', { waitUntil: 'networkidle2' }); await sleep(1500);
  console.log('cards', await p.$$eval('#wlGrid .prod-card', e => e.length), 'wishlist', await p.evaluate(() => JSON.stringify(wishlist)));
  await p.click('#wlGrid .prod-card .pc-wish'); await sleep(900);
  console.log('after', p.url(), await p.$$eval('#wlGrid .prod-card', e => e.length), await p.evaluate(() => localStorage.getItem('wishlist')));
  await b.close();
})();
