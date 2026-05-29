import sys, io, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

f = open('pages/account.html', encoding='utf-8')
lines = f.readlines()
f.close()

issues = []

for i, line in enumerate(lines):
    # curly/smart quotes
    for ch in line:
        code = ord(ch)
        if code in (0x2018, 0x2019, 0x201C, 0x201D):
            issues.append(f'Line {i+1} CURLY QUOTE U+{code:04X}: {line.strip()[:100]}')
            break
    # unclosed template literal or string
    stripped = line.strip()
    # check for lines ending with odd number of backticks (rough check)
    if stripped.endswith("'';") or stripped.endswith("'`") or stripped.endswith("`;'"):
        issues.append(f'Line {i+1} SUSPICIOUS END: {stripped[:100]}')
    # broken ₹ or emoji encoded wrong
    if '\ufffd' in line:
        issues.append(f'Line {i+1} REPLACEMENT CHAR: {stripped[:100]}')

if issues:
    for iss in issues:
        print(iss)
else:
    print('No obvious syntax issues found')

# Also check script tag count
text = ''.join(lines)
opens = len(re.findall(r'<script', text))
closes = len(re.findall(r'</script>', text))
print(f'Script tags: {opens} open / {closes} close')

# Check for duplicate function names that could cause issues
funcs = re.findall(r'function\s+(\w+)\s*\(', text)
from collections import Counter
dupes = {k:v for k,v in Counter(funcs).items() if v > 1}
if dupes:
    print('DUPLICATE FUNCTIONS:', dupes)
else:
    print('No duplicate functions')
