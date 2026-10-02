# Nansai Organics — Deployment Guide

## Project Structure
```
agri store/
├── pages/            ← THE WHOLE STOREFRONT — this folder is what Netlify publishes
│   ├── *.html            index, shop, product, wishlist, checkout + My Orders, track-order, about, our-grains, faq,
│   │                     shipping, contact, bulk-orders, blog, login, policies, 404, admin-panel
│   ├── js/
│   │   ├── store-config.js   ← ★ the one file to edit for phone, email, shipping & return rules, social links
│   │   ├── catalog-data.js   ← product list used until the live API answers
│   │   ├── store.js          ← product cards, cart, wishlist, search (home + shop)
│   │   ├── nansai-ui.js      ← shared header/menus, announcement bar, WhatsApp button, search suggestions
│   │   ├── motion.js         ← reveals, preloader, marquee (everything works without it)
│   │   └── api.js · auth.js · cart.js · config.js · home.js · icons.js · checkout-premium.js · vendor/
│   ├── css/              ← nansai-ui.css (shared shell) · nansei.css (design system) · store.css · story.css · checkout-premium.css
│   ├── images/           ← site images
│   ├── _redirects        ← clean URLs, real 404 and the /api → Render proxy
│   └── _headers          ← security + cache headers
├── assets-source/    ← original photos / notes (never published)
├── tests/ui/         ← headless-Chrome checks (see tests/ui/README.md)
├── backend/          ← Node.js/Express API (Render) — `npm test` runs the shipping + auth tests
├── netlify.toml      ← Netlify config (publish directory = pages)
└── render.yaml       ← Render config
```

---

## ✅ Launch checklist (do these before handing the site to a client)

1. **Change the admin password now.** Older versions of this project had a built-in admin e-mail and password written in the code and in
   `backend/seeders/*`. They are removed, but they were in the repository, so treat them as public: log in as admin and change the
   password (or run `node backend/seeders/create-admin.js <new-password>`), and never reuse the old one anywhere.
2. **Admin access is now explicit.** Nobody becomes admin by e-mail address any more. Register the owner's account on the website, then run
   `cd backend && node seeders/make-admin.js owner@example.com`.
3. **Set every variable on Render** (see `backend/.env.example` / `render.yaml`): `MONGODB_URI`, a fresh `JWT_SECRET`, `FRONTEND_URL` (your Netlify address, no trailing
   slash — it is also the CORS allow-list and the link in password-reset e-mails), Razorpay **live** keys, `EMAIL_*` (password-reset e-mails need this), `ADMIN_EMAIL`.
4. **Confirm the contact details** in `pages/js/store-config.js` (phone, e-mail, address, hours, dispatch / delivery times, GSTIN, FSSAI, Instagram) and the figures on the About page.
5. **Netlify:** publish directory `pages` (set in `netlify.toml`). Only that folder goes online, so `/backend`, `/tests` and `/assets-source` can never be reached.
6. **Smoke test the live site** once deployed: register → sign out → sign in → forgot password (check the e-mail arrives and the link works) → add to cart →
   checkout (cash on delivery first, then one small Razorpay payment) → My Orders → admin panel.
7. Run the automated checks any time: `cd tests/ui && npm test` and `cd backend && npm test`.

---

## ⚠️ Before You Push to GitHub

1. **Rotate your JWT_SECRET** — the current one is exposed:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
   Paste the output into Render's env vars (not in `.env` committed to Git).

2. **Rotate Twilio credentials** — go to [console.twilio.com](https://console.twilio.com) → regenerate Auth Token.

3. **Confirm `.env` is gitignored** — run `git status` and make sure `backend/.env` does NOT appear.

---

## Step 1 — Push to GitHub

```bash
git init          # if not already a repo
git add .
git commit -m "initial commit"
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

---

## Step 2 — Deploy Backend on Render

1. Go to [render.com](https://render.com) → **New Web Service**
2. Connect your GitHub repo
3. Set **Root Directory** → `backend`
4. Set **Build Command** → `npm install`
5. Set **Start Command** → `npm start`
6. Add these **Environment Variables** in the Render dashboard:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | your MongoDB Atlas connection string |
| `JWT_SECRET` | new 64-char hex (from step above) |
| `JWT_EXPIRE` | `30d` |
| `FRONTEND_URL` | your Netlify URL (fill in after Step 3) |
| `RAZORPAY_KEY_ID` | from Razorpay dashboard |
| `RAZORPAY_KEY_SECRET` | from Razorpay dashboard |
| `TWILIO_ACCOUNT_SID` | from Twilio console |
| `TWILIO_AUTH_TOKEN` | new rotated token |
| `TWILIO_PHONE_NUMBER` | your Twilio number |
| `EMAIL_HOST` | `smtp.gmail.com` |
| `EMAIL_PORT` | `587` |
| `EMAIL_USER` | your Gmail address |
| `EMAIL_PASSWORD` | 16-char Gmail App Password |
| `EMAIL_FROM` | `Nansai Organics <your-gmail@gmail.com>` |
| `ADMIN_EMAIL` | `admin@nansaiorganics.com` |

7. Click **Deploy** — your API will be live at `https://nanseiorganics.onrender.com`
8. Test it: `https://nanseiorganics.onrender.com/api/health`

---

## Step 3 — Deploy Frontend on Netlify

1. Go to [netlify.com](https://netlify.com) → **Add new site** → **Import from Git**
2. Connect your GitHub repo
3. **Publish directory** → `pages` (already set in `netlify.toml`; if the Netlify dashboard shows another value, set it to `pages`). `pages/_redirects` proxies `/api/*` to your Render backend — edit that one line if your Render URL differs
4. Click **Deploy site**
5. Your site will be live at `https://your-site.netlify.app`

---

## Step 4 — Wire Frontend to Backend

Open `pages/js/config.js` and confirm the production URL matches your Render service:

```js
const PRODUCTION_API = 'https://nanseiorganics.onrender.com/api';
```

Then go back to Render → Environment → set `FRONTEND_URL` to your Netlify URL.

---

## Step 5 — MongoDB Atlas Setup

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com)
2. **Database Access** → confirm your user has `readWrite` on the DB
3. **Network Access** → Add IP `0.0.0.0/0` (required for Render's dynamic IPs)
4. **Connect** → Drivers → copy the connection string → paste into Render's `MONGODB_URI`

---

## Step 6 — Seed the Database (optional)

```bash
cd backend
npm run seed
```

---

## Step 7 — Automatic shipping & tracking (Shiprocket, optional)

Once connected, nobody has to touch anything: a new order books its own courier, the customer sees live
tracking on **My Orders**, the order moves to *Shipped* / *Delivered* by itself, and the customer gets an email.

1. In Shiprocket: **Settings → API → Create API User** (a separate login just for the store), and make sure your
   pickup address exists under **Settings → Pickup Addresses**. Add money to the wallet — shipping labels are
   paid from it automatically.
2. In Render → Environment add `SHIPROCKET_EMAIL`, `SHIPROCKET_PASSWORD`, `SHIPROCKET_PICKUP_LOCATION`
   and a long random `SHIPROCKET_WEBHOOK_TOKEN` (see `backend/.env.example`).
3. In Shiprocket: **Settings → API → Webhooks** (tracking updates) → URL
   `https://<your-render-service>/api/shipping/webhook`, token = the same `SHIPROCKET_WEBHOOK_TOKEN`
   (sent as the `x-api-key` header). Shiprocket may reject webhook URLs that contain certain words such as
   "shiprocket" — this URL doesn't.
4. Place a test order. In the Render logs you should see `[Shipping] shipment created … AWB …`.

What happens automatically: COD orders are booked immediately; online-paid orders are booked as soon as the
payment is verified; cancelling an order (customer on My Orders, or admin) cancels the courier booking while the
parcel hasn't been picked up. If Shiprocket refuses an order (wallet empty, bad pincode…) the customer's order is
**not** affected — the reason is saved in the order's `shippingError` field, and an admin can retry with
`POST /api/shipping/<orderId>/ship`. Set `SHIPROCKET_AUTO_SHIP=false` if you would rather approve each label
yourself in the Shiprocket panel (tracking still updates automatically). The admin panel's manual
"Shipped + tracking number" option keeps working as a fallback.

Check the logic any time (no database or Shiprocket account needed): `cd backend && npm test`.

---

## Local Development

```bash
cd backend
npm install
cp .env.example .env   # fill in your local values
npm run dev            # starts on port 5000

# Open frontend with VS Code Live Server on port 5500
# http://localhost:5500/pages/index.html
```

---

## Security Checklist

- [ ] `.env` is NOT committed to Git
- [ ] `JWT_SECRET` is a fresh 64-char hex
- [ ] Twilio Auth Token has been rotated
- [ ] MongoDB Atlas Network Access allows `0.0.0.0/0`
- [ ] `FRONTEND_URL` is set to your actual Netlify domain on Render
- [ ] Gmail App Password is used (not your real Gmail password)
- [ ] Razorpay keys are live keys (not test) for production

---

## Frontend notes

- **Settings** - `pages/js/store-config.js` drives the announcement bar, footer, contact / FAQ / shipping text, the WhatsApp button and the policy contact lines. Empty `PHONE` / `PHONE_RAW` hides every phone and WhatsApp link. Lines marked `CONFIG` still need your confirmation (email, dispatch / delivery times, GSTIN, FSSAI, Instagram).
- **Shared UI layer** - `pages/css/nansai-ui.css` and `pages/js/nansai-ui.js` are linked from every storefront page
  (progress bar, back-to-top, shared header/footer for the policy pages, image fallbacks, tap-target rules).
  If you change them, bump the `?v=` number on the `<link>`/`<script>` tags so returning visitors pick them up.
- **Cache headers** - `pages/_headers` makes browsers re-validate our own JS/CSS after an hour; only the
  version-pinned `js/vendor/lucide-*.js` is cached for a year (rename the file when upgrading Lucide).
- **Policy pages** - `privacy-policy`, `refund-policy`, `terms-and-conditions` live in `pages/` and are
  linked from every footer. Review the wording and the contact details before launch.
- **Before each release** run the UI checks:

```bash
cd tests/ui && npm install      # first time only
npm run serve                   # terminal 1
npm run mock                    # terminal 2 (fake backend, never touches MongoDB)
npm test                        # terminal 3: syntax + every page x 3 widths + user flows
```
