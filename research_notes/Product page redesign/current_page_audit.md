# Current product detail page audit (pages/product.html, 13 Nov 2026)

Method: served `pages/` with `python -m http.server 8131` and opened `product.html?id=1/2/8/12/16` in the built-in browser at 375x812 and 1366x900. Measurements come from `getBoundingClientRect` in the page. With no backend running, numeric ids load from the in-page `const products = [` catalogue (pages/product.html:5197). The live site links to Mongo ids (`id: p._id`, pages/index.html:3372), so that path was simulated by feeding the backend/data/catalog.json entry through the page's own `mapApiProduct()` (pages/product.html:6571). "Source" below means a file:line in the repo or a browser observation.

## 1. What does a shopper see on phone and desktop, in order, and where does the page lose them?

### Takeaway
On a phone the buy block sits just above the fold. Below it the page is 7,389 px tall, and about 4,600 px of that (62%) is related-product rows, a hard-coded blog strip and the footer. The product's own information takes up 1,200 px of 12 px text inside a five-tab box. On desktop the page is 4,284 px, and the image is a 681 px square glued to the left edge of the viewport. Shoppers lose the thread at three points: the cramped tab box, an orphaned story strip that freezes the page when tapped, and an empty "reviews" block that says "No reviews yet" twice.

### Cited Findings
**Phone, 375x812, id=1 (Karunguruvai Rice). Page height 7,389 px, about 9.1 screens.**
- 0–151 px: site header, search bar and breadcrumb (Home > Shop > name). The breadcrumb's "Shop" goes to index.html, not to the category. Source: pages/product.html:3790-3803.
- 159–495 px: square product image (an ImageKit pack-shot with the brand logo and "KARUN-GURUVAI RICE" text baked in), with three overlays: a green category pill top-left, "Organic" and "18% OFF" pills bottom-left, and heart and share buttons top-right. Below it sits a row of 52 px thumbnails, and the 3rd thumbnail is a nutrition-table graphic. Source: pages/product.html:3810-3875; browser screenshot.
- 538 px: category eyebrow, H1 (27 px tall), then the tagline in light sage (#8fbc9a on #f7f3ec, **contrast 1.93:1**, which fails WCAG AA). Source: computed styles in browser; pages/product.html:3886.
- About 600 px: a full-width green "rating" box with five grey stars and the word "New" (contrast 1.90:1). It takes a whole row and says nothing. Source: pages/product.html:3890-3898, 6680-6683.
- 680 px: price "₹90", strikethrough "₹110", "18% OFF" pill, then "🎉 You save ₹20 on this order!" The emoji comes from JS at pages/product.html:6689, 6904 and 6952. The discount is shown three times above the fold (image pill, price pill, savings line).
- 773 px: size chips 500 g / 1 kg / 2 kg / 5 kg under the label "SELECT WEIGHT (KG)", even though the chips are in grams and kilograms. Source: pages/product.html:6692-6700.
- **829 px: in-page Add to Cart / Buy Now. This is 17 px below the 812 px fold**, so on first paint only the fixed bottom bar (qty, Add to Cart, Buy Now; 64 px at y 748) can be used. Both bars are on screen together once the user scrolls 100 px. Source: browser measurement; pages/product.html:3938-3958, 4132-4160.
- 917–1,358 px: the tab box. Tab labels render as "Descript…" and "How to …" because 5 tabs × 65 px don't fit (scrollWidth 70 vs clientWidth 65). The Description panel is 245 px of 12 px grey text plus a green "certified organic farms" callout. Source: browser; pages/product.html:3961-4019.
- About 1,360–1,454 px: **about 96 px of empty cream space** (the `pb-24` on the product wrapper, pages/product.html:3806).
- 1,454 px: the mobile "story" strip: three 46 px circles with the labels "Our Story", "How To Cook" and "Certifications". The labels run into each other ("How To CookCertifications" reads as one word in the screenshot). The strip is pinned to nothing and sits between the tabs and the reviews. Source: pages/product.html:4032-4049, 4433-4465.
- **Tapping any circle does nothing visible and locks page scroll.** `nsOpenStory` sets `body.style.overflow='hidden'`, then `nsRenderSlide` throws `TypeError: Cannot read properties of null (reading 'style')` because `#nsStoryBg`, `#nsStoryProgressBars` and `#nsStoryContent` no longer exist. The modal `#nsStoryModal` is an empty div (pages/product.html:4026-4028). Reproduced: modal height 0, body overflow "hidden", console error at product.html:4355. Source: pages/product.html:4321-4382.
- 1,536–2,073 px: "What People Say / Customer Reviews". The score card shows a 3.8 rem "—" that renders as a thick black bar, with "No reviews yet" under it, and a second card below that again says "No reviews yet. Customers can review this product once their order has been delivered." Source: pages/product.html:4060-4090; browser screenshot.
- **2,073–5,289 px (3,216 px, 43% of the page): three related rows** ("You May Also Like", "Fresh From the Farm", "Community Bestsellers"). On a phone each row wraps into a 2-column grid about 1,045 px tall. The cards show "☆☆☆☆☆ 0 (0)" and a 1 kg price with no size label. Source: pages/product.html:5059-5135, 7184-7217.
- 5,289–6,644 px (1,355 px): the "From Our Journal / Latest on Karunguruvai Rice" blog strip with three Unsplash images. The second image fails to load, so its alt text shows over a blank box. "View All Articles ›" links to `#`. Source: pages/product.html:5139-5153, 7086-7140; browser `naturalWidth=0` on photo-1603046891744.
- 6,644–7,389 px: footer from site-shell.js.

**Desktop, 1366x900, id=1. Page height 4,284 px, about 4.8 screens.**
- Two equal columns with no outer container. The gallery is 681 px wide, flush to the left edge of the window, while the header and the related/blog sections use a 1280 px container (left edge 41 px). The image is 681x681 and sticky (`md:sticky md:top-20`). The thumbnails start at y 789 and are mostly below the 900 px fold. Source: pages/product.html:3807-3810; browser measurement.
- Right column: title at 160, price 298, sizes 393, Add to Cart 453 (above the fold), tabs from about 540, description text at 584–709 (12 px Inter, line-height 22 px, about 600 px wide). The whole buy block fits in one screen.
- There is no quantity control for non-flower products on desktop (the phone bar has one).
- Below the fold: reviews (897–1,428, the same double "No reviews yet"), related rows (1,427–3,179), blog (3,179–3,904) and footer. The blog cards stay invisible until the reveal animation fires, so a fast scroll shows an empty cream band.
- Fonts on the page: Inter (345 text nodes), Roboto (20, on buttons) and Cormorant Garamond (8, on the section headings "Customer Reviews", "You May Also Like" and the blog). Three families in one view. Source: computed styles.

**Other ids**
- id=8 Paneer Rose (dried flowers): the size chips are hidden (pages/product.html:6715), so the shopper sees "QUANTITY − 1 +" and ₹150 with no indication of what one unit is. The data says variants "50/100/200/500" and Specs says "Net Weight 100 g". The qty config unit is "piece" (`getQtyCfg('Dried Flowers')` returns `{unit:'piece'}`).
- id=12 Organic Real Rose Milk: **the main image is an Unsplash photo of steak and fries** (photo-1600891964092). id=16 Country Fig Powder: **the main image is an Unsplash salad bowl** (photo-1512621776951). The in-page catalogue uses stock photos as main images for ids 12, 14, 15 and 16. backend/data/catalog.json has real ImageKit photos for 15 and 16, so the in-page catalogue is stale. Source: in-page `products[].image`; backend/data/catalog.json.

### Inferences
- Above the fold on a phone, the shopper sees the image, the name, an empty rating box and the price, but no size choice or in-page button. The fixed bar does the selling.
- The drop-off point is the tab box at about 920 px. Everything after it is generic, either cross-sell or content that is the same on every product page, so a shopper looking for "what is this, how do I cook it, is it really organic" finds the answer only in tiny text behind tabs.
- The story-strip bug can make the page feel broken: after one tap the page no longer scrolls until reload, on any phone.

### Gaps
- Not checked on a real iOS device (body `overflow:hidden` locks scroll less reliably on iOS Safari, so the freeze may be partial there).
- Live API product shape not verified against the production database; the API path was simulated with backend/data/catalog.json.

## 2. Exactly what is bad about the description area (content and presentation)?

### Takeaway
Most of the description copy is SEO keyword padding and generic health claims, not information about this pack. The presentation (12 px text in a five-tab card with truncated labels) hides it further. On the live API path four of the five tabs come up empty ("not available"), and the API's own `howToUse` and `nutritionalInfo` fields are thrown away.

### Cited Findings
**Content**
- **SEO keyword stuffing in 9 of 16 descriptions** (in-page catalogue lines 5209, 5423, 5603, 5693, 5783, 5873, 5963, 6053; identical copy in backend/data/catalog.json). Examples:
  - id 8: "Many people search for panneer rose benefits because it supports skin health" and "If you are looking to buy panneer rose online, dried panneer rose petals and panneer rose powder are widely used". It mentions a powder the store doesn't sell, and repeats "panneer rose" 8 times in 109 words.
  - id 7: "If you are looking for White Kavuni rice price or planning to buy White Kavuni rice online…"
  - id 10: "Many people search for Avarampoo benefits in Tamil because it helps manage body heat"
  - id 6: "…especially Iluppai Poo Samba White Rice recipe in Tamil". The product is named "Iluppai Poo Samba Rice" elsewhere.
  - id 1 How to Use step 5: "Can be used in Karunguruvai rice recipe in Tamil for authentic cooking." This is a search phrase posing as an instruction.
- **Filler sentences with no information**: id 1 "Choosing a quality source ensures better taste and nutritional value."; id 2 "Nansei Organics brings you high-quality Karuppu Kavuni Rice that is clean, natural, and farm-sourced."
- **Repetition**: the tagline restates the first description sentence (id 1: "low glycemic, high fiber, used in Siddha medicine" appears in both). Benefits restate the description, and for 16 products the `nutrition` object duplicates the benefit titles (e.g. id 2 nutrition keys = "Heart Health, Weight Loss, Diabetes Control…"). Benefit titles reused across products: "Gluten-Free" ×6, "Cooling Effect" ×5, "Skin Care" ×4, "Weight Management" ×3, "Heart Health" ×3.
- **Disease and health claims the store can't support on a food label**: "Controls Blood Sugar" (id 1), "Diabetes Control: Maintains stable blood sugar levels" and "reduces bad cholesterol levels" (id 2), "Boosts Immunity", "Helps in weight loss" (id 1), "Excellent natural remedy for constipation… helps prevent anemia" (id 16), "Mood Lifting… reduce stress" (id 12), "helps improve memory" (id 11). Source: in-page `benefits` arrays (pages/product.html:5207 and each product block).
- **Nutrition numbers that are guesses**: wide ranges such as Iron "1.2–5 mg" and Magnesium "88–160 mg" (id 2), and Energy "~350 kcal" (id 1) under a fixed banner "Approximate values per 100g. Actual values may vary by batch and season." (pages/product.html:3999-4006). For flowers and drinks the "nutrition" table contains non-nutrients: "Essential Oils: Natural fragrance compounds" and "Vitamin C: Trace" (id 8), "Sweetener: Natural cane sugar" (id 12). The product's own 3rd gallery image is a printed nutrition panel, which the tab doesn't match or reference.
- **Specs that contradict the selected size and other tabs**:
  - id 1 Specs "Net Weight 1 kg" while 500 g is selected.
  - id 16 "Net Weight 250 g" while 100 g is selected.
  - id 12 "Net Weight 200 g" while the chips are 200 ml / 500 ml / 1 L.
  - id 2 Specs repeats all 8 nutrition rows (Calories through Magnesium).
  - Every product has "Origin: Tamil Nadu, India" and "Certification: FSSAI". FSSAI is a food-business licence, not an organic certification, yet the page says "certified organic" three other times.
- **Internal contradictions in one product (id 1)**:
  - Specs "Processing: Hand-pounded" vs story "stone-milled".
  - Story "preserve its natural dark hue" vs the pack-shot of white grains.
  - Specs "Type: Heritage Short Grain" with no source.
  - id 12: the description says the mix already contains cardamom, then How to Use step 5 says "Add a pinch of cardamom for extra flavor". "2 tablespoons of rose milk mix" (powder?) vs volume chips in ml (liquid?).

**Presentation**
- Body copy is 12 px (`text-xs`) grey #4b5563 at line-height 1.85. That is the smallest text on the page apart from the badges, used for the most important copy. Source: pages/product.html:3984; computed font-size 12 px.
- Five equal-width tabs (pages/product.html:3962-3981) truncate on a 375 px phone ("Descript…", "How to …"). Inactive tab colour #9ca3af on white has **contrast 2.54:1**. Hover colours are set with inline `onmouseover`/`onmouseout`. The active state is a gold underline, while everything else on the page uses forest green.
- The tabs hide content that should be scannable. Cooking steps (the most useful content for rice) are two taps away. Panels are separate cards with their own dark-green table headers, gradient icon tiles (pages/product.html:6750-6757) and alternating stripes, so the box looks like an admin table, not shop copy.
- The fixed "certified organic" callout uses a `[[icon:leaf]]` marker (resolved to a Lucide icon at runtime, pages/product.html:3659-3716). It is identical on all 16 products, including the processed rose-milk mix. Source: pages/product.html:3985-3990.
- Free text is injected as HTML: `pDescEl.innerHTML = desc.split('\n\n')…` (pages/product.html:6741-6743), and benefits, how-to and specs are interpolated unescaped (6747-6845). This is low risk while the data is in-page, but the API path feeds admin-edited text into it.

**Live (API) path: Mongo id, simulated**
- `mapApiProduct` (pages/product.html:6571-6599) does not map `howToUse` (a String in backend/models/Product.js:94) or `nutritionalInfo` (Product.js:86). It maps `benefits: [String]` to `{title: b, desc: b}`, so each benefit would print its text twice. Result with the catalog.json record: Benefits "Benefits information not available.", Nutrition "Nutritional information not available.", How to Use "Usage instructions not available.", and Specs shows only the header row "Specification / Details". Only the Description tab has content.

### Inferences
- "The description is very bad" has three causes: (1) the copy was written for search engines ("many people search for…"), (2) the claims are medical and uncheckable, and (3) the useful parts (size, cooking ratio, storage) are buried in 12 px text behind truncated tabs. On the live site most tabs are blank.
- A rewrite should be one readable column without tabs: what it is, what it tastes like and how to cook it, the facts that match the selected pack, and storage. Each product's text should be stored once (backend) and read by the page.

### Gaps
- I could not verify which products actually carry an organic certificate or the FSSAI licence number (site-shell.js:282 shows the number only if the admin has set it in store settings).
- I did not check whether the real Mongo documents carry `benefits`/`specs` beyond what backend/data/catalog.json contains.

## 3. Which sections and blocks are filler or claims the store can't back up, and should be removed? (full list of template, fake or contradictory content)

### Takeaway
The page still ships a large amount of invented "trust" content: stories, farmer counts, lab-test claims, a fake customer testimonial with blood-sugar numbers, comparison tables and origin maps. Some of it renders today. Most of it is dead code that a live API product would bring back. Several numbers contradict the homepage.

### Cited Findings
**Rendered today (in-page catalogue path)**
- "Organic" pill on every product image, hard-coded at pages/product.html:3848-3854, including id 12 "Organic Real Rose Milk", a sugar-based mix.
- Description callout: "Sourced directly from certified organic farms across Tamil Nadu. No artificial preservatives, no chemicals". Static text for all products (pages/product.html:3985-3990).
- Nutrition banner "Approximate values per 100g" shown even for flowers and liquids (pages/product.html:4000-4005).
- Story strip content for id 1 (per-product `experience.stories`, pages/product.html:5214-5216):
  - "grown pesticide-free in the Cauvery delta and stone-milled" contradicts Specs "Hand-pounded" and "Origin: Tamil Nadu".
  - "Every grain is sourced from NPOP-certified organic farms" while Specs says only FSSAI.
  - Story images are Unsplash stock (farm field, soup bowl); the same 3 stock URLs are reused across 6 products.
- `experience` also carries `reels`, `watchLearn` and `fromTheirKitchens` for all 16 products (sections removed, data and renderers remain). `nsRenderGallery` would invent customer posts: captions "`${productName} in a … - shared by a Nansei customer.`" and authors "`@nansei_home_${i+1}`" (pages/product.html:4809-4830). Video titles have invented durations ("dur: '1:52'", pages/product.html:4655).
- Related rows' subtitles: "Just landed certified, pure, and farm-direct" and "Trusted by thousands of organic families" (pages/product.html:5092, 5117), above cards that all show "0 (0)" reviews.
- The blog strip has 15 hard-coded articles (3 per category) with dates and read times ("Mar 2026 · 4 min read") that do not exist on blog.html (grep finds none of the titles there). Health headlines include "Low Glycemic Rice: The Smart Choice for Diabetics" and "Country Fig: Nature's Best Remedy for Constipation". They open in an in-page modal with invented article text. Source: pages/product.html:7080-7140, 7441-7468.
- In-page catalogue `sold` counts (312, 421, …; e.g. pages/product.html:5199). They are not displayed now (`pSoldEl` is blanked at 6683), but they remain in the data.
- Brand spelling: tab title and share text say "NANSAI" (pages/product.html:8, 6618, 6632, 7067); the logo says "NANSEI ORGANICS"; the description says "Nansei Organics"; the meta description says "Nansai Organics" (line 9).

**Dead code holding fabricated claims (not rendered now because the target IDs are gone, but still shipped)**
- `NS_STORIES_DATA` (pages/product.html:4244-4251) is **the fallback whenever a product has no `experience.stories`, which is every API/Mongo product.** Confirmed by simulation: the strip changes to six circles "Learn More | Our Farmers | See Reports | Full Guide | Read Stories | Watch Story". Content:
  - "Conventional farming uses 300+ synthetic chemicals per season"
  - "Direct partnerships with 140+ small-scale farmers… Farmers earn 2.3× market rate. Every farm GPS-tracked"
  - "200-point quality check at NABL-accredited partner lab"
  - **"After 3 months of daily kanji my blood sugar improved from 210 to 148. Doctor was amazed." — Rajan K., Chennai. 12,000+ families transformed.** This is a fabricated medical testimonial.
  - "Murugesan has farmed his 3-acre plot in Thanjavur for 28 years… soil health score has tripled and income doubled"
- `NS_WHY` (4407-4413): "Loved by 12,000+ Families", "4.8/5 Customer Rating", "Lab Tested Every Batch".
- `NS_INGREDIENTS` (4467-4472): Kodo Millet, Moringa, Amla, Turmeric. The store sells none of them. Claims include "Lowers glycaemic response by 37% in controlled studies", "20× vitamin C of an orange" and "3.5% curcumin — 2× the FSSAI minimum".
- `NS_ORIGINS` (4493-4499): five districts with "62 farmers · 840 acres · NPOP Organic 2016" and similar. That totals 152 farmers and 1,478 acres, while the homepage says "25 acres of certified organic land… 200+ farming families" (pages/index.html:1279) and the stories say "140+ farmers". These are three different numbers.
- `NS_COMP` (4540-4548): a Nansei-vs-"regular" checklist ("Third-party Lab Tested", "Eco-Friendly Packaging", "Non-GMO").
- `NS_TRUST_DATA` (4562-4569): "Easy Returns — 7-day hassle-free" and "Certified Organic — NPOP & FSSAI". The refund policy allows returns only for damaged, wrong, defective or expired items and excludes change of mind (pages/refund-policy.html:124-140), so "hassle-free" overstates it.
- `NS_RELATED` (4917-4923): Barnyard Millet, Little Millet Flour, Organic Moringa and Turmeric Powder with prices and Unsplash images. None are store products.
- `GALLERY_BY_CAT`, the video builders and the `nsRenderReviews` legacy grid (4634-4915). There is also leftover `#mill-card-prod` CSS and JS (1067-1080, 4994-5034, `millTiltP` at 5035).
- Other site pages already flagged: news.html makes certification claims (USDA, Halal and so on; covered in the earlier report).

**Contradictions with the rest of the site**
- Organic status: the product page says "certified organic" and "NPOP", Specs say "FSSAI" only, and the homepage says "Organic Certified" / "25 acres of certified organic land" (pages/index.html:1152, 1279). No certificate number is shown anywhere.
- Prices: the in-page catalogue base price for id 1 is ₹180/₹220 (the 1 kg price, pages/product.html:5199), the page shows ₹90 for 500 g, and related cards show 1 kg prices with no size label.
- Related and blog links come from the in-page `products` array (numeric ids), so a shopper on a live Mongo-id product who taps a related card lands on the static numeric fallback with stale data and stock images.

### Inferences
- Remove: the story strip and viewer (broken, stock photos, unprovable claims), the "Organic" image pill and the certified-organic callout until there is a certificate to cite, the Benefits tab (medical claims), the guessed Nutrition ranges (use the printed panel values from the pack image or remove the tab), the hard-coded blog strip (or link to real blog.html posts), two of the three related rows, and every `NS_*` constant, the gallery/video code and the `experience.reels/watchLearn/fromTheirKitchens` data.
- `NS_STORIES_DATA` is the most urgent of these because it is live on the production (Mongo id) path. It puts a fake diabetic testimonial on every product page for phone users who tap a circle (and the tap also freezes the page).

### Gaps
- I could not confirm which of the store's certificates (FSSAI licence, any NPOP/India Organic scope certificate) actually exist. The owner must supply them before any "certified" wording stays.

## 4. What must stay (and work)?

### Takeaway
The working commerce core should be kept as it is: per-size pricing, the size chips, the flower quantity stepper synced with the phone bar, Add to Cart and Buy Now, wishlist and share, the real-only reviews section with its verified-purchase form, and the fixed bottom bar on phones.

### Cited Findings
- Size chips and per-size pricing: selecting a chip calls `updatePriceFromVariant` (pages/product.html:6713-6738, 6941-6994). The price shown for 500 g is ₹90/₹110, matching backend/data/catalog.json sizes (P1-500G 90/110).
- Quantity: `changeAnyQty` (phone bar) and `changeFlowerQty` (in-page) stay in sync. Tested on id 8: both read 2 then 3, and the price updated ₹150 → ₹300 → ₹450. Source: pages/product.html:6865-6915; browser test.
- Add to Cart / Buy Now: `addToCartFn` and `buyNow` (pages/product.html:7004-7040), `cartItemFromSelection` (6996).
- Fixed phone bar `#mobBar` (pages/product.html:4132-4160): qty, Add to Cart and Buy Now, 64 px, safe-area padding, shown only under md.
- Reviews: real-only and escaped (`escHTML`, `revCardHTML`, `renderReviewSection`, `initReviewForm`, `submitReview`; pages/product.html:7470-7640). The form appears only for delivered-order buyers. The empty state needs tidying (one message, no "—" bar).
- Gallery with thumbnails and lightbox (pages/product.html:3810-3875, 7074-7080); wishlist (`toggleWishlistFn`, 7041) and share (7063).
- Shared header and footer from pages/js/site-shell.js (the footer shows the FSSAI number when it is set).

### Inferences
- Per the owner's "keep existing UI" rule, a redesign should keep these components and their look (forest/cream palette, Inter, the existing buttons). The changes should be what surrounds them: drop the tabs for one readable description column at 15–16 px, show the selected pack's facts next to the price, fix the flower "unit" ambiguity, and put the in-page Add to Cart above the fold on phones (or accept the fixed bar as the primary CTA and remove the duplicate).
- Fixing `loadProductReviews` so it isn't skipped for numeric ids (`!/^\d+$/.test(id)` at pages/product.html:6847) only matters for the static fallback. Live Mongo ids already load reviews.

### Gaps
- Add-to-cart was not exercised end to end (the backend was not running). Cart persistence and checkout handoff are untested here.
