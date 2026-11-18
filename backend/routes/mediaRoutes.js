'use strict';
/**
 * Photos stored in the store's own database.
 *   POST   /api/media            admin: upload one photo (raw image bytes in the body, Content-Type image/*)
 *                                 optional headers: X-File-Name, X-Alt, X-Width, X-Height
 *   GET    /api/media            admin: the media library (newest first, no image bytes)
 *   GET    /api/media/:id        public: the photo itself, cached by browsers for a year
 *   DELETE /api/media/:id        admin: remove a photo (refused while a product, or the homepage, still uses it)
 * The file type is checked from the file's first bytes, not trusted from the browser.
 */
const express = require('express');
const mongoose = require('mongoose');
const { protect, authorize } = require('../middleware/auth');

const MAX_BYTES = 4 * 1024 * 1024;

/** real type from the file signature (magic bytes) */
function sniff(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  if (buf.toString('ascii', 0, 4) === 'GIF8') return 'image/gif';
  if (buf.toString('ascii', 4, 8) === 'ftyp' && /avif|avis/.test(buf.toString('ascii', 8, 12))) return 'image/avif';
  return null;
}

const clean = (v, max) => String(v == null ? '' : v).replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, max);
const urlOf = id => '/api/media/' + id;

module.exports = function createMediaRouter(deps = {}) {
  const Media = deps.Media || require('../models/Media');
  const Product = deps.Product || require('../models/Product');
  const Setting = deps.Setting || require('../models/Setting');
  const router = express.Router();
  const admin = [protect, authorize('admin')];

  router.post('/', ...admin, express.raw({ type: () => true, limit: MAX_BYTES }), async (req, res) => {
    try {
      const buf = Buffer.isBuffer(req.body) ? req.body : null;
      if (!buf || !buf.length) return res.status(400).json({ success: false, message: 'No photo was received' });
      const type = sniff(buf);
      if (!type) return res.status(415).json({ success: false, message: 'Only JPEG, PNG, WebP, GIF or AVIF photos can be uploaded' });
      let name = clean(req.get('x-file-name'), 140);
      try { name = decodeURIComponent(name); } catch (e) { /* keep as sent */ }
      const doc = await Media.create({
        name: clean(name, 140) || 'photo', alt: clean(req.get('x-alt'), 200), contentType: type, size: buf.length,
        width: Number(req.get('x-width')) || undefined, height: Number(req.get('x-height')) || undefined,
        data: buf, uploadedBy: req.user && req.user.id,
      });
      res.status(201).json({ success: true, data: { _id: doc._id, url: urlOf(doc._id), name: doc.name, size: doc.size, width: doc.width, height: doc.height, contentType: type } });
    } catch (err) {
      if (err.type === 'entity.too.large') return res.status(413).json({ success: false, message: 'That photo is too large (4 MB max)' });
      console.error('[Media] upload error:', err.message);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  router.get('/', ...admin, async (req, res) => {
    try {
      const list = await Media.find().sort('-createdAt').limit(500).lean();
      res.json({ success: true, data: list.map(m => ({ ...m, url: urlOf(m._id) })) });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  router.get('/:id', async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).end();
      const etag = '"m-' + req.params.id + '"';
      res.set('Cross-Origin-Resource-Policy', 'cross-origin');      // shown on the storefront, which may be another origin
      if (req.get('if-none-match') === etag) return res.status(304).end();
      const m = await Media.findById(req.params.id).select('+data contentType').lean();
      if (!m) return res.status(404).end();
      res.set({ 'Content-Type': m.contentType, 'Cache-Control': 'public, max-age=31536000, immutable', ETag: etag, 'X-Content-Type-Options': 'nosniff' });
      res.end(Buffer.from(m.data.buffer || m.data));
    } catch (err) {
      console.error('[Media] read error:', err.message);
      res.status(500).end();
    }
  });

  router.delete('/:id', ...admin, async (req, res) => {
    try {
      const url = urlOf(req.params.id);
      const usedBy = await Product.find({ 'images.url': url }).select('name').lean();
      const st = await Setting.findOne({ key: 'store' }).lean();
      const inHome = st && JSON.stringify(st.homepage || {}).includes('media/' + req.params.id);
      if ((usedBy.length || inHome) && req.query.force !== '1') {
        const where = usedBy.map(p => p.name).concat(inHome ? ['the homepage'] : []);
        return res.status(409).json({ success: false, message: 'This photo is still used by: ' + where.join(', ') + '. Remove it there first.', usedBy: where });
      }
      const r = await Media.findByIdAndDelete(req.params.id);
      if (!r) return res.status(404).json({ success: false, message: 'Photo not found' });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  return router;
};
module.exports.sniff = sniff;
