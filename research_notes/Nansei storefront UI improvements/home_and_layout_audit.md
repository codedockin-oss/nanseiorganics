# Home page and shared layout UI/UX audit (pages/index.html, restored "Jul 23" storefront)

Method: read pages/index.html (4,089 lines, UTF-8 with BOM, CRLF) and the scripts it loads; served the repo with `python -m http.server 8101` and inspected http://127.0.0.1:8101/pages/index.html in the built-in browser at 1440x900 and 375x812 (screenshots, DOM measurement via javascript_tool, console and network logs). The backend (`http://localhost:5000/api/products?limit=100`) is not running, so the page rendered its hard-coded `products` array (index.html:2935-2953). That fallback is how the page is designed to work (`.catch(() => {/* silently keep static data */})`, index.html:3509), so it is not counted as a bug.

Sources are cited as `index.html:LINE` (file pages/index.html) or "Browser" (live measurement or screenshot in this session). Nothing on the web was needed, so there are no URLs.

**Scope rule from the user (applies to every recommendation):** "don't change the existing UI." Every fix below is meant to work inside the current layout, sections, palette (forest green / gold / cream) and visual style. Items marked **[ALTERS LOOK]** would visibly change the page, so the owner should decide on those. Everything else is a content fix, a bug fix, or a change that can't be seen. Nothing below suggests re-adding a founder story.

---

## 1. First impression above the fold (desktop 1440 and mobile 375)

### Takeaway
The brand comes through (logo, cinematic video hero, serif headline). The value proposition and primary CTA are weak: no product is visible above the fold at either width, the hero CTA text ends in a broken "?" glyph, two of the five hero slides have no background image, and the H1 sits below the hero with a stray space before its full stop.

### Cited Findings
- Desktop stack before content: offer bar 45px + sticky header 68px + hero 460px (`height:clamp(220px,34vw,460px)`). The first product card's top is at y≈1075px, below a 900px fold. Only the products section header ("Bringing Nature's Best To Your Family .") is visible above the fold, and it starts faded because of the `.sr` reveal. — Browser (DOM measurement); index.html:1267
- Mobile stack: offer bar 27px + header 58px + search row 63px (static) + hero 260px. The first product card's top is at y≈901px, below the 812px viewport, and the fixed bottom bar covers another 62px. — Browser
- On mobile, the band under the hero rendered as an empty cream area (~600px) in the first screenshot because the product header, filters and cards all start at `opacity:0` (`.sr{opacity:0;transform:translateY(32px)}`) until the IntersectionObserver fires. — Browser screenshot; index.html:312-313, 3467-3472
- The hero has 5 slides (index.html:1290-1346). Slides 0 and 1 use the **same** video file (`slide%20video.mp4`, index.html:1291 and 1305). Slides 2 and 3 (`#pbg-1`, `#pbg-2`) have `background-image:url('')`, so they show as plain near-black panels with text. Only slide 4 has a photo (a file named "WhatsApp Image 2026-03-30…"). — index.html:1315, 1326, 1337
- Slide 0 does not advance on a timer: it waits for the video's `onended` event (index.html:3396-3408). So the first slide's dwell time equals the video's length, and if the video fails to load the carousel never moves on unless the user acts.
- `v.play()` is called without `.catch()` (index.html:3402). The console showed "Uncaught (in promise) AbortError: The play() request was interrupted because video-only background media was paused to save power." — Browser console
- The hero CTA labels show a literal "?" where an arrow used to be: "Explore Products ?", "Shop Now ?", "Our Promise ?", "View Products ?". Lost characters also show elsewhere ("Experience the Root of Nature", product header button "Explore the Fields ?", blog "View All Articles ?"). The file contains a literal `?` (U+003F) here, so the original "→" was lost in an earlier encoding round-trip. 118 lines contain `?`, and 36 visible "?" characters were counted in the rendered body text. — index.html:1297, 1311, 1321, 1332, 1343, 2205; Browser (`innerText` count)
- Hero copy also lost em dashes, leaving double spaces: "from Tamil Nadu  grown in living soil" (index.html:1296), "Paddy  Banana Fig  Herbs" (index.html:1341, which renders as "Paddy Banana Fig Herbs"). — index.html
- The page's only `<h1>` is the products header, "Bringing Nature's Best To Your Family ." (stray space before the period), at index.html:2206. The five slide titles are `<h2>`. There is no `<meta name="description">`. The `<title>` is "Nansai -Experience the Root of Nature" (bad hyphen spacing, and spelt "Nansai"). — index.html:7, 2206; Browser
- Brand name is spelt inconsistently: the logo reads "NANSEI ORGANICS", while the logo alt text, title, slide eyebrows ("With Nansai"), reels captions, coupon codes (NANSAI10) and footer email (info@nansaiorganics.com) say "Nansai", and the copyright reads "NANSEI Organics". — index.html:7, 1187, 1294, 2856; Browser footer text
- Mobile hero: the description text starts underneath the left arrow button (it rendered as "e, farm-direct organic products…"), the mute button (`#slide0-sound-btn`, `bottom:4.5rem;left:1rem`) sits on top of the description and the CTA, and the "Scroll" indicator overlaps the slide text on the right. — Browser screenshot 375px; index.html:1299, 1366
- The hero's "Scroll" indicator and ghost slide numbers ("02/03/04") are decoration. The ghost numbers are hidden on mobile (index.html:485), but "Scroll" is not.

### Inferences
- Content-only fixes that keep the layout: (a) restore the arrows and dashes by replacing the "?" placeholders with HTML entities (`&rarr;`, `&mdash;`, `&#8377;`) so encoding can't break them again; (b) give slides 2 and 3 real farm photos (the gallery already has suitable ImageKit images at index.html:2609-2616), or swap the duplicate video slide for one of them; (c) drop the space in "Family ."; (d) pick one brand spelling for title, alt text and copy (owner decision).
- Behaviour fixes you can't see: add `.catch(()=>{})` to `v.play()` and a fallback timeout so slide 0 advances even if the video stalls; start the hero's first visible text and the products header without the `.sr` hide (or add the `is-visible` class at load for elements already in the viewport) so the cream gap doesn't show on mobile.
- On mobile, move the mute button and "Scroll" hint so they don't sit on the text. Keep the same buttons, just put the mute button top-right and hide "Scroll" under 768px. **[ALTERS LOOK, minor]**
- Raising product visibility above the fold without a redesign: on mobile, make the search row part of the sticky header or drop the hero height slightly. **[ALTERS LOOK]**. A smaller step: make the hero CTA ("Explore Products") the single clear action on every slide, since three different CTA labels currently all scroll to the same `#products` section.

### Gaps
- Real-device LCP/CLS wasn't measured (the local server and built-in browser aren't representative, and Lighthouse wasn't available).
- The video's length (and so slide 0's dwell time) couldn't be read, because the browser paused it for power saving.

---

## 2. Header, navigation, search, cart and account on mobile

### Takeaway
The desktop header is clean and complete. On mobile it works but has many undersized tap targets, a bottom bar with no Shop or Cart entry (and one dead link), a "Farm" link that 404s everywhere, a search row that scrolls away, and a reels widget that floats above the open menu.

### Cited Findings
- Desktop nav links: Shop (#products), Farm (farm.html), Our Promise (#why-section), Blogs, News, About (#site-footer). Actions: My Orders, admin "AD" circle (role-gated), Sign In, Wishlist and Cart with badges. — index.html:1196-1229
- **farm.html does not exist** anywhere in the repo (searched with `find`). It's linked from the desktop nav (1198), the mobile drawer (1239) and the mobile bottom bar (`#mob-sticky-bar` href list: index.html, blog.html, news.html, farm.html). Footer links to `privacy-policy.html`, `terms-and-conditions.html` and `refund-policy.html` also have no matching files in pages/. The pages/ folder contains only account, admin-panel, blog, checkoutmyorderpage, index, login, news, product, reset-password, video-reels and wishlist .html. — Bash `ls pages`, `find`; Browser (`#mob-sticky-bar a` hrefs)
- "About" points to `#site-footer`, and the footer's own "About Us", "Our Farmers", "Contact", "FAQ", "Shipping Info" and "Home" links are `href="#"`. — index.html:1202; Browser footer link list
- The mobile bottom bar has Home, Blog, News and Farm. It has **no Shop, Search or Cart**, which are the actions shoppers need most. Cart is only in the header icon (32x32) and the drawer. — Browser; index.html:2790
- Tap targets under 44x44px at 375px: 125 interactive elements. Examples: hamburger `#mobHam` 28x22, header Sign In 76x32, wishlist and cart icons 32x32 (`.nav-icon-btn{width:32px;height:32px}` at index.html:469), mobile search button 30x30, slider arrows 29x29, slider dots 7x7 (active 9x9), mute button 32x32, filter pills 82x32, "View All" 88x28, **every product "Add to Cart" button 146x26**, reel minimize 26x26, reel close 25x25. — Browser (measurement)
- The mobile search row (`.mob-search-row`) is `position:static` (top 108px, height 63px), so search disappears once you scroll. Only the 58px header is sticky. — Browser
- The search input placeholder is static "Search products...". A "typing placeholder" script (index.html:3540-3565) targets `#searchPlaceholder` and `#mobSearchPlaceholder`, which don't exist, so it is dead code that runs a `setTimeout` loop forever. — index.html:3544-3545; grep shows no such ids
- A document-level `keydown` handler moves the hero slider on ArrowLeft/ArrowRight without checking the focus target, so moving the caret in the search box also changes slides. — index.html:3425
- Mobile drawer (`#mobDrawer`, z-index 999) opens below the header and lists Home, Products, Farm, About, Blog, News | Account, My Orders, Wishlist, Cart. The floating reels widget (`#reel-widget`, z-index 1050) **draws on top of the open drawer**, covering the lower right of the menu, and the bottom bar stays visible under the drawer. — Browser screenshots; index.html:800, 1235
- The drawer labels don't match the desktop nav: "Products" vs "Shop", "Blog" vs "Blogs", "Our Promise" missing from the drawer. — index.html:1197-1202 vs 1237-1247
- The header search on desktop has live suggestions (`handleSearchInput`, `#searchSuggestions`, z-index 1200), and `?search=` deep links auto-filter (index.html:3512-3522). That works well.
- The "Sign In" label becomes "Hi, {firstName}" for signed-in users, and the admin badge shows for the admin role (index.html:3990-3998). That's good, but the admin circle uses `#2563EB` blue, which is off-palette. It's only visible to admins.

### Inferences
- Invisible, high-value fixes: point "Farm" at an existing page (or remove it) and fill the `#` footer links with real targets. Dead links in the main nav hurt trust more than any visual issue.
- Tap targets can grow by padding the hit area only (for example `padding` plus `min-height:44px` on `.nav-icon-btn`, `#mobHam`, `.dot` via a transparent `::after` hit area, and the Add to Cart button), so the icons look the same. A 26px to 36-40px Add to Cart height on mobile is **[ALTERS LOOK, minor]**.
- Bottom bar: swapping "News" or "Farm" for "Shop" and "Cart" keeps the same component and style, but the owner should confirm because it changes the visible labels.
- Give `#reel-widget` a lower z-index than the drawer (or hide it while the drawer or cart is open). Make the arrow-key handler ignore events from `input`/`textarea`. Delete the dead typing-placeholder loop.

### Gaps
- Real iOS Safari behaviour (100vh, sticky inside a body with `overflow-x:hidden`) wasn't tested; the built-in browser emulates Chrome only.

---

## 3. Competing offer bars, countdowns, sliders, popups and videos (clutter and weight)

### Takeaway
The page stacks many attention-seekers: two marquee offer bars (desktop and mobile versions) with a fake "ends tonight" countdown, a 5-slide autoplay video hero, a floating auto-advancing reels widget whose four videos are all empty, a "Milling in Motion" block with 5 video cards (two point to a placeholder YouTube video and three have broken URLs), a gallery whose click handler crashes, and many perpetual animations. The reels widget is the worst offender: a black 195x347px (desktop) or 130x231px (mobile) box that covers product cards.

### Cited Findings
- Offer bar (desktop, index.html:1123-1158): "LIVE OFFERS" pinging dot, a marquee with 6 offers (duplicated by JS, index.html:2879-2880), and a countdown. The mobile bar (index.html:1161-1179) is populated by its own array (index.html:2888), so the offer text is maintained in **two places** and already differs: desktop says "Buy 2 Supplements Get 1 FREE HEALTH3", mobile says "Buy 2 Flowers Get 1 FREE HEALTH3".
- The countdown always counts to 23:59:59 today (`end.setHours(23,59,59)`, index.html:2899-2907), so it resets every day: an evergreen false-urgency timer. Scarcity copy "Paneer Rose Only 32 Left" is hard-coded (index.html:1140, 2888).
- The rupee sign is lost in the offer bar: "Free Delivery on Orders Above ?999", "Save ?221" (index.html:1136, 1138, 2888) and in "Why Choose Us": "Free above ?999" (index.html:2677). Separators between offers render as "?" (index.html:1135 etc.). — Browser screenshot shows "?999"
- Reels widget: `REELS` has four entries, all with `src:''` (index.html:3727-3731), so 8 `<video>` elements (mini plus modal) have no source. The console shows "NotSupportedError: The element has no supported sources" ×6-8. The fixed widget renders as a **black rectangle** with a caption, auto-advances every 6s (`INTERVAL = 6000`, index.html:3735), sits over the product rows (desktop at x=1223, y=529, 195x347; mobile at x=235, y=509, 130x231) and has 25-26px close and minimize buttons. — Browser measurement and screenshots; console
- `#reel-widget` has three competing width rules: 130px `!important` (index.html:660), 175px at ≤768 (807) and 155px at ≤480 (808). Only the `!important` one wins.
- An injected "View More Reels" button targets `#nansei-reels-section`, which no longer exists (dead code, index.html:2923-2932). `subNewsletter` exists but there is no newsletter form (index.html:2917). `#certStrip` duplication targets a missing element (index.html:2881).
- "Milling in Motion" (mill section, index.html:2378-2588) says "5 Videos". Card 3's click URL is `https://www.youtube.com/embXcQ` (broken) and its Enter-key URL is `https://www.youtube.com/embed/dQw4w9WgXcQ`. Card 4 is `https://www.youtube.com/eXcQ` / `…/embed/dQw4w9WgXcQ`. **`dQw4w9WgXcQ` is the well-known "Never Gonna Give You Up" placeholder video.** Card 5's click URL uses a mistyped ImageKit bucket `bq9dtore` (Enter-key version uses the correct `bq9dscs4g`). Cards 1 and 2 (featured) both play the same YouTube ID `m0htTSaPPIY`. — index.html:2479-2566 (grep of `openVideoModal(` URLs)
- Gallery ("Moments from Our Fields", 8 bento tiles, index.html:2600-2620) calls `openLightbox(this)`, but the lightbox markup was removed (only `<!-- lightbox-placeholder -->` remains at index.html:1630; CSS for `#lightbox` is still at 2058-2099). The bottom script then throws **"Cannot read properties of null (reading 'addEventListener')" at index.html:4068** (`document.getElementById('lightbox-close')`). User-visible effect: clicking any gallery tile does nothing except throw a second TypeError (`classList` of null), and the Escape key handler calls `closeLightbox()`, which throws too (after closing the video modal, so video-modal Esc still works). Because the error happens on the last lines of that script block, nothing else is lost. — Browser console; index.html:4056-4071
- The gallery reuses images: `field.jpeg` appears twice (2609, 2614) and `…10.14.20 AM.jpeg` twice (2610, 2615). Tile 2614 has two `alt` attributes.
- Perpetual animations running together: 6 floating leaf SVGs in the hero (index.html:1270-1287), two marquees, two ping dots, the hero timer bar (rAF), the scroll-bounce hint, the reels auto-advance, the card float classes `prod-float-1..6` (index.html:2991), a parallax `scroll` listener that also writes to the empty `pbg-1/2` layers (index.html:3448-3463), and a countdown `setInterval`. Only one `prefers-reduced-motion` block exists (index.html:2185), scoped to one later style block.
- Third-party weight: `cdn.tailwindcss.com` runtime compiler (console warns "should not be used in production"), `unpkg.com/lucide@latest` (unpinned version, icons swapped in at runtime from `[[icon:…]]` text markers by index.html:938-1084), Google Fonts loading three families (Cormorant Garamond, Inter, Roboto). — index.html:8, 13, 937; Browser console
- Product packshots are served at full resolution: several ImageKit PNGs are 3375x3375px and others 1080x1080, displayed in 160px-tall (mobile) card frames. The URLs carry no ImageKit `tr=w-…` transform. — Browser (`naturalWidth`)
- Page length: 11,328px at 1440 and 14,601px at 375. — Browser

### Inferences
- Lowest-risk, highest-value: fix or hide the empty reels widget (it's a black box today, and filling `REELS[].src` with the real ImageKit reel URLs would make it work as designed); replace the placeholder and broken video URLs; restore the lightbox markup (the CSS is still there, so the look won't change). None of these change the design.
- Make the offer bars read one shared list so desktop and mobile can't drift, and fix the "?" glyphs. Replacing the midnight-reset countdown with a real end date (or removing it) is a trust and compliance improvement. Removing it **[ALTERS LOOK, minor]**.
- Performance without visual change: add ImageKit width transforms (`?tr=w-400`) to card images; pin the lucide version; add a `prefers-reduced-motion` guard to the leaf, float and marquee animations; stop the parallax handler writing to empty layers. Replacing the Tailwind CDN with a built CSS file has no visible effect, but it's a bigger task.

### Gaps
- Transferred bytes per image and total page weight weren't captured (network log only listed same-origin requests).
- Whether the owner still has the real reel video URLs is unknown; the `src` values are simply empty in this restored version.

---

## 4. Product cards and layout breakage at 375px

### Takeaway
Card styling is consistent (same component everywhere: badge, wishlist heart, category, name, stars, price, strike price, % off, Add to Cart). The data behind it has problems: every product appears twice on the page, there's a duplicate "Natural Fig Powder" with two prices, stock Unsplash photos sit beside branded packshots, ratings and review counts are hard-coded, and badge text is corrupted. No horizontal page scroll was found at 375px.

### Cited Findings
- 34 cards render for 16 unique names: `renderSections()` shows a "new" or "bestseller" row and then each category row, so every product appears twice (sections: new 7, bestseller 10, rice 7, flowers 4, beverages 2, flour 3, other 1). — Browser; index.html:3028-3037, 3069
- "Natural Fig Powder" appears as id 15 (flour, ₹175) and id 16 (other, ₹200) with the same image, so the "Other Products" row holds a single duplicate item. — index.html:2950, 2952
- Header copy hard-codes "16 farm-fresh, certified products" (index.html:2207, 3250). Seventeen products are actually in the array, and API data would change the count.
- Images: rice, flowers and powders use branded ImageKit packshots, while Organic Rose Milk, Hibiscus Sherbet and Idiyappam Flour use generic Unsplash stock photos (index.html:2947-2949). All frames use `object-fit:cover` at a fixed 160px height (mobile), so the image ratio is consistent. — Browser
- Card heights vary within a row (288-305px at 375px) when names wrap to two lines ("Black Urad Dal Health Mix Powder", "Arubatham Kuruvai Rice"), so the Add to Cart buttons don't line up across a row. — Browser
- Badges: "HOT" has a leading space where an emoji was lost (index.html:2996), and "NEW" renders as "? NEW" (index.html:2998). The section label "Natures Favorites" is missing its apostrophe (index.html:3030), and so is the blog heading "Natures Blue Elixir" (index.html:3882).
- Ratings and review counts (for example 4.7 (142), 4.8 (204)) are hard-coded in the static array (index.html:2936-2952). With the API, products show real `numReviews` or "New" (index.html:3494, 2968). "Old prices" are hard-coded too, and the API fallback invents one as `price*1.25` (index.html:3493), so every product always shows a discount.
- Each card shows the discount twice when the badge is "sale" (red "20% OFF" badge plus amber "20% off" pill). — index.html:2999, 3016
- On mobile, the row scroll buttons are hidden (`display:none`) and the rows scroll horizontally, showing about 2 cards (168px each in a 348px track). Good. — Browser
- The wishlist heart on cards is 38x38 (close to target). Add to Cart is 146x26 (too short to tap comfortably). — Browser
- Horizontal overflow: `documentElement.scrollWidth` = 375 at a 375px viewport, so no page-level horizontal scroll. Blog cards overflow (905px content in a 348px `overflow-x:auto` track) on purpose, as a swipe carousel. Note that `body` has `overflow-x:hidden` (computed `overflow: hidden auto`), which can hide real overflow bugs. — Browser
- In `saveCart()` there's a corrupted expression `i.selectedPricei.price` (index.html:2978). It only runs for signed-in users when `CartAPI.set` is missing, and then it throws a TypeError inside the loop. It looks like a lost `??` from the same encoding damage.
- The mid-page stats ("22 Years Organic / 25 Acres / 0 Chemicals / 9 Certifications") drop from 4 columns to 2 on mobile (computed 158px × 2) and the label text is 0.52rem (~8.3px). — index.html:2296-2300, 587-588; Browser

### Inferences
- Data fixes that don't change the card design: remove the duplicate id 16 (or recategorise it); compute "N products" from `products.length`; restore the badge glyphs; replace the Unsplash stock photos with packshots once available; decide whether hard-coded ratings and review counts should show at all before real reviews exist (a consumer-trust and advertising-standards risk; the owner should confirm). Showing each product only once (category rows only, or New/Best Sellers only) **[ALTERS LOOK]**.
- Equal-height card names (`min-height` for two lines on the `h3`, or `-webkit-line-clamp:2`) would line up the buttons with no visible style change apart from the alignment.
- Show the discount once on "sale" cards (badge or pill). **[ALTERS LOOK, minor]**

### Gaps
- What the API-backed catalogue looks like (real images, badges, sections) couldn't be checked because the backend wasn't running. `section` defaults to `'category'` for API items, so the New/Best Seller rows may be empty when API data loads (index.html:3497), and that needs checking against real data.

---

## 5. Consistency of typography, spacing, colour and buttons; dead, duplicate and placeholder content

### Takeaway
The page is a patchwork of eras: Tailwind utility sections (offer bar, Why Choose Us, footer in `bg-gray-900`) sit beside hand-styled serif sections, with three font families, many sub-11px text sizes, off-palette accent colours and several leftover or placeholder blocks. A founder section is still on the page even though the owner had asked for it to be removed.

### Cited Findings
- Fonts: Cormorant Garamond (headings), Inter (body), Roboto (only the Add to Cart buttons, `font-family:'Roboto'`, index.html:3019). — index.html:8, 3019
- Text below 11px at 375px: about 270 text elements, mostly 9.3-10.9px, with 12 at 8.3px and 2 at 8px (for example the mobile "OFFERS" label at 0.52rem, mid-stat labels, slide eyebrows). — Browser measurement; index.html:1168, 588
- Off-palette accents: section label colours per category `#059669`, `#d97706`, `#65a30d`, `#db2777`, `#0891b2`, `#ca8a04` (index.html:3029-3035); badges `#f97316` and `#ef4444`; "Why Choose Us" icon tiles in green, blue, amber and purple Tailwind tints (index.html:2670-2685); admin button `#2563EB`; footer is Tailwind `bg-gray-900` (charcoal, not forest). — index.html
- Buttons use at least five styles: outlined gold hero CTA (square), filled green gradient pill ("Explore the Fields"), forest filled rounded-10 (Add to Cart), outline pill in category colour ("View All"), and footer/blog text links.
- Duplicate copy: "Cultivated in Living Soil, Harvested for Healthy Lives." is both hero slide 4's title (index.html:1330) and the mid-parallax H2 (index.html:2290).
- Inconsistent claims across sections: "22 years of organic farming" (slide, index.html:1319; stats "22 Years Organic"), "25+ Years of Natural Farming" (founder stats, index.html:2649), "over a decade" (Why Choose Us, index.html:2666); "200+ farming families" (slide 5) vs "thousands of farmers and families" (Why) vs "Trusted by farmers everywhere" (footer, index.html:2825); "9 certifications including USDA Organic, Non-GMO & Halal" (index.html:2672) and "24/7 Support" (index.html:2686). Earlier project notes record the 25 acres / 22+ years / 9 certifications figures as needing owner verification.
- Placeholder contact details in the footer: `info@nansaiorganics.com` and `tel:+919999999999` "+91 99999 99999" (index.html:2856-2857). Footer social icons render as plain text "f" and "in" with `href="#"`. — Browser footer text
- **Founder section still present:** `<section id="founder">` "Meet the Farmer — Rooted in the Land He Loves", 1,029px tall at 1440, with a quote, two paragraphs and stats (index.html:2624-2660). Its first body paragraph starts with a blank where the name was removed: `<p class="founder-premium-body"> has tended the same fields…` (index.html:2645). The gallery alt and caption still name "Pichai Murugan" (index.html:2609, 2614). Project memory says the owner had asked for the founder story to be removed, and the Jul 23 restore brought it back. **Flag for the owner, no change made.** Hiding it **[ALTERS LOOK]**, but at minimum the sentence with the missing subject reads as broken.
- Leftover icon marker: one `[[icon:…]]` token remained as literal text in the rendered body after the lucide pass (count = 1). — Browser
- Blog teaser: three cards with hard-coded dates (Mar 12, Feb 28, Feb 5 2026) open an in-page modal (`openBlogArticle`), while the "View All Articles ?" link and nav go to blog.html. — index.html:2696-2785; Browser
- Hidden-but-shipped markup: `#blog-scroll-dots` (display:none), `#reel-tab`, and an unused `#dd-overlay`. — Browser (section list)

### Inferences
- Content and consistency fixes that keep the look: replace the footer placeholders with the real phone and email (earlier project notes list +91 63821 42578 and athanyanis@gmail.com, both "confirm"); make the years, families and certifications numbers agree everywhere; reword or remove "24/7 Support" and "USDA Organic…" unless verified; fix the founder paragraph's missing subject or remove that section per the owner's earlier wish (owner decision).
- Typography: raising the smallest labels (8-9.6px) to at least 11px on mobile would help readability with little visual change. **[ALTERS LOOK, minor]**. Switching the Add to Cart font from Roboto to Inter and dropping Roboto from the font request saves one font family, and the change is hard to see.
- Unifying the category accent colours, Why-icon tints and charcoal footer to forest/gold would make the page more consistent, but it is **[ALTERS LOOK]**, so list it as optional.

### Gaps
- Contrast ratios weren't computed systematically. By inspection, the 0.4-0.58 alpha white text on the hero and mid-parallax (`rgba(255,255,255,.4)`/`.5`, index.html:2293, 2299) and the `#9ca3af` grey on cream are likely below WCAG AA at those small sizes, but this wasn't measured.

---

## 6. Console errors: causes and user-visible effects

### Takeaway
Of the console errors, two matter to users: the null `addEventListener` at line 4068 (lightbox markup missing, so gallery clicks do nothing) and the empty reel video sources (black floating box). The rest are an expected backend failure, an unhandled `play()` promise, and the Tailwind CDN warning.

### Cited Findings
- `Uncaught TypeError: Cannot read properties of null (reading 'addEventListener') at index.html:4068:44`. Cause: `document.getElementById('lightbox-close')` returns null because the lightbox HTML was replaced with `<!-- lightbox-placeholder -->` (index.html:1630). Effect: gallery tiles (index.html:2609-2616) don't open, each click throws again, and the Esc handler throws after closing the video modal. — Browser console; index.html:4056-4071
- `NotSupportedError: The element has no supported sources` / `Failed to load because no supported source was found` (×6-8). Cause: `REELS[].src = ''` (index.html:3728-3731), and the modal `<video id="video-native">` has `autoplay` with no src. Effect: the floating reels widget and modal show black frames with captions only. — Browser console; index.html:2595, 3727-3731
- `AbortError: The play() request was interrupted because video-only background media was paused to save power`. Cause: `v.play()` without `.catch` in the slider (index.html:3402). Effect: harmless noise, though slide 0's advance depends on `onended`.
- `GET http://localhost:5000/api/products?limit=100 net::ERR_CONNECTION_REFUSED`. Cause: the backend isn't running locally. Effect: none visible, because the static product array is used. In production, `window.API_BASE` from js/config.js should point to the deployed API. — Browser network log; index.html:3482-3509
- `cdn.tailwindcss.com should not be used in production` warning. — Browser console
- Not in the console but latent: `i.selectedPricei.price` (index.html:2978) throws for signed-in users when `CartAPI.set` is undefined.

### Inferences
- All of these can be fixed without visual change: restore the lightbox block (its CSS already exists), null-guard the bindings at 4068-4070, fill or guard the reel sources, `.catch()` the `play()` promise, and repair line 2978 (`i.selectedPrice ?? i.price`).

### Gaps
- `js/config.js`, `js/auth.js`, `frontend/js/api.js` and `frontend/js/cart.js` were loaded (all returned 200) but weren't audited line by line. No errors pointed at them.

---

## Priority shortlist (all within the current design unless marked)

1. Fix the dead links: "Farm" (nav, drawer, bottom bar), the footer `#` links, and the missing policy pages. (index.html:1198, 1239, 2790+, 2820+)
2. Replace the placeholder and broken video URLs (Rick Roll `dQw4w9WgXcQ`, `embXcQ`, `eXcQ`, `bq9dtore`). (index.html:2529-2566)
3. Fill the reel `src` values or hide the reels widget until they exist, and put it below the drawer and cart in z-order. (index.html:3727-3731, 800)
4. Restore the lightbox markup so gallery clicks work, which also clears the line 4068 error. (index.html:1630, 4068)
5. Repair the encoding damage: "?" in place of ₹, →, •, —, ✨, emoji, and the apostrophes (118 source lines). Use HTML entities.
6. Replace the footer placeholder phone and email, and make the business claims (years, families, certifications, 24/7) consistent and verified.
7. Fix the product data: duplicate Fig Powder, hard-coded "16 products", stock photos, and hard-coded ratings (owner decision on showing them).
8. Mobile tap targets: enlarge the hit areas of the hamburger, header icons, dots, arrows and Add to Cart (padding only where possible).
9. Hero: give slides 2 and 3 real images, de-duplicate the video slide, move the mute button and "Scroll" hint off the text on mobile **[minor look change]**, and add a `.catch()` and fallback advance.
10. Single source for the offer-bar text, and a real end date for the countdown (or remove it **[ALTERS LOOK]**).
11. Founder section is present (index.html:2624-2660) with a sentence missing its subject. Ask the owner whether it should stay, given the earlier removal request.
