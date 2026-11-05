import {BANNERS,freshState,poolState,sixRate,draw,configurePool,claimReward} from './engine.js';
import {SoundSystem} from './audio.js';
import {OfficialBag} from './official-bag.js';
import {mountOfficialUI} from './official-ui.js';
import {canGrabZipper,dragProgress} from './zipper-gesture.js';
import {readJSON} from './local-assets.js';
const originalBag=new OfficialBag(document.querySelector('#original-bag'));
let presentationReady=false;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const CLASS={PIONEER:'先锋',WARRIOR:'近卫',TANK:'重装',SNIPER:'狙击',CASTER:'术师',MEDIC:'医疗',SUPPORT:'辅助',SPECIAL:'特种'};
const COLORS={3:'#9bb8cb',4:'#a998da',5:'#e8c76e',6:'#f8a958'};
const SAVE='rhodes-headhunt-snowfire-v2',PREFS='rhodes-headhunt-prefs-v1';
let storageAvailable=true;
function read(key,fallback){try{const value=localStorage.getItem(key);return value?JSON.parse(value):fallback;}catch{storageAvailable=false;return fallback;}}
let state=read(SAVE,freshState());
if(!state||state.version!==2||!state.pools||!state.collection||!Array.isArray(state.history)||!state.counts||!Number.isSafeInteger(state.total)||state.total<0)state=freshState();
const prefs=Object.assign({muted:false,music:.3,sfx:.65,voice:.85,quick:false,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches},read(PREFS,{}));
prefs.music=Math.max(0,Math.min(1,Number(prefs.music)||0));prefs.sfx=Math.max(0,Math.min(1,Number(prefs.sfx)||0));prefs.voice=Math.max(0,Math.min(1,Number(prefs.voice)||0));
let operators=[],voices={},revealAssets={},banner=BANNERS.find(b=>b.id===state.selected)||BANNERS[0],currentPage='home',rarityFilter=0,search='',busy=false,batch=[],revealIndex=0,stage='closed',timers=[],returnFocus=null,inspection=false,opening=false;
const sound=new SoundSystem(prefs,active=>{document.body.classList.toggle('sound-on',active);$('#audio-toggle').setAttribute('aria-label',active?'关闭音乐与音效':'启用音乐与音效');$('#audio-toggle').title=active?'关闭声音':'启用声音';$('#play-symbol').textContent=active?'Ⅱ':'▶';$('#music-hint').textContent=active?'声音已连接 / 沉浸模式':'点击开启声音，进入寻访';savePrefs();},()=>{toast('原始音频暂时无法播放，请检查音频设置或重新载入');});
function persist(){try{localStorage.setItem(SAVE,JSON.stringify(state));}catch{if(storageAvailable)toast('本地存储不可用，本次记录仅保留到页面关闭');storageAvailable=false;}}
function savePrefs(){try{localStorage.setItem(PREFS,JSON.stringify(prefs));}catch{}}
let toastTimer;function toast(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),4000);}
function later(fn,ms){timers.push(setTimeout(fn,ms));}function clearTimers(){timers.forEach(clearTimeout);timers=[];}
function setImage(el,op){el.src=op?.art||'assets/rhodes.svg';el.alt=op?op.name+'立绘':'罗德岛';el.onerror=()=>{el.onerror=null;el.src='assets/rhodes.svg';};}
function escapeHTML(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function find(name){return operators.find(o=>o.name===name);}
function updateHome(){
 $('#banner-tabs').innerHTML=BANNERS.map((b,i)=>`<button class="banner-tab ${b.id===banner.id?'active':''}" data-banner="${b.id}" aria-pressed="${b.id===banner.id}"><span class="tab-number">0${i+1}</span>${b.title}<span class="tab-chip">${i===0?'LIMITED':'CUSTOM'}</span></button>`).join('');
 $('#banner-title').textContent=banner.title;$('#banner-english').textContent=banner.en;$('#banner-type').textContent=banner.tag;$('#banner-description').textContent=banner.subtitle;$('#banner-index').textContent=`0${BANNERS.indexOf(banner)+1} — 01`;$('.banner-series').textContent=`SPECIAL / 0${BANNERS.indexOf(banner)+1}`;
 $('#hero').style.setProperty('--accent',banner.accent);
 $('#featured-list').innerHTML=banner.up6.map((name,i)=>`<div class="featured-op"><span class="featured-star">★</span><span>${name}</span>${i===0&&banner.id==='LIMITED_79_0_1'?'<span class="op-tag">限定</span>':''}<span class="op-up">RATE UP ↑</span></div>`).join('');
 setImage($('#main-art'),find(banner.up6[0]));setImage($('#secondary-art'),find(banner.up6[1]));
 const p=poolState(state,banner.id);$('#pity-count').textContent=p.pity;$('#pity-rate').innerHTML=`${(sixRate(p.pity)*100).toFixed(2)}<span>%</span>`;$('#pity-progress').style.width=Math.min(100,p.pulls/300*100)+'%';$('#guarantee-tag').textContent=p.firstHigh?'六星保底进度已记录':`前十次必得五星及以上 · 剩余 ${Math.max(0,10-p.pulls)} 次`;
 $$('.original-ui-node[data-name=group_protect_gacha]').forEach(el=>el.style.visibility=p.firstHigh?'hidden':'visible');$$('.original-ui-node[data-name=text_protect_countdown] .original-runtime-text').forEach(el=>el.textContent=Math.max(0,10-p.pulls));$$('.original-ui-node[data-name=text_shard_count] .original-runtime-text').forEach(el=>el.textContent=p.pulls);
 $('#stat-total').textContent=String(state.total).padStart(3,'0');$('#stat-six').textContent=String(state.counts[6]).padStart(2,'0');$('#stat-collection').textContent=String(Object.keys(state.collection).length).padStart(2,'0');$('#stat-roster').textContent='/ '+operators.length;
 $('#draw-one').disabled=!operators.length||busy||!presentationReady;$('#draw-ten').disabled=!operators.length||busy||!presentationReady;$$('.original-action').forEach(b=>b.disabled=!operators.length||busy||!presentationReady);
 const label=$('.hero-bottom>span:first-child');label.innerHTML=banner.id==='LIMITED_79_0_1'?'<i class="red-dot"></i>将雪投火 · 限定寻访 <b> / </b> '+operators.length+' 名干员':'<i class="red-dot"></i>自定义主题寻访 <b> / </b> 非官方卡池';
}
$('#banner-tabs').addEventListener('click',e=>{const tab=e.target.closest('[data-banner]');if(!tab||busy)return;banner=BANNERS.find(b=>b.id===tab.dataset.banner);state.selected=banner.id;persist();sound.click();updateHome();});
function setPage(page){if(busy)return;currentPage=page;$('#home-page').hidden=page!=='home';$('#library-page').hidden=page==='home';$$('.rail-button').forEach(b=>b.classList.toggle('active',b.dataset.page===page));if(page!=='home')renderLibrary();sound.click();window.scrollTo({top:0,behavior:prefs.reduced?'instant':'smooth'});}
$$('[data-page]').forEach(b=>b.addEventListener('click',()=>setPage(b.dataset.page)));$('#history-link').onclick=()=>setPage('history');$('.brand').onclick=e=>{e.preventDefault();setPage('home');};
$('#audio-toggle').onclick=()=>sound.toggle();$('#music-play').onclick=()=>sound.toggle();
$('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('当前浏览器不支持全屏，可使用浏览器的全屏模式');}};
$('#hero').addEventListener('pointermove',e=>{if(prefs.reduced||e.pointerType==='touch')return;const r=e.currentTarget.getBoundingClientRect();e.currentTarget.style.setProperty('--mx',((e.clientX-r.left)/r.width-.5)*12+'px');e.currentTarget.style.setProperty('--my',((e.clientY-r.top)/r.height-.5)*8+'px');});$('#hero').addEventListener('pointerleave',()=>{$('#hero').style.setProperty('--mx','0px');$('#hero').style.setProperty('--my','0px');});

async function startDraw(count){
 if(busy||!operators.length||!presentationReady)return;
 const snapshot=structuredClone(state);
 try{batch=draw(state,banner,operators,count);}catch(error){state=snapshot;toast('卡池数据尚未就绪，请刷新后重试');console.error(error);return;}
 busy=true;opening=false;inspection=false;persist();updateHome();clearTimers();await sound.unlock();sound.start();sound.duck(true);
 returnFocus=document.activeElement;$('#experience').hidden=false;document.body.classList.add('modal-open');$('#experience').focus();$('#skip-animation').hidden=false;$('#bag-stage').hidden=false;$('#reveal-stage').hidden=true;$('#results-stage').hidden=true;$('#bag-shell').classList.remove('opened');$('#bag-shell').style.setProperty('--open','0');$('#bag-counter').textContent=String(count).padStart(2,'0')+' PERSONNEL FILE'+(count>1?'S':'');$('#experience').style.setProperty('--rarity',COLORS[Math.max(...batch.map(x=>x.rarity))]);stage='bag';zipProgress=0;revealIndex=0;$('#experience').dataset.phase='bag';originalBag.start?.(Math.max(...batch.map(x=>x.rarity)));$('#zipper-pull').disabled=true;later(()=>{if(!originalBag.ready||originalBag.mode==='idle')$('#zipper-pull').disabled=false;},2100);startParticles();
 batch.slice(0,2).forEach(op=>sound.warmVoice(op.id));
 if(prefs.quick||prefs.reduced){if(count===1)showReveal(0);else showResults();}
}
$('#draw-one').onclick=()=>startDraw(1);$('#draw-ten').onclick=()=>startDraw(10);
let drag=null,lastZip=0,zipProgress=0;
originalBag.onInteractive=()=>{$('#zipper-pull').disabled=false;};
function positionZipGuide(path,progress){const rect=$('#bag-stage').getBoundingClientRect(),pull=$('#zipper-pull');pull.style.setProperty('--zip-x',(path.start.x+(path.end.x-path.start.x)*progress-rect.left)+'px');pull.style.top=(path.start.y+(path.end.y-path.start.y)*progress-rect.top)+'px';}
originalBag.onZipperPath=positionZipGuide;
function zipperPath(){const p=originalBag.getZipperPath?.();if(p)return p;const r=$('#bag-stage').getBoundingClientRect();return{start:{x:r.left+r.width*.8,y:r.top+r.height*.4},end:{x:r.left+r.width*.2,y:r.top+r.height*.55}};}
$('#bag-stage').addEventListener('pointerdown',e=>{if(stage!=='bag'||opening||drag||$('#zipper-pull').disabled||!e.isPrimary||e.button!==0||e.target.closest('#open-direct'))return;const path=zipperPath(),point={x:e.clientX,y:e.clientY};if(!canGrabZipper(path,point,zipProgress,e.pointerType==='touch'))return;e.preventDefault();$('#bag-stage').setPointerCapture(e.pointerId);drag={id:e.pointerId,origin:point,path,initial:zipProgress};$('#zipper-pull').classList.add('dragging');sound.unlock();});
$('#bag-stage').addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId||stage!=='bag')return;e.preventDefault();const progress=dragProgress(drag.path,drag.origin,{x:e.clientX,y:e.clientY},drag.initial);if(Math.abs(progress-zipProgress)>.003&&performance.now()-lastZip>30){sound.zip();lastZip=performance.now();}zipProgress=progress;originalBag.setProgress?.(progress);positionZipGuide(drag.path,progress);if(progress>=.8){releaseDrag();openBag();}});
function releaseDrag(){const id=drag?.id;drag=null;$('#zipper-pull').classList.remove('dragging');sound.stopZip();if(id!==undefined&&$('#bag-stage').hasPointerCapture(id))$('#bag-stage').releasePointerCapture(id);}
function cancelDrag(){releaseDrag();zipProgress=0;if(stage==='bag'&&!opening){originalBag.setProgress?.(0);positionZipGuide(zipperPath(),0);}}
$('#bag-stage').addEventListener('pointerup',e=>{if(drag?.id===e.pointerId)releaseDrag();});
$('#bag-stage').addEventListener('pointercancel',e=>{if(drag?.id===e.pointerId)cancelDrag();});
$('#bag-stage').addEventListener('lostpointercapture',e=>{if(drag?.id===e.pointerId)cancelDrag();});
window.addEventListener('blur',cancelDrag);window.addEventListener('resize',cancelDrag);
$('#zipper-pull').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openBag();}});$('#open-direct').onclick=openBag;
function flash(){if(prefs.reduced)return;$('#flash').classList.remove('fire');void $('#flash').offsetWidth;$('#flash').classList.add('fire');}
function openBag(){if(stage!=='bag'||opening)return;opening=true;releaseDrag();zipProgress=1;$('#bag-shell').style.setProperty('--open','1');originalBag.open?.();sound.open(batch.length,Math.max(...batch.map(x=>x.rarity)));later(()=>{if(stage!=='bag')return;flash();},750);later(()=>{if(stage!=='bag')return;$('#bag-stage').hidden=true;originalBag.stop?.();showReveal(0);},1150);}
function showReveal(index){
 clearTimers();stopSubtitles();originalBag.stop?.();$('#experience').dataset.phase='reveal';stage='reveal';revealIndex=index;const op=batch[index];if(!op)return showResults();
 $('#bag-stage').hidden=true;$('#results-stage').hidden=true;$('#reveal-stage').hidden=false;$('#experience').style.setProperty('--rarity',COLORS[op.rarity]);
 $('#experience').dataset.rarity=op.rarity;const stageEl=$('#reveal-stage');stageEl.classList.remove('entering');stageEl.classList.toggle('instant',prefs.quick||prefs.reduced);stageEl.dataset.operator=op.id;stageEl.dataset.language='ja';stageEl.style.setProperty('--entry-time',op.rarity===6?'2.8s':op.rarity===5?'1.6s':'1.1s');stageEl.style.setProperty('--name-scale',op.name.length>6?'.66':op.name.length>4?'.8':'1');
 setImage($('#reveal-art'),op);$('#reveal-name').textContent=op.name;$('#reveal-en').textContent=op.en.toUpperCase();$('#reveal-stars').innerHTML=Array.from({length:op.rarity},()=>'<img src="assets/official/reveal/star.webp" alt="">').join('');$('#reveal-stars').setAttribute('aria-label',op.rarity+'星');$('#reveal-profession').src=revealAssets.professions?.[op.profession]||'assets/official/reveal/profession_warrior.webp';$('#reveal-profession').alt=CLASS[op.profession];const camp=revealAssets.operatorCamp?.[op.id]||voices[op.id]?.camp;$('#reveal-faction').src=revealAssets.factions?.[camp]||'assets/rhodes.svg';$('#reveal-new').hidden=!op.isNew;
 $('#reveal-position').textContent=`${String(index+1).padStart(2,'0')} / ${String(batch.length).padStart(2,'0')}`;$('#reveal-next').innerHTML=(inspection?'返回结果':batch.length===1?'返回寻访':index===batch.length-1?'查看寻访结果':'下一位干员')+' <span>→</span>';
 $('#reveal-native-particles').innerHTML=Array.from({length:28},(_,i)=>`<i style="--x:${(i*61.803)%100}%;--y:${(i*37.31)%100}%;--size:${5+(i*7)%18}px;--delay:${-i*.47}s;--duration:${3+(i%7)*.6}s;--tone:${i%3===0?'#fff3b0':i%3===1?'#fff':'#e3b185'}"></i>`).join('');
 void stageEl.offsetWidth;stageEl.classList.add('entering');sound.arrival(op.rarity);playRecruitment(op,(prefs.quick||prefs.reduced)?0.1:op.rarity===6?2.8:op.rarity===5?1.6:1.1);
 if(batch[index+1]?.art){const preload=new Image();preload.src=batch[index+1].art;}
 batch.slice(index+1,index+3).forEach(op=>sound.warmVoice(op.id));
 $('#reveal-next').focus({preventScroll:true});
}
let subtitleSession=0,subtitleFrame;
function stopSubtitles(){subtitleSession++;cancelAnimationFrame(subtitleFrame);$('#reveal-subtitle').textContent='';$('#reveal-stage').dataset.voice='idle';}
function playRecruitment(op,delay=0){
 stopSubtitles();const session=subtitleSession,text=voices[op.id]?.text||'',valid=()=>stage==='reveal'&&session===subtitleSession;$('#reveal-subtitle').style.setProperty('--subtitle-size',text.length>160?'17px':'21px');
 const type=()=>{if(!valid())return;$('#reveal-stage').dataset.voice='playing';const chars=Array.from(text),began=performance.now(),revealDuration=Math.min(3000,Math.max(450,chars.length/32*1000));const tick=now=>{if(!valid())return;const count=Math.min(chars.length,Math.ceil((now-began)/revealDuration*chars.length));$('#reveal-subtitle').textContent=chars.slice(0,count).join('');if(count<chars.length)subtitleFrame=requestAnimationFrame(tick);};subtitleFrame=requestAnimationFrame(tick);};
 if(!sound.active){later(()=>{if(valid())$('#reveal-subtitle').textContent=text;},delay*1000);return;}
 sound.recruitment(op.id,delay,type,()=>{if(valid()){$('#reveal-stage').dataset.voice='ended';$('#reveal-subtitle').textContent=text;}}).then(accepted=>{if(!accepted&&valid())$('#reveal-subtitle').textContent=text;});
}
$('#reveal-voice').onclick=async()=>{if(stage!=='reveal')return;if(!sound.active){prefs.muted=false;await sound.unlock();}playRecruitment(batch[revealIndex]);};
function nextReveal(){if(stage!=='reveal')return;sound.click();if(inspection){inspection=false;showResults();}else if(revealIndex+1<batch.length)showReveal(revealIndex+1);else if(batch.length===1)closeExperience();else showResults();}
$('#reveal-next').onclick=nextReveal;
function showResults(){
 if(!busy)return;clearTimers();stopSubtitles();releaseDrag();originalBag.stop?.();$('#experience').dataset.phase='results';sound.results();stage='results';$('#bag-stage').hidden=true;$('#reveal-stage').hidden=true;$('#results-stage').hidden=false;$('#skip-animation').hidden=true;sound.duck(false);$('#result-cards').dataset.count=batch.length;$('#result-cards').innerHTML=batch.map((op,i)=>`<button class="result-card ${batch.length===1?'single-result':''}" style="--rarity:${COLORS[op.rarity]};--i:${i}" data-rarity="${op.rarity}" data-result="${i}" aria-label="查看${escapeHTML(op.name)}，${op.rarity}星${op.isNew?'，首次获得':''}"><span class="result-light" aria-hidden="true"><i class="result-beam"></i><i class="result-halo"></i><i class="result-dots"></i></span><span class="result-portrait"><img src="assets/official/results/${op.id}.webp" alt="" loading="eager" draggable="false"></span><span class="card-stars" aria-hidden="true"><img src="assets/official/reveal/result_star_${op.rarity}.webp" alt=""></span><span class="result-profession" aria-hidden="true"><img src="assets/official/results/class_${op.profession.toLowerCase()}.webp" alt=""></span>${op.isNew?'<span class="card-new">NEW</span>':''}<span class="sr-only">${escapeHTML(op.name)} · ${CLASS[op.profession]}</span></button>`).join('');
 $('#result-cards').querySelectorAll('img').forEach(el=>el.onerror=()=>{el.onerror=null;el.src='assets/rhodes.svg';});
 $('#results-caption').textContent=`已接收 ${batch.length} 份人事档案 · ${batch.filter(o=>o.isNew).length} 位新干员 · 记录已${storageAvailable?'保存至本机':'暂存'}`;$('#result-again').textContent=`再次寻访${batch.length===10?'十':'一'}次 ↗`;$('#result-close').focus({preventScroll:true});
}
$('#skip-animation').onclick=()=>{sound.click();inspection=false;if(batch.length===1){if(stage==='bag')showReveal(0);else closeExperience();}else showResults();};
$('#result-cards').onclick=e=>{const card=e.target.closest('[data-result]');if(!card)return;inspection=true;$('#skip-animation').hidden=true;showReveal(Number(card.dataset.result));};
function closeExperience(){clearTimers();stopSubtitles();releaseDrag();zipProgress=0;busy=false;stage='closed';opening=false;drag=null;$('#experience').hidden=true;document.body.classList.remove('modal-open');sound.lobby();originalBag.stop?.();stopParticles();updateHome();if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});}
$('#result-close').onclick=closeExperience;$('#result-again').onclick=()=>{const count=batch.length;closeExperience();startDraw(count);};
document.addEventListener('keydown',e=>{if(!busy||$('#modal').open)return;if(e.key==='Escape'){e.preventDefault();if(stage==='results'||(stage==='reveal'&&batch.length===1&&!inspection))closeExperience();else if(inspection){inspection=false;showResults();}else showResults();}if((e.key===' '||e.key==='Enter')&&e.target===$('#experience')){e.preventDefault();if(stage==='bag')openBag();else if(stage==='reveal')nextReveal();}});
$('#experience').addEventListener('keydown',e=>{if(e.key!=='Tab')return;const buttons=[...$('#experience').querySelectorAll('button')].filter(el=>el.offsetParent!==null&&!el.disabled);if(!buttons.length)return;const first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement===$('#experience'))){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});

function openModal(title,eyebrow,html){$('#modal-title').textContent=title;$('#modal-eyebrow').textContent=eyebrow;$('#modal-body').innerHTML=html;$('#modal').showModal();sound.click();}
$('#modal-close').onclick=()=>$('#modal').close();$('#modal').addEventListener('click',e=>{if(e.target===$('#modal')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
$('#settings-button').onclick=()=>{
 openModal('音频与演出','TERMINAL SETTINGS',`<label class="setting-row"><div>背景音乐<small>生命流 · 客户端默认主界面音乐（前奏 → 循环）</small></div><input id="music-volume" type="range" min="0" max="100" value="${prefs.music*100}" aria-label="音乐音量"></label><label class="setting-row"><div>交互与演出音效<small>按键、拉链、开包与稀有度登场</small></div><input id="sfx-volume" type="range" min="0" max="100" value="${prefs.sfx*100}" aria-label="音效音量"></label><label class="setting-row"><div>日语报到语音<small>干员原始日语配音，显示中文报到字幕</small></div><input id="voice-volume" type="range" min="0" max="100" value="${prefs.voice*100}" aria-label="日语语音音量"></label><label class="setting-row"><div>快速寻访<small>直接展示结果，保留抽卡规则</small></div><input id="quick-mode" type="checkbox" class="switch" ${prefs.quick?'checked':''}></label><label class="setting-row"><div>减少动态效果<small>关闭粒子与闪光，直接展示结算</small></div><input id="reduced-motion" type="checkbox" class="switch" ${prefs.reduced?'checked':''}></label><div class="setting-row"><label class="music-file">载入本地音乐<input type="file" id="music-file" accept="audio/*" hidden></label><button class="danger-button" id="reset-data">清空模拟记录</button></div><p class="modal-note">本地音乐仅在当前页面播放，不会上传。记录保存在此浏览器。音乐首次播放需要点击开启；按键、落包、拉链、开包及星级音效均为客户端原始音频。<br>本项目为非商业同人体验，非官方客户端。默认音乐及音效来自客户端事件配置，美术素材归原权利人所有。</p>`);
 $('#music-volume').oninput=e=>{prefs.music=e.target.value/100;sound.update();savePrefs();};$('#sfx-volume').oninput=e=>{prefs.sfx=e.target.value/100;sound.update();savePrefs();};$('#voice-volume').oninput=e=>{prefs.voice=e.target.value/100;sound.update();savePrefs();};$('#quick-mode').onchange=e=>{prefs.quick=e.target.checked;savePrefs();};$('#reduced-motion').onchange=e=>{prefs.reduced=e.target.checked;savePrefs();};
 $('#music-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;await sound.loadFile(file);$('#track-name').textContent='LOCAL / '+file.name;toast('已载入本地音乐');};
 $('#reset-data').onclick=()=>{openModal('清空模拟记录？','LOCAL DATA',`<p class="rule-copy">这会清空此浏览器的全部寻访记录、干员收集和各卡池保底进度。</p><div class="setting-row"><button class="outline-button" id="cancel-reset">保留记录</button><button class="primary-button" id="confirm-reset">确认清空</button></div>`);$('#cancel-reset').onclick=()=>$('#modal').close();$('#confirm-reset').onclick=()=>{state=freshState();state.selected=banner.id;persist();updateHome();if(currentPage!=='home')renderLibrary();$('#modal').close();toast('模拟记录已清空');};};
};
$('#details-button').onclick=()=>{
 const p=poolState(state,banner.id);
 openModal('将雪投火 · 寻访详情','PRTS / LIMITED_79_0_1',`<table class="probability-table"><thead><tr><th>星级</th><th>基础权重</th><th>概率提升</th></tr></thead><tbody><tr><td>★★★★★★</td><td>2</td><td>塔露拉 / 冻河 · 各 35 权重</td></tr><tr><td>★★★★★</td><td>8</td><td>奥尔佳 · 50% </td></tr><tr><td>★★★★</td><td>50</td><td>—</td></tr><tr><td>★★★</td><td>40</td><td>—</td></tr></tbody></table><div class="rule-copy"><p>完整名单 ${operators.length} 名。凛御银灰、新约能天使、荒芜拉普兰德按 PRTS 数据应用五倍权重。</p><p><strong>本模拟沿用 PRTS 当前代码：</strong>连续 50 次未出六星后增加六星权重，再整体归一化；因此该实现没有“第 99 抽必出”的硬保底。首九抽未获得五星以上时，第十抽按其代码替换为五星。它与官方公告的标称概率存在差异。</p><p>当前六星实际抽样概率 ${(sixRate(p.pity)*100).toFixed(2)}%。历史卡池已替换，新池进度独立保存，旧版浏览器存档未删除。</p><p><strong>300 次额外赠送：</strong>已寻访 ${p.pulls} / 300 次。额外领取塔露拉不重置六星计数、不增加寻访次数。${p.rewardClaimed?'已领取。':''}</p><button class="primary-button" id="claim-reward" ${p.pulls<300||p.rewardClaimed?'disabled':''}>${p.rewardClaimed?'已领取塔露拉':'领取额外赠送 · 塔露拉'}</button><p>本版未实现寻访数据契约交换所。<a href="https://prts.wiki/w/将雪投火" target="_blank" rel="noopener">PRTS 资料 ↗</a></p></div>`);
 $('#claim-reward').onclick=()=>{const op=claimReward(state,operators);if(op){persist();updateHome();$('#modal').close();toast('已领取额外赠送：塔露拉');}};
};
function renderLibrary(){
 const collection=currentPage==='collection';$('#library-title').textContent=collection?'干员档案':'寻访记录';$('#library-eyebrow').textContent=collection?'PERSONNEL ARCHIVE / LOCAL COLLECTION':'RECRUITMENT LOG / LOCAL ARCHIVE';$('#export-button').hidden=collection;
 let entries=collection?operators.filter(o=>state.collection[o.id]).sort((a,b)=>b.rarity-a.rarity||state.collection[b.id]-state.collection[a.id]):state.history;
 entries=entries.filter(o=>(!rarityFilter||o.rarity===rarityFilter)&&(!search||o.name.toLowerCase().includes(search)||o.en.toLowerCase().includes(search)));
 $('#library-summary').textContent=collection?`已收集 ${Object.keys(state.collection).length} / ${operators.length} 名干员 · 当前显示 ${entries.length} 名`:`累计 ${state.total} 次寻访 · 六星 ${state.counts[6]} 次 · 当前显示 ${entries.length} 条 · 最多保留最近 1000 条`;
 if(!entries.length){$('#library-content').innerHTML=`<div class="empty-state"><svg><use href="#i-${collection?'collection':'history'}"/></svg><h3>${state.total?'没有匹配的记录':'尚未开始的旅途'}</h3><p>${state.total?'试试其他星级或干员名字。':'新的干员，正在等待你的呼唤。'}</p><button class="outline-button" id="empty-back">前往寻访 →</button></div>`;$('#empty-back').onclick=()=>setPage('home');return;}
 if(collection){$('#library-content').innerHTML=`<div class="archive-grid">${entries.map(o=>`<button class="archive-card" data-operator="${o.id}" style="--rarity:${COLORS[o.rarity]}"><img src="${o.art||'assets/rhodes.svg'}" alt="${o.name}" loading="lazy"><div class="archive-info"><span>${'★'.repeat(o.rarity)}</span><strong>${o.name}</strong><small><span>${CLASS[o.profession]}</span><span>获得 ×${state.collection[o.id]}</span></small></div></button>`).join('')}</div>`;}else{
 $('#library-content').innerHTML=`<table class="history-table"><thead><tr><th>序号</th><th>干员</th><th>稀有度</th><th>寻访卡池</th><th>时间</th></tr></thead><tbody>${entries.map(o=>`<tr class="${o.rarity===6?'six-star':''}" style="--rarity:${COLORS[o.rarity]}"><td>${String(o.index).padStart(3,'0')}</td><td>${o.name}${o.isNew?'<span class="history-new">NEW</span>':''}</td><td class="history-stars">${'★'.repeat(o.rarity)}</td><td>${BANNERS.find(b=>b.id===o.banner)?.title||'未知'}</td><td>${new Date(o.time).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})}</td></tr>`).join('')}</tbody></table>`;}
}
$('#filter-tabs').onclick=e=>{const b=e.target.closest('[data-rarity]');if(!b)return;rarityFilter=Number(b.dataset.rarity);$$('#filter-tabs button').forEach(el=>el.classList.toggle('active',el===b));renderLibrary();};$('#operator-search').oninput=e=>{search=e.target.value.trim().toLowerCase();renderLibrary();};
$('#library-content').onclick=e=>{const b=e.target.closest('[data-operator]');if(!b)return;const o=operators.find(o=>o.id===b.dataset.operator);openModal(o.name,'PERSONNEL FILE / '+o.en.toUpperCase(),`<img class="detail-art" src="${o.art||'assets/rhodes.svg'}" alt="${o.name}"><div class="detail-stats"><span style="color:${COLORS[o.rarity]}">${'★'.repeat(o.rarity)}</span><span>${CLASS[o.profession]}干员</span><span>已获得 ${state.collection[o.id]} 次</span></div>`);};
$('#export-button').onclick=()=>{if(!state.history.length){toast('还没有可以导出的寻访记录');return;}const data={exportedAt:new Date().toISOString(),...state};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='rhodes-headhunt-'+new Date().toISOString().slice(0,10)+'.json';a.click();later(()=>URL.revokeObjectURL(url),2000);toast('已导出寻访记录');};

let particleFrame=0,particleTime=0,points=[];const canvas=$('#particles'),ctx=canvas.getContext('2d');
function resizeParticles(){const dpr=Math.min(devicePixelRatio||1,2);canvas.width=innerWidth*dpr;canvas.height=innerHeight*dpr;ctx?.setTransform(dpr,0,0,dpr,0,0);}
function startParticles(){stopParticles();if(prefs.reduced||!ctx)return;resizeParticles();points=Array.from({length:innerWidth<760?35:75},()=>({x:Math.random()*innerWidth,y:Math.random()*innerHeight,v:.1+Math.random()*.45,r:.5+Math.random()*1.3,a:.1+Math.random()*.3}));particleTime=0;const loop=t=>{if(!busy)return;const dt=Math.min(3,(t-(particleTime||t))/16.67);particleTime=t;ctx.clearRect(0,0,innerWidth,innerHeight);const color=stage==='reveal'&&batch[revealIndex]?.rarity>=5?'238,192,119':'150,195,204';for(const p of points){p.y-=p.v*dt;if(p.y<0){p.y=innerHeight;p.x=Math.random()*innerWidth;}ctx.fillStyle=`rgba(${color},${p.a})`;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();}particleFrame=requestAnimationFrame(loop);};particleFrame=requestAnimationFrame(loop);}
function stopParticles(){cancelAnimationFrame(particleFrame);particleFrame=0;ctx?.clearRect(0,0,innerWidth,innerHeight);}
window.addEventListener('resize',()=>{if(busy)resizeParticles();});
window.addEventListener('pagehide',()=>{stopParticles();sound.music.pause();});

function prepareLayout(){
 const nav=document.createElement('div');nav.className='official-nav';$$('.rail-button').forEach(b=>nav.append(b));$('.top-actions').prepend(nav);
 const portrait=document.createElement('div');portrait.className='portrait-actions';for(const [count,label] of [[1,'寻访一次'],[10,'寻访十次']]){const button=document.createElement('button');button.className='original-action mobile-action';button.dataset.count=count;button.setAttribute('aria-label',label);button.innerHTML='<strong class="original-action-label">'+label+'</strong><span class="original-action-cost">免费模拟</span>';button.onclick=()=>$(count===1?'#draw-one':'#draw-ten').click();portrait.append(button);}$('#home-page').append(portrait);
 $('.terminal-label').innerHTML='<button class="official-home-mark" aria-label="返回寻访">⌂</button><strong class="official-page-label">干员寻访</strong><span>HEADHUNTING</span>';$('.official-home-mark').onclick=()=>setPage('home');
 const sidebar=document.createElement('aside');sidebar.className='pool-menu';sidebar.innerHTML='<div class="pool-category">限定寻访</div><div class="pool-selected"><img src="assets/banner-snowfire.webp" alt="将雪投火卡池"><strong>将雪投火</strong><span>11.01 — 11.15</span></div><p>模拟寻访 · 无需消耗资源</p>';
 sidebar.append($('#details-button'));$('#home-page').prepend(sidebar);
 $('#bag-stage').append($('#zipper-track'));$('#zipper-pull').innerHTML='<span class="drag-chevron" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="m14 6-10 10 10 10m14-20L18 16l10 10"/></svg></span>';
}
prepareLayout();
document.addEventListener('inspect-operator',event=>{const o=find(event.detail);if(!o)return;openModal(o.name,'OPERATOR / '+o.en.toUpperCase(),`<img class="detail-art" src="${o.art}" alt="${o.name}"><div class="detail-stats"><span style="color:${COLORS[o.rarity]}">${'★'.repeat(o.rarity)}</span><span>${CLASS[o.profession]}</span><span>已获得 ${state.collection[o.id]||0} 次</span></div>`);});
document.addEventListener('pointerdown',e=>{if(!sound.active&&!prefs.muted&&!e.target.closest('#audio-toggle,#music-play'))sound.unlock();},{capture:true});
async function init(){
 $('#draw-one').disabled=true;$('#draw-ten').disabled=true;
 try{const[data,pool,voiceData,revealData]=await Promise.all([readJSON('operators.json'),readJSON('pool.json'),readJSON('voices.json'),readJSON('reveal-assets.json')]);configurePool(pool);operators=data;voices=voiceData;revealAssets=revealData;sound.setVoices(voices);if(!Array.isArray(operators)||!operators.length)throw new Error('Invalid data');await Promise.all([originalBag.promise.catch(()=>{toast('此浏览器无法启用 3D，已使用原版包体静态画面');return false;}),mountOfficialUI($('#game-ui'),()=>$('#draw-one').click(),()=>$('#draw-ten').click())]);presentationReady=true;updateHome();if(currentPage!=='home')renderLibrary();if(!storageAvailable)toast('浏览器未允许本地存储，记录将在页面关闭后消失');}catch(error){console.error(error);toast('干员数据加载失败，请刷新页面后重试');$('#banner-description').textContent='数据连接中断，请刷新页面后重试。';}
 try{const music=await readJSON('music.json');await sound.setTrack(music);$('#track-name').textContent=music.name;}catch{}
}
init();
