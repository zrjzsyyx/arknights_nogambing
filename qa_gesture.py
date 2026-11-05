"""Exercise physical pointer gestures at desktop, high DPI and phone sizes."""
import json
from playwright.sync_api import sync_playwright
errors=[]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--enable-unsafe-swiftshader'])
 for width,height,touch,dpr in [(1920,1080,False,2),(390,844,True,3),(844,390,True,2)]:
  context=browser.new_context(viewport={'width':width,'height':height},device_scale_factor=dpr,is_mobile=touch,has_touch=touch)
  page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto('http://127.0.0.1:4173',wait_until='networkidle');page.wait_for_selector('#original-bag[data-ready=true]',state='attached')
  for name in ['char_01','char_02','bg']:
   image=page.locator('.original-ui-node[data-name="'+name+'"]>img').first
   assert image.evaluate('(e)=>Math.abs(e.width/e.height-e.naturalWidth/e.naturalHeight)<.01')
  page.get_by_role('button',name='寻访十次',exact=True).click();page.wait_for_selector('#original-bag[data-interactive=true]',state='attached')
  def handle():
   r=page.locator('#zipper-pull').bounding_box();return r['x']+r['width']/2,r['y']+r['height']/2
  session=context.new_cdp_session(page) if touch else None
  def down(x,y):
   if touch:session.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
   else:page.mouse.move(x,y);page.mouse.down()
  def move(x,y):
   if touch:session.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x,'y':y}]})
   else:page.mouse.move(x,y,steps=5)
  def up(cancel=False):
   if touch:session.send('Input.dispatchTouchEvent',{'type':'touchCancel' if cancel else 'touchEnd','touchPoints':[]})
   elif cancel:page.locator('#bag-stage').dispatch_event('pointercancel',{'pointerId':1})
   else:page.mouse.up()
  x,y=handle();assert x>width*.7
  down(x,y);move(min(width-5,x+width*.08),y);up();assert page.locator('#bag-stage').is_visible()
  x,y=handle();down(x,y);move(x-width*.15,y+height*.02);up(cancel=True);page.wait_for_timeout(100)
  reset_x,reset_y=handle();assert abs(reset_x-x)<20
  # The second gesture starts inside the expanded touch target and can leave it.
  down(reset_x-15,reset_y+20);move(reset_x-width*.15,reset_y+height*.03);up();page.wait_for_timeout(100)
  partial_x,partial_y=handle();assert partial_x<reset_x-width*.08
  down(partial_x,partial_y)
  target_x=width*.08;target_y=min(height-80,partial_y+height*.15)
  for i in range(1,13):move(partial_x+(target_x-partial_x)*i/12,partial_y+(target_y-partial_y)*i/12)
  up();page.locator('#reveal-stage').wait_for(state='visible',timeout=10000)
  page.locator('#skip-animation').click();page.wait_for_timeout(1000)
  page.screenshot(path='qa/gesture-results-'+str(width)+'.png')
  assert page.locator('.result-card').count()==10
  if touch and width<height:
   page.locator('#results-stage').evaluate('(e)=>e.scrollLeft=e.scrollWidth');page.locator('.result-card').last.click();assert page.locator('#reveal-stage').is_visible()
  context.close()
 print(json.dumps({'passed':not errors,'pageErrors':errors,'gestures':['reverse','cancel','partial-release-resume','mouse','touch'],'viewports':['1920x1080@2','390x844@3','844x390@2']}));assert not errors
 browser.close()
