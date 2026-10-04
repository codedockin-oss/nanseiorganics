/* Nansei Organics — checkout (contact, delivery, payment on one page; the order is created exactly once).
   COD:    POST /orders                      -> the order
   Online: POST /orders/razorpay/create -> Razorpay window -> POST /orders/razorpay/verify (saves the order) -> the order */
(function () {
  'use strict';
  var C = window.NANSEI_CONFIG || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var STATES = ['Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'];
  var API = window.API_BASE || '/api';
  var wrap = $('#coWrap');
  var DRAFT_KEY = 'nansei:co-draft';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(n) { return '₹' + Math.round(n).toLocaleString('en-IN'); }
  function token() { return sessionStorage.getItem('nansai_admin_token') || localStorage.getItem('nansai_token') || sessionStorage.getItem('nansai_token'); }
  function readCart() { try { return JSON.parse(localStorage.getItem('cart') || '[]'); } catch (e) { return []; } }
  function writeCart(c) { localStorage.setItem('cart', JSON.stringify(c)); try { window.dispatchEvent(new Event('storage')); } catch (e) {} }
  function toast(msg) { if (typeof window.showToast === 'function') window.showToast(msg); }
  function api(method, path, body) {
    var h = { 'Content-Type': 'application/json' }; if (token()) h.Authorization = 'Bearer ' + token();
    return fetch(API + path, { method: method, headers: h, body: body ? JSON.stringify(body) : undefined }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok || d.success === false) { var e = new Error(d.message || 'Something went wrong'); e.status = r.status; throw e; }
        return d;
      });
    }, function () { var e = new Error('Could not reach the server. Check your connection and try again.'); e.network = true; throw e; });
  }
  function catalogOld(id) {                       // MRP of a product, to show "you save"
    var p = (window.NS_PRODUCTS || []).filter(function (x) { return String(x.id) === String(id); })[0];
    return p && p.oldPrice && p.price ? p.oldPrice / p.price : 1;
  }

  /* ---------- empty cart ---------- */
  function empty() {
    wrap.className = '';
    wrap.innerHTML = '<div class="co-empty"><h2 class="h-lg">Your cart is <em>empty</em></h2><p class="lead">Add a few things from the farm and come back &mdash; we will keep your details ready.</p><a class="btn" href="shop.html"><span class="btn__t"><span data-t="Shop the collection">Shop the collection</span></span></a></div>';
    var s = $('.co__steps'); if (s) s.hidden = true;
  }
  if (!readCart().length) { empty(); return; }

  $('#dState').innerHTML = STATES.map(function (s) { return '<option' + (s === 'Tamil Nadu' ? ' selected' : '') + '>' + s + '</option>'; }).join('');
  $('#trRet').textContent = (C.RETURN_DAYS || 7) + '-day returns';

  /* ---------- prefill: the signed-in profile, then a draft saved just before sign-in ---------- */
  var F = { phone: '#cPhone', email: '#cEmail', first: '#dFirst', last: '#dLast', addr: '#dAddr', land: '#dLand', city: '#dCity', pin: '#dPin', state: '#dState' };
  function fill(a) { Object.keys(F).forEach(function (k) { if (a && a[k] && (!$(F[k]).value.trim() || k === 'state')) $(F[k]).value = a[k]; }); }
  function prefill() {
    try { var d = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || 'null'); if (d) { fill(d); sessionStorage.removeItem(DRAFT_KEY); } } catch (e) {}
    try {
      var me = JSON.parse(localStorage.getItem('nansai_user') || 'null');
      if (me) { var nm = String(me.name || (me.firstName || '') + ' ' + (me.lastName || '')).trim().split(/\s+/); fill({ email: me.email, phone: String(me.phone || '').replace(/\D/g, '').slice(-10), first: nm.shift(), last: nm.join(' ') }); }
    } catch (e) {}
    step();
  }
  function saveDraft() { var a = {}; Object.keys(F).forEach(function (k) { a[k] = $(F[k]).value.trim(); }); try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(a)); } catch (e) {} }
  $('#cPhone').addEventListener('input', function (e) { e.target.value = e.target.value.replace(/\D/g, '').slice(-10); });
  $('#dPin').addEventListener('input', function (e) { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6); lookupPin(e.target.value); });

  var pinTimer = null;
  function lookupPin(v) {                           // fills town and state from the pincode (silently skipped if the lookup is unavailable)
    clearTimeout(pinTimer);
    if (!/^[1-9]\d{5}$/.test(v)) return;
    pinTimer = setTimeout(function () {
      fetch('https://api.postalpincode.in/pincode/' + v).then(function (r) { return r.json(); }).then(function (d) {
        var po = d && d[0] && d[0].Status === 'Success' && d[0].PostOffice && d[0].PostOffice[0];
        if (!po) return;
        if (!$('#dCity').value.trim()) $('#dCity').value = po.District;
        if (STATES.indexOf(po.State) > -1) $('#dState').value = po.State;
        step();
      }).catch(function () {});
    }, 500);
  }

  /* ---------- state ---------- */
  var method = 'online';
  var promo = { code: '', discount: 0 };
  var busyNow = false;

  function totals() {
    var cart = readCart(), sub = 0, orig = 0;
    cart.forEach(function (i) { var line = i.price * i.qty; sub += line; orig += line * catalogOld(i.id); });
    var cd = Math.min(promo.discount, sub), taxable = Math.max(0, sub - cd);
    var gst = Math.round(taxable * 0.05);
    var ship = C.FREE_SHIPPING_ABOVE && sub >= C.FREE_SHIPPING_ABOVE ? 0 : (C.SHIPPING_FEE || 0);
    return { sub: sub, mrpSave: Math.max(0, Math.round(orig - sub)), coupon: cd, gst: gst, ship: ship, total: taxable + gst + ship };
  }

  /* ---------- payment options ---------- */
  function renderOptions() {
    var opts = [
      { v: 'online', t: 'Pay online', s: 'Fast, secure checkout', brand: 'Razorpay', methods: ['UPI', 'Cards', 'Net banking', 'Wallets'] },
      { v: 'cod', t: 'Cash on Delivery', s: 'Pay when your parcel arrives', ic: 'cash' },
    ];
    $('#payOpts').innerHTML = opts.map(function (o) {
      return '<label class="opt' + (o.v === 'online' ? ' opt--razorpay' : '') + '"><input type="radio" name="pay" value="' + o.v + '"' + (o.v === method ? ' checked' : '') + '><span class="dot"></span><span class="opt__body"><span class="opt__title"><span>' + o.t + '</span>' +
        (o.brand ? '<span class="opt__brand"><n-icon name="lock"></n-icon> Secured by ' + o.brand + '</span>' : '') + '</span><span class="opt__sub">' + o.s + '</span>' +
        (o.methods ? '<span class="opt__methods">' + o.methods.map(function (m) { return '<span>' + m + '</span>'; }).join('') + '</span>' : '') + '</span></label>';
    }).join('');
  }
  $('#payOpts').addEventListener('change', function (e) { if (e.target.name === 'pay') { method = e.target.value; render(); } });

  /* ---------- summary ---------- */
  function render() {
    var cart = readCart();
    if (!cart.length) { empty(); return; }
    var t = totals();
    $('#sumItems').innerHTML = cart.map(function (l, idx) {
      var m = catalogOld(l.id), line = l.price * l.qty;
      return '<div class="line-item"><span class="line-item__img"><img src="' + esc(l.image) + '" alt="" onerror="this.style.visibility=\'hidden\'"><b>' + l.qty + '</b></span>' +
        '<div><p class="line-item__name">' + esc(l.name) + '</p><p class="line-item__meta">' + esc(l.qtyLabel || l.selectedQuantity || '') + '</p>' +
        '<div class="line-item__ctl"><span class="co-qty"><button type="button" data-q="-1" data-i="' + idx + '" aria-label="Decrease quantity">&minus;</button><span>' + l.qty + '</span><button type="button" data-q="1" data-i="' + idx + '" aria-label="Increase quantity">+</button></span>' +
        '<button type="button" class="co-rm" data-rm="' + idx + '">Remove</button></div></div>' +
        '<p class="line-item__price">' + fmt(line) + (m > 1.005 ? '<s>' + fmt(line * m) + '</s>' : '') + '</p></div>';
    }).join('');
    var left = C.FREE_SHIPPING_ABOVE && C.SHIPPING_FEE ? C.FREE_SHIPPING_ABOVE - t.sub : 0;
    $('#sumTotals').innerHTML =
      '<div class="sum-row"><span>Subtotal</span><span>' + fmt(t.sub) + '</span></div>' +
      (t.coupon ? '<div class="sum-row" style="color:var(--accent-2)"><span>Promo (' + esc(promo.code) + ')</span><span>&minus;' + fmt(t.coupon) + '</span></div>' : '') +
      '<div class="sum-row"><span>Delivery</span><span>' + (t.ship ? fmt(t.ship) : 'Free') + '</span></div>' +
      (left > 0 ? '<div class="sum-row" style="font-size:12.5px;color:rgba(255,255,255,.5)"><span>Add ' + fmt(left) + ' more for free delivery</span><span></span></div>' : '') +
      '<div class="sum-row"><span>GST (5%)</span><span>' + fmt(t.gst) + '</span></div>' +
      ((t.mrpSave + t.coupon) > 0 ? '<div class="sum-row" style="color:#8fd1a8;font-weight:700"><span>You save</span><span>' + fmt(t.mrpSave + t.coupon) + '</span></div>' : '') +
      '<div class="sum-row total"><span>Total</span><span id="coTotal">' + fmt(t.total) + '</span></div>';
    var label = method === 'online' ? 'Pay ' + fmt(t.total) + ' securely' : 'Place order · ' + fmt(t.total);
    var pl = $('#placeLabel'); pl.textContent = label; pl.setAttribute('data-t', label);
  }
  $('#sumItems').addEventListener('click', function (e) {
    var q = e.target.closest('[data-q]'), rm = e.target.closest('[data-rm]'), cart = readCart();
    if (q) { var i = +q.getAttribute('data-i'); cart[i].qty = Math.max(1, Math.min(99, cart[i].qty + (+q.getAttribute('data-q')))); }
    else if (rm) { cart.splice(+rm.getAttribute('data-rm'), 1); }
    else return;
    writeCart(cart);
    if (promo.code) applyPromo(promo.code, true);   // the discount depends on the subtotal
    else render();
  });

  /* ---------- promo code ---------- */
  function couponAmount(c, sub) {
    if (c.minOrderAmount && sub < c.minOrderAmount) return { error: 'Spend ' + fmt(c.minOrderAmount) + ' or more to use this code.' };
    var d = c.discountType === 'percentage' ? sub * c.discountValue / 100 : c.discountValue;
    if (c.maxDiscount) d = Math.min(d, c.maxDiscount);
    return { amount: Math.round(Math.min(d, sub)) };
  }
  function applyPromo(code, silent) {
    var msg = $('#promoMsg');
    return api('POST', '/coupons/validate', { code: code }).then(function (r) {
      var c = r.data || r.coupon, res = couponAmount(c, totals().sub - 0);
      if (res.error) { promo = { code: '', discount: 0 }; msg.style.color = '#ff9c8f'; msg.textContent = res.error; render(); return; }
      promo = { code: c.code, discount: res.amount };
      msg.style.color = 'var(--accent-2)'; msg.textContent = '“' + c.code + '” applied — you save ' + fmt(res.amount) + '.'; render();
    }).catch(function (err) {
      promo = { code: '', discount: 0 }; render();
      if (!silent || err.status !== 404) { msg.style.color = '#ff9c8f'; msg.textContent = err.status === 401 ? 'Sign in to use a promo code.' : (err.message || 'That code did not work.'); }
    });
  }
  $('#promoForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var code = $('#promoIn').value.trim().toUpperCase();
    if (!code) return;
    if (!token()) { $('#promoMsg').style.color = '#ff9c8f'; $('#promoMsg').textContent = 'Sign in to use a promo code.'; return; }
    applyPromo(code, false);
  });

  /* ---------- progress + validation ---------- */
  var okPhone = function () { return /^[6-9]\d{9}$/.test($('#cPhone').value.trim()); };
  var okEmail = function () { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test($('#cEmail').value.trim()); };
  var reqD = ['#dFirst', '#dAddr', '#dCity'];
  var okDelivery = function () { return reqD.every(function (s) { return $(s).value.trim().length > 1; }) && /^[1-9]\d{5}$/.test($('#dPin').value.trim()); };
  function step() {
    var a = okPhone() && okEmail(), b = okDelivery();
    $('#cardContact').classList.toggle('is-done', a); $('#cardDelivery').classList.toggle('is-done', b); $('#cardPay').classList.toggle('is-done', a && b);
    $('#st1').classList.toggle('is-done', a); $('#st2').classList.toggle('is-done', b); $('#st3').classList.toggle('is-done', a && b);
  }
  $$('#coForm input, #coForm select').forEach(function (el) {
    el.addEventListener('input', function () { var f = el.closest('.field'); if (f) f.classList.remove('invalid'); step(); });
    el.addEventListener('change', step);
  });
  function validate() {
    var bad = [];
    var mark = function (sel, ok) { var f = $(sel).closest('.field'); if (f) f.classList.toggle('invalid', !ok); if (!ok) bad.push(sel); };
    mark('#cPhone', okPhone()); mark('#cEmail', okEmail());
    reqD.forEach(function (s) { mark(s, $(s).value.trim().length > 1); });
    mark('#dPin', /^[1-9]\d{5}$/.test($('#dPin').value.trim()));
    return bad[0] || null;
  }
  var val = function (s) { return $(s).value.trim(); };

  /* ---------- the order ---------- */
  function buildPayload(payMethod) {
    var cart = readCart(), t = totals(), d = new Date(); d.setDate(d.getDate() + 5);
    var land = val('#dLand');
    return {
      items: cart.map(function (c) { return { product: c.id, name: c.name || 'Product', image: c.image, quantity: c.qty, selectedQuantity: c.selectedQuantity || c.qtyLabel || String(c.qty), selectedUnit: c.selectedUnit || c.unit || '', selectedPrice: c.selectedPrice != null ? c.selectedPrice : c.price, price: c.price }; }),
      shippingAddress: { fullName: (val('#dFirst') + ' ' + val('#dLast')).trim(), phone: val('#cPhone'), email: val('#cEmail'), addressLine1: val('#dAddr'), addressLine2: land ? 'Landmark: ' + land : '', city: val('#dCity'), state: val('#dState'), pincode: val('#dPin'), country: 'India' },
      paymentMethod: payMethod,
      couponCode: promo.code || undefined,
      itemsPrice: t.sub, taxPrice: t.gst, shippingPrice: t.ship, discount: t.mrpSave + t.coupon, totalPrice: t.total,
      estimatedDelivery: d.toISOString(),
    };
  }
  function waMessage(o) {
    var lines = (o.items || []).map(function (i) { return '• ' + i.name + ' × ' + i.quantity; }).join('\n');
    return 'Hi Nansei Organics! I placed order ' + (o.orderNumber || '') + '.\n\n' + lines + '\n\nTotal: ' + fmt(o.totalPrice) + '\nPayment: ' + (o.isPaid ? 'Paid online' : 'Cash on Delivery');
  }
  function finalize(o) {
    writeCart([]); promo = { code: '', discount: 0 };
    var num = o.orderNumber || String(o._id || '').slice(-8);
    var first = ((o.shippingAddress && o.shippingAddress.fullName) || '').split(' ')[0];
    $('#okId').textContent = num;
    $('#okText').textContent = (o.isPaid ? 'Payment received' : 'Your order is placed') + (first ? ', ' + first : '') + '. We will email your confirmation and message you with tracking as soon as it ships.';
    $('#okWa').href = 'https://wa.me/' + (C.PHONE_RAW || '916382142578') + '?text=' + encodeURIComponent(waMessage(o));
    var s = $('#success'); s.classList.add('is-on'); s.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-locked');
    setTimeout(function () { var b = $('#okTrack'); if (b) b.focus(); }, 300);
  }

  var btn = $('#placeBtn');
  function busy(on) {
    busyNow = on; btn.disabled = on;
    if (on) { btn.dataset.html = btn.innerHTML; btn.innerHTML = '<span class="spinner"></span><span>' + (method === 'online' ? 'Preparing secure payment…' : 'Placing your order…') + '</span>'; }
    else if (btn.dataset.html) { btn.innerHTML = btn.dataset.html; render(); }
  }

  function payOnline() {
    var t = totals(), payload = buildPayload('Razorpay');
    api('POST', '/orders/razorpay/create', { amount: t.total, currency: 'INR' }).then(function (r) {
      var rz = r.data;
      if (!window.Razorpay) { busy(false); toast('The payment window could not load. Check your connection or choose Cash on Delivery.'); return; }
      var inst = new window.Razorpay({
        key: rz.keyId, order_id: rz.orderId, amount: rz.amount, currency: rz.currency || 'INR', name: 'Nansei Organics',
        description: readCart().length + ' item' + (readCart().length > 1 ? 's' : ''),
        prefill: { name: payload.shippingAddress.fullName, email: payload.shippingAddress.email, contact: '+91' + payload.shippingAddress.phone },
        theme: { color: '#0f2218' },
        handler: function (resp) {
          api('POST', '/orders/razorpay/verify', { razorpay_order_id: resp.razorpay_order_id, razorpay_payment_id: resp.razorpay_payment_id, razorpay_signature: resp.razorpay_signature, orderPayload: payload })
            .then(function (v) {
              busy(false);
              if (v.data) finalize(v.data);
              else toast('Payment received (' + resp.razorpay_payment_id + '). We could not save the order automatically — please WhatsApp us this number.');
            })
            .catch(function (err) { busy(false); toast('Payment received (' + resp.razorpay_payment_id + ') but the order could not be saved: ' + err.message + ' Please WhatsApp us this number.'); });
        },
        modal: { ondismiss: function () { if (busyNow) { busy(false); toast('Payment cancelled. You can try again when you are ready.'); } } },
      });
      inst.on('payment.failed', function (resp) { busy(false); toast('Payment failed' + (resp && resp.error && resp.error.description ? ' — ' + resp.error.description : '') + '. Please try again.'); });
      inst.open();
    }).catch(function (err) { busy(false); toast(err.message); });
  }

  $('#coForm').addEventListener('submit', function (e) {
    e.preventDefault();
    if (busyNow) return;
    var bad = validate();
    if (bad) {
      var card = $(bad).closest('.co-card');
      card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(function () { $(bad).focus({ preventScroll: true }); }, 500);
      toast('Please check the highlighted fields');
      return;
    }
    if (!token()) {                                   // orders belong to an account: sign in, then come straight back with everything filled in
      saveDraft(); toast('Please sign in to place your order.');
      setTimeout(function () { window.location.href = 'login.html?next=checkout.html'; }, 900);
      return;
    }
    busy(true);
    if (method === 'online') { payOnline(); return; }
    api('POST', '/orders', buildPayload('COD')).then(function (r) { busy(false); finalize(r.data); })
      .catch(function (err) { busy(false); toast(err.message); });
  });

  renderOptions(); render(); prefill();
  if (token() && !promo.code) { /* promo codes are validated on demand */ }
})();
