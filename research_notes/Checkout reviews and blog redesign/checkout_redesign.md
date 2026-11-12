# Checkout redesign brief: pages/checkoutmyorderpage.html (Nansei Organics)

Scope note. The code audit was done on the working tree on 2026-11-12. The file changed while this research was running: another agent replaced the page's own navbar and `#111827` footer with the shared `js/site-shell.js` header and footer (`checkoutmyorderpage.html:482`, `:1150`). All line numbers below refer to the 2,398-line snapshot taken at 20:27 IST. Re-check them before editing. The page was viewed at http://127.0.0.1:8111/pages/checkoutmyorderpage.html at 1440 px and 375 px, with three test cart lines (2 × 0.5 kg rice at ₹90 with MRP ₹120, 1 L groundnut oil at ₹320 with MRP ₹380, 1 dried rose at ₹150) and one saved guest address. The backend was not running, so payment and order calls were read from the code, not exercised. Prior research is not repeated here (Baymard abandonment reasons, RBI UPI share, ClickPost COD RTO). See `reports/Nansei storefront UI improvements.md` and `research_notes/Nansei storefront UI improvements/`.

## Q1. What exactly is wrong with the current checkout UI?

### Takeaway
The checkout spreads about one screen of decisions over three steps. Step 2 repeats the sidebar word for word, and the payment step carries a "gateway" picker, a billing-address block whose data is never used, and four rows of security badges. Its price table doesn't add up on screen. Visually it mixes Amazon yellow, Flipkart blue, mint, emoji and gradients with the forest/gold/cream palette, so it looks pieced together from other stores, not like Nansei.

### Cited Findings
**Steps and flow**
- There are three steps: "Cart & Address", "Order Summary", "Payment" ([checkoutmyorderpage.html:490-497](pages/checkoutmyorderpage.html)). Step 2 (`:630-671`) shows only the items, the address and price rows. All of these already sit in the sticky right sidebar (`:900-935`), so step 2 adds a click and no information.
- Step 1 mixes cart editing with address entry. The CTA "Continue to Order Summary" sits below both (`:624`). The CTA on step 2 is "Proceed to Payment" (`:667`).
- The browser Back button is not handled. Steps are shown and hidden with `style.display` in `goStep()`, with no `history.pushState`, so Back leaves the checkout. This was observed in the code, and the function is near `:1440`.
- Login is checked only when Pay is pressed: `if (!_getTok()) … location = 'login.html?next=checkoutmyorderpage.html'` (`:1740`). A guest's address is saved under the key `nansai_addresses_guest`. After login, `_getAddrKey()` switches to `nansai_addresses_<userId>` (`:1213-1216`), so the address the guest just typed is no longer offered. This is inferred from the code and was not run against a live login.
- COD shows a fake "Processing Payment… Secured by Razorpay 256-bit encryption" overlay. It holds the shopper for a fixed 2.8 s before the order is even sent (`:430-442`, `:1901-1911`).

**Fields and cart lines**
- The new-address form has 7 inputs plus a 3-button Home/Work/Other picker: name, mobile, PIN, flat/house, area (optional), city, and State, which is read-only (`:540-620`, State `:614`). The PIN lookup already fills city and state from api.postalpincode.in (`coPinLookup`, `:1602-1626`). That is good, but State cannot be edited if the API fails.
- Inputs render at 14.08 px on mobile (measured), which is below the 16 px that stops iOS Safari from zooming on focus.
- There is no email field, and the Razorpay prefill sends `email: ''` (`:1792-1796`). The backend address schema accepts `email` (`backend/utils/orderGuard.js:45-47`).
- The billing address block (`:775-813`) adds a second radio group and a 5-field form (`bFName`, `bLName`, `bAddr`, `bCity`, `bPin`, `:805-809`). `selectedBilling` is never sent in any order payload, so the block does nothing.
- Cart lines have no quantity control. `cartQty()` exists (`:1330`) but is never called. Instead, each line has a pack-size `<select>` (0.25/0.5/1/2/5 kg, `:1303`) that re-prices the line on the client (`cartChangeSize`, `:1339`). With qty 2 × 0.5 kg the line reads "₹180 / 0.5 kg" and the "2" appears nowhere (observed).
- Every line reads "Free Delivery" (`:1318`) while the sidebar says free delivery applies only above ₹999 (`:926`). "REMOVE" is styled in Flipkart blue `#2874f0` (`:1324`) and the discount flag in `#ff6161` (`:1309`).
- No coupon input exists. `couponDisc` is declared but never set (`:1175`). The backend accepts `couponCode` and re-prices with it (`orderGuard.js:92-96`), and `POST /api/coupons/validate` exists for signed-in users (`backend/routes/couponRoutes.js:16-31`).

**Price summary**
- The sum does not add up on screen. "Subtotal" is already the selling price (`sub = Σ price × qty`). "Discount" is MRP minus price, shown as a minus row, and GST is added on top (`calcTotal`, `:1364-1370`). With the test cart the sidebar showed Subtotal ₹650, Discount −₹120, Delivery FREE, GST (5%) ₹33, Total ₹683. That is 650 − 120 + 33 = 563, not 683 (observed at 1440 px). Step 2 also omits the GST row while showing the same ₹683 total (`:652-663`).
- `deliveryCost` is hard-coded to 0 and never set (`:1175`). The server charges `SHIPPING_FEE` below `FREE_SHIPPING_ABOVE` (default ₹999) and rejects any order whose total differs by more than ₹1.5 (`orderGuard.js:9-10`, `:71`, `:97-101`). `SHIPPING_FEE` defaults to 0, so nothing breaks today. The day the owner sets a delivery fee, every order under ₹999 will fail with "The order total does not match".
- The total appears four times on the payment step at desktop: in the sidebar, in the "Amount Payable" box (`:841-856`), on the button "Pay Now ₹683", and in the mobile collapsible (`:817-839`).

**Payment section**
- It is framed as "Payment Gateway — Choose your preferred payment provider" (`:694`). That is developer language, since the shopper chooses a way to pay, not a provider. Razorpay gets a made-up blue `#2563eb` logo tile, a "Recommended" pill (`:150`) and a paragraph about being "redirected" (`:700-715`).
- A row of hand-drawn text "logos" sits under it: UPI on a purple gradient, VISA, a CSS Mastercard, RuPay on an orange gradient, G Pay, PhonePe, Net Banking, EMI (`:718-745`). None is a real brand mark, and all are off-palette.
- The COD card says "No extra charges" (`:761`).
- Security claims are repeated at least six times: "256-bit SSL encrypted · PCI-DSS Level 1 Compliant" (`:742`), "SSL Secured" (`:850`), a strip with "256-bit SSL · PCI DSS Level 1 · RBI Compliant · Instant Confirmation" (`:868-884`), a lock line in the overlay (`:441`), the sticky bar (`:947`), and the sidebar's "100% secure encrypted checkout" (`:925`). "Buyer Protected", "FSSAI Certified" and "100% Organic" tiles are drawn with emoji (`:929-931`).
- "Terms & Conditions" and "Privacy Policy" are `<span>`s, not links (`:889-890`). The policy pages now exist as `pages/terms-and-conditions.html` and `pages/privacy-policy.html` (untracked).
- The Pay button is Amazon's `#FFD814` with an `#FFA41C` border (`:165-176`). This is the only yellow on the site.

**Mobile (375 px)**
- The summary sidebar falls below the left column. On step 1 the total first appears about 1,150 px down the page, below the Continue button (measured `rightCol` top = 1152 px, page 2,348 px).
- On step 3 the summary appears twice, as the collapsible "Order Summary ₹683" and the full sidebar again below it. The page is 2,888 px tall (measured).
- The sticky pay bar exists only on step 3 (`applyLayout`, `:1183-1200`).
- Step labels are hidden below 480 px, so the stepper is three bare numbered circles (`:329-332`; observed).
- The stepper is sticky at `top:68px` on desktop and `top:56px` on mobile (`:70`, `:298`). These values were set for the old in-page nav.
- **Re-check with the new shared header** (`js/site-shell.js`, loaded at `:482` with `data-bottom-bar="off"`; viewed about 20:35 IST):
  - At 375 px the shell header is 58 px and sticky, so the stepper (sticky at 56 px) overlaps it by 2 px. The shell also adds a full-width "Search products…" bar and account, wishlist, cart and menu icons above the stepper. The summary now starts 1,215 px down a 2,803 px page. There is no horizontal scroll.
  - At 1440 px the 68 px shell header brings the full store nav into checkout: Shop, Farm, Our Promise, Blog, News, a search box, My Orders and Sign in. The 88 px stepper sticks under it, so about 170 px of every viewport is navigation chrome (observed). The redesign should use a reduced checkout header (logo plus "Secure checkout") or hide the shell's nav links and search on this page.

**Typography, colour and motion**
- The page loads four families: Cormorant Garamond, Inter, Roboto and DM Mono (`:10`). Roboto is used for buttons (`.btn`, `:90`), and DM Mono for the order number. `login.html:49` uses Cormorant plus DM Sans instead.
- The page background is mint `#f0f7f2` (`:53`), not cream.
- The design leans on gradients and glow, which read as "AI-generated" or template work: the forest-to-moss gradient summary header (`:125`), the gold progress bar with `box-shadow:0 0 12px` glow (`:68`), gradient savings banner (`:131`), gradient gateway cards and badge (`:139-150`), a bouncy cubic-bezier on the step circles, hover-lift on cart cards, and confetti in green/blue/gold on success (`:1983-1990`).
- The page has 45 numeric HTML-entity emoji, including 🏷 in the savings banner, which rendered as an empty box in the test browser (observed), 🔒🚚↩ trust pills, and 🔄🚚📦🧾⭐ on order-card buttons.

**Confirmation**
- A modal says "Order Confirmed!" over a confetti band (`:445-480`). The expected delivery date is invented on the client as today + 5 days (`:1865`, `:1954`). The first action offered is a bright WhatsApp-green `#25D366` "Send Order to WhatsApp" button, ahead of "View My Orders".

### Inferences
- The owner's dislike probably comes from two things: (1) the page doesn't look like the storefront, because of the yellow/blue/mint colours, emoji and gradient cards, and (2) it feels long, with three steps, duplicated summaries and badge clutter. A redesign that removes elements will look calmer and more "Nansei" than one that restyles them.
- The arithmetic mismatch is the most damaging visual bug, because it undermines trust exactly where money is shown. Extra and unclear costs top Baymard's abandonment reasons (already in the prior notes).

### Gaps
- Real Razorpay modal behaviour, COD placement and login-return were not exercised because the backend was not running.
- No analytics exist on where shoppers drop off in this checkout. The audit is heuristic.

## Q2. What does checkout research (Baymard, NN/g) say?

### Takeaway
Step count matters less than field count, clarity and showing the full cost early. Make guest or quick checkout prominent, cut to roughly 8 fields, autofill city and state from the postal code, hide the coupon field behind a link, default billing to shipping, keep a visible summary with the total before payment, put the common payment method first, and make the button say exactly what happens.

### Cited Findings
- **Steps.** Baymard's 2011 test found one-page checkouts are not automatically better, and users handled multi-step flows well when basic guidelines were followed ([Baymard, one-page checkout](https://baymard.com/blog/one-page-checkout)). Its accordion research says completed steps must collapse into visible summaries of the entered data, not bare headers. Users expect the browser Back button to go to the previous step, and Baymard recommends `history.pushState()` for single-URL checkouts ([Baymard, 27 Sep 2023](https://baymard.com/blog/accordion-style-checkout)).
- **Field count.** The 2024 benchmark averaged **11.3 form fields** (11.8 in 2021, 12.7 in 2019), against an ideal of about **8**, and **5.1 steps** from cart to review ([Baymard](https://baymard.com/blog/checkout-flow-average-form-fields)).
- **Specific cuts.** Use one "Full name" field, since 42% of test users typed their full name into "First name". Collapse Address line 2 behind a link (30% of users paused at it). Default billing to shipping and hide the billing fields. Hide the coupon field behind a link (70% of sites have one, and 35% of those show it open). Offer account creation on the confirmation step ([Baymard](https://baymard.com/blog/checkout-flow-average-form-fields)).
- **Coupon field.** In Baymard testing some users left the site to search for coupon codes once they saw an open coupon field. Baymard recommends collapsing it and auto-applying eligible promotions ([search summary of Baymard research](https://baymard.com/blog/checkout-flow-average-form-fields)). The page says 83% of sites don't offer auto-applied discounts ([Baymard Payment UX, 1 Jun 2026](https://baymard.com/learn/payment-ux)).
- **Guest checkout.** 47% of sites with guest checkout don't make it prominent. Use the word "guest", a button not a text link, and place it at the top before the email field. 24% of US shoppers abandoned a cart in the past quarter solely because of forced account creation (2022, n=4,384) ([Baymard, 17 Jan 2023](https://baymard.com/blog/make-guest-checkout-prominent)).
- **Total and payment.** Show the complete total (shipping, tax, fees) before asking for payment. 12% of US shoppers abandoned because they couldn't see the total upfront. A collapsed but reachable summary is acceptable on mobile.
- **Payment methods.** Long logo rows create "visual noise". Group methods, show the most common first and preselect it, and hide rare options behind "more".
- **Trust.** Trust comes mainly from a clear, predictable interface, and badges only "can help". Put reassurance near the main button. The CTA should "say exactly what happens next", and its label should change when a third-party method is chosen.
- **Errors.** Never clear entered data on error (34% of sites do). Use specific error messages and scroll to the field ([Baymard Payment UX, 1 Jun 2026](https://baymard.com/learn/payment-ux)). Baymard's mobile benchmark found 33% of mobile sites never show the total before asking for card data (secondary summary of [Baymard mobile checkout research](https://baymard.com/blog/mobile-ecommerce-checkout-forms); figure not re-verified on the page).
- **NN/g (Kaley, 2 Dec 2018).** Put the order summary near the top on mobile and expand it to show line items. Derive city and state from the postal code but keep them editable. Support browser autofill. Use numeric keypads for phone and PIN. Avoid long dropdowns. List the most common payment option first without overwhelming. Make guest checkout the most prominent option. Give each cart line a clear Remove without a separate Update button ([NN/g](https://www.nngroup.com/articles/mobile-checkout-ux/)). This is older (2018) but consistent with Baymard 2023–2026.

### Inferences
- For Nansei, a single page with three clearly separated, auto-collapsing sections (Contact → Delivery → Payment) is the best fit. It keeps one URL with `pushState` per section, puts about 7 fields on screen, and keeps an always-visible summary. This follows Baymard's "what you ask matters more than layout" and the accordion-summary guideline.
- The billing block, the gateway framing and the badge rows go against Baymard's "clarity over badges" and "fewer, grouped payment options". They should be removed, not restyled.

### Gaps
- Almost all Baymard quantitative data is from US or European shoppers. I found no India-specific usability benchmark of checkout layouts.
- I could not open Baymard's paywalled guideline pages (e.g. order-summary placement on mobile). The mobile 33% figure comes via a secondary summary.

## Q3. What do Indian D2C checkouts look like in 2025–2026?

### Takeaway
The large Indian organic and food D2C brands run on Shopify with a third-party "one-click" checkout. Two Brothers India Farms uses Shopflo, and Organic Tattva uses Shiprocket Checkout plus GoKwik KwikPass. All of these start from the mobile number with an OTP, prefill a saved address from a cross-merchant network, show offers and coupons inside the checkout, push prepaid with discounts, and gate COD (blocking by pincode or risk, COD fee or OTP). Nansei's custom HTML site can copy the shape of this flow, but not the address network.

### Cited Findings
- **Two Brothers India Farms** (twobrothersindiashop.com, viewed 2026-11-12, home page only). It runs on Shopify (`window.Shopify` present), loads `bridge.shopflo.com/js/shopflo.bundle.js` with `cf_is_shopflo_enabled = true` (GoKwik and Shiprocket flags false), and loads Snapmint (EMI/BNPL). The announcement bar reads "Enjoy Free Shipping on order above ₹1499" and "Get 10% OFF on orders above ₹3000 | Use Code - TBIF10". This was observed in the browser. The checkout itself was not opened, because that would need a cart and phone entry.
- **Organic Tattva** (organictattva.com, viewed 2026-11-12, home page only). It runs on Shopify and loads Shiprocket Checkout (`fastrr-boost-ui.pickrr.com/…/shopify.js`, `shiprocketCheckout*` handlers), Shiprocket Smart Cart (a cart drawer), and GoKwik KwikPass (`pdp.gokwik.co/kwikpass/…`, `KwikpassAccountGate`), which is GoKwik's phone-OTP login layer. This was observed in the browser. The checkout was not opened.
- **Razorpay Magic Checkout.** It handles prepaid and COD, saves addresses and payment details across Razorpay-network sites, and reduces COD RTO using shopping history and address quality. Merchants can block COD for customers with past RTOs, filter gibberish addresses and review risky COD orders. Coupons are supported. It is on-demand and needs activation. It is "Standard Checkout" only (Custom Checkout is not supported). Listed integrations are Shopify, WooCommerce and mobile SDKs, and the docs don't say whether a plain-HTML site with its own backend qualifies ([Razorpay docs](https://razorpay.com/docs/payments/magic-checkout/)). Third-party summaries cite address prefill from "100M+" to "200M+" saved addresses, plus COD OTP and auto-disabling COD for RTO-risk users ([Razorpay Shopify app listing](https://apps.shopify.com/razorpay-checkout); [Curlec docs](https://curlec.com/docs/payments/cod-magic-checkout)). These are vendor figures and inconsistent.
- **Organic-food case study.** GirOrganic (A2 ghee, wood-pressed oils, pulses) said its forms took 1.5–3 minutes, and Razorpay reports an 11% rise in order conversions after Magic Checkout prefilled contact, shipping and payment details (vendor case study, 12 Dec 2023) ([Razorpay blog](https://razorpay.com/blog/magic-checkout-case-study-girorganic/)).
- **GoKwik (KwikCheckout / Kwik COD).** Features include OTP login, address auto-fill after OTP (vendor claim of up to 85% prefill), COD OTP verification, captcha, COD fees, COD blocking by pincode, RTO intelligence, and discount suggestions on higher tiers. Prepaid orders via GoKwik's gateway carry a reported extra 2.5% ([Shopify app listing](https://apps.shopify.com/kwikcheckout)). Prices differ across locale pages and were not verified.
- **Shopflo.** It claims a "100 Mn+ consumer network" with one login across brands, "automatic prepaid discounts", "discount ladders", and "COD blocking for users and pin codes". Its stated results (+27.2% conversion, +41% prepaid share) are vendor claims ([Shopflo](https://www.shopflo.com/)).
- **COD fee and prepaid incentive norms.** Vendor and logistics blogs suggest a flat ₹25–60 COD fee or 1–2% of order value, often only for high-RTO pincodes or first-time buyers, and ₹20–50 off or ₹50–100 cashback for prepaid. They warn that blanket prepaid discounts mostly reward people who would have prepaid anyway ([search summary incl. Razorpay blog, Jun 2026](https://razorpay.com/blog/cash-on-delivery/); [base.com](https://base.com/en-IN/blog/how-to-convert-cod-orders-to-prepaid/); [Velocity](https://blog.velocity.in/cod-vs-prepaid-optimising-payment-options-to-reduce-rtos/)). No authoritative study compares these tactics.
- **Nansei backend today.** `User` has `phoneOtp`, `phoneOtpExpire` and `otpAttempts` fields (`backend/models/User.js:59-65`), but `authRoutes.js:9-16` exposes only email/password register, login and reset, with no OTP endpoints. `POST /api/orders` (COD) requires login (`orderRoutes.js:332`). `/razorpay/verify` saves the order only `if (orderPayload && req.user?.id)` (`orderRoutes.js:167`). A guest who pays online would be charged with no order saved.

### Inferences
- The common Indian pattern is: mobile number first → OTP → saved address shown as a card → offers/coupon list → payment with UPI first and COD last (sometimes with a fee). Nansei can build this shape in plain HTML/JS. Phone-first only gives a benefit once there is an OTP endpoint and SMS provider (MSG91, Twilio, etc.), or once the store adopts Magic Checkout/GoKwik/Shopflo. Those products are built mainly for Shopify and WooCommerce.
- The cheapest high-value step without new vendors is: (a) keep email/password login but ask for it at the start, or (b) add true guest checkout. Both are backend changes: allow `optionalAuth` on `POST /orders`, and save guest orders on `/razorpay/verify` keyed by phone. Guest tracking already exists via `POST /api/shipping/lookup` (order number + mobile).
- Nansei's ₹999 free-delivery threshold is below Two Brothers' ₹1,499. That is a selling point worth showing in the summary as a progress line ("₹349 more for free delivery").

### Gaps
- I did not open the live checkouts of Two Brothers or Organic Tattva. Doing so needs a cart plus a phone number and OTP, and entering personal data on live sites was out of scope. Their exact field order, COD fee and coupon placement are therefore **unverified**.
- I could not load Shiprocket Checkout's product page (it returned only an SVG). Its shopper flow is described only via its scripts and third-party comparisons.
- Whether Razorpay Magic Checkout can run on a custom (non-Shopify) site is not stated in the docs. Ask Razorpay.

## Q4. Should My Orders stay on the checkout page? What should the confirmation show?

### Takeaway
Split it out. My Orders is a separate job (post-purchase) with its own five modals, and putting it in the checkout file makes the checkout heavier and the header nav confusing. Move it to `pages/orders.html` and keep `checkoutmyorderpage.html?page=orders` redirecting there. Replace the confetti modal with a calm confirmation page that shows the real order number, what was bought, the amount paid or due on delivery, the address, the next steps, and a link to orders and tracking.

### Cited Findings
- The orders view (`:951-1148`) and its five modals (track, review, cancel, invoice, return) share one file and one script with checkout. The file has 2,398 lines. Inbound links point to `checkoutmyorderpage.html?page=orders` from the shared header and footer (`js/site-shell.js:151`, `:168`, `:211`), and the page switches views on that query (`:1254`).
- The prior audit found Track, Invoice and Buy Again broken for API orders, Cancel not calling `PUT /api/orders/:id/cancel`, and a fake Return success ([prior report](reports/Nansei storefront UI improvements.md), row 13). The endpoints that do exist are `GET /api/orders/my-orders`, `PUT /api/orders/:id/cancel`, `GET /api/orders/:id` and `GET /api/shipping/track/:id` (`orderRoutes.js:318`, `:353`, `:378`; `shippingRoutes.js` header comment).
- Baymard recommends offering account creation on the confirmation step, which needs only 1–2 password fields, rather than before checkout ([Baymard](https://baymard.com/blog/make-guest-checkout-prominent); [Baymard fields](https://baymard.com/blog/checkout-flow-average-form-fields)).
- Baymard says users treat a shown delivery date as a promise. That was in the prior notes. The current "+5 days" date is fabricated on the client (`:1865`, `:1954`), while Shiprocket returns a real `etd` once a shipment exists (`backend/utils/shiprocket.js:199`, `:268-269`).

### Inferences
- **Orders page.** `pages/orders.html` should hold the list, detail and tracking, and reuse the modals after fixing them. Update the shell links in `site-shell.js` (3 places) and any footer "Track Order" links. Keep `?page=orders` on the checkout as a one-line redirect so old links keep working.
- **Confirmation.** It should be an in-page state of the checkout, or a `order-confirmed.html?id=`. It should contain:
  - a heading ("Thank you, {first name}. Your order is placed.")
  - the order number from the server (`orderNumber`) in a plain mono or tabular style
  - the payment line: "Paid ₹683 by UPI/card · Payment ID pay_xxx", or "Pay ₹683 in cash when it arrives"
  - the items with thumbnails, the delivery address, and a dispatch window ("We pack orders within 1–2 working days; you'll get the tracking link by SMS/email"). Use a delivery date only from Shiprocket.
  - buttons: "Track this order" (orders.html), "Continue shopping", and a secondary text link "Share order details on WhatsApp".
  - For COD: "We may call or WhatsApp you to confirm before dispatch", if the owner adopts COD confirmation.
  - No confetti and no exclamation mark.

### Gaps
- There is no data on how many current customers use My Orders against guest tracking.

## Q5. Recommended layout (desktop and mobile), fields, copy, and endpoints

### Takeaway
One checkout page with three sections that open one at a time (Contact & delivery → Delivery method/summary check → Payment). It has a narrow left column, a sticky cream summary on the right (top on mobile, collapsed with the total visible), about 7 visible fields with PIN-first autofill, a collapsed coupon link, UPI-first payment rows with COD last, and one forest-green button whose label states the amount and the action. The palette is forest, gold and cream only, with no gradients, glows, emoji or badge strips.

### Cited Findings
- The supporting evidence is in Q2 and Q3: about 8 fields ([Baymard](https://baymard.com/blog/checkout-flow-average-form-fields)), collapsed completed sections with summaries and pushState ([Baymard](https://baymard.com/blog/accordion-style-checkout)), total before payment and the CTA saying what happens ([Baymard](https://baymard.com/learn/payment-ux)), PIN→city/state editable and numeric keypads ([NN/g](https://www.nngroup.com/articles/mobile-checkout-ux/)), guest prominence ([Baymard](https://baymard.com/blog/make-guest-checkout-prominent)), and Indian phone-first, offers inside checkout, COD gating (Q3 sources).
- Endpoints already available:
  - `GET/POST /api/addresses` (saved addresses, `addressRoutes.js:20`, `:30`)
  - `POST /api/coupons/validate` (signed-in only)
  - `GET /api/discounts/active` (public, `discountRoutes.js:21`)
  - `POST /api/orders` (COD, signed-in)
  - `POST /api/orders/razorpay/create` and `/razorpay/verify` (verify saves the order only when signed in)
  - `POST /api/shipping/lookup` (guest tracking)
- The server recomputes subtotal, coupon, 5% GST, delivery and total, and rejects a mismatch over ₹1.5 (`orderGuard.js:66-101`). The client must mirror `FREE_SHIPPING_ABOVE` and `SHIPPING_FEE`.

### Inferences (the brief)

**Structure.** Max width 1080 px. Left column 1fr (max 620 px) and right column 360 px, with a 40 px gap. Background cream `#f7f3ec`. Cards are white with a 1 px `#e6dfd2` border, 12 px radius and no shadow, or `0 1px 2px rgba(15,34,24,.06)` at most. Headings use Cormorant Garamond 600 and everything else Inter 400/600 at 16 px for inputs and body. Drop Roboto and DM Mono, and show order numbers in Inter with `font-variant-numeric: tabular-nums`. Gold `#c9a84c` is used only as a thin accent (active section rule, focus ring, free-delivery progress fill) and never as text on cream. Use `#7a5f17` if gold-toned text is needed (prior contrast note). Primary button: background `#0f2218`, text cream, hover `#1a3a2a`, height 52 px, radius 10 px, no gradient, no glow.

**Top bar.** Use the shared site-shell header with the bottom bar off (already done at `:482`). Optionally use a minimal checkout header, with the logo linking home and a "Secure checkout" text plus a lock line icon, so shoppers aren't pulled back into browsing. Below it, use a plain text progress line rather than circles: "Delivery · Payment". The active item is forest with a 2 px gold underline, and done items show a check.

**Section 1: Contact & delivery** (open by default)
- If signed out, show the line "Have an account? **Sign in** for saved addresses" at the top, as a link that returns via `login.html?next=checkoutmyorderpage.html`. It must not block. Guest checkout needs the backend change in Q3. Until that exists, put the login wall here at the start, not at Pay.
- If signed in with saved addresses, show them as radio cards (name, one-line address, phone), with "Deliver here" selected and "+ Add a new address" as a link.
- New-address fields, in this order:
  1. Mobile number (`type=tel`, `inputmode=numeric`, `autocomplete=tel-national`, "+91" prefix shown, maxlength 10). Helper: "For delivery updates and the courier."
  2. Full name (`autocomplete=name`)
  3. PIN code (`inputmode=numeric`, `autocomplete=postal-code`, maxlength 6). After lookup, show the inline line "Chennai, Tamil Nadu ✓ Delivers in 3–6 days" (the check is an SVG). Only show the date range if the owner confirms courier estimates.
  4. House / flat / building (`address-line1`)
  5. Area, street, landmark (`address-line2`, labelled "optional")
  6. City (prefilled, editable)
  7. State (prefilled, editable `<select>` of 36 states and UTs, used only if lookup fails)
  8. Email (optional, `type=email`). Helper: "For your invoice and tracking link."
  - Drop the Home/Work/Other picker, or keep it as small text chips after Save. Drop the billing address entirely, and add "Need a GST invoice? Add GSTIN" as a collapsed link only if the owner wants B2B.
- Store `line1`, `line2`, `city`, `state` and `pincode` as separate fields. Stop rebuilding the `line` string.
- CTA: "Continue to payment". Once done, the section collapses to a summary: "Deliver to Test Customer, 12 Test Street, Chennai 600001 · +91 90000 00000 — Change".

**Section 2: Payment** (opens after section 1)
- Show the rows as radio list items, one tap each, with no logos row and no "gateway" wording:
  1. **UPI** (Google Pay, PhonePe, Paytm, any UPI app). Preselected. Helper: "You'll approve the payment in your UPI app."
  2. **Card / Net banking / Wallet**
  3. **Cash on delivery**. Helper: "Pay when it arrives. {₹X COD fee if the owner sets one.} We'll confirm by phone/WhatsApp before dispatch."
- Rows 1 and 2 both open the same Razorpay Standard Checkout. Pass `config.display` / `method` preferences so UPI shows first, and test this against the Razorpay docs before relying on it.
- Price any prepaid incentive or COD fee explicitly in the summary ("Prepaid discount −₹20" / "COD fee ₹30"). The server must be taught to compute them too, or orders will 409. If the owner doesn't want either, show neither.
- Coupon: a collapsed text link "Have a promo code?" in the summary, not in the payment step. It opens an input plus an "Apply" button and calls `POST /api/coupons/validate`, then sends `couponCode` with the order. Success shows "TBIF-style code applied −₹X", and errors are inline. If active automatic discounts exist (`GET /api/discounts/active`), show them already applied.
- Main button (one per screen):
  - Prepaid: "Pay ₹683 securely"
  - COD: "Place order · Pay ₹683 on delivery"
  - Below the button, one muted line: "Payments are processed by Razorpay. We never see or store your card or UPI PIN." Then "By placing this order you agree to our [Terms] and [Privacy Policy]", as real links.
- Delete the PCI, RBI, "256-bit" and "Instant Confirmation" strip, the "Amount Payable" box, the "Recommended" pill and the processing-overlay timer. Show a spinner in the button only while a real request is in flight.

**Order summary (right column, sticky `top: header + 16px`)**
- Title "Your order (4 items)" in Cormorant.
- Item rows: 56 px thumbnail with a qty badge, name, pack size ("0.5 kg × 2"), and line price. Show the MRP strike-through only when an MRP exists.
- Each row gets a −/+ stepper and "Remove" as a text link in forest, not blue. Remove the pack-size `<select>`: changing pack size belongs on the product page, and the client re-pricing duplicates catalogue logic.
- Promo link (see above).
- Price rows that add up:
  - "Items (MRP) ₹770"
  - "Discount on MRP −₹120"
  - "Delivery FREE / ₹X"
  - "GST (5%) ₹33"
  - rule
  - **"Total ₹683"** in Inter 600, forest, 20 px
  - Alternatively, drop the MRP row: "Items ₹650", "GST 5% ₹33", "Delivery FREE", "Total ₹683", with "You save ₹120 on MRP" as a small line under the total. Either way, every row shown must sum to the total.
  - Long term, decide on GST-inclusive prices. Indian B2C buyers expect shelf prices to be final, and the prior report flagged GST added on top.
- Free-delivery nudge when under ₹999: a 4 px cream track with gold fill and the text "Add ₹349 more for free delivery". It must use the same threshold as the server.
- Trust area: at most three plain lines, in text with line icons and no emoji tiles. They must be true and checkable:
  - "Dispatched from our farm in {place} within 1–2 working days"
  - "Returns: damaged or wrong items replaced within 7 days ([policy](refund-policy.html))"
  - "FSSAI Lic. No. {number}", once the owner provides it
  - Remove "Buyer Protected", "100% Organic" and "PCI" claims unless a certificate number backs them.

**Mobile (≤ 768 px)**
- Order of blocks: header, then a collapsed summary bar at the top ("Show order summary ▾ … ₹683", cream, total always visible, per NN/g and Baymard), then the open section, then the collapsed sections.
- Single column, 16 px gutters, inputs 16 px font and at least 48 px tall, PIN and mobile with numeric keypads.
- A sticky bottom bar from section 1 onward. It shows the total on the left ("₹683 · 4 items"), with the current CTA on the right ("Continue" / "Pay ₹683"). It is cream with a 1 px top border and no blur or shadow, and respects `env(safe-area-inset-bottom)`.
- Only one summary on screen. Remove the duplicated sidebar below.
- Use `history.pushState` per section so Android Back returns to the previous section.

**Errors and states**
- Validate inline on blur, with specific messages:
  - "Enter a 10-digit mobile number starting with 6–9"
  - "We couldn't find this PIN — check it, or type city and state"
- Keep all entered data on any error. On server 409 ("prices changed"), refresh the cart and show "Prices updated — please review your total" above the button.
- On payment dismiss, show "Payment not completed. You can try again or choose cash on delivery", with the cart intact.
- Empty cart: "Your cart is empty" plus a "Browse products" link, with no 🛒 emoji.

**Confirmation.** As in Q4.

**Copy rules.**
- Use plain sentences with no exclamation marks.
- Avoid "premium", "seamless", "bank-level", "100% secure" and "Recommended".
- Use "₹" via `&#8377;` so the encoding can't break it again (prior report).
- Use one brand spelling, "Nansei Organics", in Title case, not "NANSEI".

**Order of work**
1. Fix the summary arithmetic and wire `deliveryCost` to the same threshold and fee as the server. This is invisible and urgent.
2. Merge steps 1–2, remove billing, the gateway framing, badges and emoji, and move the summary to the top on mobile.
3. Add the payment list, the coupon link and the sticky mobile bar.
4. Split out orders.html and the new confirmation.
5. If wanted, make the backend changes for guest or phone-OTP checkout, a COD fee or prepaid discount, and COD confirmation.

### Gaps
- Owner decisions are needed on:
  - COD fee or prepaid discount (and the amounts)
  - GST-inclusive pricing
  - the free-delivery threshold and shipping fee value on Render
  - whether to keep the email/password login or add phone OTP or guest checkout
  - the FSSAI licence number and dispatch location for trust lines
  - whether courier delivery estimates are reliable enough to show dates
- Not verified: Razorpay Standard Checkout's ability to put UPI first via `config.display`. Check this in the Razorpay docs or test mode before building it.
- Not measured: the conversion effect of any of these changes for Nansei. There is no analytics baseline.
