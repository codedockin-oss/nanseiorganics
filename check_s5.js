const fs = require('fs');
const sc = fs.readFileSync('_tmp_script.js', 'utf8');

let inStr = null, prev = '', depth = 0, lineNum = 1;
const lines = sc.split('\n');
let depthOneOpens = [];

for (let ci = 0; ci < sc.length; ci++) {
  const ch = sc[ci];
  if (ch === '\n') { lineNum++; prev = ch; continue; }

  if (inStr === null) {
    if (ch === '/' && sc[ci+1] === '/') {
      while (ci < sc.length && sc[ci] !== '\n') ci++;
      lineNum++; prev = '\n'; continue;
    }
    if (ch === '`' || ch === '"' || ch === "'") { inStr = ch; }
    else if (ch === '{') {
      depth++;
      if (depth === 1) depthOneOpens.push(lineNum);
    }
    else if (ch === '}') {
      if (depth === 1) depthOneOpens.pop();
      depth--;
    }
  } else if (inStr === '`') {
    if (ch === '`' && prev !== '\\') inStr = null;
  } else {
    if (ch === inStr && prev !== '\\') inStr = null;
  }
  prev = ch;
}

console.log('Unclosed depth-1 opens at lines:', depthOneOpens);
depthOneOpens.forEach(l => {
  console.log(`\nLine ${l}: ${lines[l-1].substring(0, 120)}`);
  // show a few lines before for context
  if (l > 2) console.log(`Line ${l-1}: ${lines[l-2].substring(0, 120)}`);
});
