"""Static publishing checks; run with Python 3, no dependencies."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import json, re, xml.etree.ElementTree as ET
root = Path(__file__).resolve().parents[1]
class Page(HTMLParser):
    def __init__(self, text):
        super().__init__(); self.tags=[]; self.ids=[]; self.feed(text)
    def handle_starttag(self, tag, attrs):
        a=dict(attrs); self.tags.append((tag,a))
        if 'id' in a: self.ids.append(a['id'])
files=[root/'index.html', *root.glob('*/index.html'), *root.glob('towns/*/index.html')]
errors=[]; titles=[]
for file in files:
    text=file.read_text(); page=Page(text); name=str(file.relative_to(root))
    def check(ok, message):
        if not ok: errors.append(name+': '+message)
    check(sum(t=='h1' for t,a in page.tags)==1,'expected one H1')
    check(sum(t=='main' for t,a in page.tags)==1,'expected one main landmark')
    check(len(page.ids)==len(set(page.ids)),'duplicate IDs')
    titles += re.findall(r'<title>(.*?)</title>',text)
    canonical=[a['href'] for t,a in page.tags if t=='link' and a.get('rel')=='canonical']
    expected='https://www.ammonlim.com/'+name.removesuffix('index.html')
    check(canonical==[expected],'canonical mismatch')
    for data in re.findall(r'<script type="application/ld\+json">(.*?)</script>',text,re.S):json.loads(data)
    for tag,attrs in page.tags:
        value=attrs.get('href') if tag in ('a','link') else attrs.get('src') if tag in ('script','img') else None
        if not value: continue
        url=urlsplit(value)
        if url.scheme or url.netloc: continue
        path=(root / unquote(url.path.lstrip('/'))) if url.path.startswith('/') else (file.parent / unquote(url.path)) if url.path else file
        if path.is_dir():path=path/'index.html'
        check(path.exists(),'missing local target '+value)
        if url.fragment and path.exists() and path.suffix=='.html':
            check(url.fragment in Page(path.read_text()).ids,'missing anchor '+value)
    check('art-band' not in text,'watercolor section remains')
check(len(titles)==len(set(titles)),'duplicate page titles')
urls=ET.parse(root/'sitemap.xml').getroot()
check(len(urls)==len(files),'sitemap page count mismatch')
if errors: raise SystemExit('\n'.join(errors))
print(f'PASS: {len(files)} pages; headings, landmarks, canonical URLs, unique titles, JSON-LD, local assets, links and fragments.')
