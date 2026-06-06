const fs = require('fs');
const html = fs.readFileSync('pages/product.html', 'utf8');
const scripts = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
console.log('Found', scripts.length, 'inline script blocks');
scripts.forEach((sc, i) => {
  try { new Function(sc); console.log('Script', i, 'OK'); }
  catch(e) { console.log('Script', i, 'ERROR:', e.message); }
});
