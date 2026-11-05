import pathlib,json,requests,concurrent.futures,hashlib
R=pathlib.Path(__file__).parent;research=R/'research';out=R/'dist/assets/official';out.mkdir(parents=True,exist_ok=True)
d=json.loads((research/'audio_data.json').read_text(encoding='utf-8'))
print('BGM',[(x['name'],x.get('intro'),x.get('loop')) for x in d['bgmBanks'] if any(k in x['name'].lower() for k in ['gacha','shop','recruit'])],flush=True)
print('SFX',[(x['name'],[y['asset'] for y in x.get('sounds',[])]) for x in d['soundFXBanks'] if any(k in x['name'].lower() for k in ['gacha','card','zipper','button','click'])],flush=True)
base='https://ak.hycdn.cn/assetbundle/official/Android/assets/'+json.loads((research/'hot_update_list.json').read_text(encoding='utf-8'))['versionId']+'/'
def bundle(n):
 try:
  v=requests.get(base+n,timeout=45);print('BUNDLE',n,v.status_code,len(v.content),v.content[:15],flush=True)
  if v.ok:(research/'gacha-original.bundle').write_bytes(v.content)
 except Exception as e:print('BUNDLE_ERROR',n,str(e)[:80],flush=True)
with concurrent.futures.ThreadPoolExecutor(3) as ex:list(ex.map(bundle,['prefabs_gacha_gacha_phase_0.ab','prefabs_gacha_gacha_phase_0.dat','prefabs/gacha/gacha_phase_0.ab']))
files=['g_card_10cardsrelease','g_card_1cardrelease','g_card_checkout','g_card_pad_n','g_card_pad_r','g_card_pad_sr','g_card_pad_ssr','g_card_shining1_n','g_card_shining1_ssr','g_card_shining2_n','g_card_shining2_ssr','g_card_shining3_n','g_card_shining3_ssr','g_card_shining4_n','g_card_shining4_ssr','g_card_zipper','g_ui_btn_n','g_ui_back','g_ui_confirm','g_ui_10cards','g_ui_charentry','g_ui_packagedrop']
jobs=[('sfx/'+k+'.mp3','general/g_ui/'+k+'.mp3') for k in files]
jobs += [('sfx/mixed_gacha_part1.mp3','beta1leaveover/mixed_gacha_part1.mp3'),('sfx/mixed_gacha_part2.mp3','beta1leaveover/mixed_gacha_part2.mp3')]
jobs += [('sfx/mixed_gacha_star_'+str(i)+'.mp3','beta1leaveover/mixed_gacha_star_'+str(i)+'.mp3') for i in range(1,7)]
# BGM selected below from the client's event routing, not guessed from track names.
for bank in d['bgmBanks']:
 if bank['name']=='sys.ON_SCENE_LOADED.home':
  for key in ['intro','loop']:
   if bank.get(key):jobs.append(('music/'+key+'.mp3',bank[key].split('Sound_Beta_2/')[-1].lower()+'.mp3'))
ledger=[]
def download(job):
 local,path=job;url='https://raw.githubusercontent.com/ArknightsAssets/ArknightsAssets2/voice/assets/dyn/audio/sound_beta_2/'+path
 dest=out/local;dest.parent.mkdir(parents=True,exist_ok=True)
 if dest.exists():content=dest.read_bytes()
 else:
  response=requests.get(url,timeout=45)
  if not response.ok:print('FAIL',path,response.status_code,flush=True);return
  content=response.content;dest.write_bytes(content)
 ledger.append(dict(file='assets/official/'+local,url=url,sha256=hashlib.sha256(content).hexdigest()))
with concurrent.futures.ThreadPoolExecutor(8) as ex:list(ex.map(download,jobs))
(out/'sources.json').write_text(json.dumps(ledger,indent=2),encoding='utf-8')
print('DOWNLOADED',len(ledger),flush=True)
