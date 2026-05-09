html = open('pages/index.html', encoding='utf-8').read()

old = "Explore Products \u2193</button>\n        </div>\n      </div>\n      <div class=\"slide\" id=\"slide-video-1\">"

new = """Explore Products \u2193</button>
        </div>
        <button id="slide0-sound-btn" onclick="toggleSlide0Sound()" style="position:absolute;bottom:4.5rem;left:1rem;z-index:20;width:2rem;height:2rem;border-radius:50%;border:1px solid rgba(255,255,255,.3);background:rgba(5,12,6,.55);backdrop-filter:blur(6px);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .2s;" title="Toggle sound">
          <svg id="slide0-sound-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
        </button>
      </div>
      <div class="slide" id="slide-video-1">"""

if old in html:
    html = html.replace(old, new)
    open('pages/index.html', 'w', encoding='utf-8').write(html)
    print('DONE')
else:
    print('NOT FOUND')
