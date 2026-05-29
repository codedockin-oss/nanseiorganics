f = open('pages/checkoutmyorderpage.html', encoding='utf-8')
text = f.read()
f.close()

# Fix 1: pincode regex - supports both "City - 626001" and "City  626001" (spaces)
old_regex = r"const cityMatch = cityPin.match(/^(.+?)\s*[-]\s*(\d{6})$/);"
new_regex = r"const cityMatch = cityPin.match(/^(.+?)[\s-]+(\d{6})$/);"
text = text.replace(old_regex, new_regex)

# Fix 2: hardcoded Billed To in invoice modal HTML
old_billed = """        <p style=\"font-weight:700;font-size:.9rem\">Karthikeyan M.</p>
        <p style=\"font-size:.82rem;color:var(--ink-3);margin-top:2px\">42, Gandhi Nagar 2nd Street, Madurai  625001</p>"""
new_billed = """        <p style=\"font-weight:700;font-size:.9rem\" id=\"inv-name\"></p>
        <p style=\"font-size:.82rem;color:var(--ink-3);margin-top:2px\" id=\"inv-addr\"></p>
        <p style=\"font-size:.78rem;color:var(--ink-3);margin-top:2px\" id=\"inv-phone\"></p>"""
text = text.replace(old_billed, new_billed)

# Fix 3: openInvoice - populate Billed To dynamically
old_inv = "  document.getElementById('inv-id').textContent = '#' + o.id;\n  document.getElementById('inv-date').textContent = o.date;"
new_inv = """  document.getElementById('inv-id').textContent = '#' + o.id;
  document.getElementById('inv-date').textContent = o.date;
  const invAddr = o.address || {};
  const invName = document.getElementById('inv-name');
  const invAddrEl = document.getElementById('inv-addr');
  const invPhone = document.getElementById('inv-phone');
  if (invName) invName.textContent = invAddr.name || '';
  if (invAddrEl) invAddrEl.textContent = (invAddr.line || '').replace(/\\n/g, ', ');
  if (invPhone) invPhone.textContent = invAddr.phone || '';"""
text = text.replace(old_inv, new_inv)

f = open('pages/checkoutmyorderpage.html', 'w', encoding='utf-8', newline='\r\n')
f.write(text)
f.close()
print('done')
