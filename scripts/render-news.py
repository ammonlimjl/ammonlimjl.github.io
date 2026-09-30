"""Render news cards into static HTML so readers and crawlers need no JavaScript."""
from pathlib import Path
from html import escape
import json, re
root = Path(__file__).resolve().parents[1]
data = json.loads((root / 'data/news.json').read_text())
cards = []
for item in data['items']:
    n = {key: escape(value, quote=True) for key, value in item.items()}
    cards.append(f'''      <article class="update-card" id="{n['id']}">
        <figure class="update-figure"><img src="{n['image']}" alt="{n['imageAlt']}" width="{n['imageWidth']}" height="{n['imageHeight']}" loading="lazy" decoding="async"><figcaption>{n['imageCaption']}</figcaption></figure>
        <div class="update-copy">
        <div class="update-meta"><span class="update-topic">{n['tag']}</span><time datetime="{n['published']}">{n['date']}</time></div>
        <h2>{n['title']}</h2>
        <p>{n['excerpt']}</p>
        <div class="update-source"><span>Source: {n['source']}</span><a href="{n['sourceUrl']}" target="_blank" rel="noopener" aria-label="Read the HDB article: {n['title']} (opens in a new tab)">Read on HDB ↗</a></div>
        </div>
      </article>''')
page = root / 'news/index.html'
text = page.read_text()
text, count = re.subn(r'<!-- NEWS-CARDS:START -->.*?<!-- NEWS-CARDS:END -->', '<!-- NEWS-CARDS:START -->\n' + '\n'.join(cards) + '\n      <!-- NEWS-CARDS:END -->', text, flags=re.S)
assert count == 1, 'Expected one news card region'
page.write_text(text)
print(f'Rendered {len(cards)} news summaries')
