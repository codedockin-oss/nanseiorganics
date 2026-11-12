# Current admin audit: what the Nansei admin panel controls today, and what is hard-coded

Method: I read the working tree only. I did not run the backend or open a browser. Citations are `file:line` in the repo at `C:/Users/DELL/OneDrive/Documents/agri store`.

**Concurrency caveat.** While this audit ran (about 21:20 to 21:30 IST, 2026-11-12), another session was writing store-settings code. These files were created or changed between 21:25 and 21:28: `backend/models/Setting.js`, `backend/utils/settings.js`, `backend/routes/settingsRoutes.js` (mounted at `backend/server.js:151`), `backend/routes/orderRoutes.js`, `js/site-shell.js` and `pages/index.html`. Where I describe them, they are a snapshot, and a Settings UI in the admin panel probably does not exist yet. `pages/admin-panel.html` was last modified at 20:46 and still has the placeholder.

## Q1. What each admin section does end to end, and where it fails silently

### Takeaway
Four of the nine sections work end to end against the API: Products (basic fields only), Orders (forward status changes), Customers (read-only) and Reviews. Two are half-broken: in Blogs and News, Edit and Preview read localStorage, so editing a post that came from the API silently creates a duplicate. The Dashboard mixes real numbers with invented ones. Discounts throws a JavaScript error because its functions do not exist. Settings is a one-line placeholder.

### Cited Findings
**Shell and auth**
- The admin page loads `js/config.js`, Tailwind CDN, Chart.js and Lucide — [admin-panel.html:8-10,140](pages/admin-panel.html).
- On load it reads `admin_token` or `nansai_token` from localStorage and calls `GET /auth/me`. It shows the shell only when `role === 'admin'`. If the fetch throws (offline or API down) and `admin_user` exists in localStorage, it shows the shell anyway — [admin-panel.html:2059-2096](pages/admin-panel.html).
- The `API` helper sends `Authorization: Bearer <token>` and logs out on any 401 — [admin-panel.html:892-919](pages/admin-panel.html).
- The nav lists Dashboard, Products, Orders, Customers, Discounts, Reviews, Settings, News, Blogs and Logout — [admin-panel.html:259-302](pages/admin-panel.html).

**Dashboard**
- `loadData()` fetches `/products/admin/all`, `/orders`, `/users` and `/discounts` in parallel — [admin-panel.html:926-981](pages/admin-panel.html).
- Total Sales sums only `isPaid` orders — [admin-panel.html:1322](pages/admin-panel.html). COD orders never become paid, because `PUT /orders/:id/status` to `Delivered` sets `isDelivered` but not `isPaid` — [orderRoutes.js:301](backend/routes/orderRoutes.js). So COD revenue is never counted.
- The "↑ 12.5% / ↑ 8.3% / ↑ 5.1% vs last month" labels are static HTML — [admin-panel.html:343,353,363](pages/admin-panel.html).
- The revenue chart uses fixed months `['Aug','Sep','Oct','Nov','Dec','Jan']` and fixed figures `[142000, 198000, 165000, 220000, 280000, <real>]` — [admin-panel.html:1410-1411](pages/admin-panel.html). The real `GET /orders/admin/stats` with `monthlyRevenue` exists but is never called — [orderRoutes.js:239-287](backend/routes/orderRoutes.js).
- `GET /orders` returns 50 orders by default (`limit = 50`) — [orderRoutes.js:217](backend/routes/orderRoutes.js). The admin never pages, so every dashboard figure, top product, customer insight and the pending badge covers only the latest 50 orders.
- Revenue by category matches order lines to products by name — [admin-panel.html:1370](pages/admin-panel.html). Static-catalogue orders whose names differ from the DB names fall into "other".

**Products**
- Lists `GET /products/admin/all` (limit 100) — [admin-panel.html:1454-1462](pages/admin-panel.html), [productRoutes.js:13-29](backend/routes/productRoutes.js).
- Create uses `POST /products` and edit uses `PUT /products/:id` — [admin-panel.html:1597-1635](pages/admin-panel.html). Delete is a hard delete via `DELETE /products/:id` — [admin-panel.html:1637-1645](pages/admin-panel.html).
- The form has: name, price, old price, stock, unit, weight, category (5 fixed options), badge, section, active, tagline, description, and three image URLs — [admin-panel.html:703-816](pages/admin-panel.html).
- The form has no input for: variants or sizes (`quantityOptions`), benefits, specs, nutrients, how-to-use, certifications, SEO meta, featured, SKU or image upload.
- The controller whitelist itself drops `quantityOptions`, `benefits`, `howToUse`, `metaTitle`, `metaDescription` and `certifications`. Only these are accepted: `name, description, price, oldPrice, stock, category, images, badge, section, tags, isFeatured, isActive, sku, unit, weight, tagline` — [productController.js:76-95](backend/controllers/productController.js).
- `sku` is accepted but the Product schema has no `sku` path — [Product.js](backend/models/Product.js). Mongoose strict mode will discard it, so the SKU column always shows "—".
- An old price cannot be removed. An empty field becomes `undefined` ([admin-panel.html:1609](pages/admin-panel.html)), and the controller deletes `undefined` keys before updating ([productController.js:91](backend/controllers/productController.js)).
- New products default to badge "hot" — [admin-panel.html:1573](pages/admin-panel.html).
- The "Status" column comes from stock, not from `isActive`, so an inactive product still shows "Active" — [admin-panel.html:1527-1529](pages/admin-panel.html).
- The success toast says "Changes are live on the site" — [admin-panel.html:1632](pages/admin-panel.html). Q3 shows that is only partly true.

**Orders**
- Lists `GET /orders` — [admin-panel.html:1691-1717](pages/admin-panel.html).
- Status moves forward only: Pending → Confirmed (backend `Processing`) → Packed → Shipped → Delivered, via `PUT /orders/:id/status` — [admin-panel.html:1651-1658,1767-1776](pages/admin-panel.html).
- The admin UI has no cancel, refund, mark-paid, address-edit or notes action. The status filter has no Cancelled option — [admin-panel.html:446-453](pages/admin-panel.html).
- The Ship modal prefills a random tracking number from `generateTracking()`, e.g. `'DL' + Math.random()…+'IN'` — [admin-panel.html:1778-1792](pages/admin-panel.html). The admin can mark an order shipped with an invented tracking ID.
- The Shiprocket manual-ship endpoint `POST /api/shipping/:id/ship` exists but the UI never calls it — [shippingRoutes.js:85](backend/routes/shippingRoutes.js).
- The order modal shows "Subtotal" equal to the total, with no GST, delivery, COD fee, coupon or phone — [admin-panel.html:1858-1863](pages/admin-panel.html).

**Customers**
- Read-only list from `GET /users`, with server-computed `orderCount` and `totalSpent` — [admin-panel.html:1872-1906](pages/admin-panel.html), [userRoutes.js:42-61](backend/routes/userRoutes.js).
- There is no UI for `DELETE /users/:id` or `PUT /users/:id/role` — [userRoutes.js:63-94](backend/routes/userRoutes.js).
- The profile modal computes spend from the 50 loaded orders, paid only — [admin-panel.html:1915-1916](pages/admin-panel.html).

**Discounts (broken)**
- The page calls `renderDiscounts()` and `openDiscountModal()` — [admin-panel.html:483-484,1010](pages/admin-panel.html). Neither function is defined anywhere in the file (grep finds only the call sites). Opening the page throws a ReferenceError; the table stays empty and Create Discount does nothing.
- `Store.discounts` is loaded and never rendered — [admin-panel.html:980](pages/admin-panel.html).

**Reviews (works)**
- Lists `GET /reviews/admin/all`, replies with `PUT /reviews/:id/reply`, and hides or shows with `PATCH /reviews/:id/visibility` (reason required) — [admin-panel.html:2002-2052](pages/admin-panel.html).
- Customer text is escaped with `escAdmin` — [admin-panel.html:1994-1996](pages/admin-panel.html).
- `deleteReview()` exists but has no button, which is deliberate — [admin-panel.html:2053-2058](pages/admin-panel.html).

**Settings**
- The section is only "Settings ready for store configuration." — [admin-panel.html:504-506](pages/admin-panel.html).
- The backend `GET /api/settings/admin` and `PUT /api/settings` now exist (in flight) — [settingsRoutes.js:57-78](backend/routes/settingsRoutes.js).

**News and Blogs (half-broken)**
- Listing merges the API (`GET /news`, `GET /blogs`) with legacy localStorage keys `nansai_news` / `nansai_blogs` — [admin-panel.html:1053-1059,1191-1196](pages/admin-panel.html).
- Save, create and delete use the API correctly — [admin-panel.html:1118-1157,1247-1283](pages/admin-panel.html).
- **Edit is broken for API posts.** `openBlogModal(id)` and `openNewsModal(id)` look the post up in localStorage (`getBlogStore()` / `getNewsStore()`), find nothing and `return` — [admin-panel.html:1093-1097,1223-1227](pages/admin-panel.html). The modal opens with stale or empty fields and an unchanged hidden id, so "Publish" usually POSTs a new duplicate.
- `previewNews()` also reads localStorage, so it does nothing for API news — [admin-panel.html:1285-1287](pages/admin-panel.html). `previewBlog()` correctly uses `GET /blogs/:id` — [admin-panel.html:1159-1175](pages/admin-panel.html).
- The list shows `${b.date}` but API documents have `createdAt`, not `date`, so the column shows "undefined" — [admin-panel.html:1080,1211](pages/admin-panel.html), [Blog.js](backend/models/Blog.js).
- `GET /blogs` returns only `isActive: true` — [blogRoutes.js:7-14](backend/routes/blogRoutes.js). The admin cannot see or restore inactive posts, and the form has no active toggle.
- The 16 hard-coded posts in `blog.html` (see Q4) are not visible or editable in the admin.

**Other**
- `globalSearch()` is defined but wired to no input — [admin-panel.html:1968-1975](pages/admin-panel.html).

### Inferences
- The admin panel can change price, stock, basic copy and images of DB products; order status; review visibility and replies; and blog/news posts (create and delete reliably, edit only by luck).
- It cannot manage discounts, coupons, settings, homepage content, variants or policies.
- The dashboard is not trustworthy for business decisions: it covers 50 orders, ignores COD revenue and charts invented history.

### Gaps
- I did not exercise the page in a browser, so the Discounts ReferenceError and the blog/news edit duplication are inferred from code, not observed. Both are deterministic from the source.
- A Settings UI may be added by the parallel session after this snapshot.

## Q2. Backend admin endpoints, and which ones the admin UI actually uses

### Takeaway
Every admin write route is protected server-side with `protect` plus `authorize('admin')` or `admin`. The UI uses only about half of them. Coupons, categories, combos, user roles and deletes, Shiprocket ship, order stats, discount CRUD and settings have no UI. Coupon creation is broken at the API level.

### Cited Findings
Route table: `backend/routes/*.js`, mounted in [server.js:135-151](backend/server.js).

| Endpoint | Guard | Used by admin UI? | Notes |
|---|---|---|---|
| GET /api/products/admin/all | protect+admin | Yes | limit 100 [productRoutes.js:13-29](backend/routes/productRoutes.js) |
| POST/PUT/DELETE /api/products(/:id) | protect+admin | Yes | whitelist drops variants, SEO and benefits [productController.js:76-95](backend/controllers/productController.js); DELETE is hard delete |
| GET /api/products, /:id | public, cached 30s/60s | storefront | `/:id` does not filter `isActive`, so inactive products stay reachable [productController.js:61-73](backend/controllers/productController.js) |
| GET /api/orders | protect+admin | Yes | default limit 50 [orderRoutes.js:215-237](backend/routes/orderRoutes.js) |
| GET /api/orders/admin/stats | protect+admin | **No** | [orderRoutes.js:239-287](backend/routes/orderRoutes.js) |
| PUT /api/orders/:id/status | protect+admin | Yes | accepts Pending…Refunded; UI never sends Cancelled/Refunded [orderRoutes.js:289-314](backend/routes/orderRoutes.js) |
| GET /api/orders/pricing | public | checkout | now reads settings [orderRoutes.js:321-324](backend/routes/orderRoutes.js) |
| GET /api/users, DELETE /:id, PUT /:id/role | protect+admin | GET only | [userRoutes.js:42-94](backend/routes/userRoutes.js) |
| GET/POST/PUT/PATCH toggle/DELETE /api/discounts | protect+admin (GET /active public) | GET only (never rendered) | [discountRoutes.js:21-99](backend/routes/discountRoutes.js) |
| GET /api/coupons, POST /api/coupons | protect+admin | **No** | no PUT/DELETE exists [couponRoutes.js:6-45](backend/routes/couponRoutes.js) |
| POST /api/coupons/validate | protect (any user) | checkout | [couponRoutes.js:16-31](backend/routes/couponRoutes.js) |
| GET/POST /api/categories | POST protect+admin | **No** | no PUT/DELETE [categoryRoutes.js](backend/routes/categoryRoutes.js) |
| GET/POST /api/combos | POST protect+admin | **No** | no PUT/DELETE [comboRoutes.js](backend/routes/comboRoutes.js) |
| GET/POST/PUT/DELETE /api/blogs, /api/news | writes protect+admin | Yes | `Blog.create(req.body)` takes the whole body; content stored as raw HTML [blogRoutes.js:28-46](backend/routes/blogRoutes.js) |
| GET /api/reviews/admin/all, PATCH /:id/visibility, PUT /:id/reply | protect+admin | Yes | [reviewRoutes.js:230-277](backend/routes/reviewRoutes.js) |
| DELETE /api/reviews/:id | owner or admin | function only, no button | [reviewRoutes.js:212-227](backend/routes/reviewRoutes.js) |
| POST /api/shipping/:id/ship | protect+admin | **No** | [shippingRoutes.js:85](backend/routes/shippingRoutes.js) |
| GET /api/settings, GET /api/settings/admin, PUT /api/settings | admin for /admin and PUT | **No** (in flight) | [settingsRoutes.js:50-78](backend/routes/settingsRoutes.js) |

**Coupon API is broken.**
- `POST /api/coupons` passes `{code, discountType, discountValue, minOrderAmount, maxUses, expiresAt, isActive}` — [couponRoutes.js:35-39](backend/routes/couponRoutes.js).
- The schema requires `validFrom` and `validUntil` and names the limit `usageLimit` — [Coupon.js:32-43](backend/models/Coupon.js). Every create therefore fails validation and returns 500 "Server error".
- `usedCount` is never incremented anywhere (grep finds it only in the model and the schema-setup seeder), so `usageLimit` is never enforced.
- `couponAmount()` ignores `applicableProducts` and `applicableCategories` — [orderGuard.js:58-64](backend/utils/orderGuard.js).

**Discount model is dead.**
- Neither the storefront nor `orderGuard` reads `/discounts/active` or the Discount model. grep over `pages/` and `js/` finds no use.

**Models**
- Address, Blog, Cart, Category, Combo, Coupon, Discount, News, Order, Product, Review, User, and Setting (new) — [backend/models](backend/models).
- `Order.items.product` is `Mixed` so it can hold static numeric ids — [Order.js:4-6](backend/models/Order.js).

### Inferences
- Several capabilities already exist in the backend and only need admin UI: order stats, Shiprocket ship, user role and delete, discount CRUD, category and combo create, and settings.
- Coupons need backend fixes before any UI is useful.

### Gaps
- I did not inspect `shippingService.autoShip`. It may book Shiprocket automatically on every order ([orderRoutes.js:66-69](backend/routes/orderRoutes.js)), which would make the manual Ship modal redundant or conflicting.

## Q3. Which product data the storefront reads from the API vs hard-coded arrays, and what a shopper sees after an admin edit

### Takeaway
Only the homepage grid and `product.html?id=<MongoId>` read products from the API. Even there, variants and sizes, per-size prices, stock, benefits, specs and SEO come from page code. Wishlist, account and numeric-id product pages use their own hard-coded arrays.

Stock is never shown and never enforced at order time. "Out of stock" in the admin changes nothing for a shopper. Marking a product inactive hides it from the homepage only.

### Cited Findings
**Homepage (`index.html`)**
- A static `products` array of 16 items with numeric ids 1-16 — [index.html:2802-2819](pages/index.html).
- It is replaced wholesale by `GET /products?limit=100` only when the API returns at least one active product — [index.html:3347-3376](pages/index.html).
- For API products without `oldPrice`, the page invents one at `price*1.25` (a fake strike-through discount) — [index.html:3358](pages/index.html). Stock, `quantityOptions` and `isFeatured` are not mapped.
- Sizes come from `QTY_CFG` by category (rice/flour/other 0.25-2 kg, beverages 250-2000 ml, flowers 1-25 pcs) — [index.html:2976-2983](pages/index.html). Size price is base price × quantity. The DB has no per-size price or stock.

**Product page (`product.html`)**
- A static array of 16 rich products — [product.html:5197-6536](pages/product.html). Each has variants such as `["500g","1kg","2kg","5kg"]`, benefits, nutrients, howToUse, specs, metaTitle/metaDesc, fake `sold` counts (e.g. 312, 421), and an `experience` block (stories, reels, watch-and-learn videos, "from their kitchens" photos) — [product.html:5199-5236](pages/product.html).
- `loadProduct()` uses the static array for any numeric id. It calls `GET /products/:id` only for non-numeric ids — [product.html:6601-6618](pages/product.html).
- `mapApiProduct` keeps the raw API category (`"rice"`) — [product.html:6571-6599](pages/product.html). But the page's configs are keyed by display labels: `QUANTITY_CONFIG_P` ['Rice Varieties', …] ([product.html:6546-6553](pages/product.html)), `BASE_UNIT_G` ([product.html:6974-6980](pages/product.html)) and `catColors` ([product.html:6629](pages/product.html)).
- So an admin-created rice product falls to the default `{unit:'piece', options:[1,2,3,5]}` and is sold "per piece" at the per-kg price — [product.html:6553](pages/product.html), [product.html:6917-6940](pages/product.html).
- `variants` maps from `quantityOptions`, but the controller never saves `quantityOptions` ([productController.js:76-95](backend/controllers/productController.js)), so API products have no variant buttons.
- The product page has no stock text or out-of-stock state (grep "stock" finds nothing).
- `GET /products/:id` does not filter `isActive` ([productController.js:61-73](backend/controllers/productController.js)). Deep links to an inactive product still render and can be added to the cart.

**Wishlist and account**
- Wishlist has its own static 16-item array with different (Unsplash) images — [wishlist.html:532](pages/wishlist.html). Lookup is by id — [wishlist.html:600,730,742,833,885](pages/wishlist.html).
- When the homepage shows API products, wishlisted Mongo ids are not found in this array and silently disappear from the wishlist page. The backend sync only copies ids — [wishlist.html:953-961](pages/wishlist.html).
- Account wishlist uses `PRODUCTS_DATA` — [account.html:1316](pages/account.html). Lookup by id at [account.html:1348,1359](pages/account.html) has the same failure. Add-to-cart from there uses the static price with label "1 pc" — [account.html:1349-1350](pages/account.html).
- `js/products-data.js` (72 lines) and `js/products-render.js` are not loaded by any page. They are dead code.

**Cart and order (price integrity)**
- The cart lives in localStorage with the price captured at add time — [index.html:3050](pages/index.html), [product.html:7000-7012](pages/product.html).
- The server recomputes totals from the client's item prices. It only rejects a price below 20% of the DB price, and only for products that exist in the DB — [orderGuard.js:12,96-105](backend/utils/orderGuard.js).
- Items with static numeric ids (1-16) skip the catalogue check entirely, and `Order.items.product` is `Mixed` — [Order.js:4-6](backend/models/Order.js). Any positive price is accepted for them.
- **Stock**: `buildOrder` never checks stock, and no route decrements it (grep over routes and utils finds only `cartRoutes.js:27`). `POST /cart/add` rejects `stock < 1` — [cartRoutes.js:27](backend/routes/cartRoutes.js). But that applies only to the server cart, which pages sync best-effort with `.catch(()=>{})` — [index.html:2839-2846](pages/index.html).

**What a shopper sees after an admin change**

| Admin action | Homepage (API up, ≥1 DB product) | product.html?id=MongoId | product.html?id=1..16 | wishlist / account | Checkout / server |
|---|---|---|---|---|---|
| Change price | New price after ≤30s cache, busted on update ([productController.js:94](backend/controllers/productController.js)) | New price, but sizes wrong (per-piece) | Old static price | Old static price (or item vanishes) | Cart keeps old price; server accepts it if ≥20% of new price, or any price for static ids |
| Stock = 0 | Still listed, Add to cart works | No out-of-stock state | — | — | Order accepted; stock never decremented |
| Inactive | Hidden | Still viewable and buyable | — | — | Order accepted |
| Edit description, images, tagline | Shown | Shown | Static copy | Static copy | — |
| Benefits, variants, SEO | Not possible (no UI, controller drops them) | Not shown | Static | — | — |

### Inferences
- Before "admin controls the catalogue" can be true, the 16 static products need to be in MongoDB. `backend/seeders/seed-products.js` already defines 16 products with benefits.
- After that, every page needs to read the API by Mongo id or slug, and the four static arrays need deleting.
- Old numeric-id carts, wishlists and links will need a mapping (numeric id → slug) during migration.

### Gaps
- I could not check what is in the production MongoDB, i.e. whether the homepage currently shows API or static products. This decides what shoppers see today.

## Q4. Everything shoppers see that is hard-coded, and what it would take to make it admin-controlled

### Takeaway
Apart from basic product fields, blog/news posts, reviews and (newly) contact details, the delivery/COD rules and the announcement bar, the storefront is static HTML. That covers the hero slider, homepage sections, marketing claims, policy pages, SEO, size tables, GST rate and coupon promos.

### Cited Findings
Each item lists where it lives today, then what it would take.

1. **Product catalogue arrays.**
   - Today: [index.html:2802-2819](pages/index.html), [product.html:5197-6536](pages/product.html), [wishlist.html:532](pages/wishlist.html), [account.html:1316](pages/account.html), and dead [js/products-data.js:50](js/products-data.js). These hold prices, variants, images, descriptions, benefits, nutrients, specs, `sold` counts and the `experience` media.
   - To make it admin-controlled: seed them into Product, extend the schema and controller whitelist (variants with price and stock each, nutrients, specs, howToUse, experience media, SEO), and add `GET /products?ids=` or slug lookup. Then replace all four arrays with API reads.
2. **Size and variant rules.**
   - Today: `QTY_CFG` [index.html:2976-2983](pages/index.html), `QUANTITY_CONFIG_P` [product.html:6546-6553](pages/product.html), `BASE_UNIT_G` [product.html:6974-6980](pages/product.html), `REL_QTY_CFG` [product.html:7247](pages/product.html). Prices are linear multiples of the base price.
   - To make it admin-controlled: use `Product.quantityOptions` (already in the schema with label, quantity, unit and price at [Product.js](backend/models/Product.js)) as the single source, accept it in the controller, add a size editor in the admin, and have `orderGuard` price each line from the chosen option.
3. **Stock and badges.**
   - Today: badges come from `badge` (DB) on index. The "Only 32 Left" Paneer Rose scarcity is static text in the offer bar — [index.html:1148](pages/index.html), mobile [index.html:2754](pages/index.html).
   - To make it admin-controlled: show stock state from the API, and make `buildOrder` check stock and decrement it atomically (`$inc` with `stock >= qty` filter).
4. **Offer / announcement bar.**
   - Today: static items NANSAI10 10% OFF, "Free Delivery above ₹999", "Grain Essentials Pack Save ₹221", "Buy 2 Flowers Get 1 FREE HEALTH3" — [index.html:1131-1160](pages/index.html). The "Ends hh:mm:ss" countdown always counts to today's midnight — [index.html:2783-2791](pages/index.html).
   - In flight: `applyAnnouncements()` replaces the bar with `settings.announcement` when items are saved — [index.html:2758-2775](pages/index.html), [Setting.js:7-38](backend/models/Setting.js).
   - Still needed: an admin UI, removing the fake countdown or making it data-driven, and linking codes to real Coupons. No seeder creates NANSAI10 or HEALTH3, and coupon creation is broken (Q2).
5. **Hero slider.**
   - Today: slides at [index.html:1203-1290](pages/index.html) (slide ids at 1227, 1251, 1262, 1273), with video `slide video.mp4` at [index.html:1228,1242](pages/index.html). Static claims include "25 Acres…", "22 years of…", "9 internationally recognised certifications" and "200+ farming families".
   - To make it admin-controlled: add a `heroSlides[]` content block (media URL, eyebrow, title, description, CTA) and render from it.
6. **Homepage sections.**
   - Today: mid-parallax [index.html:2212](pages/index.html); mill heritage with 6 remote media [index.html:2320-2543](pages/index.html); gallery with 8 images [index.html:2544-2567](pages/index.html); founder story [index.html:2568-2604](pages/index.html); why-section claims ("USDA Organic, Non-GMO & Halal", "Free above ₹999", "Save up to 30%") [index.html:2605-2639](pages/index.html).
   - The home blog strip uses its own static `BLOGS` array, not `/api/blogs` — [index.html:2640,3751](pages/index.html). The search typing-placeholder words are hard-coded — [index.html:~3405](pages/index.html). The newsletter only shows a toast and stores nothing — [index.html:~2800-2803](pages/index.html).
   - To make it admin-controlled: a `Content`/`PageBlock` model keyed by section, an image upload endpoint, `/api/blogs?limit=` for the strip, and a newsletter subscriber model.
7. **Contact phone, email and WhatsApp.**
   - Today: defaults in [site-shell.js:218-221](js/site-shell.js), now overridable at runtime by `GET /api/settings` → `applySettings()` — [site-shell.js:273-300](js/site-shell.js) (in flight). The backend defaults are themselves hard-coded at [settings.js:14](backend/utils/settings.js).
   - Still hard-coded and NOT covered by settings: [checkoutmyorderpage.html:723,1800,1840](pages/checkoutmyorderpage.html), [news.html:877](pages/news.html), [privacy-policy.html:145,159-160](pages/privacy-policy.html), [refund-policy.html:149,233-235](pages/refund-policy.html), [terms-and-conditions.html:77-78,167-168](pages/terms-and-conditions.html).
   - To make it admin-controlled: add `data-` hooks such as `data-contact="email"` on those pages and have site-shell fill them, or render the policy pages from content (item 10).
8. **Delivery fee, free-shipping threshold, COD and GST.**
   - Server: `GST_RATE = 0.05` constant [orderGuard.js:11](backend/utils/orderGuard.js), repeated as `gstRate: 0.05` in [settings.js:69](backend/utils/settings.js). The env defaults `FREE_SHIPPING_ABOVE` (999) and `SHIPPING_FEE` (0) [orderGuard.js:9-10](backend/utils/orderGuard.js) are now overridden by Setting.shipping (`freeShippingAbove`, `shippingFee`, `codEnabled`, `codFee`) — [Setting.js:28-34](backend/models/Setting.js), [orderRoutes.js:26](backend/routes/orderRoutes.js) (in flight).
   - Checkout: fetches rules from `/orders/pricing` with a fallback `{gstRate:0.05, freeShippingAbove:999, …}` — [checkoutmyorderpage.html:2198,2414](pages/checkoutmyorderpage.html). It still labels "GST (5%)" statically — [checkoutmyorderpage.html:703,908](pages/checkoutmyorderpage.html). Estimated delivery is always today + 5 days — [checkoutmyorderpage.html:1656](pages/checkoutmyorderpage.html). The refund text "5-7 business days" is static — [checkoutmyorderpage.html:863,2140](pages/checkoutmyorderpage.html).
   - Still needed: settings fields for GST rate (or per-category HSN rates) and delivery ETA, label text derived from them, and the admin UI.
9. **Coupons shown on the site.**
   - Today: NANSAI10 and HEALTH3 in the offer bar [index.html:1142-1150,2754](pages/index.html). Checkout validates via `POST /coupons/validate` — [checkoutmyorderpage.html:2356](pages/checkoutmyorderpage.html).
   - To make it admin-controlled: fix coupon create, add PUT/DELETE, add a `showOnSite` flag and usage counting, and add a Coupons admin page.
10. **Policy pages.**
    - Today: fully static HTML in [privacy-policy.html](pages/privacy-policy.html) (168 lines), [refund-policy.html](pages/refund-policy.html) (246) and [terms-and-conditions.html](pages/terms-and-conditions.html) (176).
    - To make it admin-controlled: a `Page` model (slug, title, sanitized HTML or markdown, updatedAt) plus a render-from-API shell, or keep them static and document that legal edits are a code change.
11. **Blog and news.**
    - Today: `blog.html` has 16 static posts in `BLOGS` [blog.html:1070](pages/blog.html), and API posts are prepended [blog.html:1718-1738](pages/blog.html). The static posts cannot be edited or removed from the admin. News is fully API-driven because `SHOW_SAMPLE_NEWS = false` — [news.html:941,1117](pages/news.html).
    - Blog categories are hard-coded in both the admin [admin-panel.html:532-541](pages/admin-panel.html) and the page.
    - To make it admin-controlled: migrate the 16 posts into the Blog collection and drop the array, then fix admin edit (Q1).
12. **Video reels page.**
    - Today: `VIDEOS` uses third-party sample clips (w3schools, learningcontainer, samplelib URLs) — [video-reels.html:324-341](pages/video-reels.html).
    - To make it admin-controlled: a `Media`/`Reel` collection or a content block.
13. **Header and footer copy, navigation.**
    - Today: tagline "Experience the Root of Nature", the about text and the link lists — [site-shell.js:138-228](js/site-shell.js). The copyright brand is hard-coded "NANSEI Organics" while `storeName` exists in settings — [site-shell.js:226](js/site-shell.js), [Setting.js:16](backend/models/Setting.js).
14. **Categories.**
    - Today: the `Product.category` enum is fixed to rice, flowers, beverages, flour, other — [Product.js](backend/models/Product.js). It is repeated in the admin form [admin-panel.html:744-750](pages/admin-panel.html), in the per-page configs, and in display labels. A Category model and `GET /api/categories` exist but no page uses them.
    - To make it admin-controlled: drop the enum, reference Category, and add Category PUT/DELETE and an admin page.
15. **SEO meta.**
    - Today: each page has a static `<title>` and description, e.g. [index.html:8-9](pages/index.html), [blog.html:6-7](pages/blog.html). `product.html` has the generic "Product NANSAI" title and description — [product.html:8-9](pages/product.html). Its static `metaTitle`/`metaDesc` are never written to the DOM (only `document.title = name + ' | NANSAI'` at [product.html:6620,6633](pages/product.html)).
    - There is no sitemap. `robots.txt` has only three Disallow lines.
    - `Product.metaTitle`/`metaDescription` exist in the schema but are not accepted by the controller.
    - To make it admin-controlled: accept SEO fields, set meta tags client-side, or better, pre-render; add per-page SEO in content; generate `sitemap.xml` from products and posts.
16. **Social links, FSSAI and GSTIN.**
    - Now in Setting and applied in the footer (in flight) — [Setting.js:23-43](backend/models/Setting.js), [site-shell.js:281-285](js/site-shell.js).

### Inferences
- Roughly three kinds of data are needed:
  - (i) **Catalogue**: Product with variants, stock and SEO; Category; Coupon.
  - (ii) **Store settings singleton** (in flight): contact, shipping, COD, announcement, social, legal. It needs GST rate and ETA added.
  - (iii) **Content blocks and pages**: hero, homepage sections, policies, reels, per-page SEO.
- A media-upload endpoint would serve all three. The site already uses ImageKit URLs.

### Gaps
- The exact slide count: I found 4 `slide-N` ids but 5 slide titles in the hero range. The 5th may be the active clone or a 5th slide without an id. Not verified in a browser.
- I did not audit `pages/login.html` or `reset-password.html` copy, or the email templates (`backend/utils/emailTemplates.js`, which likely also hard-code brand and contact details).

## Q5. Admin security: authentication, token storage, server-side protection, audit trail, rate limiting, roles

### Takeaway
Server-side authorization is consistent: every admin route checks a valid JWT and the user's role is re-read from the DB on each request. But the admin JWT sits in localStorage for 7 days and cannot be revoked. The admin panel renders customer-controlled order fields as raw HTML, which is a stored-XSS path to that token. There is no audit log and no granular role, and admin endpoints are not rate-limited as admin traffic.

### Cited Findings
**Authentication**
- Same `POST /api/auth/login` as customers. Admins are redirected to `admin-panel.html` when `role === 'admin'` — [login.html:603](pages/login.html), [js/login.js:138](js/login.js).
- The JWT carries `{id, userId, email, role}` and expires in `JWT_EXPIRE || '7d'` — [User.js:130-136](backend/models/User.js).
- `protect` verifies the JWT and loads the user from the DB, so a role change or user delete takes effect immediately — [auth.js:5-24](backend/middleware/auth.js).
- Logout is a server no-op, and a token is not invalidated on password change — [authController.js:125-128](backend/controllers/authController.js).

**Token storage**
- localStorage keys `admin_token` and `nansai_token` — [admin-panel.html:995,2076](pages/admin-panel.html). Any XSS on the origin can read them.

**Stored-XSS risk in the admin panel**
- Order line `name` is taken from the customer's request body (`str(i.name, 200)`) — [orderGuard.js:32](backend/utils/orderGuard.js). Shipping address fields are only trimmed — [orderGuard.js:43-49](backend/utils/orderGuard.js).
- The admin renders these with template-literal `innerHTML` and no escaping: `${p.name}` and `title="${prodNames}"` in [admin-panel.html:1742,1750](pages/admin-panel.html), and `${o.address}` / `${p.name}` in the order modal at [admin-panel.html:1832,1848](pages/admin-panel.html).
- Product, blog and news titles are also unescaped ([admin-panel.html:1073,1205,1511](pages/admin-panel.html)), but those are admin-authored.
- Only the Reviews section escapes output — [admin-panel.html:1994-1996](pages/admin-panel.html).
- Customer `name` is sanitized of `<>` at registration — [authController.js:12-14](backend/controllers/authController.js). I did not verify `updateProfile`.

**Server-side protection**
- All admin writes use `protect, authorize('admin')` or `protect, admin`. See the Q2 table and grep: [productRoutes.js:13,33-35](backend/routes/productRoutes.js), [orderRoutes.js:215,239,289](backend/routes/orderRoutes.js), [discountRoutes.js:44-90](backend/routes/discountRoutes.js), [couponRoutes.js:6,33](backend/routes/couponRoutes.js), [blogRoutes.js:28-49](backend/routes/blogRoutes.js), [userRoutes.js:42-77](backend/routes/userRoutes.js), [reviewRoutes.js:230-265](backend/routes/reviewRoutes.js), [shippingRoutes.js:85](backend/routes/shippingRoutes.js), [settingsRoutes.js:57,63](backend/routes/settingsRoutes.js).
- Unauthenticated non-admin endpoint worth noting: `POST /api/payment/create-order` — [paymentRoutes.js:17](backend/routes/paymentRoutes.js).
- The admin page's fallback that shows the shell when `/auth/me` throws ([admin-panel.html:2088-2095](pages/admin-panel.html)) is UI-only; the API still requires the token.

**Roles**
- `role` is one of `customer | admin | user` — [User.js:42-46](backend/models/User.js). There are no granular roles such as order-only staff or content editor.
- Any admin can promote anyone via `PUT /users/:id/role`, with no UI and no audit — [userRoutes.js:77-94](backend/routes/userRoutes.js).

**Audit trail**
- None for products, orders, users, coupons or blogs.
- Partial traces only: `Setting.updatedBy` ([Setting.js:44](backend/models/Setting.js)) and review `hiddenAt` / `hiddenReason` ([reviewRoutes.js:236-239](backend/routes/reviewRoutes.js)).
- Product delete is a hard delete — [productController.js:101-106](backend/controllers/productController.js).

**Rate limiting**
- Limiters per prefix: auth 50/15 min, public 500, write 100, admin 300, payment 50. All are skipped when `NODE_ENV === 'development'` — [server.js:108-127](backend/server.js).
- The `adminLimiter` is applied only to `/api/users`. Admin product, blog, news, discount, coupon and settings writes fall under `publicLimiter` (500/15 min), and order status under `writeLimiter` — [server.js:135-151](backend/server.js).
- No login lockout beyond the auth limiter. Helmet and CORS are configured — [server.js:48-92](backend/server.js).

### Inferences
- The highest-priority security fix is escaping all customer-supplied fields in the admin panel. A malicious order name like `<img src=x onerror=…>` would run in the admin's session and could exfiltrate the 7-day admin JWT from localStorage.
- Moving to httpOnly cookies, shorter admin token lifetime, a token version for revocation, an AuditLog collection and soft deletes would follow.

### Gaps
- I did not verify Helmet's CSP contents ([server.js:48-62](backend/server.js)). A strict CSP without `unsafe-inline` would blunt the XSS, but the admin page relies on inline scripts and inline handlers, so it is almost certainly permissive.
- I did not check whether `PUT /auth/profile` sanitizes `name`.

## Q6. Minimum backend models and endpoints so the admin controls everything in Q4

### Takeaway
Most of the plumbing exists. The minimum set is:
1. Finish Product (variants, stock, SEO) and migrate the static catalogue.
2. Fix Coupon and wire usage.
3. Complete the in-flight Setting singleton (add GST rate and delivery ETA) and its admin UI.
4. Add one generic Content/Page model for hero, homepage sections, policies, reels and SEO.
5. Add a media-upload endpoint and an AuditLog.
6. Add order-integrity changes: stock decrement, exact variant pricing, and no unknown product ids.

### Cited Findings
**Already present to build on**
- `Product.quantityOptions`, `metaTitle`, `metaDescription`, `benefits`, `howToUse`, `isFeatured` and `slug` in the schema — [Product.js](backend/models/Product.js).
- A 16-product seeder with benefits — [seed-products.js](backend/seeders/seed-products.js).
- Setting singleton with public, admin and save routes — [Setting.js](backend/models/Setting.js), [settingsRoutes.js](backend/routes/settingsRoutes.js), [settings.js](backend/utils/settings.js).
- Settings already feed checkout pricing and COD — [orderRoutes.js:26,321-324](backend/routes/orderRoutes.js), [orderGuard.js:113-116](backend/utils/orderGuard.js).
- Category and Combo models with GET/POST — [categoryRoutes.js](backend/routes/categoryRoutes.js), [comboRoutes.js](backend/routes/comboRoutes.js).
- Discount CRUD — [discountRoutes.js](backend/routes/discountRoutes.js).
- Order stats — [orderRoutes.js:239](backend/routes/orderRoutes.js).
- Shiprocket ship — [shippingRoutes.js:85](backend/routes/shippingRoutes.js).

**Gaps found in code that the minimum set must close**
- Controller whitelist — [productController.js:76-95](backend/controllers/productController.js).
- Inactive products served by id — [productController.js:61-73](backend/controllers/productController.js).
- No stock check or decrement — [orderGuard.js:91-137](backend/utils/orderGuard.js).
- Static ids bypass the price check — [orderGuard.js:96-105](backend/utils/orderGuard.js), [Order.js:5](backend/models/Order.js).
- Coupon create field mismatch and no usage count — [couponRoutes.js:35-39](backend/routes/couponRoutes.js), [Coupon.js:32-47](backend/models/Coupon.js).
- Hard-coded GST — [orderGuard.js:11](backend/utils/orderGuard.js), [settings.js:69](backend/utils/settings.js).
- No admin list for inactive blogs — [blogRoutes.js:7-14](backend/routes/blogRoutes.js).

### Inferences
Proposed minimum set (my synthesis, not existing code):

1. **Product (extend)**
   - Accept `quantityOptions[{label, quantity, unit, price, oldPrice, stock, sku}]`, `benefits`, `nutrients`, `specs`, `howToUse`, `certifications`, `metaTitle`, `metaDescription`, `isFeatured`, `images`, `categoryId`.
   - Add `GET /products/slug/:slug` and `GET /products?ids=`.
   - `GET /products/:id` should 404 for inactive products unless the caller is an admin.
   - Soft delete (`isActive:false` + `deletedAt`) instead of hard delete.
2. **Order guard (change)**
   - Price every line from the DB, using the product plus the chosen `quantityOptions` entry, not the client price.
   - Reject unknown or non-ObjectId product ids once the catalogue is migrated.
   - Check stock and decrement it atomically.
   - Increment `Coupon.usedCount` atomically.
   - Add admin `PUT /orders/:id/payment` (COD collected → `isPaid`), and cancel/refund from the admin.
3. **Coupon (fix)**
   - Align the POST field names with the schema.
   - Add `PUT /coupons/:id`, `DELETE /coupons/:id` (soft) and a `showOnSite` / `bannerText` field so the announcement bar can list live coupons.
   - Enforce applicable products and categories.
   - Decide whether Discount (automatic sale price) stays. If it stays, apply it in both the storefront price and `orderGuard`; otherwise delete the model and routes.
4. **Category (extend)**
   - PUT/DELETE, `slug`, `label`, `sortOrder`, and default size options per category, which would replace `QTY_CFG` and `QUANTITY_CONFIG_P`.
   - Drop the hard enum on `Product.category`.
5. **Setting (finish the in-flight singleton)**
   - Add `tax.gstRate` (or per-category), `shipping.etaDays`, `refund.windowDays`, `brand.tagline` / `about`.
   - Admin UI page, and use these values in checkout labels.
6. **Content / Page (new)**
   - Shape: `{key|slug, type: 'block'|'page', data (JSON), html (sanitized), seo {title, description, ogImage}, isPublished, updatedBy}`.
   - Public `GET /content/:key` and `GET /pages/:slug`; admin `GET/PUT`.
   - Covers the hero slides, homepage sections (mill, gallery, founder, why, home blog strip config), policy pages, video reels and per-page SEO.
7. **Media (new)**
   - `POST /admin/uploads` returning ImageKit-signed upload params or a stored URL, so the admin stops pasting URLs.
8. **AuditLog (new)**
   - Shape: `{actor, action, entity, entityId, before, after, ip, at}`, written by a small helper on every admin write.
   - Apply `adminLimiter` to all admin write routes, or mount them under `/api/admin/*`.
9. **Newsletter (optional)**
   - `POST /newsletter` plus a Subscriber model, since today the form only shows a toast.

**Frontend work the backend set implies**
- Delete the static arrays in index, product, wishlist, account and `js/products-data.js`.
- Fix product.html category keys.
- Escape all fields in the admin panel.
- Fix blog/news edit and define the Discounts and Coupons pages.
- Wire the Dashboard to `/orders/admin/stats` with pagination.

### Gaps
- Effort estimates and the migration strategy for existing numeric-id carts, wishlists and orders (`Order.items.product` already stores numbers for past orders) are not in scope here.
- I did not check whether Netlify edge caching of `/api/*` responses ([netlify.toml](netlify.toml), `Cache-Control: public, max-age=30/60`) would delay admin changes beyond the in-memory cache bust.
