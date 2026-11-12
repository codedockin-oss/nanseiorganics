# Blog and news pages: audit and redesign recommendation (Nansei Organics)

Method and caveats:
- I read `pages/blog.html`, `pages/news.html`, `backend/routes/blogRoutes.js`, `backend/routes/newsRoutes.js`, `backend/models/Blog.js`, `backend/models/News.js`, the blog/news parts of `pages/admin-panel.html`, `js/config.js`, and the product catalogue in `pages/product.html` and `pages/index.html`.
- I served the repo with `python -m http.server 8113 --bind 127.0.0.1` and measured both pages in the built-in browser at 1440x900 and 375x812 with `javascript_tool`. The server is stopped. The backend was not running.
- **The files were edited in parallel while I worked.** Another session replaced the inline header, mobile drawer, bottom bar and footer of both pages with `<script src="../js/site-shell.js" data-part="header|footer">` (uncommitted; `blog.html` went from 1941 to 1817 lines and `news.html` from 1496 to 1416).
  - **Line numbers below are for the current working copy**, re-checked with grep after that edit.
  - Findings about the old header, footer and bottom bar ("observed") describe the version I loaded in the browser. The shared shell may already supersede them.
- "Observed" means reproduced in the browser. "Code" means read from source.
- **Re-check with the new shared shell** (after the coordinator's note; port 8113, 375 px):
  - Both pages render with the site-shell header, menu, bottom bar (Home/Shop/Blog/News/Cart) and footer, with no horizontal scroll.
  - The shell's search is "Search products...", and `#blogSearchInput` no longer exists, so **the blog has no article search**.
  - The first blog card now starts at y≈785 px, below the fold behind the bottom bar, because the carousel still fills the first screen.
  - Neither page has an H1.
  - News still has `window.API_BASE` undefined, so it still calls localhost:5000.
  - The news featured title is still clipped 13 px above its card.
  - Everything below about page content, data, modals and claims still applies. Ignore findings about the old inline navs.
- Earlier work in `reports/Nansei storefront UI improvements.md` (rows 20, 32, 44) and `research_notes/Nansei storefront UI improvements/` already covers alt text, missing H1s, the USDA/award claims and blog CTAs. This file expands on those and does not repeat their general D2C findings.

## 1. What is on each page now, where content comes from, what is broken, which claims are unverifiable

### Takeaway
Both pages are hard-coded, single-URL JavaScript apps.
- The blog has 18 articles and the news page has 8 items, all dated Jan–Apr 2026 (7–10 months stale as of Nov 2026).
- Every article opens in a modal, so no article has its own URL, title or meta tags.
- The admin panel publishes to `/api/blogs` and `/api/news`, but the blog never reads the API. The news page tries `http://localhost:5000/api/news`, which can only work on a developer's machine. **Admin-published content therefore never reaches shoppers.**
- The news page is mostly invented corporate PR: USDA certification, an award, ISO 22000, 200 families, a school programme and a soil report. It contradicts the farm's real location and the product pages.
- The blog makes disease-treatment claims (blood pressure, diabetes, anaemia, gestational diabetes) under unverified "Dr." bylines. These are risky under FSSAI's advertising rules.

### Cited Findings

**Blog page: structure** (blog.html, current working copy)
- Order on the page:
  - 3D "Featured Articles" carousel (`blog.html:995-1010`).
  - Nine filter pills: All, Rice Varieties, Dried Flowers, Beverages, Flour & Mixes, Other, Wellness, Recipes, Sustainability (`1015-1027`).
  - "All Articles" grid (`1033-1037`).
  - Article modal (`1052-1064`).
  - No newsletter section, sidebar, H1 or breadcrumb.
- Content: `const BLOGS = [...]` at `1070-1504` is a hard-coded array of 18 articles. Each has id, productId, category, tags, product, title, excerpt, date, read, author, image, catColor and HTML `content`.
- It merges extra articles from `localStorage('nansai_blogs')` (`1522-1542`). This storage exists only in the browser of whoever used the admin panel. No `fetch` to `/api/blogs` exists anywhere in blog.html (grep).
- Initial result count is hard-coded as "48 articles" (`1026`). The JS replaces it with "18 articles" after render (observed).
- The carousel shows the first 8 articles and auto-advances **every 1.8 s** (`1682`, `1695`). It has no pause control. The only off-switch is clicking an arrow, which restarts the timer.
  - WCAG 2.2.2 (Level A) requires a way to pause, stop or hide auto-moving content that lasts more than 5 s and runs alongside other content. — [W3C Understanding 2.2.2](https://www.w3.org/WAI/WCAG21/Understanding/pause-stop-hide.html)
- At 375 px the carousel fills the first screen. The first grid card starts at y≈722 px in an 812 px viewport, behind the bottom bar (observed).
- Cards are `<article onclick>` (`1611`) and their "Read" link is an `<a>` with no `href` (`1627`). Neither is keyboard-focusable or crawlable as a link.
  - Google: "Google can only discover your links if they are `<a>` HTML elements with an `href` attribute." — [Google JS SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- **Article reader is a modal** (`openModal`, `1704-1744`). It does not change the URL or `document.title`, has no `role="dialog"` or `aria-modal`, and does not move focus (activeElement stayed `BODY`). The close button has no accessible name. Escape closes it (observed).
  - Google advises against loading different content without distinct URLs and recommends the History API for client-side views. — [Google JS SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- **Visible marker bug:** the modal category chip shows the literal text "[[ICON:WHEAT]] RICE VARIETIES", and the product CTA shows "[[icon:shopping-bag]] This article is about…" (observed in screenshot).
  - Cause: `modalCat.textContent = cat.icon + …` (`1711`), and the CTA HTML is injected after the icon-replacement pass.
  - The grid heading shows "[[icon:wheat]] Rice Varieties" after filtering, because `labelTxt` is set with textContent (`1594-1595`).
- **Reading comfort in the modal (observed at 1440 px):**

  | Element | Measured |
  |---|---|
  | Body text | 14 px Inter, line-height 25.9 px, colour #3d4d3e |
  | Paragraph width | 670 px, about 89 characters per line |
  | List items | 13.6 px |
  | Meta line | 10.4 px |
  | Category chip | 8.3 px (`.52rem`) |
  | Grid card excerpt | 11.8 px |
  | Card meta | 9.9 px |
  | Tag pills | 8.6 px |

  - At 375 px, body text is still 14 px in a 308 px column.
  - Baymard recommends 50–75 characters per line, with WCAG 1.4.8 at 80 or fewer, and suggests about `max-width: 70ch`/34em. Its testing found users fatigued on lines of 100+ characters. — [Baymard, Edward Scott, 10 May 2022](https://baymard.com/blog/line-length-readability)
  - 16 px is the widely used body-text baseline. One 2026 survey of 518 design systems found 73% use a 16 px base, and long-form reading often goes to 18–20 px. — secondary sources via search: [Smashing Magazine](https://smashingmagazine.com/2011/10/16-pixels-body-copy-anything-less-costly-mistake/), [oscarotero design tip](https://oscarotero.com/design-tips/posts/002-font-size/), [lazyweb survey](https://www.lazyweb.com/research/what-base-font-size-do-products-use.md). I could not reach an NN/g page on this (see Gaps).
- The modal hero is the product **pack shot with baked-in label text** ("KARUN-GURUVAI RICE" plus logo), cropped to 300 px (observed). It is not an editorial image.
- **Product linking:** the modal CTA does link to `product.html?id=N` (`1726-1737`), and productIds 1–16 match the catalogue ids in `product.html:5353-6652` and `index.html:2951-2966`. The earlier report row 32 ("CTAs go to index.html#products") is only partly right:
  - Index-page teaser links and nav do go to `#products`.
  - Inside the blog modal the CTA is correct, but it is a single text button. There is no price, no add-to-cart and no pack size.
  - Articles 17–18 have `productId:null` and no CTA.
- **Wrong or stock images:**
  - Aavaram article uses the Paneer Rose image (`1288`). A real Avarampoo image exists at `index.html:2960`.
  - Hibiscus Sherbet uses the Sangupoo (butterfly pea) image (`1365`).
  - Six articles use Unsplash stock (`1340`, `1391`, `1417`, `1445`, `1473`, `1493`). The Urad Dal health mix and Fig powder have real ImageKit images on index (`index.html:2965-2966`).
  - The Idiyappam Unsplash image (`1391`) returned 0 bytes and did not render in my session (observed).
  - Two ImageKit PNGs are 3375x3375 and about 300 KB decoded, shown at 431 px (Arubatham `1135`, Mappillai `1172`; observed). An earlier note recorded the `?tr=w-N` ImageKit helper elsewhere on the site.
- **Off-palette category colours:** pink #db2777, cyan #0891b2, blue #1d4ed8, orange #c2410c, lime #65a30d (`CAT_META` `1507-1516`, per-post `catColor`). These sit outside the brand palette (forest #0f2218/#1a3a2a, gold #c9a84c, cream #f7f3ec defined at `14-23`).
- "Recipes" is a tag, not a content type.
  - The Recipes filter returns 9 articles, including Arubatham Kuruvai, which has no recipe.
  - It excludes Karuppu Kavuni, which contains the payasam recipe (observed: `filterBlog('recipes')`).
- Dead code: `subscribeNewsletter()` reads `#nlEmail` (`1754-1759`), which no longer exists on the page.
- Search: the article search box `#blogSearchInput` was in the old inline header. After the site-shell swap, `onSearch()` (`1557`) has no input calling it, and the shell's search box searches products. **Article search is currently gone from blog.html** (code; worth confirming with whoever owns site-shell.js).
- Old mobile header (observed before the shell swap): CSS at `blog.html:57-61` hid `.nav-actions` and `.mob-ham` under 768 px. At 375 px the blog had only a centred logo: no cart, menu or search. The bottom bar was Home/Blogs/News/Farm.

**Blog page: content claims that are unverified, contradictory or risky**
- Business claims that conflict with other pages and with the farm's stated location ("Achankulam near Srivilliputhur", `index.html:9`):
  - "our 25-acre certified farm" (`1099`, `1470`).
  - "founders … planted their first crop in 2003 … 22 years" (`1475`).
  - "60% solar energy", "eliminated single-use plastic … in 2023" (`1479`).
  - "Our 9 Certifications … USDA Organic, India Organic (APEDA), Non-GMO Project, FSSAI, Halal, Kosher, and four additional" (`1480-1481`).
  - "over 200 farming families" (`1482-1483`).
  - "seed banks of all seven rice varieties" (`1501`).
  - Karunguruvai is "native to the Cauvery delta" (`1085`), and Iluppai Poo Samba's aroma develops "in the Cauvery delta" (`1194`). The farm is in Virudhunagar district, not the delta.
  - The product page lists the certification as "FSSAI" only (e.g. `product.html` spec for id 5 and id 11).
- Invented-looking bylines with no bio, photo or credentials: "Dr. Nithya Kumar" ×4 (`1080`, `1287`, `1444`, `1492`), "Dr. Priya Selvam" (`1234`), "Chef Arun Balaji" (`1339`), "Chef Meena Sundaram" (`1390`), "Nutritionist Kavitha Rajan" (`1416`).
  - Google: "Fabricating creator profiles" (made-up names, false credentials) is a low-quality signal. Bylines should be accurate. For YMYL topics such as health, content "must be highly accurate and consistent with established expert consensus." — [Google, Creating helpful content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- Unattributed quotes:
  - "A Chennai resident remembering the 1970s" (`1355`).
  - "Traditional Siddha text, Agasthiyar Gunavagadam" (Karunguruvai article).
  - Hippocrates (`1125`).
- Disease-treatment and efficacy claims:
  - Karunguruvai is "an excellent daily staple for people managing Type 2 diabetes".
  - Poongar: "Modern nutritional analysis has confirmed every one of these traditional claims" (`1155`) and "safe for women who develop gestational diabetes" (`1161`).
  - Hibiscus: "comparable to some pharmaceutical interventions, without the side effects" (`1264`) and "8 Proven Benefits".
  - Avarampoo: "Superstar for Blood Sugar Control", plus "best consumed on an empty stomach … 4 weeks for best results".
  - Country fig: "a genuinely effective natural remedy for iron-deficiency anemia" (`1451`).
  - Health mix: "Children especially thrive … improved concentration and stamina … within the first two weeks".
- FSSAI rules on such claims:
  - The FSSAI (Advertising and Claims) Regulations 2018 prohibit claims that a food is suitable for "the prevention, alleviation, treatment, or cure of a disease, disorder, or particular physiological condition" unless another regulation permits it.
  - Reduction-of-risk wording such as "may help reduce the risk of…" is the permitted form.
  - Other claims need prior FSSAI approval. Deceptive claims are punishable under Section 53 of the FSS Act. Compliance was due by 1 July 2019.
  - Sources: secondary summaries via search ([FSSAI digest on claims](https://fssai-digest.fssai.gov.in/research-and-innovations/claims.php), [Drishti IAS explainer](https://www.drishtiias.com/daily-updates/daily-news-analysis/curtailing-misleading-food-ads), [AM Legals](https://amlegals.com/food-safety-and-standards-advertising-and-claims-regulations-2018-a-deeper-dive-into-compliance/)). The gazette text itself could not be extracted (see Gaps).
- Internal inconsistencies:
  - Butterfly pea dose is "1 tsp dried flowers in 200 ml" (blog, Butterfly Pea article), "8–10 dried flowers" (`news.html:984` area, id 2 content) and "5–8 dried flowers in 250 ml" (product.html id 11 howToUse).
  - Rice-to-water ratios differ by article (1:2 vs 1:2.5) without saying why.

**News page: structure** (news.html, current working copy)
- Order on the page:
  - Auto-scrolling "breaking" ticker built from `NEWS.slice(0,5)` (`815`, `1164-1169`).
  - Filter pills: All, Milestones, Certifications, Product Launches, Community, Awards, plus a search box (`820-833`).
  - A pinned "featured" card.
  - "Latest Updates" grid with Load More (`865`).
  - Sidebar with: newsletter "Stay in the Loop" (`875-880`); Browse by Category; Recent Articles; "Spread the Word" share buttons for X, Facebook and copy (`906`).
  - Article modal (`922-933`).
- Content: hard-coded `const NEWS = [...]` (`941-1115`), 8 items dated 10 Jan – 5 Apr 2026.
- API: `fetch((window.API_BASE || 'http://localhost:5000/api') + '/news')` (`1126-1127`).
  - news.html does not load `js/config.js` (grep), so `window.API_BASE` is undefined.
  - On production every visit calls `http://localhost:5000/api/news`. Locally it failed with `ERR_CONNECTION_REFUSED` (observed in the network log), and the catch silently falls back (`1151`).
- Even if the API answered, its items could not be opened:
  - Mongo `_id` strings are interpolated unquoted into `onclick="openArticle(${pin.id})"` (`1177`, `1222`, `1237`, `1261`), which gives a JS syntax or reference error.
  - The ticker and the sidebar category counts use the hard-coded `NEWS`, not `allNews` (`1164`, `1251`).
- The newsletter submit only shows a toast "Subscribed!" and sends nothing (`handleNLSubmit`, `1348-1352`). That is a false confirmation.
- The "Load More" click shows a toast "Loaded more articles" (`1314`).
- Mobile (observed at 375 px):
  - The featured card is 220 px tall with `overflow:hidden`, and its title starts 12 px above the card. The first line of "Nansai Achieves USDA Organic Certification…" is clipped.
  - The sidebar starts at y≈2925 px.
  - The old header also hid the hamburger.
- Off-palette category colours: #7c3aed purple (`993`, `1099`), #0891b2 cyan, #b45309.
- Stock images:
  - The "Butterfly Pea" launch image is an iced tea with lime (`975`; observed, not blue).
  - The "award" image is a plant growing from coins (`1018`; observed).
  - The community image is seedling trays.
- The old footer was grey #111827 with a `href="#"` Contact link, a different design from the blog footer (observed). It is now replaced by site-shell.

**News page: unverifiable claims** (all hard-coded)
- id 1 (pinned):
  - "Nansai Achieves USDA Organic Certification — A 22-Year Journey" (`944-963`).
  - "passed all 148 inspection criteria" (`959`).
  - "9 Certifications … Non-GMO Project Verified, Halal Certified, India Organic, FSSAI Organic, and now USDA Organic" (`960-961`).
  - "200+ farming families across the Madurai region".
- id 2: Butterfly Pea "Available now in 50g, 100g, and 250g packs" (`984`). The product variants are "25, 50, 100, 200" (`product.html` id 11).
- id 3:
  - "200 Farming Families", "Madurai and Dindigul districts", "earning 40% more", "14 villages" (`989-1006`).
  - It also says "Ten years ago" (2016), against "since 2003" elsewhere.
- id 4: "Wins 'Best Organic Brand' at India Agri Excellence Awards 2026 … presented by the Ministry of Agriculture, in collaboration with … CII … 340 brands across 22 states" (`1010-1027`).
- id 5:
  - "500g pack is priced at ₹105" (`1044`). The product page price is ₹210 with a 500 g variant.
  - "Subscribe to auto-monthly delivery and save an additional 8%" (`1047`). No subscription exists.
- id 6: "Annual Soil Health Report 2025 … independent third-party laboratory … You can download the full 2025 Soil Health Report at our website" (`1052-1069`). There is no link or file.
  - Its numbers do not add up: 1.2% to 2.34% organic matter is a 95% rise, not "18%".
- id 7: "ISO 22000:2018 … renewed for the third consecutive year … Madurai processing facility … all 16 packaged product lines" (`1074-1092`).
- id 8:
  - "Partners with 3 Tamil Nadu Schools … Starting June 2026" (`1095-1113`).
  - "Applications for the 2027 cohort … are now open" (`1112`).
  - "Over 70% of children…" is uncited (`1111`).
- Earlier finding still stands: "USDA Organic" and the award conflict with "NPOP & FSSAI" on the product page (`reports/Nansei storefront UI improvements.md` row 20).

**Backend**
- `backend/routes/blogRoutes.js` and `newsRoutes.js` are identical CRUD routes:
  - Public `GET /` (isActive, newest first) and `GET /:id` by Mongo id.
  - Admin-only `POST`, `PUT` and `DELETE`.
  - Mounted at `/api/blogs` and `/api/news` (`backend/server.js:149-150`).
- Models (`backend/models/Blog.js`, `News.js`):
  - Fields: title, category, catLabel, catColor, catBg, author (blog only), readTime, image, excerpt, content (HTML), rawContent, featured, pinned (news), isActive, timestamps.
  - Missing: **no slug, no product link(s), no publish date separate from createdAt, no SEO description, no recipe fields, no author bio**.
- `admin-panel.html:1053-1149` reads `/api/blogs` (plus legacy localStorage) and publishes via `API.post('/blogs')`. It converts plain text to HTML, with inline Georgia-font `<h4>` styles (`1125-1128`). News works the same way (`1191-1280`).
- So the admin flow and the public pages are disconnected.

### Inferences
- Both pages fail at the basic job of a store journal. Content cannot be found by search (no URLs), cannot be updated by the owner (the API is not read), and does not move people to products well (one text button, no price or add-to-cart).
- The most damaging issue is trust, not layout. A shopper who checks one claim (USDA, an award, ISO, "Dr." authors, Madurai) and finds it false will discount the true parts: the real farm, real heritage varieties and real cooking advice. The news page should be withdrawn now, before any redesign.
- The health content should be rewritten into food and cooking content: traditional use framed as tradition ("in many Tamil homes, Poongar kanji is given after childbirth"), with no efficacy promises. The disease claims and "Dr." bylines should be removed now, even before the redesign, given the FSSAI rule summarised above.
- The pack-shot-as-hero problem shows the store has no editorial photography in the blog. But the home page has a real farm gallery (`index.html:2615`, `#gallery`) and the user's notes mention a farm video. Those are the right image sources.

### Gaps
- I did not check whether any article claims have support in the owner's records (certificates, soil reports, actual family counts). Only the owner can confirm them. Treat all of them as unverified until documents exist.
- Botanical identity: the Hibiscus article (`1262`) calls *Hibiscus sabdariffa* "Sembaruthi". In common Tamil usage Sembaruthi usually means *H. rosa-sinensis*. I did not source-check this, but if it's right, the cited blood-pressure trial (a sabdariffa tea study) would not apply to the product sold. The owner or a botanist should confirm which species is sold.
- The "51% of Indian women anaemic" figure (Poongar article) is uncited. I did not verify it against NFHS data.
- The exact gazette wording of the FSSAI regulation (including whether website articles count as "advertisement" and any rules on "traditional" or "natural" wording) could not be extracted. The FSSAI compendium PDF downloaded but no PDF text tool was available, and `cdd.fssai.gov.in` refused the connection. A developer or owner should read the compendium before publishing any health wording.

## 2. Keep both a blog and a news page, or merge? What Indian organic/heritage brands do

### Takeaway
Merge the two into one **Journal** with content types (Recipes, Grain & flower guides, From the farm). Retire the separate newsroom. A store this size has no stream of real news, and the verified Indian brands either have no real news page or use a single blog. Add a "Press" strip or page only when real coverage exists.

### Cited Findings
- **Organic Tattva** splits the two, but only the blog has content:
  - Its `/blogs/news` page has no article cards. It shows one item twice: a logo image and a paragraph about culture and "250 pesticides" testing, with no date, author or title. — [Organic Tattva /blogs/news](https://organictattva.com/blogs/news)
  - Its real blog, `/blogs/blogs` ("Blogs"), lists articles newest first, with a featured image, linked title, publish date and "READ NOW" button. There is no author and no category labels. Each article has its own URL (e.g. `/blogs/blogs/best-organic-flours-for-navratri-fasting-the-complete-vrat-atta-guide`).
  - Topics are seasonal and festival food (Diwali menus, Navratri fasting flours). One article names Organic Tattva products in the text, but the fetched text did not show product hyperlinks.
  - 11 posts were visible, dated 27 Aug – 16 Oct 2026. — [Organic Tattva /blogs/blogs](https://organictattva.com/blogs/blogs)
- **Pro Nature Organic Foods** has one blog, "The Organic Way", at `/blog/`, with a "Healthy Recipes" link in the main navigation.
  - Cards show image, title and "Continue reading", with no per-card date or author. Author "admin" appears once.
  - Template leftovers are visible ("Latest Articles About Design"), and several cards have placeholder images.
  - Articles have their own URLs and are practical comparisons: "Ghee vs Oil…", "Jaggery vs Sugar…", "A2 Ghee vs Cow Ghee vs Bilona Ghee…", "5 Benefits of Millets…". — [Pro Nature blog](https://www.pronatureorganic.com/blog)
  - Inference: it is a cautionary example. Template residue and "admin" bylines look neglected.
- **Two Brothers Organic Farms**: its blog pages returned HTTP 429/404 to my fetches. Search results show a blog called "Farmers Kitaab", with tag pages such as `tagged/south-india-lunch` (Thatte Idli Podi, Aviyal) and regional blog sections such as `/blogs/central-india` ("Culinary Chronicles"). — [TBOF search result: Farmers Kitaab tag](https://twobrothersindiashop.com/en-us/blogs/farmers-kitaab/tagged/south-india-lunch), [TBOF central-india blog](https://twobrothersindiashop.com/blogs/central-india)
  - Earlier research (same repo) found TBOF's "Farm Life" menu groups founders, traceability, lab reports, farm visits and blogs together, with a press-logo strip on the home page. — `research_notes/Nansei storefront UI improvements/india_d2c_ux_best_practices.md` §4, citing [TBOF](https://twobrothersindiashop.com/)
- **Namma Nellu (CIKS heritage-rice programme)** organises recipes **by rice variety** ("Recipes using Kaivari Samba", "Navara Rice", "Kullakar Rice"). Each recipe has its own URL (`/recipe/recipes-using-[variety]/`). There are no buy links, since it is not a shop. — [Namma Nellu recipes](https://nammanellu.com/recipes)
- Recipes for the store's own varieties are common elsewhere: Mappillai Samba dosa (Namma Nellu) and Mappillai Samba idli (Sandy at Home). — [Namma Nellu post](https://nammanellu.com/?p=3311), [Sandy at Home](https://www.sandyathome.com/mapillai-samba-idli-recipe-soft-red-rice-idli-2)

### Inferences
- None of the verified brands keeps a lively separate "Newsroom" for a small catalogue. Organic Tattva's news page is effectively empty, and TBOF puts blogs under "Farm Life". Nansei's eight news items are invented, so there is nothing real to keep.
- Recommended IA:
  - One nav item, **Journal**, with filters by type: Recipes · Know your grain/flower · From the farm.
  - Real updates (new harvest in, new pack size, a farm visit day) become short "From the farm" posts in the same stream, with a date. This replaces "News".
  - `news.html` should redirect to the Journal (a 301 in `netlify.toml`) or show a one-line pointer.
  - When genuine press appears, add a "As featured in" strip with links to the actual articles on the About page, rather than a newsroom.
- Organising recipes by variety (as Namma Nellu does) suits a heritage-rice store, because shoppers buy by variety. Each variety's product page can then link to "Recipes using Karuppu Kavuni".

### Gaps
- I could not read Two Brothers' article pages, so their article layout and product linking are unverified.
- I did not find or verify a commercial heritage-rice D2C brand's journal (Native Food Store, Thooyamalli sellers and others were searched but not found).
- No source quantified the sales effect of recipes or blogs for Indian food D2C (the same gap as the earlier research).

## 3. Best practices for content-commerce on a small food D2C site

### Takeaway
Give every article its own static URL with real `<title>`, description, Open Graph and `BlogPosting` (or `Recipe`) structured data. Set body text at 17–18 px in a column of about 65 characters. Put a truthful byline and date on each article. Use real farm and kitchen photos, not pack shots or stock. Place the product inline, where the recipe calls for it, as a real product card with price and add-to-cart.

### Cited Findings
- **Unique URLs and crawlable links:**
  - "Don't use fragments to load different page content."
  - Use the History API for client-side views.
  - Links must be `<a href>`.
  - Source: [Google JS SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- **Article structured data:**
  - Types: `Article`, `NewsArticle` or `BlogPosting`. No property is required.
  - Recommended properties: `headline`, `image`, `datePublished`, `dateModified` (ISO 8601), and `author` with `name` plus `url` or `sameAs`.
  - Use a Person for people and an Organization for organisations. Put only the name in `author.name`, with no honorifics like "Dr.".
  - Images: crawlable, relevant to the article (not logos), at least 50K pixels, ideally in 16:9, 4:3 and 1:1.
  - Source: [Google Article structured data](https://developers.google.com/search/docs/appearance/structured-data/article)
- **Recipe structured data:**
  - Required: `name` and `image` (of the finished dish).
  - Recommended: `author`, `datePublished`, `description`, `recipeIngredient`, `recipeInstructions` (HowToStep), `recipeYield`, `prepTime`/`cookTime` or `totalTime`, `nutrition.calories`, `recipeCategory`, `recipeCuisine`, `keywords`, `video`.
  - For carousels or lists, "Every item must have a unique URL", plus a summary page listing all recipes.
  - Source: [Google Recipe structured data](https://developers.google.com/search/docs/appearance/structured-data/recipe)
- **Authorship and trust:**
  - Make it "self-evident … who authored your content".
  - Add "accurate authorship information, such as bylines".
  - "Fabricating creator profiles" is a negative signal.
  - Health (YMYL) content must match expert consensus.
  - Warning signs: content made "primarily … to attract visits from search engines", or mass-produced with automation.
  - Source: [Google, Creating helpful content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- **Line length:** 50–75 characters per line (80 maximum, per WCAG 1.4.8). Implement as `max-width` of about 70ch or 34em. Long lines (100+) fatigued users in Baymard testing. — [Baymard](https://baymard.com/blog/line-length-readability)
- **Body size:** 16 px is the common floor, and 18–20 px is suggested for long-form articles. These are secondary and practitioner sources, not NN/g. — [oscarotero](https://oscarotero.com/design-tips/posts/002-font-size/), [Smashing Magazine](https://smashingmagazine.com/2011/10/16-pixels-body-copy-anything-less-costly-mistake/)
- **Auto-moving content** needs pause, stop or hide if it lasts more than 5 s (WCAG 2.2.2, Level A). This applies to the blog carousel and the news ticker. — [W3C](https://www.w3.org/WAI/WCAG21/Understanding/pause-stop-hide.html)
- **Claims:** food content should use reduction-of-risk or traditional-use wording, not prevent, treat or cure. — FSSAI summaries cited in §1.

### Inferences
- **Type:**
  - Article body: Inter (already loaded) at 17 px mobile and 18 px desktop, line-height 1.65, colour forest-deep #0f2218 or #1a3a2a on cream #f7f3ec (well above 4.5:1).
  - Column: `max-width: 66ch` (about 640–680 px).
  - Headings: Cormorant Garamond 600/700 (already loaded). H1 at 36–44 px desktop and 30 px mobile. H2 inside articles at 26–28 px. Use real `<h2>`/`<h3>`, not the current `<h4>`.
  - Meta (date, read time, author): at least 13–14 px, never 8–10 px.
- **Images:**
  - One wide hero (16:9) of the dish, grain or field. Do not use the pack shot.
  - In-article images at column width, with a caption naming what and where ("Mappillai Samba drying at Achankulam, Jan 2026").
  - Use ImageKit `?tr=w-800` (and `w-1600` for 2x) with `width`/`height` attributes to stop the 3375 px PNG problem.
- **Product links inside content:**
  - Recipes: an "Ingredients" list where the store's own ingredient links to the product, plus one product card (existing card style, which the owner wants kept) right after the ingredients and again at the end.
  - Guides: a product card after the "How to cook" section.
  - Put the price and pack size on the card, not "Shop X" text alone.
- **Recipe pages** should include prep time, soak time, cook time, servings, a rice-to-water ratio and pressure-cooker whistles. Earlier research noted these reduce "didn't turn out right" complaints for heritage rice.
- **Author:**
  - Use the real person if there is one (e.g. "Written by [owner name], who runs the farm at Achankulam"). Otherwise use "Nansei farm kitchen" as an Organization. Never use "Dr." without a real, linked credential.
  - Show "Published 12 Mar 2026 · Updated …" only when it is true.

### Gaps
- NN/g pages on line length and type size could not be reached (404 on the guessed URL, and no nngroup.com result in search). The readability numbers rest on Baymard, WCAG and practitioner sources.
- No source measured how much in-article product cards change conversion for small food stores.

## 4. Recommended structure: listing page and single-article page (desktop and mobile)

### Takeaway
Build one listing page and one article template, rendered as static HTML per article:
- Listing: `journal/index.html`, or keep `pages/blog.html` renamed in the nav to "Journal".
- Articles: `journal/<slug>.html`, generated from one data file.
- Visual style: quiet, editorial and in brand. Cream page, forest text, a gold hairline and small-caps labels, real photos, no carousel, no gradient overlays, no rainbow category chips.
- Content: start with about 8–10 honest pieces rewritten from the current 18, and drop the newsroom.

### Cited Findings
- Each article needs its own crawlable URL. — [Google JS SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- Recipe lists need a unique URL per item plus a summary page. — [Google Recipe](https://developers.google.com/search/docs/appearance/structured-data/recipe)
- Readable measure is about 70ch. — [Baymard](https://baymard.com/blog/line-length-readability)
- No autoplay without pause. — [W3C 2.2.2](https://www.w3.org/WAI/WCAG21/Understanding/pause-stop-hide.html)
- Accurate bylines; no fabricated creators. — [Google helpful content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)

### Inferences

**Implementation options for a static HTML/JS site** (pick A unless the owner must publish from the admin panel):

| Option | How it works | Trade-offs |
|---|---|---|
| A. Static pages from a data file (recommended) | `js/journal-data.js` or `content/journal/*.json` holds articles. A small Node script (the repo already uses Node for `tests/ui` and the backend) writes `pages/journal/<slug>.html` with `<title>`, meta description, canonical, OG image and JSON-LD (`BlogPosting`, or `Recipe` + `BlogPosting`), and the article HTML in the page source. The listing page is generated too, with real `<a href>` cards. | Best for search and speed. Needs a developer or a script run to publish. |
| B. API-driven, one template | `pages/article.html?slug=…` fetches `/api/blogs/slug/:slug` and sets title and meta in JS. Needs model additions: `slug` (unique), `productIds[]`, `type` (recipe/guide/farm), `publishedAt`, `updatedAt`, `description`, `heroImage` + `heroAlt`, `author{name,role,url}`, optional `recipe{yield,prep,soak,cook,ingredients[],steps[]}`. Also needs a `GET /api/blogs/slug/:slug` route. The listing reads `GET /api/blogs` and must load `js/config.js` (as index does) so `API_BASE` is `/api` in production. | The owner can publish from the admin panel. The content is rendered by JS and depends on the Render backend being awake. |
| A+B hybrid | The admin panel stays the editor, and a build step (or Netlify build) pulls `/api/blogs` and writes static pages. | Combines both, at the cost of a build step. |

Whatever is chosen:
- Remove the `localStorage('nansai_blogs')` merge.
- Fix the unquoted id interpolation.
- Stop the news `localhost:5000` call.
- Add `news.html` → journal and old-modal deep links → article 301s in `netlify.toml`.

**Listing page (Journal)**

Desktop (1440):
1. Shared site-shell header.
2. Page intro block, cream background, left-aligned in a 1200 px container:
   - Small-caps gold label "JOURNAL".
   - **H1** in Cormorant: "Cooking and growing heritage rice".
   - One plain sentence: "Recipes, cooking notes and news from our farm at Achankulam, near Srivilliputhur."
   - No carousel.
3. Type filter as plain text tabs, not pills: All · Recipes · Know your grain · From the farm.
   - Forest text, active tab underlined with a 2 px gold rule. Counts shown only if useful.
   - Optional variety filter as a `<select>` (Karuppu Kavuni, Mappillai Samba…), which mirrors Namma Nellu's by-variety organisation.
   - Article search can live here as a small input, since the shell's header search is for products.
4. Lead story:
   - One wide row, image left (16:9, about 60%), text right.
   - Type label, H2 title, two-line standfirst, "12 Mar 2026 · 6 min read", and "Read →" as a real link.
5. Grid: 3 columns, gap 32 px.
   - Each card is a single `<a href>` wrapping a 4:3 photo, a small-caps type label (gold-dark #b8922a text, no coloured chip), a Cormorant title at 22 px, an excerpt at 15 px (2 lines), and a date at 13 px.
   - No tag pills, no author icons, no hover zoom. A hover underline on the title is enough.
6. "Shop the grains in these recipes": one row of 4 existing product cards (the existing card look, unchanged) for the varieties most featured.
7. Shared site-shell footer.

Mobile (375):
- Intro: label, H1 (30 px), one sentence.
- Type tabs as a horizontal scroll row of text links, at least 44 px tap height.
- Lead story stacked (image on top).
- Then a single-column list. Compact rows (96 px square thumb left, title and date right) are an option after the lead, so 4–5 stories show per screen. They replace the current 343 px full cards that push content below the fold.
- No carousel. Nothing auto-moves.

**Single article page** (`journal/<slug>.html`)

Desktop:
1. Header.
2. Breadcrumb: Journal › Recipes.
3. Article header, centred column of about 680 px:
   - Small-caps type label.
   - H1 at 40–44 px Cormorant.
   - Standfirst at 20 px.
   - Byline line: "By Nansei farm kitchen · 12 Mar 2026 · 6 min read" (13–14 px).
4. Hero photo at 1000–1100 px wide (16:9), with a caption.
5. Body:
   - 18 px Inter, line-height 1.65, `max-width: 66ch`.
   - H2 sections, real lists, pull quotes only when sourced (a gold left rule, no italics block).
   - Images at column width with captions.
6. **For recipes**, a recipe box right after the intro: a cream-darker panel with a 1 px forest border, no shadow.
   - Yield, soak, prep and cook times.
   - Ingredients, with the store's own ingredient linked to its product.
   - Numbered steps.
   - "Print" link.
   - Recipe JSON-LD.
7. **Product placement:**
   - One existing-style product card directly after the ingredients or "how to cook" section, with price, pack size and add-to-cart.
   - A "Cooked with" row of 2–3 product cards at the end.
   - A sticky right-rail mini product card (thumb, name, price, Add) is optional on desktop at 1280 px and above, and must not overlap the 66ch column.
8. Footer of the article:
   - "More recipes using Karuppu Kavuni" (3 cards, same variety).
   - Then "From the farm" (2 cards).
9. JSON-LD: `BlogPosting` (headline, image in 3 ratios, datePublished, dateModified, author as Organization or real Person with url, publisher), plus `Recipe` where applicable, plus `BreadcrumbList`.
10. `<link rel="canonical">`, meta description (the standfirst), OG/Twitter image (the hero).

Mobile:
- Same order in a single column with 16 px gutters.
- H1 30 px, body 17 px.
- Hero full-bleed 4:3.
- Recipe box full width, with ingredients before steps.
- After the ingredients, the product card is a compact horizontal card (thumb, name, price, "Add").
- An optional slim sticky bottom bar "Karuppu Kavuni 500 g · ₹… · Add" appears after the ingredients scroll past. It must coexist with the site-shell bottom bar, so check the z-index and height.

**Visual rules to avoid an "AI-generated" look** (brand palette only):
- Colours:
  - Background cream #f7f3ec; text #0f2218 and #1a3a2a.
  - Accents gold #c9a84c (rules, active tab), with gold-dark #b8922a for small text on cream (contrast).
  - Forest-leaf #4a8c5c only for links if needed.
  - No pink, cyan, blue, purple or orange chips.
- Avoid: gradient overlays on photos, radial "glow" backgrounds (current `.newsletter-section::before`), 3D rotateY carousels, backdrop blur, emoji, sparkle or megaphone icons, "PINNED" badges, a breaking-news ticker, stagger fade-ins, scale-on-hover images, "premium"/"superfood"/"powerhouse" copy.
- Use: hairline rules (1 px rgba(15,34,24,.12)), generous whitespace, small-caps labels with letter-spacing, real dated captions, and numbered recipe steps.
- Photos: the farm's own, from the `#gallery` images on index and the farm video. Take plain overhead shots of cooked dishes (payasam, pongal, kanji, rose milk) on a home kitchen surface. Pack shots belong only in product cards.

**Content: keep, rewrite or cut**

Blog articles (by current id):

| Id | Article | Action |
|---|---|---|
| 2 | Karuppu Kavuni | Keep and rewrite as "How to cook Karuppu Kavuni, and a payasam". Keep the recipe. Cut "superfood", the anthocyanin-vs-blueberry and cholesterol claims, and the Hippocrates quote. Recipe + guide. |
| 7 | Vellai Kavuni | Keep as the "Sweet pongal with Vellai Kavuni" recipe. Cut the bone-health claims. |
| 5 | Mappillai Samba | Rewrite as "Cooking Mappillai Samba: soak, ratio, and what to serve it with". Keep the bridegroom story as tradition. Cut the testosterone and athlete claims. |
| 3, 6 | Arubatham Kuruvai, Iluppai Poo Samba | Rewrite as short "Know your grain" guides (texture, ratio, best dishes). Cut "fewer than 200 families" and "1,500-year-old" unless sourced. Cut the "Cauvery delta" origin claim, or correct it to where Nansei actually grows it. |
| 1, 4 | Karunguruvai, Poongar | Rewrite heavily as tradition and cooking guides (kanji recipes). Remove the diabetes, GI-number, gestational-diabetes, "confirmed every one" and anaemia claims. Change the author from "Dr." to the real author or the farm. |
| 8, 12, 13 | Paneer Rose, Rose Milk, Hibiscus Sherbet | Keep as drink recipes (rose milk, sherbet). Merge the duplicated rose-milk recipes. Cut the skin, hair and "visibly improved skin within 4 weeks" claims. Fix the hibiscus sherbet image. |
| 9, 10, 11 | Hibiscus, Avarampoo, Butterfly Pea | Rewrite as "how to brew" guides. Remove "blood pressure flower", "8 proven benefits", "comparable to pharmaceutical", "blood sugar control" and "boosts your brain". Use one consistent dose matching the product page. Confirm the hibiscus species. Fix the Avarampoo image. |
| 14 | Idiyappam flour | Keep as the "Soft idiyappam" recipe. Remove the uncited milling-temperature science unless sourced. Replace the broken stock image. |
| 15, 16 | Health mix, Country fig | Rewrite as "ways to use" recipes (porridge, laddoo). Cut "more protein than egg white", anaemia and constipation-remedy claims, and children's "concentration" claims. Use the real product images. |
| 17 | "Zero Chemicals, Zero Waste" | Cut until facts are verified (9 certifications, USDA, Halal, Kosher, 200 families, 60% solar, 2003). Replace it with one honest "Our farm at Achankulam" piece written from what the owner can document. |
| 18 | "Heritage grains and food security" | Cut or reduce to a short owner-voice essay with sourced figures (the "75% biodiversity lost" figure and the Irish famine paragraph are generic filler). |

News items:
- **Cut all eight.** USDA, the award, ISO 22000, 200 families, schools, the soil report and "auto-monthly delivery" are unverified or false.
- The 500 g Mappillai Samba pack and the Butterfly Pea launch could become dated "From the farm" posts only if true, with correct prices and pack sizes.

Ongoing:
- Aim for one real post per month, timed to harvests and festivals (Pongal in January for Vellai Kavuni and sweet pongal, summer coolers in April–May). This mirrors Organic Tattva's festival-timed posts.

**Fixes worth doing even before the redesign** (small, invisible or near-invisible):
1. Hide or remove `news.html` from the nav, or replace its content with a pointer to the blog.
2. Remove the disease claims and "Dr."/"Chef"/"Nutritionist" bylines from `BLOGS`.
3. Fix the `[[icon:…]]` literals: use innerHTML plus re-run applyIcons, or drop the icons.
4. Stop the 1.8 s autoplay, or add pause.
5. Fix the Aavaram and Hibiscus Sherbet images.
6. Remove "48 articles" and the dead `subscribeNewsletter`.
7. If news.html stays at all, load `js/config.js` and quote ids in `onclick`.

### Gaps
- Owner decisions needed:
  - Who the real author(s) are.
  - Which certifications actually exist (NPOP or PGS-India, with number).
  - Whether the farm has dish or field photos.
  - Whether publishing must happen from the admin panel (option B) or can go through a developer (option A).
- Whether `js/site-shell.js` (being added in parallel) will offer an article search slot or a "Journal" nav label. The listing design above assumes the shell header and footer, and puts article search in the page.
