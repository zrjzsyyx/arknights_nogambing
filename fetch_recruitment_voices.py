"""Cache the original JP GACHA/onboard line for every operator in this pool.

PRTS's `voice` audio directory contains Japanese dialogue; `CN_011` is the
client line identifier, not the recording language. The selected line comes
from placeType=GACHA and the JP wordkey in the original charword table.
No voice is synthesized, substituted, trimmed, normalized, or speed changed.
Requires requests, ffmpeg and ffprobe. WAVs remain in ignored research/.
"""
import concurrent.futures,hashlib,html,json,pathlib,re,subprocess,time,urllib.parse
import requests

ROOT=pathlib.Path(__file__).parent
OUT=ROOT/'dist/assets/official/voices';OUT.mkdir(parents=True,exist_ok=True)
RAW=ROOT/'research/recruitment-voice-wav';RAW.mkdir(parents=True,exist_ok=True)
MANIFEST=ROOT/'dist/voices.json'
TABLE_BASE='https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData/master/zh_CN/gamedata/excel/'
VOICE_BASE='https://torappu.prts.wiki/assets/audio/voice/'

def table(name,cache):
 path=ROOT/'research'/cache
 if not path.exists():
  r=requests.get(TABLE_BASE+name+'.json',timeout=40);r.raise_for_status();path.write_bytes(r.content)
 return json.loads(path.read_text(encoding='utf-8'))

for binary in ['ffmpeg','ffprobe']:
 subprocess.run([binary,'-version'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
words=table('charword_table','charword-recruitment.json')
characters=table('character_table','character-recruitment.json')
operators=json.loads((ROOT/'dist/operators.json').read_text(encoding='utf-8'))
entries={}
for op in operators:
 char_id=op['id'];jp=words['voiceLangDict'][char_id]['dict']['JP']
 candidates=[v for v in words['charWords'].values() if v['charId']==char_id and v['placeType']=='GACHA' and v['wordKey']==jp['wordkey']]
 assert len(candidates)==1,(char_id,[v['voiceAsset'] for v in candidates])
 line=candidates[0];char=characters[char_id]
 source=VOICE_BASE+urllib.parse.quote(line['voiceAsset'].lower(),safe='/')+'.wav'
 entries[char_id]={
  'url':'assets/official/voices/'+char_id+'.mp3',
  'text':html.unescape(re.sub(r'<[^>]+>','',line['voiceText'])),
  'camp':char.get('teamId') or char.get('groupId') or char.get('nationId') or 'rhodes',
  'language':'ja','voiceId':line['voiceId'],'placeType':'GACHA',
  'cv':jp.get('cvName',[]),'voiceAsset':line['voiceAsset'],'wordKey':jp['wordkey'],
  'source':source,'metadataSource':TABLE_BASE+'charword_table.json',
  'available':False
 }

def save_manifest():
 tmp=ROOT/'research/voices-manifest.tmp'
 tmp.write_text(json.dumps(entries,ensure_ascii=False,indent=2),encoding='utf-8')
 tmp.replace(MANIFEST)
save_manifest()

def inspect(path):
 p=subprocess.run(['ffprobe','-v','error','-show_entries','format=duration:stream=codec_name,sample_rate,channels','-of','json',str(path)],capture_output=True,text=True,check=True)
 d=json.loads(p.stdout);return float(d['format']['duration']),d['streams'][0]

def one(item):
 char_id,entry=item;wav=RAW/(char_id+'.wav');mp3=OUT/(char_id+'.mp3')
 if not wav.exists():
  for attempt in range(4):
   try:
    r=requests.get(entry['source'],timeout=(10,50));r.raise_for_status()
    assert r.content[:4]==b'RIFF',(char_id,r.headers.get('content-type'))
    wav.write_bytes(r.content);break
   except (requests.RequestException,AssertionError):
    if attempt==3:raise
    time.sleep(2+attempt*2)
 source_duration,source_stream=inspect(wav)
 assert source_duration>0 and source_stream['codec_name']=='pcm_s16le',char_id
 if not mp3.exists():
  subprocess.run(['ffmpeg','-nostdin','-hide_banner','-loglevel','error','-y','-i',str(wav),'-map','0:a:0','-c:a','libmp3lame','-q:a','2',str(mp3)],check=True)
 duration,stream=inspect(mp3)
 assert stream['codec_name']=='mp3' and abs(duration-source_duration)<.1,(char_id,source_duration,duration)
 return char_id,{'duration':duration,'sourceDuration':source_duration,'codec':'mp3','sampleRate':int(stream['sample_rate']),'channels':stream['channels'],'sha256':hashlib.sha256(mp3.read_bytes()).hexdigest(),'sourceSha256':hashlib.sha256(wav.read_bytes()).hexdigest(),'available':True}

failures={}
with concurrent.futures.ThreadPoolExecutor(6) as executor:
 futures={executor.submit(one,item):item[0] for item in entries.items()}
 for count,future in enumerate(concurrent.futures.as_completed(futures),1):
  char_id=futures[future]
  try:
   _,verified=future.result();entries[char_id].update(verified)
  except Exception as error:
   failures[char_id]=str(error);entries[char_id]['error']=str(error)
   print('FAILED',char_id,str(error),flush=True)
  if count%10==0 or count==len(entries):
   save_manifest();print('Verified',count,'/',len(entries),'failures',len(failures),flush=True)
save_manifest()
print(json.dumps({'total':len(entries),'available':sum(v['available'] for v in entries.values()),'failures':failures,'totalBytes':sum(p.stat().st_size for p in OUT.glob('*.mp3'))},ensure_ascii=True),flush=True)
if failures:raise SystemExit(1)
