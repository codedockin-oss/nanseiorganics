'use strict';
/**
 * Blog articles and news updates written in the admin panel.
 *   cleanHtml(html)            -> article HTML with only simple formatting kept (no scripts, styles, event handlers)
 *   cleanPost(body, kind, isNew) -> the fields that may be saved, checked; throws { status: 400 } on bad input
 */

const TAGS = { p: [], br: [], h2: [], h3: [], h4: [], strong: [], b: [], em: [], i: [], u: [], ul: [], ol: [], li: [], blockquote: [], a: ['href'], img: ['src', 'alt'], hr: [] };
const VOID = new Set(['br', 'img', 'hr']);
const SAFE_LINK = /^(https:\/\/|\/(?!\/)|images\/|mailto:|tel:|#)/i;

function cleanHtml(html) {
  return String(html || '')
    .replace(/<(script|style|iframe|object|embed|noscript|template|svg|math)[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g, (m, tag, attrs) => {
      tag = tag.toLowerCase();
      if (!TAGS[tag]) return '';
      if (m[1] === '/') return VOID.has(tag) ? '' : '</' + tag + '>';
      const keep = [];
      TAGS[tag].forEach(a => {
        const hit = attrs.match(new RegExp('\\s' + a + '\\s*=\\s*("([^"]*)"|\'([^\']*)\'|([^\\s>]+))', 'i'));
        if (!hit) return;
        const v = String(hit[2] ?? hit[3] ?? hit[4] ?? '').trim();
        if ((a === 'href' || a === 'src') && !SAFE_LINK.test(v)) return;
        keep.push(a + '="' + v.replace(/&(?!(amp|lt|gt|quot|#\d+);)/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;') + '"');
      });
      if (tag === 'a') keep.push('rel="noopener"');
      if (tag === 'img') keep.push('loading="lazy"');
      return '<' + tag + (keep.length ? ' ' + keep.join(' ') : '') + '>';
    })
    .trim();
}

const text = (v, max) => String(v == null ? '' : v).replace(/<[^>]*>/g, ' ').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const words = html => String(html || '').replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length;
const bad = msg => Object.assign(new Error(msg), { status: 400 });

function cleanPost(b, kind, isNew) {
  b = b || {};
  const out = {};
  const has = k => Object.prototype.hasOwnProperty.call(b, k);
  if (isNew || has('title')) { out.title = text(b.title, 160); if (!out.title) throw bad('Give it a title'); }
  if (isNew || has('category')) { out.category = text(b.category, 40).toLowerCase().replace(/[^a-z0-9-]/g, '') || (kind === 'news' ? 'community' : 'recipes'); }
  if (has('catLabel')) out.catLabel = text(b.catLabel, 40);
  ['catColor', 'catBg'].forEach(k => { if (has(k)) out[k] = /^#[0-9a-f]{3,8}$/i.test(String(b[k] || '')) ? b[k] : undefined; });
  if (isNew || has('content')) {
    out.content = cleanHtml(b.content);
    if (!words(out.content) && !/<img/i.test(out.content)) throw bad('Write some text first');
  }
  if (has('excerpt')) out.excerpt = text(b.excerpt, 300);
  if (isNew && !out.excerpt && out.content) out.excerpt = text(out.content, 180);
  if (has('image')) {
    const u = String(b.image || '').trim();
    if (u && !/^https:\/\/[^\s"'<>]+$/i.test(u) && !/^\/api\/media\/[a-f0-9]{24}$/i.test(u) && !/^(\.\/)?images\/[^"'<>]+$/i.test(u)) throw bad('The cover photo must be an uploaded photo or an https:// link');
    out.image = u;
  }
  if (has('imageAlt')) out.imageAlt = text(b.imageAlt, 200);
  if (has('readTime') || out.content) {
    const given = text(b.readTime, 20);
    out.readTime = given || (Math.max(1, Math.round(words(out.content) / 200)) + (kind === 'news' ? ' min read' : ' min'));
  }
  if (has('metaTitle')) out.metaTitle = text(b.metaTitle, 70);
  if (has('metaDescription')) out.metaDescription = text(b.metaDescription, 170);
  if (has('isActive')) out.isActive = !!b.isActive;
  if (has('featured')) out.featured = !!b.featured;
  if (has('publishedAt')) {
    if (b.publishedAt === null || b.publishedAt === '') out.publishedAt = null;
    else { const d = new Date(b.publishedAt); if (isNaN(d)) throw bad('That publish date is not valid'); out.publishedAt = d; }
  }
  if (kind === 'blog') {
    if (has('author')) out.author = text(b.author, 80) || 'Nansei Farm Team';
    if (has('tags')) out.tags = (Array.isArray(b.tags) ? b.tags : String(b.tags || '').split(',')).map(t => text(t, 30).toLowerCase()).filter(Boolean).filter((t, i, a) => a.indexOf(t) === i).slice(0, 8);
  } else if (has('pinned')) out.pinned = !!b.pinned;
  Object.keys(out).forEach(k => out[k] === undefined && delete out[k]);
  return out;
}

/** what the public sees: published, and not scheduled for later */
const liveFilter = () => ({ isActive: true, $or: [{ publishedAt: null }, { publishedAt: { $exists: false } }, { publishedAt: { $lte: new Date() } }] });

module.exports = { cleanHtml, cleanPost, liveFilter };
