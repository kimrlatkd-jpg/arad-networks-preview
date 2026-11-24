#!/usr/bin/env python3
"""Build ARAD's bilingual static journal. Python 3.10+, standard library only.
Run: python3 scripts/build_insights.py --root . [--site /path/to/site]
Validates all sources and templates before writing any public output.
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
CATEGORIES = {'isolate': 'Isolate AI', 'accelerate': 'Accelerate AI', 'connect': 'Connect AI'}
RESERVED = {'insights', 'manage', 'insights-manage', 'isolate', 'accelerate', 'connect', 'company', 'resources', 'contact', 'index'}
COPY = {
 'ko': {'title':'기술과 현장을 잇는 이야기', 'lead':'네트워크의 구조부터 AI 인프라, 현장의 연결까지. 연결을 설계하고 운영할 때 살펴야 할 질문을 나눕니다.', 'all':'모든 글', 'read':'글 읽기', 'back':'인사이트로 돌아가기', 'manage':'글 작성·관리', 'filter':'글 주제', 'search':'제목·내용 검색', 'placeholder':'궁금한 주제를 찾아보세요', 'rss':'RSS 구독', 'count':'개의 글', 'author':'아라드 네트웍스', 'type':'기술 이야기', 'contents':'이 글의 내용', 'related':'함께 읽어보세요', 'explore':'이 기술이 적용되는 분야', 'credit':'적용 환경을 설명하는 사진이며, 아라드 구축 현장 사진은 아닙니다.', 'empty':'검색 결과가 없습니다.', 'clear':'검색과 필터 초기화', 'copy':'링크 복사', 'copied':'링크를 복사했습니다.', 'edit':'원고 수정', 'date':'게시', 'updated':'수정', 'management':'글 관리 안내'},
 'en': {'title':'Technology in practice.', 'lead':'From network architecture to AI infrastructure and connectivity in the field. Questions that help us design and operate connections.', 'all':'All articles', 'read':'Read article', 'back':'Back to insights', 'manage':'Write & manage', 'filter':'Article topic', 'search':'Search titles and articles', 'placeholder':'Find a topic', 'rss':'RSS feed', 'count':' articles', 'author':'ARAD Networks', 'type':'Technology note', 'contents':'In this article', 'related':'Continue reading', 'explore':'Explore this field', 'credit':'An illustrative environment photograph, not an ARAD installation.', 'empty':'No matching articles.', 'clear':'Reset search and filters', 'copy':'Copy link', 'copied':'Link copied.', 'edit':'Edit source', 'date':'Published', 'updated':'Updated', 'management':'Editorial guide'}
}

def h(value): return escape(str(value), quote=True)
def route(lang,slug=None):
 return (f'insights/{slug}.html' if lang=='ko' else f'en/{slug}.html') if slug else ('pages/insights.html' if lang=='ko' else 'en/insights.html')
def manage_route(lang): return 'insights/manage.html' if lang=='ko' else 'en/insights-manage.html'
def required_text(v,where):
 if not isinstance(v,str) or not v.strip(): raise ValueError(f'{where}: expected non-empty text')
 return v.strip()
def read_posts(folder,site):
 if not folder.is_dir(): raise ValueError('Missing content/insights directory')
 files=sorted(folder.glob('*.json'))
 if not files: raise ValueError('No content/insights/*.json sources; refusing to erase the journal')
 posts=[]
 for path in files:
  p=json.loads(path.read_text(encoding='utf-8')); slug=required_text(p.get('slug'),str(path))
  if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*',slug) or slug!=path.stem or slug in RESERVED: raise ValueError(f'{path}: invalid/reserved slug')
  if p.get('category') not in CATEGORIES: raise ValueError(f'{path}: invalid category')
  if type(p.get('published')) is not bool: raise ValueError(f'{path}: published must be true/false')
  if type(p.get('order',100)) is not int: raise ValueError(f'{path}: order must be integer')
  image=Path(required_text(p.get('image'),f'{path}: image'))
  if image.is_absolute() or '..' in image.parts or image.parts[0]!='assets' or not (site/image).is_file(): raise ValueError(f'{path}: missing/invalid assets image')
  for k in ['date','updated']:
   if p.get(k): dt.date.fromisoformat(p[k])
  ts=p.get('translations')
  if not isinstance(ts,dict) or not ts or set(ts)-{'ko','en'}: raise ValueError(f'{path}: provide ko/en translations')
  for lang,t in ts.items():
   if not isinstance(t,dict): raise ValueError(f'{path}: invalid translation')
   for k in ['title','summary','image_alt']:required_text(t.get(k),f'{path}:{lang}:{k}')
   if t.get('author'):required_text(t['author'],f'{path}:author')
   if not isinstance(t.get('sections'),list) or not t['sections']: raise ValueError(f'{path}: sections required')
   for s in t['sections']:
    required_text(s.get('heading'),f'{path}:heading')
    if not isinstance(s.get('paragraphs'),list) or not s['paragraphs']:raise ValueError(f'{path}: paragraphs required')
    for paragraph in s['paragraphs']:required_text(paragraph,f'{path}:paragraph')
  posts.append(p)
 return sorted(posts,key=lambda p:(p.get('order',100),p['slug']))

def meta(post,t,lang):
 c=COPY[lang]; values=[f'<span>{h(t.get("author") or post.get("editorial_team",{}).get(lang) or c["author"])}</span>']
 for key,label in [('date',c['date']),('updated',c['updated'])]:
  if post.get(key): values.append(f'<span>{label} <time datetime="{h(post[key])}">{h(post[key])}</time></span>')
 return '<div class="b-meta">'+''.join(values)+'</div>'

def page(template,main,title,summary,url,lang,alternate,kind='website',schema=None,image=None):
 if not re.search(r'<main\b[^>]*>.*?</main>',template,re.S):raise ValueError('Template has no main')
 p=re.sub(r'(<main\b[^>]*>).*?(</main>)',lambda m:m[1]+main+m[2],template,count=1,flags=re.S)
 p=re.sub(r'(<body\b[^>]*class=")[^"]*',r'\1a-site b-site',p,count=1)
 p=re.sub(r'<title>.*?</title>',f'<title>{h(title)} — ARAD Networks</title>',p,count=1)
 for prop,value in [('description',summary),('og:title',title+' — ARAD Networks'),('og:description',summary),('og:type',kind)]:
  p=re.sub(r'(<meta (?:name|property)="'+re.escape(prop)+r'" content=")[^"]*(")',lambda m:m[1]+h(value)+m[2],p,count=1)
 p=re.sub(r'<link rel="(?:canonical|alternate)"[^>]*>','',p)
 p=re.sub(r'<script type="application/ld\+json"[^>]*>.*?</script>','',p,flags=re.S)
 p=re.sub(r'<(?:link|script)\b[^>]*(?:blog\.css|blog\.js)[^>]*>(?:</script>)?','',p)
 p=re.sub(r'<meta property="og:(?:url|image)"[^>]*>','',p)
 other='en' if lang=='ko' else 'ko'
 p=re.sub(r'(<a\b[^>]*href=")[^"]*(" lang="'+other+r'")',lambda m:m[1]+'../'+alternate+m[2],p)
 feed='feed.xml' if lang=='ko' else 'feed-en.xml'
 extra=f'<link rel="stylesheet" href="../blog.css?v=40"><script src="../blog.js?v=40" defer></script><link rel="canonical" href="{h(url)}"><meta property="og:url" content="{h(url)}"><link rel="alternate" hreflang="{other}" href="{BASE+alternate}"><link rel="alternate" type="application/rss+xml" title="ARAD Insights" href="../insights/{feed}">'
 if image:extra+=f'<meta property="og:image" content="{BASE+h(image)}">'
 if schema:extra+='<script type="application/ld+json" data-arad-blog>'+json.dumps(schema,ensure_ascii=False).replace('<','\\u003c')+'</script>'
 return p.replace('</head>',extra+'</head>')

def article_content(p,t,lang):
 c=COPY[lang]
 sections=''.join(f'<section id="section-{i+1}"><h2>{h(s["heading"])}</h2>'+''.join('<p>'+h(v)+'</p>' for v in s['paragraphs'])+'</section>' for i,s in enumerate(t['sections']))
 return sections

def story(p,lang,featured=False,compact=False):
 t=p['translations'][lang];c=COPY[lang]
 searchable=' '.join([t['title'],t['summary'],CATEGORIES[p['category']]]+[s['heading']+' '+' '.join(s['paragraphs']) for s in t['sections']])
 return f'''<article class="b-story{' b-featured' if featured else ''}{' b-compact' if compact else ''}" data-blog-card data-category="{p['category']}" data-search="{h(searchable)}"><a class="b-story-link" href="../{route(lang,p['slug'])}"><div class="b-story-photo"><img src="../{h(p['image'])}" width="1600" height="1067" alt="{h(t['image_alt'])}" loading="{'eager' if featured else 'lazy'}"></div><div class="b-story-copy"><p class="b-topic">{CATEGORIES[p['category']]}</p><h2>{h(t['title'])}</h2><p class="b-summary">{h(t['summary'])}</p>{meta(p,t,lang)}<span class="b-read">{c['read']}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span></div></a></article>'''

def listing(posts,lang):
 c=COPY[lang];feed='feed.xml' if lang=='ko' else 'feed-en.xml'
 filters=''.join(f'<button type="button" data-blog-filter="{key}" aria-pressed="false">{name}</button>' for key,name in CATEGORIES.items())
 return f'''<div class="b-journal"><header class="b-masthead b-shell"><p class="b-wordmark">Insights</p><div class="b-introduction"><h1>{c['title']}</h1><p>{c['lead']}</p></div></header><section class="b-archive b-shell" aria-label="Insights"><div class="b-tools"><div class="b-filters" role="group" aria-label="{c['filter']}"><button type="button" data-blog-filter="all" aria-pressed="true">{c['all']}</button>{filters}</div><label class="b-search"><span class="sr-only">{c['search']}</span><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><input type="search" data-blog-search placeholder="{c['placeholder']}" autocomplete="off"></label></div><div class="b-result-line"><p data-blog-status role="status" aria-live="polite">{len(posts)}{c['count']}</p><a href="../insights/{feed}">{c['rss']}</a></div><div class="b-stories">{''.join(story(p,lang,i==0) for i,p in enumerate(posts))}</div><div class="b-empty" data-blog-empty hidden><p>{c['empty']}</p><button type="button" data-blog-reset>{c['clear']}</button></div><footer class="b-journal-end"><span>ARAD Networks</span><a href="../{manage_route(lang)}">{c['manage']}</a></footer></section></div>'''

def article(p,lang,available):
 t=p['translations'][lang];c=COPY[lang]
 contents=''.join(f'<a href="#section-{i+1}">{h(s["heading"])}</a>' for i,s in enumerate(t['sections']))
 related=[q for q in available if q['slug']!=p['slug']][:2]
 return f'''<article class="b-article"><header class="b-article-head b-shell"><a class="b-back" href="../{route(lang)}">{c['back']}</a><p class="b-topic">{CATEGORIES[p['category']]} <span>{c['type']}</span></p><h1>{h(t['title'])}</h1><p class="b-deck">{h(t['summary'])}</p>{meta(p,t,lang)}</header><figure class="b-article-photo b-shell"><img src="../{h(p['image'])}" alt="{h(t['image_alt'])}" width="1600" height="1067" fetchpriority="high"><figcaption>{h(p.get('image_credit',{}).get(lang) or c['credit'])} <a href="../licenses/photography.txt">{'사진 출처' if lang=='ko' else 'Photo credits'}</a></figcaption></figure><div class="b-reading-layout b-shell"><aside class="b-toc"><nav aria-label="{c['contents']}"><p>{c['contents']}</p>{contents}</nav></aside><div class="b-prose">{article_content(p,t,lang)}<aside class="b-business"><p>{c['explore']}</p><a href="../{'pages' if lang=='ko' else 'en'}/{p['category']}.html">{CATEGORIES[p['category']]}</a></aside><div class="b-reading-actions"><a href="../{route(lang)}">{c['back']}</a><button type="button" data-copy-article data-copy-label="{c['copy']}" data-copied-label="{c['copied']}">{c['copy']}</button></div><p class="sr-only" data-copy-status role="status" aria-live="polite"></p></div></div></article><section class="b-related b-shell" aria-label="{c['related']}"><h2>{c['related']}</h2><div class="b-related-grid">{''.join(story(q,lang,compact=True) for q in related)}</div></section>'''

def template_post():
 return {'slug':'new-article','category':'isolate','order':10,'published':False,'image':'assets/photography/rack-front.jpg','translations':{'ko':{'title':'새 글 제목','summary':'이 글에서 다룰 내용을 한 문장으로 적어주세요.','image_alt':'사진에 담긴 내용을 설명해주세요.','sections':[{'heading':'소제목','paragraphs':['검토한 본문을 여기에 적어주세요.']}]}}}

def management(posts,lang):
 c=COPY[lang];ko=lang=='ko'
 new_url=REPO+'/new/main/content/insights?filename=new-article.json&value='+quote(json.dumps(template_post(),ensure_ascii=False,indent=2))
 if ko:
  title='인사이트를 쓰고, 함께 관리합니다.';lead='연구소와 영업에서 기술과 현장의 이야기를 이어가는 공간입니다. 원고는 GitHub에서 수정하고 검토한 뒤 게시합니다.'
  steps=[('원고 작성','기존 글을 수정하거나 새 원고를 만드세요. 제목·요약·소제목·문단을 입력하고, 실제로 확인한 내용과 사용 권한이 있는 사진을 담습니다.'),('내용 검토','초안은 published: false로 보관합니다. 담당자의 검토를 마친 뒤 true로 바꾸고 커밋하거나 Pull Request로 검토를 요청하세요.'),('게시 확인','기본 브랜치에 반영하면 목록·글·RSS가 함께 생성됩니다. GitHub Actions의 배포가 성공한 뒤 PC와 모바일에서 내용을 확인하세요.')]
  access='편집에는 해당 GitHub 저장소의 쓰기 권한이 필요합니다. 이 페이지는 별도 CMS나 로그인 서비스가 아니며, 연구소·영업의 접근 권한은 저장소 소유자가 관리합니다.'
  existing='기존 원고';new='새 글 작성';folder='전체 원고 폴더';fields='작성 규칙';rules=['파일명과 slug는 같은 영문 소문자·숫자·하이픈으로 만듭니다. 예: network-operations.json / network-operations.','category는 isolate, accelerate, connect 중에서 선택합니다.','translations.ko에 한국어, translations.en에 영어 원고를 넣습니다. 번역이 없으면 해당 언어는 생략합니다.','date·updated·author는 확인된 실제 게시일·수정일·작성자가 있을 때만 입력합니다. 기존 글에는 임의 날짜를 붙이지 않습니다.','새 이미지는 site/assets 아래에 올리고 image에 해당 경로를 입력합니다. 사진 출처와 사용 권한을 확인하세요.','글을 내릴 때는 published를 false로 변경합니다. 원고는 보관되고 공개 목록·글·RSS에서 제외됩니다.']
  machine='읽을 수 있는 본문';machine_text='개별 글은 자바스크립트 없이도 읽히는 HTML로 게시되며, 전체 본문 RSS와 글의 구조화 데이터를 제공합니다. 현재 검토 사이트의 noindex 설정은 유지됩니다. 검색엔진이나 AI 서비스의 수집·노출을 보장하지 않으며, 정식 공개 때 색인 정책을 별도로 정해야 합니다.'
 else:
  title='Write, review, and share.';lead='A shared editorial space for research and sales. Edit the source in GitHub, review the content, and publish it to the journal.'
  steps=[('Write a draft','Edit an existing article or create a source file. Add a title, summary, headings and paragraphs using verified information and licensed images.'),('Review the content','Keep published: false while drafting. After review, set it to true and commit the change, or open a Pull Request for review.'),('Check publication','Changes on the default branch rebuild the list, articles and RSS. After a successful GitHub Actions deployment, check the result on desktop and mobile.')]
  access='Editing requires write access to this GitHub repository. This page is a guide, not a separate CMS or login service. The repository owner manages research and sales access.'
  existing='Existing sources';new='Create an article';folder='All source files';fields='Authoring rules';rules=['Match the filename and slug using lowercase letters, numbers and hyphens: network-operations.json / network-operations.','Choose isolate, accelerate or connect for category.','Use translations.ko for Korean and translations.en for English. Omit a language if a translation is not available.','Add date, updated and author only when the real publication date, revision date and author are known.','Upload licensed images under site/assets and set image to the matching path. Check image rights and credit.','Set published to false to remove an article from public pages and RSS while retaining its source.']
  machine='Readable, accessible content';machine_text='Articles are complete HTML that can be read without JavaScript. Full-text RSS and structured article metadata are included. This review site retains noindex. Search-engine or AI-service indexing is not guaranteed; decide the indexing policy before the official launch.'
 links=''.join(f'<li><div><span>{CATEGORIES[p["category"]]}</span><h3>{h(p["translations"].get(lang,p["translations"].get("ko",next(iter(p["translations"].values()))))["title"])}</h3></div><a href="{REPO}/edit/main/content/insights/{p["slug"]}.json" target="_blank" rel="noopener noreferrer">{c["edit"]}</a></li>' for p in posts)
 return f'''<div class="b-management b-shell"><a class="b-back" href="../{route(lang)}">{c['back']}</a><p class="b-topic">{c['management']}</p><h1>{title}</h1><p class="b-deck">{lead}</p><p class="b-access">{access}</p><div class="b-management-actions"><a class="b-primary" href="{h(new_url)}" target="_blank" rel="noopener noreferrer">{new}</a><a href="{REPO}/tree/main/content/insights" target="_blank" rel="noopener noreferrer">{folder}</a></div><ol class="b-workflow">{''.join(f'<li><h2>{heading}</h2><p>{body}</p></li>' for heading,body in steps)}</ol><section class="b-source-list"><h2>{existing}</h2><ul>{links}</ul></section><section class="b-rules"><h2>{fields}</h2><ul>{''.join('<li>'+h(x)+'</li>' for x in rules)}</ul><a href="{REPO}/blob/main/EDITORIAL-GUIDE.md" target="_blank" rel="noopener noreferrer">{'상세 운영 안내' if ko else 'Full editorial guide'}</a></section><section class="b-rules"><h2>{machine}</h2><p>{machine_text}</p><a href="{REPO}/actions/workflows/pages.yml" target="_blank" rel="noopener noreferrer">GitHub Actions</a></section></div>'''

def feed(posts,lang):
 ET.register_namespace('content','http://purl.org/rss/1.0/modules/content/')
 ET.register_namespace('atom','http://www.w3.org/2005/Atom')
 rss=ET.Element('rss',{'version':'2.0'}); ch=ET.SubElement(rss,'channel')
 name='feed.xml' if lang=='ko' else 'feed-en.xml'
 for k,v in [('title','ARAD Networks Insights'),('link',BASE+route(lang)),('description',COPY[lang]['lead']),('language',lang)]:ET.SubElement(ch,k).text=v
 ET.SubElement(ch,'{http://www.w3.org/2005/Atom}link',{'href':BASE+'insights/'+name,'rel':'self','type':'application/rss+xml'})
 for p in posts:
  t=p['translations'][lang];url=BASE+route(lang,p['slug']); item=ET.SubElement(ch,'item')
  for k,v in [('title',t['title']),('link',url),('guid',url),('description',t['summary']),('category',CATEGORIES[p['category']])]:ET.SubElement(item,k).text=v
  ET.SubElement(item,'{http://purl.org/rss/1.0/modules/content/}encoded').text=article_content(p,t,lang)
  if p.get('date'):ET.SubElement(item,'pubDate').text=email.utils.format_datetime(dt.datetime.combine(dt.date.fromisoformat(p['date']),dt.time(),dt.timezone.utc))
 ET.indent(rss);return ET.tostring(rss,encoding='unicode',xml_declaration=True)

def main():
 ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--root',type=Path,default=Path.cwd());ap.add_argument('--site',type=Path);ap.add_argument('--content',type=Path);a=ap.parse_args()
 root=a.root.resolve();site=a.site.resolve() if a.site else root/'site'
 posts=read_posts(a.content.resolve() if a.content else root/'content/insights',site)
 templates={lang:(site/route(lang)).read_text(encoding='utf-8') for lang in COPY}
 for template in templates.values():
  if 'noindex' not in template or '<main' not in template or '</main>' not in template:raise ValueError('Expected current preview HTML with main and noindex')
 output={};remove=[]
 for lang,c in COPY.items():
  other='en' if lang=='ko' else 'ko';available=[p for p in posts if p['published'] and lang in p['translations']]
  output[route(lang)]=page(templates[lang],listing(available,lang),'Insights',c['lead'],BASE+route(lang),lang,route(other),schema={'@context':'https://schema.org','@type':'Blog','name':'ARAD Insights','url':BASE+route(lang),'inLanguage':lang,'blogPost':[{'@type':'BlogPosting','headline':p['translations'][lang]['title'],'url':BASE+route(lang,p['slug'])} for p in available]})
  for p in posts:
   path=route(lang,p['slug'])
   if p not in available:
    if (site/path).is_file() and 'data-arad-blog' in (site/path).read_text():remove.append(path)
    continue
   t=p['translations'][lang];url=BASE+path
   schema={'@context':'https://schema.org','@type':'BlogPosting','headline':t['title'],'description':t['summary'],'inLanguage':lang,'url':url,'mainEntityOfPage':{'@type':'WebPage','@id':url},'image':BASE+p['image'],'articleSection':CATEGORIES[p['category']],'articleBody':'\n\n'.join(s['heading']+'\n'+'\n'.join(s['paragraphs']) for s in t['sections']),'publisher':{'@type':'Organization','name':'ARAD Networks','url':BASE,'logo':{'@type':'ImageObject','url':BASE+'assets/arad-networks-logo.svg'}},'author':{'@type':'Person' if t.get('author') else 'Organization','name':t.get('author') or 'ARAD Networks'}}
   if p.get('date'):schema['datePublished']=p['date']
   if p.get('updated'):schema['dateModified']=p['updated']
   output[path]=page(templates[lang],article(p,lang,available),t['title'],t['summary'],url,lang,route(other,p['slug']) if other in p['translations'] else route(other),'article',schema,p['image'])
  path=manage_route(lang)
  output[path]=page(templates[lang],management(posts,lang),c['management'],c['lead'],BASE+path,lang,manage_route(other))
  output['insights/'+('feed.xml' if lang=='ko' else 'feed-en.xml')]=feed(available,lang)
 # Everything above is pure validation/rendering. No partial public output on malformed content.
 for rel,body in output.items():
  target=site/rel;target.parent.mkdir(parents=True,exist_ok=True);target.write_text(body,encoding='utf-8')
 for rel in remove:(site/rel).unlink()
 print(json.dumps({'published':sum(p['published'] for p in posts),'files':list(output),'removed':remove},ensure_ascii=False))
if __name__=='__main__':main()
