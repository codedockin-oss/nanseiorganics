html = open('pages/index.html', encoding='utf-8').read()

old = '''    <div class="nav-actions">
      <a id="navSignInBtn"'''

new = '''    <div class="nav-actions">
      <a href="checkoutmyorderpage.html" class="nav-orders-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
        My Orders
      </a>
      <a id="adminCircleBtn" href="admin-panel.html" title="Admin Panel"
         style="display:none;width:34px;height:34px;border-radius:50%;background:#2563EB;color:#fff;font-size:.65rem;font-weight:800;align-items:center;justify-content:center;text-decoration:none;flex-shrink:0;transition:background .2s;"
         onmouseover="this.style.background='#1D4ED8'" onmouseout="this.style.background='#2563EB'">AD</a>
      <div class="nav-divider"></div>
      <a id="navSignInBtn"'''

if old in html:
    html = html.replace(old, new)
    open('pages/index.html', 'w', encoding='utf-8').write(html)
    print('DONE')
else:
    print('NOT FOUND')
