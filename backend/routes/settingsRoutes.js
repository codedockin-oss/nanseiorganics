const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const Setting = require('../models/Setting');
const { getStoreSettings, clearSettingsCache, publicSettings } = require('../utils/settings');

const text = (v, max) => String(v == null ? '' : v).replace(/<[^>]*>/g, '').replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, max);
const amount = (v, max) => {
  if (v === '' || v === null || v === undefined) return undefined;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > max) throw new Error('Please enter an amount between 0 and ' + max);
  return Math.round(n);
};
const url = v => {
  const s = text(v, 300);
  if (s && !/^https:\/\//i.test(s)) throw new Error('Links must start with https://');
  return s;
};
const storefrontHref = (v, max, label) => {
  const s = text(v, max);
  if (s && !(/^(https:\/\/|#[a-z0-9_-]+$)/i.test(s) || /^[a-z0-9][a-z0-9_./?=&%#-]*$/i.test(s))) throw new Error(label + ' must be a safe site path or https:// link');
  return s;
};

/** Only these fields can be saved, each cleaned and checked. */
/** an https:// link, a photo uploaded to /api/media/…, or one of the site's own files (images/…, videos/…) */
function mediaLink(v, what) {
  const u = text(v, 600);
  if (!u) return '';
  if (/^https:\/\/[^\s"'<>]+$/i.test(u) || /^\/api\/media\/[a-f0-9]{24}$/i.test(u) || /^(\.\/)?(images|videos)\/[^"'<>]+$/i.test(u)) return u;
  throw new Error(what + ' must be an https:// link or an uploaded photo');
}
/** undefined = leave as is; otherwise a cleaned list without empty rows */
function listOf(v, max, map, keep) {
  if (v === undefined) return undefined;
  if (!Array.isArray(v)) return [];
  return v.slice(0, max).map(x => map(x || {})).filter(keep);
}
function cleanSettings(b) {
  b = b || {};
  const c = b.contact || {}, l = b.legal || {}, sh = b.shipping || {}, an = b.announcement || {}, so = b.social || {}, home = b.homepage || {}, footer = b.footer || {};
  const email = text(c.email, 120).toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Please enter a valid email address');
  const gstin = text(l.gstin, 15).toUpperCase();
  if (gstin && !/^[0-9]{2}[A-Z0-9]{13}$/.test(gstin)) throw new Error('GSTIN should be 15 characters, starting with the 2-digit state code');
  const fssai = text(l.fssai, 20);
  const grievanceEmail = text(l.grievanceEmail, 120).toLowerCase();
  if (grievanceEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(grievanceEmail)) throw new Error('Please enter a valid email for the grievance officer');
  if (fssai && !/^[0-9]{14}$/.test(fssai)) throw new Error('FSSAI licence numbers are 14 digits');
  const items = Array.isArray(an.items) ? an.items.slice(0, 8).map(i => ({
    text: text(i && i.text, 140), code: text(i && i.code, 30).toUpperCase(), link: text(i && i.link, 300),
  })).filter(i => i.text) : [];
  const heroMediaType = ['image', 'video'].includes(home.heroMediaType) ? home.heroMediaType : undefined;
  const heroMediaUrl = text(home.heroMediaUrl, 500);
  if (heroMediaUrl && !/^https:\/\//i.test(heroMediaUrl) && !/^(?!\/\/)[a-z0-9][a-z0-9_./?=&%#-]*$/i.test(heroMediaUrl)) throw new Error('Hero media must be an https:// URL or a relative asset path');
  return {
    storeName: text(b.storeName, 80),
    contact: { phone: text(c.phone, 20), whatsapp: text(c.whatsapp, 20).replace(/\D/g, ''), email, address: text(c.address, 300) },
    legal: { businessName: text(l.businessName, 120), gstin, fssai, grievanceName: text(l.grievanceName, 80), grievanceEmail, grievancePhone: text(l.grievancePhone, 20) },
    shipping: {
      freeShippingAbove: amount(sh.freeShippingAbove, 100000),
      shippingFee: amount(sh.shippingFee, 1000),
      codEnabled: sh.codEnabled === undefined ? undefined : !!sh.codEnabled,
      codFee: amount(sh.codFee, 500),
      dispatchNote: text(sh.dispatchNote, 160),
    },
    announcement: { enabled: an.enabled === undefined ? true : !!an.enabled, items },
    homepage: {
      heroEyebrow: text(home.heroEyebrow, 80), heroTitle: text(home.heroTitle, 120), heroEmphasis: text(home.heroEmphasis, 60),
      heroDescription: text(home.heroDescription, 300), heroCtaText: text(home.heroCtaText, 50),
      heroCtaHref: storefrontHref(home.heroCtaHref, 300, 'Hero button link'),
      heroMediaType, heroMediaUrl,
      showHero: home.showHero === undefined ? undefined : !!home.showHero,
      showCategories: home.showCategories === undefined ? undefined : !!home.showCategories,
      showProducts: home.showProducts === undefined ? undefined : !!home.showProducts,
      showBlog: home.showBlog === undefined ? undefined : !!home.showBlog,
      showFaq: home.showFaq === undefined ? undefined : !!home.showFaq,
      showReels: home.showReels === undefined ? undefined : !!home.showReels,
      gallery: listOf(home.gallery, 24, g => ({ image: mediaLink(g.image, 'Gallery photo'), caption: text(g.caption, 120), tag: text(g.tag, 40) }), g => g.image),
      reels: listOf(home.reels, 20, r => ({ video: mediaLink(r.video, 'Reel video'), title: text(r.title, 120), tag: text(r.tag, 40), productId: text(r.productId, 40).replace(/[^a-zA-Z0-9]/g, '') }), r => r.video),
    },
    social: { instagram: url(so.instagram), facebook: url(so.facebook), youtube: url(so.youtube) },
    footer: { about: text(footer.about, 500), showMap: footer.showMap === undefined ? undefined : !!footer.showMap },
  };
}

// GET /api/settings — public: contact details, delivery and COD rules, announcement bar
router.get('/', async (req, res) => {
  const s = await getStoreSettings();
  res.set('Cache-Control', 'public, max-age=60');
  res.json({ success: true, data: publicSettings(s) });
});

// GET /api/settings/admin — admin: everything, as saved (blank fields = default in use)
router.get('/admin', protect, admin, async (req, res) => {
  const saved = await Setting.findOne({ key: 'store' }).lean();
  res.json({ success: true, data: saved || {}, effective: await getStoreSettings() });
});

// PUT /api/settings — admin: save
router.put('/', protect, admin, async (req, res) => {
  let clean;
  try { clean = cleanSettings(req.body); } catch (e) { return res.status(400).json({ success: false, message: e.message }); }
  try {
    const doc = await Setting.findOneAndUpdate(
      { key: 'store' },
      { $set: { ...clean, key: 'store', updatedBy: req.user.id } },
      { upsert: true, new: true, runValidators: true }
    ).lean();
    clearSettingsCache();
    res.json({ success: true, data: doc, effective: await getStoreSettings() });
  } catch (e) {
    console.error('[Settings] save error:', e.message);
    res.status(500).json({ success: false, message: 'Could not save the settings' });
  }
});

module.exports = router;
module.exports.cleanSettings = cleanSettings;
