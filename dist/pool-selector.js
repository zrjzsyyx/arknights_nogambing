// Original client artwork and square, high-contrast navigation adapted for browsers.
export function mountPoolSelector(sidebar,banners,onSelect){
 const list=document.createElement('nav');list.className='pool-list';list.setAttribute('aria-label','选择寻访卡池');
 for(const [index,b] of banners.entries()){
  if(index===0||b.linkage){const label=document.createElement('div');label.className='pool-group-label';label.textContent=b.linkage?'联动寻访 / 2024':'限定寻访 / 2026';list.append(label);}
  const button=document.createElement('button');button.className='pool-option';button.dataset.pool=b.id;button.style.setProperty('--pool-accent',b.accent);button.setAttribute('aria-label',b.title+'，'+b.tag);button.setAttribute('aria-pressed','false');
  const image=document.createElement('img');image.src=b.image;image.alt='';image.draggable=false;
  const copy=document.createElement('span');copy.className='pool-option-copy';
  const title=document.createElement('strong');title.textContent=b.title;
  const meta=document.createElement('span');meta.innerHTML=`<span>${b.year} / ${b.dates}</span><b>${b.series}</b>`;
  copy.append(title,meta);button.append(image,copy);button.onclick=()=>onSelect(b.id);list.append(button);
 }
 list.addEventListener('keydown',event=>{
  if(!['ArrowDown','ArrowUp','ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  const options=[...list.querySelectorAll('button')],index=options.indexOf(document.activeElement);if(index<0)return;
  event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?options.length-1:(index+(['ArrowDown','ArrowRight'].includes(event.key)?1:-1)+options.length)%options.length;
  options[next].focus();
 });
 sidebar.append(list);
 let currentId=null,currentBusy=true;
 return(id,busy=false)=>{
  for(const button of list.querySelectorAll('button')){const active=button.dataset.pool===id;button.classList.toggle('selected',active);button.setAttribute('aria-pressed',String(active));button.disabled=busy;}
  const shouldScroll=currentId!==id||(currentBusy&&!busy);currentId=id;currentBusy=busy;
  if(shouldScroll)requestAnimationFrame(()=>list.querySelector('.selected')?.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'}));
 };
}

export {mountHistoricalUI as mountPoolScene} from './historical-ui.js';
