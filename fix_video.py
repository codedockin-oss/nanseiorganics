html = open('pages/index.html', encoding='utf-8').read()

old = '''        <video class="slide-bg" autoplay muted loop playsinline src="https://ik.imagekit.io/bq9dscs4g/slide%20video.mp4?updatedAt=1772621168744"></video>
        <div class="slide-overlay"></div><div class="slide-accent"></div>
        <div class="slide-content">
          <p class="eyebrow"><span></span>With Nansai</p>
          <h2 class="slide-title">Experience the Root of <em>Nature</em></h2>'''

new = '''        <video class="slide-bg" id="slide0-video" autoplay playsinline src="https://ik.imagekit.io/bq9dscs4g/slide%20video.mp4?updatedAt=1772621168744" style="width:100%;height:100%;object-fit:cover;"></video>
        <div class="slide-overlay"></div><div class="slide-accent"></div>
        <div class="slide-content">
          <p class="eyebrow"><span></span>With Nansai</p>
          <h2 class="slide-title">Experience the Root of <em>Nature</em></h2>'''

if old in html:
    html = html.replace(old, new)
    open('pages/index.html', 'w', encoding='utf-8').write(html)
    print('DONE')
else:
    print('NOT FOUND')
    idx = html.find('slide-bg')
    print(repr(html[idx-20:idx+200]))
