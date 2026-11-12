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

/** Only these fields can be saved, each cleaned and checked. */
function cleanSettings(b) {
  b = b || {};
  const c = b.contact || {}, l = b.legal || {}, sh = b.shipping || {}, an = b.announcement || {}, so = b.social || {};
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
    social: { instagram: url(so.instagram), facebook: url(so.facebook), youtube: url(so.youtube) },
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
