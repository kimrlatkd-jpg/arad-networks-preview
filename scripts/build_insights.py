#!/usr/bin/env python3
"""Build ARAD's bilingual, full-text journal from editor-owned JSON files.

Run: python3 scripts/build_insights.py --root .
Uses only Python's standard library. Existing site chrome is preserved.
"""
from pathlib import Path
from html import escape
from urllib.parse import quote
import argparse
import datetime as dt
import email.utils
import json
import re
import xml.etree.ElementTree as ET

BASE = 'https://kimrlatkd-jpg.github.io/arad-networks-preview/'
REPO = 'https://github.com/kimrlatkd-jpg/arad-networks-preview'
CATEGORIES = {'isolate':'Isolate AI','accelerate':'Accelerate AI','connect':'Connect AI'}
COPY = {
 'ko': {'heading':'연결을 만드는 기술과 현장', 'lead':'네트워크의 구조부터 AI 인프라와 현장의 운영까지. 아라드의 기술과 경험을 글로 전합니다.', 'all':'모든 글', 'read':'글 읽기', 'back':'모든 인사이트', 'manage':'글 관리', 'filter':'글 주제 선택', 'detail':'이 기술의 적용을 살펴보세요.', 'image':'적용 환경을 설명하기 위한 실사 이미지입니다.', 'rss':'새 글 받아보기', 'about':'기술 이야기', 'related':'관련 사업 살펴보기'},
 'en': {'heading':'Technology in practice.', 'lead':'Explore the structures behind networks, AI infrastructure and connectivity in the field.', 'all':'All articles', 'read':'Read article', 'back':'All insights', 'manage':'Manage articles', 'filter':'Filter articles by topic', 'detail':'Explore how this technology can be applied.', 'image':'Photograph illustrating an application environment.', 'rss':'Follow new articles', 'about':'Technical insight', 'related':'Explore the business'},
}

def h(value):
    return escape(str(value), quote=True)

def text(value, field):
    if not isinstance(value,str) or not value.strip():
        raise ValueError(f'{field} must be a nonempty string')
    return value.strip()

def load_posts(folder):
    posts=[]
    for path in sorted(folder.glob('*.json')):
        p=json.loads(path.read_text(encoding='utf-8'))
        slug=text(p.get('slug'),f'{path}:slug')
        if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*',slug) or path.stem!=slug:
            raise ValueError(f'{path}: slug must match the filename and contain lowercase words separated by hyphens')
        if p.get('category') not in CATEGORIES:
            raise ValueError(f'{path}: category must be isolate, accelerate or connect')
        if not isinstance(p.get('published'),bool):
            raise ValueError(f'{path}: published must be true or false')
        if not isinstance(p.get('order',100),int):
            raise ValueError(f'{path}: order must be an integer')
        image=Path(text(p.get('image'),f'{path}:image'))
        if image.is_absolute() or '..' in image.parts or image.parts[0]!='assets':
            raise ValueError(f'{path}: image must be a relative assets/ path')
        if p.get('date'):
            dt.date.fromisoformat(p['date'])
        translations=p.get('translations')
        if not isinstance(translations,dict) or not translations or set(translations)-{'ko','en'}:
            raise ValueError(f'{path}: translations needs ko and/or en')
        for lang,t in translations.items():
            for key in ['title','summary','image_alt']: text(t.get(key),f'{path}:{lang}:{key}')
            if not isinstance(t.get('sections'),list) or not t['sections']:
                raise ValueError(f'{path}:{lang}: sections needs at least one section')
            for section in t['sections']:
                text(section.get('heading'),f'{path}:heading')
                if not isinstance(section.get('paragraphs'),list) or not section['paragraphs']:
                    raise ValueError(f'{path}: section needs paragraphs')
                for paragraph in section['paragraphs']: text(paragraph,f'{path}:paragraph')
        posts.append(p)
    return sorted(posts,key=lambda p:(p.get('order',100),p['slug']))

def route(lang,slug=None):
    return (f'insights/{slug}.html' if lang=='ko' else f'en/{slug}.html') if slug else ('pages/insights.html' if lang=='ko' else 'en/insights.html')

def metadata(page,title,description,url,kind,extra=''):
    page=re.sub(r'<title>.*?</title>',f'<title>{h(title)} — ARAD Networks</title>',page,count=1)
    for prop,value in [('description',description),('og:title',title+' — ARAD Networks'),('og:description',description),('og:type',kind)]:
        page=re.sub(r'(<meta (?:name|property)="'+re.escape(prop)+r'" content=")[^"]*(")',lambda m:m[1]+h(value)+m[2],page,count=1)
    page=re.sub(r'<link rel="canonical"[^>]*>','',page)
    page=re.sub(r'<script type="application/ld\+json" data-arad-blog>.*?</script>','',page,flags=re.S)
    page=re.sub(r'<link rel="alternate" type="application/rss\+xml"[^>]*>','',page)
    if '../blog.css?v=33' not in page: page=page.replace('</head>','<link rel="stylesheet" href="../blog.css?v=33"></head>')
    return page.replace('</head>',f'<link rel="canonical" href="{h(url)}">'+extra+'</head>')

def meta_line(post,t,lang):
    values=[]
    if t.get('author'):values.append('<span>'+h(t['author'])+'</span>')
    if post.get('date'):values.append(f'<time datetime="{h(post["date"])}">{h(post["date"])}</time>')
    return '<div class="b-article-meta">'+''.join(values)+'</div>' if values else ''

def article_main(post,t,lang):
    c=COPY[lang];business=CATEGORIES[post['category']]
    sections=''.join('<section><h2>'+h(s['heading'])+'</h2>'+''.join('<p>'+h(p)+'</p>' for p in s['paragraphs'])+'</section>' for s in t['sections'])
    return f'''<article class="a-article b-article"><header class="a-article-header a-container"><a class="a-quiet-link" href="../{route(lang)}">{c['back']}</a><p class="a-product">{business} · {c['about']}</p><h1>{h(t['title'])}</h1><p class="a-lead">{h(t['summary'])}</p>{meta_line(post,t,lang)}</header><figure class="a-article-image b-article-image"><img src="../{h(post['image'])}" width="1600" height="1067" alt="{h(t['image_alt'])}" fetchpriority="high"><figcaption>{c['image']}</figcaption></figure><div class="a-article-body">{sections}<aside><p>{c['detail']}</p><a class="a-button" href="../{'pages' if lang=='ko' else 'en'}/{post['category']}.html">{business}</a></aside><div class="b-reading-end"><a href="../{route(lang)}">{c['back']}</a><a href="{REPO}/edit/main/content/insights/{post['slug']}.json" rel="noopener noreferrer" target="_blank">{c['manage']}</a></div></div></article>'''

def listing_main(posts,lang):
    c=COPY[lang]
    filters=''.join(f'<button type="button" data-filter="{key}" aria-pressed="false">{name}</button>' for key,name in CATEGORIES.items())
    cards=[]
    for i,p in enumerate(posts):
        t=p['translations'][lang]
        cards.append(f'''<article class="s-story a-insight-card{' s-story-featured' if i==0 else ''}" data-category="{p['category']}"><a class="s-story-link" href="../{route(lang,p['slug'])}"><div class="s-story-image"><img src="../{h(p['image'])}" width="1600" height="1067" alt="{h(t['image_alt'])}" loading="{'eager' if i==0 else 'lazy'}"></div><div class="s-story-copy"><p class="s-kicker">{CATEGORIES[p['category']]}</p><h2 class="s-story-title">{h(t['title'])}</h2><p class="s-body">{h(t['summary'])}</p>{meta_line(p,t,lang)}<span class="s-link-label">{c['read']}</span></div></a></article>''')
    feed='feed.xml' if lang=='ko' else 'feed-en.xml'
    return f'''<div class="s-page s-insights b-journal"><header class="s-hero s-shell"><p class="s-kicker">Insights</p><h1 class="s-h1">{c['heading']}</h1><div class="s-hero-intro"><p class="s-lead">{c['lead']}</p></div></header><section class="s-journal s-shell"><div class="b-journal-tools"><div class="s-filters" role="group" aria-label="{c['filter']}"><button type="button" data-filter="all" aria-pressed="true">{c['all']}</button>{filters}</div><a class="b-feed-link" href="../insights/{feed}">{c['rss']}</a></div><div class="s-journal-grid">{''.join(cards)}</div><p class="s-visually-hidden a-filter-status" role="status" aria-live="polite"></p><div class="b-journal-footer"><span>ARAD Networks</span><a href="{REPO}/tree/main/content/insights" target="_blank" rel="noopener noreferrer">{c['manage']}</a></div></section></div>'''

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root',type=Path,default=Path.cwd(),help='Repository containing site/ and content/insights/')
    parser.add_argument('--site',type=Path,help='Optional site directory override for local review')
    args=parser.parse_args();root=args.root.resolve();site=args.site.resolve() if args.site else root/'site'
    posts=load_posts(root/'content/insights')
    if not posts:raise SystemExit('No content/insights/*.json files found')
    published=[p for p in posts if p['published']]
    # Read template chrome before writing; no application source or other pages
    # are regenerated. Parent site navigation/address revisions stay intact.
    templates={lang:re.sub(r'(<body\b[^>]*class=")[^"]*',r'\1a-site a-blog-article',(site/route(lang)).read_text(),count=1) for lang in COPY}
    generated=[]
    for lang in COPY:
        available=[p for p in published if lang in p['translations']]
        listfile=site/route(lang);page=listfile.read_text()
        main_html=listing_main(available,lang)
        page=re.sub(r'(<main\b[^>]*>).*?(</main>)',lambda m:m[1]+main_html+m[2],page,count=1,flags=re.S)
        feed='feed.xml' if lang=='ko' else 'feed-en.xml'
        page=metadata(page,'Insights',COPY[lang]['lead'],BASE+route(lang),'website',f'<link rel="alternate" type="application/rss+xml" title="ARAD Insights" href="../insights/{feed}">')
        listfile.write_text(page,encoding='utf-8');generated.append(str(listfile.relative_to(site)))
        rss=ET.Element('rss',{'version':'2.0'});channel=ET.SubElement(rss,'channel')
        for key,value in [('title','ARAD Networks Insights'),('link',BASE+route(lang)),('description',COPY[lang]['lead']),('language',lang)]:ET.SubElement(channel,key).text=value
        for post in available:
            t=post['translations'][lang];url=BASE+route(lang,post['slug'])
            target=site/route(lang,post['slug']);target.parent.mkdir(exist_ok=True)
            page=target.read_text() if target.is_file() else templates[lang]
            page=re.sub(r'(<main\b[^>]*>).*?(</main>)',lambda m:m[1]+article_main(post,t,lang)+m[2],page,count=1,flags=re.S)
            other='en' if lang=='ko' else 'ko'
            alternate='../'+(route(other,post['slug']) if other in post['translations'] else route(other))
            page=re.sub(r'(<a\b[^>]*href=")[^"]*(" lang="'+other+r'")',lambda m:m[1]+alternate+m[2],page)
            schema={'@context':'https://schema.org','@type':'Article','headline':t['title'],'description':t['summary'],'inLanguage':lang,'mainEntityOfPage':url,'image':BASE+post['image'],'publisher':{'@type':'Organization','name':'ARAD Networks','url':BASE}}
            if post.get('date'):schema['datePublished']=post['date']
            if t.get('author'):schema['author']={'@type':'Person','name':t['author']}
            structured='<script type="application/ld+json" data-arad-blog>'+json.dumps(schema,ensure_ascii=False).replace('<','\\u003c')+'</script>'
            page=metadata(page,t['title'],t['summary'],url,'article',structured)
            target.write_text(page,encoding='utf-8');generated.append(str(target.relative_to(site)))
            item=ET.SubElement(channel,'item')
            for key,value in [('title',t['title']),('link',url),('guid',url),('description',t['summary'])]:ET.SubElement(item,key).text=value
            if post.get('date'):
                date=dt.datetime.combine(dt.date.fromisoformat(post['date']),dt.time(),dt.timezone.utc)
                ET.SubElement(item,'pubDate').text=email.utils.format_datetime(date)
        # A draft is omitted from list/feed. Remove previously generated routes
        # only for known JSON records explicitly marked unpublished.
        for p in posts:
            if not p['published'] or lang not in p['translations']:
                target=site/route(lang,p['slug'])
                if target.is_file() and 'data-arad-blog' in target.read_text():target.unlink()
        ET.indent(rss)
        target=site/'insights'/feed;ET.ElementTree(rss).write(target,encoding='utf-8',xml_declaration=True);generated.append(str(target.relative_to(site)))
    print(json.dumps({'published':len(published),'files':generated},ensure_ascii=False))

if __name__=='__main__':main()
