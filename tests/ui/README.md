# UI tests

Real-browser checks for the storefront. They use the Chrome/Edge you already have installed
(`puppeteer-core` does not download a browser) and a **mock API**, so nothing touches MongoDB,
Razorpay or any real customer data.

## One-time setup

```bash
cd tests/ui
npm install
```

If Chrome/Edge is installed somewhere unusual, set `CHROME_PATH` to its executable.

## Run

Open two terminals in `tests/ui`:

```bash
npm run serve     # static site on http://127.0.0.1:8080
npm run mock      # fake backend on http://127.0.0.1:5000/api
```

Then, in a third:

```bash
npm run syntax    # every inline <script> + js file parses
npm run qa        # every page x (1440, 768, 390 px): JS errors, sideways scroll, broken images,
                  #   damaged text, dead links, quirks mode, tap targets
npm run links     # every internal link / image / script exists, #anchors resolve, alt text, one h1, lang
npm run flows     # home, shop filters/sort/search, menus, add to cart, variants/pricing, wishlist, info pages, tracking, modals, drawers,
                  #   checkout (address asked every time, COD order payload), My Orders, login / forgot password ...
npm test          # all three
```

Useful options: `node qa.js product --vw=390` (one page, one width), `node qa.js --shots`
(saves screenshots to `tests/ui/shots/`), `node flows.js checkout` (only flows whose name matches).

## What it guards against

These all happened in this codebase and are now covered:

* a stray BOM / blank line before `<!DOCTYPE>` silently putting the home page in quirks mode
* text damaged by bad encodings (`?` instead of `₹`, `→`, `—`, lost apostrophes)
* cart price not matching the price shown (500 g rice added as ₹90,000), double adds, per-litre vs per-ml maths
* checkout sending pincode `000000` because the address separator character had been lost
* pages that scroll sideways on phones, broken / empty images, `[[icon:..]]` markers left on screen

The mock API lives in `mock-api.js`; extend `staticResponse()` when a page starts calling a new endpoint.
