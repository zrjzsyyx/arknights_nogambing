"""Export already extracted official Unity meshes, bones and animation curves for WebGL.
Run research/extract_bag.py first (UnityPy + the BSD-3 LZ4AK decoder).
No mesh, UV, bone or keyframe data is procedurally substituted.
"""
import pathlib,json,math
from PIL import Image
R=pathlib.Path(__file__).parent;src=R/'research/extracted';out=R/'dist/assets/official/scene';out.mkdir(parents=True,exist_ok=True)
ds={p.stem:json.loads(p.read_text()) for p in src.glob('*.json') if not p.stem.endswith('_geometry')}
gos={k:v for k,v in ds.items() if 'm_Component' in v};trans={k:v for k,v in ds.items() if 'm_LocalPosition' in v}
bygo={str(t['m_GameObject']['m_PathID']):k for k,t in trans.items()}
def vec(v,keys='xyz'):return [v[k] for k in keys]
nodes=[dict(id=k,name=gos.get(str(v['m_GameObject']['m_PathID']),{}).get('m_Name',''),parent=str(v['m_Father']['m_PathID']),position=vec(v['m_LocalPosition']),rotation=vec(v['m_LocalRotation'],'xyzw'),scale=vec(v['m_LocalScale'])) for k,v in trans.items()]
geometries={};meshes=[]
for k,v in ds.items():
 if 'm_Materials' not in v or 'm_GameObject' not in v:continue
 materials=[ds.get(str(p['m_PathID']),{}).get('m_Name','') for p in v['m_Materials']]
 if not any(name in ['MT_Gacha_Bag_01','MT_Gacha_Ground_A_01','MT_Gacha_Ground_02'] for name in materials):continue
 mid=str(v.get('m_Mesh',{}).get('m_PathID',0))
 if mid=='0':
  go=gos[str(v['m_GameObject']['m_PathID'])]
  for c in go['m_Component']:
   cv=ds.get(str(c['component']['m_PathID']),{})
   if 'm_Mesh' in cv:mid=str(cv['m_Mesh']['m_PathID'])
 if not (src/(mid+'_geometry.json')).exists():continue
 geom=json.loads((src/(mid+'_geometry.json')).read_text());original=ds[mid]
 geometries[mid]={k.replace('m_',''):v for k,v in geom.items()}
 geometries[mid]['bindPoses']=[[m['e'+str(i)+str(j)] for j in range(4) for i in range(4)] for m in original.get('m_BindPose',[])]
 meshes.append(dict(node=bygo[str(v['m_GameObject']['m_PathID'])],geometry=mid,materials=materials,bones=[str(p['m_PathID']) for p in v.get('m_Bones',[])]))
materials={}
for k,v in ds.items():
 if v.get('m_Name') not in ['MT_Gacha_Bag_01','MT_Gacha_Ground_A_01','MT_Gacha_Ground_02']:continue
 tex={n:str(t['m_Texture']['m_PathID']) for n,t in v['m_SavedProperties']['m_TexEnvs']}
 materials[v['m_Name']]=dict(albedo=tex.get('_MainTex'),normal=tex.get('_BumpMap'),ao=tex.get('_OcclusionMap'),mr=tex.get('_MetallicGlossMap'))
textures={}
for path in src.glob('*.png'):
 key=path.name.split('_')[0]
 if key not in ds:continue
 im=Image.open(path);im.save(out/(key+'.webp'),'WEBP',lossless=True,method=4);textures[key]=key+'.webp'
def sample(keys,t,axes):
 if t<=keys[0]['time']:return vec(keys[0]['value'],axes)
 if t>=keys[-1]['time']:return vec(keys[-1]['value'],axes)
 for a,b in zip(keys,keys[1:]):
  if a['time']<=t<=b['time']:
   dt=b['time']-a['time'];u=(t-a['time'])/dt;h00=2*u**3-3*u**2+1;h10=u**3-2*u**2+u;h01=-2*u**3+3*u**2;h11=u**3-u**2
   return [h00*a['value'][c]+h10*dt*a['outSlope'][c]+h01*b['value'][c]+h11*dt*b['inSlope'][c] for c in axes]
clips={}
for k,v in ds.items():
 if v.get('m_Name') not in ['gacha_bag_start','gacha_bag_open','gacha_main_cam_start','gacha_main_cam_loop','gacha_main_cam_shake']:continue
 tracks=[]
 duration=max(key['time'] for kind in ['m_PositionCurves','m_RotationCurves','m_ScaleCurves'] for c in v[kind] for key in c['curve']['m_Curve'])
 for kind,prop,axes in [('m_PositionCurves','position','xyz'),('m_RotationCurves','quaternion','xyzw'),('m_ScaleCurves','scale','xyz')]:
  for c in v[kind]:
   keys=c['curve']['m_Curve'];times=sorted(set([i/60 for i in range(math.ceil(duration*60)+1)]+[key['time'] for key in keys]));values=[]
   for t in times:
    val=sample(keys,t,axes)
    if prop=='quaternion':
     length=math.sqrt(sum(x*x for x in val));val=[x/length for x in val]
    values.extend(val)
   tracks.append(dict(path=c['path'],property=prop,times=times,values=values))
 clips[v['m_Name']]=dict(duration=duration,tracks=tracks)
cameras=[]
for k,v in ds.items():
 if 'field of view' in v and not v['orthographic']:cameras.append(dict(node=bygo[str(v['m_GameObject']['m_PathID'])],fov=v['field of view']))
data=dict(nodes=nodes,meshes=meshes,geometries=geometries,materials=materials,textures=textures,clips=clips,cameras=cameras)
(out/'bag.json').write_text(json.dumps(data,separators=(',',':')),encoding='utf-8')
print('EXPORTED',len(nodes),'nodes',len(meshes),'meshes',[(k,v['duration']) for k,v in clips.items()])
