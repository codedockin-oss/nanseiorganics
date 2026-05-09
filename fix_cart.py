import sys
sys.stdout.reconfigure(encoding='utf-8')

path = r'pages\index.html'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

idx1 = content.find('const sectionMeta={')
idx2 = content.find('const sectionMeta={', idx1 + 1)

print(f"First at: {idx1}, Second at: {idx2}")

# Find start of the comment line before first sectionMeta
comment_marker = content.rfind('\n', 0, idx1)
cut_point = content.rfind('\n', 0, comment_marker) + 1

new_content = content[:cut_point] + content[idx2:]

with open(path, 'w', encoding='utf-8') as f:
    f.write(new_content)

with open(path, 'r', encoding='utf-8') as f:
    verify = f.read()

count = verify.count('const sectionMeta={')
print(f"sectionMeta count after fix: {count}")
print(f"File length: {len(verify)}")
