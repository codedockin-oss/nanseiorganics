# Admin panel "full control" for a small Indian D2C food store (rice, flours, dried flowers): best practices, India compliance, security, priority order

Research date: 12 Nov 2026. Sources are labelled with their date where known. "Secondary" = compliance blog or law-firm summary, not the government text. Things I could not verify are in Gaps, not stated as fact.

## Q1. Core admin areas and must-have controls, and how leading platforms implement them

### Takeaway
Leading platforms divide admin control into about 20 permission areas (orders, products, inventory, customers, discounts, content, online store, settings, finance, analytics). For a 1–3 person food store the essentials are: products with weight variants and per-variant stock, low-stock alerts, an order status workflow with COD confirmation, GST/FSSAI-compliant invoices, discounts, homepage content, and store settings (shipping, COD, tax, legal info). Per-record permissions and deep analytics can wait.

### Cited Findings
**How Shopify divides the admin (a reference model for what "full control" covers)**
- Shopify groups staff store permissions into categories: Home, Orders, Draft orders, Products, Inventory, Catalogs, Gift cards, Customers, Flow automations, Analytics, Marketing, Discounts, Content, Files, Online store, Checkout and customer accounts, Companies, App development, Store settings, and Finance. Apps/channels and POS are handled separately. — [Shopify Help: Store permissions](https://help.shopify.com/en/manual/your-account/users/roles/permissions/store-permissions)
- Within each category, Shopify splits permissions into levels such as View, Create and edit, Delete, Export and Manage. It flags some as sensitive (billing payment methods, data requests, tax documents). Permissions are store-level: you cannot limit a staff member to particular orders or products. — [Shopify Help: Store permissions](https://help.shopify.com/en/manual/your-account/users/roles/permissions/store-permissions)
- Shopify assigns permissions through roles. Choosing a permission that depends on others selects those automatically (for example, Products, Content or Online store auto-select Files). — [Shopify Help: Store permissions](https://help.shopify.com/en/manual/your-account/users/roles/permissions/store-permissions)

**Inventory controls (WooCommerce, a reference for a minimal but complete set)**
- WooCommerce > Settings > Products > Inventory offers these controls:
  - **Manage stock:** tracks counts, subtracts sales and adds returns back.
  - **Hold stock (minutes):** holds stock on "Pending payment" orders, then cancels the order and releases the stock.
  - **Email notifications:** separate toggles for low stock, out of stock and backorders, sent to configurable recipients.
  - **Thresholds:** a low stock threshold and a separate out-of-stock threshold.
  - **Out of stock visibility:** hides out-of-stock items from the catalogue.
  - **Stock display format:** always show the amount, show it only when low, or never show it.
  — [WooCommerce docs: Products settings](https://woocommerce.com/document/configuring-woocommerce-settings/products/) (page undated; footer © 2026)

**Zoho Commerce (India edition) tax setup**
- Zoho Commerce has a GST Settings page under Settings > Taxes. You enable GST registration and enter your GSTIN and legal name, and default GST rates then fill in automatically. Tax rules apply rates to matching products automatically, tax exemptions exclude items, and GST TDS can be switched on. — [Zoho Commerce Help: Taxes](https://www.zoho.com/commerce/help/Taxes/)
- In Zoho's GST tools, each item carries its own HSN code (SAC for services). — [Zoho Invoice Help: GST](https://www.zoho.com/in/invoice/help/gst/) (Zoho Invoice docs, not Zoho Commerce specifically)

**Orders and COD in Indian practice (Shiprocket)**
- Shiprocket Engage, a Shopify app, sends automated WhatsApp messages before shipping. It covers order confirmation, address verification and COD-to-prepaid conversion. — [Shopify App Store: Shiprocket Engage](https://apps.shopify.com/shiprocket-engage)
- Shiprocket support describes "COD Management with AI", which flags risky COD orders and pushes prepaid options with discounts. — [Shiprocket Support: tools to reduce RTO](https://support.shiprocket.in/support/solutions/articles/152000000948-how-can-i-reduce-my-rto-shipments-what-are-the-tools-offered-by-shiprocket-)
- Shiprocket also has a call-based "Order Verification" shipment setting (Settings > Additional Settings > Shipment Features), where the seller verifies orders by calling from the seller panel. — [Shiprocket SOP: Order verification](https://sites.google.com/shiprocket.com/sop-shiprocket/order-verification)
- Shiprocket's case study claims WhatsApp workflows (built with Kaleyra) cut RTO losses by 45%. This is a vendor claim with no independent audit. — [Tata Communications/Shiprocket case study PDF](https://tatacommunications.com/hubfs/47271964/TaCO-2024/case-studies/doc/Shiprocket-WhatsApp.pdf) (2024)
- A courier aggregator says OTP confirmation by SMS or WhatsApp before dispatch cuts RTO by 34–41% for medium-risk orders. It gives no source, so treat this as an estimate. — [Shipmozo blog: COD verification via WhatsApp](https://www.shipmozo.com/blog/cod-verification-whatsapp-reduce-cod-fraud)

### Inferences
- Recommended admin modules for this store, mapped to the platform patterns above:
  1. **Products:** title, slug, description, category, images (ordered, with alt text), and weight variants (e.g. 500 g / 1 kg / 5 kg). Each variant carries its own SKU, MRP, selling price, stock and net weight. Each product also needs an HSN code and GST rate, legal-metrology fields (see Q2), SEO title and description, and a status of Draft, Active or Hidden.
  2. **Inventory:** per-variant stock, a low-stock threshold with email or WhatsApp alert, auto "out of stock" at zero, and a choice to hide or show sold-out items (copy WooCommerce's four settings above).
  3. **Orders:** a status workflow (Pending, COD-confirmed/Paid, Packed, Shipped with AWB, Delivered, Cancelled, Returned/RTO, Refunded). Also needed: a COD confirmation step before packing, cancel and refund with a reason, an internal notes and timeline per order, a printable GST invoice and packing slip, and an AWB/tracking field. A Shiprocket API push can come later.
  4. **Customers:** list and search, order history, COD-refusal count or flag (to support COD risk decisions), and export.
  5. **Discounts:** percentage, flat ₹, and free shipping. Each needs a minimum order value, start and end dates, total and per-customer usage limits, and an active toggle.
  6. **Content:** hero/banners, announcement bar, blog posts and policy pages, each with a draft/published state.
  7. **Settings:** business legal name, address, phone, email, GSTIN, FSSAI number, grievance officer, shipping rates and free-shipping threshold, COD on/off, COD fee and COD maximum order value, and invoice prefix and numbering.
  8. **Reviews:** moderation queue (approve, hide, reply). Never let admins write reviews as customers (see Q2).
  9. **Reports:** sales by day or month, orders by status, top products and variants, COD versus prepaid share, RTO rate, and CSV export for the accountant (GST filing).
  10. **Staff and roles:** Owner and Staff at minimum.
- Shopify's lesson that permissions are store-level, not per record, suggests a small store needs only 2–3 coarse roles: Owner (everything, including settings and staff), Operations (orders, inventory, customers) and Content (products, content, reviews). Building per-record ACLs is not worth the effort at this size.
- All of the above is plain CRUD plus a few PDF/print views, which suits Node/Express/MongoDB and a static admin HTML page.

### Gaps
- I did not fetch Dukaan's or other Shopify India app documentation, so I can't cite Dukaan-specific feature names.
- I could not confirm whether Zoho Commerce has a native COD setting or how its GST invoices are laid out.
- I did not fetch Shopify's or WooCommerce's discount and coupon docs. The discount feature list above is practitioner knowledge, not cited.
- Baymard and NN/g research on admin UX was not reviewed; I found no admin-specific studies in the time available.

## Q2. India-specific requirements the admin must support

### Takeaway
Four rule sets drive admin fields:
- **GST Rule 46:** what goes on the invoice.
- **FSSAI:** the licence number on invoices and the website.
- **Consumer Protection (E-Commerce) Rules 2020:** seller identity, grievance officer and policies shown on the site, plus no fake reviews.
- **Legal Metrology rule 6(10):** MRP, net quantity, best-before, manufacturer/packer and country of origin shown on each product page.

The admin should store these once in Settings and per product, and render them automatically.

### Cited Findings
**GST tax invoice: Rule 46 CGST Rules, 2017 (as amended up to Notification 38/2023-CT)**
- A tax invoice must show:
  - (a) supplier name, address and GSTIN
  - (b) a serial number of up to 16 characters (letters, numerals, "-" or "/"), unique within the financial year
  - (c) date of issue
  - (d) recipient name, address and GSTIN if registered
  - (e) for an unregistered recipient with taxable value of ₹50,000 or more: name, address, delivery address, and state name and code
  - (f) below ₹50,000: the same details only if the recipient asks
  - (g) HSN code
  - (h) description
  - (i) quantity with unit/UQC
  - (j) total value
  - (k) taxable value after discount
  - (l) rate of tax (CGST/SGST/IGST/cess)
  - (m) amount of tax
  - (n) place of supply with state name for inter-State supplies
  - (o) delivery address if different from the place of supply
  - (p) whether reverse charge applies
  - (q) signature or digital signature (waived for electronic invoices under the IT Act)
  - (r)/(s) the e-invoice QR/IRN or a declaration, for taxpayers above the notified threshold
  — [GSTZen: Rule 46 text](https://gstzen.in/a/tax-invoice-cgst-rule-46.html) (secondary copy of the rule; page dated Feb 2021, amendments listed to Aug 2023)
- If the recipient is unregistered and doesn't need an invoice, a consolidated invoice may be issued at the end of each day. — [GSTZen: Rule 46 text](https://gstzen.in/a/tax-invoice-cgst-rule-46.html)
- The number of HSN digits required is set by CBIC notification, not by Rule 46 itself (the proviso was substituted by Notification 79/2020-CT). — [GSTZen: Rule 46 text](https://gstzen.in/a/tax-invoice-cgst-rule-46.html)
- HSN digits by turnover:
  - Up to ₹5 crore aggregate turnover: 4-digit HSN, mandatory on B2B invoices.
  - Above ₹5 crore: 6 digits.
  - Secondary summaries only; see [GimBooks Rule 46 checklist](https://www.gimbooks.com/blog/gst-invoice-mandatory-fields-rule-46-checklist/) and [Tally: GST invoice format](https://tallysolutions.com/gst/gst-invoice-format-mandatory-fields-rules-and-examples-for-businesses/).
  - I did not read Notification 78/2020-CT itself.

**HSN and GST rates for this catalogue**
- Rice is HSN 1006 and wheat/meslin flour (atta) is HSN 1101. A CBIC-based ready reckoner from Sept 2025 lists pre-packaged and labelled 1006 and 1101 at 2.5% CGST, i.e. 5% total with SGST. Loose, unbranded versions are Nil. — [CBIC GST Ready Reckoner (Sept 2025), via a2ztaxcorp](https://a2ztaxcorp.net/wp-content/uploads/2025/09/CBIC-GST-Ready-Reckoner-indicating-updated-Central-Goods-and-Services-Tax-CGST-rates-on-goods.pdf); [West Bengal consolidated GST rate chart (16 Apr 2026)](https://comtax.wb.gov.in/GST/GST_PPU/CONSOLIDATED%20GST%20RATE%20CHART%20OF%20GOODS_20260416.pdf)
- Other flours (e.g. rice flour, millet flour) fall under HSN 1102 in the milling-products chapter. — [Aditya Birla Capital: Chapter 11 HSN](https://www.adityabirlacapital.com/abc-of-money/chapter-11-milling-products-malt-starches-inulin-wheat-gluten-gst-rate-hsn-code) (secondary; I did not verify the exact rates for 1102)
- HSN 0603 covers cut flowers (fresh, dried, dyed, bleached, etc.) for bouquets or ornamental use. Secondary sites list it as Nil GST, unchanged on 22 Sep 2025. — [RegisterKaro: HSN 0603](https://www.registerkaro.in/hsn/gst-rate-hsn-code-0603); [Busy: GST on flowers](https://busy.in/gst-rates/flowers.md)
  - One site lists 18%; it looks like a generic default. — [Eximpe HSN finder 0603](https://eximpe.com/hsncode-finder/0603)
  - Artificial flowers (HSN 6702) are 18%. — [Busy](https://busy.in/gst-rates/flowers.md)

**FSSAI**
- An FSSAI order of 8 June 2021 requires food businesses to print their 14-digit FSSAI licence or registration number on cash receipts, purchase invoices, cash memos and bills. Enforcement was postponed from 1 Oct 2021 to 1 Jan 2022. — [FSSAI order PDF (01-10-2021)](https://mail.fssai.gov.in/upload/advisories/2021/10/6156936ac80bbOrder_License_Number_Print_01_10_2021.pdf); [TaxGuru summary](https://taxguru.in/corporate-law/fssai-food-businesses-mention-license-no-invoices-w-e-f-1st-october-2021.html); [SCC Online (Jun 2021)](https://www.scconline.com/blog/post/2021/06/11/fssai-issues-order-for-mandating-the-mention-of-fssai-license-registration-no-on-the-receipts-and-invoices-by-food-businesses/amp)
- An FSSAI advisory to e-commerce FBOs (Dec 2024) says no e-commerce FBO shall list a seller without displaying that seller's valid FSSAI licence or registration. It "encourages" platforms to display licence numbers and hygiene ratings prominently. — [FSSAI advisory, Dec 2024 (scanned PDF)](https://fssai.gov.in/upload/advisories/2024/12/674efa161d756Adobe%20Scan%203%20Dec%202024.pdf); summary at [IndiaLaw](https://www.indialaw.in/blog/food/fssai-food-safety-e-commerce-impacts/). The PDF is a scan and I could not extract its text, so the wording comes from search snippets.
- An FSSAI licence number is 14 digits and can be checked through FoSCoS "FBO Search". — [ClearTax: FSSAI licence number check](https://cleartax.in/s/fssai-license-number-check-online)

**Consumer Protection (E-Commerce) Rules, 2020 (notified 23 July 2020)**
- E-commerce entities must display:
  - legal name and principal geographic address of headquarters and branches
  - website details
  - customer-care email and phone
  - grievance officer details. The officer must acknowledge complaints within 48 hours and resolve them within one month.
  — [IndiaLaw summary](https://www.indialaw.in/blog/consumer-protection-e-commerce-rules/)
- Entities must also:
  - give a ticket number for each complaint
  - cancel-charge consumers only if they bear similar charges themselves when they cancel
  - record consent only through explicit action, never pre-ticked boxes
  — [IndiaLaw summary](https://www.indialaw.in/blog/consumer-protection-e-commerce-rules/)
- Inventory-model entities (selling their own stock, which describes a D2C store) must clearly show:
  - return, refund, exchange, warranty, delivery and shipment terms
  - payment methods
  - payment security
  - cancellation procedure
  - total price with a breakdown of delivery and taxes
  — [IndiaLaw summary](https://www.indialaw.in/blog/consumer-protection-e-commerce-rules/)
- Inventory-model entities also must not:
  - pose as consumers to post reviews, or misrepresent goods
  - refuse returns or refunds for defective, wrong or late goods (barring force majeure)
  — [IndiaLaw summary](https://www.indialaw.in/blog/consumer-protection-e-commerce-rules/)
- A seller must also show product expiry dates and country of origin. — [IndiaLaw summary](https://www.indialaw.in/blog/consumer-protection-e-commerce-rules/)
- The rules cover "all forms of online retail" (single-brand or multi-channel). — [IndiaLaw summary](https://www.indialaw.in/blog/consumer-protection-e-commerce-rules/)
- Draft amendments were proposed on 21 June 2021. Their adoption status is unconfirmed. — [Mondaq](https://www.mondaq.com/india/dodd-frank-consumer-protection-act/985606/the-consumer-protection-e-commerce-rules-2020)

**Legal Metrology (Packaged Commodities) Rules, 2011: rule 6(10)**
- Rule 6(10) was inserted by the 2017 Amendment (GSR 629(E), 23 June 2017), effective 1 Jan 2018. It requires e-commerce entities to display the rule 6(1) declarations on their platform, except month and year of manufacture or packing. The declarations are:
  - name and address of manufacturer, packer or importer
  - country of origin, for imports
  - common or generic name
  - net quantity in standard units
  - best-before or use-by date, where applicable
  - retail sale price (MRP, inclusive of all taxes)
  - dimensions, where relevant
  — [Lakshmikumaran & Sridharan](https://www.lkslaw.com/insights/articles/aiming-greater-transparency-on-sale-of-packaged-commodity-online) (published Jan 2018, updated Jul 2026)
- The Legal Metrology (Packaged Commodities) Amendment Rules, 2026 come into force on 1 July 2026 and insert a new sub-rule after rule 6(10). I could not read the text of that sub-rule. — [FoxMandal copy of the 2026 Gazette](https://foxmandal.in/wp-content/uploads/2026/02/Legal-Metrology-Packaged-Commodities-Amendment-Rules-2026.pdf)

**Platform support for these fields**
- Zoho Commerce India handles GSTIN, legal name, GST rates and per-item HSN natively. — [Zoho Commerce Help: Taxes](https://www.zoho.com/commerce/help/Taxes/)

### Inferences
- **Settings (single source of truth, rendered in the footer, Contact/Legal page and invoices):** legal business name, registered address, GSTIN, state and state code, FSSAI licence number, customer-care phone and email, and grievance officer name, phone and email. The policy pages are refund/return, shipping, cancellation, privacy and terms. The repo already has untracked privacy, refund and terms pages, which fits.
- **Per-product or per-variant fields:** HSN code, GST rate, MRP (inclusive of taxes), selling price, net quantity with unit, best-before (e.g. "best before 6 months from packing"), manufacturer/packer name and address, and country of origin. The product page should render these as a "Product information (as per Legal Metrology)" block. The admin should block publishing when a mandatory field is empty.
- **Invoice generator:**
  - Unique sequential number per financial year (e.g. NSO/2026-27/00042). Assign it at confirmation or shipping, never reuse it, and never delete invoices; cancel with a credit note instead.
  - Supplier GSTIN and FSSAI number.
  - Per line: HSN, quantity and unit, taxable value after discount, and rate and amount.
  - Tax split: CGST+SGST when the buyer's state matches the seller's state, IGST otherwise. Place of supply is the buyer's state, from the shipping address.
  - "Reverse charge: No", plus a computer-generated-invoice note.
  - A mixed cart (Nil-rated dried flowers plus 5% rice) needs per-line rates.
- If the store is not GST-registered (below threshold), it should issue a "bill of supply" or plain receipt rather than a tax invoice, so the admin needs a "GST registered: yes/no" switch. This is an inference; the threshold rules were not researched here.
- **Reviews:** the no-fake-reviews duty means admin review tools should allow approve, hide and reply only. No creating reviews as a customer, and no editing review text. Hiding negative reviews en masse is also risky under the unfair-trade-practice wording. That is my inference, not a cited rule.
- **COD:** charging a COD fee is allowed if it is disclosed in the price breakdown before purchase (inferred from the "total price with breakdown" duty).

### Gaps
- I could not read the full text of the Dec 2024 FSSAI advisory (scanned PDF) or the reported March 2026 FoSCoS e-commerce order. Whether the website must show the FBO's own licence number (rather than only marketplace sellers') is not confirmed from primary text, though display is the widely followed practice.
- I did not find the FSS (Labelling & Display) Regulations 2020 e-commerce clause. Searches returned only UK/EU material.
- I did not read the official text of the E-Commerce Rules 2020 (consumeraffairs.nic.in); the rule numbers above come from a secondary summary. I also did not confirm whether the 2021 draft amendments were adopted.
- The content of the 2026 Legal Metrology amendment (the new sub-rule after 6(10)) is unknown.
- The exact HSN for edible dried flowers sold for tea or culinary use (e.g. butterfly pea, hibiscus) is unconfirmed. They may fall outside 0603 (which is for bouquet/ornamental use), for example in Chapter 12 or 09, with a different rate. A CA should confirm.
- The GST registration threshold and e-invoicing threshold were not researched.

## Q3. Admin security and safety practices for a small store

### Takeaway
Protect admin login with MFA (or a 15+ character password if MFA is absent), throttling tied to the account, generic error messages and logging of failures. Then add roles, an audit log, confirmation and soft delete for destructive actions, and draft/preview. Shopify itself needed third-party apps for a detailed staff audit log, which shows it is valued but often missing.

### Cited Findings
- OWASP: "Multi-factor authentication (MFA) is by far the best defense against the majority of password-related attacks." — [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- OWASP: login throttling should count failures against the account, not the source IP. Increasing delays are preferable to fixed lockouts, and the reset flow should still work for a locked account so lockout can't be abused for denial of service. — [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- OWASP: use a generic failure response ("Login failed; Invalid user ID or password") with the same HTTP status and consistent timing, whether the account is unknown, the password is wrong or the account is locked. — [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- OWASP: without MFA, passwords shorter than 15 characters are weak. Allow at least 64 characters. Require the current credentials before changing sensitive account data. Log and review all failed logins and lockouts. — [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- Shopify lets an organisation require two-step authentication or passkeys for all users from Organization Settings > Users > Security; otherwise the choice is left to each user. — [Shopify Help: Requiring a secure sign-in method](https://help.shopify.com/en/manual/organization-settings/security/two-step-authentication). An older Shopify page says the owner can't turn on 2FA for staff. — [Shopify Help: Two-step authentication](https://help.shopify.com/en/manual/your-account/logging-in/two-step-authentication?ld=1). The org-level page appears to be newer.
- Shopify merchants on the community forum complain that the built-in activity log is shallow and can't be exported. Third-party apps (Logify, Logbook) exist to log staff edits. — [Shopify Community thread](https://community.shopify.com/t/staff-activity-logs-what-are-you-using/133900); [Logify app](https://apps.shopify.com/activity-logs); [Logbook app](https://apps.shopify.com/logbook) (anecdotal)
- Shopify marks billing payment methods, data requests and tax documents as sensitive permissions, and separates Delete and Export from View/Edit. — [Shopify Help: Store permissions](https://help.shopify.com/en/manual/your-account/users/roles/permissions/store-permissions)

### Inferences (practical for Node/Express/MongoDB)
- **Login:**
  - Use bcrypt or argon2 hashes.
  - Rate-limit failures per account (e.g. express-rate-limit plus a failure counter on the user document with growing back-off).
  - Use a generic error message.
  - Add TOTP 2FA (e.g. `otplib`) for owner and staff, with recovery codes. Alternatively, send a one-time code by email to the owner.
- **Sessions:**
  - Use short-lived admin JWT/session cookies (e.g. 8–12 h absolute, about 30 min idle), set HttpOnly, Secure and SameSite=Strict.
  - Invalidate all sessions on password change.
  - Require the current password again for: changing staff/roles, the password, GSTIN/FSSAI/bank details, or bulk delete.
- **Roles:** Owner / Operations / Content, enforced on the server in Express middleware for each route. Hiding buttons in the HTML is not enough.
- **Audit log:** a MongoDB `auditLogs` collection with who, when, action, entity type and id, and before/after diff, plus IP and user agent. Make it append-only (no delete route), viewable and filterable in the admin, and exportable to CSV. Log logins and failed logins too.
- **Destructive actions:**
  - Show a confirm dialog naming the item ("Delete 'Sona Masoori 5 kg'?"). For bulk actions, ask the user to type the count or the word DELETE.
  - Products, banners, coupons and blog posts get soft delete (`deletedAt`), a Trash view with restore, and an optional purge after 30 days.
  - Orders and invoices are never deleted, only cancelled, because GST records must be kept.
- **Preview and publish:** draft/published status on products, banners and blog posts. A "Preview" link renders the storefront with a preview token. Scheduled publish and unpublish for banners and coupons.
- **Price and stock safety:** validate on the server that selling price ≤ MRP and stock ≥ 0. Warn on more than a 50% price change, a common fat-finger guard.

### Gaps
- I did not fetch OWASP's Session Management or Access Control cheat sheets, so the session-timeout figures above are typical values, not OWASP-cited numbers.
- I found no Baymard or NN/g research specifically on admin-panel confirm/undo patterns.

## Q4. What gives the most value first: recommended order of work for a 1–3 person store

### Takeaway
Start with what protects revenue and legal standing: admin security, then products and stock, then order workflow with COD confirmation, then compliant invoices and legal store info. Next comes merchandising (discounts, banners), then reviews and reports. Leave staff roles beyond Owner plus one, and courier API automation, for last.

### Cited Findings
- COD confirmation before dispatch is the main RTO-reduction lever in Indian D2C tooling. The figures are vendor or aggregator claims: a 45% cut in RTO losses ([Shiprocket/Tata Comms case study](https://tatacommunications.com/hubfs/47271964/TaCO-2024/case-studies/doc/Shiprocket-WhatsApp.pdf)) and 34–41% for medium-risk orders ([Shipmozo](https://www.shipmozo.com/blog/cod-verification-whatsapp-reduce-cod-fraud)).
- An FSSAI number on invoices has been required since 1 Jan 2022 ([FSSAI order](https://mail.fssai.gov.in/upload/advisories/2021/10/6156936ac80bbOrder_License_Number_Print_01_10_2021.pdf)). GST Rule 46 fields are mandatory on every tax invoice ([GSTZen](https://gstzen.in/a/tax-invoice-cgst-rule-46.html)). Legal Metrology declarations have been required online since 1 Jan 2018 ([LKS](https://www.lkslaw.com/insights/articles/aiming-greater-transparency-on-sale-of-packaged-commodity-online)). These are non-optional, which pushes them early.
- MFA is the single strongest control against password attacks. — [OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

### Inferences: recommended order
1. **Admin lock-down (1–2 days):** login rate-limit, generic errors, strong password, session expiry, server-side role checks, and a basic audit log of logins and edits. This protects everything else.
2. **Products and variants with compliance fields:** weight variants, MRP and price, per-variant stock, images, Draft/Active, and HSN/GST and Legal Metrology fields with publish validation. Show them on the product page.
3. **Inventory alerts:** low-stock threshold per variant, auto sold-out, and a daily low-stock email (copy WooCommerce's settings).
4. **Order workflow:** statuses, a COD-confirm step (call or WhatsApp link, recorded in the order timeline), cancel with reason, refund status, AWB/tracking entry, and a packing slip.
5. **GST + FSSAI invoice PDF/print:** FY-sequential numbering, CGST/SGST versus IGST by place of supply, per-line HSN and rate.
6. **Store settings and legal info:** contact details, GSTIN, FSSAI number, grievance officer, shipping rates and free-shipping threshold, COD on/off, COD fee and COD cap, and policy pages, all rendered from one settings document.
7. **Discounts/coupons:** percentage, flat and free-shipping types, with minimum order, date window and usage limits.
8. **Content:** hero/banners with schedule, announcement bar, blog, with draft/preview.
9. **Reviews moderation:** approve, hide and reply.
10. **Reports:** sales by period, top variants, COD/prepaid split, RTO rate, and GST CSV export for the accountant.
11. **Safety polish:** soft delete with Trash and restore, a typed confirmation for bulk actions, and an audit log viewer with diffs.
12. **Later:** TOTP 2FA for all staff (or earlier if more than one person logs in), Shiprocket API (auto AWB, tracking sync), WhatsApp COD automation, customer segments, and finer roles.

### Gaps
- I found no independent (non-vendor) data ranking admin features by ROI for small Indian D2C stores. The order above is my judgement, based on legal obligations, RTO economics and security.
