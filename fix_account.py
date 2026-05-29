f = open('pages/account.html', encoding='utf-8')
text = f.read()
f.close()

# Fix the broken string with curly quote causing JS syntax error
old = "if (tf) tf.textContent = 'View all ' + ORDERS.length + ' order' + (ORDERS.length !== 1 ? 's' : '') + ' +'';"
new = "if (tf) tf.textContent = 'View all ' + ORDERS.length + ' order' + (ORDERS.length !== 1 ? 's' : '') + ' \u2192';"

if old in text:
    text = text.replace(old, new)
    print('fixed curly quote syntax error')
else:
    # try finding it with raw bytes
    print('exact match not found, searching...')
    idx = text.find("+ ' +'")
    if idx > -1:
        print('found at:', idx)
        print('context:', repr(text[idx-50:idx+50]))

f = open('pages/account.html', 'w', encoding='utf-8', newline='\r\n')
f.write(text)
f.close()
print('done')
