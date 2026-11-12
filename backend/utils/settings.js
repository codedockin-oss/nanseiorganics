'use strict';
/**
 * Store settings: one place for contact details, delivery charges, COD and the announcement bar.
 * Read through getStoreSettings() (cached for a minute); every value has a default so the store
 * works before the admin has saved anything. Env vars FREE_SHIPPING_ABOVE / SHIPPING_FEE stay as defaults.
 */
const CACHE_MS = 60 * 1000;
let cache = null;
let cachedAt = 0;

function defaults() {
  return {
    storeName: 'Nansei Organics',
    contact: { phone: '+91 63821 42578', whatsapp: '916382142578', email: 'athanyanis@gmail.com', address: 'Tamil Nadu, India' },
    legal: { businessName: '', gstin: '', fssai: '', grievanceName: '', grievanceEmail: '', grievancePhone: '' },
    shipping: {
      freeShippingAbove: Number(process.env.FREE_SHIPPING_ABOVE || 999),
      shippingFee: Number(process.env.SHIPPING_FEE || 0),
      codEnabled: true,
      codFee: 0,
      dispatchNote: '',
    },
    announcement: { enabled: true, items: [] },
    social: { instagram: '', facebook: '', youtube: '' },
  };
}

/** saved values over defaults, one level deep (empty strings and nulls keep the default) */
function merge(base, saved) {
  const out = JSON.parse(JSON.stringify(base));
  if (!saved) return out;
  for (const k of Object.keys(out)) {
    const v = saved[k];
    if (v === undefined || v === null) continue;
    if (out[k] && typeof out[k] === 'object' && !Array.isArray(out[k])) {
      for (const kk of Object.keys(out[k])) {
        const vv = v[kk];
        if (vv === undefined || vv === null || vv === '') continue;
        out[k][kk] = vv;
      }
    } else if (v !== '') {
      out[k] = v;
    }
  }
  if (saved.announcement && Array.isArray(saved.announcement.items)) {
    out.announcement.items = saved.announcement.items.map(i => ({ text: i.text || '', code: i.code || '', link: i.link || '' })).filter(i => i.text);
  }
  return out;
}

async function getStoreSettings() {
  if (cache && Date.now() - cachedAt < CACHE_MS) return cache;
  let saved = null;
  try {
    const Setting = require('../models/Setting');
    saved = await Setting.findOne({ key: 'store' }).lean();
  } catch (e) { /* database not reachable: use defaults */ }
  cache = merge(defaults(), saved);
  cachedAt = Date.now();
  return cache;
}

function clearSettingsCache() { cache = null; cachedAt = 0; }

/** the numbers the order guard and the checkout need */
function pricingFrom(s) {
  const sh = (s && s.shipping) || defaults().shipping;
  return {
    gstRate: 0.05,
    freeShippingAbove: Number(sh.freeShippingAbove) || 0,
    shippingFee: Number(sh.shippingFee) || 0,
    codEnabled: sh.codEnabled !== false,
    codFee: Number(sh.codFee) || 0,
  };
}

/** what any visitor may see */
function publicSettings(s) {
  return {
    storeName: s.storeName,
    contact: s.contact,
    legal: { businessName: s.legal.businessName, gstin: s.legal.gstin, fssai: s.legal.fssai,
      grievanceName: s.legal.grievanceName, grievanceEmail: s.legal.grievanceEmail, grievancePhone: s.legal.grievancePhone },
    shipping: { ...pricingFrom(s), dispatchNote: s.shipping.dispatchNote },
    announcement: s.announcement.enabled ? s.announcement.items : [],
    social: s.social,
  };
}

module.exports = { getStoreSettings, clearSettingsCache, pricingFrom, publicSettings, defaults, merge };
