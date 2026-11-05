import sys,pathlib,json,types,argparse
from PIL import Image
R=pathlib.Path(__file__).parent;sys.path[:0]=[str(R/'.tools'),str(R/'research')];sys.modules['fmod_toolkit']=types.ModuleType('fmod_toolkit')
import aklz4,UnityPy
parser=argparse.ArgumentParser();parser.add_argument('--texture-bundle');args=parser.parse_args()
e=UnityPy.load(str(R/'research/ui-unpacked/ui/gacha/limited_79_0_1.ab'))
hq={}
if args.texture_bundle:
 for o in UnityPy.load(args.texture_bundle).objects:
  if o.type.name=='Sprite':
   d=o.read()
   if d.m_Name in ['bg','char_01','char_02']:hq[d.m_Name]=o
objects={str(o.path_id):o for o in e.objects};records={str(o.path_id):o.read_typetree() for o in e.objects if o.type.name in ['RectTransform','GameObject','MonoBehaviour','Material','CanvasGroup']}
out=R/'dist/assets/official/ui';sprites={}
for k,o in objects.items():
 if o.type.name=='Sprite':
  d=o.read();name=d.m_Name;source=hq.get(name,o);im=source.read().image.convert('RGBA');raw=source.read_typetree()
  # UnityPy returns the trimmed texture; Unity renders it inside m_Rect.
  rect=raw['m_Rect'];offset=raw['m_RD']['textureRectOffset']
  canvas=Image.new('RGBA',(round(rect['width']),round(rect['height'])))
  canvas.paste(im,(round(offset['x']),round(rect['height']-offset['y']-im.height)))
  canvas.save(out/(name+'.webp'),'WEBP',lossless=True,method=6);sprites[k]=name+'.webp'
nodes={};root=None
for k,o in objects.items():
 if o.type.name!='RectTransform':continue
 t=records[k];go=records[str(t['m_GameObject']['m_PathID'])]
 n=dict(id=k,name=go['m_Name'],active=go['m_IsActive'],children=[str(v['m_PathID']) for v in t['m_Children']],anchorMin=t['m_AnchorMin'],anchorMax=t['m_AnchorMax'],position=t['m_AnchoredPosition'],size=t['m_SizeDelta'],pivot=t['m_Pivot'],scale=t['m_LocalScale'],rotation=t['m_LocalRotation'],images=[],texts=[])
 for c in go['m_Component']:
  v=records.get(str(c['component']['m_PathID']),{})
  sprite=sprites.get(str(v.get('m_Sprite',{}).get('m_PathID',0)))
  if sprite:n['images'].append(dict(file=sprite,color=v.get('m_Color',{'r':1,'g':1,'b':1,'a':1}),preserveAspect=v.get('m_PreserveAspect',False)))
  if 'm_Alpha' in v:n['opacity']=v['m_Alpha']
  text=v.get('m_Text',v.get('m_text',''))
  if text:n['texts'].append(text)
 nodes[k]=n
 if t['m_Father']['m_PathID']==0:root=k
(out/'prefab.json').write_text(json.dumps(dict(root=root,nodes=nodes),ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print('TEXTS',[(n['name'],n['texts']) for n in nodes.values() if n['texts']]);print('BUTTONS',[(n['name'],n['id']) for n in nodes.values() if 'btn_gacha' in n['name']])
