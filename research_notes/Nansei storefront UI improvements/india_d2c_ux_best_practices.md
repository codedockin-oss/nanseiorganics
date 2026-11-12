# E-commerce UX Best Practices for a Small Indian D2C Organic Food Store (2025–2026)

Scope note: the user has said "don't change the existing UI". Each recommendation in the Inferences sections is tagged:
- **[FITS]**: can be added to the existing site with no visible redesign (content, copy, data, backend logic, performance, small inline text in existing slots).
- **[SMALL ADD]**: a small new element (a line of text, badge, link, input) placed in an existing layout; visible but not a redesign.
- **[DESIGN]**: needs a visible layout or design change. Flag to the owner before doing it.

Research was done 12 Nov 2026 with about 18 search/fetch calls. Many Baymard detail pages are paywalled, so only free-article figures are used.

## 1. What large-scale UX studies (Baymard, NN/g) say about product pages, listings, cart/checkout, mobile and search

### Takeaway
Baymard's data says checkout friction and surprise costs are the main fixable causes of lost orders. Extra costs (40%), slow delivery (20%), distrust (19%), forced account creation (18%) and long checkout (17%) lead the list of abandonment reasons. Showing shipping cost and delivery dates early, offering guest checkout, and keeping checkout to about 7–8 fields are the best-supported fixes. Most of them can be done without a redesign.

### Cited Findings
- Average documented cart abandonment rate is 70.22%, averaged across 50 studies. — [Baymard](https://baymard.com/lists/cart-abandonment-rate)
- Abandonment reasons among US online shoppers (Baymard's latest quantitative study; sample size and year not shown on the free page). These exclude the 42% who were "just browsing":
  - extra costs too high (shipping, tax, fees): 40%
  - delivery too slow: 20%
  - didn't trust the site with card details: 19%
  - site required account creation: 18%
  - checkout too long or complicated: 17%
  - website errors or crashes: 17%
  - unsatisfactory returns policy: 13%
  - couldn't see or calculate the total cost up front: 12%
  - card declined: 10%
  - not enough payment methods: 9%

  — [Baymard](https://baymard.com/lists/cart-abandonment-rate)
- A secondary summary of a 2025 Baymard survey (n=1,026 US adults) gives somewhat different figures: errors 15%, total cost not visible 14%, not enough payment methods 10%. Treat exact percentages as version-dependent. — [search summary of Baymard 2025 survey; Baymard page above is primary](https://baymard.com/lists/cart-abandonment-rate)
- Checkout length:
  - The average US checkout shows 23.48 form elements by default, or 14.88 form fields alone.
  - The ideal is 12–14 form elements, or 7–8 form fields.
  - Most checkouts could cut form elements by 20–60%.

  — [Baymard](https://baymard.com/lists/cart-abandonment-rate)
- Fixing the checkout usability issues Baymard has documented could raise a large e-commerce site's conversion rate by 35.26%. — [Baymard](https://baymard.com/lists/cart-abandonment-rate)
- Shipping costs on product pages (2017 study, older data):
  - 64% of users looked for shipping costs before adding to cart.
  - 43% of sites showed no shipping cost or calculator on the product page.
  - Showing even a price range beats showing nothing.

  — [Baymard: show shipping costs on product pages](https://baymard.com/research-articles/show-shipping-costs-on-product-pages)
- Shoppers want a specific delivery date, not a transit speed such as "3–5 business days". 41% of benchmarked sites don't show a delivery date per shipping option. Users read a displayed date as a firm promise, so it must be accurate. — [Baymard: shipping speed vs delivery date](https://baymard.com/research-articles/shipping-speed-vs-delivery-date)
- Mobile checkout UX: 63% of mobile sites rated "mediocre" or worse in Baymard's 2025 benchmark. Baymard says it is retesting its checkout research, with overhauled findings due Q2 2027. — [Baymard: current state of checkout UX](https://baymard.com/research-articles/current-state-of-checkout-ux)
- Product pages: only 48% of leading US/EU desktop sites have "decent" or "good" product page UX (article updated 2026). Common gaps are "in scale" images, images of included items, and lifestyle images. — [Baymard: current state of product page UX](https://baymard.com/research-articles/current-state-ecommerce-product-page-ux)
- Site search:
  - 46% of desktop and 58% of mobile e-commerce sites have "mediocre or worse" search UX (2026 benchmark).
  - 69% of sites don't offer autocomplete suggestions for slightly misspelled queries.
  - Baymard's query-types article says 70% of sites require users to search with the site's own product-type jargon (e.g. "blow dryer" vs "hair dryer"). Another Baymard figure says 20% of sites have product-type query issues, so the numbers depend on benchmark version.

  — [Baymard search benchmark](https://baymard.com/research-articles/ecommerce-search-report-and-benchmark); [Baymard query types](https://baymard.com/research-articles/ecommerce-search-query-types); [Baymard misspellings](https://baymard.com/blog/offer-autocomplete-suggestions-for-misspellings)

### Inferences
- **[FITS]** Cut checkout fields to the essentials: name, phone, pincode, address lines, city/state auto-filled from pincode. Drop optional fields like company or a second address line where possible. Baymard's 7–8 field target is achievable for India.
- **[FITS]** Keep or allow guest checkout. Phone number plus OTP or no login at all, with account creation optional after the order. This targets the 18% "required account creation" reason.
- **[SMALL ADD]** Add a one-line shipping note on product pages and in the cart, e.g. "Free delivery above ₹X; ₹Y below". Also show the full total, including shipping and COD fee, before the payment step. This targets the 40% extra-cost and 12% "couldn't see total" reasons.
- **[SMALL ADD]** Show an estimated delivery date ("Arrives by Thu 20 Nov") after the pincode is entered, rather than "3–5 days". Only do this if the courier's estimates are reliable, because Baymard says users treat it as a promise.
- **[FITS]** Add search synonyms and misspelling tolerance on the backend, with no UI change. For this catalogue that means mapping:
  - "mapillai samba" / "mappillai" / "maapillai"
  - "kavuni" / "kavuni rice" / "black rice"
  - "seeraga samba" / "jeeraga samba"
  - Tamil script names
  - English descriptors ("red rice", "diabetic rice", "low GI")
  - flower names in Tamil and English

  A small alias table on the Node backend is enough.
- **[FITS]** Add more product images in existing gallery slots: grain close-up next to a coin or spoon for scale, the cooked rice, the pack front and back label, the pack in hand.
- **[FITS]** Make error states robust (17% abandon on errors): test checkout on low-end Android and with slow networks.

### Gaps
- No free NN/g article was fetched within the budget, so there are no NN/g-specific numbers. Baymard is the only large-scale study cited.
- Baymard's detailed product-listing and filtering guidelines are mostly paywalled. No free listing-page statistics were collected.
- All Baymard abandonment figures are US-shopper data. No equivalent India-specific abandonment-reason survey was found.

## 2. India-specific behaviour: mobile, payments (UPI/COD), RTO, pincode checks, WhatsApp, OTP, regional language, trust signals and compliance

### Takeaway
UPI dominates Indian digital payments, but COD is still a large share of e-commerce orders, and COD orders fail far more often than prepaid ones. ClickPost D2C data puts COD RTO at about 37.5% vs prepaid at about 5.3%. Prepaid share is rising (41% in 2025, up from 32% in 2024). For a food store, the FSSAI licence number and the correct organic logo and certifier details are both trust signals and compliance requirements.

### Cited Findings
**Payments**
- UPI accounted for 85.5% of all payment transactions by volume in H2 2025, but only 9.5% by value. — [RBI Payment Systems Report (Dec 2025)](https://rbi.org.in/scripts/PublicationsView.aspx?Id=23813)
- UPI's share of digital payment volume in FY25 was 83.4% according to Business Standard citing RBI. Financial Express reports 83.7%, and a government statement cites 81% for retail digital payments. — [Business Standard](https://www.business-standard.com/finance/news/upi-s-contribution-to-payments-ecosystem-volume-grows-to-83-4-in-fy25-125052900871_1.html)
- Prepaid share of e-commerce orders rose to 41% in 2025 from 32% in 2024. — [Social Samosa, reporting ClickPost](https://www.socialsamosa.com/report/prepaid-e-commerce-orders-rise-10958917)
  - Sample: 635.22M orders, Jan 2024–Nov 2025.
  - Prepaid adoption by city tier: metro 46%, Tier II 40%, Tier III 34.5%.
  - Tier II and III together account for more than half of orders.
  - The implied COD share is about 59%, but the article doesn't state it.
- Several sources cite ET Prime Research (2024) for COD at 60–65% of Indian e-commerce orders. This is secondary; the primary was not fetched. — [ClickPost RTO statistics blog](https://www.clickpost.ai/blog/ecommerce-rto-statistics-india)

**COD and RTO (return to origin)**
- ClickPost network: D2C COD RTO is 37.51% and prepaid RTO is 5.28%. Blended D2C RTO is 6.6–12.0% by city tier. — [ClickPost RTO statistics](https://www.clickpost.ai/blog/ecommerce-rto-statistics-india)
- ClickPost festive window (D2C, 80M+ orders): RTO 11% and failed-delivery rate 22% in 2025; 10% and 21% in 2026. — [ClickPost Great Indian Festive Report 2026](https://www.clickpost.ai/clickpost-great-indian-festive-report-2026)
- Shipway/Unicommerce (FY25 shipments): RTO rises with delivery attempt time. It is 22% for 1–2 days, 27% for 3–5 days and 35% beyond 5 days. — [Cargo Breaking News on Shipway ShipNotes](https://cargobreakingnews.com/?p=34465)
- ClickPost FY2026 D2C report (51.1M shipments, 63 brands): prepaid share varies widely by category, from Sleep & Comfort at 84.5% to Wellness at 42.6%. High-prepaid categories have much lower RTO. Food and grocery are not reported. — [ClickPost D2C Industry Trends Report 2026](https://www.clickpost.ai/india-e-commerce-trends-report-2026)
- RedSeer (via Upstox) estimates losses from RTO and failed deliveries at over ₹20,000 crore a year. — [Upstox](https://upstox.com/news/upstox-originals/investing/is-cash-on-delivery-quietly-costing-you-more/article-184260)

**Mobile, WhatsApp, smaller cities**
- Tier-3 and smaller cities account for about 60% of new online shoppers and more than half of Diwali 2025 orders on major platforms. — [Entrepreneur India](https://india.entrepreneur.com/news-and-trends/festive-spikes-remain-but-indias-e-commerce-is-becoming/498823)
- GoKwik data: 8 in 10 festive-season WhatsApp orders came from new customers. — [BW Retail World](https://bwretailworld.com/sector/e-commerce-marketplaces/80-of-festive-whatsapp-orders-came-from-new-shoppers); [Outlook Business on D2C brands using WhatsApp](https://www.outlookbusiness.com/corporate/d2c-brands-lean-on-whatsapp-to-find-new-customers)
- An Admitad report says mobile purchases rose from 45% to 49% of online orders. The publication date is unclear and this was not verified as 2025 data. — [Social Samosa](https://www.socialsamosa.com/report/e-commerce-up-24-qcom-120-diwali-10571867)

**Compliance and trust: FSSAI and organic labelling**
- FSSAI advisory to e-commerce FBOs (3 Dec 2024) — [FSSAI advisory PDF](https://fssai.gov.in/upload/advisories/2024/12/674efa161d756Adobe%20Scan%203%20Dec%202024.pdf); [Vikaspedia summary](https://en.vikaspedia.in/viewcontent/health/nutrition/advisory-for-e-commerce-food-business-operators-on-strengthening-food-safety-compliance?lgn=en); [FoodNavigator](https://www.foodnavigator.com/Article/2025/02/24/india-tightens-food-safety-standards-for-e-commerce-platforms/); [Inc42](https://inc42.com/buzz/comply-with-food-safety-norms-or-face-action-fssai-to-ecommerce-platforms)
  - Sellers' FSSAI licence or registration numbers should be displayed. Secondary summaries differ on whether this is "mandatory" or "encouraged".
  - The listing should show a clear image of the principal display panel and the panel with the batch number, expiry date and MRP.
  - Loose (unpackaged) items need the FSSAI number on the invoice or bill.
  - Delivered products should have at least 30% of their shelf life, or 45 days, remaining.
  - The governing rules are the Labelling and Display Regulations, 2020.
- NPOP labelling — [APEDA SOP for FSO / Jaivik Bharat](https://jaivikbharat.fssai.gov.in/SOP_for_FSO.pdf); [APEDA NPOP chapter](https://apeda.gov.in/apedahindi/Organic/ORGANIC_CONTENTS/Chapter_1.pdf)
  - "Organic" may be used only if at least 95% of ingredients are NPOP-certified and the product carries the India Organic logo.
  - Products with 70% to under 95% certified ingredients say "made with organic ingredients".
  - Labels should show the accredited certification body's name and accreditation number, plus the FSSAI logo.
- Jaivik Bharat (FSSAI organic logo) — [FSSAI Jaivik Bharat portal](https://jaivikbharat.fssai.gov.in/); [Food Safety Helpline](https://www.foodsafetyhelpline.com/jaivik-bharat-logo-fssai-license/)
  - Under the Food Safety and Standards (Organic Foods) Regulations 2017, the two recognised systems are NPOP and PGS-India.
  - The official portal states the logo "will come into effect once it is notified in the Gazette of India". Older sources describe it as mandatory from 2018–2019.
  - The current status is unclear. Check before using the logo.

### Inferences
- **[FITS]** Keep COD but make prepaid the default and easy: UPI intent/QR first, then cards and netbanking. COD RTO is about 7x prepaid RTO in ClickPost data.
- **[SMALL ADD]** Common Indian D2C tactics, offered as options rather than evidenced by a fetched study:
  - a small prepaid incentive (e.g. "₹20 off with UPI") or a small COD fee, shown clearly in the order total
  - partial-COD
  - an order cap for COD
- **[FITS]** Confirm COD orders on the backend through a WhatsApp or SMS message before dispatch to cut RTO. This is common practice; no specific effect size was found.
- **[SMALL ADD]** Add a pincode check on the product page and in the cart, if not already present. One input shows "Delivers to 6xxxxx by <date>, COD available/not available". This matches Baymard's delivery-date guidance and stops orders the courier can't serve. The Node backend can hold a courier serviceability table.
- **[FITS]** Shipway data links slower first delivery attempts to higher RTO, which favours dispatching quickly. This is an operations point, not a UI one.
- **[SMALL ADD]** Add a WhatsApp chat/order link (wa.me with a pre-filled message) in the existing footer or contact area.
- **[FITS]** Show the FSSAI licence number on the site: footer, product page details section and GST invoice. FSSAI's e-commerce advisory points this way.
- **[FITS]** Use "Organic" claims only where the product holds NPOP or PGS-India certification. Show the certifier name and accreditation or certificate number in the product details. Follow APEDA's 95% / 70% wording rules. Don't use Jaivik Bharat or India Organic logos without the matching certification or licence.
- **[FITS]** Add front-label and back-label photos (batch, MRP, expiry) to existing product image galleries. This meets the FSSAI advisory's display expectation and builds trust.
- **[FITS / DESIGN]** Tamil support. A Tamil product name beside the English one (e.g. "மாப்பிள்ளை சம்பா") fits existing title or subtitle text. A full Tamil site toggle is a visible change and a large content job.

### Gaps
- No primary 2025–2026 source was found for:
  - the share of Indian e-commerce traffic or orders on mobile (Redseer / Bain "How India Shops Online" figures were not retrieved)
  - OTP-login conversion effects
  - measured uplift from regional-language (Tamil) UI
  - measured RTO reduction from WhatsApp COD confirmation or pincode checks
  - COD share or RTO for the food and grocery category specifically
- The ET Prime COD share figure (60–65%) is secondary, cited via a vendor blog.
- The NPCI monthly UPI dashboard was not fetched. RBI figures are used instead.

## 3. Food and organic content that builds trust and converts (origin, traceability, lab reports, cooking, nutrition, recipes, subscriptions, bundles)

### Takeaway
Leading Indian organic brands put proof up front: lab reports, traceability, glyphosate or pesticide testing, certification logos and farm or farmer stories. They pair this with recipes and combos. None of the sources measured conversion impact, so this is observed practice rather than proven uplift.

### Cited Findings
- Two Brothers Organic Farms (TBOF) — [TBOF homepage](https://twobrothersindiashop.com/); [TBOF traceability](https://twobrothersindiashop.com/pages/traceability)
  - The homepage has a "Good Food Backed by Proof" block citing independent glyphosate-free testing and facility standards.
  - It links to Lab Reports, Quality Assurance and Traceability pages, and to Farm Visit, Team on Ground and Farmers' Markets.
  - Farm-to-fork traceability was rolled out in 2025. One product page says dynamic traceability covers 29 of 100+ products, so coverage is partial.
- TBOF uses in-house QR-enabled farm-to-fork traceability, and its D2C website contributes about 50% of revenue. — [D2C Insider](https://pulse.d2cinsider.com/two-brothers-organic-farms-sets-100-growth-target-eyes-global-expansion-in-d2c-space/); [YourStory](https://yourstory.com/smbstory/two-brothers-organic-farms-d2c-brand)
- TBOF extended glyphosate-free certification across daily staples. This is brand-sourced PR. — [D2C Insider](https://pulse.d2cinsider.com/two-brothers-organic-farms-expands-glyphosate-free-certification-across-daily-staples-raises-the-bar-for-verified-clean-food/)
- Organic Tattva homepage — [Organic Tattva](https://www.organictattva.com/)
  - Shows India Organic (Jaivik Bharat) and USDA logos.
  - Has a "Why Choose Organic Tattva" block (pesticide-free, non-GMO, ethical sourcing, "250 Global Testing Standards").
  - Has recipe and blog posts tied to products (jaggery, ghee, makhana recipes) and an "Exclusive Combos" section.

### Inferences
For a heritage rice and dried flower store, these can mostly go into existing product description areas or tabs:
- **[FITS]** Origin and farm: village or district, farmer or cluster name, harvest season or month, a photo of the field or farmer.
- **[FITS]** Proof: certificate type (NPOP or PGS-India, with number), and a lab report PDF link (pesticide residue, moisture) per batch where available. A downloadable PDF link is cheap to add.
- **[FITS]** Cooking: soak time, rice-to-water ratio, pressure-cooker whistles or open-pot time, cooked texture. Heritage rices like Mappillai Samba and Kavuni need long soaking and cooking, so this reduces "didn't turn out right" disappointment.
- **[FITS]** Use cases and recipes: kanji, idli/dosa batter, pongal, payasam for rice; tea, infusions or decor uses for dried flowers.
- **[FITS]** Nutrition per 100 g, if the store has the values. Avoid unverified health claims such as "cures diabetes"; FSSAI claims rules apply.
- **[FITS / SMALL ADD]** Bundles or combos (a "heritage rice trial pack" of 3–4 varieties in 500 g packs) use the existing product-card format as just another product.
- **[DESIGN]** A subscription or "repeat every month" option needs new UI and payment logic. A lighter route is a "Reorder" button on the existing My Orders page **[SMALL ADD]**.

### Gaps
- No study was found that quantifies conversion lift from traceability pages, lab reports, recipes or farmer stories for Indian food D2C. The sources are brand pages and promotional D2C press.
- No reliable data was found on subscription adoption for Indian organic staples.

## 4. What well-regarded Indian organic/heritage-grain D2C brands do on their sites

### Takeaway
Verified homepages (TBOF, Organic Tattva) follow a common pattern, mostly content and merchandising rather than unusual UI:
1. an announcement bar with offers and a free-shipping threshold
2. category navigation, including "shop by concern"
3. a hero carousel
4. a press or certification strip
5. best-seller rows with star ratings and review counts
6. combos or hampers
7. a proof/trust block
8. recipes or blogs

### Cited Findings
- Two Brothers Organic Farms homepage, as fetched — [TBOF](https://twobrothersindiashop.com/)
  - Announcement bar rotates: 10% off above ₹3,000 (code), free shipping above ₹1,499, "Membership now LIVE", 9% off app orders.
  - Navigation includes "Shop by Concern" (Low GI, Digestive Support, Immunity Support, Overall Wellness) and a "Farm Life" menu (founders, traceability, quality assurance, lab reports, farm visits, blogs).
  - A press-logo strip shows 10 outlets (ET, The Hindu, YourStory, and others).
  - "Most Loved" and "Special Farm Picks" tabs.
  - Product cards show price or sale price, star rating with review count, badges (Best Seller, New Launch, Limited Stock) and size variants.
  - Pack-size options (pack of 2 or 4) and a Gift Hampers page.
  - Not seen in the fetched content: subscription, WhatsApp, COD messaging, language selector. The page was truncated, so the footer was not reviewed.
- Two Brothers retention: a third-party case study describes membership and retention nudges on Shopify. It is vendor-authored. — [AiTrillion case study](https://aitrillion.com/case-study/two-brothers-organic-farms-growth-with-aitrillion)
- Organic Tattva homepage, as fetched — [Organic Tattva](https://www.organictattva.com/)
  - Announcement bar: "30% off on Organic Grocery" and "Next Day Delivery Available*".
  - Navigation includes Combo Deals and Gift Hampers.
  - 10 category tiles, including "Rice & Rice Products".
  - Bestsellers with star ratings (4.4–4.8) and discounts.
  - Exclusive Combos section (all marked sold out when fetched).
  - India Organic/Jaivik Bharat and USDA logos, a "Why Choose" block, and recipe/blog cards.
  - A cookie banner offers both Decline and Got it.
  - Not seen: free-shipping threshold, subscription, written reviews on the homepage, FSSAI number, WhatsApp, COD.

### Inferences
Patterns a small store can copy without a redesign:
- **[FITS]** Rotate offer and threshold text in an existing announcement bar, if the site has one. Otherwise this is a **[SMALL ADD]**.
- **[FITS]** Use existing nav or filters for "shop by use" (everyday rice, for diabetics / low GI where substantiated, for kids, festival or temple use for flowers).
- **[SMALL ADD]** Show star rating and review count on cards, but only with real reviews.
- **[FITS]** Use product-card badges (Best Seller, New Harvest, Limited Stock) if a badge slot exists.
- **[FITS]** Add a proof block with lab reports, certification and farm story as content on existing About or product pages.
- Both brands avoid surfacing COD and WhatsApp on the homepage. These are likely handled at checkout, though that was not verified.

### Gaps
- 24 Mantra, Pro Nature, Kapiva and heritage-rice or millet specialists were not fetched within the budget. Nothing is claimed about their sites.
- Product-page and checkout details (pincode check, COD fee, OTP login) of these brands were not verified. Only homepages were fetched.

## 5. Mobile performance and conversion: load time evidence and Core Web Vitals thresholds

### Takeaway
Google/Deloitte's 2020 study (older, industry-funded) linked a 0.1 s mobile speed improvement to about 8.4% higher retail conversion. Core Web Vitals "good" targets are LCP ≤2.5 s, INP ≤200 ms and CLS ≤0.1, measured at the 75th percentile. Speed work is invisible to users and fits the "don't change the UI" constraint fully.

### Cited Findings
- Google's "Milliseconds Make Millions" (Deloitte Digital, 2020; 37 brands, about 30M sessions, EU/US) — [web.dev case study](https://web.dev/case-studies/milliseconds-make-millions); [Deloitte report](https://www.deloitte.com/ie/en/services/consulting/research/milliseconds-make-millions.html)
  - A 0.1 s improvement in mobile site speed was associated with +8.4% conversions for retail and +10.1% for travel.
  - It was also associated with a 40.1% increase in progression from product page to add-to-basket, though this figure comes from a secondary summary of the study.
  - The data is older (2020) and not India-specific.
- Core Web Vitals "good" thresholds, judged at the 75th percentile of page loads, with the same thresholds for mobile and desktop and validated against CrUX data — [web.dev: defining Core Web Vitals thresholds](https://web.dev/articles/defining-core-web-vitals-thresholds)
  - INP: good ≤200 ms, poor >500 ms.
  - CLS: good ≤0.1, poor >0.25.
  - LCP: good ≤2.5 s, poor >4 s. The LCP row was confirmed via secondary sources citing web.dev.
- A DEV Community post claims the thresholds tightened in 2025 (LCP 2.0 s, CLS 0.08). Official web.dev material does not support this, so treat it as unreliable. — [DEV post](https://dev.to/linou518/core-web-vitals-2025-complete-guide-how-to-handle-inp-and-tighter-thresholds-24hf)
- Tier II/III cities now produce more than half of orders, so a large share of shoppers are on mid-range phones and variable networks. — [Social Samosa / ClickPost](https://www.socialsamosa.com/report/prepaid-e-commerce-orders-rise-10958917)

### Inferences
All of these are **[FITS]**, with no visible change:
- Compress and resize product images (WebP/AVIF, `srcset`), lazy-load below-the-fold images, and set `width`/`height` to prevent layout shift (CLS).
- Preload the hero or first product image (LCP).
- Defer non-critical JS and avoid heavy third-party widgets (INP).
- Serve static assets with long cache headers and versioned URLs. The repo already versions CSS/JS URLs.
- Self-host fonts with `font-display: swap`.
- Measure with PageSpeed Insights / CrUX field data on mobile, and test on a throttled mid-range Android profile.

### Gaps
- No India-specific study of load time vs conversion from 2023–2026 was found.
- No public CrUX benchmark for Indian D2C food sites was retrieved.
