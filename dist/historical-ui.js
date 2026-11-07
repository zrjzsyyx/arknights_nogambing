// Render the historical client's actual RectTransform/sprite hierarchy.
const SKIP=new Set(['group_entry_anim','btn_gacha_1_free','panel_free_char','recruit_free_char','use_10_tk','use_limit_10_tk','use_tk','use_diamond','use_free_tk','group_free_cd','multi_item','multi_gacha_item','diamond_shield_item','single_item','limit_pool_part(Clone)']);
const SVG='http://www.w3.org/2000/svg';
const rgba=c=>`rgba(${c.r*255},${c.g*255},${c.b*255},${c.a??1})`;

export function mountHistoricalUI(container,onOne,onTen,onDetails,layouts){
 const cache=new Map();let current=null;
 const resize=()=>{if(!current)return;const {stage,root}=current;const scale=Math.min(container.clientWidth/root.size.x,container.clientHeight/root.size.y);stage.style.transform=`translate(-50%,-50%) scale(${scale})`;};
 new ResizeObserver(resize).observe(container);

 function mount(banner){
  const data=layouts()[banner.id];if(!data)throw Error('Missing original layout: '+banner.id);
  const root=data.nodes[data.root],base=banner.ui.slice(0,banner.ui.lastIndexOf('/')+1);
  const stage=document.createElement('div');stage.className='original-ui-stage historical-ui-stage';stage.dataset.pool=banner.id;stage.dataset.originalMd5=data.source.md5;
  stage.style.width=root.size.x+'px';stage.style.height=root.size.y+'px';
  const svg=document.createElementNS(SVG,'svg');svg.classList.add('svg-defs');svg.setAttribute('aria-hidden','true');const defs=document.createElementNS(SVG,'defs');svg.append(defs);stage.append(svg);
  const filters=new Map(),elements=new Map(),runtime=new Map();
  function filter(color){
   if(color.r===1&&color.g===1&&color.b===1)return '';
   const key=[color.r,color.g,color.b].join(',');if(filters.has(key))return filters.get(key);
   const id='native-'+banner.id+'-'+filters.size,el=document.createElementNS(SVG,'filter'),matrix=document.createElementNS(SVG,'feColorMatrix');el.id=id;el.setAttribute('color-interpolation-filters','sRGB');matrix.setAttribute('type','matrix');matrix.setAttribute('values',`${color.r} 0 0 0 0 0 ${color.g} 0 0 0 0 0 ${color.b} 0 0 0 0 0 1 0`);el.append(matrix);defs.append(el);const result=`url(#${id})`;filters.set(key,result);return result;
  }
  function text(el,n,value){
   const span=document.createElement('span'),style=n.textStyle||{fontSize:20,alignment:4,color:{r:1,g:1,b:1,a:1}};
   span.className='original-runtime-text native-text';span.textContent=value;
   const align=style.alignment??4;Object.assign(span.style,{fontSize:style.fontSize+'px',color:rgba(style.color),display:'flex',alignItems:align<3?'flex-start':align<6?'center':'flex-end',justifyContent:align%3===0?'flex-start':align%3===1?'center':'flex-end',textAlign:['left','center','right'][align%3],lineHeight:'1.1',whiteSpace:'pre',fontFamily:n.fontName?.includes('Novecento')?'Novecento, sans-serif':n.fontName?.includes('Bender')?'Bender, sans-serif':'HeadhuntCJK, "Microsoft YaHei", sans-serif',fontWeight:n.fontName?.match(/Heavy|Bold/)?'700':'400'});
   el.append(span);if(!runtime.has(n.name))runtime.set(n.name,[]);runtime.get(n.name).push(span);
  }
  function node(id,parent,pw,ph){
   const n=data.nodes[id];if(!n||!n.active||SKIP.has(n.name))return;
   let w=pw*(n.anchorMax.x-n.anchorMin.x)+n.size.x,h=ph*(n.anchorMax.y-n.anchorMin.y)+n.size.y;
   if(n.runtimeSprite){[w,h]=data.sprites[n.runtimeSprite].canvas;}
   if(n.name==='end_day_layout'&&n.layout){w=n.children.reduce((sum,id)=>sum+(data.nodes[id]?.size.x||0),0)+n.layout.spacing*Math.max(0,n.children.length-1);}
   const x=pw*(n.anchorMin.x+(n.anchorMax.x-n.anchorMin.x)*n.pivot.x)+n.position.x-w*n.pivot.x;
   const y=ph*(n.anchorMin.y+(n.anchorMax.y-n.anchorMin.y)*n.pivot.y)+n.position.y-h*n.pivot.y;
   const el=document.createElement('div');el.className='original-ui-node historical-ui-node';el.dataset.name=n.name;el.dataset.node=id;
   const q=n.rotation,angle=Math.atan2(2*(q.w*q.z+q.x*q.y),1-2*(q.y*q.y+q.z*q.z))*180/Math.PI;
   Object.assign(el.style,{width:w+'px',height:h+'px',left:x+'px',bottom:y+'px',opacity:n.opacity??1,transformOrigin:`${n.pivot.x*100}% ${(1-n.pivot.y)*100}%`,transform:`rotate(${-angle}deg) scale(${n.scale.x},${n.scale.y})`});
   if(n.rectMask||n.mask)el.style.overflow='hidden';
   if(n.name==='end_day_layout'&&n.layout){el.style.display='flex';el.style.alignItems='center';el.style.gap=n.layout.spacing+'px';el.style.width='max-content';el.style.left=(x+w*n.pivot.x)+'px';el.style.transform=`translateX(${-n.pivot.x*100}%) rotate(${-angle}deg) scale(${n.scale.x},${n.scale.y})`;}
   if(parent.dataset.name==='end_day_layout'){el.style.position='relative';el.style.left='auto';el.style.bottom='auto';el.style.flexShrink='0';if(n.textStyle){el.style.width='max-content';el.style.height='auto';}else if(w===0&&n.images[0]?.sprite){el.style.width=(data.sprites[n.images[0].sprite]?.canvas[0]||1)+'px';}}
   parent.append(el);if(!elements.has(n.name))elements.set(n.name,[]);elements.get(n.name).push(el);
   for(const original of n.images){
    const im=n.runtimeSprite?{...original,file:data.sprites[n.runtimeSprite].file,sprite:n.runtimeSprite}:original;
    if(n.mask&&!n.showMaskGraphic)continue;
    if(!im.file){const solid=document.createElement('span');solid.className='native-solid';solid.style.background=rgba(im.color);if(im.maskData){solid.style.maskImage=`url("${im.maskData}")`;solid.style.maskSize='100% 100%';}el.append(solid);continue;}
    const image=document.createElement('img');image.src=base+im.file;image.alt='';image.draggable=false;image.decoding='async';image.dataset.sprite=im.sprite;
    const mat=im.materialColor||{r:1,g:1,b:1,a:1},color={r:mat.r*(im.rgbControl?1:im.color.r),g:mat.g*(im.rgbControl?1:im.color.g),b:mat.b*(im.rgbControl?1:im.color.b)};
    image.style.opacity=im.color.a*(mat.a??1);image.style.objectFit=im.preserveAspect?'contain':'fill';image.style.filter=filter(color);if(im.additive)image.style.mixBlendMode='screen';el.append(image);
   }
   for(const source of n.texts)text(el,n,source.text);
   if(!n.texts.length&&n.textStyle&&['text_secure_3','remain_times','text_end_time','text_shard_count','text_protect_countdown'].includes(n.name))text(el,n,'');
   if(parent.dataset.name==='end_day_layout'&&n.textStyle)el.querySelectorAll('.native-text').forEach(span=>{span.style.position='relative';span.style.inset='auto';});
   const count=['btn_gacha_1','btn_gacha'].includes(n.name)?1:['btn_gacha_10','btn_10_gacha'].includes(n.name)?10:0;
   if(count){const button=document.createElement('button');button.className='original-action historical-action';button.dataset.count=count;button.setAttribute('aria-label',count===1?'寻访一次':'寻访十次');button.onclick=count===1?onOne:onTen;el.append(button);}
   if(n.name==='btn_shop'||n.name==='btn_view_detail'||n.name==='click_button (2)'){
    const button=document.createElement('button');button.className='original-inspect';button.setAttribute('aria-label','查看'+banner.title+'寻访详情');button.onclick=onDetails;el.append(button);
   }
   if(n.name==='btn_view_char_01'||n.name==='btn_view_char_02'){
    const names=banner.id==='LIMITED_73_0_1'?[...banner.up6].reverse():banner.up6,name=names[n.name.endsWith('01')?0:1];
    const button=document.createElement('button');button.className='original-inspect';button.setAttribute('aria-label','查看'+name);button.onclick=()=>document.dispatchEvent(new CustomEvent('inspect-operator',{detail:name}));el.append(button);
   }
   for(const child of n.children)node(child,el,w,h);
  }
  for(const child of root.children)node(child,stage,root.size.x,root.size.y);
  // Costs are removed for the simulator; the two native recruitment labels remain.
  const setText=(name,value)=>runtime.get(name)?.forEach(el=>el.textContent=value);
  setText('text_shop','查看详情');setText('shop_title_back','寻访数据契约');
  const end=banner.endText.match(/(\d+)月(\d+)日\s+(\d+:\d+)/);if(end){setText('text_end_month',end[1].padStart(2,'0'));setText('text_end_day',end[2].padStart(2,'0'));setText('text_end_time',end[3]);}
  const result={stage,root,elements,runtime,setText};cache.set(banner.id,result);return result;
 }

 return(banner,operators,p,rate,ready)=>{
  if(current?.stage.dataset.pool!==banner.id){current=cache.get(banner.id)||mount(banner);container.replaceChildren(current.stage);container.dataset.pool=banner.id;container.setAttribute('aria-label',banner.title+'原版寻访界面');}
  current.elements.get('group_protect_gacha')?.forEach(el=>el.style.visibility=p.firstHigh?'hidden':'visible');
  current.setText('text_protect_countdown',Math.max(0,10-p.pulls));current.setText('text_shard_count',p.pulls);
  if(banner.linkage){
   const visible=(name,show)=>current.elements.get(name)?.forEach(el=>el.style.visibility=show?'visible':'hidden');
   visible('protect_part',!p.firstHigh);current.setText('remain_times',Math.max(0,10-p.pulls));
   visible('secure_3',!p.linkageTargetObtained);current.setText('text_secure_3',Math.max(0,120-p.pulls));
   visible('secure_1',!p.linkagePairComplete&&p.linkageFirst5==='char_4144_chilc');visible('secure_2',!p.linkagePairComplete&&p.linkageFirst5==='char_4142_laios');
  }
  current.stage.querySelectorAll('.historical-action').forEach(el=>el.disabled=!ready);resize();
 };
}
