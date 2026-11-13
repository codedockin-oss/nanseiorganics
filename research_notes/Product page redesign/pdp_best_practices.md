# Product Detail Page (PDP) Blueprint for an Indian Organic Food D2C Store (heritage rice, dried flowers, flours, drinks)

Research date: 13 Nov 2026. Older sources are labelled with their year. Statements under "Cited Findings" are sourced. Statements under "Inferences" are my synthesis and are marked as such.

---

## 1. What Baymard Institute / NN/g research says about PDP layout (description layout, highlights, specs, gallery, mobile, sticky ATC, price/discount, reviews)

### Takeaway
Put the main description sections in vertical order (expanded sections on desktop, collapsed sections/accordions on mobile) rather than horizontal tabs. Lead the description with a few "highlights" (image/icon + headline + short paragraph). Group the spec sheet into labelled sections with a key-facts summary at the top. Show the price large, inside the buy box, with the original price struck through and the saving shown. Show the unit price (₹/kg). Link the returns policy and give a delivery-cost estimate near the buy button. Baymard publishes no free figure on sticky add-to-cart bars. The only evidence on them is single-site vendor A/B tests.

### Cited Findings

**Tabs vs collapsed sections vs one page**
- Baymard: "Avoid Using 'Horizontal Tabs' for the Main Product Page Sections." Published 17 Oct 2018, updated 8 Jul 2026. 29% of sites still use horizontal tabs for main sections. Findings from the article:
  - Users expect vertical scrolling to reveal core content.
  - Tabs are not sticky, so they disappear once users scroll down.
  - Participants missed tabs even while actively scanning for a section (Ashley Furniture, Houzz, Barnes & Noble examples).
  - On desktop, long scrolling "was not observed as a major obstacle," so tabs add risk for little benefit.
  - On mobile, tabs can need horizontal scrolling. On LG's mobile site "only two of the four tabs are fully visible at any one point." — [Baymard](https://baymard.com/blog/avoid-horizontal-tabs)
- Baymard's recommended alternatives:
  - Desktop: "Expanded Sections" with a sticky table of contents, which "best matched participants' expectations."
  - Mobile: "Collapsed Sections" on longer pages, and expanded sections on shorter pages.
  - Truncated content is acceptable if clearly signposted (guideline #846).
  - Tabs are acceptable for secondary subsections within a section, around 2–3 on mobile.
  - Cut unnecessary cross-sells and ads, which Baymard identifies as the real cause of long pages. — [Baymard](https://baymard.com/blog/avoid-horizontal-tabs)
- Quantitative figures from Baymard testing, as reported in search summaries of earlier versions of the same article (secondary, not visible in the 2026 version I fetched):
  - 27% of users overlooked content in horizontal tabs, against 8% for vertically collapsed sections.
  - 21% overlooked the tabs on Crutchfield and 43% on REI, even while looking for that information. — [Baymard (search summary)](https://baymard.com/research-articles/avoid-horizontal-tabs); see also [guideline #753](https://baymard.com/guidelines/753-horizontal-tabs-layout-for-desktop-and-mobile)
- Baymard mobile: "Avoid Using Subpages within the Product Details Page (26% Don't)." Opening description, specs or reviews as separate subpages on mobile hurts navigation. — [Baymard listing](https://baymard.com/product-page/articles), [article](https://baymard.com/research-articles/avoid-using-subpages)
- NN/g:
  - Collapsing content suits small screens, because people often stop scrolling before the end of very long pages. Accordions let users see an overview and jump to a section.
  - Accordions add interaction cost, because users must decide from the headings alone.
  - Accordions also suit extremely long content poorly. — [NN/g Accordions for complex content](https://www.nngroup.com/articles/accordions-complex-content/), [NN/g Accordions on Mobile video](https://www.nngroup.com/videos/accordions-on-mobile/)
- A secondary source citing NN/g says a caret icon is the clearest accordion signifier, compared with plus signs or other arrows. Lower confidence. — [uxcel lesson (search summary)](https://uxcel.com/lessons/basics-i-491)

**Highlights**
- Baymard, "Structuring Product Page Descriptions by 'Highlights' Increases User Engagement (Yet 78% of Sites Don't)." Published 24 Apr 2018 (older source). — [Baymard](https://baymard.com/research-articles/structure-descriptions-by-highlights)
  - **Adoption:** only 22% of sites use highlights.
  - **Reliance on descriptions:** every test user relied on the product description at some point.
  - **Format:** 2–6 core features, each with a visual, a short headline and one paragraph. Secondary features go in an "Additional features" bullet list.
  - **How users read them:** users scan the images, then the headlines, then read a paragraph if interested. They explored descriptions more thoroughly than text-only ones and became "more impressed with the product."
  - **Why plain text underperforms:** bullet-only "feature dumps" were called "bland" or "boring."
  - **Icons vs images:** reusable icons performed worse than images but "still far outperformed text-only descriptions."
  - **When to use them:** best for best-sellers and complex products; often unnecessary for simple accessories.
- Baymard: 10% of e-commerce sites have product descriptions insufficient for users' needs, which leads to abandonment. — [Baymard listing](https://baymard.com/product-page/articles)

**Spec sheets / product facts**
- Baymard: 50% of sites have spec sheets that are hard to scan. — [Baymard](https://baymard.com/research-articles/spec-sheet-scannability), [guideline #835](https://baymard.com/guidelines/835-improving-the-scannability-of-spec-sheets)
- The four fixes:
  1. Group specs into labelled sections.
  2. Put a "Key specs" summary at the top, while keeping those specs in their normal place too. Only 3% of sites do this.
  3. Use alternating row shading or lines so labels and values connect.
  4. Avoid two-column spec layouts, which some users misread as comparison tables. — [Baymard (search summary)](https://baymard.com/blog/spec-sheet-scannability)
- Baymard: 52% of sites don't post-process vendor-supplied product data. — [Baymard listing](https://baymard.com/product-page/articles)

**Image gallery**
- Baymard articles:
  - Use thumbnails for additional images.
  - Signpost hidden thumbnails in galleries.
  - 25% of sites lack sufficient image resolution or zoom.
  - 28% lack at least one "in scale" image. The 2026 article puts this at 37% of sites, and 42% of users try to judge size from images.
  - 52% don't add descriptive text or graphics to some images.
  - 35% embed product videos poorly. — [Baymard listing](https://baymard.com/product-page/articles); [Baymard Product Page UX 2026](https://baymard.com/research-articles/current-state-ecommerce-product-page-ux)

**Price, discount, unit price, shipping, returns**
- Baymard, "How to Display Price Discounts on the Product Page" (25 May 2022). — [Baymard](https://baymard.com/research-articles/product-page-price-discounts)
  - **Prevalence:** 18%+ of sites have at least one of 4 pitfalls: price blends in, discount placed far from the price, the same promotion repeated, or no %/amount-off shown.
  - **Price hard to find:** 18% of desktop and 11% of mobile sites. 67% of participants at Patagonia had trouble finding the price.
  - **Promotions far from the price:** 14% of desktop sites.
  - **Recommended display:** price large (near headline size) and bold. Original price struck through, sale price bold. Price, discount and badges grouped in the buy section, each offer described once. Show both absolute and % saving if space allows. If only one fits, use Berger's "Rule of 100": % off below ₹100-equivalent prices, amount off above.
- Baymard "Product Page UX 2026" (updated 18 Mar 2026). — [Baymard](https://baymard.com/research-articles/current-state-ecommerce-product-page-ux)
  - **Benchmark:** 52% of desktop and 62% of mobile sites are "mediocre or worse" on product pages (30,000+ ratings, 155+ sites).
  - **Size selection:** use buttons, not drop-downs (57% of sites don't).
  - **Unit price:** show price per unit (81% don't). Example: $1.26/oz small vs $0.74/oz large.
  - **Order cost:** show a total-cost or shipping estimate near the buy section (67% don't).
  - **Returns:** link the return policy (44% don't). 60% of shoppers look for return info on the PDP, and 15% of 1,026 US shoppers abandoned over return policy.
  - **Save/wishlist:** make it easy and allow guests to use it (89% don't).
  - **Negative reviews:** respond to them (89% don't).
  - **Review photos:** let users browse across reviewer images (63% don't).
- Baymard:
  - 43% of sites don't show estimated shipping costs on the PDP.
  - 32% put "free shipping" only in a site-wide banner, which users miss.
  - 28% of desktop sites don't use buttons for size selection (earlier figure).
  - 28% don't synchronise data across product variations. — [Baymard listing](https://baymard.com/product-page/articles)

**Reviews**
- Baymard: 43% of sites have no ratings-distribution summary, and 39% of those that do don't make it clickable (filterable). — [Baymard listing](https://baymard.com/product-page/articles)
- 34% don't let reviewers upload images. 87% don't respond to negative reviews. — [Baymard listing](https://baymard.com/product-page/articles)
- Baymard has an article titled "DTC E-Commerce: User Reviews Are Much Less Important for DTC Sites." I could not read its body. — [Baymard listing](https://baymard.com/product-page/articles)

**DTC brand/product story**
- Baymard DTC research (22 Jun 2021). 62% of users on DTC sites engaged with non-product content such as "About" pages, against 37% on general sites. The article's key-takeaways section says 67%, so the article is internally inconsistent. — [Baymard](https://baymard.com/research-articles/dtc-users-informational-needs)
- Users wanted origin story, brand values, specific materials/ingredients ("I really do care about ingredients"), production practices and quality reassurance. They dismissed products lacking specifics. — [Baymard](https://baymard.com/research-articles/dtc-users-informational-needs)

**Cross-sells / related products**
- Baymard:
  - Only 42% of sites recommend both alternative and supplementary products correctly.
  - 68% of desktop sites miss at least one of 6 key attributes on cross-sell list items.
  - 70% get FAQ and community Q&A handling wrong. Provide both site-authored FAQs and Q&A. — [Baymard listing](https://baymard.com/product-page/articles)

**Sticky add-to-cart on mobile**
- No free Baymard article on sticky add-to-cart was found. Baymard's mobile product-page benchmark (613 annotated screenshots, 93 sites) is behind its paywall. — [Baymard benchmark](https://baymard.com/mcommerce-usability/benchmark/mobile-page-types/product-page)
- Vendor A/B results (single-site, not peer-reviewed):
  - A mobile bottom sticky button raised add-to-cart rate by 8.7%. — [CleanCommit](https://cleancommit.io/ab-tests/mobile-bottom-sticky-add-to-cart-button/)
  - A top sticky bar with a size selector gave +2.2%. — [CleanCommit](https://cleancommit.io/ab-tests/sticky-top-add-to-cart-bar-with-size-selector/)
- One vendor site attributes precise sticky-cart statistics to "Baymard 2025." I found no corroboration and treat them as unverified. — [easyappsecom](https://easyappsecom.com/guides/shopify-sticky-cart-conversion-data)

**Writing for the web (NN/g)**
- NN/g study (1997, older but foundational) compared rewrites against a promotional control:
  - Concise text was 58% more usable, scannable 47%, objective (no "marketese") 27%, and all three combined 124%.
  - Users distrust hype. Recommended practices: inverted pyramid, one idea per paragraph, bold keywords, bulleted lists. — [NN/g](https://www.nngroup.com/articles/concise-scannable-and-objective-how-to-write-for-the-web/)

### Inferences
These are my synthesis, not tested findings.

**Recommended section order on mobile (single column)**
1. Breadcrumb.
2. Image gallery: swipe, with a dot or count indicator plus a thumbnail strip. Show pack front, back label, grain/flower close-up with a coin or spoon for scale, and the cooked dish.
3. Product name. Then a one-line descriptor (variety, region, polish level, e.g. "Unpolished, single-origin, Tamil Nadu").
4. Star rating and count, linking to reviews.
5. Pack-size buttons, e.g. 500 g / 1 kg / 5 kg, each showing its price.
6. Price block: selling price large. "MRP ₹X" struck through. "You save ₹Y (Z%)". "Inclusive of all taxes". Unit price "(₹N per kg)".
7. Quantity and Add to cart.
8. Delivery estimate and shipping-cost line. Returns link.
9. 3–5 highlights.
10. Collapsed sections, in this order: Description / About this rice; How to cook; Product facts (spec table); Nutrition; Ingredients & allergens; Storage & shelf life; Manufacturer & legal declarations (Legal Metrology/FSSAI block); FAQs.
11. Reviews, with a distribution summary.
12. "Cook it with" supplementary items (e.g. ghee, dal).
13. Alternatives (other heritage rices).

Leave the first section (Description) open by default. A slim sticky bar appears once the main Add to cart button scrolls out of view. It shows the selected pack, price and button. This rests on vendor tests only, so A/B test it rather than assume a lift.

**Desktop**
- Two columns above the fold: gallery on the left (about 55%), buy box on the right. The buy box holds name, rating, pack buttons, price/MRP/unit price, Add to cart, delivery/returns and highlights.
- Below the fold, use full-width expanded sections in the same order as mobile. For long pages, add a sticky in-page table of contents (Description · How to cook · Facts · Nutrition · Reviews).
- Avoid horizontal tabs for these main sections.

**Above the fold**
On mobile, the first screen probably fits only the gallery, name, rating and price. That makes it important to keep the pack selector and Add to cart within one short scroll, and to have the sticky bar.

**Highlights vs long text**
Use highlights for heritage rice and other hero SKUs. For simple SKUs such as a standard flour, a short paragraph plus bullets is enough, matching Baymard's "complex or important products" guidance.

### Gaps
- Baymard's exact sticky-add-to-cart findings, and its mobile "above the fold" figures, are behind the paywall.
- The 27%/8% tab figures could not be confirmed on the live 2026 page (secondary summary only).
- I found no Baymard or NN/g research specific to grocery or food PDPs (cooking instructions, nutrition tables).

---

## 2. What Indian organic / heritage-food D2C brands show on product pages

### Takeaway
I could verify only a few pages directly. Two Brothers, Conscious Food and Bio Basics pages returned HTTP 429, and the 24 Mantra domain did not resolve. Jivabhumi's Mapillai Samba page was the only full page I read. Its layout is reasonable but it leaves out most legally required declarations. Other heritage-rice sellers seen in search results commonly use health claims ("Low GI", "supports heart health", "gut health") that appear to conflict with FSSAI's claims rules (see section 3).

### Cited Findings
- **Jivabhumi, "Organic - Mapillai Samba Rice - Unpolished Raw"** (live Nov 2026). — [Jivabhumi](https://www.jivabhumi.com/products/mapillai-samba-rice-unpolished)
  - **Layout:** Title → review count (3) with "Write a review" → pack selector (500 g / 1 kg / 5 kg) → price "Rs. 80.00" (no MRP shown) → Add to cart, wishlist, "Ask a Question" → certification logos (PGS Organic Council) → **horizontal tabs**: Description / Cooking Instructions / Reviews.
  - **Description:** a short paragraph plus six highlight bullets.
  - **Sensory and use copy:** "unique aroma, reddish-brown hue, and firm texture"; "Soft yet firm grains that hold shape after cooking"; "ideal for daily meals, biryani, pongal, and other South Indian delicacies."
  - **Cooking instructions:** seven steps. Rinse, soak 2–3 hours, pressure-cook "on medium heat for 4–5 whistles, then allow the pressure to release naturally."
  - **Not shown:** product-specific origin, nutrition table, shelf life, FSSAI licence, manufacturer/packer address, country of origin, FAQs, related products.
  - **Health claim used:** "Supports digestion, heart health, and overall wellness."
- **Two Brothers Organic Farms** ("Low GI Rice | Kalanamak Variety"). — [Two Brothers (search snippet)](https://twobrothersindiashop.com/products/low-gi-rice-kalanamak-variety)
  - **Origin and description:** from Eastern Uttar Pradesh, described as semi-polished and aromatic. The grain is white once the black/brown husk is removed.
  - **Health claims:** "low glycemic index", "packed with iron and zinc", and promoting gut health.
  - **Pack sizes and prices:** 1 kg ₹355 and 2 kg ₹695 in one snapshot. Another showed 10 kg at ₹4,095 list, with sale prices that differed between pages.
  - **Other heritage rices:** the store also sells Ajara Ghansal, Ambemohar and Indrayani, labelled native and unpolished or semi-polished. It has a "Shop by Concern" collection (e.g. gut health). — [Two Brothers collection](https://twobrothersindiashop.com/collections/rice), [Shop by concern](https://twobrothersindiashop.com/collections/shop-by-concern)
  - I could not open the page itself, so its section structure, nutrition table and legal block are unverified.
- **Bio Basics** (Tamil heritage-rice brand) sells Mappilai Samba as "unpolished parboiled" (500 g) and "semi-polished parboiled" (1–5 kg, "From ₹140"). It states the rice is free of chemicals, fertilisers and pesticides. Page structure not verified (429). — [Bio Basics collection](https://www.biobasics.org/collections/mappilai-samba-rice), [product](https://biobasics.org/products/mappilai-samba-rice-unpolished-parboiled)
- **Healthy Buddha** lists Mapillai Samba 1 kg at Rs 239 and notes the variety is hardy and suited to organic farming. — [Healthy Buddha](https://healthybuddha.in/mapillai-samba-rice)
- **Variety naming:** sellers name variety, polish level (unpolished / semi-polished), processing (raw / parboiled) and region as the primary product descriptors. — [Bio Basics](https://biobasics.org/products/mappilai-samba-red-rice-unpolished-raw), [Jivabhumi](https://www.jivabhumi.com/products/mapillai-samba-rice-unpolished)

### Inferences
My synthesis.
- The useful pattern to copy from these sellers:
  - Name the variety, polish and parboil status in the title or subtitle.
  - Give a soak time, a water ratio or whistle count, and a resting step in "How to cook."
  - Name traditional dishes the rice is used for.
- What to avoid copying:
  - Horizontal tabs.
  - A missing MRP or unit price.
  - A missing legal-declaration block.
  - Disease or health-benefit claims.
- These sellers commonly leave out structured "Product facts". That gives a store room to differentiate by showing verifiable facts: variety, region or district, harvest season, polish level, grain length, colour, certification and certifier, pack date or best-before policy.

### Gaps
- I could not verify page structure for Two Brothers, Organic Tattva, 24 Mantra, Pro Nature or Conscious Food. Fetches were rate-limited (HTTP 429) or the domain failed, and searches did not surface their product pages. Their nutrition-table formats, cooking-guide formats and legal blocks remain unverified.
- No source found on how these brands present dried flowers or drinks.

---

## 3. Indian legal requirements for an e-commerce food product page

### Takeaway
Two regimes apply to the page.
- **Legal Metrology:** the Legal Metrology (Packaged Commodities) Rules 2011, rule 6(10), as amended in 2017, requires the e-commerce entity to show the package declarations on the listing:
  - maker/packer/importer name and address;
  - generic name;
  - net quantity;
  - MRP inclusive of taxes;
  - unit sale price;
  - consumer care;
  - country of origin;
  - date-related declarations.
  From 1 July 2026, rule 6(10A) also requires a searchable and sortable country-of-origin filter for imported products.
- **FSSAI:** the Labelling & Display Regulations 2020, reg 4(2), require all mandatory label information to be given online before sale, except batch/lot number, best-before, use-by, expiry and manufacture/packing date. That covers:
  - name of food;
  - ingredients;
  - nutrition (single-ingredient unprocessed foods are exempt);
  - veg logo;
  - allergens;
  - FSSAI logo and licence number;
  - address;
  - instructions for use;
  - the organic logo where certified.

FSSAI's Dec 2024 advisory requires at least 30% shelf life, or 45 days, remaining at delivery. The Advertising & Claims Regulations 2018 cover websites. They ban "prevent, alleviate, treat or cure" disease claims and any suggestion of medical endorsement. Nutrient claims must meet Schedule I thresholds, and "traditional" requires 30 years of unchanged use.

### Cited Findings

**Legal Metrology (Packaged Commodities) Rules 2011**
- Rule 6(10) (inserted by the 2017 amendment) requires e-commerce entities to display the rule 6 declarations on the platform. Sources number it variously as Rule 6(10) or "sub-rule 4(10)". — [Mondaq 2017](https://www.mondaq.com/india/commoditiesderivativesstock-exchanges/662702/e-commerce-entities-legal-metrology-packaged-commodities-amendment-rules-2017), [ONDC compliance handbook](https://www.ondc.org/legal-compliance-handbook/Annexure---B.1085767691.html)
- Declarations listed by S.S. Rana & Co. (16 Sep 2024): name and address of manufacturer/packer/importer; country of origin; generic name; net quantity; date of manufacture; best-before/use-by date; MRP inclusive of all taxes; dimensions of the commodity; consumer care details; unit sale price. — [S.S. Rana](https://ssrana.in/articles/compliances-for-website-e-commerce-website/)
- **Marketplace liability:** responsibility for the correctness of declarations can rest with the manufacturer or seller if the e-commerce entity meets certain conditions. This protection does not apply if the entity abets wrongdoing or fails to act after notice. — [S.S. Rana](https://ssrana.in/articles/compliances-for-website-e-commerce-website/)
- **2026 amendment:** G.S.R. 128(E) of 13 Feb 2026, effective 1 Jul 2026, inserts rule 6(10A). E-commerce entities selling imported products must provide a "searchable and sortable filter specifying the country of origin." Legal commentary says country of origin should therefore be a structured data attribute and that D2C brands are in scope. — [Legal500/Mondaq](https://www.legal500.com/intelligence/india/finance-and-banking/regulatory-update-legal-metrology-packaged-commodities-amendment-rules-2026)

**FSS (Labelling and Display) Regulations 2020**
- Reg 4(2): for e-commerce or direct selling, "the mandatory requirements of the label as given in these regulations shall be provided to the consumer through appropriate means before sale except 'batch number/ lot number, best before, use by date, expiry date, date of manufacturing/ packing.'" — [TaxGuru reproduction](https://taxguru.in/corporate-law/food-safety-standards-labelling-display-regulations-2020.html)
- Mandatory label items under reg 5. — [TaxGuru](https://taxguru.in/corporate-law/food-safety-standards-labelling-display-regulations-2020.html)
  - name of food showing its true nature;
  - ingredients (except single-ingredient foods);
  - nutritional information per 100 g/ml (energy, protein, carbohydrate, sugars, fat, sodium etc.);
  - veg/non-veg symbol;
  - additives;
  - name and complete address of brand owner/manufacturer/marketer/packer;
  - FSSAI logo and licence number of the brand owner, and of the manufacturer/packer if different;
  - net quantity, retail sale price and consumer care, per Legal Metrology;
  - batch number;
  - date marking;
  - country of origin for imported food;
  - instructions for use;
  - allergen declaration ("Contains…").
- Nutrition exemption: reg 5(3)(c) exempts "unprocessed products that comprise a single ingredient." — [TaxGuru](https://taxguru.in/corporate-law/food-safety-standards-labelling-display-regulations-2020.html)
- Organic: certified organic food must carry the organic logo (Jaivik Bharat), cross-referring to the FSS (Organic Foods) Regulations 2017. — [TaxGuru](https://taxguru.in/corporate-law/food-safety-standards-labelling-display-regulations-2020.html)

**FSSAI e-commerce advisory (3 Dec 2024)**
- Products must have at least 30% of shelf life, or 45 days, remaining at delivery. Some outlets write "and"; the advisory's wording supports "or". — [FSSAI advisory PDF](https://fssai.gov.in/upload/advisories/2024/12/674efa161d756Adobe%20Scan%203%20Dec%202024.pdf), [LiveLaw](https://www.livelaw.in/amp/consumer-cases/fssai-issues-advisory-for-e-commerce-food-business-operators-to-ensure-consumer-protection-279669), [Mondaq](https://www.mondaq.com/india/food-and-drugs-law/1555240/fssai-strengthens-food-safety-compliance-for-ecommerce-key-recommendations-and-impacts)
- Online claims must match the physical label. — [FoodNavigator](https://www.foodnavigator.com/Article/2025/02/24/india-tightens-food-safety-standards-for-e-commerce-platforms/)
- Platforms must not list sellers without a valid FSSAI licence or registration, and are encouraged to display licence numbers prominently. — [Lexplosion](https://lexplosion.in/fssai-issues-advisory-for-e-commerce-fbos-to-strengthen-food-safety-ecosystem-prohibits-unregistered-sellers-on-e-commerce-food-platforms/), [Chemlinked](https://food.chemlinked.com/news/food-news/fssai-reinforce-compliance-requirements-for-e-commerce-food-businesses)
- I did not open the advisory PDF directly; details come from secondary coverage.

**FSS (Advertising and Claims) Regulations 2018**
Quoted from FSSAI's compendium Version II, 16.11.2021, text extracted from the FSSAI PDF. — [FSSAI compendium](https://fssai.gov.in/upload/uploadfiles/files/Compendium_Advertising_Claims_Regulations_16_11_2021.pdf)
- **Scope:** reg 2 defines advertisement to include "electronic media, internet or website." Compliance was due by 1 Jul 2019.
- **Reg 4, general principles:** claims "must be truthful, unambiguous, meaningful, not misleading." They must not encourage excess consumption or imply that a balanced diet cannot supply nutrients. If a benefit depends on the preparation method, that method must be given. Reduction-of-disease-risk claims must state servings per day.
- **Reg 5 and Schedule I, nutrition claims:** "low", "free", "source", "high/rich" claims must meet Schedule I conditions. Schedule I values in the compendium:
  - **Dietary fibre:** "Source" at least 3 g per 100 g (or 1.5 g/100 kcal). "High/Rich" at least 6 g per 100 g (or 3 g/100 kcal).
  - **Protein:** "Source" 10% of RDA per 100 g solids. "High" 20% of RDA per 100 g.
  - **Vitamins/minerals:** "Source" at least 15% of RDA per 100 g. "High" at least 30%.
  - **Sugar:** "Sugar free" at most 0.5 g per 100 g/ml.
  - **"Low sugar":** the compendium shows both 5 g and 6 g per 100 g for solids (original vs substituted text), so verify the current figure.
  - **Low sodium:** at most 0.12 g per 100 g.
- **Reg 6, non-addition claims:** "no added sugar" is allowed only if no sugars of any type (including honey, jaggery-type sugars, molasses) are added, no sugar-containing ingredients are used, and no ingredients substitute for added sugars. The source lists sucrose, glucose, honey, molasses and corn syrup as examples; "jaggery-type" is my paraphrase.
- **Reg 7, health claims:** must have two parts. (i) the physiological role of the nutrient or an accepted diet–health relationship; (ii) the product's composition relevant to it. If the benefit is attributed to a nutrient with an RDA, the food must be a "source" of or "high" in that nutrient per Schedule I.
- **Reg 10, prohibited claims:**
  - 10(1): "no claims shall be made which refer to the suitability of the food for use in the prevention, alleviation, treatment or cure of a disease, disorder or particular physiological condition unless specifically permitted" under other FSS regulations.
  - 10(2): bars words or implications that the food is "recommended, prescribed, or approved by medical practitioners or approved for medical purpose."
- **Regs 11–12:** prior FSSAI approval is needed for reduction-of-disease-risk claims not already defined in the regulations. Applications need scientific substantiation and "well-designed human intervention studies" for health claims.
- **Schedule V, conditions for specific words:**
  - "Natural": a single food from a recognised source to which nothing has been added, with only minimal processing such as roasting, drying or fermentation. Composite foods cannot be called natural directly.
  - "Fresh": only washed, peeled, chilled, trimmed or cut, or minimal safety processing.
  - "Pure": a single-ingredient food with nothing added, free from avoidable contamination, and contaminants below the prescribed limits.
  - "Authentic/Genuine/Real": may be used only if the label or advertisement also explains how the quality is tangibly justified.
  - "Traditional": a "formulation or processing method for a product that has existed for a generation (thirty years)," available substantially unchanged for that period.
  - "Original": a traceable formulation, essentially unchanged, with no replacement of major ingredients.
- **Glycaemic index:** I found no Schedule I entry for glycaemic index or "diabetic-friendly" in the extracted compendium text.
- **Consumer Protection (E-Commerce) Rules 2020:** sellers must disclose information needed for a purchase decision, including country of origin and the grievance officer's name, contact and designation. Grievance acknowledgement is due within 48 hours and resolution within one month. — [IndiaLaw summary](https://www.indialaw.in/guides/civil/consumer-protection-e-commerce-rules/), [Trilegal](https://trilegal.com/knowledge-repository/consumer-protection-e-commerce-rules-2020/)

### Inferences
My synthesis. This is not legal advice; confirm with a food-regulatory lawyer.

**Put a "Product information / Legal declarations" block on every PDP**, near Product facts, containing:
- generic name (e.g. "Rice (unpolished, raw), Mapillai Samba variety");
- net quantity per selected pack;
- MRP ₹X (inclusive of all taxes);
- unit sale price (₹ per kg or per 100 g, as the LM rules specify for the quantity);
- name and full address of manufacturer, packer or marketer;
- FSSAI logo and licence number(s);
- country of origin: India;
- consumer care: phone, email and address;
- best-before or shelf-life policy (e.g. "Best before 9 months from packing; delivered with at least 30% / 45 days of shelf life remaining");
- veg symbol;
- organic certification and certifier (Jaivik Bharat / India Organic / PGS-India, as applicable);
- storage instructions;
- allergen statement where relevant (e.g. flours milled in a facility that handles gluten).

**Two conflicts on dates.** The LM list (S.S. Rana) includes date of manufacture and best-before, while FSSAI reg 4(2) exempts date marking online. The safe course is to show a best-before policy and state that the actual date is printed on the pack. These declarations must also update when the pack-size variant changes, in line with Baymard's variant-sync finding.

**Nutrition.** Single-ingredient unprocessed rice and flours appear exempt from nutrition labelling under reg 5(3)(c). If a table is shown, it should be per 100 g from a lab report or a cited source such as the IFCT 2017 tables. Any nutrient adjective ("high fibre", "source of iron") must meet Schedule I. Drinks and blends are not single-ingredient, so they need full nutrition and ingredients.

**Claims to avoid**
- "Cures, treats or prevents diabetes, PCOS or BP." This is barred by reg 10(1).
- "Diabetic-friendly" or "good for diabetics." This implies suitability for managing a physiological condition, which is likely barred by reg 10(1).
- "Medicinal rice," "doctor-recommended," "Ayurvedic medicine." These are barred by reg 10(1)–(2). Ayurveda-specific products fall under separate FSS regulations not reviewed here.
- "Low GI." There is no Schedule I criterion for it, so it would likely need substantiation and approval as a health claim. Several Indian brands use it anyway (Two Brothers), which suggests weak enforcement but not legality.
- "Supports heart health / digestion" (as on Jivabhumi's page). This is a health claim that needs the two-part structure and a qualifying nutrient level.

**Allowed if true**
- "Unpolished", "single-origin", "PGS-certified organic", "no added sugar" (if reg 6 is met), "source of fibre" (if at least 3 g/100 g).
- "Traditional" only if the variety and processing method have existed unchanged for 30+ years, which heritage rice varieties typically meet.

### Gaps
- I could not access the official Legal Metrology gazette text of rule 6(10). The legalmetrology.gov.in and consumeraffairs.nic.in sources were not retrieved. Its exact list and any date-of-manufacture or "best before" carve-out are therefore unconfirmed, and the S.S. Rana and FSSAI lists conflict on dates.
- Whether the 2022 LMPC amendments changed the unit-sale-price format (per kg vs per 100 g) was not verified here.
- The text of the 3 Dec 2024 FSSAI advisory was not read directly.
- Whether the June 2021 draft E-Commerce Rules amendments (best-before and country of origin for marketplaces) were adopted is unverified.
- The current "low sugar" Schedule I threshold (5 g vs 6 g) is ambiguous in the compendium.
- No FSSAI ruling or enforcement action specifically on "Low GI" claims was found.

---

## 4. How to write honest, specific, non-generic food product copy

### Takeaway
The evidence points to concise, scannable, objective copy:
- facts over adjectives;
- specific origin, variety, process and sensory detail;
- cooking steps with numbers;
- traditional use framed as how people have cooked it, not as a health effect.

FSSAI's word rules ("natural", "pure", "authentic", "traditional") make vague marketing words legally risky as well as weak.

### Cited Findings
- NN/g:
  - Removing promotional "marketese" (exaggeration, subjective claims, boasting) improved usability by 27%. Concise, scannable and objective together improved it by 124% (1997 study, older).
  - Users distrust marketing language.
  - Recommended practices: inverted pyramid (main point first), one idea per paragraph, bolded keywords. — [NN/g](https://www.nngroup.com/articles/concise-scannable-and-objective-how-to-write-for-the-web/)
- Baymard:
  - Bullet-only "feature dumps" were called "bland" and "boring."
  - Highlights should focus on unique selling points rather than every feature. — [Baymard](https://baymard.com/research-articles/structure-descriptions-by-highlights)
- Baymard DTC research:
  - Users want specifics about ingredients and materials, and dismiss products lacking them.
  - Production practices and quality reassurance matter.
  - Origin and founder stories draw engagement. — [Baymard](https://baymard.com/research-articles/dtc-users-informational-needs)
- FSSAI Schedule V:
  - "Authentic/Genuine/Real" must be backed by an explanation of how quality is tangibly justified.
  - "Traditional" requires 30+ years unchanged.
  - "Pure" and "Natural" have strict conditions.
  - Words that "may give an erroneous impression" shall not be used. — [FSSAI compendium](https://fssai.gov.in/upload/uploadfiles/files/Compendium_Advertising_Claims_Regulations_16_11_2021.pdf)
- Example of specific, sensory copy from an Indian seller:
  - "reddish-brown hue, and firm texture";
  - "Soft yet firm grains that hold shape after cooking";
  - dish pairings "biryani, pongal";
  - numbered cooking steps (soak 2–3 hours; 4–5 whistles; natural pressure release). — [Jivabhumi](https://www.jivabhumi.com/products/mapillai-samba-rice-unpolished)

### Inferences
My synthesis and writing guidance, not sourced research.

**Copy pattern for heritage rice**
1. **Lead line, a fact:** "Mapillai Samba, a red, unpolished rice from [district], Tamil Nadu. Grown by [farm/cluster], PGS-certified."
2. **Sensory, concrete:** grain colour after cooking, firmness, whether grains stay separate or turn sticky, aroma, how the taste differs from white rice (e.g. "nutty, a little earthy").
3. **Traditional use, framed as culture rather than effect:** e.g. "In Tamil Nadu it is traditionally cooked for kanji and served at weddings" (verify each claim). Avoid "gives strength", "cures", "for diabetics".
4. **How to cook, with numbers:**
   - rinse (how many times);
   - soak (hours);
   - water ratio (cups water : 1 cup rice);
   - pressure-cooker whistles or open-pot minutes;
   - resting time;
   - expected yield;
   - one dish suggestion.
   Give stovetop, pressure cooker and rice cooker variants.
5. **Product facts table:**
   - variety;
   - region;
   - type (raw/parboiled);
   - polish;
   - grain (short/medium/long);
   - colour;
   - harvest season;
   - certification;
   - pack sizes;
   - shelf life;
   - storage.

**Dried flowers (e.g. for tea)**
- Botanical name, part used, drying method, how to brew (g per cup, water temperature, steep minutes), flavour, colour of the infusion, storage.
- No health effects. Many herbal or flower products may fall under nutraceutical or other FSS categories, which needs verification.

**Flours**
Grain source, stone-ground or roller-milled, fineness, typical uses (roti, dosa, baking), water absorption tip, shelf life (shorter for whole-grain flours), allergens.

**Drinks**
Full ingredients, nutrition per 100 ml, sugar source stated honestly. Use "no added sugar" only if reg 6 is met. Give preparation and serving.

**Avoid generic or AI-sounding filler**
"nature's goodness", "wholesome goodness", "superfood", "elevate your meals", "journey", "nourish your body and soul", stacked adjectives, emoji, unverifiable superlatives ("best", "purest"). Replace each with a fact the reader could check: a place, a number, a process, or a dish.

### Gaps
- No rigorous study on food-specific PDP copy (sensory language vs nutrition language) and conversion was found.
- No source verified specific traditional uses for each heritage rice variety; these must be checked per SKU.
