// Keep the rendering/audio code shared by HTTP and a double-clicked file:// page.
const local=typeof location!=='undefined'&&location.protocol==='file:';
const scriptLoads=new Map(),binaryLoads=new Map(),mediaLoads=new Map();
function key(path){return String(path).replace(/^\.\//,'').split(/[?#]/)[0];}
function loadScript(path){
 const url=new URL(path,document.baseURI).href;
 if(scriptLoads.has(url))return scriptLoads.get(url);
 const promise=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=url;script.async=true;script.onload=()=>{script.remove();resolve();};script.onerror=()=>{script.remove();scriptLoads.delete(url);reject(Error('Local resource package unavailable: '+path));};document.head.append(script);});
 scriptLoads.set(url,promise);return promise;
}
async function packageData(){
 if(!globalThis.__RHODES_OFFLINE__)await loadScript('offline/data.js');
 const data=globalThis.__RHODES_OFFLINE__;if(!data)throw Error('Offline resource manifest unavailable');return data;
}
export async function readJSON(path){
 if(!local){const response=await fetch(path);if(!response.ok)throw Error('Resource unavailable: '+path);return response.json();}
 const data=await packageData(),name=key(path);if(!Object.hasOwn(data.json,name))throw Error('Local data unavailable: '+name);return structuredClone(data.json[name]);
}
async function encodedBinary(path){
 const data=await packageData(),name=key(path),chunk=data.chunks[name];if(!chunk)throw Error('Local audio unavailable: '+name);
 if(!data.binary[name])await loadScript(chunk);
 const value=data.binary[name];if(typeof value!=='string')throw Error('Invalid local audio package: '+name);return{data,name,value};
}
export async function readBytes(path){
 if(!local){const response=await fetch(path);if(!response.ok)throw Error('Audio unavailable: '+path);return response.arrayBuffer();}
 const name=key(path);
 if(!binaryLoads.has(name))binaryLoads.set(name,encodedBinary(name).then(({data,name,value})=>{const text=atob(value),bytes=new Uint8Array(text.length);for(let i=0;i<text.length;i++)bytes[i]=text.charCodeAt(i);delete data.binary[name];return bytes.buffer;}).catch(error=>{binaryLoads.delete(name);throw error;}));
 // decodeAudioData detaches its input; callers receive their own copy.
 return (await binaryLoads.get(name)).slice(0);
}
export function textureURL(path){
 if(!local)return path;
 const value=globalThis.__RHODES_OFFLINE__?.images[key(path)];if(!value)throw Error('Local WebGL texture unavailable: '+path);return value;
}
export async function mediaURL(path){
 if(!local||/^(blob:|data:)/.test(path))return path;
 const name=key(path);if(!mediaLoads.has(name))mediaLoads.set(name,encodedBinary(name).then(({data,name,value})=>{delete data.binary[name];return 'data:audio/mpeg;base64,'+value;}).catch(error=>{mediaLoads.delete(name);throw error;}));return mediaLoads.get(name);
}
