# Data-driven storefront: moving hard-coded content behind admin-editable backend data

Scope: Nansei Organics static HTML storefront (Netlify, repo root published, `/api/*` proxied to Express + MongoDB on Render). Code was read on 2026-11-12 from the working tree (uncommitted changes included). Code "sources" below are repo-relative paths; web sources are URLs.

Important context found in the working tree: **a store-settings feature is being built right now, uncommitted**. These files exist: `backend/models/Setting.js`, `backend/utils/settings.js`, `backend/routes/settingsRoutes.js` (mounted at `/api/settings` in `backend/server.js` L151), a `getRules()` hook in `backend/routes/orderRoutes.js`, COD-fee support in `backend/utils/orderGuard.js`, a `loadSettings()` in `js/site-shell.js`, and `applyAnnouncements()` in `pages/index.html` L2760. The design below builds on that work and does not replace it.

---

## 1. Product model: per-variant price/MRP/stock, server price verification, and mapping numeric ids to MongoDB ids

### Takeaway
Store the sizes as an **embedded `variants[]` array inside each Product document**, and give every variant an explicit `sku`, `price`, `mrp` and `stock`. Stop deriving prices in the browser from `BASE_UNIT_G` multipliers. Add a unique `legacyId` (1–16) and a `slug` to each product, so `product.html?id=1` and saved carts keep resolving. Then the order guard can look up each line's product and variant and charge the **server's** price. Today it effectively verifies nothing, because storefront carts carry numeric ids.

### Cited Findings

**What the code does today**
- The catalogue is hard-coded in at least four places, and the copies disagree:
  - `pages/index.html` L2802 has `const products=[…16 items]`.
  - `pages/product.html` L5197 has a rich 16-item array (variants, benefits, nutrients, howToUse, `experience` stories/reels).
  - `pages/wishlist.html` L532 is commented "matches index.html", but it uses different (Unsplash) images.
  - `js/products-data.js` holds another copy, which no page appears to load (no `<script src>` reference was found).
  - Sources: [pages/index.html](pages/index.html), [pages/product.html](pages/product.html), [pages/wishlist.html](pages/wishlist.html), [js/products-data.js](js/products-data.js)
- **Data conflict: id 11 is a different product on different pages.** It is "Sangupoo" (dried sangupoo image) in `index.html`, but "Butterfly Pea Flower" in `product.html`, `wishlist.html` and `js/products-data.js`. Names also differ: "Karuppu Kavuni Rice" vs "Karuppu Kavuni (Black Kavuni Rice)", "Natural Fig Powder" vs "Country Fig Powder", "Organic Rose Milk" vs "Organic Real Rose Milk". Some images differ too (index uses ImageKit for ids 3, 5, 8–11, 15, 16; others use Unsplash). — [pages/index.html](pages/index.html) L2803–2818; [pages/product.html](pages/product.html) L6048; [pages/wishlist.html](pages/wishlist.html) L532+
- `product.html` computes variant prices in the browser:
  - `price = Math.round(p.price * m)`, where `m = grams / BASE_UNIT_G[category]`.
  - `BASE_UNIT_G` is 1000 for rice, flour and beverages, 1 for flowers, and **250 for "Other Products"**. So Fig Powder's ₹200 is per 250 g, while rice prices are per kg.
  - Variant labels are strings like `"500g"`, `"1kg"`, parsed with `parseFloat` and `includes('kg')`.
  - There is also a fallback `QUANTITY_CONFIG_P`, keyed by display category names ("Rice Varieties", "Dried Flowers"…). Flowers are priced per piece.
  - — [pages/product.html](pages/product.html) L6546–6560, L6915–6990
- Cart lines are saved to `localStorage.cart`:
  - Shape: `{id, name, price, basePrice, oldPrice, image, qty, qtyLabel, qtyVal, unit, selectedVariant}`.
  - `id` is the numeric legacy id. Same product plus same `qtyLabel` merges into one line.
  - — [pages/product.html](pages/product.html) `cartItemFromSelection` / `addToCartFn` (~L7000–7015)
- Checkout sends `product: c.id` (the numeric id) and the browser's `price` for every line. — [pages/checkoutmyorderpage.html](pages/checkoutmyorderpage.html) L1642
- **The server price check skips numeric ids.**
  - `guardContext.findProducts` keeps only ids where `mongoose.Types.ObjectId.isValid(id)` and looks up only `price`.
  - `buildOrder` checks a product only when it was found (`if (p && …)`). The check itself is a weak heuristic: it rejects only when `i.price < p.price * MIN_PRICE_SHARE` (20%).
  - Net effect: for today's numeric-id carts, the browser's price is accepted, and only the total arithmetic is re-verified.
  - `Order.items.product` is `Mixed`, "accepts ObjectId OR static numeric id".
  - — [backend/routes/orderRoutes.js](backend/routes/orderRoutes.js) L15–27; [backend/utils/orderGuard.js](backend/utils/orderGuard.js); [backend/models/Order.js](backend/models/Order.js) L4–7
- The Mongo model is partly there but not wired up:
  - `Product` has a single `price`/`oldPrice`/`stock`/`unit`/`weight`, plus an optional `quantityOptions[{label, quantity, unit, price}]`. That array has **no per-option stock, MRP or sku**.
  - `createProduct`/`updateProduct` whitelist fields and **do not accept `quantityOptions`** (they also list `sku`, which the schema doesn't define). So the admin cannot set variants today.
  - `slug` is auto-generated, unique.
  - — [backend/models/Product.js](backend/models/Product.js); [backend/controllers/productController.js](backend/controllers/productController.js)
- The admin panel product form saves a single price/stock/unit/weight and up to 3 image URLs. It has no variant editor. — [pages/admin-panel.html](pages/admin-panel.html) `saveProduct()` ~L1597–1630
- Seeders (`seed.js`, `seed-products.js`) insert products with a single price per kg and no legacy id. — [backend/seeders/seed.js](backend/seeders/seed.js)

**External reference models**
- Shopify's model puts price, compare-at price, SKU, inventory quantity and selected options on the **variant**, not the product:
  - `ProductVariant` has `price` (required), `compareAtPrice`, `sku`, `inventoryQuantity`, `selectedOptions` (e.g. size), `position`, and `availableForSale`.
  - The default limit is 2048 variants per product.
  - — [Shopify ProductVariant](https://shopify.dev/docs/api/admin-graphql/latest/objects/ProductVariant)
- MongoDB: "a write operation on a single document is atomic. For fields that must be updated together, embedding the fields within the same document ensures that the fields can be updated atomically." The documented pattern puts the stock condition in the filter (`available: { $gt: 0 }`) together with `$inc`. If nothing matched, `matchedCount`/`modifiedCount` are 0 and the write is treated as failed. — [MongoDB: Model Data for Atomic Operations](https://www.mongodb.com/docs/manual/tutorial/model-data-for-atomic-operations/)
- Practitioner guides recommend embedding variants in the product document for typical catalogues (for atomic per-variant inventory updates via the positional operator), with a sparse index on `variants.sku`. A separate variants collection is the alternative for large catalogues. These come mainly from one blog, so treat them as opinion. — [OneUptime: Model product variants in MongoDB](https://oneuptime.com/blog/post/2026-03-31-mongodb-model-product-variants/markdown); [OneUptime: e-commerce catalog](https://oneuptime.com/blog/post/2026-03-31-mongodb-model-ecommerce-catalog/markdown); a DZone series warns against "mega-documents" at very large scale — [DZone Product Catalog Part 1](https://dzone.com/articles/product-catalog-part-1-schema)

### Inferences (proposed design)

**Product document**
```js
{
  _id: ObjectId,
  legacyId: 1,                     // Number, unique+sparse index; the old numeric id (1–16), never reused
  slug: 'karunguruvai-rice',       // unique; preferred in new links (product.html?p=karunguruvai-rice)
  name, tagline, description,
  category: 'rice',                // machine key; display label comes from a category map / Category collection
  badge, section, isActive, isFeatured, position,
  images: [{ url, fileId, alt, width, height }],   // fileId = ImageKit fileId (or Cloudinary public_id)
  sellBy: 'weight' | 'volume' | 'count',           // drives label formatting only, never price maths
  variants: [{
    sku: 'KRV-500G',               // stable, unique across the catalogue; the cart/order key
    label: '500 g',                // what the button shows
    size: { value: 500, unit: 'g' },  // 'g' | 'ml' | 'pc' (normalised: kg→g, L→ml)
    price: 90,                     // selling price in rupees, integer (paise if you ever need decimals)
    mrp: 110,                      // compare-at / "old price"
    stock: 40,                     // units of THIS pack
    shipWeightG: 520,              // optional, for Shiprocket
    isActive: true, position: 1
  }],
  defaultSku: 'KRV-1KG',
  content: { benefits:[], nutrients:[], howToUse:[], specs:{}, experience:{} }, // the rich product.html blocks
  rating, numReviews, metaTitle, metaDescription, tags, timestamps
}
```
- **Price per variant is stored, not computed.** This removes `BASE_UNIT_G`/`QUANTITY_CONFIG_P` from the browser, and with them the per-250 g vs per-kg inconsistency. The admin can still price a 5 kg bag lower per kg than a 500 g pack (normal practice). The migration script fills `price`/`mrp` with exactly what the current formula produces (`Math.round(base * multiplier)`), so no customer-visible price changes on the switch-over day.
- Flowers: variants like `{label:'10 pcs', size:{value:10, unit:'pc'}}`. Drinks: `{label:'500 ml', size:{value:500, unit:'ml'}}`. The same shape covers all categories, and the admin UI is a simple variant table.
- Keep the top-level `price`/`oldPrice` only as **derived** fields: min variant price, and MRP of the default variant. Set them in a `pre('save')` hook so list sorting and the existing indexes (`price: 1`) keep working.
- Indexes: `{legacyId:1}` unique sparse, `{'variants.sku':1}` unique sparse, plus the existing ones.

**Server-side verification (replace the 20% heuristic)**
- The order line becomes `{ product: <ObjectId | legacyId | slug>, sku, quantity }`. The browser's price is ignored, or kept only for a "price changed" message.
- `findProducts` resolves `_id` for valid ObjectIds and `legacyId` for integers, in one `$or` query, projecting `name, images, variants, isActive`.
- For each line, the server finds the variant by `sku`, rejects it if the product or variant is inactive or missing, and sets `price = variant.price` and `name`/`image` from the DB. Only then does it call `priceOrder`. The existing `±1.5` total comparison then still catches stale carts and returns 409.
- Stock: decrement each line with the documented atomic pattern:
  `updateOne({ _id, variants: { $elemMatch: { sku, stock: { $gte: qty } } } }, { $inc: { 'variants.$.stock': -qty } })`
  A `modifiedCount` of 0 means out of stock. For multi-line orders, either undo the already-decremented lines on failure, or use a transaction (see Gaps). Decrement on order creation (COD) or on payment verification (Razorpay), and add stock back on cancellation.
- Legacy carts: on load, a small normaliser in a shared script maps `{id:1, qtyLabel:'500 g'}` to `{pid, sku}`, using the snapshot's `legacyId` + label map. A line it cannot map is dropped with a toast ("an item in your cart is no longer available"). The server also accepts `legacyId` + `selectedQuantity` for a transition period and maps them the same way, so carts saved before the switch can still check out.

**Links**
- `GET /api/products/:id` accepts an ObjectId, a numeric legacy id, or a slug, so `product.html?id=1` keeps working forever.
- New links use `?p=<slug>` (better for SEO).
- Wishlists in `localStorage.wishlist` hold numeric ids. Resolve them through the same map.

**Fix the id-11 conflict before migrating.** The owner must confirm whether id 11 is Sangupoo or Butterfly Pea Flower (or whether both should exist as two products). Old carts or orders with `product: 11` are ambiguous otherwise.

### Gaps
- I did not fetch MongoDB's own docs on multi-document transactions on Atlas, or on `arrayFilters`/positional `$` with `$elemMatch`. The atomic-decrement filter above follows the documented single-document pattern, but the exact positional form should be checked against the MongoDB manual.
- I could not tell which category of the store's products should get which GST rate (rice/flour vs. beverages vs. dried flowers). The code uses a flat 5%. Per-product tax rates need input from the owner or a CA; this was not researched.
- I did not check whether any real orders in production already reference numeric product ids. Reporting and reviews depend on it (`Order.items.product` is `Mixed`). Query the live DB before the migration.

---

## 2. A single "store settings" document, how the storefront loads it, and orderGuard reading it

### Takeaway
This is already half built (uncommitted):
- a singleton `Setting` document (`key:'store'`) with contact, legal, shipping/COD and announcement fields;
- defaults in `utils/settings.js` (falling back to the env vars);
- a public `GET /api/settings` with `Cache-Control: public, max-age=60`;
- `orderGuard` reading the rules through `ctx.getRules()`;
- `site-shell.js` rendering cached settings from `localStorage` and then refreshing them.

What's missing:
- **hero slides**;
- an admin-editable **GST rate** (still hard-coded at 0.05 in `pricingFrom`);
- a **settings version** that clients can compare;
- CDN cache headers;
- a bundled bootstrap response, so a cold page needs one request, not several.

### Cited Findings
- `Setting` schema fields:
  - `storeName`
  - `contact{phone, whatsapp, email, address}`
  - `legal{businessName, gstin, fssai}`
  - `shipping{freeShippingAbove, shippingFee, codEnabled, codFee, dispatchNote}`
  - `announcement{enabled, items[{text, code, link}]}`
  - `social{instagram, facebook, youtube}`
  - `updatedBy`, timestamps
  - — [backend/models/Setting.js](backend/models/Setting.js)
- `getStoreSettings()` caches in process memory for 60 s, and merges the saved values over `defaults()`. The defaults use `FREE_SHIPPING_ABOVE`/`SHIPPING_FEE` env vars, contact `+91 63821 42578` and `athanyanis@gmail.com`, and COD on with fee 0. If the DB is unreachable, it silently uses the defaults. `pricingFrom()` returns `gstRate: 0.05` (hard-coded), `freeShippingAbove`, `shippingFee`, `codEnabled` and `codFee`. `publicSettings()` returns only the announcement items when the bar is enabled. — [backend/utils/settings.js](backend/utils/settings.js)
- Routes:
  - `GET /api/settings`: public, sets `Cache-Control: public, max-age=60`.
  - `GET /api/settings/admin`: protected.
  - `PUT /api/settings`: admin only. It validates through `cleanSettings`, upserts, and calls `clearSettingsCache()`.
  - — [backend/routes/settingsRoutes.js](backend/routes/settingsRoutes.js)
- `orderGuard.priceOrder(items, coupon, rules, method)` merges `rules` over `envRules()`. It adds `codFee` only for COD, and `buildOrder` refuses COD when `rules.codEnabled === false`. `GET /api/orders/pricing` now returns `pricingRules(st.pricingFrom(await st.getStoreSettings()))`. — [backend/utils/orderGuard.js](backend/utils/orderGuard.js); [backend/routes/orderRoutes.js](backend/routes/orderRoutes.js) L320–324
- `js/site-shell.js`, `loadSettings()`:
  1. applies `localStorage.nsh_settings` immediately;
  2. fetches `/api/settings`, stores the result, and re-applies it (phone, email, WhatsApp, address, FSSAI line, social links with an `https://` check);
  3. sets `window.NANSEI_SETTINGS` and dispatches a `nansei:settings` event.
  - The footer still hard-codes the email and phone as the fallback (L218–220).
  - — [js/site-shell.js](js/site-shell.js) L218–220, L280–300
- The home page hero slider is hard-coded markup: `#slide-0` is a video from ImageKit plus a title, description and CTA. `pages/index.html` L2760 already swaps the announcement marquee for the admin's items when present. — [pages/index.html](pages/index.html) L1204–1234, L2760–2771

### Inferences (proposed additions)
- **Add to `Setting`:**
  - `heroSlides: [{ kind:'image'|'video', src, poster, alt, eyebrow, title, titleEm, desc, ctaText, ctaHref, active, position, startsAt?, endsAt? }]`, capped at around 8;
  - `tax: { gstRate }`, bounded to 0–0.28 and defaulting to 0.05; `pricingFrom` should read it instead of the literal;
  - `catalogVersion` and `settingsVersion`, integers incremented on every product or settings save;
  - optionally `shipping.minOrderValue` and `shipping.serviceablePincodes`.
  - Validate `ctaHref` so it is either relative or `https://`, the same way social links are already checked.
- **One bootstrap endpoint:** `GET /api/storefront` returns `{ version, settings: publicSettings, catalog: [light product list with variants, no `content`] }`, about 10–20 KB for 16 products. With a cold Render instance, one request is far better than separate `/settings` + `/products` + `/orders/pricing` calls. `GET /api/settings` and `/api/orders/pricing` can stay for compatibility.
- **orderGuard must keep failing safe.** If `getStoreSettings()` cannot reach the DB, it currently uses the **defaults**. If the admin had raised the delivery fee, an order placed during a DB blip would be charged the old default. That is acceptable only because the page totals come from the same source and the ±1.5 total check returns 409 on a mismatch. Better: keep the last good settings in memory, and fall back to defaults only if none were ever loaded.
- Settings cache invalidation is per process. That is fine on a single Render instance (`npm start` = `node server.js`). If `cluster.js`/pm2 is ever used, `clearSettingsCache()` and `bustCache()` clear only one worker, so add a 60 s TTL ceiling (already there) or a version check.
- Keep the hard-coded footer values in `site-shell.js` as the last fallback. Generate them from the snapshot (section 3), so the fallback is never older than the last deploy.

### Gaps
- Not confirmed: whether the admin panel UI for the settings exists yet. Only the backend and the shell consumer were seen; `admin-panel.html` shows as modified but was not read in full.

---

## 3. Performance and resilience: Render cold starts, static fallback snapshot, Netlify caching, browser stale-while-revalidate

### Takeaway
On the free tier, a page that waits for the API after 15 idle minutes will usually **fail, not just be slow**: Render needs about a minute to wake, and Netlify's proxy gives up after 26 seconds. So every page must render from data it already has:
1. a **deploy-time snapshot** published with the site;
2. a **localStorage copy** of the last API response.

Then the page refreshes in the background (stale-while-revalidate). Optionally, let Netlify's CDN cache the public GETs with `stale-while-revalidate`, so most visitors never touch Render at all. For a real shop, a paid always-on instance removes the cold start entirely.

### Cited Findings
- Render free tier:
  - "A free web service spins down after 15 minutes with no inbound traffic", and spinning back up "takes about one minute".
  - 750 free instance hours per workspace per month. Spun-down time uses no hours, and when the hours run out all free services are suspended until the next month.
  - Free services have an ephemeral filesystem, "may restart … at any time", can't scale beyond one instance, and **can't use edge caching**.
  - Render may suspend a free service that generates unusually high traffic.
  - — [Render: Deploy for Free](https://render.com/docs/free)
- Paid instances: secondary sources say the Starter instance ($7/month, 512 MB, 0.5 CPU) does not spin down, and that the workspace plan does not matter; changing the instance type does. Render's official pricing page did not render for me. There is also a Render community thread titled "Instances spin down after periods of inactivity in Started Plan", which conflicts, though I did not read it. — [temps.sh Render pricing 2026](https://temps.sh/blog/render-pricing-2026); [livemy.app Render pricing](https://livemy.app/blog/render-pricing); [Render community thread](https://community.render.com/t/instances-spin-down-after-periods-of-inactivity-in-started-plan-n8n/39059)
- Netlify proxy:
  - "Proxy rewrite requests will time out after 26 seconds."
  - Custom `headers` on a proxy redirect "apply to the request, not the response".
  - "If the API supports standard HTTP caching mechanisms like ETags or `Last-Modified` headers, the responses will even get cached by our CDN nodes."
  - — [Netlify: Rewrites and proxies](https://docs.netlify.com/manage/routing/redirects/rewrites-proxies/)
- Netlify caching:
  - Responses from "functions, edge functions, Netlify Server, and proxies are not cached by default". You opt in by sending cache-control headers.
  - Precedence: `Netlify-CDN-Cache-Control` (Netlify CDN only) > `CDN-Cache-Control` > `Cache-Control`. "Netlify always passes `CDN-Cache-Control` and `Cache-Control` downstream."
  - `stale-while-revalidate` is supported. The docs' example is `Netlify-CDN-Cache-Control: public, max-age=60, stale-while-revalidate=120`.
  - Purge by cache tag (`Netlify-Cache-Tag`) through `POST https://api.netlify.com/api/v1/purge` with a personal access token, limited to twice per 5 s per tag. The docs advise sending both `Netlify-Cache-Tag` and `Cache-Tag` when proxying, because some providers strip `Cache-Tag`.
  - Static-file defaults: `Netlify-CDN-Cache-Control: public, s-maxage=31536000, must-revalidate` and browser `Cache-Control: public, max-age=0, must-revalidate`, invalidated on each deploy.
  - — [Netlify: Caching overview](https://docs.netlify.com/build/caching/caching-overview/)
- The repo's own Netlify config matters for where a snapshot file goes:
  - `/js/*.js` is served with `Cache-Control: public, max-age=31536000, immutable`.
  - `*.html` gets `no-cache, no-store, must-revalidate`.
  - `/api/*` is force-proxied to `https://nanseiorganics.onrender.com/api/:splat`.
  - — [netlify.toml](netlify.toml)
- The backend has an in-memory response cache. `GET /api/products` is cached 30 s and `/:id` 60 s, and the middleware sets `Cache-Control: public, max-age=<ttl>` on hits. Admin writes call `bustCache('/api/products')`. — [backend/middleware/cache.js](backend/middleware/cache.js); [backend/routes/productRoutes.js](backend/routes/productRoutes.js)
- `/api/health` has no rate limit. Public reads are limited to 500 per 15 min per IP, and `trust proxy` is 1. — [backend/server.js](backend/server.js) L39, L108–133
- The settings loader in `site-shell.js` already implements a browser stale-while-revalidate pattern: localStorage first, then fetch, store and re-apply. — [js/site-shell.js](js/site-shell.js) L291–299

### Inferences (proposed design)

**Three layers of data. A page renders from the first one available, and never waits on Render.**

1. **Deploy-time snapshot (always present).**
   - A hand-run script, `node backend/scripts/export-snapshot.js`, reads Mongo, or calls `GET /api/storefront`. It writes `data/storefront.json` (settings + light catalogue + `version` + `generatedAt`) and `data/products/<slug>.json` (the rich `content` for `product.html`).
   - Commit the files; Netlify deploys them.
   - **Do not put the snapshot under `/js/`.** `netlify.toml` marks `/js/*.js` immutable for a year, so browsers would keep a stale catalogue. Under `/data/`, Netlify's default (`max-age=0, must-revalidate` for browsers, CDN invalidated on deploy) is exactly right.
   - If a no-fetch `<script>` version is wanted for instant first paint, emit `js/catalog-snapshot.js` and always reference it with `?v=<version>`, the way `site-shell.js?v=20261112` already is.
   - This snapshot also becomes the single source that replaces the four hard-coded arrays.
2. **localStorage cache.**
   - Key `nsh_storefront` = `{version, savedAt, data}`.
   - Use it if its `version` ≥ the snapshot's version (the API may be newer than the last deploy); otherwise use the snapshot.
3. **Live API, in the background.**
   - `fetch('/api/storefront', {signal})` with an `AbortController` timeout of about 10 s.
   - If the response `version` differs, re-render the prices, stock badges and banners, and save the result to localStorage.
   - Fire `fetch('/api/health')` as early as possible (in `site-shell.js`), so Render starts waking while the visitor browses.
   - Where the API is truly needed (place order, login), show a "waking the server…" state and retry once after the 26 s proxy timeout instead of failing.

**Prices shown from a stale layer are only a display.**
- The server re-prices every order (section 1), and the existing 409 "price has changed" path stays.
- On a 409, checkout should re-fetch `/api/storefront`, update the cart lines, and show which prices changed.
- Out-of-stock variants come from the live layer whenever it is available.
- **Admin edits must not depend on snapshot regeneration to take effect at checkout.** The server is the authority; the snapshot is only a fast first paint.

**CDN caching of public GETs (optional but cheap).**
- On `/api/storefront`, `/api/settings` and `/api/products*`, send:
  - `Netlify-CDN-Cache-Control: public, s-maxage=60, stale-while-revalidate=86400`
  - `Cache-Control: public, max-age=0, must-revalidate`
  - `Netlify-Cache-Tag: storefront` plus `Cache-Tag: storefront`
- Then a visitor arriving while Render sleeps can get the CDN's stale copy instantly while Netlify revalidates in the background.
- On admin save, the backend may call the Netlify purge API (store a scoped token as a Render env var). Without the purge, edits appear within about 60 s.
- **Never** send public cache headers on personalised routes (`/api/cart`, `/api/orders/*` except `/pricing`, `/api/auth/*`, `/api/users/*`, `/api/settings/admin`). The existing `cache()` middleware sets `public, max-age` on whatever route it wraps, so keep it off authenticated routes.
- Caveats: whether Netlify actually caches *proxied* responses that carry `Netlify-CDN-Cache-Control` (rather than only ETag/Last-Modified) is my reading of the two docs pages, not something they state explicitly. Test it with a `curl -I` (look for Netlify's `Cache-Status` header) after deploying.

**Keep-alive vs paid instance.**
- One service running 24×31 = 744 h stays under the 750 free hours, so an external pinger every 10–14 min could keep a single free service awake.
- But Render "may restart a free service at any time" and may suspend services with unusual traffic, so the snapshot and SWR layers are still needed.
- For a live shop taking COD orders, the Starter instance is the clean fix (price from secondary sources; verify).

**Size budget.**
- The light catalogue (16 products × about 4 variants, no `content`) should be on the order of 10–20 KB of JSON (estimate).
- The rich product content (the `product.html` array is about 2,500 lines) belongs in per-product files, loaded only on `product.html`.

### Gaps
- Not verified with a live test: whether Netlify honours `stale-while-revalidate` on proxy responses, and whether the Render origin's `ETag` (Express sets a weak ETag by default; not checked in docs) leads to CDN revalidation.
- Not found from an official source: Render's Starter price and specs, or a firm statement that paid instances never spin down. The secondary sources and the community thread conflict on the latter.
- I did not measure the actual cold-start time of this backend (Mongo connect + boot). The ~1 minute figure is Render's general statement.

---

## 4. Image management: where admin uploads should live, and secure server-signed uploads

### Takeaway
There is **no upload code today**. The admin pastes image URLs, and existing images are on ImageKit, in two different ImageKit URL endpoints (`ik.imagekit.io/bq9dscs4g` and `ik.imagekit.io/ueorokkbc`). A `cloudinary` npm dependency is installed but unused. The recommendation:
- Use **one ImageKit account** and browser-direct uploads authorised by a short-lived, admin-only backend endpoint (`token`/`expire`/`signature`).
- Store `{url, fileId, alt, width, height}` on the product and on hero slides.
- Do not stream files through Render or the Netlify proxy.

### Cited Findings
- No upload code in the backend:
  - There are no `require('cloudinary')`, `require('multer')` or `IMAGEKIT`/`CLOUDINARY` env references in the backend source.
  - `package.json` lists `cloudinary ^2.9.0` and `multer ^1.4.5-lts.1`.
  - Models (`Product`, `Category`, `Combo`, `Review`) have `images[{url, public_id}]`; `public_id` is Cloudinary-style naming.
  - — [backend/package.json](backend/package.json); [backend/models/Product.js](backend/models/Product.js)
- The admin product form takes "Main image URL" plus two optional URLs and saves `images: [{url}]`. — [pages/admin-panel.html](pages/admin-panel.html) ~L1603–1608
- Image hosts in use:
  - `ik.imagekit.io/bq9dscs4g/agro%20store/...` for products and the hero video;
  - `ik.imagekit.io/ueorokkbc/images/...` for other home and reel assets;
  - many Unsplash placeholders.
  - — [pages/index.html](pages/index.html) L1228, L2511, L2803–2818
- The body-parser limit is 1 MB (`express.json({limit:'1mb'})`), so base64 image uploads through the API would fail. — [backend/server.js](backend/server.js) L93
- ImageKit client-side upload:
  - The backend generates `token`, `expire` and `signature`. The signature is the "HMAC-SHA1 digest of the token+expire using your ImageKit.io private API key", in lowercase, and it "must be calculated on the server-side".
  - `expire` is a Unix timestamp less than 1 hour in the future. The token is single-use (a V4 UUID is suggested) to stop replays.
  - The public key can be published in browser code.
  - The JS SDK v2 takes an async `authenticator` function (the older `authenticationEndpoint` is deprecated).
  - Mixing Basic Auth with the token fields gives a 400.
  - — [ImageKit client-side upload (docs.imagekit.io, redirects to imagekit.io/docs/api-reference/upload-file/upload-file)](https://docs.imagekit.io/api-reference/upload-file-api/client-side-file-upload); [ImageKit Uppy plugin README](https://github.com/imagekit-developer/imagekit-uppy-plugin); [ImageKit community: Uploading API issue](https://community.imagekit.io/t/uploading-api-issue/146). These details come from search-result summaries; the official page body would not load for direct fetch.
- The ImageKit Node SDK exposes `client.helper.getAuthenticationParameters()` (optionally `(token, expireSeconds)`), which returns `{token, expire, signature}`. It reads the private key from `IMAGEKIT_PRIVATE_KEY` by default. — [imagekit-nodejs README](https://github.com/imagekit-developer/imagekit-nodejs)
- Cloudinary signed uploads:
  - **all** upload parameters except `file`, `cloud_name`, `resource_type` and `api_key` (so including `folder`, `public_id` and `timestamp`) are sorted, joined with `&`, appended with the API secret, then SHA-1 or SHA-256 hashed;
  - "Signatures are valid for one hour from the `timestamp`";
  - "your signature should never be generated on the client side."
  - — [Cloudinary: Authentication signatures](https://cloudinary.com/documentation/authentication_signatures)

### Inferences (proposed design)

**Endpoint and flow**
- `GET /api/uploads/auth`, using `protect` + `authorize('admin')` and a tight rate limit. It returns `{ token, expire: now+300, signature, publicKey, folder: '/nansei/products' }`.
- The admin panel then posts the file straight to ImageKit's upload API, with `fileName`, `folder`, `useUniqueFileName:true`, and tags.
- It saves the returned `url` and `fileId` into the product's `images[]` (or `heroSlides[]`) via `PUT /api/products/:id`.
- Env vars on Render: `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY`, `IMAGEKIT_URL_ENDPOINT`. Never commit them.

**Security trade-off**
- ImageKit's signature covers only `token+expire`. A leaked parameter set therefore lets someone upload any file to any folder of the account until `expire`.
- Mitigations: keep expiry short (5 minutes), make the endpoint admin-only, and validate in the backend before saving that the URL starts with the configured ImageKit endpoint and folder. That last check also blocks someone saving an arbitrary third-party URL.
- Cloudinary binds `folder`/`public_id` into the signature, which is stronger, but it would mean moving every existing asset. Not worth it unless ImageKit limits bite.

**Deletion and delivery**
- Deleting or replacing an image: the backend uses `fileId` to delete the old file through ImageKit's server API (private key) after the product saves.
- Use ImageKit URL transformations (e.g. `?tr=w-400`) for thumbnails. Checkout already has an `ikThumb()` helper.

**Housekeeping**
- Consolidate onto one ImageKit account. Either migrate the `ueorokkbc` assets or document which account owns what.
- Remove the unused `cloudinary` dependency or keep it deliberately.

### Gaps
- I could not load the official ImageKit upload API page body (it renders client-side). Upload endpoint URL, max file size, and whether any server-side upload restrictions or "checks" parameter exist all need checking on imagekit.io/docs before implementing.
- I don't know whether the store owner has the private keys for both ImageKit accounts.

---

## 5. Migration plan: keeping the site working at each step, and which pages to switch first

### Takeaway
Migrate in small deployable steps. First make the **server authoritative** for prices (no visible change). Then create the **single snapshot** that replaces the four hard-coded arrays (no visible change). Then switch pages to read the snapshot plus the API, lowest risk first. Admin editing (variants, settings, images) goes live only once every storefront page reads the same data.

### Cited Findings
- Facts the plan relies on (all from earlier sections):
  - the duplicated, inconsistent arrays and the id-11 conflict;
  - numeric-id carts skipping the price check;
  - `quantityOptions` not being saved by the controller;
  - the settings feature in progress;
  - `/js/*.js` being cached as immutable;
  - Netlify's 26 s proxy timeout and Render's 15-minute spin-down.
  - — [pages/index.html](pages/index.html), [pages/product.html](pages/product.html), [backend/routes/orderRoutes.js](backend/routes/orderRoutes.js), [backend/controllers/productController.js](backend/controllers/productController.js), [netlify.toml](netlify.toml), [Netlify proxies](https://docs.netlify.com/manage/routing/redirects/rewrites-proxies/), [Render free](https://render.com/docs/free)
- The repo has a backend test runner (`node --test tests/*.test.js`, including `orders.test.js`). `orderGuard` is written as pure functions with injected look-ups "so it is tested without MongoDB". — [backend/package.json](backend/package.json); [backend/utils/orderGuard.js](backend/utils/orderGuard.js)

### Inferences (step-by-step plan)

**Step 0: Decide the canonical data (no deploy).**
- The owner confirms the canonical name, image, price and size list for ids 1–16. Resolve id 11 (Sangupoo vs Butterfly Pea Flower) and the name variants.
- Write the result as one JSON file, `backend/seeders/catalog.source.json`: legacyId, slug, variants with explicit `price`/`mrp`/`stock`, computed from today's formula so prices are unchanged, and the rich `content` blocks extracted from `product.html`.

**Step 1: Backend model and migration script (deploy backend only; site unchanged).**
- Add `legacyId`, `variants[]`, `content` and the derived `price`/`oldPrice` to `Product`. Keep `quantityOptions` readable for now.
- Add `scripts/migrate-catalog.js`, which upserts by `legacyId` from `catalog.source.json`, so it can be re-run safely. Run it by hand against Atlas, after a `mongodump` backup.
- Make `GET /api/products/:id` accept an ObjectId, a legacyId or a slug.
- Add `GET /api/storefront` (settings + light catalogue + `version`).
- Add tests.

**Step 2: Server-authoritative pricing and stock (deploy backend; site unchanged).**
- `findProducts` resolves legacy ids too.
- `buildOrder` prices each line from `variant.price`, matching the variant by `sku`, or for old carts by legacyId + `selectedQuantity` label.
- Atomic stock decrement.
- With prices unchanged, existing carts still pass the ±1.5 total check, and from this point tampered prices are refused.
- Extend `orders.test.js` with fakes for legacy ids and variants.

**Step 3: Snapshot export plus a shared data loader (deploy frontend; no visible change).**
- `scripts/export-snapshot.js` writes `data/storefront.json` and `data/products/<slug>.json`.
- New `js/catalog.js?v=…`: snapshot → localStorage → background API (section 3); exposes `Catalog.ready()`, `Catalog.bySlug`, `Catalog.byLegacyId`; plus the cart normaliser for `{id, qtyLabel}` → `{pid, sku}`.
- Pages don't use it yet; verify it in the console.

**Step 4: Switch pages, lowest risk first.** Deploy and smoke-test after each one with the existing UI test harness (`tests/ui/pagecheck.js`).
1. **`wishlist.html`**: read-only grid; its copy is already the most out of date (Unsplash images).
2. **`account.html`**: only cart/reorder helpers.
3. **`index.html`**: product grid, plus hero slides and announcement from settings. Keep the current markup as the fallback when `heroSlides` is empty.
4. **`product.html`**: the biggest change. Variant buttons come from `variants[]` (no `BASE_UNIT_G`), the rich content comes from `data/products/<slug>.json`, and `?id=` and `?p=` are both supported.
5. **`checkoutmyorderpage.html`**: sends `{product, sku, quantity}`, re-syncs on 409, and shows `codFee` when `codEnabled`.
- After each page switches, delete its hard-coded array. Delete `js/products-data.js` at the end.

**Step 5: Admin editing goes live.**
- `createProduct`/`updateProduct` accept `variants`, `content` and `images`, validate server-side (sku unique, price > 0, mrp ≥ price, stock ≥ 0 integer), bump `catalogVersion`, `bustCache`, and optionally purge the Netlify cache tag.
- The admin panel gets a variant table, the settings screen (hero slides, GST rate), and ImageKit upload via `/api/uploads/auth`.
- Add an admin button or doc step to "regenerate snapshot", meaning run the export script and commit. The site stays correct without it, because the API layer overrides the snapshot; regeneration only freshens the first paint and the offline fallback.

**Step 6: Hardening.**
- Netlify CDN cache headers on the public GETs.
- `/api/health` pre-warm from `site-shell.js`.
- Decide between the free tier with a pinger and the paid Starter instance.
- Remove the legacy-cart compatibility path from `buildOrder` after about 60 days (carts older than that are rare). Keep `legacyId` resolution for links permanently.

**Rollback at every step.**
- Backend changes are additive: the new fields are optional, and old routes keep their shape.
- Each frontend page switch is one commit, revertable on its own.
- The snapshot means a backend outage never blanks the catalogue.

### Gaps
- I did not read `tests/ui/pagecheck.js`, or how the current UI tests run. Their suitability as the per-step smoke test is assumed.
- No estimate of the effort for the `product.html` refactor (7,722 lines) was made.
