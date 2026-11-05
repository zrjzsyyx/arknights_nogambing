"""Cache original client portraits/class symbols from the community asset mirror."""
import concurrent.futures,io,json,pathlib,time,requests
from PIL import Image
ROOT=pathlib.Path(__file__).parent
BASE='https://raw.githubusercontent.com/ArknightsAssets/ArknightsAssets2/cn/assets/dyn/'
OUT=ROOT/'dist/assets/official/results';OUT.mkdir(parents=True,exist_ok=True)
ops=json.loads((ROOT/'dist/operators.json').read_text(encoding='utf-8'))
def fetch(job):
 path,name=job;target=OUT/(name+'.webp')
 if target.exists():return
 for attempt in range(4):
  try:
   r=requests.get(BASE+path,timeout=25);r.raise_for_status()
   im=Image.open(io.BytesIO(r.content));im.save(target,'WEBP',lossless=True,method=6)
   return
  except requests.RequestException:
   if attempt==3:raise
   time.sleep(1)
jobs=[('arts/charportraits/'+o['id']+'_1.png',o['id']) for o in ops]
jobs += [('arts/ui/[uc]charcommon/dynprofession/icon_profession_'+p.lower()+'.png','class_'+p.lower()) for p in ['PIONEER','WARRIOR','TANK','SNIPER','CASTER','MEDIC','SUPPORT','SPECIAL']]
with concurrent.futures.ThreadPoolExecutor(8) as ex:list(ex.map(fetch,jobs))
print('Cached',len(jobs),'original portraits/class symbols')
