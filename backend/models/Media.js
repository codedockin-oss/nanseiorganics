const mongoose = require('mongoose');

/**
 * A photo uploaded from the admin panel, kept in the store's own database (no outside image service).
 * The admin panel shrinks photos in the browser before upload (max 1600px, WebP/JPEG), so each is
 * typically 50-400 KB. Served by GET /api/media/:id with long browser caching.
 */
const mediaSchema = new mongoose.Schema({
  name: { type: String, trim: true, maxlength: 140 },          // original file name, for the media library
  alt: { type: String, trim: true, maxlength: 200 },
  contentType: { type: String, required: true },
  size: { type: Number, required: true },                      // bytes
  width: Number,
  height: Number,
  data: { type: Buffer, required: true, select: false },       // never sent in lists
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

mediaSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Media', mediaSchema);
