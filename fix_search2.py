html = open('pages/index.html', encoding='utf-8').read()

# Find the broken section - search div directly followed by navSignInBtn
old = '''    <div style="position:relative;flex:1;max-width:340px;display:flex;align-items:center;gap:6px;background:#fff;border:1.5px solid rgba(26,58,42,.18);border-radius:14px;padding:0 4px 0 10px;box-shadow:0 2px 8px rgba(26,58,42,.07);">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#4a8c5c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
      <input id="searchInput" type="text" placeholder="Search products..." onkeydown="if(event.key==='Enter')doSearch()" oninput="this.value.trim()?doSearch():renderSections()" style="flex:1;border:none;outline:none;background:transparent;font-size:.82rem;font-family:'Inter',sans-serif;color:#1a2416;padding:.5rem 0;cursor:text;"/>
      <button onclick="doSearch()" style="flex-shrink:0;width:32px;height:32px;background:#1a3a2a;border:none;border-radius:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
      </button>
    </div>
      <a id="navSignInBtn"'''

new = '''    <div style="position:relative;flex:1;max-width:340px;display:flex;align-items:center;gap:6px;background:#fff;border:1.5px solid rgba(26,58,42,.18);border-radius:14px;padding:0 4px 0 10px;box-shadow:0 2px 8px rgba(26,58,42,.07);">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#4a8c5c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;pointer-events:none;"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
      <input id="searchInput" type="text" placeholder="Search products..." onkeydown="if(event.key==='Enter')doSearch()" oninput="this.value.trim()?doSearch():renderSections()" style="flex:1;border:none;outline:none;background:transparent;font-size:.82rem;font-family:'Inter',sans-serif;color:#1a2416;padding:.5rem 0;cursor:text;min-width:0;"/>
      <button onclick="doSearch()" style="flex-shrink:0;width:32px;height:32px;background:#1a3a2a;border:none;border-radius:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
      </button>
    </div>
    <div class="nav-actions">
      <a id="navSignInBtn"'''

if old in html:
    html = html.replace(old, new)
    # Now find the closing of nav-actions - it was removed, need to close it before </div></div></header>
    # Find where nav-inner closes
    open('pages/index.html', 'w', encoding='utf-8').write(html)
    print('STEP1 DONE')
else:
    print('NOT FOUND - checking partial...')
    idx = html.find('navSignInBtn')
    print(repr(html[idx-300:idx+50]))
