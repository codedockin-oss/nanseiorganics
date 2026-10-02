/* ==========================================================================
   Nansei Organics — store settings
   --------------------------------------------------------------------------
   The one file to edit for day-to-day changes: phone, email, shipping and
   return rules, social links. The announcement bar, footer, contact page,
   FAQ, WhatsApp button and policy summaries all read from here.

   Lines marked  CONFIG  still hold placeholder values — please confirm them.
   Leave PHONE / PHONE_RAW empty to hide every phone, call and WhatsApp link.
   ========================================================================== */
document.documentElement.classList.add('js');
window.NANSEI_CONFIG = {
  BRAND: 'Nansei Organics',
  TAGLINE: 'Experience the Root of Nature',
  SITE_URL: 'https://nansaiorganics.netlify.app',     // CONFIG: your live domain

  // Contact
  PHONE: '+91 63821 42578',                           // CONFIG: confirm  (empty = hidden everywhere). This is the number the original policy pages gave.
  PHONE_RAW: '916382142578',                          // CONFIG: country code + number, digits only (used for WhatsApp + call links)
  EMAIL: 'athanyanis@gmail.com',                      // CONFIG: confirm  (taken from the original policy pages; switch to a domain address when you have one)
  INSTAGRAM_URL: '',                                  // CONFIG: e.g. 'https://www.instagram.com/yourhandle/' (empty = hidden)
  ADDRESS_LINE: 'Tamil Nadu, India',                  // CONFIG: full farm / office address + pincode
  HOURS_LINE: 'Monday – Saturday, 9 AM – 6 PM',       // CONFIG: real hours
  REPLY_TIME: 'We usually reply within a few hours.', // CONFIG

  // Shipping & returns (shown on the announcement bar, FAQ, policy summaries)
  FREE_SHIPPING_ABOVE: 999,                           // ₹ — free delivery on orders at or above this amount
  RETURN_DAYS: 7,                                     // days to request a return / replacement
  COURIER_NOTE: 'Tracked couriers, delivered across India',
  DISPATCH_DAYS: '1–2 working days',               // CONFIG: how long you usually take to pack and hand over an order
  DELIVERY_DAYS: '3–7 working days',               // CONFIG: typical delivery time after dispatch

  // Legal (required on Indian e-commerce sites)
  LEGAL_NAME: 'Nansei Organics',                      // CONFIG: registered business / proprietor name
  GSTIN: '',                                          // CONFIG
  FSSAI: '',                                          // CONFIG: food licence number
  POLICY_UPDATED: 'January 2026'
};

(function () {
  var C = window.NANSEI_CONFIG;
  /* helpers every page can use */
  C.hasPhone = function () { return !!(C.PHONE_RAW && /^\d{10,15}$/.test(C.PHONE_RAW)); };
  C.wa = function (text) { return C.hasPhone() ? 'https://wa.me/' + C.PHONE_RAW + (text ? '?text=' + encodeURIComponent(text) : '') : ''; };
  C.tel = function () { return C.hasPhone() ? 'tel:+' + C.PHONE_RAW : ''; };
  C.mail = function (subject) { return 'mailto:' + C.EMAIL + (subject ? '?subject=' + encodeURIComponent(subject) : ''); };
  C.freeShipText = function () { return 'Free delivery on orders above ₹' + C.FREE_SHIPPING_ABOVE; };
  C.returnText = function () { return C.RETURN_DAYS + '-day easy returns'; };

  /* [data-cfg="phone|email|address|hours|reply|brand|tagline|free|returns"] and [data-cfg-href="wa|tel|mail"] are filled in on load;
     [data-cfg-if="phone|insta"] elements are removed when that setting is empty. */
  function fill() {
    var map = {
      phone: C.PHONE, email: C.EMAIL, address: C.ADDRESS_LINE, hours: C.HOURS_LINE, reply: C.REPLY_TIME, brand: C.BRAND, tagline: C.TAGLINE,
      dispatch: C.DISPATCH_DAYS, delivery: C.DELIVERY_DAYS,
      free: C.freeShipText(), returns: C.returnText(), freeamt: '₹' + C.FREE_SHIPPING_ABOVE, retdays: String(C.RETURN_DAYS), legal: C.LEGAL_NAME,
      updated: C.POLICY_UPDATED, year: String(new Date().getFullYear())
    };
    [].forEach.call(document.querySelectorAll('[data-cfg]'), function (el) { var v = map[el.getAttribute('data-cfg')]; if (v != null) el.textContent = v; });
    [].forEach.call(document.querySelectorAll('[data-cfg-href]'), function (el) {
      var k = el.getAttribute('data-cfg-href'), msg = el.getAttribute('data-wa-text') || '';
      var h = k === 'wa' ? C.wa(msg) : k === 'tel' ? C.tel() : k === 'mail' ? C.mail(el.getAttribute('data-subject') || '') : k === 'insta' ? C.INSTAGRAM_URL : '';
      if (h) el.setAttribute('href', h); else el.remove();
    });
    [].forEach.call(document.querySelectorAll('[data-cfg-if]'), function (el) {
      var k = el.getAttribute('data-cfg-if');
      var on = k === 'phone' ? C.hasPhone() : k === 'insta' ? !!C.INSTAGRAM_URL : k === 'gst' ? !!C.GSTIN : k === 'fssai' ? !!C.FSSAI : true;
      if (!on) el.remove();
    });
  }
  window.nanseiFillConfig = fill;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fill); else fill();
})();
