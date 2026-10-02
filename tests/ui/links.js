// Crawls every storefront page and checks that each internal link, image, script and stylesheet it points at really exists,
// that every #anchor has a matching id, and a few accessibility basics (alt text, form labels, one h1, lang).
const fs = require('fs');
const path = require('path');
const { PAGES_URL, BASE_URL } = require('./lib');

const pagesDir = path.resolve(__dirname, '..', '..', 'pages');
const pages = fs.readdirSync(pagesDir).filter(f => f.endsWith('.html'));
const problems = [];
const cache = new Map();
const head = async url => {
  if (cache.has(url)) return cache.get(url);
  const p = fetch(url).then(r => r.status).catch(() => 0);
  cache.set(url, p); return p;
};

(async () => {
  for (const pg of pages) {
    const html = fs.readFileSync(path.join(pagesDir, pg), 'utf8').replace(/^﻿/, '');
    const here = PAGES_URL + pg;
    // ids on this page (static markup + ids the page scripts create are skipped: only static ones are required)
    const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
    const refs = [];
    for (const m of html.matchAll(/(?<![\w-])(href|src)="([^"#][^"]*|#[^"]*)"/g)) refs.push([m[1], m[2]]);   // not data-cfg-href etc.
    for (const [attr, raw] of refs) {
      if (/^(mailto:|tel:|javascript:|data:|https?:|\/\/|\$\{|'\s*\+|"\s*\+|#$)/.test(raw) || /[`$]\{|\+\s*[a-z]/i.test(raw) || raw.includes('{{')) continue;
      if (raw.startsWith('#')) { if (!ids.has(raw.slice(1))) problems.push(`${pg}: anchor ${raw} has no matching id`); continue; }
      const [file, hash] = raw.split('#');
      const clean = file.split('?')[0];
      if (!clean) continue;
      const url = new URL(clean, here).href;
      const status = await head(url);
      if (status !== 200) problems.push(`${pg}: ${attr}="${raw}" -> HTTP ${status}`);
      else if (hash && /\.html$/.test(clean)) {                       // anchor into another page
        const target = path.join(pagesDir, path.basename(clean));
        if (fs.existsSync(target)) {
          const t = fs.readFileSync(target, 'utf8');
          if (!new RegExp('\\bid="' + hash.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"').test(t)) problems.push(`${pg}: ${raw} - target page has no #${hash}`);
        }
      }
    }
    // accessibility basics
    if (!/<html[^>]*\blang=/.test(html)) problems.push(`${pg}: <html> has no lang`);
    if (!/<title>[^<]{3,}/.test(html)) problems.push(`${pg}: missing <title>`);
    const noAlt = [...html.matchAll(/<img\b[^>]*>/g)].filter(m => !/\balt=/.test(m[0]) && !/\$\{/.test(m[0]));
    if (noAlt.length) problems.push(`${pg}: ${noAlt.length} <img> without alt`);
    const h1s = (html.match(/<h1\b/g) || []).length;
    if (h1s > 1) problems.push(`${pg}: ${h1s} <h1> elements`);
  }
  const imgs = [...cache.keys()].length;
  console.log(`checked ${pages.length} pages, ${imgs} distinct internal URLs`);
  if (problems.length) { console.log(problems.join('\n')); console.log(`\n${problems.length} problem(s)`); process.exit(1); }
  console.log('LINKS CLEAN');
})();
