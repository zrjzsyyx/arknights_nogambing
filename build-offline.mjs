import{build}from'esbuild';
import{readFile,writeFile,mkdir,readdir}from'node:fs/promises';
import{createHash}from'node:crypto';
import path from'node:path';
import{fileURLToPath}from'node:url';
import{BANNERS}from'./dist/engine.js';
const ROOT=path.dirname(fileURLToPath(import.meta.url)),DIST=path.join(ROOT,'dist'),OUT=path.join(DIST,'offline');
const read=name=>readFile(path.join(DIST,name));
const json=async name=>JSON.parse(await read(name));
const hash=data=>createHash('sha256').update(data).digest('hex');
await mkdir(path.join(OUT,'audio'),{recursive:true});
const names=['operators.json','pool.json','pools.json','voices.json','reveal-assets.json','music.json','assets/official/ui/prefab.json','assets/official/scene/bag.json',...BANNERS.filter(b=>b.ui).map(b=>b.ui)];
const data={version:1,json:{},images:{},chunks:{},binary:{}};
for(const name of names)data.json[name]=await json(name);
const scene=data.json['assets/official/scene/bag.json'];
const textures=[...Object.values(scene.textures).map(name=>'assets/official/scene/'+name),'assets/official/reveal/guangxiao_02.webp','assets/official/reveal/guangxiao_03.webp'];
for(const name of textures)data.images[name]='data:image/webp;base64,'+(await read(name)).toString('base64');
async function* files(dir){for(const item of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,item.name);if(item.isDirectory())yield*files(p);else if(item.isFile())yield p;}}
const manifest={version:1,json:{},images:{},audio:{}};
for(const name of names)manifest.json[name]=hash(await read(name));
for(const name of textures)manifest.images[name]=hash(await read(name));
for await(const file of files(path.join(DIST,'assets'))){
 if(!file.endsWith('.mp3'))continue;
 const name=path.relative(DIST,file).split(path.sep).join('/'),bytes=await readFile(file),chunk='offline/audio/'+hash(name).slice(0,20)+'.js';
 data.chunks[name]=chunk;
 await writeFile(path.join(DIST,chunk),'globalThis.__RHODES_OFFLINE__.binary['+JSON.stringify(name)+']='+JSON.stringify(bytes.toString('base64'))+';\n');
 manifest.audio[name]={chunk,bytes:bytes.length,sha256:hash(bytes)};
}
await writeFile(path.join(OUT,'data.js'),'globalThis.__RHODES_OFFLINE__='+JSON.stringify(data)+';\n');
// Browsers also apply local-file restrictions to fonts and CSS image masks.
const faces=[['Bender','assets/official/Bender.otf','font/otf','opentype'],['Novecento','assets/official/Novecento.otf','font/otf','opentype'],['HeadhuntCJK','assets/official/HeadhuntCJK.woff2','font/woff2','woff2']];
let css='/* Generated from the exact original font and mask bytes. */\n';
for(const[family,file,mime,format]of faces)css+=`@font-face{font-family:${family};src:url("data:${mime};base64,${(await read(file)).toString('base64')}") format("${format}");${family==='HeadhuntCJK'?'font-weight:400;':''}font-display:swap}\n`;
const mask='assets/official/reveal/sanjiao_01.webp';
css+=`.reveal-native-particles>i{mask-image:url("data:image/webp;base64,${(await read(mask)).toString('base64')}")}\n`;
await writeFile(path.join(OUT,'styles.css'),css);
const result=await build({absWorkingDir:ROOT,entryPoints:['dist/app.js'],outfile:'dist/app.bundle.js',bundle:true,format:'iife',platform:'browser',target:['es2022'],charset:'utf8',legalComments:'eof',minify:false,metafile:true});
const bundle=await read('app.bundle.js');manifest.bundle={file:'app.bundle.js',sha256:hash(bundle)};
let html=(await read('index.html')).toString('utf8');
html=html.replace(/\s*<link[^>]*href="offline\/styles\.css[^\"]*"[^>]*>/g,'');
html=html.replace('</head>',` <link rel="stylesheet" href="offline/styles.css?v=${hash(css).slice(0,12)}">\n</head>`);
html=html.replace(/<script\b[^>]*\bsrc="app(?:\.bundle)?\.js(?:\?[^\"]*)?"[^>]*><\/script>/,'<script defer src="app.bundle.js?v='+hash(bundle).slice(0,12)+'"></script>');
if(!html.includes('defer src="app.bundle.js'))throw Error('Application entry script missing');
await writeFile(path.join(DIST,'index.html'),html);
await writeFile(path.join(OUT,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
const externals=Object.values(result.metafile.outputs).flatMap(o=>o.imports).filter(i=>i.external);if(externals.length)throw Error('Unexpected runtime module dependency');
console.log(JSON.stringify({bundleBytes:bundle.length,jsonFiles:names.length,webglTextures:textures.length,audioFiles:Object.keys(manifest.audio).length,offline:true}));
