const fs = require('fs');
const html = fs.readFileSync('pages/product.html', 'utf8');
const scripts = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/gi)];
const sc = scripts[5][1];

let depth = 0, inStr = null, prev = '';
const lines = sc.split('\n');
let maxDepth = 0, maxLine = 0;

for (let li = 0; li < lines.length; li++) {
  const line = lines[li];
  for (let ci = 0; ci < line.length; ci++) {
    const ch = line[ci];
    if (inStr) {
      if (ch === inStr && prev !== '\\') inStr = null;
    } else {
      if (ch === '"' || ch === "'" || ch === '`') inStr = ch;
      else if (ch === '{' || ch === '[' || ch === '(') depth++;
      else if (ch === '}' || ch === ']' || ch === ')') depth--;
    }
    prev = ch;
  }
  if (depth > maxDepth) { maxDepth = depth; maxLine = li + 1; }
  if (depth < 0) { console.log('GOES NEGATIVE at line', li + 1, ':', line); break; }
}
console.log('Final depth:', depth, '(should be 0)');
console.log('Max depth was', maxDepth, 'at line', maxLine);
if (depth !== 0) console.log('Script is NOT properly closed - missing', depth, 'closing brace(s)');
