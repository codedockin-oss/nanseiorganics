f = open('pages/product.html', 'rb')
raw = f.read()
f.close()

lines = raw.split(b'\n')
print('Total lines:', len(lines))

# Find start and end line indices (0-based)
start_idx = None
end_idx   = None
for i, line in enumerate(lines):
    if b'Check for a review pre-saved from the orders page' in line:
        start_idx = i - 1  # include the blank line before
    if start_idx and b"showToast('\\u2b50 Your review has been posted!')" in line:
        # end is the closing } } } after this
        end_idx = i + 5   # covers: } catch } } }
        break

print('start_idx:', start_idx, 'end_idx:', end_idx)
if start_idx and end_idx:
    # Show what we're removing
    print('Removing lines:')
    for l in lines[start_idx:end_idx+1]:
        print(' ', repr(l[:80]))

    new_lines = lines[:start_idx] + lines[end_idx+1:]
    open('pages/product.html', 'wb').write(b'\n'.join(new_lines))
    print('DONE. New line count:', len(new_lines))
