# Nansei Organics review system: audit and recommended design

Note on citations: code findings cite `file:line` in the working tree as read on 2026-11-12. Other work was editing `pages/*.html` during this research (product.html went from 7,932 to 7,791 lines mid-session), so line numbers are re-checked at the end and may drift. Function names are given as stable anchors. Backend files were not changing.

## 1. How does the current review system actually work (who can review, data, moderation, rating sync, display, remaining fake numbers)?

### Takeaway
The backend is sound at its core. Only the owner of a **Delivered** order that contains the product can create a review (one per user per product), and the product's `rating`/`numReviews` are recomputed from approved reviews after every write. Everything around that core is weak. There is no real moderation: reviews go live instantly, and the only admin actions are hard delete and silent editing of the review text. Review text is rendered without escaping on the product page and in the admin panel, which is a stored-XSS hole. Seeded fake ratings sit in the database. Hard-coded fake ratings and reviews still appear on the home cards before the API loads (and permanently if it fails), on wishlist and account cards, in the "related products" rows of the product page, and as fallback reviews inside the product-page catalogue.

### Cited Findings

**Data model**
- `Review` fields are user, product, rating (1-5), title (≤100), comment (≤1000, required), `images[]` (url, public_id), `isVerifiedPurchase` (default false), `helpfulCount`, `orderId`, `isApproved` (**default true**) and timestamps. There is a unique index on `{user, product}` — [backend/models/Review.js:3-55](backend/models/Review.js)
- `Product` stores the denormalized `rating` (0-5), `numReviews` and a `reviews: [ObjectId]` array — [backend/models/Product.js:67-80](backend/models/Product.js). `Order` has `orderStatus` enum `Pending…Delivered, Cancelled, Refunded` and a `deliveredAt` date — [backend/models/Order.js:91-106](backend/models/Order.js)
- `images`, `helpfulCount` and `isApproved=false` are never written by any route. No route sets `isApproved`, uploads review images or increments helpful votes — [backend/routes/reviewRoutes.js](backend/routes/reviewRoutes.js) (whole file)

**Who can review (verification)**
- `POST /api/reviews` requires login (`protect`) plus product, orderId, rating and comment. It checks that the order belongs to the user, that `orderStatus === 'Delivered'` and that the order's items contain the product. It rejects duplicates and then sets `isVerifiedPurchase: true` — [reviewRoutes.js:49-93](backend/routes/reviewRoutes.js). This is a genuine server-side verified-purchase rule. Because it is the only create path, every review is "verified".
- `deliveredAt` is set when an admin marks an order Delivered ([backend/routes/orderRoutes.js:299](backend/routes/orderRoutes.js)) or when the Shiprocket sync sees a delivered scan ([backend/utils/shiprocket.js:278](backend/utils/shiprocket.js)). An admin can therefore mark any order (including one placed by staff) Delivered and so make its owner eligible to post a "Verified Purchase" review. Nothing flags reviews written by staff or admin accounts.
- An order that is Refunded or returned after delivery keeps its review and badge. Nothing re-checks this (reviewRoutes.js has no hook on order status changes).
- `PATCH /:id` lets the owner edit rating, title and comment at any time. It does not re-verify and does not record an "edited" flag beyond `updatedAt` — [reviewRoutes.js:105-133](backend/routes/reviewRoutes.js)

**Moderation**
- Reviews are published immediately (`isApproved` defaults to `true`; Review.js:46-49). There is no pending queue, no hide/unhide, no rejection reason and no notice to the author.
- `PUT /:id` lets an **admin rewrite any customer's rating, title or comment** ("same logic as PATCH but also allows admin") — [reviewRoutes.js:135-160](backend/routes/reviewRoutes.js). `DELETE /:id` lets an admin **hard-delete** any review and recompute the average — [reviewRoutes.js:162-178](backend/routes/reviewRoutes.js). Together these let the store quietly remove or soften negative reviews, and nothing logs it.
- The admin panel's Reviews page lists all reviews with search and a single **Delete** button (confirm() dialog). There is no filter by rating, status or product and no reply — [pages/admin-panel.html:499-501, 1994-2017](pages/admin-panel.html). `GET /admin/all` returns every review in one response with no pagination — [reviewRoutes.js:180-192](backend/routes/reviewRoutes.js)

**Rating computation and sync**
- `refreshProductRating()` aggregates approved reviews into average (rounded to 1 decimal) and count, and writes `rating`, `numReviews` and the full `reviews` id array to Product. It runs after create, edit and delete — [reviewRoutes.js:9-23, 94, 127, 154, 172](backend/routes/reviewRoutes.js). The averages are only as accurate as the writes that pass through this function.
- **The database itself is seeded with fake numbers.** `seed-products.js` and `seed.js` insert values such as `rating: 4.7, numReviews: 142` and `rating: 4.8, numReviews: 198` for every product — [backend/seeders/seed-products.js:19-259](backend/seeders/seed-products.js), [backend/seeders/seed.js:14-41](backend/seeders/seed.js). These persist until a product's first real review triggers a recompute, which then drops the count to 1. Until then the API serves `numReviews: 142` with an empty review list, and the frontend shows "4.7 · 142 reviews" (product.html `mapApiProduct` ~6584-6612 trusts `p.numReviews`; `loadProductReviews` ~7564-7575 shows `data.numReviews` from Product).
- `GET /api/products/:id` populates **all** reviews with user name and avatar, with no limit — [backend/controllers/productController.js:61-65](backend/controllers/productController.js). `GET /api/reviews/product/:id` also returns all approved reviews sorted newest first, with no pagination or sort/filter params, and does not validate the ObjectId (a bad id gives a 500) — [reviewRoutes.js:25-37](backend/routes/reviewRoutes.js)
- The whole `/api/reviews` router, public GETs included, sits under the write limiter of 100 req/15 min — [backend/server.js:122-123, 143](backend/server.js)

**Display on the product page (pages/product.html)**
- Header rating row: `#pStarsEl`, `#pRatingEl` and `#pReviewsEl` show "N reviews", or "New" when the count is 0 — product.html:3878-3884, set in `render()` ~6838-6842 and again in `loadProductReviews`.
- The Reviews section (`#reviewsSection`, ~4047) has a score block, star rows (`#barRows`), a "No reviews yet" placeholder and the list `#reviewsList` — ~4047-4097. Under the score there is a hard-coded **"Verified"** label that shows even with zero reviews — ~4064.
- Two empty states compete. `render()` writes "Be the first to review!" into `#reviewsList` (~6883), and a script that monkey-patches `innerHTML` (~4082-4096) then hides the nicer `#noReviewsMsg` card because the list is no longer empty. `loadProductReviews` writes `''`, which shows the card again. Which one appears depends on timing.
- The distribution rows show a bare percentage number with no "%" and no count, are not clickable, and are computed from the loaded reviews, while the headline count comes from `Product.numReviews` (two different sources) — `render()` ~6848-6862, `loadProductReviews` ~7578-7586.
- The list shows the first 5, then a "View N More Reviews" button (`expandReviews` ~7686). There is no sort, filter, helpful vote, photos or store reply. The reviewer name is the account's full `name` (`populate('user','name firstName lastName')`, reviewRoutes.js:29), which publishes full names.
- **Stored XSS.** `loadProductReviews` concatenates `name`, `r.title` and `r.comment` into `innerHTML` unescaped (~7594-7601, e.g. `'<p class="rev-text">' + r.comment + '</p>'` at ~7599). `reviewCardHTML` and `expandReviews` do the same with template literals (~6867-6879, ~7686+). The backend only trims and slices text (reviewRoutes.js:82-83). The admin panel also injects `r.title`/`r.comment` raw (admin-panel.html:2005-2009) on a page whose JWT sits in `localStorage` (admin-panel.html:995, 2019). A malicious "verified" buyer could therefore run script in an admin session.
- **Star rendering overstates ratings.** `renderStars(r)` returns a full ★ whenever `i - r < 1`, so 4.1 renders as 5 full stars — product.html ~7556-7558. By contrast, the home-page `stars()` does floor/half/empty correctly (index.html ~2824-2833).
- The "write a review" form on the product page appears only for a logged-in user with a Delivered order containing the product who has not reviewed it yet (`initReviewForm` ~7616-7650). It has stars and a textarea but **no title field** and posts with no title (`submitReview` ~7659-7684). My Orders does have a title field, so the two entry points are inconsistent.
- **Client-side fake "posted" review.** On load, if `localStorage['rev_<pid>_<user>']` holds JSON, the page prepends it as a card with a **"Verified Purchase"** badge, increments the visible count by 1 and toasts "Your review has been posted!" without contacting the server — product.html ~6912-6939. No current page writes that key (grep found only this reader), so it is dead code but still a spoofing path.
- When the API product load fails, `loadProduct()` keeps the static catalogue fallback `products.find(...) || products[0]` (~6614-6616). For a Mongo id that falls back to **Karunguruvai Rice** with `rating: 4.7, reviews: 142` and hard-coded `reviewData` marked `verified: true` (~5212-5224). Only numeric ids are zeroed (the `else` branch in `loadProduct`).
- The in-page catalogue still carries invented reviews with `verified: true` for all 16 products (~5212-6550). Some contain health and medical claims attributed to fake professionals, e.g. "Dr. Kamala N. … I recommend to my patients for blood sugar management" (~6057) and "Dr. Anand R. … patients with digestive issues" (~6547).
- The unused `NS_REVIEWS` array (~4893-4900) has six named reviewers with cities, "✓ Verified" and the claim "Blood sugar improved from 210 to 148 after 3 months". `nsRenderReviews()` exits early because `#nsReviewsGrid` does not exist (~4902-4904), but the function is still called from `nsInit` and `nsRefreshProductExperience`.
- `hydrateProductExperienceReviews()` no longer pads with fake reviews (it now only slices to 8) — ~6551-6556. This confirms today's fix.
- The related-product rows ("You May Also Like", "New", "Bestsellers") render from the **static** `products` array with `${p.rating} (${p.reviews})`, e.g. "4.7 (142)" — `relCardHTML` ~7262 and `renderRelated` ~7276-7290. These fake numbers show on every product page even when the API works.

**My Orders (pages/checkoutmyorderpage.html)**
- Delivered orders get one button per item: "⭐ Write Review", or "✓ Review Submitted — Edit" when `_myReviews[pid]` exists (~2124-2134). Shipped or processing orders show "🔒 Reviews available after delivery" (~2136-2137).
- `openReview()` re-fetches `/orders/my-orders`, re-checks `orderStatus === 'Delivered'` and opens `#reviewModal` (~1010-1060) with stars, an optional title, a comment (1000-character counter) and a static "✓ Verified Purchase" chip (~1026) — ~2210-2246.
- **Edit bug:** `/reviews/my-reviews` returns only `product orderId rating` (reviewRoutes.js:42). `_renderReviewProduct` clears the text and title (~2258), so "Edit" opens with the old stars but empty text, and the customer must rewrite the review to change a star.
- Validation messages are set with `textContent` but contain HTML entities (e.g. `'&#11088; Please select a star rating'`, `submitReview` ~2296+), so the raw entity text is displayed.

**Cards and other pages still showing hard-coded numbers**
- Home (`pages/index.html`): the static catalogue has `rating:4.7,reviews:142` etc. (~2803-2818), rendered with `ratingText(p)` on cards (~2834, ~2878). It is replaced only if `/products?limit=100` succeeds (~3345-3375); on error "silently keep static data". The same mapper still invents `oldPrice = price*1.25` (~3359). Previous research already flagged this (reports/Nansei storefront UI improvements.md, item 18).
- Wishlist (`pages/wishlist.html`): the static catalogue `rating:4.7, reviews:142…` (~533-548) is rendered as `${p.rating} (${p.reviews})` (~773-774). This page has **no** API_BASE call at all, so these fake numbers always show.
- Account wishlist tab (`pages/account.html` ~1317-1332 catalogue, rendered at ~1376 as `starStr(p.rating) (rating)`) shows fake stars.
- `js/products-data.js:52-71` has already been zeroed (`rating: 0, reviews: 0`), and `js/main.js:39-41` `ratingText` shows "No reviews yet". These are the correct pattern, but the inline catalogues in the pages do not use them.

**Review requests**
- No review request exists. The only delivery touchpoint is the "Your order has been delivered" email from `notifyCustomer(order,'delivered')` (fired from `shippingService.js:72` on a Shiprocket delivered scan) — [backend/utils/shippingEmails.js:8-48](backend/utils/shippingEmails.js). It links to "View all my orders" and has no review call to action. The file already has an `esc()` HTML-escape helper (shippingEmails.js:6) that could be reused.

### Inferences
- Verification is already the strongest part: the backend enforces "Delivered order that contains this product". The work is to wrap moderation, display and honesty around it, not to rebuild it.
- The highest-risk items, in order: (1) stored XSS into the admin panel, which can lead to admin token theft; (2) fake numbers in the seeded database and the static catalogues (wishlist, related rows, API-failure fallback, home before hydration) shown as real ratings. Indian rules treat these as misleading (see Q3); (3) admin edit and hard delete of reviews, which make silent suppression possible; (4) the fake "Verified" labels and the localStorage spoof path.
- `renderStars` overstates every non-integer rating by up to a full star. Combined with fake 4.5-4.8 seeds, this pushes every product toward a "too good to be true" 5-star look (see Q2).

### Gaps
- The live MongoDB contents were not checked (backend not running), so I could not confirm whether production products still carry seeded `numReviews` or whether any real reviews exist.
- Line numbers in `pages/*.html` were shifting during the session because of concurrent edits. Re-grep the function names before implementing.

## 2. What does research say about review display, verification badges, negative reviews, thresholds, empty states and asking for reviews?

### Takeaway
Shoppers lean on the **rating distribution** more than on review text. They expect it to be clickable as a filter, and about half go looking for negative reviews, which raise trust. A few real reviews matter enormously: five reviews instead of zero is about a 270% lift in purchase likelihood. Ratings of roughly 4.0-4.7 convert best, and perfect 5.0s look fake. Always show the count next to the stars on cards. Ask for reviews by email roughly 1-2 weeks after delivery for perishables, with one follow-up. Store replies to negative reviews also help.

### Cited Findings
- 95% of test users used reviews to learn about products. The ratings distribution was the most-used part of the reviews section, relied on more than the review text — [Baymard, Ratings distribution summary (2017, updated 2025)](https://baymard.com/blog/user-ratings-distribution-summary)
- 90% of users who wanted reviews with a specific rating tried clicking the distribution bars. 39% of sites that have a distribution don't make it clickable. Filters should be single-select (radio logic) — no participant viewed more than one star level at a time — [Baymard](https://baymard.com/blog/user-ratings-distribution-summary)
- Put the distribution at the top of the reviews section, expanded by default. Only 7% filtered by rating when the filter was hidden by default — [Baymard](https://baymard.com/blog/user-ratings-distribution-summary)
- 53% of users actively sought negative reviews. Seeing only positive reviews can make users suspect fakes, and seeing negatives first without context makes the product seem poorly rated. The distribution gives that context — [Baymard](https://baymard.com/blog/user-ratings-distribution-summary)
- Baymard recommends hiding the distribution summary when a product has 5 or fewer ratings. In a survey of 670 US participants, users preferred 4.5 stars from 12 ratings over 5 stars from 2 — [Baymard](https://baymard.com/blog/user-ratings-distribution-summary)
- Always show the number of ratings in list items (only 5% of sites didn't by 2022, down from 25% in 2015). About twice as many respondents chose 4.5 stars / 57 ratings over 5 stars / 4 ratings (5,170+ respondents across five surveys). Visible counts also raise site credibility for unfamiliar stores — [Baymard, Always show number of ratings in list items (2023, updated 2025)](https://baymard.com/blog/user-perception-of-product-ratings)
- 87% of sites don't respond to negative reviews. 37% of users factor the store's response into how they judge the review, product and brand. Responses should be visually distinct (indent, different background, a "staff"/logo label) — [Baymard, Respond to negative reviews (2019)](https://baymard.com/blog/respond-to-negative-user-reviews)
- A product with 5 reviews has a 270% higher purchase likelihood than one with none, and the marginal benefit falls quickly after the first five. The lift was 190% for a lower-priced and 380% for a higher-priced product — [Spiegel Research Center, How Online Reviews Influence Sales (2017, page updated 2025)](https://spiegel.medill.northwestern.edu/How-Online-Reviews-Influence-Sales)
- Purchase likelihood peaks at 4.0-4.7 stars and declines toward 5.0 ("too good to be true"). Negative reviews "establish credibility and authenticity" — [Spiegel](https://spiegel.medill.northwestern.edu/How-Online-Reviews-Influence-Sales). Some secondary summaries narrow this to 4.2-4.5 — [Retail TouchPoints](https://www.retailtouchpoints.com/topics/customer-experience/purchase-likelihood-highest-for-products-rated-between-4-2-and-4-5-out-of-5-stars)
- A verified-buyer badge improves purchase odds by 15%. Verified buyers give more 4-5 star ratings, while anonymous reviewers give more 1-2 star ratings — [Spiegel](https://spiegel.medill.northwestern.edu/How-Online-Reviews-Influence-Sales). **Partial conflict:** Spiegel's prompted-vs-self-motivated study reports that verified reviews average 4.34 vs 3.89 for anonymous, yet "customers don't place more weight on reviews from verified buyers" — [Spiegel, Self-motivated vs prompted reviews](https://spiegel.medill.northwestern.edu/self-motivated-vs-prompted-reviews)
- Email-prompted verified reviews run up to about 0.5 star higher than self-motivated web reviews and stay stable over time, while web reviews trend down. Prompting did not reduce organic review volume — [Spiegel](https://spiegel.medill.northwestern.edu/self-motivated-vs-prompted-reviews); [arXiv 1604.00417](https://ar5iv.arxiv.org/html/1604.00417)
- Timing: PowerReviews recommends **14 days for perishable goods (food, beverages, flowers, plants)**, 21 for hard goods and 7 for seasonal goods. Send a follow-up 7 days later and at least two emails in total. 68% of reviewers respond to the first request and 28% to the second. 77% review within a week of receiving or using the product. 34% want more use before reviewing. Send Wednesday or Saturday, 10am-2pm. Up to 80% of reviews come from post-purchase emails — [PowerReviews, When to ask for reviews](https://www.powerreviews.com/when-to-ask-for-reviews-best-practice-guide/) (undated, cites 2021 data; vendor source)
- Other vendors anchor timing to delivery: Yotpo suggests 7-14 days after delivery, Mailchimp 10-14 days. Loox reports that 1-3 days after delivery got the most reviews — summarized via search of [Yotpo](https://www.yotpo.com/blog/review-collection-automation-guide/), [Mailchimp](https://mailchimp.com/resources/what-is-the-best-way-to-ask-for-product-reviews-via-email/), [Loox](https://loox.app/blog/best-time-to-send-review-request-emails) (vendor sources, not independently verified; they disagree).
- WhatsApp: Meta classifies a feedback or review request as a **utility** template only if it refers to a specific order or interaction. Generic requests, or requests mixed with promotional content (e.g. a discount), become **marketing** — [Meta, WhatsApp template categorization](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-categorization)

### Inferences
- For Nansei's catalogue (rice, dried flowers, flour, beverages: perishables and consumables cooked over days), the evidence points to the first email about **7-10 days after `deliveredAt`**: soon enough to beat the 77%-within-a-week pattern and late enough to have cooked with the product. Send one reminder about 7 days later, then stop. This is an inference from the PowerReviews perishables figure combined with delivery-anchored vendor guidance.
- Because prompted reviews skew higher, honesty and moderation rules (Q3) matter more once the store starts prompting. Do not filter who gets asked by predicted satisfaction.
- For cards, the research supports showing stars and count only when real reviews exist ("4.6 · 12"), and showing nothing rather than "0 (0)" otherwise (Baymard's always-show-count finding concerns products that have ratings).

### Gaps
- I could not reach any NN/g article specifically on review display in this session. Baymard covers the same ground.
- I found no Bazaarvoice primary data in my searches. The Bazaarvoice question is unanswered here.
- I found no Indian-market study on review-request timing or channel (email vs WhatsApp). The figures above come from US vendors.

## 3. Indian rules: Consumer Protection (E-Commerce) Rules 2020, CCPA guidance, BIS IS 19000:2022 — what must the store do?

### Takeaway
Nansei sells its own inventory, so the E-Commerce Rules bar it from posing as a consumer to post reviews or misrepresenting product quality. Fake reviews and ratings are also an "unfair trade practice" under the Consumer Protection Act. IS 19000:2022 is still officially **voluntary**, but the government has repeatedly said it may become mandatory (a draft Quality Control Order has been discussed). It sets the practical bar: verify authors, moderate equally regardless of sentiment, publish without undue delay with date and star rating, disclose and separate incentivised reviews, and do not let paid or incentivised reviews skew the rating. The fabricated reviews and seeded counts on this site fall squarely inside what these rules target.

### Cited Findings
- Consumer Protection (E-Commerce) Rules, 2020: Rule 6(2) — "no seller shall falsely represent itself as a consumer in order to post reviews about their products"; commentary says this also bars paying third parties to pose as consumers — [LiveLaw (Aug 2020)](https://www.livelaw.in/columns/consumer-protection-e-commerce-rules-2020-a-step-in-the-right-direction-160858). A parallel provision for **inventory** e-commerce entities says they "must not pretend to be consumers to post fake reviews or misrepresent the quality of their products" — [IndiaLaw summary](https://www.indialaw.in/blog/civil/consumer-protection-e-commerce-rules/); the commentary identifies this as Rule 7(2) — [search summary of e-commerce rules commentary](https://www.mondaq.com/india/dodd-frank-consumer-protection-act/985606/the-consumer-protection-e-commerce-rules-2020). The rules are mandatory, not advisory — [HSA Legal briefing (via search)](https://hsalegal.com/wp-content/uploads/2020/09/HSA-Corp-Comm-Law-Policy-The-Consumer-Protection-E-commerce-Rules-2020.pdf)
- IS 19000:2022 "Online Consumer Reviews — Principles and Requirements for their Collection, Moderation and Publication" applies to any organisation that publishes consumer reviews online, including sellers collecting reviews from their own customers, and came into effect on 25 November 2022 — [Vikaspedia (Govt of India portal) summary](https://vikaspedia.in/social-welfare/social-awareness/consumer-education/bis-framework-for-online-consumer-reviews); [PIB press release PRID 1877733](https://pib.gov.in/PressReleasePage.aspx?PRID=1877733) (PIB returned 403 to my fetch; content via search snippets)
- Provisions include: review administrators moderate with automated or manual tools to filter bias and fraud; reviews show the **publishing date and star rating**; verification of the review author; and a conformity assessment scheme — [The Statesman](https://www.thestatesman.com/business/centre-launches-framework-on-fake-and-deceptive-reviews-in-e-commerce-1503133479.html/amp); [PIB](https://pib.gov.in/PressReleasePage.aspx?PRID=1877733)
- Review authors confirm acceptance of terms and provide contact information. Administrators safeguard personal information and train staff. A code of practice and terms cover accessibility and criteria, and check that content contains no financial information. Verification techniques include email, phone/SMS, confirmation link and captcha. "The correctness of the review, default display and weightage of the ratings are defined in the publication process" — [Legal500/Mondaq summary](https://www.legal500.com/intelligence/india/consumer-protection/framework-launched-by-the-government-of-india-to-restrict-fake-reviews-on-e-commerce-sites)
- Per an Indian IP/legal firm's summary: equal treatment in moderation regardless of sentiment; publish without undue delay (they cite ~72 hours); let consumers filter by verification status; give businesses a right to respond; **mark incentivised reviews separately and do not let them influence overall ratings**; secure personal data — [S.S. Rana & Co.](https://ssrana.in/articles/bis-standards-for-verifying-consumer-reviews-ensuring-transparency-integrity/) (secondary; I could not read the standard's text itself)
- E-commerce platforms "will need to disclose all paid reviews" under the framework — [Scroll headline](https://scroll.in/latest/1038007/scroll_in)
- Status: initially voluntary. Once mandatory, violations would be treated as unfair trade practices, with complaints via the National Consumer Helpline, Consumer Commissions or the CCPA — [Legal500/Mondaq](https://www.legal500.com/intelligence/india/consumer-protection/framework-launched-by-the-government-of-india-to-restrict-fake-reviews-on-e-commerce-sites); the Centre plans to make it mandatory — [Outlook Business](https://www.outlookbusiness.com/news/centre-to-make-framework-against-fake-reviews-mandatory-for-ecommerce-platforms); a draft Quality Control Order on online reviews was discussed in 2024 — [India Today NE (May 2024)](https://www.indiatodayne.in/national/story/consumer-affairs-crackdown-on-fake-online-reviews-quality-control-order-issued-1007122-2024-05-15)
- CCPA Guidelines for Prevention and Regulation of Dark Patterns, 2023 (issued 30 Nov 2023 under s.18 of the Consumer Protection Act 2019, 13 specified patterns) include "disguised advertisement", which covers masking ads as user-generated content. They also cover misleading ads as defined in the 2022 Misleading Advertisements guidelines — [Mondaq (Khaitan) summary](https://www.mondaq.com/india/consumer-trading-unfair-trading/1398262/ccpa-issues-guidelines-for-prevention-and-regulation-of-dark-patterns-2023-effective-30-november-2023); [Vikaspedia summary](https://en.vikaspedia.in/viewcontent/social-welfare/social-awareness/consumer-education/the-guidelines-for-prevention-and-regulation-of-dark-patterns-2023)

### Inferences
- What the store must stop doing: showing any rating, count or review not produced by a real customer (static catalogues, seeds, fallback `reviewData`, `NS_REVIEWS`). Store-authored reviews presented as customers' fit Rule 6(2)/7(2) and the CPA's "unfair trade practice". The fake "Dr." reviews also make health claims.
- What a small D2C store can practically do to align with IS 19000 now: (a) keep the delivered-order verification; (b) publish a short public review policy covering who can review, what gets rejected, that negative reviews are published and that the store may reply; (c) moderate on objective grounds only (abuse, personal data, off-topic, spam), never on sentiment, and keep a reason and audit log; (d) never edit customer text (the admin `PUT` path must go); (e) mark any incentivised review (e.g. a coupon for a review) and exclude it from the average, or simply never incentivise; (f) flag staff or family reviews; (g) show the date and star rating on every review; (h) publish within about 72 hours.
- Offering a discount *for a review* creates a disclosure duty and a WhatsApp "marketing" classification. Not incentivising at all is simpler and cleaner.

### Gaps
- I could not access the full text of IS 19000:2022 (sold by BIS), the PIB release (403) or the consumeraffairs.nic.in PDF of the E-Commerce Rules (connection refused). Clause-level wording, including whether the standard expressly forbids suppressing negative reviews and how it treats incentivised reviews, rests on secondary summaries.
- I could not confirm whether a Quality Control Order making IS 19000 mandatory has been notified as of Nov 2026. Check the BIS/DoCA site or the Gazette.
- I found no CCPA order specific to fake product reviews (as opposed to dark patterns and misleading ads) in this session.

## 4. Recommended design: data model, verification, admin moderation, product-page layout, cards, review requests (in the forest/gold/cream look)

### Takeaway
Keep the existing verified-purchase rule and recompute logic. Add a moderation status with a reason log, a store reply, a per-star histogram stored on Product, paginated sort/filter endpoints and escaping everywhere. Delete every hard-coded rating and review. On the page, use an honest summary (the score shown only with real reviews, clickable count bars), a sort/filter bar and plain cards with "Verified purchase" and the date. Show a calm empty state with no stars. On cards, show "4.6 · 12" only when reviews exist, otherwise nothing. Ask once about 7-10 days after delivery by email (WhatsApp only with opt-in and only as an order-specific utility template), with a deep link into the My Orders modal.

### Cited Findings
- The current schema already has the right hooks to extend: `isApproved`, `images`, `helpfulCount`, `orderId`, and a unique `{user, product}` — [backend/models/Review.js:30-55](backend/models/Review.js)
- The verified rule already exists server-side — [reviewRoutes.js:64-76](backend/routes/reviewRoutes.js); the recompute already exists — [reviewRoutes.js:9-23](backend/routes/reviewRoutes.js)
- Distribution at the top, clickable, single-select, expanded by default — [Baymard](https://baymard.com/blog/user-ratings-distribution-summary). Hide the distribution at ≤5 ratings — [Baymard](https://baymard.com/blog/user-ratings-distribution-summary). Count next to stars in list items — [Baymard](https://baymard.com/blog/user-perception-of-product-ratings). Visually distinct store replies — [Baymard](https://baymard.com/blog/respond-to-negative-user-reviews). Date and star rating on each review, filter by verification, incentivised reviews marked and excluded — [Statesman/PIB](https://www.thestatesman.com/business/centre-launches-framework-on-fake-and-deceptive-reviews-in-e-commerce-1503133479.html/amp), [S.S. Rana](https://ssrana.in/articles/bis-standards-for-verifying-consumer-reviews-ensuring-transparency-integrity/)
- Site palette tokens: `--forest #1a3a2a`, `--forest-deep #0f2218`, `--forest-mid #2d5a3d`, `--forest-leaf #4a8c5c`, `--forest-sage #8fbc9a`, `--cream #f7f3ec`, `--gold #c9a84c`, `--gold-lt #e8c97a` — [pages/product.html:111-118](pages/product.html). The delivered email already uses `#0f2218` with gold `#e8c97a`/`#b8922a` and Georgia headings — [backend/utils/shippingEmails.js:8-31](backend/utils/shippingEmails.js)

### Inferences (the recommendation)

**A. Data model (backend/models/Review.js, Product.js)**
- Review: replace `isApproved` with `status: 'published' | 'pending' | 'hidden' | 'rejected'` (default `published`; post-moderation suits a low-volume store and the ~72-hour guidance). Add:
  - `moderation: [{ action, reason, by, at }]` (append-only audit log)
  - `storeReply: { text, by, at }`
  - `editedAt`
  - `isIncentivised: Boolean` (default false; excluded from the average if true)
  - `isStaff: Boolean`
  - `displayName` (snapshot such as "Priya S.", first name + last initial, set at create)
  - `variantLabel` (e.g. "1 kg"), copied from the order item
  - optional `images` (keep the field, phase 2; cap at 3, moderated)
  - `helpfulVoters: [userId]` alongside `helpfulCount`
- Product: keep `rating` and `numReviews`, add `ratingHistogram: {1:n,…,5:n}`, and drop the unbounded `reviews: [ObjectId]` array (stop populating it in `getProduct`).
- Data cleanup (one-off script): set every product's `rating`, `numReviews` and histogram from a real aggregate (zero where there are no reviews). Remove `rating`/`numReviews` from `seed.js` and `seed-products.js`.

**B. Verification rule (keep, tighten)**
- Keep: a review requires an order owned by the user, with `orderStatus === 'Delivered'`, containing the product. Store `orderId` and `deliveredAt`.
- Add: if the order later becomes Refunded, keep the review (it is still a real experience) but recompute nothing automatically. Admin can see "order refunded" in the moderation table.
- Set `isStaff` when the author's role is admin or the email is on a staff list, and show "Nansei team" instead of the verified badge.
- One review per user per product (the existing index). A repeat buyer edits rather than adds. Show "Edited" with `editedAt`.
- Remove the admin branch of `PUT /:id` (the store must never alter customer text). Keep `PATCH` for owners only.

**C. Endpoints**
- `GET /api/reviews/product/:id?sort=recent|helpful|highest|lowest&rating=1-5&photos=1&page=1&limit=10`. Validate the ObjectId and return `{ data, page, total, rating, numReviews, histogram }`. Move public GETs to `publicLimiter`.
- `GET /api/reviews/my-reviews` returns `title` and `comment` too (fixes the Edit modal).
- `POST /api/reviews/:id/helpful` (logged in, one vote per user).
- Admin: `GET /api/reviews/admin?status=&rating=&product=&page=`; `PATCH /api/reviews/:id/moderate { status, reason }` (reason required for hidden/rejected; appended to the log); `PUT /api/reviews/:id/reply { text }`. Admin hard delete is kept only for legal removal requests, with a logged reason; otherwise use `hidden`.
- Server-side: strip HTML tags from title and comment on write. On the client, always render with `textContent` or an `esc()` helper (the same as shippingEmails.js:6).
- `refreshProductRating` counts only `status:'published'` and `!isIncentivised`, and writes the histogram.

**D. Admin panel (pages/admin-panel.html Reviews page)**
- Tabs: Published / Hidden / Rejected, plus a "Needs reply" filter (≤3★ with no store reply). Filters for star level and product. Columns: Product, Customer (masked), ★, Review (escaped, expandable), Order # + delivered date, Status, Actions.
- Actions: **Reply** (inline textarea), **Hide** (reason picklist: abusive language, personal information, not about the product, spam or duplicate, legal request), **Restore**. No Edit button.
- Publish a written moderation policy on the site (e.g. a short section in terms-and-conditions.html, which already exists untracked) listing exactly those reasons and stating that negative reviews are published.

**E. Product page layout (#reviewsSection, existing cream gradient)**
- **Heading:** keep the "What People Say" eyebrow and the "Customer Reviews" serif heading.
- **Summary card** (the white rounded card that exists today):
  - Left: the big score in Cormorant or Inter (`--forest-deep`), stars in gold `--gold` (true half-stars; fix `renderStars`), then "Based on 12 reviews from verified buyers".
  - Delete the static "Verified" label (product.html ~4064).
  - Right: five rows "5 ★ ▬▬▬ 9". Bars are `--forest-leaf` on a `#e8f0ea` track and show the **count**, not a bare percentage. Each row is a button (`aria-pressed`) that filters the list; clicking again clears it.
  - Hide the bars when there are ≤5 reviews (Baymard); show just the score, count and list.
- **Toolbar** under the summary: a sort select (Most recent [default], Most helpful, Highest, Lowest), a "With photos" chip (phase 2) and an active-filter pill ("Showing 2★ reviews · Clear").
- **Review card:**
  - Header: name ("Priya S."), city if provided, date ("12 Oct 2026"), stars.
  - A "Verified purchase · 1 kg" chip in `--forest-mid` on `#e8f5e9` (the existing `.rev-verified` style).
  - Title in bold, then the comment.
  - "Helpful (3)".
  - Store reply as an indented block on `--cream` with a 3px `--gold` left border, labelled "Reply from Nansei Organics" with its date.
  - No coloured "Featured" card and no avatars with gradients.
  - Show 5, then "Show more reviews" loads the next page from the server.
- **Empty state:** one calm line in the summary card: "No reviews yet. Reviews come from customers whose order was delivered." For a logged-in eligible buyer, add an inline "Write the first review" button. Show no stars, no "—" score and no "New" pill. Remove the duplicate "Be the first to review!" string and the `innerHTML` monkey-patch.
- **Write-a-review form:** same fields as My Orders (stars with words Poor…Excellent, optional title, comment with counter). Add a one-line notice under the button: "Your review is published with your first name and last initial. We only remove reviews that break our review policy" (link). Stop reading the `rev_*` localStorage key.
- **Header rating row** near the price: "★ 4.6 · 12 reviews" as a link that scrolls to #reviewsSection. Hide the row entirely when there are 0 reviews (instead of "New").

**F. Cards (home, related rows, wishlist, account)**
- Render ratings only from API data: `numReviews > 0 ? "★ 4.6 · 12" : ''` (the existing `js/main.js:39-41` `ratingText` pattern, minus the "No reviews yet" text on cards to avoid a wall of empties).
- Remove `rating`/`reviews`/`reviewData` from every inline catalogue (index.html, product.html, wishlist.html, account.html). On API failure show no rating rather than the static numbers.
- Make the related rows on the product page use API products, or drop the rating line from them.
- Delete `NS_REVIEWS` and `nsRenderReviews`.

**G. My Orders (checkoutmyorderpage.html)**
- Keep the per-item buttons. Show "Rate this" with five tappable outline stars right on the delivered order row. Tapping a star opens the modal pre-filled with that rating (fewer steps).
- In Edit, pre-fill title and comment. Show the review status, and the store's reply if there is one.
- Fix the error messages that show raw entity text.

**H. Asking for reviews**
- Schedule: a job (cron or `setTimeout`-free daily sweep) finds orders with `deliveredAt` 7-10 days ago, no `reviewRequestSentAt`, and at least one item not yet reviewed. It sends one email in the delivered-email style (forest header, gold button "Rate your Karunguruvai Rice") with star links that deep-link to `/orders?review=<orderId>&product=<pid>&stars=4` and open the modal. Send one reminder 7 days later only if nothing was reviewed, then stop. Store `reviewRequestSentAt` and `reviewReminderSentAt` on Order.
- Ask **every** delivered customer, not only happy ones; selective solicitation would skew the average.
- No coupon for reviews. If one is ever offered, mark those reviews "Incentivised", exclude them from the average and expect the WhatsApp marketing classification.
- WhatsApp: only for customers who opted in. Use an order-specific utility template ("Your order #NS1234 was delivered on 3 Nov. How was the Karunguruvai Rice? Rate it: <link>") with no promotional content, or Meta will classify it as marketing.

### Gaps
- No user testing was done with Nansei's Tamil Nadu customer base. Thresholds and timing are carried over from US-centric research.
- The exact IS 19000 rules on default sort order and rating "weightage" are unknown without the standard's text. "Most recent" as the default sort is my recommendation, not a cited requirement.
- Whether to require pre-moderation (pending) instead of post-moderation depends on expected volume and abuse; there is no evidence here either way for this store.
