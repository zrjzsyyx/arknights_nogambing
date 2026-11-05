import * as THREE from './vendor/three.module.js';
import {zipperTimeline} from './zipper-pose.js';
import {BagEffects} from './bag-effects.js';
import {readJSON,textureURL} from './local-assets.js';
const BASE='assets/official/scene/';
export class OfficialBag {
 constructor(container){this.container=container;this.ready=false;this.visible=false;this.mode='idle';this.elapsed=0;this.progress=0;this.last=0;this.tick=this.tick.bind(this);this.promise=this.load().catch(e=>{console.error('Original recruitment scene unavailable',e);container.dataset.error='true';throw e;});this.promise.catch(()=>{});}
 async load(){
  this.data=await readJSON(BASE+'bag.json');
  this.renderer=new THREE.WebGLRenderer({alpha:false,antialias:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));this.renderer.setClearColor(0x30343a);this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.15;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.container.append(this.renderer.domElement);
  this.scene=new THREE.Scene();this.root=new THREE.Group();this.root.scale.x=-1;this.scene.add(this.root);this.nodes=new Map();
  for(const n of this.data.nodes){const o=new THREE.Bone();o.name=n.name;o.position.fromArray(n.position);o.quaternion.fromArray(n.rotation);o.scale.fromArray(n.scale);o.userData.id=n.id;this.nodes.set(n.id,o);}
  for(const n of this.data.nodes)(this.nodes.get(n.parent)||this.root).add(this.nodes.get(n.id));
  this.root.updateMatrixWorld(true);
  const loader=new THREE.TextureLoader(),textures={};await Promise.all(Object.entries(this.data.textures).map(async([id,file])=>{const t=await loader.loadAsync(textureURL(BASE+file));t.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());t.wrapS=t.wrapT=THREE.RepeatWrapping;textures[id]=t;}));
  const mats={};for(const [name,v] of Object.entries(this.data.materials)){if(textures[v.albedo])textures[v.albedo].colorSpace=THREE.SRGBColorSpace;const bag=name==='MT_Gacha_Bag_01';mats[name]=new THREE.MeshStandardMaterial({map:textures[v.albedo],normalMap:bag?textures[v.normal]:null,normalScale:new THREE.Vector2(1,-1),aoMap:textures[v.ao],aoMapIntensity:.65,color:0xffffff,roughness:bag?.62:.9,metalness:bag?.14:0,side:THREE.DoubleSide});}
  this.meshes=[];
  for(const m of this.data.meshes){if(m.materials.includes('MT_Gacha_Ground_02'))continue;const raw=this.data.geometries[m.geometry];const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(raw.Vertices.flat(),3));if(raw.Normals)g.setAttribute('normal',new THREE.Float32BufferAttribute(raw.Normals.flat(),3));if(raw.UV0){g.setAttribute('uv',new THREE.Float32BufferAttribute(raw.UV0.flat(),2));g.setAttribute('uv1',g.attributes.uv.clone());}const indices=raw.triangles.flat(2);g.setIndex(indices);if(!raw.Normals)g.computeVertexNormals();
   let mesh;
   const material=mats[m.materials[0]];
   if(m.bones.length){g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(raw.BoneIndices.map(v=>[v[0]||0,v[1]||0,v[2]||0,v[3]||0]).flat(),4));g.setAttribute('skinWeight',new THREE.Float32BufferAttribute((raw.BoneWeights||raw.Vertices.map(()=>[1,0,0,0])).map(v=>[v[0]||0,v[1]||0,v[2]||0,v[3]||0]).flat(),4));mesh=new THREE.SkinnedMesh(g,material);this.nodes.get(m.node).add(mesh);const skeleton=new THREE.Skeleton(m.bones.map(id=>this.nodes.get(id)),raw.bindPoses.map(p=>new THREE.Matrix4().fromArray(p)));mesh.bind(skeleton,new THREE.Matrix4());mesh.frustumCulled=false;}
   else {mesh=new THREE.Mesh(g,material);this.nodes.get(m.node).add(mesh);}
   mesh.name=this.nodes.get(m.node).name;mesh.castShadow=mesh.name.startsWith('S_Bag');mesh.receiveShadow=true;this.meshes.push(mesh);
  }
  this.bagRoot=[...this.nodes.values()].find(o=>o.name==='S_Gacha_bag_skin_01');
  this.zipper=[...this.nodes.values()].find(o=>o.name==='zipper');
  this.zipperMesh=this.meshes.find(o=>o.name==='S_Bag_zipper_02');this.zipperMesh.geometry.computeBoundingBox();
  this.camRoot=[...this.nodes.values()].find(o=>o.name==='A_Gacha_MainCamera_01');
  const cam=this.data.cameras[0];this.camera=new THREE.PerspectiveCamera(cam.fov,16/9,.01,1000);this.cameraNode=this.nodes.get(cam.node);this.scene.add(this.camera);
  this.scene.add(new THREE.HemisphereLight(0xdce7ee,0x3c3940,1.2));this.key=new THREE.DirectionalLight(0xffffff,3.3);this.key.position.set(-3,6,-3);this.key.castShadow=true;this.key.shadow.mapSize.set(1024,1024);Object.assign(this.key.shadow.camera,{left:-4,right:4,top:4,bottom:-4,near:.1,far:20});this.key.shadow.normalBias=.012;this.scene.add(this.key);const rim=new THREE.DirectionalLight(0xaec5df,.7);rim.position.set(4,3,3);this.scene.add(rim);
  this.innerLight=new THREE.PointLight(0xffb53d,0,2.2,2);this.innerLight.position.set(0,.85,0);this.bagRoot.add(this.innerLight);
  this.tracks={};for(const [name,clip] of Object.entries(this.data.clips)){const owner=name.startsWith('gacha_bag')?this.bagRoot:this.camRoot;this.tracks[name]=clip.tracks.map(t=>{let node=owner;for(const part of t.path.split('/').filter(Boolean))node=node?.children.find(c=>c.name===part);return {...t,node};}).filter(t=>t.node);}
  const zipTrack=this.tracks.gacha_bag_open.find(t=>t.node===this.zipper&&t.property==='position');this.zipStart=new THREE.Vector3().fromArray(zipTrack.values);this.zipEnd=new THREE.Vector3().fromArray(zipTrack.values.slice(-3));this.zipTime=zipperTimeline(zipTrack);this.poseTime=0;
  this.effects=new BagEffects(this.scene);await this.effects.ready;
  this.apply('gacha_bag_start',2.08334);this.apply('gacha_main_cam_start',2.08334);this.root.updateMatrixWorld(true);this.resize();this.ready=true;this.container.dataset.ready='true';window.addEventListener('resize',()=>this.resize());this.render();
 }
 apply(name,time){for(const t of this.tracks[name]||[]){const dim=t.property==='quaternion'?4:3;let i=0;while(i<t.times.length-2&&t.times[i+1]<time)i++;const a=t.times[i],b=t.times[i+1]??a;const f=b===a?0:THREE.MathUtils.clamp((time-a)/(b-a),0,1);const values=[];for(let c=0;c<dim;c++)values.push(THREE.MathUtils.lerp(t.values[i*dim+c],t.values[(i+1)*dim+c]??t.values[i*dim+c],f));t.node[t.property].fromArray(values);if(dim===4)t.node.quaternion.normalize();}}
 resize(){if(!this.renderer)return;const w=this.container.clientWidth||innerWidth,h=this.container.clientHeight||innerHeight;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.fov=w/h<16/9?THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(35/2))*(16/9)/(w/h))):35;this.camera.updateProjectionMatrix();if(this.ready&&!this.visible)this.render();}
 start(rarity){if(!this.ready)return;this.container.parentElement.dataset.opening='false';this.resize();for(const n of this.data.nodes){const node=this.nodes.get(n.id);node.position.fromArray(n.position);node.quaternion.fromArray(n.rotation);node.scale.fromArray(n.scale);}this.rarity=rarity;this.mode='arrival';this.container.dataset.interactive='false';this.elapsed=0;this.progress=0;this.poseTime=0;this.container.dataset.progress='0';this.last=0;this.visible=true;this.innerLight.color.set(rarity>=5?0xffab39:rarity===4?0xa882ff:0xe5efff);this.innerLight.intensity=0;this.container.style.opacity='1';this.apply('gacha_bag_start',0);this.apply('gacha_main_cam_start',0);cancelAnimationFrame(this.frame);this.frame=requestAnimationFrame(this.tick);}
 setProgress(p){if(!this.ready)return;this.progress=THREE.MathUtils.clamp(p,0,1);this.poseTime=this.zipTime(this.progress);this.apply('gacha_bag_open',this.poseTime);this.innerLight.intensity=p*(this.rarity===6?8:5);this.container.dataset.progress=this.progress.toFixed(3);}
 open(){if(!this.ready)return;this.container.parentElement.dataset.opening='true';this.mode='open';this.elapsed=this.poseTime||0;this.apply('gacha_main_cam_start',2.08334);}
 stop(){this.visible=false;cancelAnimationFrame(this.frame);}
 getZipperPath(){return this.zipperPath;}
 render(){this.scene.updateMatrixWorld(true);this.camera.position.setFromMatrixPosition(this.cameraNode.matrixWorld);const forward=new THREE.Vector3(0,0,1).transformDirection(this.cameraNode.matrixWorld);this.camera.up.set(0,1,0).transformDirection(this.cameraNode.matrixWorld);this.camera.lookAt(this.camera.position.clone().add(forward));this.camera.updateMatrixWorld(true);
  const start=this.zipStart.clone().applyMatrix4(this.zipper.parent.matrixWorld),end=this.zipper.getWorldPosition(new THREE.Vector3());this.effects?.update(start,end,this.progress||0,this.rarity||3,performance.now()/1000,this.camera,this.mode==='open');this.renderer.render(this.scene,this.camera);
  const rect=this.renderer.domElement.getBoundingClientRect();
  if(rect.width&&rect.height){const offset=this.zipperMesh.geometry.boundingBox.getCenter(new THREE.Vector3()).applyMatrix4(this.zipperMesh.matrixWorld).sub(this.zipper.getWorldPosition(new THREE.Vector3()));const point=v=>{const p=v.clone().applyMatrix4(this.zipper.parent.matrixWorld).add(offset).project(this.camera);return{x:rect.left+(p.x+1)*rect.width/2,y:rect.top+(1-p.y)*rect.height/2};};this.zipperPath={start:point(this.zipStart),end:point(this.zipEnd)};this.onZipperPath?.(this.zipperPath,this.progress);}
 }
 tick(t){if(!this.visible||document.hidden){this.last=0;if(this.visible)this.frame=requestAnimationFrame(this.tick);return;}const dt=this.last?Math.min(.25,(t-this.last)/1000):0;this.last=t;this.elapsed+=dt;
  if(this.mode==='arrival'){this.apply('gacha_bag_start',this.elapsed);this.apply('gacha_main_cam_start',this.elapsed);if(this.elapsed>=2.08334){this.mode='idle';this.elapsed=0;this.container.dataset.interactive='true';this.onInteractive?.();}}
  else if(this.mode==='idle')this.apply('gacha_main_cam_loop',this.elapsed%4.125);
  else if(this.mode==='open'){this.apply('gacha_bag_open',Math.min(.83333,this.elapsed));this.progress=Math.min(1,this.elapsed/.5);this.apply('gacha_main_cam_shake',Math.min(.66667,this.elapsed));this.innerLight.intensity=Math.min(25,this.elapsed*40);}
  this.render();this.frame=requestAnimationFrame(this.tick);
 }
}
