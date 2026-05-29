path = 'pages/admin-panel.html'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

# Remove tlIcons, tlLabels, timelineHtml variables and the timeline div in the modal
# Find from "const idx = ORDER_FLOW" to just before "const productsHtml"
old = """  const idx = ORDER_FLOW.indexOf(o.status);
  const tlIcons = { pending:'<svg width=\"12\" height=\"12\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"display:inline;vertical-align:-1px;margin-right:3px\"><circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M12 6v6l4 2\"/></svg>', confirmed:'\u30d0\"', packed:'<svg width=\"12\" height=\"12\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"display:inline;vertical-align:-1px;margin-right:3px\"><path d=\"M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z\"/></svg>', shipped:'<svg width=\"12\" height=\"12\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"display:inline;vertical-align:-1px;margin-right:3px\"><rect x=\"1\" y=\"3\" width=\"15\" height=\"13\" rx=\"1\"/><path d=\"M16 8h4l3 5v4h-7V8z\"/><circle cx=\"5.5\" cy=\"18.5\" r=\"2.5\"/><circle cx=\"18.5\" cy=\"18.5\" r=\"2.5\"/></svg>', delivered:'<svg width=\"12\" height=\"12\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"display:inline;vertical-align:-1px;margin-right:3px\"><path d=\"M22 11.08V12a10 10 0 11-5.93-9.14\"/><polyline points=\"22 4 12 14.01 9 11.01\"/></svg>' };"""

new = ""

if old in c:
    c = c.replace(old, new)
    print('Removed tlIcons')
else:
    print('tlIcons not found - trying partial match')
    # Find and remove from const idx to const productsHtml
    idx_start = c.find('  const idx = ORDER_FLOW.indexOf(o.status);')
    idx_end   = c.find('  const productsHtml')
    if idx_start != -1 and idx_end != -1:
        c = c[:idx_start] + c[idx_end:]
        print('Removed via range')
    else:
        print('ERROR: could not find range')

# Remove tlLabels line
c = c.replace(
    "  const tlLabels = { pending:'Pending', confirmed:'Confirmed', packed:'Packed', shipped:'Shipped', delivered:'Delivered' };\n",
    ""
)

# Remove timelineHtml block
old_tl = """  const timelineHtml = ORDER_FLOW.map((s, i) => {
    const cls = i < idx ? 'done' : i === idx ? 'active' : 'pending';
    return `
      ${i > 0 ? `<div class="tl-line ${i <= idx ? 'done':''}"></div>` : ''}
      <div class="tl-step">
        <div class="tl-dot ${cls}">${tlIcons[s]}</div>

        <div class="tl-label">${tlLabels[s]}</div>
      </div>

    `;
  }).join('');

"""
c = c.replace(old_tl, "")

# Remove the timeline div from the modal HTML
old_div = """    <div style="background:#F8FAFC;border-radius:10px;padding:14px;margin-bottom:16px;">
      <div class="order-timeline">${timelineHtml}</div>

    </div>
    """
c = c.replace(old_div, "    ")

with open(path, 'w', encoding='utf-8', newline='') as f:
    f.write(c)

# Verify
remaining = 'timelineHtml' in open(path, encoding='utf-8').read()
print('timelineHtml still present:', remaining)
print('DONE')
