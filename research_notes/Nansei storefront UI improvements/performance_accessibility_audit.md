# Nansei storefront: performance, SEO basics and WCAG 2.1 AA accessibility audit (restored "Jul 23" build)

Method: read-only. Served the repo root with `python -m http.server 8104` and measured in the built-in browser at 375x812 (mobile preset) unless noted. I used Resource Timing (`decodedBodySize`; cross-origin `transferSize` reads 0 because there is no Timing-Allow-Origin), DOM queries, a computed-style contrast walker, and real Tab-key focus tests. Wire sizes came from `curl` with an Android Chrome UA and `Accept: image/avif,image/webp` (2026-11-12). Disk sizes came from `find -printf`. The browser pane was hidden during the tests, so paint timings (FCP/LCP) are not reliable (see Gaps). No project files were changed.

**User constraint (from coordinator): "don't change the existing UI".** Every fix below is tagged **[INVISIBLE]** (no visible change) or **[VISIBLE]** (changes how something looks, even slightly). Visible fixes need the user's sign-off.

Local file references are relative to `C:/Users/DELL/OneDrive/Documents/agri store/`.

---

## Q1. Page weight, request count, images and video

### Takeaway
On mobile, the home page's real weight comes from media, not code. The hero autoplays a **9.57 MB** 60-second video with no poster. Product-card images ship at 1080–3375 px for 166 px slots, about 1.6 MB in total, where a `?tr=w-360` ImageKit transform would cut each by 73–95%. ImageKit already serves WebP automatically, so the gains come from resizing, lazy-loading and adding `width`/`height`. All of these are invisible.

### Cited Findings
**Page-level numbers (measured at 375 px, mobile preset)**

| Page | Raw HTML / gzip | Inline JS | Inline CSS | DOM elements | Resource requests | Decoded bytes fetched (excl. video) |
|---|---|---|---|---|---|---|
| index.html | 207 KB / 48 KB | 69 KB (5 blocks) | 67 KB (11 blocks) | **2,452** | 34 + video | ≈2.5 MB images + ~240 KB JS (wire) |
| product.html?id=1 | 382 KB / 77 KB | **247 KB** (9 blocks) | 87 KB | 1,128 | 8 above the fold | 447 KB |
| checkoutmyorderpage.html | 151 KB / 33 KB | 70 KB | 23 KB | 610 | 14 | 308 KB |
| blog.html | 106 KB / 29 KB | 57 KB | 32 KB | 1,051 | 3 | 44 KB |
| news.html | 69 KB / 18 KB | 28 KB | 24 KB | 532 | 11 | 349 KB |
| login.html | 23 KB / 6 KB | 10 KB | 7 KB | 92 | 2 | small |
| wishlist / account | 52 KB / 98 KB raw | | | redirect to login when logged out | | |

Sources: measured with Python gzip on [pages/*.html](file:///C:/Users/DELL/OneDrive/Documents/agri%20store/pages/) and a browser Resource Timing probe. index.html carries 288 inline `style=` attributes and checkout carries 393.

**Hero video (index.html lines 1291 and 1305)**
- `slide video.mp4` is served by ImageKit as `video/webm`. It measured **9,573,352 bytes** on the wire: 60.47 s, 720×1280. Both slide 0 and slide-video-1 point at the same URL with `autoplay`, there is **no `poster`**, and the second copy also has `loop`. Sources: curl of `https://ik.imagekit.io/bq9dscs4g/agro%20store/videos/slide%20video.mp4?updatedAt=1781177427392`; [pages/index.html:1291,1305](file:///C:/Users/DELL/OneDrive/Documents/agri%20store/pages/index.html).
- `&tr=w-480` returns 5,992,552 bytes (−37%). Adding `q-50` made no difference. ImageKit's `slide video.mp4/ik-thumbnail.jpg?tr=w-720` returns a **60 KB** JPEG frame that can serve as a poster. Source: measured with curl.
- The slider waits for the whole 60 s video to end before it advances from slide 0 (`v.onended=()=>goTo(1)`). Source: [pages/index.html:3397-3407](file:///C:/Users/DELL/OneDrive/Documents/agri%20store/pages/index.html).

**Product-card images (index.html cards are JS-rendered at line 3007; cards measured 166×160 CSS px)**
- 13 unique card images are requested at about 930 ms, even though none are in the first viewport, because lazy loading starts early. Their decoded total is ≈1.62 MB. Natural sizes are 1080×1080 (3.3× the 2×-DPR need) or **3375×3375 (10.2×)** for Arubatham Kuruvai, Natural Fig Powder, Black Urad Dal and Mappillai Samba (each 281–306 KB WebP). Source: measured, browser probe.
- ImageKit already negotiates the format: Fig Powder comes back as 299 KB WebP with a WebP-capable Accept header, and 767 KB JPEG without one. With `?tr=w-360` it is **15.6 KB WebP (−95%)**. Hibiscus is 55 KB, or 15 KB with `?tr=w-360` (−73%). Source: measured, curl.
- ImageKit supports resizing by width through the `tr=w-<px>` query or a `tr:w-<px>` path segment; setting only `w` keeps the aspect ratio. Source: [ImageKit docs: resize & crop](https://imagekit.io/docs/image-resize-and-crop).
- 0 of 55 `<img>` elements on index have `width`/`height` attributes, and the same is true on every other page (grep `wh=0`). Source: measured.
- web.dev recommends adding `width` and `height` to all `<img>` tags to reserve space, and warns against lazy-loading images likely to be in the viewport at load, especially the LCP image. Source: [web.dev: browser-level lazy loading](https://web.dev/articles/browser-level-image-lazy-loading).

**Other oversized or eagerly loaded images on index (none are in the first viewport at 375 px)**
- Video-card thumbnails at lines 2513–2567 have no `loading="lazy"`. `field.jpeg` is 140 KB WebP at 1280×575 but renders at 142×189; `?tr=w-400` gives 17 KB. `thirugai.jpeg` is 90 KB at 1280×576 but renders at 127×169. Source: measured; [pages/index.html:2513-2567](file:///C:/Users/DELL/OneDrive/Documents/agri%20store/pages/index.html).
- The three blog-teaser Unsplash images (lines 2717, 2733, 2749) are `w=700`, eager, 39, 81 and 103 KB decoded, and render 291 px wide. Source: measured.
- CSS backgrounds: an Unsplash `w=1400&q=85` image of **323 KB AVIF** (parallax layer, line 2271) and a 98 KB WebP WhatsApp photo (line 1337). Source: measured, curl.
- product.html: the "Watch & Learn" hero is Unsplash `w=1200` at 261 KB, eager (line 4434). The main product image is 1080 px, rendered at 375 px (fine for 2–3× DPR). The page loads both `nansei organics.png` (21 KB) and `nansei_org_logo.svg` (19 KB, 583×433 rendered at 75×56). Source: measured.

**On disk (repo root is the Netlify publish dir, `publish = "."`)**
- `images/` is 15 MB. The tree holds 43 PNG, 1 JPEG and **0 WebP/AVIF**. Most product PNGs are 1.0–1.24 MB and are duplicated across `product/Rice category/…`, `images/images/Rice category/…` and `Flower/…`. The largest file is `images/images/thirukai/1776950241632.png` at 1.69 MB. Source: measured with `find -printf`.
- **`product/Rice category.zip` (12.3 MB)** sits in the published root, so it is publicly downloadable. Source: measured; [netlify.toml](file:///C:/Users/DELL/OneDrive/Documents/agri%20store/netlify.toml).

**Caching (netlify.toml)**
- All `*.html` gets `Cache-Control: no-cache, no-store, must-revalidate`. `/js/*.js` gets `max-age=31536000, immutable`, but the pages link unfingerprinted URLs such as `../js/config.js`, so returning visitors can keep stale JS for up to a year after a deploy. Source: [netlify.toml](file:///C:/Users/DELL/OneDrive/Documents/agri%20store/netlify.toml); [pages/index.html:9-12](file:///C:/Users/DELL/OneDrive/Documents/agri%20store/pages/index.html).
- Browsers have historically excluded pages served with `Cache-Control: no-store` from the back/forward cache; Chrome is working on changing this. Source: [web.dev: bfcache](https://web.dev/articles/bfcache).
- Core Web Vitals "good" thresholds are LCP ≤ 2.5 s, INP ≤ 200 ms and CLS ≤ 0.1, assessed at the 75th percentile, separately for mobile and desktop. Source: [web.dev: Web Vitals](https://web.dev/articles/vitals).

### Inferences
- A 9.57 MB autoplay video can easily use more data than the rest of the page combined on a 4G phone. Because slide 0 waits for the video to end, a slow connection also stalls the whole slider. The biggest invisible win is to re-encode the video (target 1–2 MB, 480–540 px wide, shorter, or a 10–15 s loop), add the 60 KB `poster`, and set `preload="none"` plus deferred `src` on the second copy (slide-video-1) so it only loads when that slide becomes active.
- Adding `?tr=w-360` (or `srcset` with `w-360`/`w-540`) to the ImageKit URLs in the product data could cut about 1.4 MB from index and from the "You may also like" rows on product.html. It is invisible, because 360 px still covers a 166 px slot at 2× DPR.
- Without `width`/`height`, or an `aspect-ratio` on the wrapper, JS-rendered cards risk layout shift. Most card containers have fixed CSS heights, which may be why CLS measured 0 here (see Gaps).
- Moving the 12 MB zip and the duplicate PNG trees out of the publish directory has no UI effect. It reduces deploy size and stops public exposure of source assets.
- Changing `no-store` to `no-cache` on HTML keeps "always fresh" behaviour, likely restores bfcache for instant back navigation, and is invisible.

### Gaps
- I could not get real throttled-4G LCP/FCP. The pane was hidden, the recorded FCP of 9,088 ms is an artefact, and no LCP entries were produced. Run Lighthouse or PageSpeed Insights mobile on the Netlify URL to get field-comparable numbers.
- Cross-origin `transferSize` reads 0, so per-page wire totals for images are approximations from decoded sizes and curl.
- I did not verify whether the two `<video>` elements with the same src download the stream twice.
- Font file (woff2) byte totals were not measured.
- I found no reliable cited source for typical Indian mid-range Android/4G throughput in this session.

---

## Q2. Render-blocking resources, third-party scripts, DOM size

### Takeaway
Every page blocks first render on the **Tailwind Play CDN** (126 KB on the wire, and it generates CSS at runtime), plus synchronous **unpinned `lucide@latest`** (114 KB) and several synchronous local scripts. Tailwind's docs say the Play CDN is not for production. index.html has **2,452 DOM elements**, well over Lighthouse's 1,400-node error level.

### Cited Findings
- index.html `<head>` has 6 synchronous scripts and 0 with `async`/`defer`: `config.js`, `auth.js`, `frontend/js/api.js`, `frontend/js/cart.js` and `https://cdn.tailwindcss.com` (lines 9–13), with Google Fonts CSS on line 8. `lucide@latest` follows at line 937, synchronous mid-body. Chrome's `renderBlockingStatus` reported 7 blocking resources: the fonts CSS, the 4 local JS files, Tailwind and Lucide. Source: measured; [pages/index.html:8-13,937](file:///C:/Users/DELL/OneDrive/Documents/agri%20store/pages/index.html).
- A second Google Fonts stylesheet is pulled in with `@import` inside a `<style>` block at index.html:1763 (Cormorant 300–600 plus DM Sans 300/400/500). An `@import` is discovered late and fetched serially. Source: [pages/index.html:1763](file:///C:/Users/DELL/OneDrive/Documents/agri%20store/pages/index.html).
- Wire sizes (curl, compressed): `cdn.tailwindcss.com` 126,354 B (redirects to `/3.4.17`, `max-age=14400`); `unpkg.com/lucide@latest/dist/umd/lucide.min.js` 114,266 B (302 to `lucide@1.72.0`, `Cache-Control: max-age=60`); `checkout.razorpay.com/v1/checkout.js` 51,570 B. Source: measured.
- "The Play CDN is designed for development purposes only, and is not intended for production." Source: [Tailwind CSS docs: Play CDN](https://tailwindcss.com/docs/installation/play-cdn).
- The Tailwind CDN is used by index (line 13), product (line 57, `?v=3`), checkout (line 11), wishlist (line 10), account (line 7) and news (line 8). Lucide is on 8 pages. Source: grep of [pages/](file:///C:/Users/DELL/OneDrive/Documents/agri%20store/pages/).
- checkoutmyorderpage.html loads Razorpay `checkout.js` synchronously in `<head>` (line 13), before the user reaches the payment step. Source: [pages/checkoutmyorderpage.html:13](file:///C:/Users/DELL/OneDrive/Documents/agri%20store/pages/checkoutmyorderpage.html).
- Third-party origins on index: fonts.googleapis.com, fonts.gstatic.com, cdn.tailwindcss.com, unpkg.com, ik.imagekit.io and images.unsplash.com (YouTube loads only in the modal). index has **no `preconnect`** at all. Checkout preconnects to fonts.googleapis.com but not to fonts.gstatic.com. Source: grep; measured.
- DOM size: index 2,452 elements (scroll height 14,638 px at 375 px), product 1,128, blog 1,051, checkout 610, news 532, login 92. Source: measured. Lighthouse warns at more than about 800 body nodes and errors at more than about 1,400. Source: [Chrome Lighthouse: DOM size](https://developer.chrome.com/docs/lighthouse/performance/dom-size).
- product.html carries **247 KB of inline JS** across 9 blocks, which is parsed on every product view. Source: measured.
- On localhost (no throttling, desktop), DOMContentLoaded was 902 ms and load 1,630 ms. Source: measured with the Navigation Timing API.

### Inferences
- Replacing the Play CDN with a prebuilt, purged Tailwind CSS file at the same v3.4 config removes about 126 KB of blocking JS and the runtime style generation, which helps both LCP and INP. It **should be invisible if all classes are captured**, but classes assembled in JS template strings (cards and modals) may be missed. Treat it as **[INVISIBLE-with-risk]**: safelist dynamic classes and screenshot-diff every page at 375, 768 and 1440 px before shipping.
- Pin Lucide to a fixed version (for example `lucide@1.72.0`) and add `defer`. That removes the 302 hop and the 60-second cache, and stops surprise visual changes when "latest" moves. Better still, inline the few SVG icons actually used. Invisible.
- Add `defer` to `config.js`, `auth.js`, `api.js` and `cart.js` only after checking the inline scripts that call them. Many inline blocks expect globals synchronously, so this needs testing, but it has no visual effect.
- Merge the two Google Fonts requests into one `<link>` and drop the `@import`. Add `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`. Invisible.
- Load Razorpay on demand (inject the script when "Pay" is pressed) or with `defer`. Invisible.
- The DOM size comes from duplicated product rows: the same products render under New, Bestseller, Rice, Flowers and Beverages, and the 5 hero slides plus 8 reel videos are all in the DOM. Rendering offscreen rows lazily, or adding `content-visibility:auto` with `contain-intrinsic-size` to below-fold sections, is invisible.

### Gaps
- Lighthouse TBT/INP were not measured. The main-thread cost of the Tailwind runtime on a mid-range Android phone is not quantified here.

---

## Q3. Fonts

### Takeaway
index.html loads **12 font faces from 4 families** (Cormorant Garamond ×6, Inter ×4, DM Sans ×3, Roboto ×1) via two separate Google Fonts requests. All use `display=swap`, so text is never invisible, but there is more font weight than needed and swap may shift layout.

### Cited Findings
- Faces loaded on index (`document.fonts`, status "loaded"): Cormorant Garamond 600, 700, 700 italic and 300 italic; Inter 400, 600, 700, 900; Roboto 700; DM Sans 300, 400, 500. Source: measured.
- Requests: `<link>` at index.html:8 (Cormorant 400/600/700 and italics, Inter 400/600/700/900, Roboto 500/700, `&display=swap`) and `@import` at line 1763 (Cormorant 300–600, DM Sans 300/400/500, `&display=swap`). The first CSS file declares 71 `@font-face` rules across subsets; only the needed subsets download. Source: [pages/index.html:8,1763](file:///C:/Users/DELL/OneDrive/Documents/agri%20store/pages/index.html); curl.
- Other pages request differing sets: checkout adds DM Mono, wishlist and news add Inter 300/500, and login uses Cormorant plus DM Sans 400–700. Source: grep of page heads.

### Inferences
- Remove weights that are requested but not loaded (Inter 900 and Roboto, if unused after a check) and unify into a single request per page. That is invisible as long as the used weights stay.
- With `font-display: swap`, Cormorant's metric differences from the fallback serif can shift headings. Adding `size-adjust` fallback `@font-face` rules is invisible.

### Gaps
- Total woff2 bytes were not measured, and I did not check whether Roboto or Inter 900 are actually rendered anywhere.

---

## Q4. SEO basics

### Takeaway
None of the 11 HTML pages has a meta description, Open Graph tags, a canonical, a favicon or JSON-LD. There is no robots.txt or sitemap.xml. Several footer links point to pages that don't exist; on Netlify these resolve to the homepage with HTTP 200 (soft 404s). The brand is spelled three ways in titles and copy. Every fix here is invisible on the page.

### Cited Findings
- `<meta name="description">`: 0 of 11 pages. `og:*`: 0. `rel=canonical`: 0. `application/ld+json`: 0. `rel="icon"`: 0 on every page, including index, product and checkout. Source: grep and DOM probe of [pages/](file:///C:/Users/DELL/OneDrive/Documents/agri%20store/pages/).
- No `robots.txt` or `sitemap.xml` anywhere (local request returns 404). netlify.toml ends with a `/* → /pages/index.html 200` fallback, so on Netlify `/robots.txt`, `/sitemap.xml` and any missing URL will return the homepage HTML with status 200. Source: [netlify.toml](file:///C:/Users/DELL/OneDrive/Documents/agri%20store/netlify.toml); measured with curl locally.
- Broken internal links from index: `farm.html` (×3), `privacy-policy.html`, `refund-policy.html` and `terms-and-conditions.html` (×2 each). None of these files exist in `pages/`, even though netlify.toml routes `/refund-policy` and the others to them. `admin-panel.html` is linked from the index footer. Source: grep of [pages/index.html](file:///C:/Users/DELL/OneDrive/Documents/agri%20store/pages/index.html); `ls pages`.
- Titles: index "Nansai -Experience the Root of Nature"; product static "Product NANSAI" in HTML, replaced by JS with "Karunguruvai Rice | NANSAI"; checkout "NANSEI Organics Checkout"; login "Nansei Organics - Authentication"; video-reels "Video Reels Component". The footer reads "© 2026 NANSEI Organics" while the logo alt is "Nansai Organics". Source: measured.
- Headings: index's only `<h1>` is mid-page ("Bringing Nature's Best To Your Family"), and the 5 hero slide titles are `<h2>`. blog, news, wishlist and video-reels have **no `<h1>`**. account has **6 `<h1>`s**. product has a correct single H1 (product name). Source: measured, grep.
- Product URLs are `product.html?id=N`, the links are built in JS template strings (index.html:3001 and 3155), and product content is injected client-side (product.html:7175 reads `id`). Source: grep.
- Google requires `name` plus one of `review`, `aggregateRating` or `offers` for Product snippets. Google supports JS-generated Product markup but recommends putting it in the initial HTML, because dynamic markup can make Shopping crawls less frequent and less reliable. Source: [Google Search Central: Product snippet](https://developers.google.com/search/docs/appearance/structured-data/product-snippet).
- Alt text issues: three blog teasers use `alt="Blog"` (index.html:2717, 2733, 2749); index.html:2614 has two `alt` attributes on one `<img>`; product thumbnails have no `alt` (3 images); the main product image is `alt="Product"` (product.html:3913); lightbox and modal images have `src="" alt=""`. Most product-card alts are good (product names). Source: measured.
- The footer shows placeholder contact details "+91 99999 99999" and "info@nansaiorganics.com". Source: measured page text, index footer.

### Inferences
- Add to every page (invisible): a unique `<title>` with one consistent brand spelling, a `<meta name="description">`, OG and Twitter tags (`og:image` from ImageKit at 1200×630), `<link rel="canonical">` and a favicon. On product pages, a `Product` JSON-LD with `name`, `image`, `offers.price` and `priceCurrency="INR"`, ideally pre-rendered per product. With only `?id=` and JS injection, at minimum emit it in JS.
- Add a real `robots.txt` (disallow `/pages/admin-panel.html`, `/pages/account.html`, `/pages/checkoutmyorderpage.html`), a `sitemap.xml`, and `noindex` on the admin, account, wishlist, checkout and login pages. Change the catch-all to a real 404 page with status 404 to stop soft 404s. Invisible.
- Fix or remove the 4 broken link targets. Restoring the policy pages also matters for payment-gateway and consumer-law compliance (inference).
- Promote the visual hero title to `<h1>`, or keep it as is but demote others, without CSS change: style is class-based, so swapping the tag while keeping its classes is invisible if no tag selectors depend on it (check `h1`/`h2` rules first).

### Gaps
- I did not test how Googlebot renders the JS-injected product pages (no URL Inspection access).

---

## Q5. Accessibility (WCAG 2.1 AA)

### Takeaway
Keyboard focus rings are present (2px solid #4E7A68), and login.html is a good model, with all fields labelled and `autocomplete` set. The main failures are:
- **56 unnamed icon buttons** on index (hearts, slider dots, arrows, search, hamburger) and 30 on product.
- **Gold text on light backgrounds** at 2.1–2.9:1.
- Several grey and green small-text and badge colours that fail 4.5:1.
- **Auto-advancing hero, reels and marquee with no pause control**, and reduced-motion support that covers only reveal effects.
- **40 click-only `div`/`span` elements**.
- Checkout fields whose visible labels aren't programmatically associated.
- No `<main>` and no skip link.

### Cited Findings
**Contrast (computed with the WCAG relative-luminance formula, measured on rendered elements and palette tokens)**
- WCAG 1.4.3 requires 4.5:1 for normal text, and 3:1 for large text (≥ 24 px, or ≥ 18.66 px bold). Source: [WCAG 2.1 Understanding 1.4.3](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html).
- Gold `--gold #c9a84c`: **2.29:1 on white, 2.08:1 on cream #f7f4ee**. Gold-dk `--gold-dk #b8922a`: **2.92:1 on white, 2.66:1 on cream**. Gold on forest-deep #0f2218 is **7.28:1 (passes)**, and gold-lt #e8c97a on forest-deep is 10.35:1. Source: calculation from tokens at [pages/index.html:40-58](file:///C:/Users/DELL/OneDrive/Documents/agri%20store/pages/index.html).
- Where gold or gold-dk is text on a light background:
  - Small uppercase eyebrows at 10–11 px: index.html:2385, 2425, 2631, 2702, and "Thirugai Milling" measured at 2.92:1.
  - The `.nav-logo-brand em` logo accent (index.html:107).
  - Checkout totals `color:var(--gold)` at 20.8 px bold (checkoutmyorderpage.html:682, 853, 936), at **2.29:1, which fails even the 3:1 large-text rule**.
  - `.step-label.done` and the "You're saving" text in gold-dk (checkout lines 74 and 940).
  - "Our Philosophy" in `rgba(232,201,122,.75)`, measured at 1.42 where the walker found a white background. That may be a false positive if the section has an image or gradient background.
  Source: grep; measured.
- Other measured failures on index at 375 px:

  | Element | Colours | Ratio |
  |---|---|---|
  | `.rating-text` "4.5 (87)" (0.6rem ≈ 9.6 px, line 539) | #9ca3af on white | **2.54** |
  | Dates and blog excerpts | `--text-lt` #7a9980 on white | 3.14 |
  | Category tag "rice" | #16a34a on white | 3.30 |
  | "Read More" (12 px) | `--forest-leaf` #4a8c5c | 4.04 |
  | Hero eyebrow "With Nansai" | #4e7a68 on #0a100b | 3.95 |
  | Footer copyright and tagline (line 2672) | #6b7280 on #111827 | 3.67 |
  | Coupon "Copy" chip | white on #f59e0b | **2.15** |
  | "HOT" badge | white on #f97316 | 2.80 |
  | Cart badge (9 px) | white on #ef4444 | 3.76 |
  | "Scroll" label (8 px) | rgba(255,255,255,.35) | 3.18 |

  Source: measured with a computed-style walker.

**Names, roles, labels**
- index has **56 visible `button`/`a` elements without an accessible name**: the wishlist hearts (`toggleWish(...)`, line 3004), the 5 hero dots (`<button class="dot">`, line 1353), the row scroll arrows, the search button (line 1191) and the hamburger `#mobHam` (line 1227, which also has no `aria-expanded`). product has 30 (thumbnail buttons and `relToggleWish`). Source: measured. WCAG 4.1.2 requires every UI component to have a programmatically determinable name and role. Source: [WCAG 2.1 Understanding 4.1.2](https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html).
- Search inputs `#searchInput` (index.html:1190) and `#mobSearchInput` (line 1255), and `#prodSearchInput` on product, use a placeholder only, with no label. Source: measured.
- Checkout: 23 of 24 form controls have no programmatic label. The visible `<label class="field-label">Full Name *</label>` is not tied to `<input id="coName">` (no `for=`; checkoutmyorderpage.html:565-566). The shipping fields do have correct `autocomplete` tokens (name, tel, postal-code, address-line1/2, address-level1/2). The billing fields `bFName…bPin` have none. Source: measured; [pages/checkoutmyorderpage.html:565](file:///C:/Users/DELL/OneDrive/Documents/agri%20store/pages/checkoutmyorderpage.html). See [WCAG 2.1 Understanding 1.3.1](https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html) and [3.3.2](https://www.w3.org/WAI/WCAG21/Understanding/labels-or-instructions.html).
- login.html: all 7 inputs are labelled with correct `autocomplete` values (email, current-password, new-password, given-name, family-name). Source: measured.

**Keyboard and focus**
- Focus is visible. Real Tab presses produced `:focus-visible` with `outline: 2px solid rgb(78,122,104)` on buttons (and `rgb(101,163,13)` on "View All"). #4E7A68 on the dark hero is 3.95:1, which passes the 3:1 non-text contrast rule. Source: measured. See [WCAG 2.1 Understanding 1.4.11](https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html).
- 40 `div`/`span`/`li`/`img`/`article` elements on index have `onclick` and no `tabindex`, so they are unreachable by keyboard. The bento gallery items (lines 2609–2616) do have `tabindex="0" role="button"` with Enter handling, which is a good pattern to copy. Source: measured; grep.
- `toggleMobDrawer()` only toggles `display` and body overflow. It does not move focus, set `aria-expanded`, trap focus or close on Escape (index.html:3568-3576). The video modal has `role="dialog" aria-modal="true"`, but I found no code that focuses into it. The only `.focus()` call on index is for the search input (line 3321). Source: [pages/index.html:3568](file:///C:/Users/DELL/OneDrive/Documents/agri%20store/pages/index.html).
- A global `keydown` listener moves the hero slider on ArrowLeft/ArrowRight from anywhere, including while the user types in the search box (index.html:3425). Source: grep.
- No `<main>` landmark on any probed page (index, product, checkout) and no skip link. index has 1 `<header>`, 2 `<nav>` and 1 `<footer>`. Source: measured. WCAG 2.4.1 requires a way to bypass repeated blocks. Source: [WCAG 2.1 Understanding 2.4.1](https://www.w3.org/WAI/WCAG21/Understanding/bypass-blocks.html).
- `<html lang="en">` is set on all pages, and the viewport meta does not disable zoom (no `maximum-scale` or `user-scalable`). Source: grep.

**Motion**
- The hero auto-advances every 5 s (`DUR=5000`, index.html:3360), and slide 0's video plays 60 s. There are prev/next/dots controls but **no pause**. The floating reels widget auto-advances every 6 s (`INTERVAL=6000`, line 3735). The announcement bar runs an infinite marquee (line 232), and there are 21 `infinite` CSS animations (floating leaves and similar). Source: grep.
- `prefers-reduced-motion` appears only once on index (line 2185, covering `.reveal`, video thumbnails and masonry images). It is absent from product, checkout and all other pages. Source: grep.
- WCAG 2.2.2 (Level A) requires a way to pause, stop or hide auto-moving content that lasts more than 5 s and runs alongside other content. Source: [WCAG 2.1 Understanding 2.2.2](https://www.w3.org/WAI/WCAG21/Understanding/pause-stop-hide.html).

**Tap targets**
- 22 targets under 24 px on index at 375 px: hero dots are **7×7 px** (active 9×9); footer links are 19 px tall; nav badges are 18 px. product has 26, including a 20×30 close "×" and 18×18 count badges. Source: measured.
- WCAG 2.1 AA has no target-size criterion; 2.5.5 Target Size is AAA (44×44 px). WCAG 2.2 adds 2.5.8 at AA, requiring 24×24 px or sufficient spacing. Source: [WCAG 2.1 Understanding 2.5.5](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html); [WCAG 2.2 Understanding 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

**Text glitches that affect assistive tech**
- Rendered index text shows "?" where "₹" or an arrow belongs: "Free Delivery on Orders Above ?999", "Save ?221", "EXPLORE PRODUCTS ?", "SHOP NOW ?", and the reels prices `'?180'` at line 3726. That is 14 occurrences in index source. Other pages use "₹" correctly. Screen readers announce "question mark". Source: measured page text; grep.

**How API failure degrades (backend not running)**
- index still renders the catalogue from inline data; there was one failed request to `localhost:5000`. wishlist.html and account.html redirect to login.html. Checkout shows an empty cart ("0 items", ₹0) with no error message. product.html shows no visible error. Source: measured.

### Inferences
**Invisible fixes**
- `aria-label`s on all icon buttons, for example "Add Karunguruvai Rice to wishlist" plus `aria-pressed`, "Go to slide 2", "Search", "Open menu" plus `aria-expanded`.
- `for`/`id` links on the checkout labels, and visually-hidden `<label>`s on the search fields.
- `autocomplete` on the billing fields.
- `<main>`, plus a skip link that is visually hidden until focused.
- `tabindex="0" role="link"` or `role="button"` with Enter/Space handlers on the 40 click-only elements (or wrap them in `<a>`).
- Focus management and Escape handling for the drawer and modals.
- Ignore arrow keys when `event.target` is an input.
- Better alt text for blog and thumbnail images, `alt=""` on decorative images, and removal of the duplicate `alt` at line 2614.
- Wrap the remaining animations, the marquee, reels autoplay and hero auto-advance in `@media (prefers-reduced-motion: reduce)` / `matchMedia` checks. This only changes behaviour for users who asked for less motion.
- Enlarge tap areas with a transparent `::before` (for example `inset:-8px`) on the dots, close "×" and badges.

**Visible fixes (need user sign-off)**
- To satisfy 2.2.2 for everyone, the hero, reels and marquee need a **visible pause/play control**. A small icon next to the existing dots, styled like the existing `#slide0-sound-btn`, would keep the look consistent.
- Pause-on-hover/focus is invisible but does not fully satisfy 2.2.2 on touch devices.

**Contrast fixes within the palette (all visible shade shifts)**
- Use gold (#c9a84c / #e8c97a) only on forest-green or dark backgrounds, where it passes.
- For gold text on white or cream, use a deeper gold: #8a6d1f gives 4.90:1 on white but 4.46:1 on cream, just under 4.5. #7a5f17 gives 5.50:1 on cream. Alternatively, switch the text to forest-deep #0f2218 (15.15:1 on cream) and keep gold as an underline, border or marker.
- Checkout totals: forest-deep text or #7a5f17.
- Greys and greens: #9ca3af to #6b7280 (4.83), #7a9980 to #5f7d65 (4.56), #16a34a to #15803d (5.02), #4a8c5c to #3d7a4e (5.13).
- Footer #6b7280 to #9ca3af on #111827 (6.99).
- Badges: amber #f59e0b to #b45309 (5.02), orange #f97316 to #c2410c (5.18), red #ef4444 to #dc2626 (4.83).

**Restoring "₹" and "→" in index** is visible, but it corrects a rendering bug rather than changing the design.

### Gaps
- I did not run a screen reader (NVDA/TalkBack), so the reading order and announcement quality of the JS-rendered cards are unverified.
- The contrast walker returns white when an ancestor uses a background image or gradient. The "white on white" results for the "Cultivated in Living Soil" section (stats "22", "Years Organic") are probably false positives and need a manual check.
- Product-page and checkout contrast were not walked element by element. The gold-total failure comes from source tokens.

---

## Q6. Prioritized fix list (each tied to a file/line or measured number)

### Takeaway
The top five, all invisible:
1. Shrink the 9.57 MB hero video and add its 60 KB poster.
2. Add `?tr=w-360` and `width`/`height` to product images (about 1.4 MB saved).
3. Replace the Tailwind Play CDN and pin and defer Lucide.
4. Add accessible names and labels (56 + 30 unnamed controls, 23 unlabelled checkout fields).
5. Add the missing SEO meta, robots/sitemap and a real 404.

Contrast and pause-control fixes are the only ones that visibly change the UI.

### Cited Findings
All numbers come from the measurements cited in Q1–Q5 (local files and curl). Thresholds come from [web.dev Web Vitals](https://web.dev/articles/vitals), [Lighthouse DOM size](https://developer.chrome.com/docs/lighthouse/performance/dom-size), [WCAG 2.2.2](https://www.w3.org/WAI/WCAG21/Understanding/pause-stop-hide.html), [WCAG 1.4.3](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html), [WCAG 4.1.2](https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html), [Tailwind Play CDN](https://tailwindcss.com/docs/installation/play-cdn) and [Google Product snippet](https://developers.google.com/search/docs/appearance/structured-data/product-snippet).

### Inferences
| # | Pri | Fix | Where / evidence | UI impact |
|---|---|---|---|---|
| 1 | P0 | Re-encode the hero video to ≈1–2 MB (480–540 px wide, shorter loop); add `poster` (ImageKit `ik-thumbnail.jpg`, 60 KB); `preload="none"` plus lazy `src` on the slide-video-1 copy | index.html:1291, 1305; 9,573,352 B measured | INVISIBLE (the poster shows the first frame instead of a blank before playback) |
| 2 | P0 | Append `?tr=w-360` (cards) or a `srcset` 360/540 to ImageKit product URLs in the catalogue data; `?tr=w-400` for video-card thumbnails | Cards 3375² and 1080² in 166 px slots; Fig 299→15.6 KB, Hibiscus 55→15 KB | INVISIBLE |
| 3 | P0 | Add `width`/`height` (or a wrapper `aspect-ratio`) to every `<img>`; `loading="lazy"` on below-fold thumbnails and blog teasers | 0/55 imgs sized; index.html:2513-2567, 2717-2749 | INVISIBLE |
| 4 | P0 | Accessible names: `aria-label` on hearts, dots, arrows, search, hamburger (+`aria-expanded`); label the search inputs; `for`/`id` on checkout labels; billing `autocomplete` | 56 unnamed on index, 30 on product; checkout 23/24 unlabelled (line 565) | INVISIBLE |
| 5 | P0 | SEO meta on all pages (title with one brand spelling, description, OG, canonical, favicon); Product JSON-LD; robots.txt and sitemap.xml; `noindex` on account, checkout, admin, login and wishlist; real 404 instead of the `/*` 200 fallback | 0/11 pages have any; netlify.toml catch-all | INVISIBLE |
| 6 | P1 | Replace the Tailwind Play CDN with a prebuilt CSS file (v3.4 config, safelist JS-built classes) | 126 KB blocking JS on 6 pages | INVISIBLE-with-risk: screenshot-diff required |
| 7 | P1 | Pin `lucide@1.72.0` and add `defer` (or inline the used SVGs); merge the font requests and drop the `@import` (line 1763); `preconnect` to fonts.gstatic; lazy-load Razorpay | 114 KB, 302 hop, max-age=60; checkout line 13 | INVISIBLE |
| 8 | P1 | Fix broken links: farm.html, privacy-policy, refund-policy, terms-and-conditions; remove the admin-panel link from the public footer | index footer | INVISIBLE (links stay; targets exist) |
| 9 | P1 | Keyboard: make the 40 click-only elements focusable; drawer and modal focus management plus Escape; `<main>` and a skip link; scope ArrowLeft/Right to the slider | index.html:3425, 3568 | INVISIBLE (the skip link shows only on focus) |
| 10 | P1 | Reduced motion: extend `prefers-reduced-motion` to the marquee, floating leaves, hero auto-advance and reels autoplay | index.html:232, 2185, 3360, 3735 | INVISIBLE for default users |
| 11 | P1 | **Pause/play control** for the hero, reels and marquee (WCAG 2.2.2, Level A) | No pause exists | **VISIBLE** (small icon; match the `#slide0-sound-btn` style) |
| 12 | P1 | **Contrast:** gold text only on dark green; on light backgrounds use #7a5f17 or forest-deep; checkout totals; grey, green and badge shade steps listed in Q5 | 2.08–2.92:1 gold on light; 2.15–4.04 others | **VISIBLE** (shade shifts within the palette) |
| 13 | P2 | Tap areas: invisible `::before` hit-area expansion on 7 px dots, the 20 px close and 18 px badges | 22 targets on index, 26 on product under 24 px | INVISIBLE |
| 14 | P2 | Restore "₹" and "→" glyphs (14 "?" occurrences in index) | index.html:1297, 3726 and others | **VISIBLE** (corrects a bug) |
| 15 | P2 | Netlify headers: HTML `no-cache` instead of `no-store` (bfcache); fingerprint or `?v=` the JS URLs, or drop `immutable`; long cache for `/pages/*.svg` and `*.png` | netlify.toml | INVISIBLE |
| 16 | P2 | Cut DOM size (2,452 elements): `content-visibility:auto` on below-fold sections; render duplicate product rows on demand | index.html | INVISIBLE |
| 17 | P2 | Remove the 12.3 MB `product/Rice category.zip` and duplicate PNG trees from the publish dir (or publish only `pages/`, `js/`, `frontend/`) | 15 MB images/, 0 WebP on disk | INVISIBLE |
| 18 | P2 | Alt text: replace `alt="Blog"` ×3, fix the duplicate alt (line 2614), the main image `alt="Product"`, and add thumbnail alts | index.html:2614, 2717-2749; product.html:3913 | INVISIBLE |
| 19 | P2 | Heading outline: one H1 per page (blog, news and wishlist have none; account has 6) by swapping tags while keeping classes | measured | INVISIBLE if no tag-based CSS (check first) |
| 20 | P2 | Replace the placeholder phone "+91 99999 99999" and email in the footer | index footer | **VISIBLE** (text content) |

### Gaps
- The impact of each fix on field LCP/INP is estimated, not measured. Re-measure with PageSpeed Insights (mobile) on the deployed URL after fixes 1–3 and 6–7.
