import pathlib, requests, json, re, io, concurrent.futures, hashlib
from PIL import Image
from bs4 import BeautifulSoup
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
root=pathlib.Path(__file__).parent
s=requests.Session();s.mount('https://',HTTPAdapter(max_retries=Retry(total=3,backoff_factor=1)))
def get(url,**kw):
 r=s.get(url,timeout=45,**kw);r.raise_for_status();return r
page=BeautifulSoup(get('https://prts.wiki/w/寻访模拟/将雪投火').text,'html.parser')
attrs=page.select_one('#gacha-data-root').attrs
pid=attrs['data-gacha-pool-id'];print('POOL',pid,flush=True)
script=next(t['src'] for t in page.find_all('script',src=True) if 'GachaSimulatorV2.' in t['src'])
js=get(script).text;(root/'prts-simulator.tmp.js').write_text(js,encoding='utf-8')
raw=get('https://weedy.prts.wiki/gacha_table.json').json()
pool=next(p for p in raw['gachaPoolClient'] if p['gachaPoolId']==pid)
info=pool['gachaPoolDetail']['detailInfo']
client=get('https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData/master/zh_CN/gamedata/excel/gacha_table.json').json()
config=next(p for p in client['gachaPoolClient'] if p['gachaPoolId']==pid)
table=get('https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData/master/zh_CN/gamedata/excel/character_table.json').json()
data={k:info[k] for k in ['availCharInfo','upCharInfo','weightUpCharInfoList']}
data.update(gachaPoolId=pid,client=config,source='https://weedy.prts.wiki/gacha_table.json',scriptSource=script,scriptSha256=hashlib.sha256(js.encode()).hexdigest())
(root/'reference-pool.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
(root/'dist/pool.json').write_text(json.dumps(data,ensure_ascii=False),encoding='utf-8')
print('CLIENT',json.dumps(config,ensure_ascii=True),flush=True)
print('UP',[(table[k]['name'],p['percent']) for p in data['upCharInfo']['perCharList'] for k in p['charIdList']],flush=True)
ops=[]
for tier in data['availCharInfo']['perAvailList']:
 for k in tier['charIdList']:
  v=table[k];ops.append(dict(id=k,name=v['name'],en=v.get('appellation') or v['name'],rarity=tier['rarityRank']+1,profession=v['profession'],art='assets/'+k+'.webp'))
def image_file(title,dest,size):
 q=get('https://prts.wiki/api.php',params=dict(action='query',titles='文件:'+title,prop='imageinfo',iiprop='url',format='json')).json()
 url=next(iter(q['query']['pages'].values()))['imageinfo'][0]['url']
 im=Image.open(io.BytesIO(get(url).content)).convert('RGBA');im.thumbnail(size);im.save(dest,'WEBP',quality=90,method=4)
def download(op):
 dest=root/'dist'/op['art']
 if dest.exists():return
 try:image_file('立绘_'+op['name']+'_1.png',dest,(1600,1600))
 except Exception as e:print('FAILED',op['name'],str(e)[:90],flush=True);raise
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:list(executor.map(download,ops))
(root/'dist/operators.json').write_text(json.dumps(ops,ensure_ascii=False),encoding='utf-8')
image_file(attrs['data-gacha-banner-file'],root/'dist/assets/banner-snowfire.webp',(2400,1400))
print('DONE',len(ops),flush=True)
