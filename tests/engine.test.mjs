import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,existsSync} from 'node:fs';
import {ReferenceSimulator} from './prts-reference.js';
import {BANNERS,configurePool,configurePools,getPool,freshState,draw,poolState,sixRate,claimReward} from '../dist/engine.js';
const data=JSON.parse(readFileSync(new URL('../dist/pool.json',import.meta.url),'utf8')),ops=JSON.parse(readFileSync(new URL('../dist/operators.json',import.meta.url),'utf8'));configurePool(data);
const pools=JSON.parse(readFileSync(new URL('../dist/pools.json',import.meta.url),'utf8'));configurePools(pools);
function rng(seed){return ()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/2**32;};}
test('PRTS differential: same random streams produce identical results and counters',()=>{for(const seed of [1,42,20261101]){const source=new ReferenceSimulator({gachaPoolDetail:{detailInfo:data}},data.client),s=freshState(),a=rng(seed),b=rng(seed);for(let i=0;i<10000;i++){const old=Math.random;let expected;try{Math.random=a;expected=source.doGachaOnce();}finally{Math.random=old;}const [actual]=draw(s,BANNERS[0],ops,1,b);assert.equal(actual.id,expected.charId,`seed ${seed}, pull ${i}`);assert.equal(actual.rarity,expected.rarity+1);const p=poolState(s,BANNERS[0].id);assert.equal(p.pity,source.state.non6StarCount);assert.equal(p.guarantee5Avail,source.state.guarantee5Avail);assert.equal(p.pulls,source.state.counter);}assert.equal(s.history.length,1000);}});
test('PRTS first-ten replacement and rarity normalization are preserved',()=>{const s=freshState();for(let i=0;i<9;i++)draw(s,BANNERS[0],ops,1,()=>.999);assert.equal(draw(s,BANNERS[0],ops,1,()=>0)[0].rarity,5);assert.equal(sixRate(50),4/102);assert.equal(sixRate(98),100/198);});
test('five historical rosters have their exact union and all banner/operator artwork is local',()=>{assert.equal(BANNERS.length,5);assert.equal(data.gachaPoolId,'LIMITED_79_0_1');const union=[...new Set(Object.values(pools).flatMap(p=>p.availCharInfo.perAvailList.flatMap(t=>t.charIdList)))];assert.equal(union.length,215);assert.deepEqual(ops.map(o=>o.id).sort(),union.sort());for(const o of ops)assert.ok(existsSync(new URL('../dist/'+o.art,import.meta.url)),o.name);for(const b of BANNERS){assert.ok(existsSync(new URL('../dist/'+b.image,import.meta.url)));const pool=pools[b.id];assert.equal(pool.client.gachaPoolName,b.title);assert.deepEqual(pool.upCharInfo.perCharList.find(t=>t.rarityRank===5).charIdList.map(id=>ops.find(o=>o.id===id).name),b.up6);assert.deepEqual(pool.upCharInfo.perCharList.find(t=>t.rarityRank===4).charIdList.map(id=>ops.find(o=>o.id===id).name),b.up5);}});
test('300-pull extra reward can be claimed once without affecting draw counters or pity',()=>{const s=freshState(),random=rng(123);assert.equal(claimReward(s,ops),null);for(let i=0;i<30;i++)draw(s,BANNERS[0],ops,10,random);const before=structuredClone(s),p=poolState(s,BANNERS[0].id),reward=claimReward(s,ops);assert.equal(reward.name,'塔露拉');assert.equal(s.total,300);assert.equal(p.pity,before.pools[BANNERS[0].id].pity);assert.equal(s.history.length,300);assert.equal(s.collection[reward.id],(before.collection[reward.id]||0)+1);assert.equal(claimReward(s,ops),null);});

test('the three added limited pools reproduce PRTS draws and stay within their own historical roster',()=>{
 for(const banner of BANNERS.slice(1,4)){
  const reference=pools[banner.id],source=new ReferenceSimulator({gachaPoolDetail:{detailInfo:reference}},reference.client),s=freshState(),a=rng(42),b=rng(42),allowed=new Set(reference.availCharInfo.perAvailList.flatMap(t=>t.charIdList));
  for(let i=0;i<2000;i++){
   const old=Math.random;let expected;try{Math.random=a;expected=source.doGachaOnce();}finally{Math.random=old;}
   const [actual]=draw(s,banner,ops,1,b);assert.equal(actual.id,expected.charId);assert.ok(allowed.has(actual.id));assert.equal(poolState(s,banner.id).pity,source.state.non6StarCount);
  }
 }
});

test('switching and restoring a save keeps pity, first-ten guarantees and extra gifts independent',()=>{
 let s=freshState();const random=rng(335);
 for(const banner of BANNERS.slice(0,4)){
  s.selected=banner.id;for(let i=0;i<30;i++)draw(s,banner,ops,10,random);
  const before=structuredClone(s),reward=claimReward(s,ops);assert.equal(reward.name,banner.up6[0]);assert.equal(claimReward(s,ops),null);
  assert.equal(s.total,before.total);assert.equal(s.history.length,before.history.length);assert.equal(poolState(s,banner.id).pity,before.pools[banner.id].pity);
 }
 const before=structuredClone(s);s=JSON.parse(JSON.stringify(s));draw(s,BANNERS[4],ops,10,random);
 for(const b of BANNERS.slice(0,4))assert.deepEqual(s.pools[b.id],before.pools[b.id]);
 assert.equal(s.total,1210);assert.equal(s.history[0].banner,BANNERS[4].id);assert.equal(claimReward(s,ops,BANNERS[4].id),null);
});

const dungeon=BANNERS[4],target=pools[dungeon.id].upCharInfo.perCharList.find(t=>t.rarityRank===5).charIdList[0],pair=pools[dungeon.id].upCharInfo.perCharList.find(t=>t.rarityRank===4).charIdList;
function sequence(...values){let index=0;return()=>values[index++%values.length];}

test('Dungeon Meshi forces Marcille on draw 120, consumes the guarantee once, and restores correctly',()=>{
 let s=freshState(),p=poolState(s,dungeon.id);Object.assign(p,{pulls:119,firstHigh:true,guarantee5Avail:0});
 assert.equal(draw(s,dungeon,ops,1,()=>.999)[0].id,target);assert.equal(p.pity,0);assert.ok(p.linkageTargetObtained);
 s=JSON.parse(JSON.stringify(s));p=poolState(s,dungeon.id);assert.notEqual(draw(s,dungeon,ops,1,()=>.999)[0].id,target);
 p.pulls=239;assert.notEqual(draw(s,dungeon,ops,1,()=>.999)[0].id,target);assert.ok(p.linkageTargetObtained);
});

test('an early Marcille satisfies the one-time guarantee without another forced target at 120',()=>{
 const s=freshState(),p=poolState(s,dungeon.id);Object.assign(p,{pulls:118,firstHigh:true,guarantee5Avail:0});
 assert.equal(draw(s,dungeon,ops,1,()=>0)[0].id,target);assert.ok(p.linkageTargetObtained);assert.notEqual(draw(s,dungeon,ops,1,()=>.999)[0].id,target);
});

test('the next five-star after a first collaboration five-star is the other, including first-ten replacement',()=>{
 const s=freshState(),p=poolState(s,dungeon.id);p.guarantee5Avail=0;
 assert.equal(draw(s,dungeon,ops,1,sequence(.05,0))[0].id,pair[0]);assert.equal(p.linkageFirst5,pair[0]);
 draw(s,dungeon,ops,1,()=>.999);assert.ok(!p.linkagePairComplete);
 Object.assign(p,{pulls:9,guarantee5Avail:1,firstHigh:false});
 const restored=JSON.parse(JSON.stringify(s));assert.equal(draw(restored,dungeon,ops,1,()=>.999)[0].id,pair[1]);assert.ok(restored.pools[dungeon.id].linkagePairComplete);
 assert.equal(draw(restored,dungeon,ops,1,sequence(.05,0))[0].id,pair[0]);
});

test('collaboration protection uses this pool history, independently of the shared collection',()=>{
 const s=freshState(),p=poolState(s,dungeon.id);p.guarantee5Avail=0;s.collection[pair[0]]=1;
 const op=draw(s,dungeon,ops,1,sequence(.05,.999))[0];assert.ok(!pair.includes(op.id));assert.equal(p.linkageFirst5,null);assert.ok(!p.linkagePairComplete);
});

test('unknown pools and unsupported draw sizes are rejected before consuming state',()=>{
 const s=freshState();assert.throws(()=>draw(s,{id:'missing'},ops,1));assert.throws(()=>draw(s,BANNERS[0],ops,5));assert.deepEqual(s,freshState());assert.equal(getPool(BANNERS[4].id),pools[BANNERS[4].id]);
});
