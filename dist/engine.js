import {M,I,L,U} from './prts-core.js';
export const BANNERS=[{id:'LIMITED_79_0_1',title:'将雪投火',en:'CINDERS OF SNOW',tag:'限定寻访 · 庆典',subtitle:'2026.11.01 — 2026.11.15',up6:['塔露拉','冻河'],up5:['奥尔佳'],accent:'#d43e2a'}];
let reference=null;
export function configurePool(data){if(data.gachaPoolId!==BANNERS[0].id)throw Error('Incorrect pool');reference=data;}
export function freshState(){return {version:2,selected:BANNERS[0].id,pools:{},collection:{},history:[],total:0,counts:{3:0,4:0,5:0,6:0}};}
export function poolState(s,id){return s.pools[id]??={pity:0,pulls:0,firstHigh:false,guarantee5Avail:reference?.client.guarantee5Avail??1,rewardClaimed:false};}
export function sixRate(pity){const weight=2+(pity>=50?(pity-49)*2:0);return weight/(weight+98);}
export function draw(s,banner,operators,count,rng=Math.random,now=Date.now()){
 if(!reference||![1,10].includes(count))throw Error('Invalid pool or count');
 const p=poolState(s,banner.id),out=[],original=Math.random;
 try{Math.random=rng;for(let i=0;i<count;i++){
  const core={non6StarCount:p.pity,counter:p.pulls,guarantee5Count:reference.client.guarantee5Count,guarantee5Avail:p.guarantee5Avail};
  const tier=M(core,reference.availCharInfo.perAvailList);
  let result=I(reference.availCharInfo.perAvailList,tier,reference.upCharInfo,reference.weightUpCharInfoList);
  core.counter++;
  if(L(core)){const forced=U(core,reference.availCharInfo.perAvailList,tier,reference.upCharInfo);if(forced)result=forced;}
  const op=operators.find(o=>o.id===result.charId);if(!op)throw Error('Missing operator '+result.charId);
  const item={...op,isNew:!s.collection[op.id],index:s.total+1,time:now,banner:banner.id};
  s.collection[op.id]=(s.collection[op.id]||0)+1;s.total++;s.counts[op.rarity]++;s.history.unshift(item);out.push(item);
  p.pulls=core.counter;p.guarantee5Avail=core.guarantee5Avail;p.firstHigh=core.guarantee5Avail<=0;p.pity=op.rarity===6?0:p.pity+1;
 }}finally{Math.random=original;}
 s.history=s.history.slice(0,1000);return out;
}
export function claimReward(s,operators){const p=poolState(s,BANNERS[0].id);if(p.pulls<300||p.rewardClaimed)return null;const op=operators.find(o=>o.id===reference.client.limitParam.limitedCharId);if(!op)throw Error('Missing reward');p.rewardClaimed=true;s.collection[op.id]=(s.collection[op.id]||0)+1;return op;}
