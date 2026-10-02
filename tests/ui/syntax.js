// Syntax-checks every inline <script> in pages/*.html and every js file (catches the "garbled character broke a script" class of bug).
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..', '..');
let bad = 0, blocks = 0;

for (const f of fs.readdirSync(path.join(root, 'pages')).filter(f => f.endsWith('.html'))) {
  const src = fs.readFileSync(path.join(root, 'pages', f), 'utf8');
  const re = /<script(\s[^>]*)?>([\s\S]*?)<\/script>/gi;
  let m, i = 0;
  while ((m = re.exec(src))) {
    i++;
    const attrs = m[1] || '';
    if (/\ssrc=/.test(attrs) || /type\s*=\s*["']?(application\/json|text\/template|module)/i.test(attrs) || !m[2].trim()) continue;
    blocks++;
    try { new vm.Script(m[2], { filename: `${f}#script${i}` }); }
    catch (e) { bad++; console.log(`${f} script #${i} (line ${src.slice(0, m.index).split('\n').length}): ${e.message}`); }
  }
}
for (const dir of ['js']) {
  for (const f of fs.readdirSync(path.join(root, dir)).filter(f => f.endsWith('.js'))) {
    blocks++;
    try { new vm.Script(fs.readFileSync(path.join(root, dir, f), 'utf8'), { filename: `${dir}/${f}` }); }
    catch (e) { bad++; console.log(`${dir}/${f}: ${e.message}`); }
  }
}
console.log(bad ? `${bad} script(s) with syntax errors` : `all ${blocks} scripts parse OK`);
process.exit(bad ? 1 : 0);
