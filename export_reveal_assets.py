"""Export original gacha_phase_1 textures, sprites and layout/particle metadata."""
import sys,pathlib,json,types,hashlib,requests,io,concurrent.futures,time
from PIL import Image
ROOT=pathlib.Path(__file__).parent
sys.path[:0]=[str(ROOT/'.tools'),str(ROOT/'research')]
sys.modules['fmod_toolkit']=types.ModuleType('fmod_toolkit')
import aklz4,UnityPy
SOURCE=ROOT/'research/reveal-unpacked/prefabs/gacha/gacha_phase_1.ab'
assert hashlib.md5(SOURCE.read_bytes()).hexdigest()=='9a647120947966f4031532763a352d6c','Original phase1 bundle differs from official manifest'
OUT=ROOT/'dist/assets/official/reveal';OUT.mkdir(parents=True,exist_ok=True)
env=UnityPy.load(str(SOURCE));objects={str(o.path_id):o for o in env.objects}
records={str(o.path_id):o.read_typetree() for o in env.objects if o.type.name not in ['Texture2D','Mesh','AssetBundle']}
textures={};sprites={}
for o in env.objects:
 if o.type.name not in ['Texture2D','Sprite']:continue
 d=o.read();name=d.m_Name;image=d.image.convert('RGBA')
 kind='texture' if o.type.name=='Texture2D' else 'sprite'
 file=(name if kind=='texture' else 'sprite_'+name)+'.webp'
 image.save(OUT/file,'WEBP',lossless=True,method=6)
 entry={'id':str(o.path_id),'file':'assets/official/reveal/'+file,'size':list(image.size),'alphaBounds':image.getchannel('A').getbbox()}
 (textures if kind=='texture' else sprites)[name]=entry
 if kind=='texture' and name in ['beijing_03','beijing_04']:
  bounds=image.getchannel('A').getbbox();crop=image.crop(bounds)
  cropped='reveal-background.webp' if name=='beijing_04' else 'reveal-background-dark.webp'
  crop.save(OUT/cropped,'WEBP',lossless=True,method=6)
  entry['croppedFile']='assets/official/reveal/'+cropped
  entry['croppedSize']=list(crop.size)
 if kind=='texture' and name=='wujiaoxing_01':
  image.crop(image.getchannel('A').getbbox()).save(OUT/'star.webp','WEBP',lossless=True,method=6)
def clean(d):
 if isinstance(d,bytes):return list(d)
 raise TypeError(type(d))
materials={}
for k,v in records.items():
 if 'm_SavedProperties' not in v:continue
 prop=v['m_SavedProperties']
 mats={'id':k,'textures':{},'colors':dict(prop.get('m_Colors',[])),'floats':dict(prop.get('m_Floats',[]))}
 for name,t in prop.get('m_TexEnvs',[]):
  ref=t['m_Texture'];obj=objects.get(str(ref['m_PathID'])) if ref['m_FileID']==0 else None
  mats['textures'][name]={'fileID':ref['m_FileID'],'pathID':str(ref['m_PathID']),'name':obj.read().m_Name if obj else None,'scale':t.get('m_Scale'),'offset':t.get('m_Offset')}
 materials[v['m_Name']]=mats
nodes={};ui={}
for o in env.objects:
 if o.type.name not in ['Transform','RectTransform']:continue
 t=o.read_typetree();go=records.get(str(t['m_GameObject']['m_PathID']),{})
 n={'id':str(o.path_id),'go':str(t['m_GameObject']['m_PathID']),'name':go.get('m_Name'),'parent':str(t['m_Father']['m_PathID']),'active':go.get('m_IsActive'),'position':t['m_LocalPosition'],'rotation':t['m_LocalRotation'],'scale':t['m_LocalScale']}
 nodes[n['id']]=n
 if o.type.name=='RectTransform':
  ui[n['name']]={**n,**{k:t[k] for k in ['m_AnchorMin','m_AnchorMax','m_AnchoredPosition','m_SizeDelta','m_Pivot']}}
particles=[]
for o in env.objects:
 if o.type.name!='ParticleSystem':continue
 d=o.read_typetree();go=records.get(str(d['m_GameObject']['m_PathID']),{})
 renderer=None
 for c in go.get('m_Component',[]):
  rid=str(c['component']['m_PathID']);r=records.get(rid,{})
  if 'm_RenderMode' in r and 'm_Materials' in r:renderer={'materials':[records.get(str(m['m_PathID']),{}).get('m_Name') for m in r['m_Materials']],'renderMode':r['m_RenderMode']}
 particles.append({'id':str(o.path_id),'go':str(d['m_GameObject']['m_PathID']),'name':go.get('m_Name'),'renderer':renderer,'duration':d.get('lengthInSec'),'loop':d.get('looping'),'startDelay':d.get('startDelay'),'initial':d.get('InitialModule'),'emission':d.get('EmissionModule'),'color':d.get('ColorModule'),'size':d.get('SizeModule'),'shape':d.get('ShapeModule'),'velocity':d.get('VelocityModule'),'rotation':d.get('RotationModule')})
BASE='https://raw.githubusercontent.com/ArknightsAssets/ArknightsAssets2/cn/assets/dyn/arts/'
def download(relative,file):
 target=OUT/file
 if target.exists():return
 for attempt in range(4):
  try:
   r=requests.get(BASE+relative,timeout=25);r.raise_for_status()
   Image.open(io.BytesIO(r.content)).save(target,'WEBP',lossless=True,method=6);return
  except requests.RequestException:
   if attempt==3:raise
   time.sleep(1)
charpath=ROOT/'research/character-recruitment.json'
if not charpath.exists():
 r=requests.get('https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData/master/zh_CN/gamedata/excel/character_table.json',timeout=30);r.raise_for_status();charpath.write_bytes(r.content)
chars=json.loads(charpath.read_text(encoding='utf-8'))
ops=json.loads((ROOT/'dist/operators.json').read_text(encoding='utf-8'))
logotree=json.loads((ROOT/'research/reveal-camplogo.json').read_text())['tree']
available={v['path'][5:-4] for v in logotree if v['path'].startswith('logo_')}
operatorCamp={o['id']:next(v for v in [chars[o['id']].get('teamId'),chars[o['id']].get('groupId'),chars[o['id']].get('nationId')] if v in available) for o in ops}
factions={camp:'assets/official/reveal/camp_'+camp+'.webp' for camp in sorted(set(operatorCamp.values())|{'rhodes'})}
professions={p.upper():'assets/official/reveal/profession_'+p+'.webp' for p in ['pioneer','warrior','tank','sniper','caster','medic','support','special']}
jobs=[('camplogo/logo_'+camp+'.png','camp_'+camp+'.webp') for camp in factions]
jobs += [('profession_hub/icon_'+p.lower()+'.png','profession_'+p.lower()+'.webp') for p in professions]
with concurrent.futures.ThreadPoolExecutor(8) as executor:list(executor.map(lambda job:download(*job),jobs))
manifest={'source':{'url':'https://ak.hycdn.cn/assetbundle/official/Android/assets/26-10-29-15-36-11-33649006/prefabs_gacha_gacha_phase_1.dat','md5':'9a647120947966f4031532763a352d6c','conversion':'Original client textures and Sprite pixels losslessly converted. Cropped backgrounds remove only transparent borders. Layout and material/particle settings exported for browser adaptation.','factions':BASE+'camplogo/','professions':BASE+'profession_hub/','campMapping':'character_table teamId, then groupId, then nationId; first existing original camp logo. All 169 operators resolve without substitution.'},'textures':textures,'sprites':sprites,'materials':materials,'ui':ui,'nodes':nodes,'particles':particles,'factions':factions,'professions':professions,'operatorCamp':operatorCamp}
manifest['source'].update(md5Scope='Unpacked prefabs/gacha/gacha_phase_1.ab',archiveMd5='79eb95dbb5f296852a7c2e58532103a8')
resultSource=ROOT/'research/reveal-unpacked/ui/recruit/states/recruit_ten_result_state.ab'
if resultSource.exists():
 resultEnv=UnityPy.load(str(resultSource));resultObjects={str(o.path_id):o for o in resultEnv.objects}
 resultRecords={str(o.path_id):o.read_typetree() for o in resultEnv.objects if o.type.name not in ['Texture2D','Mesh','AssetBundle']}
 resultSprites={o.read().m_Name for o in resultEnv.objects if o.type.name=='Sprite'}
 resultInfo=next(v for v in json.loads((ROOT/'research/hot_update_list.json').read_text())['abInfos'] if v['name']=='ui/recruit/states/recruit_ten_result_state.ab')
 assert hashlib.md5(resultSource.read_bytes()).hexdigest()==resultInfo['md5'],'Original ten-result bundle differs from official manifest'
 results={'textures':{},'sprites':{},'materials':{},'nodes':{},'particles':[],'ui':{},'source':{'url':'https://ak.hycdn.cn/assetbundle/official/Android/assets/26-10-29-15-36-11-33649006/ui_recruit_states_recruit_ten_result_state.dat','md5':resultInfo['md5'],'bundle':'ui/recruit/states/recruit_ten_result_state.ab','conversion':'Original source pixels losslessly encoded; optional alpha crops remove only wholly transparent atlas margins. Colored rarity textures retain original RGB and alpha. No generated light artwork.'}}
 results['source'].update(md5Scope='Unpacked ui/recruit/states/recruit_ten_result_state.ab',archiveMd5='be971a18d10c71fd6a503949785e6453')
 for o in resultEnv.objects:
  if o.type.name in ['Texture2D','Sprite']:
   d=o.read();name=d.m_Name;im=d.image.convert('RGBA')
   isSprite=o.type.name=='Sprite';file='result_'+('texture_' if not isSprite and name in resultSprites else '')+name+'.webp'
   im.save(OUT/file,'WEBP',lossless=True,method=6)
   entry={'id':str(o.path_id),'file':'assets/official/reveal/'+file,'size':list(im.size),'alphaBounds':im.getchannel('A').getbbox(),'sha256':hashlib.sha256((OUT/file).read_bytes()).hexdigest()}
   results['sprites' if isSprite else 'textures'][name]=entry
   if not isSprite and name in ['sixing_01','wuxingguang_01','liuxingguangyun_01']:
    cropped=im.crop(im.getchannel('A').getbbox());cropfile='result_beam_'+{'sixing_01':'4','wuxingguang_01':'5','liuxingguangyun_01':'6'}[name]+'.webp'
    cropped.save(OUT/cropfile,'WEBP',lossless=True,method=6);entry['alphaCroppedFile']='assets/official/reveal/'+cropfile;entry['alphaCroppedSize']=list(cropped.size)
  if o.type.name in ['Transform','RectTransform']:
   d=o.read_typetree();go=resultRecords[str(d['m_GameObject']['m_PathID'])];node={'id':str(o.path_id),'go':str(d['m_GameObject']['m_PathID']),'name':go['m_Name'],'active':go['m_IsActive'],'parent':str(d['m_Father']['m_PathID']),'position':d['m_LocalPosition'],'rotation':d['m_LocalRotation'],'scale':d['m_LocalScale']}
   results['nodes'][str(o.path_id)]=node
   if o.type.name=='RectTransform':results['ui'][go['m_Name']]={**node,**{k:d[k] for k in ['m_AnchorMin','m_AnchorMax','m_AnchoredPosition','m_SizeDelta','m_Pivot']}}
  if o.type.name=='Material':
   d=o.read_typetree();p=d['m_SavedProperties'];mat={'textures':{},'colors':dict(p.get('m_Colors',[])),'floats':dict(p.get('m_Floats',[]))}
   for name,t in p.get('m_TexEnvs',[]):
    ref=t['m_Texture'];tex=resultObjects.get(str(ref['m_PathID'])) if ref['m_FileID']==0 else None
    mat['textures'][name]={'fileID':ref['m_FileID'],'pathID':str(ref['m_PathID']),'name':tex.read().m_Name if tex else None,'scale':t.get('m_Scale'),'offset':t.get('m_Offset')}
   results['materials'][d['m_Name']]=mat
  if o.type.name=='ParticleSystem':
   d=o.read_typetree();go=resultRecords[str(d['m_GameObject']['m_PathID'])];renderer=None
   for c in go['m_Component']:
    r=resultRecords.get(str(c['component']['m_PathID']),{})
    if 'm_RenderMode' in r and 'm_Materials' in r:renderer={'materials':[resultRecords.get(str(m['m_PathID']),{}).get('m_Name') for m in r['m_Materials']],'renderMode':r['m_RenderMode']}
   results['particles'].append({'id':str(o.path_id),'name':go['m_Name'],'go':str(d['m_GameObject']['m_PathID']),'renderer':renderer,'duration':d.get('lengthInSec'),'loop':d.get('looping'),'initial':d.get('InitialModule'),'emission':d.get('EmissionModule'),'color':d.get('ColorModule'),'size':d.get('SizeModule'),'shape':d.get('ShapeModule'),'velocity':d.get('VelocityModule'),'rotation':d.get('RotationModule')})
 manifest['results']=results
manifestPath=ROOT/'dist/reveal-assets.json';temporaryPath=manifestPath.with_name('reveal-assets.tmp.json')
temporaryPath.write_text(json.dumps(manifest,ensure_ascii=False,default=clean,separators=(',',':')),encoding='utf-8');temporaryPath.replace(manifestPath)
print(json.dumps({'textures':len(textures),'sprites':len(sprites),'materials':len(materials),'uiNodes':len(ui),'particles':len(particles)}))
