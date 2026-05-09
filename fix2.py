with open('pages/index.html', 'r', encoding='utf-8') as f:
    c = f.read()

# ── 1. Replace the prod-btn-area div in prodCardHTML ──
start_marker = '<div id="cardbtn-area-${p.id}" class="prod-btn-area" style="margin-top:auto;">'
end_marker = '</div>\n    </div>\n\n  </div>`'

s = c.find(start_marker)
e = c.find(end_marker, s) + len(end_marker)

if s == -1:
    print('ERROR: start_marker not found')
else:
    old = c[s:e]
    print('OLD:', repr(old[:60]))

    new = '''<div class="prod-btn-area" style="margin-top:auto;display:flex;gap:6px;align-items:center;">
        <select id="qty-${p.id}" onclick="event.stopPropagation()" onchange="event.stopPropagation()" style="height:32px;border:1px solid #d1d5db;border-radius:8px;font-size:.68rem;font-weight:700;color:#374151;background:#f9fafb;padding:0 4px;outline:none;cursor:pointer;flex-shrink:0;">
          ${qtyOptionsHTML(p.category)}
        </select>
        <button onclick="addDirectToCart(${p.id},this);event.preventDefault();event.stopPropagation()" style="flex:1;background:var(--forest-deep);color:#fff;font-size:.7rem;font-weight:700;padding:8px 4px;border-radius:8px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:5px;transition:background .2s;" onmouseover="this.style.background=\'var(--forest-mid)\'" onmouseout="this.style.background=\'var(--forest-deep)\'">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 002 1.58h9.78a2 2 0 001.95-1.57l1.65-7.43H5.12"/></svg>
          Add
        </button>
      </div>
    </div>

  </div>`'''

    c = c[:s] + new + c[e:]
    print('REPLACED button block')

# ── 2. Remove any previously appended addDirectToCart duplicates ──
fn_marker = '\nfunction addDirectToCart('
while c.count(fn_marker) > 1:
    last = c.rfind(fn_marker)
    end = c.find('\n}', last) + 2
    c = c[:last] + c[end:]
    print('Removed duplicate addDirectToCart')

# ── 3. Insert addDirectToCart if not present ──
if fn_marker not in c:
    add_fn = '''
function addDirectToCart(id, btn) {
  var p = products.find(function(x){ return x.id === id; });
  if (!p) return;
  var sel = document.getElementById('qty-' + id);
  var cfg = getQtyCfg(p.category);
  var qtyVal = sel ? parseFloat(sel.value) : cfg.options[0];
  var unit = cfg.unit;
  var totalPrice = unit === 'ml' ? Math.round(p.price * (qtyVal / 1000)) : Math.round(p.price * qtyVal);
  var label = fmtQty(qtyVal, unit);
  var ex = cart.find(function(i){ return i.id === id && i.qtyLabel === label; });
  if (ex) { ex.qty += 1; } else { cart.push({id:id, name:p.name, price:totalPrice, image:p.image, qty:1, qtyVal:qtyVal, qtyLabel:label}); }
  saveCart();
  showToast(p.name + ' (' + label + ') added to cart!');
  if (btn) {
    var orig = btn.innerHTML;
    btn.innerHTML = 'Added!';
    btn.style.background = '#16a34a';
    setTimeout(function(){ btn.innerHTML = orig; btn.style.background = ''; }, 1800);
  }
}
'''
    insert_after = 'function toggleWish('
    idx = c.find(insert_after)
    if idx >= 0:
        c = c[:idx] + add_fn + c[idx:]
        print('addDirectToCart inserted before toggleWish')
    else:
        # fallback: insert before renderSections
        idx2 = c.find('function renderSections()')
        c = c[:idx2] + add_fn + c[idx2:]
        print('addDirectToCart inserted before renderSections')
else:
    print('addDirectToCart already present')

with open('pages/index.html', 'w', encoding='utf-8') as f:
    f.write(c)

print('DONE')
print('addDirectToCart count:', c.count('function addDirectToCart'))
print('qty-${p.id} present:', 'qty-${p.id}' in c)
print('cardbtn-area still present:', 'cardbtn-area-${p.id}' in c)
