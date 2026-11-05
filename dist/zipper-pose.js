// Invert the original zipper translation curve so dragging scrubs its bone animation.
export function zipperTimeline(track){
 const a=track.values.slice(0,3),b=track.values.slice(-3),d=b.map((v,i)=>v-a[i]);
 const length2=d.reduce((s,v)=>s+v*v,0);
 const samples=track.times.map((time,i)=>({time,progress:Math.max(0,Math.min(1,d.reduce((s,v,j)=>s+(track.values[i*3+j]-a[j])*v,0)/length2))}));
 return progress=>{
  const p=Math.max(0,Math.min(.999,progress));if(p===0)return 0;
  for(let i=1;i<samples.length;i++){const a=samples[i-1],b=samples[i];if(b.progress>=p)return a.time+(b.time-a.time)*(p-a.progress)/(b.progress-a.progress||1);}
  return samples.at(-1).time;
 };
}
