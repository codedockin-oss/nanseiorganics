with open('pages/index.html', encoding='utf-8') as f:
    html = f.read()

# Find and replace the entire nav-search div
start = html.find('<div class="nav-search">')
end = html.find('</div>', start)
end = html.find('</div>', end + 1)  # close nav-search-wrap
end = html.find('</div>', end + 1)  # close nav-search
end += len('</div>')

old_block = html[start:end]

new_block = '''<div style="position:relative;flex:1;max-width:340px;display:flex;align-items:center;gap:6px;background:#fff;border:1.5px solid rgba(26,58,42,.18);border-radius:14px;padding:0 4px 0 10px;box-shadow:0 2px 8px rgba(26,58,42,.07);">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#4a8c5c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
      <input id="searchInput" type="text" placeholder="Search products..." onkeydown="if(event.key==='Enter')doSearch()" oninput="this.value.trim()?doSearch():renderSections()" style="flex:1;border:none;outline:none;background:transparent;font-size:.82rem;font-family:'Inter',sans-serif;color:#1a2416;padding:.5rem 0;cursor:text;"/>
      <button onclick="doSearch()" style="flex-shrink:0;width:32px;height:32px;background:#1a3a2a;border:none;border-radius:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
      </button>
    </div>'''

html = html.replace(old_block, new_block)

with open('pages/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print('DONE')
print('Preview:', new_block[:80])
