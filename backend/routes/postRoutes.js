'use strict';
/**
 * Blog articles (/api/blogs) and news updates (/api/news) share these routes.
 *   GET    /             public: published posts, newest first (scheduled posts appear once their date has passed)
 *   GET    /admin/all    admin: every post, drafts and scheduled ones included
 *   GET    /:id          public: one published post (admins also see drafts)
 *   POST   /             admin: create        PUT /:id  admin: update        DELETE /:id  admin: delete
 * Input is checked and the article HTML is cleaned in utils/posts.js.
 */
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { protect, authorize } = require('../middleware/auth');
const { cleanPost, liveFilter } = require('../utils/posts');

const shownAt = p => +new Date(p.publishedAt || p.createdAt || 0);
const newestFirst = list => list.sort((a, b) => shownAt(b) - shownAt(a));

module.exports = function createPostRouter(Model, kind, noun) {
  const router = express.Router();
  const admin = [protect, authorize('admin')];
  const fail = (res, err) => {
    if (err.status === 400 || err.name === 'ValidationError') return res.status(400).json({ success: false, message: err.message });
    console.error('[' + noun + ']', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  };

  router.get('/', async (req, res) => {
    try { res.json({ success: true, data: newestFirst(await Model.find(liveFilter()).lean()) }); } catch (err) { fail(res, err); }
  });

  router.get('/admin/all', ...admin, async (req, res) => {
    try { res.json({ success: true, data: newestFirst(await Model.find().lean()) }); } catch (err) { fail(res, err); }
  });

  router.get('/:id', async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ success: false, message: noun + ' not found' });
      const post = await Model.findById(req.params.id).lean();
      let isAdmin = false;
      if (post && !post.isActive || post && post.publishedAt && new Date(post.publishedAt) > new Date()) {   // drafts: only for a signed-in admin (role checked in the database)
        try { const t = (req.get('authorization') || '').replace(/^Bearer\s+/i, ''); const d = t && jwt.verify(t, process.env.JWT_SECRET); const u = d && await require('../models/User').findById(d.id || d.userId).select('role').lean(); isAdmin = !!(u && u.role === 'admin'); } catch (e) { /* not signed in */ }
      }
      const live = post && post.isActive && (!post.publishedAt || new Date(post.publishedAt) <= new Date());
      if (!post || (!live && !isAdmin)) return res.status(404).json({ success: false, message: noun + ' not found' });
      res.json({ success: true, data: post });
    } catch (err) { fail(res, err); }
  });

  router.post('/', ...admin, async (req, res) => {
    try { const post = await Model.create(cleanPost(req.body, kind, true)); res.status(201).json({ success: true, data: post }); } catch (err) { fail(res, err); }
  });

  router.put('/:id', ...admin, async (req, res) => {
    try {
      const upd = cleanPost(req.body, kind, false);
      const post = await Model.findByIdAndUpdate(req.params.id, upd, { new: true, runValidators: true }).lean();
      if (!post) return res.status(404).json({ success: false, message: noun + ' not found' });
      res.json({ success: true, data: post });
    } catch (err) { fail(res, err); }
  });

  router.delete('/:id', ...admin, async (req, res) => {
    try {
      const post = await Model.findByIdAndDelete(req.params.id).lean();
      if (!post) return res.status(404).json({ success: false, message: noun + ' not found' });
      res.json({ success: true, message: noun + ' deleted' });
    } catch (err) { fail(res, err); }
  });

  return router;
};
