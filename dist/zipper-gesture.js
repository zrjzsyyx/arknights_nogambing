const clamp=v=>Math.max(0,Math.min(1,v));
// Coordinates are CSS viewport pixels, shared by mouse, touch and the 3D projection.
export function dragProgress(path,origin,point,initial=0){
 const dx=path.end.x-path.start.x,dy=path.end.y-path.start.y,length2=dx*dx+dy*dy;
 if(length2<1)return initial;
 return clamp(initial+((point.x-origin.x)*dx+(point.y-origin.y)*dy)/length2);
}
export function canGrabZipper(path,point,progress=0,touch=false){
 const dx=path.end.x-path.start.x,dy=path.end.y-path.start.y,length=Math.hypot(dx,dy);
 if(length<1)return false;
 const x=point.x-path.start.x,y=point.y-path.start.y,along=(x*dx+y*dy)/length;
 const across=Math.abs(x*dy-y*dx)/length,radius=touch?56:40;
 return across<=radius&&Math.abs(along-progress*length)<=Math.max(radius,length*.1);
}
