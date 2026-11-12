# Nansei Organics storefront: shopping-flow and account/content-page UX audit (restored "Jul 23" build, HEAD 5771ad1)

Method: I read the source of pages/product.html, checkoutmyorderpage.html, login.html, reset-password.html, wishlist.html, account.html, blog.html, news.html, video-reels.html, js/config.js, js/auth.js, frontend/js/api.js and the backend order guard/routes. I served the repo locally (python http.server, 127.0.0.1:8102) and drove the pages in the built-in browser at 1440x900 and 375x812, using javascript_tool to measure and run the page's own functions. Local test data (dummy cart, a dummy guest address, dummy localStorage orders) stayed in the browser and was cleared afterwards. Nothing was submitted to any server. No project files were changed.
The backend was not running, so API-driven states come from reading the JS and backend code. Those findings are marked "(code-inferred)".
Source links are repo-relative paths with line numbers. "Observed" means I reproduced it in the browser.

**User constraint (relayed by coordinator): "dont change the existing ui".** Every recommendation below is an incremental fix or addition inside the current layout, look, sections and styles. Items tagged **[LOOK CHANGE]** would visibly change the appearance. Treat them as optional and get the user's sign-off first. Untagged items change only behaviour, data or copy, or add an element in the existing style.

---

## 1. Product page (pages/product.html): gallery, variants, price clarity, stock, delivery, trust, reviews, cross-sell, sticky ATC

### Takeaway
The PDP looks rich: gallery, tabs, stories, videos, reviews, three related-product rows, a blog block and a mobile sticky bar. Its buying logic is badly broken, though. Displayed prices and cart prices disagree, one click adds 2 units, a 500 g rice pack enters the cart at ₹90,000, every dried-flower PDP shows prices about 50x too high, Buy Now wipes the cart, and the mobile stepper does nothing. These are behaviour fixes only and need no visual change. There is no delivery or pincode check, no stock indicator and no visible returns/COD/delivery trust block.

### Cited Findings
- **Double add on every click (observed).** `addToCartFn()` pushes the item into localStorage and then calls `Cart.add(cartItem, 0)`. The inline `Cart.add` finds the item it just pushed and adds 1 more. One click gives qty 2 and the badge shows "2". — [product.html:7632-7636](pages/product.html), [product.html:27](pages/product.html)
- **Shown price ≠ cart price (observed).** On load, the 500 g button is pre-selected and the page shows ₹90 (strike ₹110). The cart line is stored as "0.25 kg" at ₹45, because `initQty` sets `currentQtyVal = cfg.options[0]` = 0.25 while the price display uses the first variant. — [product.html:7516-7519](pages/product.html), [product.html:7312](pages/product.html), [product.html:7120-7125](pages/product.html)
- **₹90,000 pack (observed).** If the shopper clicks the "500 g" button, `currentQtyVal = "500g"`. `calcTotalPrice` then computes `parseFloat("500g")` = 500 × ₹180 = **₹90,000** per unit, with label "500g kg". The page still shows ₹90. "1 kg" gives label "1kg kg". — [product.html:7307](pages/product.html), [product.html:7132-7136](pages/product.html), [product.html:7127-7131](pages/product.html)
- **Variant lines merge (observed).** Cart de-duplication is by product id only. Adding 1 kg after 500 g increments the existing (wrong-size) line to qty 4 at ₹45 instead of adding a second line. — [product.html:7633-7634](pages/product.html)
- **Dried-flower PDPs show prices ~50x too high (observed).** Paneer Rose (id 8) shows **₹7500**, strike ₹9500, "You save ₹2000". The variant buttons are hidden for flowers, but `updatePriceFromVariant(p.variants[0])` still runs: variants are `"50","100",…` and the flower base unit is 1, so 150 × 50. The cart receives "1 piece" at ₹150 (×2 because of the double add). The same applies to ids 9, 10 and 11 (Butterfly Pea: 25 × ₹180 = ₹4500). — [product.html:7288](pages/product.html), [product.html:7312](pages/product.html), [product.html:7587-7604](pages/product.html)
- **Unit ambiguity for flowers:** the label switches to "pcs" (`formatVariantLabel`), but the data looks like grams ("50/100/200/500"). Shoppers cannot tell what "1 piece" of dried rose is. — [product.html:7576-7578](pages/product.html)
- **Buy Now overwrites the whole cart** with the single item (`localStorage.setItem('cart', JSON.stringify([cartItem]))`), so items the shopper added earlier are silently lost. — [product.html:7667](pages/product.html)
- **Mobile sticky bar stepper is broken (observed at 375).** Both buttons call `changeFlowerQty()` for every category. After two taps on "+" on rice, the bar still shows "1" (`#mobQtyVal` is never updated), the main price jumps to ₹540 (flower pricing applied to rice), and `itemQty`, which Add to Cart uses, stays 1. — [product.html:4615-4640](pages/product.html), [product.html:7533-7537](pages/product.html)
- **No quantity control for rice/flour on desktop.** `changeItemQty` exists, but there is no `#itemQtyVal` element in the markup. — [product.html:7529-7554](pages/product.html), [product.html:3967-3991](pages/product.html)
- **The sticky ATC does exist on mobile** (`#mobBar` is display:flex at 375 and hidden at 1440). The ATC button sits at about y=764 of an 812px viewport, just above the fold. — observed
- **Fabricated rating distribution (observed):** with 0 reviews ("New"), the bars still read 5★ 0, 4★ 0, **3★ 8, 2★ 4, 1★ 3** because they are hard-coded. The 4★/5★ formulas are also invented (`rating*15`). — [product.html:7408-7412](pages/product.html)
- **Static products get their reviews wiped** (`rating:0, reviews:0, reviewData:[]`) even though the data array holds per-product reviews. The API review fetch only runs for non-numeric ids. — [product.html:7187-7189](pages/product.html), [product.html:7471](pages/product.html)
- **Contradictory social-proof claims in code:** "Loved by 12,000+ Families" and "4.8/5 Customer Rating" (NS_WHY) sit next to a product showing "New". There is also "140+ small-scale farmers" (story copy) versus the newsroom's "200 Farming Families". — [product.html:4891-4897](pages/product.html), [product.html:4729](pages/product.html)
- **The trust block is defined but never rendered:** `NS_TRUST_DATA` (Fast Delivery 2–5 days, UPI·Cards·COD, 7-day returns, NPOP & FSSAI, support hours) targets `#nsTrustGrid`, and `#nsWhyBuy` is missing too. Neither container exists in the DOM (observed `trust:false, why:false`). Shoppers never see delivery, returns or COD information on the PDP. — [product.html:5045-5056](pages/product.html)
- **No pincode/delivery-estimate check and no stock/availability indicator** anywhere on the PDP. A grep for pincode/stock finds nothing user-facing. — [product.html](pages/product.html)
- **Placeholder video IDs:** the "Farm Harvesting / Milling / Lab Testing / Packaging / How to Use" fallback videos all point to YouTube id `dQw4w9WgXcQ`. — [product.html:4431](pages/product.html), [product.html:5136-5141](pages/product.html)
- **The PDP API never loads in production (code-inferred):** product.html sets `window.API_BASE = ''` and doesn't include js/config.js. Every fetch therefore falls back to `'http://localhost:5000/api'` on the live site, so API products, reviews, the review form and "my orders" checks silently fail. Only the 16 hard-coded products ever render. — [product.html:10](pages/product.html), [product.html:7180](pages/product.html), [product.html:8104](pages/product.html), [product.html:8159](pages/product.html)
- **Story bubble labels collide at 375** ("How To CookCertifications" run together). — observed screenshot
- **Small text and targets at 375:** description 12.5px, tab labels 10.9px, flower stepper buttons 30×32px, wishlist button 36×36. — observed measurement
- **Dead footer data on the PDP:** phone `tel:+919999999999` ("+91 99999 99999"), email info@nansaiorganics.com (misspelled versus the "nanseiorg.in" domain in config.js), and "Home/About/Our Farmers/Contact/FAQ/Shipping" all `href="#"`. — [product.html:5682-5750](pages/product.html), [js/config.js:20](js/config.js)
- **Instagram icon missing:** Lucide is loaded as `@latest`, which no longer ships the `instagram` icon. The console logs a "not found" warning for each instance. — observed console; [product.html script tags](pages/product.html)
- **Page length:** 8,527px at 375. The related section alone is 3,212px (three carousels), followed by a 1,352px blog block. — observed

### Inferences
- **P0 (behaviour only):** make the product page price and the cart price come from one function. Use the selected variant's grams/pieces for `currentQtyVal`, de-duplicate on `id + qtyLabel` (wishlist.html already does this, [wishlist.html:701](pages/wishlist.html)), delete the redundant `Cart.add` call, have Buy Now append instead of replacing (or use a separate "buy-now" cart key), wire the mobile stepper to `changeItemQty` for non-flowers and update `#mobQtyVal`, and skip `updatePriceFromVariant` for flowers.
- **P0:** include js/config.js on product.html (or stop overriding API_BASE with '') so the API path is `/api` in production.
- **P1:** render the existing trust rows by adding `<div id="nsTrustGrid">` (and `#nsWhyBuy`) in the slot the code expects. This uses the already-written card style, so it is not a new look, but it adds visible content, so confirm placement with the user. Drop or verify the "12,000+ families / 4.8/5" pill copy.
- **P1:** remove the hard-coded 3★/2★/1★ percentages and show the bars only when reviews > 0. Replace the `dQw4w9WgXcQ` fallbacks with the real reels already in `experience.reels`.
- **P2 (new small element in existing style):** a one-line delivery promise under the price, e.g. "Inclusive of GST? / Dispatch in X days / Free delivery above ₹999". It reuses the `pSavingEl` text style. Checkout adds 5% GST on top of the shown price (see §2), so the PDP must either say "+5% GST" or prices must be GST-inclusive.
- **[LOOK CHANGE] (optional):** a pincode check field under the variant row, and increasing tab/description font to ≥14px on mobile.

### Gaps
- Real API product documents (images, quantityOptions, stock) couldn't be inspected because the backend wasn't running, so the PDP's behaviour for API products (non-numeric ids) is code-inferred.
- Whether "pieces" or "grams" is the correct sellable unit for dried flowers is a business question.

---

## 2. Cart & checkout (pages/checkoutmyorderpage.html): steps, fields, guest vs login, address form, payment options, summary, shipping, errors/loading

### Takeaway
**The checkout page cannot be used as shipped:** its main script fails to parse, so the cart shows nothing, totals are ₹0, and no button works. My Orders lives in the same script, so it is dead too. When I patched the two syntax errors in memory to inspect the rest, I found a reasonable 3-step design (Cart & Address → Order Summary → Payment; Razorpay with UPI/cards/netbanking/EMI plus COD; Indian mobile/PIN validation with PIN-to-city/state autofill). Underneath it are blocking defects: forced login at the very last step, a pincode that is always sent as "000000" (so the backend rejects every order), GST added on top of the shown prices, a corrupted "₹", and no quantity stepper in the cart.

### Cited Findings
- **Fatal parse error (observed on load):** console shows `Uncaught SyntaxError: Identifier 'reviewBtns' has already been declared`. `renderCartStep`, `goToPayment` and `toggleNewAddr` are all `undefined`. With 3 items in localStorage, the page showed "0 items · ₹0", no cart lines and no empty state. — [checkoutmyorderpage.html:2141](pages/checkoutmyorderpage.html) (`let actions = '', reviewBtns = ''`) and [checkoutmyorderpage.html:2144](pages/checkoutmyorderpage.html) (`let reviewBtns = ''`)
- **A second syntax error is hidden behind the first:** a missing comma after `products: (...).map(...)` before `timeline: [` in `renderOrders`. — [checkoutmyorderpage.html:2108-2109](pages/checkoutmyorderpage.html)
- The duplicate `let` exists in the restored Jul 23 commit 7dd5d70 and in HEAD 5771ad1, but not in 479b6a4 (the October redesign). The restore re-introduced it. — `git show <sha>:pages/checkoutmyorderpage.html`
- **Steps:** step 1 Cart & Address, step 2 Order Summary, step 3 Payment. There is a progress bar and step circles. On mobile the step labels are hidden (only the numbers 1-2-3 show). — [checkoutmyorderpage.html:526](pages/checkoutmyorderpage.html), [checkoutmyorderpage.html:649](pages/checkoutmyorderpage.html), [checkoutmyorderpage.html:692](pages/checkoutmyorderpage.html); observed
- **Forced login at the last moment:** guests can fill the cart and address, reach Payment, and only then on "Pay Now" get "Please login to place an order" and a redirect to `login.html` after 1.2 s. No return URL is passed, and login always sends the user to index.html (§4). — [checkoutmyorderpage.html:1767](pages/checkoutmyorderpage.html), [login.html:600-601](pages/login.html)
- The backend allows guests to *create a Razorpay order* (`optionalAuth`) but persists orders only for signed-in users. POST /orders is `protect`. — [backend/routes/orderRoutes.js:111-114](backend/routes/orderRoutes.js), [orderRoutes.js:170](backend/routes/orderRoutes.js), [orderRoutes.js:332](backend/routes/orderRoutes.js)
- **Address form (good):** name (3–50 letters), mobile `^[6-9]\d{9}$` with a "+91" prefix, PIN `^[1-9]\d{5}$` with a debounced lookup to api.postalpincode.in that fills City and a read-only State, Home/Work/Other chips, and inline errors with scroll-to-first-error. — [checkoutmyorderpage.html:1589-1653](pages/checkoutmyorderpage.html), [checkoutmyorderpage.html:1660-1700](pages/checkoutmyorderpage.html)
- **Address form gaps:** no email field (none is sent to Razorpay prefill, `email: ''`). PIN is `type="text"` without `inputmode="numeric"`, so phones show the full keyboard. All inputs are 14px, which makes iOS Safari zoom on focus. If the PIN API is unreachable, the catch clears the PIN error but leaves State empty, and Save then fails with "Enter a valid PIN code to auto-fill state". — [checkoutmyorderpage.html:576-633](pages/checkoutmyorderpage.html), [checkoutmyorderpage.html:1650](pages/checkoutmyorderpage.html), [checkoutmyorderpage.html:1665-1668](pages/checkoutmyorderpage.html), [checkoutmyorderpage.html:1829](pages/checkoutmyorderpage.html); observed font-size 14px
- **Pincode always "000000" and state always "Tamil Nadu" in order payloads (code-inferred):** the saved address line is `addr1,\nCity  600001` (two spaces), but the parser regex requires a hyphen (`/^(.+?)\s*[-]\s*(\d{6})$/`), so `pincode = '000000'` and `city = "Chennai  600001"`. `state` is hard-coded `'Tamil Nadu'`. The backend's `cleanAddress` rejects `000000` ("Please enter a valid 6-digit pincode"), so every order POST fails. — [checkoutmyorderpage.html:1682](pages/checkoutmyorderpage.html), [checkoutmyorderpage.html:1880-1888](pages/checkoutmyorderpage.html), [checkoutmyorderpage.html:1943-1952](pages/checkoutmyorderpage.html), [backend/utils/orderGuard.js cleanAddress](backend/utils/orderGuard.js)
- **Phone fallback '9999999999'** is sent if parsing fails. — [checkoutmyorderpage.html:1777](pages/checkoutmyorderpage.html), [checkoutmyorderpage.html:1946](pages/checkoutmyorderpage.html)
- **Cart step has no quantity stepper:** each line has only a size `<select>` (0.25/0.5/1/2/5 kg or 1/5/10/25 pcs) and REMOVE. `cartQty()` exists, but nothing renders `#cq-i`. Size options don't match the PDP variants (500g/1kg/2kg/5kg). — [checkoutmyorderpage.html:1320-1351](pages/checkoutmyorderpage.html), [checkoutmyorderpage.html:1357-1365](pages/checkoutmyorderpage.html); observed
- **Price surprise:** the summary adds **GST 5% on top** of the prices shown on the PDP and cart (₹480 of goods → ₹504). In Step 2 "Price details" the GST row is missing, so it reads Subtotal ₹480, Discount −₹120, Delivery FREE, Total ₹504, which doesn't add up on screen. — [checkoutmyorderpage.html:1391-1397](pages/checkoutmyorderpage.html), [checkoutmyorderpage.html:1501-1507](pages/checkoutmyorderpage.html); observed
- **Shipping messaging conflicts:** every cart line says "Free Delivery", while the trust pill says "Free delivery on orders above ₹999". `deliveryCost` is always 0 on the client, whereas the backend computes shipping with `FREE_SHIPPING_ABOVE` (999) and `SHIPPING_FEE`. — [checkoutmyorderpage.html:1345](pages/checkoutmyorderpage.html), [checkoutmyorderpage.html:945](pages/checkoutmyorderpage.html), [checkoutmyorderpage.html:1203](pages/checkoutmyorderpage.html), [backend/utils/orderGuard.js:9-10](backend/utils/orderGuard.js)
- **Corrupted rupee sign (observed):** the pay buttons read "Pay Now ?504" on both the desktop and mobile sticky bar. The source has literal `'Pay Now ?'`. The name-error copy has "3�50 letters". — [checkoutmyorderpage.html:1430-1432](pages/checkoutmyorderpage.html), [checkoutmyorderpage.html:1727-1729](pages/checkoutmyorderpage.html), [checkoutmyorderpage.html:1590](pages/checkoutmyorderpage.html)
- **Payment options shown:** Razorpay ("RECOMMENDED": UPI, VISA, Mastercard, RuPay, GPay, PhonePe, Net Banking, EMI) and Cash on Delivery ("No extra charges"). Billing address can be "Same as shipping" or different. At 375 the "RECOMMENDED" badge overlaps "Razorpay Secure". — observed
- **Payment integrity / false-success paths (code-inferred):** (a) the Razorpay `handler` ignores a failed signature verification and still runs the "processing" overlay, which places the order. (b) If `new Razorpay()` throws, the code says "Simulate success for demo" and places the order as paid. (c) `_doPlaceOrder` sends `isPaid:true` and a fabricated `paymentInfo.id = 'PAY'+Date.now()`. — [checkoutmyorderpage.html:1907-1913](pages/checkoutmyorderpage.html), [checkoutmyorderpage.html:1862-1868](pages/checkoutmyorderpage.html), [checkoutmyorderpage.html:1954-1956](pages/checkoutmyorderpage.html)
- **Front-end/back-end mismatch after a successful online payment (code-inferred):** the verify endpoint already creates the order for signed-in users. The page then POSTs /orders again with paymentMethod "Razorpay", which the current backend refuses (`codOnly` throws for anything but COD). The failure falls into `_saveLocalOrder`, which references `isCod`, a variable local to `_doPlaceOrder`. That throws a ReferenceError (reproduced in-browser), so the success overlay never appears and the cart isn't cleared, even though the customer has paid. — [backend/routes/orderRoutes.js:334](backend/routes/orderRoutes.js), [backend/tests/orders.test.js:70-71](backend/tests/orders.test.js), [checkoutmyorderpage.html:1969-1971](pages/checkoutmyorderpage.html), [checkoutmyorderpage.html:1994](pages/checkoutmyorderpage.html)
- **Loading states:** the Pay button shows a spinner ("Opening Gateway..."). There is a fixed 2.8 s fake "Processing / Confirming your order" overlay, not tied to the API. Errors are toasts only, e.g. "Could not connect to payment server. Is the backend running?", which is developer wording. — [checkoutmyorderpage.html:1780](pages/checkoutmyorderpage.html), [checkoutmyorderpage.html:1814](pages/checkoutmyorderpage.html), [checkoutmyorderpage.html:1916-1927](pages/checkoutmyorderpage.html)
- **Dead PayU branch** (duplicated twice) and a "PayU Money" label, even though only Razorpay and COD are offered. — [checkoutmyorderpage.html:1782-1796](pages/checkoutmyorderpage.html)
- **"Terms & Conditions" and "Privacy Policy" in the pay footer are `<span>`s, not links,** and the policy pages don't exist (§7). — [checkoutmyorderpage.html:908-909](pages/checkoutmyorderpage.html)
- **Checkout header has only logo, Checkout, Orders and Wishlist.** There is no "continue shopping" or back-to-product affordance besides the logo. — observed `links: index.html, wishlist.html`
- **Off-palette colours in the cart:** REMOVE in Flipkart blue `#2874f0`, "Free Delivery" in `#388e3c`, a bright-yellow mobile "Pay Now" sticky bar, and confetti that includes blues. — [checkoutmyorderpage.html:1351](pages/checkoutmyorderpage.html), [checkoutmyorderpage.html:1345](pages/checkoutmyorderpage.html), [checkoutmyorderpage.html:2005](pages/checkoutmyorderpage.html); observed
- **Mobile layout (patched build, 375):** no horizontal overflow (scrollWidth 375). Order Summary starts at y≈1663, below "Continue" (y≈1586), so it sits under the fold. The sticky pay bar shows on step 3. — observed

### Inferences
- **P0 (no visual change):** fix the two syntax errors. One hotfix revives cart, checkout and My Orders.
- **P0:** store `pincode`, `city` and `state` as separate fields on the address object instead of re-parsing `line`, and send the real state.
- **P0:** remove the "simulate success" and ignore-failed-verification paths. After a successful verify that returns `data`, show the success overlay from that response and skip the second POST /orders.
- **P0:** move `isCod` into `_saveLocalOrder`, or pass it in as a parameter.
- **P0:** replace the hard-coded "Pay Now ?" with "₹" (the `&#8377;`/`₹` already used elsewhere on the page).
- **P1:** ask for login *before* step 1 (or right after the cart), not at Pay. Pass `?redirect=checkoutmyorderpage.html` and have login honour it. The backend already supports guest Razorpay order creation, so true guest checkout would need a backend change.
- **P1:** add a GST row to step 2 and use the same "Free delivery above ₹999" rule everywhere. Drop the per-line "Free Delivery" text, or compute it from the threshold.
- **P1:** add `inputmode="numeric"` to the PIN and mobile fields, and make State editable when the PIN API fails.
- **P1:** turn the Terms/Privacy spans into links once the policy pages exist.
- **P2 (new element in existing style):** a −/qty/+ stepper beside the size select, reusing `cartQty()`, plus an email field.
- **[LOOK CHANGE] (optional):** recolour REMOVE, Free Delivery and the yellow sticky pay bar to forest/gold tokens (this restores the brand palette, but it is visible). Use 16px inputs on mobile to stop iOS zoom (slightly larger text).

### Gaps
- End-to-end Razorpay, COD and API order creation couldn't be exercised: no backend, and no real submissions per the constraints. Everything about server responses is code-inferred from backend/routes/orderRoutes.js and backend/utils/orderGuard.js.
- Whether the backend accepts static numeric product ids for pricing (`findProducts` filters to valid ObjectIds) and therefore lets a ₹90,000 line price through wasn't tested.

---

## 3. Order confirmation & My Orders (same page, `showPage('orders')`; plus account.html orders view)

### Takeaway
The confirmation overlay (order id, ETA date, confetti, "Share on WhatsApp", "View orders") and the My Orders cards (status badge, 4-step progress bar, ETA, Invoice/Cancel/Track/Buy Again/Review) are well conceived. Most of the actions are local-only or crash for signed-in users, and some of them show false success messages.

### Cited Findings
- **The whole Orders view is dead today** because of the same parse error (§2). — observed
- **The WhatsApp "receipt" is built after the cart is cleared:** items show "(items cleared after order)" and Subtotal/GST/Total all compute to Rs.0. It also opens WhatsApp to the *customer's own* number. — [checkoutmyorderpage.html:1977](pages/checkoutmyorderpage.html), [checkoutmyorderpage.html:2030-2075](pages/checkoutmyorderpage.html)
- **Confirmation ETA is invented on the client** (+5 days, or +2 for "express"), regardless of the backend/Shiprocket. — [checkoutmyorderpage.html:1933-1934](pages/checkoutmyorderpage.html)
- **For signed-in users** the page deletes local orders and renders API orders, but Track, Copy tracking, Invoice and Buy Again all look up `getOrders()` (localStorage), so they hit `undefined` and throw. — [checkoutmyorderpage.html:1269](pages/checkoutmyorderpage.html), [checkoutmyorderpage.html:2193-2215](pages/checkoutmyorderpage.html), [checkoutmyorderpage.html:2366-2367](pages/checkoutmyorderpage.html), [checkoutmyorderpage.html:2386-2387](pages/checkoutmyorderpage.html)
- **Cancel only edits localStorage** and toasts "Order cancelled. Refund within 5-7 business days.", although the backend has `PUT /api/orders/:id/cancel`. **Return** posts nothing and toasts "Return request submitted. We'll contact you within 24h." — [checkoutmyorderpage.html:2354-2365](pages/checkoutmyorderpage.html), [checkoutmyorderpage.html:2381-2385](pages/checkoutmyorderpage.html), [backend/routes/orderRoutes.js PUT /:id/cancel](backend/routes/orderRoutes.js)
- **Mobile (375, patched):** the yellow "Pay Now ?504" sticky bar stays on screen over My Orders. Progress labels run together ("OrderedPackedShippedDelivered"). The card says "Quantity: 1 kg ₹180 each", where ₹180 is the line price, not a per-unit price. — observed screenshot; [checkoutmyorderpage.html:2177-2181](pages/checkoutmyorderpage.html)
- **Empty state exists** ("No orders yet"), with a count label "No orders placed yet". — [checkoutmyorderpage.html:994](pages/checkoutmyorderpage.html), [checkoutmyorderpage.html:2132](pages/checkoutmyorderpage.html)
- **Duplicate orders UI:** account.html has its own orders list (`loadOrders`, `renderOrders`) with different card markup and a dead `via.placeholder.com` image fallback. — [account.html:1154-1175](pages/account.html), [account.html:1247](pages/account.html)
- The backend offers **guest tracking** (`POST /api/shipping/lookup`, order no. + mobile), but no page in this build calls it. — [backend/routes/shippingRoutes.js:10](backend/routes/shippingRoutes.js)

### Inferences
- **P0:** once the parse error is fixed, make Track, Invoice and Buy Again read from the rendered list (API orders) rather than `getOrders()`. Call the existing cancel endpoint. Return should either post to a real endpoint or open WhatsApp/email with the order id prefilled; it should never show a fake success toast.
- **P1:** build the WhatsApp text before clearing the cart (snapshot `cart` and totals). Hide `#stickyPayWrap` in `showPage('orders')`. Change "₹180 each" to "₹180".
- **P2:** link the PDP footer's "Track Order" to a guest lookup using the existing endpoint. Point account.html "Your Orders" at the single checkout My Orders view to avoid two different implementations.

### Gaps
- Real API order documents (status values, trackingNumber, Shiprocket fields) weren't available to see how they render.

---

## 4. Login / registration / reset password (pages/login.html, reset-password.html)

### Takeaway
A clean two-tab email + password form with inline validation, a strength meter and show/hide password. The friction points: no way back to the store, no return-to-origin redirect, "Forgot Password" is a developer placeholder, and there is no phone/OTP or Google option, even though a Google client id is configured.

### Cited Findings
- Tabs Login/Register. Fields: login has email + password; register has first name, last name, email, password (min 8, strength bar), and confirm. Inline errors appear per field and clear on input. — [login.html:407-488](pages/login.html), [login.html:548-570](pages/login.html), [login.html:637-643](pages/login.html)
- **"Forgot Password" toast text (observed):** "Forgot Password placeholder - reset email flow is ready for backend email delivery". reset-password.html exists and works with a `?token=` link, but nothing sends that link. — [login.html:625-634](pages/login.html), [reset-password.html:44-61](pages/reset-password.html)
- **No return redirect:** after login or registration, users always go to `index.html` (admins to admin-panel). Checkout's and the wishlist's redirects to login lose context. — [login.html:600-601](pages/login.html), [login.html:621-622](pages/login.html)
- **No link back to the shop:** the page has exactly one `<a>` (Forgot Password), and the logo isn't a link (observed at 1440 and 375).
- **No OTP / phone login and no Google sign-in button,** although `window.GOOGLE_CLIENT_ID` is set. — [login.html:14](pages/login.html), [js/config.js:24](js/config.js)
- Different font stack from the other pages (DM Sans versus Inter/Roboto elsewhere). — [login.html:48](pages/login.html)

### Inferences
- **P0:** replace the placeholder toast with a real call (the backend has auth routes; check for a forgot-password endpoint), or with honest copy such as "WhatsApp/email us to reset".
- **P1:** support `?redirect=` (validated as same-origin relative) and pass it from checkout, wishlist and account guards. Wrap the existing logo in `<a href="index.html">`; this adds no visual change.
- **[LOOK CHANGE] (optional):** a "Continue with Google" or "Login with OTP" button would add a new element to the card.

### Gaps
- I did not check whether backend/routes/authRoutes.js already implements forgot-password email sending.

---

## 5. Wishlist & account (pages/wishlist.html, account.html)

### Takeaway
Guests can heart items on the PDP (stored locally, badge counts them), but wishlist.html bounces guests to login and then drops them on the homepage. The wishlist renders from its *own* hard-coded catalogue with Unsplash stock photos and 4.7★ (142) style ratings, which contradicts the PDP ("New", real product images). Account is a tidy card hub, but several of its promises (Refer & Earn, footer links) are hollow.

### Cited Findings
- **The wishlist requires login** (`Auth.requireAuth('login.html')`), while the PDP heart works for guests. — [wishlist.html:958](pages/wishlist.html), [product.html:33-35](pages/product.html)
- **Separate product data:** a 16-item array with different names ("Karuppu Kavuni Rice" versus "Karuppu Kavuni (Black Kavuni Rice)", "Organic Rose Milk" versus "Organic Real Rose Milk"), Unsplash images instead of the ImageKit product photos, and ratings/reviews that the PDP hides. Observed card: a generic rice photo showing "4.7 (142)". — [wishlist.html:555-570](pages/wishlist.html); observed
- **Its cart logic is better than the PDP's:** it de-duplicates on `id + qtyLabel`. However, it omits `oldPrice`, so discount/strike-through is lost in checkout. — [wishlist.html:697-703](pages/wishlist.html)
- **Mobile bottom nav differs per page:** the wishlist shows Home / Blog / News / **Farm** (farm.html doesn't exist), while account shows Home / Shop / Cart / Wishlist / Account. — [wishlist.html:523-541](pages/wishlist.html); observed
- **Empty state exists** ("Your wishlist is empty") along with a recommendations rail. — [wishlist.html:464-466](pages/wishlist.html), [wishlist.html:849](pages/wishlist.html)
- **Account hub cards:** Your Orders ("View all 0 orders"), Login & Security, Addresses, Wishlist ("2 saved items"), Profile, **Refer & Earn: "earn ₹100 store credits per referral", code "NSI-TESTUS"**, and Customer Service. No referral logic exists in backend/ (grep "referr" finds no matches). — observed; backend grep
- **Profile save** writes to localStorage and toasts "Profile saved!" even if the API PUT fails (the error is swallowed). — [account.html:1086-1094](pages/account.html)
- **Account footer:** About Us, Contact, FAQ, Returns Policy, Shipping Info, Track Order and the social icons are all `href="#"`. — observed link dump
- **Account requires auth.** With the backend down, `requireAuth → refreshUser().catch → clearSession` would log users out whenever the API errors (code-inferred; Render cold starts could trigger this). — [account.html:1576](pages/account.html), [login.html:39](pages/login.html)

### Inferences
- **P1:** let guests view the wishlist from localStorage (remove the hard requirement, or show the list with a "log in to sync" note in the existing toast/banner style). Render wishlist cards from the same catalogue/images as the PDP.
- **P1:** hide Refer & Earn until it is real (remove the card or show "coming soon"). Make the profile save show an error on API failure.
- **P2:** align the wishlist bottom nav entries with the account page's (Home/Shop/Cart/Wishlist/Account). Same component, different links.

### Gaps
- Wishlist server sync (`WishlistAPI`) and the merge-on-login behaviour weren't tested (no backend).

---

## 6. Blog, news, video reels: commerce role, freshness, consistency

### Takeaway
Blog and news are polished and on-brand (Cormorant headings, forest hero), but they don't sell. No article links to its product page, and content is dated Jan–Apr 2026 (7+ months stale as of Nov 2026). Newsroom claims are bold and unverified. video-reels.html is an unlinked developer demo playing stock sample videos.

### Cited Findings
- **Blog:** 20 dated articles (Jan 8 – Mar 12, 2026), mostly one per product (Karunguruvai, Kavuni, Poongar…). CTAs go to `index.html#products`, not `product.html?id=N`. — [blog.html](pages/blog.html) (date strings), [blog.html:994-1143](pages/blog.html); observed nav
- **News:** fetches `API + '/news'` and silently falls back to hard-coded items dated Jan 10 – Apr 5, 2026. Headlines include "Nansai Achieves USDA Organic Certification — A 22-Year Journey", "Nansai Wins 'Best Organic Brand' at India Agri Excellence Awards" and "200 Farming Families". These conflict with the PDP's "NPOP & FSSAI" / "140+ farmers" and with the memory note that about-page stats come from old copy. — [news.html:1206-1230](pages/news.html); observed ticker text
- **video-reels.html:** `<title>Video Reels Component</title>`, not linked from any page, and plays `w3schools.com/html/mov_bbb.mp4` (Big Buck Bunny) and other sample clips captioned "Fresh organic greens, straight from the farm". — [video-reels.html:6](pages/video-reels.html), [video-reels.html:325-340](pages/video-reels.html); observed screenshot
- The PDP already has a product-matched "Learn About This Product" blog block and blog modal. That is the one place where content and commerce connect. — [product.html:5629-5673](pages/product.html)
- Blog and news headers differ from the PDP header (Home | Shop | Our Promise | Blogs | News | About | MY ORDERS versus the PDP's search bar + icons). — observed

### Inferences
- **P1 (copy/links only):** in each product article, change the CTA href to the matching `product.html?id=N` and add a "Shop this rice" link in the existing button style.
- **P1:** get every newsroom claim (USDA, award, family counts) verified before keeping it; unverifiable claims are a trust and legal liability.
- **P1:** delete or `noindex` video-reels.html, or replace the sample sources with the real ImageKit reels already used on the PDP (`experience.reels`).
- **P2:** set a publishing cadence, or hide dates, so content doesn't look abandoned.

### Gaps
- I did not check whether the backend /news and /blogs collections hold newer content than the fallbacks.

---

## 7. Cross-page consistency, broken links, dead pages

### Takeaway
Each page is a self-contained monolith (product.html is 8,330 lines and 400 KB) with its own header, footer, bottom nav, catalogue copy, cart helpers and fonts. That is why the same flow behaves differently from page to page. Several footer and policy links 404, and the brand name is spelled four ways.

### Cited Findings
- **Missing pages linked from the UI:** `privacy-policy.html`, `refund-policy.html` and `terms-and-conditions.html` (linked from product.html and index.html, and routed in netlify.toml), plus `farm.html` (linked from blog, news, index and wishlist). None of these exist in pages/. — link scan; [netlify.toml](netlify.toml)
- **Many `href="#"` placeholders** in the PDP and account footers (About, Contact, FAQ, Shipping, social). — observed
- **Brand spelled four ways:** page titles use "Product NANSAI", "Karunguruvai Rice | NANSAI", "Wishlist — Nansai Organics", "NANSEI Organics Checkout", "Nansei Organics - Authentication"; the footer email uses "nansaiorganics.com" while the site domain is "nanseiorg.in". — observed titles; [product.html:7](pages/product.html), [js/config.js:20](js/config.js)
- **Tailwind via the CDN** (`cdn.tailwindcss.com`, which logs "should not be used in production") on product, checkout, wishlist, account and news. Blog, login and video-reels use custom CSS only. **Lucide `@latest` is unpinned on 8 pages**, which has already broken the Instagram icon. — script-tag scan; observed console
- **Different font stacks:** product uses Inter/Roboto/Cormorant, checkout Inter/Cormorant/DM Mono, login DM Sans/Cormorant. — [product.html:52-54](pages/product.html), [login.html:48](pages/login.html)
- **Different footers:** the PDP footer is `bg-gray-900` (gray, not forest), checkout has a minimal trust footer, login has none, and account uses another variant. — [product.html:5682](pages/product.html); observed
- **Corrupted ₹ on index too:** "Free Delivery on Orders Above ?999" and "Free above ?999". — [index.html:1136](pages/index.html), [index.html:2677](pages/index.html)
- **Three separate cart implementations** with different item shapes and de-dup rules (PDP inline `Cart`, wishlist `confirmWishCart`, checkout `buyAgain`), plus frontend/js/cart.js, which these pages don't load. — [product.html:26-31](pages/product.html), [wishlist.html:697](pages/wishlist.html), [checkoutmyorderpage.html:2386](pages/checkoutmyorderpage.html)
- **Inconsistent API base:** checkout, wishlist and account load js/config.js (`/api` in production), product.html hard-sets `''` and falls back to localhost. — [js/config.js](js/config.js), [product.html:10](pages/product.html)
- **Unrelated stock-photo fallbacks** for missing images (dirt-hands soil photo on cart lines). — [checkoutmyorderpage.html:1335](pages/checkoutmyorderpage.html); observed

### Inferences
- **P0:** create the three policy pages. They are legally expected for Indian e-commerce and payment-gateway onboarding (general knowledge, not verified here), and the checkout footer references them. Also create or remove farm.html.
- **P1:** use one brand spelling in titles and copy, and swap every "?" for "₹" (index and checkout).
- **P1:** pin Lucide to an exact version that still includes `instagram`, or replace that icon with an inline SVG. This restores the missing icon, so it does not change the design.
- **P2:** extract one shared cart helper (id + variant key, a single price function) and include it on product, wishlist and checkout. This is invisible to users and removes the root cause of §1's bugs.
- **[LOOK CHANGE] (optional):** unify the footer (forest instead of gray-900 on the PDP), the bottom nav and the font stacks. These are visible, so ask first.
- Replacing the Tailwind CDN with a compiled build is a performance and reliability fix that should look identical if the config is preserved, but it should be verified visually.

### Gaps
- index.html (home/shop listing) was outside my scope beyond link and "?999" checks. Its add-to-cart path may share the PDP's price/de-dup bugs and should be checked by whoever covers the home page.
- I did not measure performance (LCP, payload) or run a formal accessibility audit. Font sizes and tap targets were spot-measured only.
