html = open('pages/index.html', encoding='utf-8').read()

old = '''      <button class="mob-ham" id="mobHam" onclick="toggleMobDrawer()">
        <span></span><span></span><span></span>
      </button>
    </div>
  </div>
</header>'''

new = '''      <button class="mob-ham" id="mobHam" onclick="toggleMobDrawer()">
        <span></span><span></span><span></span>
      </button>
    </div><!-- /nav-actions -->
  </div>
</header>'''

if old in html:
    html = html.replace(old, new)
    open('pages/index.html', 'w', encoding='utf-8').write(html)
    print('DONE')
else:
    print('NOT FOUND')
