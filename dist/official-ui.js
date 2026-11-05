import {readJSON} from './local-assets.js';
export async function mountOfficialUI(container,onOne,onTen,onDetails=()=>document.querySelector('#details-button').click()){
 const data=await readJSON('assets/official/ui/prefab.json');const root=data.nodes[data.root];
 const stage=document.createElement('div');stage.className='original-ui-stage';stage.style.width=root.size.x+'px';stage.style.height=root.size.y+'px';container.append(stage);
 function node(id,parent,pw,ph){const n=data.nodes[id];if(!n||!n.active||['btn_gacha_1_free','panel_free_char','btn_view_char_01','btn_view_char_02'].includes(n.name))return;
  const w=pw*(n.anchorMax.x-n.anchorMin.x)+n.size.x,h=ph*(n.anchorMax.y-n.anchorMin.y)+n.size.y;
  const x=pw*(n.anchorMin.x+(n.anchorMax.x-n.anchorMin.x)*n.pivot.x)+n.position.x-w*n.pivot.x;
  const y=ph*(n.anchorMin.y+(n.anchorMax.y-n.anchorMin.y)*n.pivot.y)+n.position.y-h*n.pivot.y;
  const el=document.createElement('div');el.className='original-ui-node';el.dataset.name=n.name;
  const q=n.rotation,angle=Math.atan2(2*(q.w*q.z+q.x*q.y),1-2*(q.y*q.y+q.z*q.z))*180/Math.PI;
  Object.assign(el.style,{width:w+'px',height:h+'px',left:x+'px',bottom:y+'px',opacity:n.opacity??1,transformOrigin:`${n.pivot.x*100}% ${(1-n.pivot.y)*100}%`,transform:`rotate(${-angle}deg) scale(${n.scale.x},${n.scale.y})`});parent.append(el);
  for(const image of n.images){const img=document.createElement('img');img.src='assets/official/ui/'+image.file;img.alt='';img.draggable=false;img.decoding='async';img.style.opacity=image.color.a;img.style.objectFit=image.preserveAspect?'contain':'fill';if(Math.max(image.color.r,image.color.g,image.color.b)===0)img.style.filter='brightness(0)';el.append(img);}
  if(n.name==='btn_gacha_1'||n.name==='btn_gacha_10'){const btn=document.createElement('button');btn.className='original-action';btn.setAttribute('aria-label',n.name==='btn_gacha_1'?'寻访一次':'寻访十次');btn.onclick=n.name==='btn_gacha_1'?onOne:onTen;btn.innerHTML='<strong class="original-action-label">'+(n.name==='btn_gacha_1'?'寻访一次':'寻访十次')+'</strong><span class="original-action-cost">免费模拟</span>';el.append(btn);}
  if(n.name==='btn_shop'||n.name==='btn_view_detail'){const button=document.createElement('button');button.className='original-inspect';button.setAttribute('aria-label','查看寻访数据契约与详情');button.onclick=()=>onDetails?.();el.append(button);}
  const labels={text_protect_countdown:'10',text_shop:'查看详情',text_shard_count:'0',shop_title_back:'寻访数据契约'};
  if(labels[n.name]){const txt=document.createElement('span');txt.className='original-runtime-text';txt.textContent=labels[n.name];el.append(txt);}
  for(const child of n.children)node(child,el,w,h);
 }
 for(const child of root.children)node(child,stage,root.size.x,root.size.y);
 const date=document.createElement('div');date.className='official-end-date';date.textContent='结束于 11月15日 03:59';stage.append(date);
 const resize=()=>{const scale=Math.min(container.clientWidth/root.size.x,container.clientHeight/root.size.y);stage.style.transform=`translate(-50%,-50%) scale(${scale})`;};new ResizeObserver(resize).observe(container);resize();
 return stage;
}
