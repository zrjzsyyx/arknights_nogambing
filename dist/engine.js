import {M,I,L,U} from './prts-core.js';
export const BANNERS=[
 {id:'LIMITED_79_0_1',title:'将雪投火',en:'CINDERS OF SNOW',tag:'限定寻访 · 庆典',series:'庆典',year:2026,subtitle:'2026.11.01 — 2026.11.15',dates:'11.01 — 11.15',endText:'结束于 11月15日 03:59',up6:['塔露拉','冻河'],up5:['奥尔佳'],accent:'#d43e2a',image:'assets/banner-snowfire.webp',native:true},
 {id:'LIMITED_70_0_1',title:'劫尽古今',en:'LIMITED HEADHUNTING',tag:'限定寻访 · 春节',series:'春节',year:2026,subtitle:'2026.02.10 — 2026.02.24',dates:'02.10 — 02.24',endText:'结束于 2月24日 03:59',up6:['望','赤刃明霄陈'],up5:['风絮'],accent:'#ef8a24',image:'assets/banner-wang.webp',ui:'assets/official/pools/limited_70_0_1/prefab.json'},
 {id:'LIMITED_73_0_1',title:'承诺',en:'LIMITED HEADHUNTING',tag:'限定寻访 · 庆典',series:'庆典',year:2026,subtitle:'2026.05.01 — 2026.05.15',dates:'05.01 — 05.15',endText:'结束于 5月15日 03:59',up6:['凯尔希·思衡托','可露希尔'],up5:['裂响'],accent:'#b4cb34',image:'assets/banner-promise.webp',ui:'assets/official/pools/limited_73_0_1/prefab.json'},
 {id:'LIMITED_76_0_1',title:'车辙与风的归所',en:'LIMITED HEADHUNTING',tag:'限定寻访 · 夏季',series:'夏季',year:2026,subtitle:'2026.08.01 — 2026.08.15',dates:'08.01 — 08.15',endText:'结束于 8月15日 03:59',up6:['予愿安洁莉娜','珊比'],up5:['嘉辛塔'],accent:'#33cbbd',image:'assets/banner-summer.webp',ui:'assets/official/pools/limited_76_0_1/prefab.json'},
 {id:'LINKAGE_54_0_1',title:'泰拉饭，呜呼，泰拉饭',en:'DUNGEON MESHI',tag:'迷宫冒险干员寻访',series:'联动',year:2024,subtitle:'2024.09.02 — 2024.09.16',dates:'09.02 — 09.16',endText:'结束于 9月16日 03:59',up6:['玛露西尔'],up5:['莱欧斯','齐尔查克'],accent:'#e7b352',image:'assets/banner-dungeon.webp',ui:'assets/official/pools/linkage_54_0_1/prefab.json',linkage:true}
];
const references=new Map();
export function configurePool(data){if(!BANNERS.some(b=>b.id===data?.gachaPoolId)||!data?.availCharInfo?.perAvailList||!data?.client)throw Error('Incorrect pool');references.set(data.gachaPoolId,data);}
export function configurePools(data){for(const pool of Object.values(data))configurePool(pool);}
export function getPool(id){return references.get(id);}
export function freshState(){return {version:2,selected:BANNERS[0].id,pools:{},collection:{},history:[],total:0,counts:{3:0,4:0,5:0,6:0}};}
export function poolState(s,id){const p=s.pools[id]??={pity:0,pulls:0,firstHigh:false,guarantee5Avail:references.get(id)?.client.guarantee5Avail??1,rewardClaimed:false};p.linkageTargetObtained??=false;p.linkageFirst5??=null;p.linkagePairComplete??=false;return p;}
export function sixRate(pity){const weight=2+(pity>=50?(pity-49)*2:0);return weight/(weight+98);}
export function draw(s,banner,operators,count,rng=Math.random,now=Date.now()){
 const reference=references.get(banner?.id);
 if(!reference||![1,10].includes(count))throw Error('Invalid pool or count');
 const linkage=reference.client.gachaRuleType==='LINKAGE',target=reference.upCharInfo.perCharList.find(t=>t.rarityRank===5)?.charIdList[0],up5=reference.upCharInfo.perCharList.find(t=>t.rarityRank===4)?.charIdList??[];
 const p=poolState(s,banner.id),out=[],original=Math.random,roster=new Map(operators.map(o=>[o.id,o]));
 try{Math.random=rng;for(let i=0;i<count;i++){
  const core={non6StarCount:p.pity,counter:p.pulls,guarantee5Count:reference.client.guarantee5Count,guarantee5Avail:p.guarantee5Avail};
  const tier=M(core,reference.availCharInfo.perAvailList);
  let result=I(reference.availCharInfo.perAvailList,tier,reference.upCharInfo,reference.weightUpCharInfoList);
  core.counter++;
  if(L(core)){const forced=U(core,reference.availCharInfo.perAvailList,tier,reference.upCharInfo);if(forced)result=forced;}
  if(linkage){
   // Original 2024 collaboration: one target guarantee, satisfied by an early win.
   if(!p.linkageTargetObtained&&core.counter>=reference.client.linkageParam.guaranteeTarget6Count)result={charId:target,rarity:5};
   // Also covers a five-star result produced by the first-ten guarantee.
   if(result.rarity===4&&p.linkageFirst5&&!p.linkagePairComplete){result={charId:up5.find(id=>id!==p.linkageFirst5),rarity:4};p.linkagePairComplete=true;}
   if(result.charId===target)p.linkageTargetObtained=true;
   if(result.rarity===4&&up5.includes(result.charId)&&!p.linkageFirst5)p.linkageFirst5=result.charId;
  }
  const op=roster.get(result.charId);if(!op)throw Error('Missing operator '+result.charId);
  const item={...op,isNew:!s.collection[op.id],index:s.total+1,time:now,banner:banner.id};
  s.collection[op.id]=(s.collection[op.id]||0)+1;s.total++;s.counts[op.rarity]++;s.history.unshift(item);out.push(item);
  p.pulls=core.counter;p.guarantee5Avail=core.guarantee5Avail;p.firstHigh=core.guarantee5Avail<=0;p.pity=op.rarity===6?0:p.pity+1;
 }}finally{Math.random=original;}
 s.history=s.history.slice(0,1000);return out;
}
export function claimReward(s,operators,bannerId=s.selected){const reference=references.get(bannerId),limit=reference?.client.limitParam;if(!limit?.hasFreeChar)return null;const p=poolState(s,bannerId);if(p.pulls<limit.freeCount||p.rewardClaimed)return null;const op=operators.find(o=>o.id===limit.limitedCharId);if(!op)throw Error('Missing reward');p.rewardClaimed=true;s.collection[op.id]=(s.collection[op.id]||0)+1;return op;}
