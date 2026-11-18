'use strict';
// Blog and news posts from the admin panel: article HTML is cleaned and fields are checked.   cd backend && npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const { cleanHtml, cleanPost, liveFilter } = require('../utils/posts');

test('article HTML keeps simple formatting and drops anything that could run code', () => {
  const out = cleanHtml('<h4>Soak first</h4><p onclick="x()">Rice <strong>soaked</strong> <em>overnight</em></p><script>alert(1)</script><ul><li>one</li></ul><a href="javascript:alert(1)">bad</a><a href="https://nanseiorg.in/blog.html">good</a><img src=x onerror=alert(1)><img src="/api/media/0123456789abcdef01234567" alt="Rice"><div style="color:red">plain</div><iframe src="https://x"></iframe>');
  assert.match(out, /<h4>Soak first<\/h4>/);
  assert.match(out, /<p>Rice <strong>soaked<\/strong> <em>overnight<\/em><\/p>/);
  assert.match(out, /<a href="https:\/\/nanseiorg.in\/blog.html" rel="noopener">good<\/a>/);
  assert.match(out, /<img src="\/api\/media\/0123456789abcdef01234567" alt="Rice" loading="lazy">/);
  assert.doesNotMatch(out, /script|onclick|onerror|javascript:|iframe|style=|<div/i);
  assert.match(out, /plain/);
});

test('protocol-relative links are dropped', () => {
  assert.doesNotMatch(cleanHtml('<a href="//evil.example">x</a>'), /href/);
});

test('a new post needs a title and some text; read time and summary are filled in', () => {
  assert.throws(() => cleanPost({ content: '<p>Hi</p>' }, 'blog', true), /title/);
  assert.throws(() => cleanPost({ title: 'Hi', content: '<p> </p>' }, 'blog', true), /text/);
  const p = cleanPost({ title: '  Black rice  ', content: '<p>' + 'word '.repeat(420) + '</p>', tags: 'Rice, rice, Recipes' }, 'blog', true);
  assert.equal(p.title, 'Black rice');
  assert.equal(p.readTime, '2 min');
  assert.deepEqual(p.tags, ['rice', 'recipes']);
  assert.ok(p.excerpt.length > 0 && p.excerpt.length <= 180);
  assert.equal(cleanPost({ title: 'N', content: '<p>a b c</p>' }, 'news', true).readTime, '1 min read');
});

test('cover photos must be uploaded photos or https links; dates are checked', () => {
  assert.equal(cleanPost({ image: '/api/media/0123456789abcdef01234567' }, 'blog').image, '/api/media/0123456789abcdef01234567');
  assert.throws(() => cleanPost({ image: 'http://plain.example/a.jpg' }, 'blog'), /cover photo/);
  assert.throws(() => cleanPost({ publishedAt: 'not a date' }, 'news'), /date/);
  assert.equal(cleanPost({ publishedAt: '' }, 'news').publishedAt, null);
});

test('an update only touches the fields that were sent', () => {
  assert.deepEqual(cleanPost({ isActive: false }, 'blog', false), { isActive: false });
  assert.deepEqual(cleanPost({ pinned: true }, 'news', false), { pinned: true });
  assert.equal(cleanPost({ pinned: true }, 'blog', false).pinned, undefined);
});

test('the public list hides drafts and posts scheduled for later', () => {
  const f = liveFilter();
  assert.equal(f.isActive, true);
  assert.ok(f.$or.some(c => c.publishedAt && c.publishedAt.$lte instanceof Date));
});
