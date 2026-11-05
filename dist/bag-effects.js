import * as THREE from './vendor/three.module.js';
import {textureURL} from './local-assets.js';
const VERTEX=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const FRAGMENT=`uniform sampler2D source;uniform vec3 tint;uniform float strength;uniform float clock;varying vec2 vUv;
void main(){float edge=smoothstep(0.,.07,vUv.x)*(1.-smoothstep(.93,1.,vUv.x));vec4 texel=texture2D(source,vec2(vUv.x,1.-vUv.y));float ray=texel.r*texel.a;float plume=pow(1.-vUv.y,1.5);float bands=.93+.07*sin(vUv.x*57.+clock*.7);float a=edge*plume*(ray*2.8)*bands*strength;gl_FragColor=vec4(mix(tint,vec3(1.),pow(1.-vUv.y,16.)*.9),a);#include <colorspace_fragment>}`.replace(';#include',';\n#include');
export class BagEffects{
 constructor(scene){
  this.group=new THREE.Group();scene.add(this.group);this.group.visible=false;
  const loader=new THREE.TextureLoader();
  this.ready=Promise.all([loader.loadAsync(textureURL('assets/official/reveal/guangxiao_03.webp')),loader.loadAsync(textureURL('assets/official/reveal/guangxiao_02.webp'))]).then(([beam,flare])=>{
   this.geometry=new THREE.BufferGeometry();this.geometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(12),3));this.geometry.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,0,1,1,1],2));this.geometry.setIndex([0,1,2,2,1,3]);
   this.material=new THREE.ShaderMaterial({vertexShader:VERTEX,fragmentShader:FRAGMENT,uniforms:{source:{value:beam},tint:{value:new THREE.Color()},strength:{value:0},clock:{value:0}},side:THREE.DoubleSide,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});this.rays=new THREE.Mesh(this.geometry,this.material);this.rays.frustumCulled=false;this.rays.renderOrder=3;this.group.add(this.rays);
   this.flare=new THREE.Sprite(new THREE.SpriteMaterial({map:flare,color:0xffffff,transparent:true,opacity:0,depthWrite:false,depthTest:true,blending:THREE.AdditiveBlending,toneMapped:false}));this.flare.renderOrder=4;this.group.add(this.flare);
   const positions=new Float32Array(90*3);this.dustGeo=new THREE.BufferGeometry();this.dustGeo.setAttribute('position',new THREE.BufferAttribute(positions,3));this.sparks=new THREE.Points(this.dustGeo,new THREE.PointsMaterial({color:0xffd391,size:.011,transparent:true,opacity:.85,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));this.sparks.frustumCulled=false;this.group.add(this.sparks);
  });
 }
 update(start,end,progress,rarity,time,camera,opening){
  if(!this.material)return;this.group.visible=progress>.006;if(!this.group.visible)return;
  const p=Math.max(.02,progress),color=rarity===3?0xd4e6ff:rarity===4?0x8571ff:rarity===5?0xffbc42:0xff9229;
  const a=start.clone(),b=end.clone();a.y+=.018;b.y+=.018;
  // These world-space ribbons emerge from the actual opening, so the bag occludes them.
  const height=(opening?1.7:1.3)*Math.min(1,.35+p);const values=[a.x,a.y,a.z,b.x,b.y,b.z,a.x-.15,a.y+height,a.z,b.x+.15,b.y+height,b.z];this.geometry.attributes.position.array.set(values);this.geometry.attributes.position.needsUpdate=true;
  this.material.uniforms.tint.value.set(color);this.material.uniforms.strength.value=(opening?1.7:1.4)*Math.min(1,p*3);this.material.uniforms.clock.value=time;
  this.flare.position.copy(a).lerp(b,.55);this.flare.position.y+=.04;this.flare.scale.set(.25+start.distanceTo(end)*1.25,.22+p*.28,1);this.flare.material.color.set(color).lerp(new THREE.Color(0xffffff),.5);this.flare.material.opacity=Math.min(1,p*2.5)*(opening?.9:.7);
  const data=this.dustGeo.attributes.position.array;
  for(let i=0;i<90;i++){const life=(time*(.5+(i%7)*.04)+i*.61803398875)%1,across=(i*.381966)%1;const origin=start.clone().lerp(end,across);data[i*3]=origin.x+Math.sin(i*7.1)*life*.28;data[i*3+1]=origin.y+life*(.2+(i%9)*.065);data[i*3+2]=origin.z+Math.cos(i*4.3)*life*.19;}
  this.dustGeo.attributes.position.needsUpdate=true;this.sparks.material.opacity=Math.min(1,p*2)*.85;
 }
}
