import sys

path = "src/app/storely-admin/layout.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

orig = content

old = "  if (!ready) return null\n  if (!hasAuth) return <>{children}</>"
new = "  if (!ready) return null\n  if (!hasAuth || pathname === '/storely-admin') return <>{children}</>"

assert old in content, "STEP1_FAIL"
content = content.replace(old, new, 1)

if content == orig:
    print("NO_CHANGE")
    sys.exit(1)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("SUCCESS")
