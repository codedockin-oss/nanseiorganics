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
}, { timestamps: true });

module.exports = mongoose.model('Blog', BlogSchema);
