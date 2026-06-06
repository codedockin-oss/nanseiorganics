import sys

filepath = 'c:/Users/DELL/OneDrive/Documents/agri store/pages/index.html'

with open(filepath, 'rb') as f:
    raw = f.read()

# The two conflicting blocks to remove/merge:
# Block 1: /* MOBILE OVERRIDES */ @media(max-width:768px){ ... }
# + @media(min-width:769px){ ... }
# + @media(min-width:769px) and (max-width:1180px){ ... }
# Block 2: /* MOBILE UX */ @media(max-width:768px){   <-- opening line only, rest stays

old = (
    b'/* ---------------------------------------\r\n'
    b'   MOBILE OVERRIDES\r\n'
    b'--------------------------------------- */\r\n'
    b'@media(max-width:768px){\r\n'
    b'  .site-nav { height: auto; }\r\n'
    b'  .nav-inner { flex-wrap: wrap; padding: 0; gap: 0; }\r\n'
    b'\r\n'
    b'  /* Logo row \xe2\x80\x94 full width, centered */\r\n'
    b'  .nav-logo {\r\n'
    b'    order: 0;\r\n'
    b'    width: 100%;\r\n'
    b'    display: flex !important;\r\n'
    b'    justify-content: center;\r\n'
    b'    padding: 8px 0 4px;\r\n'
    b'    border-bottom: 1px solid rgba(26,58,42,.07);\r\n'
    b'  }\r\n'
    b'  .nav-logo img { height: 36px !important; }\r\n'
    b'\r\n'
    b'  .nav-search {\r\n'
    b'    order: 1;\r\n'
    b'    width: 100%;\r\n'
    b'    max-width: none;\r\n'
    b'    min-width: 0;\r\n'
    b'    padding: 0 1rem 0 1rem;\r\n'
    b'    margin-top: .4rem;\r\n'
    b'  }\r\n'
    b'  .nav-search input { width: 100%; }\r\n'
    b'  .nav-links { display: none !important; }\r\n'
    b'\r\n'
    b'  /* Actions row \xe2\x80\x94 full width, right-aligned */\r\n'
    b'  .nav-actions {\r\n'
    b'    order: 2;\r\n'
    b'    width: 100%;\r\n'
    b'    display: flex;\r\n'
    b'    align-items: center;\r\n'
    b'    justify-content: flex-end;\r\n'
    b'    padding: 4px 12px 10px;\r\n'
    b'    gap: .3rem;\r\n'
    b'    flex-shrink: 0;\r\n'
    b'  }\r\n'
    b'\r\n'
    b'  .mob-search-row { display: block !important; }\r\n'
    b'}\r\n'
    b'@media(min-width:769px){\r\n'
    b'  .mob-search-row { display:none!important; }\r\n'
    b'  #mob-offer-bar  { display:none!important; }\r\n'
    b'  #mob-sticky-bar { display:none!important; }\r\n'
    b'}\r\n'
    b'@media(min-width:769px) and (max-width:1180px){\r\n'
    b'  .nav-inner { padding:0 1rem; gap:.75rem; }\r\n'
    b'  .nav-links { display:none!important; }\r\n'
    b'  .nav-search { max-width:none; min-width:260px; }\r\n'
    b'  .nav-actions { gap:.45rem; }\r\n'
    b'}\r\n'
)

# The replacement keeps desktop rules and fixes the mobile nav to a single clean block
new = (
    b'@media(min-width:769px){\r\n'
    b'  .mob-search-row { display:none!important; }\r\n'
    b'  #mob-offer-bar  { display:none!important; }\r\n'
    b'  #mob-sticky-bar { display:none!important; }\r\n'
    b'}\r\n'
    b'@media(min-width:769px) and (max-width:1180px){\r\n'
    b'  .nav-inner { padding:0 1rem; gap:.75rem; }\r\n'
    b'  .nav-links { display:none!important; }\r\n'
    b'  .nav-search { max-width:none; min-width:260px; }\r\n'
    b'  .nav-actions { gap:.45rem; }\r\n'
    b'}\r\n'
)

if old in raw:
    result = raw.replace(old, new, 1)
    with open(filepath, 'wb') as f:
        f.write(result)
    print('SUCCESS: fixed. New size:', len(result))
else:
    print('ERROR: old block not found exactly')
    # debug: find partial
    idx = raw.find(b'MOBILE OVERRIDES')
    print('MOBILE OVERRIDES at:', idx)
    print('Bytes around it:', raw[idx-5:idx+80])
