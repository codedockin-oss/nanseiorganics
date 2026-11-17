const mongoose = require('mongoose');

/**
 * Store settings the admin edits from the admin panel (one document, key "store").
 * Empty values fall back to the defaults in utils/settings.js.
 */
const announcementSchema = new mongoose.Schema({
  text: { type: String, trim: true, maxlength: 140 },
  code: { type: String, trim: true, uppercase: true, maxlength: 30 },   // optional promo code shown next to the text
  link: { type: String, trim: true, maxlength: 300 },
}, { _id: false });

const settingSchema = new mongoose.Schema({
  key: { type: String, default: 'store', unique: true },

  storeName: { type: String, trim: true, maxlength: 80 },
  contact: {
    phone: { type: String, trim: true, maxlength: 20 },
    whatsapp: { type: String, trim: true, maxlength: 20 },
    email: { type: String, trim: true, lowercase: true, maxlength: 120 },
    address: { type: String, trim: true, maxlength: 300 },
  },
  legal: {
    businessName: { type: String, trim: true, maxlength: 120 },
    gstin: { type: String, trim: true, uppercase: true, maxlength: 15 },
    fssai: { type: String, trim: true, maxlength: 20 },
    // Consumer Protection (E-Commerce) Rules 2020: a grievance officer customers can contact
    grievanceName: { type: String, trim: true, maxlength: 80 },
    grievanceEmail: { type: String, trim: true, lowercase: true, maxlength: 120 },
    grievancePhone: { type: String, trim: true, maxlength: 20 },
  },
  shipping: {
    freeShippingAbove: { type: Number, min: 0 },
    shippingFee: { type: Number, min: 0 },
    codEnabled: { type: Boolean },
    codFee: { type: Number, min: 0 },
    dispatchNote: { type: String, trim: true, maxlength: 160 },   // e.g. "Packed and dispatched within 2 working days"
  },
  announcement: {
    enabled: { type: Boolean, default: true },
    items: { type: [announcementSchema], default: [] },
  },
  homepage: {
    heroEyebrow: { type: String, trim: true, maxlength: 80 },
    heroTitle: { type: String, trim: true, maxlength: 120 },
    heroEmphasis: { type: String, trim: true, maxlength: 60 },
    heroDescription: { type: String, trim: true, maxlength: 300 },
    heroCtaText: { type: String, trim: true, maxlength: 50 },
    heroCtaHref: { type: String, trim: true, maxlength: 300 },
    heroMediaType: { type: String, enum: ['video', 'image'] },
    heroMediaUrl: { type: String, trim: true, maxlength: 500 },
    showHero: { type: Boolean },
    showCategories: { type: Boolean },
    showProducts: { type: Boolean },
    showBlog: { type: Boolean },
    showFaq: { type: Boolean },
    showReels: { type: Boolean },
    // "Moments from our farm" photos and the reels that slide in on the home page
    gallery: { type: [{ _id: false, image: { type: String, trim: true, maxlength: 600 }, caption: { type: String, trim: true, maxlength: 120 }, tag: { type: String, trim: true, maxlength: 40 } }], default: undefined },
    reels: { type: [{ _id: false, video: { type: String, trim: true, maxlength: 600 }, title: { type: String, trim: true, maxlength: 120 }, tag: { type: String, trim: true, maxlength: 40 }, productId: { type: String, trim: true, maxlength: 40 } }], default: undefined },
  },
  social: {
    instagram: { type: String, trim: true, maxlength: 300 },
    facebook: { type: String, trim: true, maxlength: 300 },
    youtube: { type: String, trim: true, maxlength: 300 },
  },
  footer: {
    about: { type: String, trim: true, maxlength: 500 },
    showMap: { type: Boolean },
  },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Setting', settingSchema);
