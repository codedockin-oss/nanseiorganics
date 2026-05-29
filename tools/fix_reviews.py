f = open('pages/product.html', 'rb')
raw = f.read()
f.close()

# Find exact block boundaries
start_marker = b'/* --- WRITE REVIEW --- */'
end_marker   = b'/* --- EXPAND REVIEWS --- */'

a = raw.find(start_marker)
b = raw.find(end_marker)

print('block:', a, '->', b, '(%d bytes)' % (b - a))

new_block = b"""/* --- WRITE REVIEW --- */
let selectedStar = 0;

function _renderApiReviews(reviews) {
  if (!reviews.length) return;
  const listEl = document.getElementById('reviewsList');
  if (!listEl) return;
  const LIMIT = 4;
  const cards = reviews.slice(0, LIMIT).map(r => {
    const name = r.user?.name || 'Customer';
    const date = new Date(r.createdAt).toLocaleString('en-IN', { month: 'short', year: 'numeric' });
    return `<div class="rev-card">
      <div class="rev-card-head">
        <div class="rev-avatar">${name[0].toUpperCase()}</div>
        <div class="rev-meta">
          <div class="rev-name">${name}</div>
          <div class="rev-stars-row">${renderStars(r.rating)}</div>
        </div>
        <span class="rev-date">${date}</span>
      </div>
      ${r.title ? `<p style="font-weight:700;font-size:.82rem;margin:0 0 4px;">${r.title}</p>` : ''}
      <p class="rev-text">${r.comment}</p>
      ${r.isVerifiedPurchase ? '<span class="rev-verified"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Verified Purchase</span>' : ''}
    </div>`;
  }).join('');
  // Replace static placeholder reviews with real ones
  listEl.innerHTML = cards || '<div style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--forest-sage);font-size:.85rem;">No reviews yet. Be the first!</div>';
  if (reviews.length > LIMIT) {
    const rem = reviews.length - LIMIT;
    const wrap = document.createElement('div');
    wrap.id = 'revViewMoreWrap';
    wrap.style.cssText = 'grid-column:1/-1;display:flex;justify-content:center;margin-top:.5rem;';
    wrap.innerHTML = `<button onclick="expandApiReviews()" style="display:flex;align-items:center;gap:.5rem;padding:.65rem 1.75rem;border-radius:30px;border:1.5px solid rgba(26,58,42,.18);background:#fff;color:var(--forest-mid);font-size:.78rem;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif;">View ${rem} More Review${rem > 1 ? 's' : ''}</button>`;
    listEl.appendChild(wrap);
  }
  // Update counts from real data
  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  const cnt = reviews.length;
  const cntEl = document.getElementById('revCntEl');
  const pRevEl = document.getElementById('pReviewsEl');
  if (cntEl) cntEl.textContent = cnt + ' rating' + (cnt !== 1 ? 's' : '');
  if (pRevEl) pRevEl.textContent = cnt + ' review' + (cnt !== 1 ? 's' : '');
  window._apiReviews = reviews;
}

function expandApiReviews() {
  const reviews = window._apiReviews || [];
  const listEl  = document.getElementById('reviewsList');
  const wrap    = document.getElementById('revViewMoreWrap');
  if (wrap) wrap.remove();
  const shown = listEl.querySelectorAll('.rev-card').length;
  reviews.slice(shown).forEach(r => {
    const name = r.user?.name || 'Customer';
    const date = new Date(r.createdAt).toLocaleString('en-IN', { month: 'short', year: 'numeric' });
    const div  = document.createElement('div');
    div.className = 'rev-card';
    div.style.cssText = 'opacity:0;transform:translateY(16px);transition:opacity .35s ease,transform .35s ease;';
    div.innerHTML = `<div class="rev-card-head"><div class="rev-avatar">${name[0].toUpperCase()}</div><div class="rev-meta"><div class="rev-name">${name}</div><div class="rev-stars-row">${renderStars(r.rating)}</div></div><span class="rev-date">${date}</span></div>${r.title ? `<p style="font-weight:700;font-size:.82rem;margin:0 0 4px;">${r.title}</p>` : ''}<p class="rev-text">${r.comment}</p>${r.isVerifiedPurchase ? '<span class="rev-verified"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Verified Purchase</span>' : ''}`;
    listEl.appendChild(div);
    requestAnimationFrame(() => requestAnimationFrame(() => { div.style.opacity = '1'; div.style.transform = 'translateY(0)'; }));
  });
}

async function initReviewForm() {
  const user  = (function(){ try { return JSON.parse(localStorage.getItem('nansai_user')||'null'); } catch { return null; } })();
  const token = localStorage.getItem('nansai_token');
  const formEl = document.getElementById('revForm');
  if (!formEl) return;

  // Always fetch real reviews from API
  try {
    const res  = await fetch(window.API_BASE + '/reviews/product/' + currentProduct.id);
    const data = await res.json();
    if (data.success) _renderApiReviews(data.data || []);

    if (user && token) {
      const uid  = user._id || user.id || '';
      const mine = (data.data || []).find(r => (r.user?._id || r.user) === uid);
      if (mine) {
        formEl.style.display = 'block';
        formEl.innerHTML = '<p style="font-size:.82rem;font-weight:600;color:var(--forest-leaf);padding:.5rem 0;">&#9989; You have already reviewed this product. Thank you!</p>';
        return;
      }
    }
  } catch(e) { /* network error - show form anyway */ }

  if (!user || !token) {
    formEl.style.display = 'block';
    formEl.innerHTML = '<p style="font-size:.82rem;color:var(--forest-sage);padding:.5rem 0;"><a href="login.html" style="color:var(--forest-deep);font-weight:700;">Login</a> to write a review.</p>';
    return;
  }

  formEl.style.display = 'block';
  document.getElementById('revFormUserName').textContent = 'Posting as ' + (user.name || 'You');
  document.querySelectorAll('#starPicker span').forEach(s => {
    s.addEventListener('mouseover', () => highlightStars(+s.dataset.star));
    s.addEventListener('mouseout',  () => highlightStars(selectedStar));
    s.addEventListener('click',     () => { selectedStar = +s.dataset.star; highlightStars(selectedStar); });
  });
}

function highlightStars(n) {
  document.querySelectorAll('#starPicker span').forEach((s, i) => {
    s.style.color = i < n ? '#f59e0b' : '#d1d5db';
  });
}

async function submitReview() {
  const user  = (function(){ try { return JSON.parse(localStorage.getItem('nansai_user')||'null'); } catch { return null; } })();
  const token = localStorage.getItem('nansai_token');
  const text  = document.getElementById('revTextInput').value.trim();
  const msg   = document.getElementById('revFormMsg');

  if (!selectedStar) { msg.textContent = 'Please select a star rating.'; msg.style.color = '#ef4444'; return; }
  if (text.length < 10) { msg.textContent = 'Please write at least 10 characters.'; msg.style.color = '#ef4444'; return; }
  if (!user || !token) { msg.textContent = 'Please login to submit a review.'; msg.style.color = '#ef4444'; return; }

  const btn = document.querySelector('#revForm button[onclick="submitReview()"]');
  if (btn) { btn.disabled = true; btn.textContent = 'Submitting...'; }

  try {
    const res  = await fetch(window.API_BASE + '/reviews', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body:    JSON.stringify({ product: currentProduct.id, rating: selectedStar, comment: text })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Could not submit review');

    // Refresh reviews from API so counts and list are accurate
    const revRes  = await fetch(window.API_BASE + '/reviews/product/' + currentProduct.id);
    const revData = await revRes.json();
    if (revData.success) _renderApiReviews(revData.data || []);

    document.getElementById('revForm').innerHTML = '<p style="font-size:.85rem;font-weight:700;color:var(--forest-leaf);padding:.5rem 0;">&#127881; Thank you for your review!</p>';
    showToast('&#11088; Review submitted!');
  } catch(err) {
    msg.textContent = err.message;
    msg.style.color = '#ef4444';
    if (btn) { btn.disabled = false; btn.textContent = 'Submit Review'; }
  }
}

"""

result = raw[:a] + new_block + raw[b:]
open('pages/product.html', 'wb').write(result)
print('REPLACED. New size:', len(result))
