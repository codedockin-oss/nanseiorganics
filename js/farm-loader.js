/* Nansei Organics — opening screen: dawn over the paddy.
   The sun rises behind layered hills, rows of rice shoots grow and ripen to gold, birds drift across,
   fireflies rise, and the logo catches the light. No numbers.

   Include it as the FIRST script in <head> of every page:
     <script src="../js/farm-loader.js" data-text="Gathering the harvest"></script>
   It plays ONCE per visit (the first page you open). Every page after that opens instantly, with no overlay.
   Options: data-text (the line under the scene) · data-min (ms it stays at least; default 1600).
   Skipped for visitors who prefer reduced motion and for automated browsers.
   Testing: ?loader=1 forces it on any page; ?loader=auto behaves like a real visitor (once per visit) even in an automated browser. */
(function () {
  'use strict';
  var me = document.currentScript, root = document.documentElement;
  var text = (me && me.getAttribute('data-text')) || 'Preparing your harvest';
  var forced = /[?&]loader=1\b/.test(location.search), auto = /[?&]loader=auto\b/.test(location.search);
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var seen = false; try { seen = sessionStorage.getItem('nansei:seen') === '1'; } catch (e) {}
  var min = parseInt((me && me.getAttribute('data-min')) || '1600', 10);
  var cbs = [], finished = false;
  window.NanseiLoader = { onDone: function (fn) { finished ? fn() : cbs.push(fn); } };
  function done() { finished = true; cbs.splice(0).forEach(function (f) { try { f(); } catch (e) {} }); }
  if (!forced && (reduced || seen || (navigator.webdriver && !auto))) { done(); return; }

  var css = '' +
    '.nl{position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;color:#fff;font-family:Inter,system-ui,sans-serif;' +
      'background:radial-gradient(ellipse 70% 55% at 50% 78%,#2c5a3f 0%,rgba(31,66,48,0) 70%),linear-gradient(180deg,#07130c 0%,#0f2218 55%,#173826 100%);transition:opacity .7s ease .05s,visibility .7s,transform .9s cubic-bezier(.7,0,.2,1)}' +
    '.nl.is-out{opacity:0;visibility:hidden;transform:scale(1.04)}' +
    '.nl__glow{position:absolute;left:50%;top:56%;width:min(900px,120vw);aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(closest-side,rgba(232,201,122,.34),rgba(201,168,76,.12) 45%,transparent 72%);opacity:0;animation:nl-glow 2.6s ease-out .1s forwards}' +
    '.nl__stage{position:relative;width:min(460px,86vw);display:flex;flex-direction:column;align-items:center}' +
    '.nl__logowrap{position:relative;overflow:hidden;margin-bottom:6px}' +
    '.nl__logo{display:block;height:58px;width:auto;filter:brightness(0) invert(1);opacity:0;transform:translateY(10px);animation:nl-rise .9s cubic-bezier(.22,1,.36,1) .15s forwards}' +
    '.nl__logowrap::after{content:"";position:absolute;inset:0;background:linear-gradient(105deg,transparent 35%,rgba(255,255,255,.65) 50%,transparent 65%);transform:translateX(-120%);animation:nl-shine 1.6s ease .9s forwards;mix-blend-mode:overlay}' +
    '.nl svg{width:100%;height:auto;overflow:visible;display:block;-webkit-mask-image:linear-gradient(90deg,transparent 0,#000 14%,#000 86%,transparent 100%),linear-gradient(180deg,#000 0,#000 78%,transparent 100%);-webkit-mask-composite:source-in;mask-image:linear-gradient(90deg,transparent 0,#000 14%,#000 86%,transparent 100%),linear-gradient(180deg,#000 0,#000 78%,transparent 100%);mask-composite:intersect}' +
    '.nl .sunbody{transform-origin:200px 150px;animation:nl-sun 1.9s cubic-bezier(.22,1,.36,1) .05s both}' +
    '.nl .rays{transform-origin:200px 108px;animation:nl-spin 26s linear infinite}' +
    '.nl .ray{stroke:#e8c97a;stroke-width:1.6;stroke-linecap:round;opacity:.5}' +
    '.nl .hill{opacity:0;transform:translateY(14px);animation:nl-rise .9s ease forwards}' +
    '.nl .stalk{fill:none;stroke:#8fbc9a;stroke-linecap:round;stroke-dasharray:1;stroke-dashoffset:1;animation:nl-grow .75s cubic-bezier(.4,0,.2,1) var(--d) forwards}' +
    '.nl .leaf{fill:none;stroke:#6fa683;stroke-linecap:round;stroke-dasharray:1;stroke-dashoffset:1;animation:nl-grow .5s ease calc(var(--d) + .38s) forwards}' +
    '.nl .head{fill:#e8c97a;opacity:0;transform-box:fill-box;transform-origin:50% 100%;animation:nl-ripe .55s cubic-bezier(.34,1.56,.64,1) calc(var(--d) + .62s) forwards}' +
    '.nl .row{transform-box:fill-box;transform-origin:50% 100%;animation:nl-sway var(--sw) ease-in-out 1.5s infinite alternate}' +
    '.nl .ground{stroke:#c9a84c;stroke-width:1.6;stroke-linecap:round;stroke-dasharray:1;stroke-dashoffset:1;animation:nl-grow 1.1s cubic-bezier(.4,0,.2,1) .1s forwards}' +
    '.nl .bird{fill:none;stroke:rgba(255,255,255,.55);stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round;opacity:0;animation:nl-fly 6s linear var(--bd) infinite}' +
    '.nl .ff{position:absolute;width:4px;height:4px;border-radius:50%;background:#e8c97a;box-shadow:0 0 8px 2px rgba(232,201,122,.7);opacity:0;animation:nl-ff var(--fd) ease-in-out var(--fl) infinite}' +
    '.nl__txt{margin-top:18px;display:flex;align-items:center;gap:14px;font-size:11.5px;font-weight:600;letter-spacing:.34em;text-transform:uppercase;color:rgba(255,255,255,.72);opacity:0;animation:nl-fade .9s ease .6s forwards}' +
    '.nl__txt:before,.nl__txt:after{content:"";width:28px;height:1px;background:linear-gradient(90deg,transparent,#c9a84c)}' +
    '.nl__txt:after{transform:scaleX(-1)}' +
    '.nl__bar{margin-top:20px;width:150px;height:2px;border-radius:2px;background:rgba(255,255,255,.12);overflow:hidden;opacity:0;animation:nl-fade .6s ease .7s forwards}' +
    '.nl__bar i{display:block;height:100%;width:100%;background:linear-gradient(90deg,#c9a84c,#e8c97a);transform-origin:left;transform:scaleX(0);animation:nl-load var(--min) cubic-bezier(.45,.05,.25,1) .2s forwards}' +
    '@keyframes nl-grow{to{stroke-dashoffset:0}}' +
    '@keyframes nl-ripe{from{opacity:0;transform:scale(.2) rotate(-12deg)}to{opacity:1;transform:none}}' +
    '@keyframes nl-sun{from{opacity:0;transform:translateY(70px) scale(.75)}to{opacity:1;transform:none}}' +
    '@keyframes nl-spin{to{transform:rotate(360deg)}}' +
    '@keyframes nl-sway{from{transform:rotate(-1.6deg)}to{transform:rotate(1.6deg)}}' +
    '@keyframes nl-rise{to{opacity:1;transform:none}}' +
    '@keyframes nl-fade{to{opacity:1}}' +
    '@keyframes nl-glow{to{opacity:1}}' +
    '@keyframes nl-shine{to{transform:translateX(120%)}}' +
    '@keyframes nl-load{to{transform:scaleX(1)}}' +
    '@keyframes nl-fly{0%{opacity:0;transform:translate(-30px,6px)}12%{opacity:.9}88%{opacity:.9}100%{opacity:0;transform:translate(430px,-26px)}}' +
    '@keyframes nl-ff{0%{opacity:0;transform:translate(0,0)}25%{opacity:1}100%{opacity:0;transform:translate(var(--fx),-90px)}}' +
    'html.nl-lock,html.nl-lock body{overflow:hidden}';

  /* rows of paddy: [x, height, lean, head scale] — back row small and dim, front row tall and bright */
  function stalks(list, base, w, op, dBase) {
    return list.map(function (s, i) {
      var x = s[0], h = s[1], l = s[2], g = s[3], top = base - h, tx = x + l, d = (dBase + i * 0.05).toFixed(2) + 's';
      var stalk = '<path class="stalk" pathLength="1" style="--d:' + d + ';stroke-width:' + w + '" d="M' + x + ' ' + base + ' C' + x + ' ' + (base - h * .45) + ' ' + (x + l * .15) + ' ' + (base - h * .8) + ' ' + tx + ' ' + top + '"/>';
      var leaf = '<path class="leaf" pathLength="1" style="--d:' + d + ';stroke-width:' + (w * .75) + '" d="M' + x + ' ' + (base - h * .32) + ' q' + (-9 * g) + ' -6 ' + (-14 * g) + ' -2"/><path class="leaf" pathLength="1" style="--d:' + d + ';stroke-width:' + (w * .75) + '" d="M' + x + ' ' + (base - h * .52) + ' q' + (8 * g) + ' -7 ' + (13 * g) + ' -3"/>';
      var head = '<g transform="translate(' + tx + ' ' + top + ') scale(' + g + ')"><g class="head" style="--d:' + d + '"><ellipse cx="0" cy="-4" rx="2.6" ry="5.6" transform="rotate(-8)"/><ellipse cx="-3.4" cy="1.5" rx="2.2" ry="4.8" transform="rotate(-30)"/><ellipse cx="3.4" cy="1.5" rx="2.2" ry="4.8" transform="rotate(26)"/><ellipse cx="-1.6" cy="8" rx="2" ry="4.3" transform="rotate(-18)"/><ellipse cx="2.6" cy="9" rx="2" ry="4.3" transform="rotate(16)"/></g></g>';
      return '<g opacity="' + op + '">' + stalk + leaf + head + '</g>';
    }).join('');
  }
  var front = [[92, 74, 12, .62], [118, 92, 14, .72], [146, 80, 10, .66], [174, 104, 15, .78], [200, 118, 18, .85], [228, 102, 14, .78], [256, 84, 11, .68], [284, 96, 13, .74], [310, 72, 10, .6]];
  var back = [[60, 38, 6, .38], [84, 46, 8, .42], [112, 40, 6, .38], [140, 50, 8, .44], [168, 42, 6, .4], [232, 44, 7, .4], [260, 50, 8, .44], [288, 40, 6, .38], [316, 46, 7, .42], [342, 36, 6, .36]];
  var rays = ''; for (var r = 0; r < 14; r++) rays += '<line class="ray" x1="200" y1="46" x2="200" y2="' + (r % 2 ? 56 : 62) + '" transform="rotate(' + (r * 360 / 14) + ' 200 108)"/>';
  var svg = '<svg viewBox="0 0 400 190" aria-hidden="true" focusable="false">' +
    '<g class="sunbody"><g class="rays">' + rays + '</g><circle cx="200" cy="108" r="40" fill="#c9a84c" opacity=".14"/><circle cx="200" cy="108" r="27" fill="#e8c97a" opacity=".3"/><circle cx="200" cy="108" r="17" fill="#f3dc98"/></g>' +
    '<path class="bird" style="--bd:.6s" d="M40 40 q6 -7 12 0 q6 -7 12 0"/><path class="bird" style="--bd:1.5s" d="M70 62 q4 -5 8 0 q4 -5 8 0"/><path class="bird" style="--bd:2.4s" d="M20 74 q4 -5 8 0 q4 -5 8 0"/>' +
    '<path class="hill" style="animation-delay:.15s" fill="rgba(143,188,154,.10)" d="M0 150 C50 118 100 128 150 140 C210 112 270 120 330 138 C360 128 380 130 400 136 L400 190 L0 190Z"/>' +
    '<path class="hill" style="animation-delay:.3s" fill="rgba(111,166,131,.16)" d="M0 160 C60 140 120 150 190 156 C250 138 320 146 400 158 L400 190 L0 190Z"/>' +
    '<g class="row" style="--sw:3.4s">' + stalks(back, 156, 1.4, .75, .35) + '</g>' +
    '<path class="ground" pathLength="1" d="M30 168 H370"/>' +
    '<g class="row" style="--sw:2.6s">' + stalks(front, 168, 2.1, 1, .15) + '</g>' +
    '</svg>';
  var ff = ''; for (var k = 0; k < 14; k++) ff += '<i class="ff" style="left:' + (8 + k * 6.6) + '%;bottom:' + (6 + (k * 17) % 34) + '%;--fx:' + ((k % 2 ? 1 : -1) * (10 + (k * 7) % 28)) + 'px;--fd:' + (3.2 + (k % 5) * .5).toFixed(1) + 's;--fl:' + ((k * 0.23) % 1.8).toFixed(2) + 's"></i>';

  var logo = (me && me.getAttribute('data-logo')) || (me ? me.src.replace(/js\/farm-loader\.js.*$/, 'pages/nansei_org_logo.svg') : 'nansei_org_logo.svg');
  var el = document.createElement('div');
  el.className = 'nl'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); el.setAttribute('aria-label', text);
  el.style.setProperty('--min', min + 'ms');
  el.innerHTML = '<div class="nl__glow"></div>' + ff + '<div class="nl__stage"><div class="nl__logowrap"><img class="nl__logo" src="' + logo + '" alt=""></div>' + svg +
    '<div class="nl__txt"><span>' + text.replace(/[<>&]/g, '') + '</span></div><div class="nl__bar"><i></i></div></div>';
  var st = document.createElement('style'); st.textContent = css;
  root.appendChild(st); root.appendChild(el); root.classList.add('nl-lock');

  var t0 = Date.now(), loaded = document.readyState !== 'loading', hidden = false;
  function hide() {
    if (hidden) return; hidden = true;
    el.classList.add('is-out'); root.classList.remove('nl-lock');
    try { sessionStorage.setItem('nansei:seen', '1'); } catch (e) {}
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); if (st.parentNode) st.parentNode.removeChild(st); }, 1000);
    setTimeout(done, 400);
  }
  function check() { if (loaded && Date.now() - t0 >= min) hide(); else setTimeout(check, 60); }
  document.addEventListener('DOMContentLoaded', function () { loaded = true; });
  setTimeout(hide, 3200);              // never trap the visitor behind the loader
  check();
})();
