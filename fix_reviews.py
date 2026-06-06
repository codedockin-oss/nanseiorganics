import re

with open('pages/product.html', 'r', encoding='utf-8') as f:
    content = f.read()

old = re.search(r'  // (Update counts from real data|Compute real stats and update all review UI).*?window\._apiReviews = reviews;\n}', content, re.DOTALL)
if old:
    print("Found at:", old.start(), "-", old.end())
    print("Snippet:", old.group()[:80])
else:
    print("NOT FOUND")
    # Show lines around revCntEl
    idx = content.find("cntEl.textContent = cnt")
    print("cntEl idx:", idx)
    print("Context:", repr(content[idx-50:idx+100]))
