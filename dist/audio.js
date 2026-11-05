import {readBytes,mediaURL} from './local-assets.js';
const ROOT='assets/official/sfx/';
const CUES=['g_ui_btn_h','g_ui_packagedrop','g_card_zipper','g_card_10cardsrelease','g_card_1cardrelease','g_card_checkout','g_ui_10cards','mixed_gacha_part1','mixed_gacha_part2','g_card_pad_n','g_card_pad_r','g_card_pad_sr','g_card_pad_ssr',...Array.from({length:6},(_,i)=>'mixed_gacha_star_'+(i+1))];
export class SoundSystem {
 constructor(prefs,onChange,onFallback){this.prefs=prefs;this.onChange=onChange;this.onFallback=onFallback;this.active=false;this.track=null;this.custom=null;this.buffers=new Map();this.raw=new Map();this.playing=new Set();this.pending=new Set();this.ctx=null;this.ducked=false;this.stage='lobby';this.music=new Audio();this.music.preload='auto';this.music.loop=false;this.musicPhase='intro';this.music.addEventListener('ended',()=>{if(this.track?.loopUrl&&!this.custom){this.musicPhase='loop';this.music.src=this.track.loopUrl;this.music.loop=true;if(this.active&&this.stage==='lobby')this.playMusic();}});this.music.addEventListener('error',()=>this.onFallback?.());
  this.preload=Promise.all(CUES.map(async name=>{try{this.raw.set(name,await readBytes(ROOT+name+'.mp3'));}catch{}}));
  document.addEventListener('visibilitychange',()=>{if(document.hidden){this.music.pause();this.ctx?.suspend().catch(()=>{});}else if(this.active){this.ctx?.resume().catch(()=>{});if(this.stage==='lobby')this.playMusic();}});
 }
 async setTrack(track){const generation=this.trackGeneration=(this.trackGeneration||0)+1;const[url,loopUrl]=await Promise.all([mediaURL(track.url),track.loopUrl?mediaURL(track.loopUrl):null]);if(generation!==this.trackGeneration||this.custom)return;this.track={...track,url,loopUrl};this.music.src=url;this.music.loop=!loopUrl;this.musicPhase='intro';if(this.active&&this.stage==='lobby')this.playMusic();}
 setVoices(voices){this.voices=voices;this.voiceBuffers=new Map();this.voiceRequests=new Map();}
 async voiceBuffer(id){
  if(this.voiceBuffers?.has(id))return this.voiceBuffers.get(id);
  if(this.voiceRequests?.has(id))return this.voiceRequests.get(id);
  const entry=this.voices?.[id];if(!entry?.url||!this.ctx)return null;
  const pending=readBytes(entry.url).then(b=>this.ctx.decodeAudioData(b)).then(buffer=>{this.voiceBuffers.set(id,buffer);if(this.voiceBuffers.size>12)this.voiceBuffers.delete(this.voiceBuffers.keys().next().value);return buffer;}).finally(()=>this.voiceRequests.delete(id));
  this.voiceRequests.set(id,pending);return pending;
 }
 stopVoice(){this.voiceGeneration=(this.voiceGeneration||0)+1;clearTimeout(this.voiceTimer);try{this.voiceSource?.stop();}catch{}this.voiceSource=null;this.voiceGain=null;}
 async recruitment(id,delay=1,onStart=()=>{},onEnd=()=>{}){
  this.stopVoice();const generation=this.voiceGeneration;
  if(!this.active||!this.ctx)return false;
  const began=performance.now();
  try{const buffer=await this.voiceBuffer(id);if(!buffer||generation!==this.voiceGeneration||!this.active)return false;
   const start=()=>{if(generation!==this.voiceGeneration||!this.active||this.stage!=='reveal')return;const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=buffer;gain.gain.value=this.prefs.voice??.85;source.connect(gain);gain.connect(this.ctx.destination);this.voiceSource=source;this.voiceGain=gain;source.onended=()=>{source.disconnect();gain.disconnect();if(generation===this.voiceGeneration){this.voiceSource=null;this.voiceGain=null;onEnd();}};source.start();onStart(buffer.duration);};
   this.voiceTimer=setTimeout(start,Math.max(0,delay*1000-(performance.now()-began)));return true;
  }catch{if(generation===this.voiceGeneration)this.onFallback?.();return false;}
 }
 warmVoice(id){if(this.active)this.voiceBuffer(id).catch(()=>{});}
 async unlock(){if(this.prefs.muted)return;if(!this.ctx){this.ctx=new (window.AudioContext||window.webkitAudioContext)();this.master=this.ctx.createGain();this.master.connect(this.ctx.destination);this.master.gain.value=this.prefs.sfx;}this.active=true;this.onChange?.(true);this.ctx.resume().catch(()=>{});if(this.stage==='lobby')this.playMusic();await this.preload;await Promise.all([...this.raw].filter(([n])=>!this.buffers.has(n)).map(async([n,b])=>{try{this.buffers.set(n,await this.ctx.decodeAudioData(b.slice(0)));}catch{}}));}
 async playMusic(){if(!this.active||!this.music.src||document.hidden||this.stage!=='lobby')return;this.update();try{await this.music.play();}catch(e){if(e.name!=='AbortError'&&e.name!=='NotAllowedError')this.onFallback?.();}}
 async toggle(){this.prefs.muted=this.active;if(this.active){this.active=false;this.music.pause();this.stopAll();this.ctx?.suspend().catch(()=>{});this.onChange?.(false);}else await this.unlock();}
 update(){if(this.master)this.master.gain.value=this.prefs.sfx;if(this.voiceGain)this.voiceGain.gain.value=this.prefs.voice??.85;this.music.volume=this.prefs.music*(this.ducked?.2:1);}
 duck(value){this.ducked=value;this.update();}
 cue(name,{volume=1,delay=0,loop=false}={}){if(!this.active||!this.ctx)return null;const buffer=this.buffers.get(name);if(!buffer){if(this.raw.has(name)){const token={};this.pending.add(token);this.ctx.decodeAudioData(this.raw.get(name).slice(0)).then(b=>{this.buffers.set(name,b);if(this.pending.delete(token)&&this.active)this.cue(name,{volume,delay,loop});}).catch(()=>this.pending.delete(token));}return null;}const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=buffer;source.loop=loop;gain.gain.value=volume;source.connect(gain);gain.connect(this.master);this.playing.add(source);source.onended=()=>this.playing.delete(source);source.start(this.ctx.currentTime+delay);return source;}
 click(){this.cue('g_ui_btn_h');}
 zip(){clearTimeout(this.zipTimer);if(!this.zipper)this.zipper=this.cue('g_card_zipper',{loop:true,volume:.8});this.zipTimer=setTimeout(()=>this.stopZip(),100);}
 stopZip(){clearTimeout(this.zipTimer);try{this.zipper?.stop();}catch{}this.zipper=null;}
 stopAll(){this.stopVoice();this.pending.clear();for(const source of this.playing){try{source.stop();}catch{}}this.playing.clear();this.stopZip();}
 start(){this.stage='bag';this.music.pause();this.stopAll();this.cue('mixed_gacha_part1');this.cue('g_ui_packagedrop',{delay:.917});}
 open(count,rarity){this.stopAll();this.cue(count===10?'g_card_10cardsrelease':'g_card_1cardrelease');this.cue('g_card_pad_'+(rarity===6?'ssr':rarity===5?'sr':rarity===4?'r':'n'),{delay:.25});}
 arrival(rarity){this.stage='reveal';this.stopAll();this.music.pause();this.cue('mixed_gacha_part2',{volume:.65});this.cue('mixed_gacha_star_'+rarity,{delay:.6});}
 results(){this.stage='results';this.stopAll();this.cue('g_ui_10cards');}
 lobby(){this.stage='lobby';this.stopAll();this.duck(false);this.playMusic();}
 async loadFile(file){if(this.custom)URL.revokeObjectURL(this.custom);this.custom=URL.createObjectURL(file);this.music.src=this.custom;this.music.loop=true;this.prefs.muted=false;await this.unlock();}
}
