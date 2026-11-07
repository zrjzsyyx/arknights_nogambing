"""Sync the five curated pools and original banner/operator artwork from PRTS.

Historical rosters are kept per pool. Existing snowfire data and assets are
retained. Run fetch_result_assets.py and fetch_recruitment_voices.py afterwards.
"""
import concurrent.futures, hashlib, io, json, pathlib, threading
import requests
from bs4 import BeautifulSoup
from PIL import Image
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

ROOT = pathlib.Path(__file__).parent
CACHE = ROOT / 'research'
CACHE.mkdir(exist_ok=True)
DIST = ROOT / 'dist'
LOCAL = threading.local()
TABLE = 'https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData/master/zh_CN/gamedata/excel/'
POOLS = [('LIMITED_70_0_1', '劫尽古今', 'wang'),
         ('LIMITED_73_0_1', '承诺', 'promise'),
         ('LIMITED_76_0_1', '车辙与风的归所', 'summer'),
         ('LINKAGE_54_0_1', '泰拉饭，呜呼，泰拉饭', 'dungeon')]
BANNERS = {
    'wang': 'https://web.hycdn.cn/upload/image/20260205/c6118fc204ca8726865ef5e144b610ac.jpg',
    'promise': 'https://web.hycdn.cn/upload/image/20260424/6234906ca6158ffb655117ff18ef5f28.jpg',
    'summer': 'https://web.hycdn.cn/upload/image/20260724/1c47b33bf91da89f1a4184526be5f51f.jpg',
    'dungeon': 'https://web.hycdn.cn/announce/images/20240827/d56c1f70537a65eda27720899c541345.jpg'
}
UI_FILES = {
    'limited_70_0_1': ['anim_bg1','anim_bg2','bk','c1_char','c2_char','title_1','title_2','title_back','title1_main','title2_main','btn_gacha','btn_10_gacha','name1','name2'],
    'limited_73_0_1': ['anim_bg1','c1_char','c2_char','char_01-sharp','char_02-sharp','title_main','title_main_image','title_bg_circle','btn_gacha','btn_10_gacha','name1','name2'],
    'limited_76_0_1': ['chara_01_dubble','chara_02_dubble','chara_01_solo','chara_02_solor','title','title_bg','title_bg_water','title_windmill','btn_gacha','btn_10_gacha','chara_name_left','chara_name_right']
}
MIRROR = 'https://raw.githubusercontent.com/ArknightsAssets/ArknightsAssets2/cn/assets/dyn/'

def get(url, **kwargs):
    if not hasattr(LOCAL, 'session'):
        LOCAL.session = requests.Session()
        LOCAL.session.mount('https://', HTTPAdapter(max_retries=Retry(total=3, backoff_factor=1)))
    response = LOCAL.session.get(url, timeout=50, **kwargs)
    response.raise_for_status()
    return response

def table(name, url):
    path = CACHE / (name + '-multi.json')
    if not path.exists():
        path.write_bytes(get(url).content)
    return json.loads(path.read_text(encoding='utf-8'))

def save(path, value):
    # Preserve compact checked-in runtime manifests to keep diffs focused.
    indent = None if path.name in ['operators.json', 'reveal-assets.json'] else 2
    path.write_text(json.dumps(value, ensure_ascii=False, indent=indent) + '\n', encoding='utf-8')

def image_file(title, dest, size):
    if dest.exists():
        return
    if dest.name.startswith('char_'):
        char_id = dest.stem
        source = MIRROR + 'arts/characters/' + char_id + '/' + char_id + '_1.png'
    else:
        source = BANNERS[dest.stem.removeprefix('banner-')]
    content = get(source).content
    image = Image.open(io.BytesIO(content)).convert('RGBA')
    image.thumbnail(size)
    image.save(dest, 'WEBP', quality=94, method=5)
    print('Artwork', dest.name, flush=True)

def main():
    raw = table('weedy', 'https://weedy.prts.wiki/gacha_table.json')
    client = table('gacha', TABLE + 'gacha_table.json')
    chars = table('character', TABLE + 'character_table.json')
    operators = json.loads((DIST / 'operators.json').read_text(encoding='utf-8'))
    by_id = {op['id']: op for op in operators}
    original = json.loads((DIST / 'pool.json').read_text(encoding='utf-8'))
    pools = {original['gachaPoolId']: original}
    assets = []
    for pid, title, slug in POOLS:
        config = next(p for p in client['gachaPoolClient'] if p['gachaPoolId'] == pid)
        detail = next(p for p in raw['gachaPoolClient'] if p['gachaPoolId'] == pid)['gachaPoolDetail']['detailInfo']
        attr_file = CACHE / (pid + '-page.json')
        if attr_file.exists():
            attrs = json.loads(attr_file.read_text(encoding='utf-8'))
        else:
            page = BeautifulSoup(get('https://prts.wiki/w/寻访模拟/' + title).content, 'html.parser')
            attrs = page.select_one('#gacha-data-root').attrs
            save(attr_file, attrs)
        assert attrs['data-gacha-pool-id'] == pid
        data = {key: detail.get(key) for key in ['availCharInfo', 'upCharInfo', 'weightUpCharInfoList']}
        data.update(gachaPoolId=pid, client=config, source='https://weedy.prts.wiki/gacha_table.json',
                    rosterSource='https://prts.wiki/w/寻访模拟/' + title)
        pools[pid] = data
        for tier in data['availCharInfo']['perAvailList']:
            for char_id in tier['charIdList']:
                if char_id in by_id:
                    continue
                char = chars[char_id]
                op = dict(id=char_id, name=char['name'], en=char.get('appellation') or char['name'],
                          rarity=tier['rarityRank'] + 1, profession=char['profession'], art='assets/' + char_id + '.webp')
                operators.append(op)
                by_id[char_id] = op
        assets.append((attrs['data-gacha-banner-file'], DIST / ('assets/banner-' + slug + '.webp'), (2400, 1400)))
    save(DIST / 'pools.json', pools)
    save(DIST / 'operators.json', operators)
    assets.extend(('立绘_' + op['name'] + '_1.png', DIST / op['art'], (1600, 1600)) for op in operators)
    print('Pools', len(pools), 'operators', len(operators), 'missing artwork', sum(not p.exists() for _, p, _ in assets), flush=True)
    with concurrent.futures.ThreadPoolExecutor(6) as executor:
        list(executor.map(lambda job: image_file(*job), assets))
    # Use the first real original camp logo, retaining the existing client mapping.
    reveal = json.loads((DIST / 'reveal-assets.json').read_text(encoding='utf-8'))
    missing = []
    for op in operators:
        if op['id'] in reveal['operatorCamp']:
            continue
        char = chars[op['id']]
        candidates = [v for v in [char.get('teamId'), char.get('groupId'), char.get('nationId')] if v]
        found = False
        for camp in candidates:
            target = DIST / ('assets/official/reveal/camp_' + camp + '.webp')
            try:
                if not target.exists():
                    url = MIRROR + 'arts/camplogo/' + ('linkage/' if camp == 'laios' else '') + 'logo_' + camp + '.png'
                    image = Image.open(io.BytesIO(get(url).content))
                    image.save(target, 'WEBP', lossless=True, method=6)
                reveal['operatorCamp'][op['id']] = camp
                reveal['factions'][camp] = target.relative_to(DIST).as_posix()
                found = True
                break
            except requests.HTTPError as error:
                if error.response.status_code != 404:
                    raise
        if not found:
            missing.append(op['id'])
    assert not missing, missing
    reveal['source']['campMapping'] = 'character_table teamId, then groupId, then nationId; first existing original camp logo. Covers the union of all five historical rosters.'
    save(DIST / 'reveal-assets.json', reveal)
    def ui_file(job):
        folder, name = job
        target = DIST / 'assets/official/pools' / folder / (name + '.webp')
        original_name = name.replace('-sharp', '[#2]')
        source = MIRROR + 'ui/gacha/' + folder + '/' + requests.utils.quote(original_name + '.png', safe='')
        target.parent.mkdir(parents=True, exist_ok=True)
        if not target.exists():
            image = Image.open(io.BytesIO(get(source).content))
            image.save(target, 'WEBP', lossless=True, method=4)
        return dict(file=target.relative_to(DIST).as_posix(), source=source,
                    sha256=hashlib.sha256(target.read_bytes()).hexdigest(), conversion='Original client pixels, lossless WebP')
    with concurrent.futures.ThreadPoolExecutor(6) as executor:
        ledger = list(executor.map(ui_file, [(folder, name) for folder, names in UI_FILES.items() for name in names]))
    for slug, source in BANNERS.items():
        target = DIST / ('assets/banner-' + slug + '.webp')
        ledger.append(dict(file=target.relative_to(DIST).as_posix(), source=source,
                           sha256=hashlib.sha256(target.read_bytes()).hexdigest(), conversion='Official announcement banner, WebP quality 94'))
    save(DIST / 'assets/official/pools/sources.json', ledger)
    print('All artwork and camp logos ready.', flush=True)

if __name__ == '__main__':
    main()
