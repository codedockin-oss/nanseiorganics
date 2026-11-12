/* ════════════════════════════════
   HERO SLIDER (Desktop)
════════════════════════════════ */
(function() {
  const TOTAL = 4, IMG_DUR = 5000;
  let cur = 0, pct = 0, rafId = null, lastTS = null, dur = IMG_DUR;
  const track = document.getElementById('track');
  const fill = document.getElementById('timerFill');
  const idxEl = document.getElementById('currIdx');
  const slides = document.querySelectorAll('.slide');
  const dots = document.querySelectorAll('.dot');
  const muteBtn = document.getElementById('muteBtn');
  const video = document.getElementById('heroVideo');
  
  if (!track) return;
  
  function getDur() {
    return cur === 0 ? (video.duration && isFinite(video.duration) ? video.duration * 1000 : 10000) : IMG_DUR;
  }
  
  function updateMute() {
    if (muteBtn) {
      muteBtn.classList.toggle('visible', cur === 0);
      muteBtn.textContent = video.muted ? '[[icon:volume-x]]' : '[[icon:volume-2]]';
    }
  }
  
  if (muteBtn) muteBtn.onclick = () => {
    video.muted = !video.muted;
    updateMute();
  };
  
  function syncVideo(i) {
    if (i === 0) {
      video.currentTime = 0;
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }
  
  function goTo(i) {
    slides[cur].classList.remove('active');
    dots[cur].classList.remove('active');
    cur = ((i % TOTAL) + TOTAL) % TOTAL;
    slides[cur].classList.add('active');
    dots[cur].classList.add('active');
    track.style.transform = `translateX(-${cur * 100}%)`;
    if (idxEl) idxEl.textContent = String(cur + 1).padStart(2, '0');
    syncVideo(cur);
    updateMute();
    resetTimer();
  }
  
  function resetTimer() {
    cancelAnimationFrame(rafId);
    pct = 0;
    lastTS = null;
    dur = getDur();
    fill.style.transition = 'none';
    fill.style.width = '0%';
    rafId = requestAnimationFrame(tick);
  }
  
  function tick(ts) {
    if (!lastTS) lastTS = ts;
    if (cur === 0) dur = getDur();
    pct += ((ts - lastTS) / dur) * 100;
    lastTS = ts;
    fill.style.width = Math.min(pct, 100) + '%';
    pct < 100 ? rafId = requestAnimationFrame(tick) : goTo(cur + 1);
  }
  
  video.addEventListener('loadedmetadata', () => {
    if (cur === 0) dur = getDur();
  });
  
  document.getElementById('prevBtn').onclick = () => goTo(cur - 1);
  document.getElementById('nextBtn').onclick = () => goTo(cur + 1);
  dots.forEach(d => d.onclick = () => goTo(+d.dataset.i));
  
  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') goTo(cur - 1);
    if (e.key === 'ArrowRight') goTo(cur + 1);
  });
  
  let tx = 0;
  track.addEventListener('touchstart', e => {
    tx = e.touches[0].clientX;
  }, { passive: true });
  
  track.addEventListener('touchend', e => {
    const d = e.changedTouches[0].clientX - tx;
    if (Math.abs(d) > 45) goTo(cur + (d < 0 ? 1 : -1));
  });
  
  const shell = document.getElementById('sliderShell');
  shell.addEventListener('mouseenter', () => cancelAnimationFrame(rafId));
  shell.addEventListener('mouseleave', () => {
    lastTS = null;
    rafId = requestAnimationFrame(tick);
  });
  
  video.play().catch(() => {});
  updateMute();
  resetTimer();
})();

/* ════════════════════════════════
   MOBILE SLIDER
════════════════════════════════ */
(function() {
  const TOTAL = 4, IMG_DUR = 5000;
  let cur = 0, pct = 0, rafId = null, lastTS = null, dur = IMG_DUR;
  const track = document.getElementById('trackMob');
  const fill = document.getElementById('timerFillMob');
  const slides = document.querySelectorAll('#sliderShellMob .slide');
  const dots = document.querySelectorAll('#dotListMob .dot');
  const video = document.getElementById('heroVideoMob');
  
  if (!track) return;
  
  function getDur() {
    return cur === 0 && video && video.duration && isFinite(video.duration) ? video.duration * 1000 : IMG_DUR;
  }
  
  function syncVideo(i) {
    if (!video) return;
    if (i === 0) {
      video.currentTime = 0;
      video.play().catch(() => {});
    } else video.pause();
  }
  
  function goTo(i) {
    slides[cur].classList.remove('active');
    dots[cur].classList.remove('active');
    cur = ((i % TOTAL) + TOTAL) % TOTAL;
    slides[cur].classList.add('active');
    dots[cur].classList.add('active');
    track.style.transform = `translateX(-${cur * 100}%)`;
    syncVideo(cur);
    resetTimer();
  }
  
  function resetTimer() {
    cancelAnimationFrame(rafId);
    pct = 0;
    lastTS = null;
    dur = getDur();
    if (fill) {
      fill.style.transition = 'none';
      fill.style.width = '0%';
    }
    rafId = requestAnimationFrame(tick);
  }
  
  function tick(ts) {
    if (!lastTS) lastTS = ts;
    if (cur === 0) dur = getDur();
    pct += ((ts - lastTS) / dur) * 100;
    lastTS = ts;
    if (fill) fill.style.width = Math.min(pct, 100) + '%';
    pct < 100 ? rafId = requestAnimationFrame(tick) : goTo(cur + 1);
  }
  
  document.getElementById('prevBtnMob').onclick = () => goTo(cur - 1);
  document.getElementById('nextBtnMob').onclick = () => goTo(cur + 1);
  dots.forEach(d => d.onclick = () => goTo(+d.dataset.mi));
  
  let tx = 0;
  track.addEventListener('touchstart', e => {
    tx = e.touches[0].clientX;
  }, { passive: true });
  
  track.addEventListener('touchend', e => {
    const d = e.changedTouches[0].clientX - tx;
    if (Math.abs(d) > 40) goTo(cur + (d < 0 ? 1 : -1));
  });
  
  if (video) video.play().catch(() => {});
  resetTimer();
})();
