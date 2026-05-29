import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

f = open('pages/account.html', encoding='utf-8')
lines = f.readlines()
f.close()

fixed = 0
for i, line in enumerate(lines):
    if "ORDERS.length + ' order'" in line and "textContent" in line:
        print(f'Line {i+1}: {repr(line)}')
        lines[i] = "  if (tf) tf.textContent = 'View all ' + ORDERS.length + ' order' + (ORDERS.length !== 1 ? 's' : '') + ' +';\r\n"
        fixed += 1

if fixed == 0:
    for i, line in enumerate(lines):
        for ch in line:
            code = ord(ch)
            if code in (0x2018, 0x2019, 0x201C, 0x201D):
                print(f'Line {i+1} curly quote U+{code:04X}: {repr(line[:120])}')
                break

f = open('pages/account.html', 'w', encoding='utf-8', newline='')
f.writelines(lines)
f.close()
print(f'Fixed {fixed} lines')
