f = open('pages/checkoutmyorderpage.html', encoding='utf-8')
lines = f.readlines()
f.close()

# Find start and end of invoice modal body (line 1156 to ~1192, 0-indexed: 1155 to 1191)
start = None
end = None
for i, line in enumerate(lines):
    if 'id="invoiceContent"' in line:
        start = i
    if start and i > start and '</div>\n' == line.strip() + '\n' and '</div>' in lines[i+1] and '</div>' in lines[i+2]:
        end = i + 1
        break

print(f'start={start}, end={end}')

new_block = """    <div class="modal-body" id="invoiceContent" style="padding:24px 28px">

      <!-- Header -->
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid var(--moss)">
        <div>
          <p style="font-family:'Cormorant Garamond',serif;font-size:1.8rem;font-weight:700;color:var(--moss);line-height:1">NANSEI</p>
          <p style="font-size:.72rem;color:var(--ink-3);margin-top:2px">NANSEI Organics &bull; nansei.in</p>
          <p style="font-size:.72rem;color:var(--ink-3)">+91 63821 42578</p>
        </div>
        <div style="text-align:right">
          <p style="font-size:1rem;font-weight:800;color:var(--ink);letter-spacing:.04em;text-transform:uppercase">Invoice</p>
          <p style="font-family:'DM Mono',monospace;font-weight:600;font-size:.88rem;color:var(--moss);margin-top:4px" id="inv-id"></p>
          <p style="font-size:.75rem;color:var(--ink-3);margin-top:2px" id="inv-date"></p>
          <p style="font-size:.72rem;color:var(--ink-3);margin-top:2px" id="inv-pay-method"></p>
        </div>
      </div>

      <!-- Billed To / Ship To -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
        <div style="background:var(--fog);border-radius:10px;padding:12px 14px">
          <p style="font-size:.65rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--moss);margin-bottom:6px">Billed To</p>
          <p style="font-weight:700;font-size:.88rem;color:var(--ink)" id="inv-name"></p>
          <p style="font-size:.78rem;color:var(--ink-3);margin-top:3px;line-height:1.55" id="inv-addr"></p>
          <p style="font-size:.75rem;color:var(--ink-3);margin-top:3px" id="inv-phone"></p>
        </div>
        <div style="background:var(--fog);border-radius:10px;padding:12px 14px">
          <p style="font-size:.65rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--moss);margin-bottom:6px">Ship To</p>
          <p style="font-weight:700;font-size:.88rem;color:var(--ink)" id="inv-ship-name"></p>
          <p style="font-size:.78rem;color:var(--ink-3);margin-top:3px;line-height:1.55" id="inv-ship-addr"></p>
          <p style="font-size:.75rem;color:var(--ink-3);margin-top:3px" id="inv-ship-phone"></p>
        </div>
      </div>

      <!-- Items Table -->
      <div id="inv-items" class="inv-table" style="margin-bottom:16px"></div>

      <!-- Totals -->
      <div style="display:flex;justify-content:flex-end">
        <div style="width:220px;display:flex;flex-direction:column;gap:7px">
          <div style="display:flex;justify-content:space-between;font-size:.82rem"><span style="color:var(--ink-3)">Subtotal</span><span style="font-weight:600" id="inv-sub"></span></div>
          <div style="display:flex;justify-content:space-between;font-size:.82rem"><span style="color:var(--ink-3)">Delivery</span><span style="font-weight:600" id="inv-del"></span></div>
          <div style="display:flex;justify-content:space-between;font-size:.82rem"><span style="color:var(--ink-3)">GST (5%)</span><span style="font-weight:600" id="inv-tax"></span></div>
          <div style="height:1px;background:var(--fog-2);margin:4px 0"></div>
          <div style="display:flex;justify-content:space-between;font-size:.95rem;font-weight:800"><span>Total</span><span style="color:var(--moss)" id="inv-total"></span></div>
        </div>
      </div>

      <p style="text-align:center;font-size:.72rem;color:var(--sage);margin-top:20px;padding-top:16px;border-top:1px solid var(--fog-2)">Thank you for choosing NANSEI Organics &#127807; &bull; 100% Organic &bull; Farm Direct</p>
    </div>
"""

# Replace lines 1155 to 1191 (0-indexed)
new_lines = lines[:1155] + [new_block] + lines[1192:]
f = open('pages/checkoutmyorderpage.html', 'w', encoding='utf-8', newline='\r\n')
f.writelines(new_lines)
f.close()
print('done')
