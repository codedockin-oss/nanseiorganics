html = open('pages/index.html', encoding='utf-8').read()

# Step 1: fix goTo and resetTimer
old1 = '''function goTo(i){
    cur=((i%TOTAL)+TOTAL)%TOTAL;
    setClasses();
    resetTimer();
  }

  function resetTimer(){ cancelAnimationFrame(rafId); pct=0; lastTS=null; fill.style.transition='none'; fill.style.width='0%'; rafId=requestAnimationFrame(tick); }
  function tick(ts){
    if(!lastTS) lastTS=ts;
    pct+=((ts-lastTS)/DUR)*100; lastTS=ts;
    fill.style.width=Math.min(pct,100)+'%';
    pct<100 ? rafId=requestAnimationFrame(tick) : goTo(cur+1);
  }'''

new1 = '''function goTo(i){
    cur=((i%TOTAL)+TOTAL)%TOTAL;
    setClasses();
    const vid = document.getElementById('slide0-video');
    if(cur === 0 && vid){ vid.currentTime=0; vid.play().catch(()=>{ vid.muted=true; vid.play(); }); }
    resetTimer();
  }

  function resetTimer(){
    cancelAnimationFrame(rafId);
    pct=0; lastTS=null;
    fill.style.transition='none'; fill.style.width='0%';
    const vid = document.getElementById('slide0-video');
    if(cur === 0 && vid){
      function videoTick(){
        if(vid.duration > 0) fill.style.width = Math.min((vid.currentTime/vid.duration)*100, 100)+'%';
        if(!vid.ended) rafId = requestAnimationFrame(videoTick);
      }
      rafId = requestAnimationFrame(videoTick);
      return;
    }
    rafId=requestAnimationFrame(tick);
  }
  function tick(ts){
    if(!lastTS) lastTS=ts;
    pct+=((ts-lastTS)/DUR)*100; lastTS=ts;
    fill.style.width=Math.min(pct,100)+'%';
    pct<100 ? rafId=requestAnimationFrame(tick) : goTo(cur+1);
  }'''

# Step 2: add video ended listener before setClasses/resetTimer init
old2 = '''  setClasses();
  resetTimer();
})();'''

new2 = '''  // When slide-0 video ends, advance to next slide
  const _vid0 = document.getElementById('slide0-video');
  if(_vid0){
    _vid0.addEventListener('ended', ()=>{ if(cur===0) goTo(1); });
    _vid0.addEventListener('error', ()=>{ if(cur===0) goTo(1); });
  }

  setClasses();
  resetTimer();
})();'''

if old1 in html:
    html = html.replace(old1, new1)
    print('Step1 DONE')
else:
    print('Step1 NOT FOUND')

if old2 in html:
    html = html.replace(old2, new2)
    print('Step2 DONE')
else:
    print('Step2 NOT FOUND')

open('pages/index.html', 'w', encoding='utf-8').write(html)
