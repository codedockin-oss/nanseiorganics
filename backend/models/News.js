const mongoose = require('mongoose');

const NewsSchema = new mongoose.Schema({
  title:      { type: String, required: true, trim: true },
  category:   { type: String, required: true },
  catLabel:   { type: String },
  catColor:   { type: String },
  catBg:      { type: String },
  readTime:   { type: String, default: '3 min read' },
  image:      { type: String, default: '' },
  excerpt:    { type: String },
  content:    { type: String, required: true },
  rawContent: { type: String },
  pinned:     { type: Boolean, default: false },
  featured:   { type: Boolean, default: false },
  isActive:   { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('News', NewsSchema);
