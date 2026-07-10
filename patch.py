import re
import shutil
import sys

FILE = "index.html"
BACKUP = "index.html.backup"

# Step 1: Backup
shutil.copy(FILE, BACKUP)
print(f"Backed up {FILE} -> {BACKUP}")

with open(FILE, "r", encoding="utf-8") as f:
    content = f.read()

original_content = content

# --- Patch 1: Font/CSS block ---
old_block = '''<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="stylesheet" href="assets/css/bundle.min.css"/>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Cormorant+Garamond:ital,wght@0,300;0,600;1,300;1,600&family=IBM+Plex+Mono:wght@300;400&family=Outfit:wght@200;300;400;500&display=swap" rel="stylesheet"/>'''

new_block = '''<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link rel="preload" href="assets/css/bundle.min.css" as="style" onload="this.onload=null;this.rel='stylesheet'"/>
<noscript><link rel="stylesheet" href="assets/css/bundle.min.css"/></noscript>
<link rel="preload" href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Cormorant+Garamond:ital,wght@0,300;0,600;1,300;1,600&family=IBM+Plex+Mono:wght@300;400&family=Outfit:wght@200;300;400;500&display=swap" as="style" onload="this.onload=null;this.rel='stylesheet'"/>
<noscript><link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Cormorant+Garamond:ital,wght@0,300;0,600;1,300;1,600&family=IBM+Plex+Mono:wght@300;400&family=Outfit:wght@200;300;400;500&display=swap" rel="stylesheet"/></noscript>'''

if old_block in content:
    content = content.replace(old_block, new_block)
    print("Patch 1 (font/CSS block) applied.")
else:
    print("WARNING: Patch 1 pattern not found — no changes made for CSS block.")

# --- Patch 2: defer on site-settings.js ---
old_script = '<script src="assets/js/site-settings.js?v=20260613"></script>'
new_script = '<script src="assets/js/site-settings.js?v=20260613" defer></script>'

if old_script in content:
    content = content.replace(old_script, new_script)
    print("Patch 2 (defer on site-settings.js) applied.")
else:
    print("WARNING: Patch 2 pattern not found — no changes made for script tag.")

# Write back only if something changed
if content != original_content:
    with open(FILE, "w", encoding="utf-8") as f:
        f.write(content)
    print("index.html updated successfully.")
else:
    print("No changes were made. Check warnings above.")

