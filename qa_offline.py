"""Exercise a real file:// release, offline, with browser security left enabled.

Optional QA dependency: Python playwright + its Chromium browser.
Usage: python qa_offline.py [extracted-project-folder]
"""
import base64,hashlib,json,pathlib,sys
from playwright.sync_api import sync_playwright

SOURCE=pathlib.Path(__file__).resolve().parent
PROJECT=pathlib.Path(sys.argv[1]).resolve() if len(sys.argv)>1 else SOURCE
OUT=SOURCE/'qa';OUT.mkdir(exist_ok=True)
voices=json.loads((PROJECT/'dist/voices.json').read_text(encoding='utf-8'))
errors=[];failures=[];external=[];checks=[]
instrument="""window.qaSources=[];const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){window.qaMusic=this;return play.call(this)};const begin=AudioBufferSourceNode.prototype.start,end=AudioBufferSourceNode.prototype.stop;AudioBufferSourceNode.prototype.start=function(...a){this.qaEntry={duration:this.buffer?.duration||0,loop:this.loop,stopped:false};window.qaSources.push(this.qaEntry);return begin.apply(this,a)};AudioBufferSourceNode.prototype.stop=function(...a){if(this.qaEntry)this.qaEntry.stopped=true;return end.apply(this,a)};"""

def seed(page,selector,value):
 page.locator(selector).evaluate("(e)=>e.addEventListener('click',()=>{let s="+str(value)+";Math.random=()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296)},{capture:true,once:true})")

def loaded(page):
 page.wait_for_selector('#original-bag[data-ready=true]',state='attached',timeout=45000)
 page.get_by_role('button',name='寻访十次',exact=True).wait_for()
 assert page.locator('[data-name^=btn_view_char]').count()==0
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')

def screenshot(page,name):
 page.evaluate("async()=>{await document.fonts.ready;await Promise.all([...document.images].filter(e=>e.offsetWidth||e.offsetHeight).map(e=>e.decode().catch(()=>{})))}")
 page.screenshot(path=str(OUT/f'offline-{name}.png'))

with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--enable-unsafe-swiftshader'])
 for width,height in [(1440,900),(390,844),(844,390)]:
  context=browser.new_context(viewport={'width':width,'height':height},is_mobile=width<900,has_touch=width<900,offline=True)
  page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('requestfailed',lambda r:failures.append({'url':r.url,'failure':r.failure}))
  page.on('request',lambda r:external.append(r.url) if r.url.startswith(('http:','https:')) else None)
  page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
  page.add_init_script(instrument)
  page.goto((PROJECT/'index.html').as_uri(),wait_until='networkidle');loaded(page)
  assert page.url.startswith('file:') and page.url.endswith('/dist/index.html')
  screenshot(page,f'{width}-home')
  if width==844:
   checks.append('landscape offline home');context.close();continue
  page.locator('#audio-toggle').click();page.wait_for_function('window.qaMusic?.currentTime>.2')
  assert page.evaluate('window.qaMusic.src.startsWith("data:audio/mpeg;base64,")')
  intro=base64.b64decode(page.evaluate('window.qaMusic.src.split(",")[1]'))
  assert hashlib.sha256(intro).digest()==hashlib.sha256((PROJECT/'dist/assets/official/music/intro.mp3').read_bytes()).digest()
  if width==1440:
   page.wait_for_function('Number.isFinite(window.qaMusic.duration)')
   page.evaluate('window.qaMusic.currentTime=window.qaMusic.duration-.15')
   page.wait_for_function('window.qaMusic.loop && window.qaMusic.currentTime>.1')
   loop=base64.b64decode(page.evaluate('window.qaMusic.src.split(",")[1]'))
   assert hashlib.sha256(loop).digest()==hashlib.sha256((PROJECT/'dist/assets/official/music/loop.mp3').read_bytes()).digest()
   checks.append('original BGM intro to loop')
  seed(page,'#draw-one',5)
  page.get_by_role('button',name='寻访一次',exact=True).click()
  page.wait_for_selector('#original-bag[data-interactive=true]',state='attached')
  assert page.evaluate('window.qaMusic.paused')
  if width==1440:
   r=page.locator('#zipper-pull').bounding_box();x=r['x']+r['width']/2;y=r['y']+r['height']/2
   page.mouse.move(x,y);page.mouse.down();page.mouse.move(x-350,y+65,steps=18);page.mouse.up();page.wait_for_timeout(100)
   assert .1<float(page.locator('#original-bag').get_attribute('data-progress'))<.8
   screenshot(page,'1440-half')
  page.locator('#open-direct').click()
  page.wait_for_selector('#reveal-stage[data-voice=playing]')
  assert page.locator('#reveal-name').inner_text()=='泡泡'
  assert page.locator('#reveal-stage').get_attribute('data-language')=='ja'
  duration=voices['char_381_bubble']['duration']
  assert page.evaluate('(d)=>window.qaSources.some(s=>Math.abs(s.duration-d)<.1)',duration)
  page.wait_for_timeout(1800)
  assert len(page.locator('#reveal-subtitle').inner_text())>=min(50,len(voices['char_381_bubble']['text']))
  assert page.locator('#reveal-art').evaluate('(e)=>e.complete&&e.naturalWidth>100')
  screenshot(page,f'{width}-reveal')
  page.locator('#reveal-voice').click();page.wait_for_selector('#reveal-stage[data-voice=playing]')
  page.locator('#reveal-next').click()
  assert page.locator('#experience').is_hidden()
  assert page.evaluate('(d)=>window.qaSources.filter(s=>Math.abs(s.duration-d)<.1).every(s=>s.stopped)',duration)
  page.wait_for_function('!window.qaMusic.paused')
  seed(page,'#draw-ten',1)
  page.get_by_role('button',name='寻访十次',exact=True).click();page.locator('#skip-animation').click()
  page.wait_for_timeout(1400)
  assert page.locator('.result-card').count()==10
  assert page.locator('.result-card[data-rarity="5"]').count()>0
  assert page.locator('.result-card[data-rarity="6"]').count()>0
  assert page.locator('.result-portrait img').evaluate_all('(els)=>els.every(e=>e.complete&&e.naturalHeight>=300)')
  screenshot(page,f'{width}-results')
  page.locator('.result-card[data-rarity="6"]').first.click();page.wait_for_selector('#reveal-stage[data-voice=playing]')
  assert page.locator('#reveal-stars img').count()==6
  assert page.locator('#reveal-stage').get_attribute('data-language')=='ja'
  page.locator('#reveal-next').click();assert page.locator('#results-stage').is_visible()
  page.locator('#result-close').click()
  assert len(page.evaluate('window.qaSources'))>=10
  page.reload(wait_until='networkidle');loaded(page)
  assert page.locator('#stat-total').inner_text()=='011'
  page.locator('[data-page=history]').click();assert page.locator('.history-table tbody tr').count()==11
  page.locator('[data-page=collection]').click();page.locator('.archive-card').first.click();page.locator('#modal-close').click();page.locator('[data-page=home]').click()
  page.locator('#settings-button').click();page.locator('#quick-mode').check();page.locator('#modal-close').click()
  page.get_by_role('button',name='寻访一次',exact=True).click();page.wait_for_selector('#reveal-stage[data-voice=playing]');page.locator('#reveal-next').click()
  assert page.locator('#stat-total').inner_text()=='012'
  checks.append(f'{width}x{height}: offline 3D, sounds, Japanese voice, replay/stop, single/ten, high rarities, storage, history, settings')
  context.close()
 browser.close()
report={'passed':not errors and not failures and not external,'project':str(PROJECT),'pageErrors':errors,'failedRequests':failures,'externalRequests':external,'checks':checks}
(OUT/'offline-browser-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=True))
assert report['passed']
