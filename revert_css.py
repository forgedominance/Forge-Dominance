import shutil

FILE = "index.html"
BACKUP = "index.html.before_revert"

shutil.copy(FILE, BACKUP)
print(f"Backed up {FILE} -> {BACKUP}")

with open(FILE, "r", encoding="utf-8") as f:
    content = f.read()

original = content

old_block = '''<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link rel="preload" href="assets/css/bundle.min.css" as="style" onload="this.onload=null;this.rel='stylesheet'"/>
<noscript><link rel="stylesheet" href="assets/css/bundle.min.css"/></noscript>
<link rel="preload" href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Cormorant+Garamond:ital,wght@0,300;0,600;1,300;1,600&family=IBM+Plex+Mono:wght@300;400&family=Outfit:wght@200;300;400;500&display=swap" as="style" onload="this.onload=null;this.rel='stylesheet'"/>
<noscript><link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Cormorant+Garamond:ital,wght@0,300;0,600;1,300;1,600&family=IBM+Plex+Mono:wght@300;400&family=Outfit:wght@200;300;400;500&display=swap" rel="stylesheet"/></noscript>'''

new_block = '''<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="stylesheet" href="assets/css/bundle.min.css"/>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Cormorant+Garamond:ital,wght@0,300;0,600;1,300;1,600&family=IBM+Plex+Mono:wght@300;400&family=Outfit:wght@200;300;400;500&display=swap" rel="stylesheet"/>'''

if old_block in content:
    content = content.replace(old_block, new_block)
    print("CSS block reverted to blocking stylesheet.")
else:
    print("WARNING: block not found — no changes made.")

if content != original:
    with open(FILE, "w", encoding="utf-8") as f:
        f.write(content)
    print("index.html updated.")
else:
    print("No changes made.")

