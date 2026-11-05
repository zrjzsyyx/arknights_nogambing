"""Check native recruitment layout, Japanese voice lifecycle and bone scrubbing."""
import json,pathlib
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).parent;voices=json.loads((ROOT/'dist/voices.json').read_text(encoding='utf-8'));errors=[];missing=[]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--enable-unsafe-swiftshader'])
 for width,height in [(1440,900),(854,388),(390,844)]:
  context=browser.new_context(viewport={'width':width,'height':height},has_touch=width<900,is_mobile=width<900)
  page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.on('response',lambda r:missing.append(r.url) if r.status>=400 and '/assets/' in r.url else None)
  page.add_init_script('''window.voiceLike=new Set();window.audioDurations=[];const begin=AudioBufferSourceNode.prototype.start,stop=AudioBufferSourceNode.prototype.stop;AudioBufferSourceNode.prototype.start=function(...a){window.audioDurations.push(this.buffer?.duration||0);if(this.buffer?.duration>7)window.voiceLike.add(this);return begin.apply(this,a)};AudioBufferSourceNode.prototype.stop=function(...a){window.voiceLike.delete(this);return stop.apply(this,a)};''')
  page.goto('http://127.0.0.1:4173',wait_until='networkidle');page.wait_for_selector('#original-bag[data-ready=true]',state='attached')
  # Reset the random stream immediately at the hidden action, before drawing.
  page.evaluate('''document.querySelector('#draw-one').addEventListener('click',()=>{let s=5;Math.random=()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296)},{capture:true})''')
  page.get_by_role('button',name='寻访一次',exact=True).click();page.locator('#skip-animation').click();page.wait_for_selector('#reveal-stage[data-voice=playing]')
  assert page.locator('#reveal-name').inner_text()=='泡泡';assert page.locator('#reveal-stars img').count()==4
  assert page.locator('#reveal-stage').get_attribute('data-language')=='ja'
  expected=voices['char_381_bubble']['duration'];assert page.evaluate('(expected)=>window.audioDurations.some(d=>Math.abs(d-expected)<.1)',expected)
  page.wait_for_timeout(1800);assert len(page.locator('#reveal-subtitle').inner_text())>=min(50,len(voices['char_381_bubble']['text']))
  page.wait_for_timeout(1400);assert page.locator('#reveal-subtitle').inner_text()==voices['char_381_bubble']['text']
  assert page.locator('#reveal-faction').get_attribute('src').endswith('camp_sargon.webp')
  page.screenshot(path=str(ROOT/'qa'/f'native-reveal-{width}.png'))
  page.locator('#reveal-next').click();assert page.locator('#experience').is_hidden();assert page.evaluate('window.voiceLike.size===0')
  page.get_by_role('button',name='寻访十次',exact=True).click();page.wait_for_selector('#original-bag[data-interactive=true]',state='attached');r=page.locator('#zipper-pull').bounding_box();x=r['x']+r['width']/2;y=r['y']+r['height']/2
  page.mouse.move(x,y);page.mouse.down();page.mouse.move(x-width*.25,y+height*.04,steps=18);page.mouse.up();page.wait_for_timeout(100)
  progress=float(page.locator('#original-bag').get_attribute('data-progress'));assert .1<progress<.8
  page.screenshot(path=str(ROOT/'qa'/f'native-half-{width}.png'))
  page.locator('#open-direct').click();page.wait_for_selector('#reveal-stage[data-voice=playing]');first=page.locator('#reveal-stage').get_attribute('data-operator');page.locator('#reveal-next').click();page.wait_for_selector('#reveal-stage[data-voice=playing]');assert page.evaluate('window.voiceLike.size<=1')
  page.locator('#skip-animation').click();page.wait_for_timeout(2000);assert page.evaluate('window.voiceLike.size===0');assert page.locator('.result-card').count()==10
  page.screenshot(path=str(ROOT/'qa'/f'native-results-{width}.png'))
  assert page.locator('.result-beam').count()==10;assert page.locator('.card-stars img').evaluate_all('(els)=>els.every(e=>e.complete&&e.naturalWidth>30)')
  if width==1440:
   # Inspect a genuine skinned mesh: the old implementation only moved the zipper.
   check=page.evaluate('''async()=>{const {OfficialBag}=await import('/official-bag.js'),T=await import('/vendor/three.module.js');const c=document.createElement('div');Object.assign(c.style,{position:'fixed',width:'320px',height:'180px'});document.body.append(c);const b=new OfficialBag(c);await b.promise;b.apply('gacha_bag_start',2.08334);b.render();const mesh=b.meshes.find(m=>m.name==='S_Bag_body_01'),indices=Array.from({length:100},(_,i)=>Math.floor(i*mesh.geometry.attributes.position.count/100)),before=indices.map(i=>mesh.getVertexPosition(i,new T.Vector3()).clone());b.setProgress(.5);b.render();const delta=Math.max(...indices.map((i,j)=>mesh.getVertexPosition(i,new T.Vector3()).distanceTo(before[j])));b.start(3);b.stop();const reset=b.zipper.position.distanceTo(b.zipStart)<1e-6;b.renderer.dispose();b.renderer.forceContextLoss();c.remove();return{delta,reset};}''')
   assert check['delta']>.01 and check['reset'],check
  page.locator('#result-close').click();context.close()
 print(json.dumps({'passed':not errors and not missing,'pageErrors':errors,'missingAssets':missing,'viewports':['1440x900','854x388','390x844'],'checks':['Japanese decoded voice','Chinese GACHA subtitles','voice stops on next/skip/close','native single and ten reveals','half-open bone deformation','native result textures']}));assert not errors and not missing
 browser.close()
