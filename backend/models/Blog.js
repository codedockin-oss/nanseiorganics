const mongoose = require('mongoose');

const BlogSchema = new mongoose.Schema({
  title:      { type: String, required: true, trim: true },
  category:   { type: String, required: true },
  catLabel:   { type: String },
  catColor:   { type: String },
  catBg:      { type: String },
  author:     { type: String, default: 'Nansai Farm Team' },
  readTime:   { type: String, default: '4 min' },
  image:      { type: String, default: '' },
  excerpt:    { type: String, required: true },
  content:    { type: String, required: true },
  rawContent: { type: String },
  featured:   { type: Boolean, default: false },
  isActive:   { type: Boolean, default: true },
  tags:       { type: [String], default: [] },
  imageAlt:   { type: String, maxlength: 200 },
  metaTitle:  { type: String, maxlength: 70 },
  metaDescription: { type: String, maxlength: 170 },
  publishedAt: { type: Date, default: null },     // date shown on the site; a future date keeps the post hidden until then
}, { timestamps: true });

module.exports = mongoose.model('Blog', BlogSchema);
