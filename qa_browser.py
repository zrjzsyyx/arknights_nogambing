import json,pathlib
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).parent;QA=ROOT/'qa';QA.mkdir(exist_ok=True)
errors=[];failures=[]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--enable-unsafe-swiftshader'])
 for mobile in [False,True]:
  context=browser.new_context(viewport={'width':390 if mobile else 1440,'height':844 if mobile else 900},is_mobile=mobile,has_touch=mobile)
  page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('response',lambda r:failures.append(r.url) if r.status>=400 and '/assets/' in r.url else None)
  page.add_init_script('''const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){window.audioElement=this;return play.call(this);};window.sfxStarts=0;const start=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(...a){if(this.buffer?.length)window.sfxStarts++;return start.apply(this,a);};''')
  page.goto('http://127.0.0.1:4173',wait_until='networkidle');page.wait_for_selector('#original-bag[data-ready=true]',state='attached',timeout=40000)
  page.get_by_role('button',name='寻访十次',exact=True).wait_for(state='visible')
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.screenshot(path=str(QA/('official-mobile.png' if mobile else 'official-desktop.png')))
  page.locator('#audio-toggle').click();page.wait_for_function('window.audioElement?.currentTime>.2')
  assert '/assets/official/music/intro.mp3' in page.evaluate('window.audioElement.src')
  page.locator('#details-button').click();assert page.locator('#claim-reward').is_disabled();page.locator('#modal-close').click()
  assert page.locator('[data-name^=btn_view_char]').count()==0
  assert page.get_by_role('button',name='查看塔露拉',exact=True).count()==0
  page.get_by_role('button',name='寻访十次',exact=True).click();page.locator('#experience').wait_for(state='visible');page.wait_for_selector('#original-bag[data-interactive=true]',state='attached')
  assert page.evaluate('window.audioElement.paused')
  assert page.locator('#original-bag canvas').is_visible()
  assert page.locator('#original-bag canvas').evaluate('(e)=>e.width>100&&e.height>100')
  page.screenshot(path=str(QA/('official-mobile-bag.png' if mobile else 'official-desktop-bag.png')))
  if mobile:page.locator('#open-direct').click()
  else:
   pull=page.locator('#zipper-pull').bounding_box();sx=pull['x']+pull['width']/2;sy=pull['y']+pull['height']/2
   # A reverse swipe and a vertical move must not open the bag.
   page.mouse.move(sx,sy);page.mouse.down();page.mouse.move(min(1430,sx+150),sy,steps=8);page.mouse.up();assert page.locator('#bag-stage').is_visible()
   page.mouse.move(sx,sy);page.mouse.down();page.mouse.move(sx,sy+130,steps=8);page.mouse.up();assert page.locator('#bag-stage').is_visible()
   # Start again at the physical pull, release mid-swipe, then resume there.
   pull=page.locator('#zipper-pull').bounding_box();sx=pull['x']+pull['width']/2;sy=pull['y']+pull['height']/2
   page.mouse.move(sx,sy);page.mouse.down();page.mouse.move(sx-270,sy+50,steps=15);page.mouse.up();page.wait_for_timeout(100)
   assert page.locator('#bag-stage').is_visible();pull=page.locator('#zipper-pull').bounding_box();assert pull['x']<sx-200
   page.mouse.move(pull['x']+pull['width']/2,pull['y']+pull['height']/2);page.mouse.down();page.mouse.move(180,430,steps=28);page.mouse.up()
  page.locator('#reveal-stage').wait_for(state='visible');page.wait_for_timeout(1750)
  assert page.evaluate('window.sfxStarts>=4')
  page.screenshot(path=str(QA/('official-mobile-reveal.png' if mobile else 'official-desktop-reveal.png')))
  page.locator('#skip-animation').click();page.wait_for_timeout(1500);assert page.locator('.result-card').count()==10
  cards=page.locator('.result-card');assert cards.first.bounding_box()['height']>300
  assert all(abs(cards.nth(i).bounding_box()['y']-cards.first.bounding_box()['y'])<1 for i in range(10))
  assert page.locator('.result-profession img').count()==10
  assert page.locator('.result-portrait img').evaluate_all('(els)=>els.every(e=>e.complete&&e.naturalHeight>=300)')
  page.screenshot(path=str(QA/('official-mobile-results.png' if mobile else 'official-desktop-results.png')))
  page.locator('.result-card').first.click();page.locator('#reveal-next').click();assert page.locator('#results-stage').is_visible()
  page.locator('#result-close').click();page.wait_for_function('window.audioElement?.paused===false')
  page.reload(wait_until='networkidle');page.get_by_role('button',name='寻访十次',exact=True).wait_for();assert page.locator('#stat-total').inner_text()=='010'
  page.locator('[data-page=history]').click();assert page.locator('.history-table tbody tr').count()==10
  page.locator('[data-page=collection]').click();page.locator('.archive-card').first.click();page.locator('#modal-close').click();page.locator('[data-page=home]').click()
  # Verify six-star audio/visual path without changing the application's RNG.
  page.evaluate('Math.random=()=>0');page.get_by_role('button',name='寻访一次',exact=True).click();page.locator('#experience').wait_for(state='visible');page.wait_for_selector('#original-bag[data-interactive=true]',state='attached');page.locator('#open-direct').click();page.locator('#reveal-stage').wait_for(state='visible');page.wait_for_timeout(1750)
  assert page.locator('#reveal-stars img').count()==6;assert page.locator('#reveal-art').evaluate('(e)=>e.complete&&e.naturalWidth>100')
  page.locator('#reveal-next').click();assert page.locator('#experience').is_hidden()
  page.locator('#settings-button').click();page.locator('#quick-mode').check();page.locator('#modal-close').click();page.get_by_role('button',name='寻访一次',exact=True).click();page.locator('#reveal-stage').wait_for(state='visible');page.locator('#reveal-next').click()
  assert page.locator('#stat-total').inner_text()=='012'
  context.close()
 # Landscape display keeps the original layout and both actions usable.
 context=browser.new_context(viewport={'width':844,'height':390},is_mobile=True,has_touch=True);page=context.new_page();page.goto('http://127.0.0.1:4173',wait_until='networkidle');page.wait_for_selector('#original-bag[data-ready=true]',state='attached',timeout=40000);assert page.get_by_role('button',name='寻访十次',exact=True).is_visible();page.screenshot(path=str(QA/'official-landscape.png'));context.close()
 print(json.dumps({'passed':not errors and not failures,'pageErrors':errors,'missingAssets':failures,'viewports':['1440x900','390x844','844x390']},ensure_ascii=True));assert not errors and not failures
 browser.close()
