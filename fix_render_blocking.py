with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

old = '''<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="stylesheet" href="assets/css/bundle.min.css"/>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Cormorant+Garamond:ital,wght@0,300;0,600;1,300;1,600&family=IBM+Plex+Mono:wght@300;400&family=Outfit:wght@200;300;400;500&display=swap" rel="stylesheet"/>'''

new = '''<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link rel="preload" href="assets/css/bundle.min.css" as="style"/>
<link rel="stylesheet" href="assets/css/bundle.min.css" media="print" onload="this.media='all'"/>
<noscript><link rel="stylesheet" href="assets/css/bundle.min.css"/></noscript>
<link rel="preload" href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Cormorant+Garamond:ital,wght@0,300;0,600;1,300;1,600&family=IBM+Plex+Mono:wght@300;400&family=Outfit:wght@200;300;400;500&display=swap" as="style"/>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Cormorant+Garamond:ital,wght@0,300;0,600;1,300;1,600&family=IBM+Plex+Mono:wght@300;400&family=Outfit:wght@200;300;400;500&display=swap" rel="stylesheet" media="print" onload="this.media='all'"/>
<noscript><link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Cormorant+Garamond:ital,wght@0,300;0,600;1,300;1,600&family=IBM+Plex+Mono:wght@300;400&family=Outfit:wght@200;300;400;500&display=swap" rel="stylesheet"/></noscript>'''

if old not in content:
    print("ERROR: exact match not found, no changes made")
else:
    content = content.replace(old, new, 1)
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print("SUCCESS: replaced render-blocking CSS/font tags")
