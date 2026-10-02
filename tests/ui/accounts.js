// Pre-deploy account tests, driven through the real pages in Chrome against the mock API (which behaves like the real auth controller):
// sign in · wrong passwords · register · forgot + reset password · sessions · sign out · protected pages · admin gate · guest -> sign in -> back to checkout.
// usage: node accounts.js [nameFilter]
const { PAGES_URL, API_PORT, launch, seedStorage, sleep } = require('./lib');

const filter = process.argv[2];
let browser;
const tests = [];
const add = (name, fn) => { if (!filter || name.toLowerCase().includes(filter.toLowerCase())) tests.push({ name, fn }); };
const check = (c, m) => { if (!c) throw new Error(m); };
const API = `http://127.0.0.1:${API_PORT}/api`;
const resetMock = () => Promise.all([fetch(API + '/__accounts', { method: 'POST' }), fetch(API + '/__reset', { method: 'POST' })]);

async function newPage(width = 1280, { storage = null, auth = false } = {}) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  const mobile = width < 500;
  await page.setViewport({ width, height: mobile ? 844 : 900, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
  page.__errors = []; page.__reqs = [];
  page.on('pageerror', e => page.__errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) page.__errors.push('console: ' + m.text().slice(0, 140)); });
  page.on('request', r => { if (/\/api\/auth\//.test(r.url())) page.__reqs.push(r.method() + ' ' + r.url().replace(/^.*\/api/, '')); });
  if (auth || storage) await seedStorage(page, { auth, storage });
  page.__ctx = ctx;
  return page;
}
const go = async (p, u) => { await p.goto(PAGES_URL + u, { waitUntil: 'networkidle2', timeout: 45000 }); await sleep(600); };
const text = (p, sel) => p.$eval(sel, e => e.textContent.trim()).catch(() => null);
const ls = (p, k) => p.evaluate(k => localStorage.getItem(k), k);
const done = async p => { check(!p.__errors.length, p.__errors.join(' | ')); await p.__ctx.close(); };
const toast = p => text(p, '#toast');
const fill = async (p, sel, v) => { await p.click(sel, { clickCount: 3 }).catch(() => { }); await p.evaluate(s => { document.querySelector(s).value = ''; }, sel); if (v) await p.type(sel, v); };
const waitUrl = async (p, re, ms = 4000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (re.test(p.url())) return true; await sleep(100); } return false; };
const signInUi = async (p, email, pw) => { await fill(p, '#loginEmail', email); await fill(p, '#loginPassword', pw); await p.click('#loginButton'); };
const loginsSent = p => p.__reqs.filter(r => r === 'POST /auth/login').length;

/* ------------------------------------------------------------------ the sign-in page itself */
add('sign-in page: opens on Login, tabs switch, password eye works, Enter submits', async () => {
  await resetMock();
  const p = await newPage(); await go(p, 'login.html');
  check(await p.$eval('#loginTab', e => e.classList.contains('active')), 'Login tab should be active first');
  check(await p.evaluate(() => document.activeElement && document.activeElement.id === 'loginEmail'), 'email field should have focus');
  await p.click('#registerTab'); await sleep(300);
  check(await p.$eval('#registerPanel', e => getComputedStyle(e).display !== 'none') && await p.$eval('#loginPanel', e => getComputedStyle(e).display === 'none'), 'Register panel did not open');
  await p.click('#loginTab'); await sleep(300);
  check(await p.$eval('#loginPanel', e => getComputedStyle(e).display !== 'none'), 'Login panel did not return');
  await p.type('#loginPassword', 'secret-123');
  check(await p.$eval('#loginPassword', e => e.type) === 'password', 'password should start hidden');
  await p.click('#loginPanel .toggle'); check(await p.$eval('#loginPassword', e => e.type) === 'text', 'eye did not reveal the password');
  await p.click('#loginPanel .toggle'); check(await p.$eval('#loginPassword', e => e.type) === 'password', 'eye did not hide it again');
  await fill(p, '#loginEmail', 'test@example.com'); await fill(p, '#loginPassword', 'Test@12345');
  await p.keyboard.press('Enter');
  check(await waitUrl(p, /index\.html/), 'Enter should submit and go home, at ' + p.url());
  await p.__ctx.close();
});

add('sign-in: empty and malformed input is caught in the page — no request is sent', async () => {
  const p = await newPage(); await go(p, 'login.html');
  await p.click('#loginButton'); await sleep(300);
  check(/email is required/i.test(await text(p, '#loginEmailError')), 'email required message missing: ' + await text(p, '#loginEmailError'));
  check(/password is required/i.test(await text(p, '#loginPasswordError')), 'password required message missing: ' + await text(p, '#loginPasswordError'));
  await fill(p, '#loginEmail', 'not-an-email'); await fill(p, '#loginPassword', 'abcdefgh'); await p.click('#loginButton'); await sleep(300);
  check(/valid email/i.test(await text(p, '#loginEmailError')), 'bad e-mail message missing');
  check(loginsSent(p) === 0, 'a request was sent for invalid input: ' + p.__reqs);
  await fill(p, '#loginEmail', 'a@b.co'); await sleep(100);
  check(!(await text(p, '#loginEmailError')), 'error should clear as you type');
  await done(p);
});

add('sign-in: wrong password and unknown e-mail give the same message, nothing is stored, the button comes back', async () => {
  await resetMock();
  const p = await newPage(); await go(p, 'login.html');
  await signInUi(p, 'test@example.com', 'WrongPass1'); await sleep(900);
  const m1 = await toast(p);
  check(/invalid email or password/i.test(m1), 'wrong password message: ' + m1);
  check(!(await ls(p, 'nansai_token')) && !(await ls(p, 'nansai_user')), 'a session was stored after a failed login');
  check(/login\.html/.test(p.url()), 'should stay on the sign-in page');
  check(await p.$eval('#loginButton', e => !e.disabled), 'button should be usable again');
  await sleep(2800);
  await signInUi(p, 'nobody@example.com', 'Test@12345'); await sleep(900);
  check(await toast(p) === m1, 'unknown e-mail should look identical, got: ' + await toast(p));
  await done(p);
});

add('sign-in: a double-click sends one request; server down shows a friendly message and recovers', async () => {
  await resetMock();
  const p = await newPage(); await go(p, 'login.html');
  await fill(p, '#loginEmail', 'test@example.com'); await fill(p, '#loginPassword', 'Test@12345');
  await p.click('#loginButton', { clickCount: 2, delay: 20 }); await sleep(1500);
  check(loginsSent(p) === 1, 'double-click sent ' + loginsSent(p) + ' requests');
  await p.__ctx.close();
  const q = await newPage(); await q.setRequestInterception(true);
  q.on('request', r => { if (/\/api\/auth\/login/.test(r.url()) && r.method() === 'POST') r.abort('connectionrefused'); else r.continue(); });
  await go(q, 'login.html'); await signInUi(q, 'test@example.com', 'Test@12345'); await sleep(900);
  check(!!(await toast(q)) && await q.$eval('#toast', e => e.classList.contains('error') || /fail|reach|network|fetch/i.test(e.textContent)), 'no error shown when the server is unreachable');
  check(await q.$eval('#loginButton', e => !e.disabled), 'button stuck after a network failure');
  check(!(await ls(q, 'nansai_token')), 'no session should exist');
  q.__errors = q.__errors.filter(e => !/Failed|ERR_/.test(e)); await done(q);
});

/* ------------------------------------------------------------------------ sign in & session */
add('sign-in: customer lands on the home page, header greets them, session survives a reload, sign out clears it', async () => {
  await resetMock();
  const p = await newPage(); await go(p, 'login.html');
  await signInUi(p, 'Test@Example.com', 'Test@12345');                                   // e-mail case does not matter
  check(await waitUrl(p, /index\.html/), 'did not reach the home page: ' + p.url());
  const user = JSON.parse(await ls(p, 'nansai_user'));
  check(user.email === 'test@example.com' && user.role === 'customer' && !('password' in user), 'stored user wrong: ' + JSON.stringify(user));
  check((await ls(p, 'nansai_token')) === 'tok:u1', 'token not stored');
  await sleep(1200);
  check(/Test/.test(await text(p, '.ns-acct-label')), 'header should greet Test, got ' + await text(p, '.ns-acct-label'));
  await p.reload({ waitUntil: 'networkidle2' }); await sleep(800);
  check(/Test/.test(await text(p, '.ns-acct-label')), 'session lost on reload');
  await p.click('.ns-acct > button'); await sleep(300);
  const menu = await p.$eval('#nsm-acct', e => e.innerText);
  check(/test@example\.com/.test(menu) && /My orders/.test(menu) && /Wishlist/.test(menu) && /Sign out/.test(menu) && !/Admin panel/.test(menu), 'customer menu wrong: ' + menu.replace(/\s+/g, ' '));
  await Promise.all([p.waitForNavigation({ waitUntil: 'domcontentloaded' }), p.click('#nsm-acct [data-ns-logout]')]); await sleep(500);
  check(/login\.html/.test(p.url()) && !(await ls(p, 'nansai_token')) && !(await ls(p, 'nansai_user')), 'sign out should land on the sign-in page with the session cleared');
  await done(p);
});

add('sign-in: an admin goes to the admin panel and sees the admin link; a customer does not', async () => {
  await resetMock();
  const a = await newPage(); await go(a, 'login.html'); await signInUi(a, 'admin@example.com', 'Admin@12345');
  check(await waitUrl(a, /admin-panel\.html/), 'admin should land on the admin panel: ' + a.url());
  await go(a, 'shop.html'); await a.click('.ns-acct > button'); await sleep(300);
  check(/Admin panel/.test(await a.$eval('#nsm-acct', e => e.innerText)), 'admin link missing from the account menu');
  await a.__ctx.close();
});

add('sign-in: someone already signed in who opens the sign-in page is sent on (customer home, admin panel)', async () => {
  await resetMock();
  const c = await newPage(1280, { storage: {}, auth: false });
  await c.evaluate(() => { localStorage.setItem('nansai_token', 'tok:u1'); localStorage.setItem('nansai_user', JSON.stringify({ id: 'u1', role: 'customer', name: 'Test User' })); });
  await c.goto(PAGES_URL + 'login.html', { waitUntil: 'domcontentloaded' }); check(await waitUrl(c, /index\.html/), 'customer should be sent home: ' + c.url());
  await c.__ctx.close();
  const a = await newPage(1280, { storage: {}, auth: false });
  await a.evaluate(() => { localStorage.setItem('nansai_token', 'tok:u2'); localStorage.setItem('nansai_user', JSON.stringify({ id: 'u2', role: 'admin', name: 'Admin Owner' })); });
  await a.goto(PAGES_URL + 'login.html', { waitUntil: 'domcontentloaded' }); check(await waitUrl(a, /admin-panel\.html/), 'admin should be sent to the panel: ' + a.url());
  await a.__ctx.close();
});

add('protected pages: signed-out visitors are sent to sign in; a dead session is cleared and sent to sign in', async () => {
  await resetMock();
  const g = await newPage(); await g.goto(PAGES_URL + 'wishlist.html', { waitUntil: 'domcontentloaded' });
  check(await waitUrl(g, /login\.html\?next=wishlist\.html/), 'guest on wishlist should go to sign in (with a way back): ' + g.url());
  await g.__ctx.close();
  const d = await newPage(1280, { storage: {}, auth: false });
  await d.evaluate(() => { localStorage.setItem('nansai_token', 'tok:deleted-account'); localStorage.setItem('nansai_user', JSON.stringify({ id: 'x', role: 'customer', name: 'Ghost' })); });
  await d.goto(PAGES_URL + 'wishlist.html', { waitUntil: 'domcontentloaded' });
  check(await waitUrl(d, /login\.html/, 6000), 'a dead session should end at the sign-in page: ' + d.url());
  await sleep(500); check(!(await ls(d, 'nansai_token')), 'the dead session should have been cleared');
  await d.__ctx.close();
});

add('admin panel: guests and customers are turned away (server-checked), a real admin gets in', async () => {
  await resetMock();
  const g = await newPage(); await g.goto(PAGES_URL + 'admin-panel.html', { waitUntil: 'domcontentloaded' });
  check(await waitUrl(g, /login\.html/, 6000), 'a guest should be sent to sign in: ' + g.url());
  await g.__ctx.close();

  const c = await newPage(1280, { storage: {}, auth: false });
  await c.evaluate(() => { localStorage.setItem('nansai_token', 'tok:u1'); localStorage.setItem('nansai_user', JSON.stringify({ id: 'u1', role: 'admin', name: 'Faked Admin' })); });   // the stored role is faked on purpose
  let alerted = ''; c.on('dialog', async d => { alerted = d.message(); await d.accept(); });
  c.goto(PAGES_URL + 'admin-panel.html', { waitUntil: 'domcontentloaded' }).catch(() => { });
  check(await waitUrl(c, /login\.html/, 8000), 'a customer must not stay on the admin panel, even with a faked role in storage: ' + c.url());
  check(/access denied/i.test(alerted), 'should say access is denied: ' + alerted);
  check(!(await ls(c, 'nansai_token')) && !(await ls(c, 'admin_token')), 'the session should be cleared');
  check(await c.$eval('body', () => true), 'page alive');
  c.__errors = c.__errors.filter(e => !/Failed|ERR_/.test(e)); await c.__ctx.close();

  const a = await newPage(1280, { storage: {}, auth: false });
  await a.evaluate(() => { localStorage.setItem('nansai_token', 'tok:u2'); localStorage.setItem('nansai_user', JSON.stringify({ id: 'u2', role: 'admin', name: 'Admin Owner' })); });
  await a.goto(PAGES_URL + 'admin-panel.html', { waitUntil: 'domcontentloaded' }); await sleep(2500);
  check(/admin-panel\.html/.test(a.url()) && await a.$eval('#admin-shell', e => getComputedStyle(e).display !== 'none'), 'a real admin should see the panel: ' + a.url());
  await a.__ctx.close();
});

/* ---------------------------------------------------------------------------------- register */
add('register: every rule is explained, the strength meter reacts, duplicates are refused', async () => {
  await resetMock();
  const p = await newPage(); await go(p, 'login.html'); await p.click('#registerTab'); await sleep(300);
  await p.click('#registerButton'); await sleep(300);
  for (const [id, re] of [['firstNameError', /first name/i], ['lastNameError', /last name/i], ['registerEmailError', /email is required/i], ['registerPasswordError', /8 characters/i]]) check(re.test(await text(p, '#' + id)), id + ' missing: ' + await text(p, '#' + id));
  await fill(p, '#firstName', 'Asha'); await fill(p, '#lastName', 'Raman'); await fill(p, '#registerEmail', 'bad'); await fill(p, '#registerPassword', 'abcdefgh'); await fill(p, '#confirmPassword', 'different1');
  await p.click('#registerButton'); await sleep(300);
  check(/valid email/i.test(await text(p, '#registerEmailError')), 'bad e-mail not explained');
  check(/must match/i.test(await text(p, '#confirmPasswordError')), 'mismatch not explained');
  const w = []; for (const pw of ['abc', 'abcdefgh', 'Abcdefg1', 'Abcdefg1!']) { await fill(p, '#registerPassword', pw); w.push([await text(p, '#strengthText'), await p.$eval('#strengthBar', e => parseFloat(e.style.width))]); }
  check(w[0][0] === 'Weak' && w[3][0] === 'Strong' && w[3][1] > w[0][1], 'strength meter did not react: ' + JSON.stringify(w));
  check(!p.__reqs.some(r => /register/.test(r)), 'no request should be sent while the form is invalid');
  await fill(p, '#registerEmail', 'test@example.com'); await fill(p, '#registerPassword', 'Abcdefg1!'); await fill(p, '#confirmPassword', 'Abcdefg1!'); await p.click('#registerButton'); await sleep(900);
  check(/already exists/i.test(await toast(p)), 'duplicate e-mail message: ' + await toast(p));
  check(/login\.html/.test(p.url()) && !(await ls(p, 'nansai_token')), 'must stay signed out after a refused registration');
  await done(p);
});

add('register: a new customer is signed in at once, then can sign out and sign back in with the same details', async () => {
  await resetMock();
  const p = await newPage(); await go(p, 'login.html'); await p.click('#registerTab'); await sleep(300);
  await fill(p, '#firstName', 'Meena'); await fill(p, '#lastName', 'Iyer'); await fill(p, '#registerEmail', 'meena@example.com'); await fill(p, '#registerPassword', 'Meena#2026'); await fill(p, '#confirmPassword', 'Meena#2026');
  await p.click('#registerButton');
  check(await waitUrl(p, /index\.html/), 'new customer should land on the home page: ' + p.url());
  const u = JSON.parse(await ls(p, 'nansai_user')); check(u.name === 'Meena Iyer' && u.role === 'customer', 'stored user wrong: ' + JSON.stringify(u));
  await sleep(1200); check(/Meena/.test(await text(p, '.ns-acct-label')), 'header should greet Meena');
  await p.click('.ns-acct > button'); await sleep(300);
  await Promise.all([p.waitForNavigation({ waitUntil: 'domcontentloaded' }), p.click('#nsm-acct [data-ns-logout]')]); await sleep(500);
  await signInUi(p, 'meena@example.com', 'Meena#2026');
  check(await waitUrl(p, /index\.html/), 'signing back in failed: ' + p.url());
  await done(p);
});

/* --------------------------------------------------------------------------- forgot + reset */
add('forgot password: asks for an e-mail first, gives the same neutral answer for known and unknown accounts', async () => {
  await resetMock();
  const p = await newPage(); await go(p, 'login.html');
  await p.click('.forgot'); await sleep(300);
  check(/enter your email/i.test(await text(p, '#loginEmailError')), 'should ask for the e-mail first');
  await fill(p, '#loginEmail', 'not-an-email'); await p.click('.forgot'); await sleep(300);
  check(!p.__reqs.some(r => /forgot/.test(r)), 'no request for an invalid e-mail');
  await fill(p, '#loginEmail', 'test@example.com'); await p.click('.forgot'); await sleep(900);
  const known = await toast(p);
  const tk = (await (await fetch(API + '/__last_reset')).json()).token; check(!!tk, 'a reset link should exist for a real account');
  await sleep(2800);
  await fill(p, '#loginEmail', 'ghost@example.com'); await p.click('.forgot'); await sleep(900);
  const unknown = await toast(p);
  check(/if an account exists/i.test(known) && /if an account exists/i.test(unknown), 'neutral wording missing: ' + known + ' / ' + unknown);
  check(known.replace('test@example.com', 'X') === unknown.replace('ghost@example.com', 'X'), 'answers differ, which would reveal who has an account');
  check((await (await fetch(API + '/__last_reset')).json()).token === tk, 'no new link should be created for an unknown e-mail');
  check(/login\.html/.test(p.url()), 'should stay on the page');
  await done(p);
});

add('reset password: bad links and weak passwords are explained; a good link signs you in once, the old password stops working', async () => {
  await resetMock();
  const noTok = await newPage(); await go(noTok, 'reset-password.html');
  await noTok.type('#password', 'Brand#New123'); await noTok.type('#confirm', 'Brand#New123'); await noTok.click('#submitBtn'); await sleep(500);
  check(/token is missing/i.test(await toast(noTok)), 'missing token not explained: ' + await toast(noTok));
  await noTok.__ctx.close();

  const fake = await newPage(); await go(fake, 'reset-password.html?token=garbage123');
  await fake.type('#password', 'Brand#New123'); await fake.type('#confirm', 'Brand#New123'); await fake.click('#submitBtn'); await sleep(900);
  check(/invalid or expired/i.test(await toast(fake)), 'bad token not explained: ' + await toast(fake));
  check(await fake.$eval('#submitBtn', e => !e.disabled && e.textContent === 'Update Password'), 'button did not recover');
  await fake.__ctx.close();

  const lp = await newPage(); await go(lp, 'login.html'); await fill(lp, '#loginEmail', 'test@example.com'); await lp.click('.forgot'); await sleep(900); await lp.__ctx.close();
  const token = (await (await fetch(API + '/__last_reset')).json()).token;
  const p = await newPage(); await go(p, 'reset-password.html?token=' + token);
  await p.type('#password', 'short'); await p.type('#confirm', 'short'); await p.click('#submitBtn'); await sleep(300);
  check(/8 characters/i.test(await text(p, '#passwordErr')), 'short password not explained');
  await fill(p, '#password', 'Brand#New123'); await fill(p, '#confirm', 'Different#999'); await p.click('#submitBtn'); await sleep(300);
  check(/do not match/i.test(await text(p, '#confirmErr')), 'mismatch not explained');
  await fill(p, '#confirm', 'Brand#New123'); await p.click('#submitBtn'); await sleep(500);
  check(/password updated/i.test(await toast(p)), 'success message missing: ' + await toast(p));
  check(await waitUrl(p, /checkout\.html\?page=orders/, 5000), 'should continue to My Orders: ' + p.url());
  check((await ls(p, 'nansai_token')) === 'tok:u1', 'should be signed in after a reset');
  await p.__ctx.close();

  const again = await newPage(); await go(again, 'reset-password.html?token=' + token);
  await again.type('#password', 'Another#12345'); await again.type('#confirm', 'Another#12345'); await again.click('#submitBtn'); await sleep(900);
  check(/invalid or expired/i.test(await toast(again)), 'a used link must not work twice: ' + await toast(again));
  await again.__ctx.close();

  const old = await newPage(); await go(old, 'login.html'); await signInUi(old, 'test@example.com', 'Test@12345'); await sleep(900);
  check(/invalid email or password/i.test(await toast(old)), 'the old password must stop working');
  await sleep(2800); await signInUi(old, 'test@example.com', 'Brand#New123');
  check(await waitUrl(old, /index\.html/), 'the new password should work: ' + old.url());
  await old.__ctx.close();
});

/* ------------------------------------------------------------------- guest -> sign in -> back */
add('guest checkout: asked to sign in, comes back to checkout with the cart intact, and the order goes through', async () => {
  await resetMock();
  const cart = [{ id: 1, name: 'Karunguruvai Rice', price: 180, basePrice: 180, image: '', qty: 2, qtyVal: 1, qtyLabel: '1kg', unit: 'kg' }];
  const p = await newPage(1280, { storage: { cart } }); await go(p, 'checkout.html');
  await p.evaluate(() => {
    const set = (id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('blur', { bubbles: true })); };
    set('coName', 'Asha Raman'); set('coMobile', '9876543210'); set('coAddr1', '12 Farm Road'); set('coCity', 'Thanjavur'); set('coPin', '613001'); set('coState', 'Tamil Nadu');
  });
  await sleep(1500);
  await p.evaluate(() => { document.getElementById('coState').value = 'Tamil Nadu'; document.getElementById('coCity').value = 'Thanjavur'; goToPayment(); }); await sleep(800);
  await p.evaluate(() => { goStep(3); selectGateway('cod'); initiateRazorpay(); }); await sleep(600);
  check(/login/i.test(await toast(p)) || /login\.html/.test(p.url()), 'a guest should be asked to sign in: ' + await toast(p));
  check(await waitUrl(p, /login\.html\?next=checkout\.html/, 4000), 'sign-in link should remember checkout: ' + p.url());
  await signInUi(p, 'test@example.com', 'Test@12345');
  check(await waitUrl(p, /checkout\.html/, 5000), 'should return to checkout after signing in: ' + p.url());
  await sleep(1500);
  check(/₹360/.test(await p.evaluate(() => document.body.innerText)), 'the cart should still be there after signing in');
  check(!!(await p.$('#newAddrForm')) && await p.$eval('#coName', e => e.value === ''), 'address is asked again and not stored');
  await p.evaluate(() => {
    const set = (id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('blur', { bubbles: true })); };
    set('coName', 'Asha Raman'); set('coMobile', '9876543210'); set('coAddr1', '12 Farm Road'); set('coCity', 'Thanjavur'); set('coPin', '613001'); set('coState', 'Tamil Nadu');
  });
  await sleep(1500);
  await p.evaluate(() => { document.getElementById('coState').value = 'Tamil Nadu'; document.getElementById('coCity').value = 'Thanjavur'; goToPayment(); }); await sleep(900);
  await p.evaluate(() => { goStep(3); selectGateway('cod'); initiateRazorpay(); }); await sleep(4400);
  const order = await (await fetch(API + '/__last_order')).json();
  check(order.shippingAddress && order.shippingAddress.pincode === '613001', 'the order did not reach the server: ' + JSON.stringify(order).slice(0, 120));
  check(await p.evaluate(() => document.getElementById('successOverlay').classList.contains('show')), 'order success screen not shown');
  await done(p);
});

add('?next= is safe: only plain page names on this site are followed', async () => {
  await resetMock();
  for (const [next, expect] of [['wishlist.html', /wishlist\.html/], ['https://evil.example/steal', /index\.html/], ['//evil.example', /index\.html/], ['javascript:alert(1)', /index\.html/], ['admin-panel.html', /index\.html/], ['../../etc/passwd', /index\.html/]]) {
    const p = await newPage(); await go(p, 'login.html?next=' + encodeURIComponent(next)); await signInUi(p, 'test@example.com', 'Test@12345');
    check(await waitUrl(p, expect, 4000), `next=${next} should end at ${expect}, ended at ${p.url()}`);
    check(new URL(p.url()).origin === new URL(PAGES_URL).origin, 'left the site for next=' + next);
    await p.__ctx.close();
  }
});

/* ------------------------------------------------------------------------- on a phone */
add('phone: sign in, register tab and reset page fit without sideways scroll', async () => {
  await resetMock();
  const p = await newPage(390); await go(p, 'login.html');
  const sx = () => p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  check((await sx()) <= 1, 'sideways scroll on the sign-in page');
  await p.click('#registerTab'); await sleep(300); check((await sx()) <= 1, 'sideways scroll on the register tab');
  for (const sel of ['#firstName', '#registerEmail', '#registerButton']) check(await p.$eval(sel, e => { const r = e.getBoundingClientRect(); return r.width >= 100 && r.height >= 40 && r.right <= innerWidth + 1; }), sel + ' does not fit on a phone');
  await p.__ctx.close();
  const r = await newPage(390); await go(r, 'reset-password.html?token=x'); check((await r.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 1, 'sideways scroll on the reset page'); await r.__ctx.close();
});

(async () => {
  browser = await launch();
  let fail = 0;
  for (const t of tests) {
    try { await t.fn(); console.log('PASS  ' + t.name); }
    catch (e) { fail++; console.log('FAIL  ' + t.name + '\n        ' + e.message); }
  }
  await browser.close();
  console.log(`\n${tests.length - fail}/${tests.length} account tests passed`);
  process.exit(fail ? 1 : 0);
})();
