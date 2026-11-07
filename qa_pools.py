"""Browser checks for pool selection, independent saves, media and file:// use.

Requires the same optional Python Playwright/Chromium used by qa_offline.py.
Run after npm run build. Uses the real release with browser security enabled.
"""
import json, pathlib
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent
QA = ROOT / 'qa'
QA.mkdir(exist_ok=True)
POOLS = [
    ('LIMITED_79_0_1', '将雪投火', '塔露拉'),
    ('LIMITED_70_0_1', '劫尽古今', '望'),
    ('LIMITED_73_0_1', '承诺', '凯尔希·思衡托'),
    ('LIMITED_76_0_1', '车辙与风的归所', '予愿安洁莉娜'),
    ('LINKAGE_54_0_1', '泰拉饭，呜呼，泰拉饭', '玛露西尔'),
]
SAVE = 'rhodes-headhunt-snowfire-v2'
errors, missing, external, checks = [], [], [], []
instrument = """window.qaVoices=[];const start=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(...args){if(this.buffer)window.qaVoices.push(this.buffer.duration);return start.apply(this,args)};"""

def snapshot(page, name):
    page.evaluate("async()=>{await document.fonts.ready;await Promise.all([...document.images].filter(e=>e.offsetWidth||e.offsetHeight).map(e=>e.decode().catch(()=>{})))}")
    assert page.locator('img:visible').evaluate_all('(images)=>images.every(i=>i.complete&&i.naturalWidth>0)')
    page.screenshot(path=str(QA / (name + '.png')))

def saved(page):
    return page.evaluate('(key)=>JSON.parse(localStorage.getItem(key))', SAVE)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--enable-unsafe-swiftshader'])
    for width, height in [(1440, 900), (390, 844), (844, 390), (1920, 1080)]:
        context = browser.new_context(viewport={'width':width, 'height':height}, is_mobile=width<900, has_touch=width<900, offline=True)
        page = context.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('requestfailed', lambda r: missing.append({'url':r.url, 'error':r.failure}))
        page.on('console', lambda m: errors.append(m.text) if m.type=='error' else None)
        page.on('request', lambda r: external.append(r.url) if r.url.startswith(('http:', 'https:')) else None)
        page.add_init_script(instrument)
        page.goto((ROOT / 'index.html').as_uri(), wait_until='networkidle')
        page.wait_for_selector('#original-bag[data-ready=true]', state='attached', timeout=45000)
        page.wait_for_selector('.pool-option:not(:disabled)')
        assert page.locator('.pool-option').count()==5
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        snapshot(page, f'pools-{width}-home')
        page.locator('#settings-button').click()
        page.locator('#quick-mode').check()
        page.locator('#modal-close').click()
        for index, (pid, title, target) in enumerate(POOLS):
            option = page.locator(f'.pool-option[data-pool="{pid}"]')
            option.click()
            assert option.get_attribute('aria-pressed')=='true'
            assert page.locator('.pool-option[aria-pressed=true]').count()==1
            assert page.locator('#pool-current-title').inner_text()==title
            if index:
                assert page.locator('#pool-ui').is_visible()
                assert page.locator('.historical-ui-stage').is_visible()
                assert page.locator('.historical-ui-stage').get_attribute('data-original-md5')
                assert page.locator('.historical-ui-node').count()>40
            else:
                assert page.locator('#game-ui').is_visible()
            assert page.get_by_role('button',name='寻访一次',exact=True).count()==1
            assert page.get_by_role('button',name='寻访十次',exact=True).count()==1
            snapshot(page, f'pools-{width}-{pid.lower()}')
            page.locator('#details-button').click()
            assert page.locator('#modal-title').inner_text()==title+' · 寻访详情'
            if index==4:
                assert '前 120 次必得玛露西尔，仅限一次' in page.locator('#modal-body').inner_text()
                assert page.locator('#claim-reward').count()==0
            else:
                assert page.locator('#claim-reward').is_disabled()
                assert target in page.locator('#claim-reward').inner_text()
            page.locator('#modal-close').click()
            page.evaluate('Math.random=()=>0')
            # Quick ten-pull still traverses the actual engine and result screen.
            page.get_by_role('button',name='寻访十次',exact=True).click()
            page.locator('#results-stage').wait_for(state='visible')
            assert page.locator('.result-card').count()==10
            assert all(item['banner']==pid for item in saved(page)['history'][:10])
            page.locator('#result-cards img').evaluate_all('(images)=>Promise.all(images.map(i=>i.decode()))')
            assert page.locator('.result-portrait img').evaluate_all('(images)=>images.every(i=>i.naturalHeight>300)')
            page.locator('.result-card').first.click()
            assert page.locator('#reveal-name').inner_text()==target
            page.wait_for_function('document.querySelector("#reveal-subtitle").textContent.length>0',timeout=20000)
            assert page.locator('#reveal-faction').evaluate('(image)=>image.complete&&image.naturalWidth>0')
            page.locator('#reveal-next').click()
            page.locator('#result-close').click()
            assert page.locator('#pool-pulls').inner_text()=='10'
            if index in (1,4) and width in (1440,390):
                # Also exercise the real bag and the new pool's normal single pull.
                page.locator('#settings-button').click();page.locator('#quick-mode').uncheck();page.locator('#modal-close').click()
                page.get_by_role('button',name='寻访一次',exact=True).click()
                page.wait_for_selector('#original-bag[data-interactive=true]',state='attached',timeout=15000)
                assert page.locator('.pool-option:enabled').count()==0
                page.locator('#open-direct').click();page.locator('#reveal-stage').wait_for(state='visible')
                assert page.locator('#reveal-name').inner_text()==target
                page.wait_for_function('document.querySelector("#reveal-stage").dataset.voice==="playing"',timeout=20000)
                snapshot(page, f'pools-{width}-{pid.lower()}-reveal')
                page.locator('#reveal-next').click()
                assert page.locator('#pool-pulls').inner_text()=='11'
                page.locator('#settings-button').click();page.locator('#quick-mode').check();page.locator('#modal-close').click()
            checks.append(f'{width}x{height}: {title}, selection/details/ten-pull/reveal')
            print(checks[-1], flush=True)
        before=saved(page)
        page.reload(wait_until='networkidle');page.wait_for_selector('.pool-option:not(:disabled)',timeout=45000)
        page.wait_for_function('''()=>{const selected=document.querySelector('.pool-option.selected').getBoundingClientRect(),list=document.querySelector('.pool-list').getBoundingClientRect();return selected.left>=list.left-1&&selected.right<=list.right+1&&selected.top>=list.top-1&&selected.bottom<=list.bottom+1}''')
        assert page.locator('.pool-option[aria-pressed=true]').get_attribute('data-pool')==POOLS[4][0]
        assert saved(page)==before
        for pid,title,_ in POOLS:
            page.locator(f'.pool-option[data-pool="{pid}"]').click()
            assert page.locator('#pool-pulls').inner_text()==str(before['pools'][pid]['pulls'])
        page.locator('.pool-option.selected').focus();page.keyboard.press('Home')
        assert page.locator('.pool-option').first.evaluate('(e)=>e===document.activeElement')
        page.keyboard.press('Enter');assert page.locator('#pool-current-title').inner_text()=='将雪投火'
        page.locator('[data-page=history]').click()
        assert page.locator('.history-table tbody tr').count()==before['total']
        for _,title,_ in POOLS:
            assert title in page.locator('.history-table').inner_text()
        page.locator('[data-page=collection]').click()
        assert page.locator('.archive-card').count()==5
        checks.append(f'{width}x{height}: all five saves, selection, history and collection restored offline')
        context.close()
    browser.close()
report={'passed':not errors and not missing and not external, 'checks':checks, 'errors':errors, 'missing':missing, 'externalRequests':external}
(QA/'pools-browser-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=True),flush=True)
assert report['passed']
