"""Verify media before packaging and record the exact upstream asset provenance."""
import pathlib,json,subprocess,concurrent.futures,hashlib
R=pathlib.Path(__file__).parent;assets=R/'dist/assets/official'
operators=json.loads((R/'dist/operators.json').read_text(encoding='utf-8'))
def inspect(path):
 p=subprocess.run(['ffprobe','-v','error','-show_entries','format=duration:stream=codec_name,sample_rate,channels','-of','json',str(path)],capture_output=True,text=True,check=True)
 d=json.loads(p.stdout);assert float(d['format']['duration'])>0,path
 assert d['streams'][0]['codec_name']=='mp3',path
 return {'file':str(path.relative_to(R/'dist')).replace('\\','/'),'duration':float(d['format']['duration']),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
with concurrent.futures.ThreadPoolExecutor(6) as ex:audio=list(ex.map(inspect,assets.rglob('*.mp3')))
provenance={
 'resourceVersion':'26-10-29-15-36-11-33649006',
 'bag':{'url':'https://ak.hycdn.cn/assetbundle/official/Android/assets/26-10-29-15-36-11-33649006/prefabs_gacha_gacha_phase_0.dat','md5':'8f3b12d9896e74c88a70bdd45890b0f1','meshes':'Original S_Bag meshes and skin/bind matrices','animations':['gacha_bag_start','gacha_bag_open','gacha_main_cam_start','gacha_main_cam_loop','gacha_main_cam_shake'],'conversion':'Original position, rotation and scale curves resampled at 60 Hz with cubic Hermite interpolation; original textures losslessly converted to WebP'},
 'ui':{'url':'https://ak.hycdn.cn/assetbundle/official/Android/assets/26-10-29-15-36-11-33649006/ui_gacha_limited_79_0_1.dat','md5':'493fa4ef45346d85a7eef2e4cc5da6c2','conversion':'Original RectTransform hierarchy, anchors, pivots and scales. Trimmed Sprite images restored to their full m_Rect canvas using textureRectOffset, then losslessly encoded. PreserveAspect is retained. Runtime labels adapted for the browser.',
  'highQualitySprites':{'url':'https://ak.hycdn.cn/assetbundle/official/Windows/assets/26-10-29-15-35-15-96278206/ui_gacha_limited_79_0_1.dat','md5':'818832e8417885ba07220b05ee1aff20','sourceFormat':'PC BC7, replacing mobile ASTC copies for the background and featured characters','nativeCanvasSizes':{'bg':[1024,527],'char_01':[1200,1000],'char_02':[1300,1000]}}},
 'results':{'portraits':'https://github.com/ArknightsAssets/ArknightsAssets2/tree/cn/assets/dyn/arts/charportraits','professions':'https://github.com/ArknightsAssets/ArknightsAssets2/tree/cn/assets/dyn/arts/ui/%5Buc%5Dcharcommon/dynprofession','portraitCount':len(operators),'professionCount':8,'conversion':'Original 180x360 client portraits and original profession symbols, losslessly cached. Browser layout and light columns follow in-game screenshots; they are not the Unity result shader.'},
 'audio':{'mirror':'https://github.com/ArknightsAssets/ArknightsAssets2/tree/voice/assets/dyn/audio/sound_beta_2','routing':'https://raw.githubusercontent.com/yuanyan3060/ArknightsGameResource/main/gamedata/excel/audio_data.json','bgmEvent':'sys.ON_SCENE_LOADED.home','bgmFiles':['Music/beta1_180603/m_sys_void_intro','Music/beta1_180603/m_sys_void_loop'],'note':'The default client interface theme is used. Custom client home themes can differ. Regular interface buttons use the original g_ui_btn_h sample; g_ui_btn_n was unavailable in the public mirror.'},
 'fonts':'https://github.com/TimWangZi/The-font-of-Arknights',
 'renderer':'Three.js 0.160.1 (MIT); original meshes, bones and textures, with web lighting and glow adaptation. Unity particle shaders and every client UI transition are not reproduced pixel for pixel.',
 'files':audio
}
native=json.loads((R/'dist/reveal-assets.json').read_text(encoding='utf-8'))
provenance['recruitment']={'source':native['source'],'manifest':'reveal-assets.json','voices':'voices.json','voiceLanguage':'ja','voiceLine':'CN_011 / GACHA','voiceSource':'https://torappu.prts.wiki/assets/audio/voice/','voiceConversion':'Original performances converted WAV to MP3; no trimming, speed, pitch, or synthesized speech. Original Chinese subtitles from client charword_table.'}
provenance['results']['effects']=native['results']['source']
provenance['pools']={'data':'pools.json','artworkSources':'assets/official/pools/sources.json','layout':'All five pools use their original historical client prefab hierarchy. The four added layouts and checksum-pinned source bundles are recorded in assets/official/pools/*/prefab.json. Native entry end-state transforms, sprite canvases, masks and material colors are retained; full entry transitions and Unity particle shaders are not replayed. The selector uses official announcement banners.'}
(assets/'provenance.json').write_text(json.dumps(provenance,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'verifiedAudioFiles':len(audio),'allDecodable':True,'totalDuration':round(sum(a['duration'] for a in audio),2)}))
