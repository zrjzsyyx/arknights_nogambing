import pathlib,requests,concurrent.futures,json,io,zipfile
from PIL import Image
R=pathlib.Path(__file__).parent;out=R/'dist/assets/official/ui';out.mkdir(parents=True,exist_ok=True)
names=['bg','bg_fire1','bg_fire2','char_01','char_02','name1','name2','title_chi','title_eng','limit_gacha_title','up_title','btn_gacha','btn_10_gacha','deco_castle_dark','deco_castle_highlight','deco_castle_txt','protect_gacha_text','time_limit_signal','shard_icon','pool_info_back']
def one(name):
 url='https://raw.githubusercontent.com/ArknightsAssets/ArknightsAssets2/cn/assets/dyn/ui/gacha/limited_79_0_1/'+name+'.png'
 v=requests.get(url,timeout=35);v.raise_for_status();im=Image.open(io.BytesIO(v.content));im.save(out/(name+'.webp'),'WEBP',quality=94,method=4);print(name,im.size,flush=True)
with concurrent.futures.ThreadPoolExecutor(8) as ex:list(ex.map(one,names))
manifest=json.loads((R/'research/hot_update_list.json').read_text());url='https://ak.hycdn.cn/assetbundle/official/Android/assets/'+manifest['versionId']+'/ui_gacha_limited_79_0_1.dat';v=requests.get(url,timeout=40);v.raise_for_status();zipfile.ZipFile(io.BytesIO(v.content)).extractall(R/'research/ui-unpacked')
print('UI BUNDLE',len(v.content),flush=True)
