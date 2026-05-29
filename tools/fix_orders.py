import sys

with open('pages/admin-panel.html', 'rb') as f:
    raw = f.read()

old = b'async function renderOrders() {\r\n\r\n  const res = await API.get(\'/orders\');\r\n\r\n  if (res.success) Store.orders = (res.data || []).map(o => ({'
if old not in raw:
    # try LF only
    old = b'async function renderOrders() {\n\n  const res = await API.get(\'/orders\');\n\n  if (res.success) Store.orders = (res.data || []).map(o => ({'
    lf = True
else:
    lf = False

print('found (lf=%s):' % lf, old in raw)

new_crlf = b'async function renderOrders() {\r\n  try {\r\n  const res = await API.get(\'/orders\');\r\n  if (!res.success) { document.getElementById(\'orders-body\').innerHTML = \'<tr><td colspan="7" style="text-align:center;padding:32px;color:#EF4444;">Failed to load orders: \' + (res.message||\'Check console\') + \'</td></tr>\'; return; }\r\n  if (res.success) Store.orders = (res.data || []).map(o => ({'
new_lf   = b'async function renderOrders() {\n  try {\n  const res = await API.get(\'/orders\');\n  if (!res.success) { document.getElementById(\'orders-body\').innerHTML = \'<tr><td colspan="7" style="text-align:center;padding:32px;color:#EF4444;">Failed to load orders: \' + (res.message||\'Check console\') + \'</td></tr>\'; return; }\n  if (res.success) Store.orders = (res.data || []).map(o => ({'

new = new_lf if lf else new_crlf

if old in raw:
    result = raw.replace(old, new, 1)
    with open('pages/admin-panel.html', 'wb') as f:
        f.write(result)
    print('REPLACED')
else:
    print('NOT FOUND')
    idx = raw.find(b'async function renderOrders')
    print('idx:', idx)
    print(repr(raw[idx:idx+150]))
