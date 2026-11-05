import pathlib,json,re
r=pathlib.Path(__file__).parent
src=(r/'prts-simulator.tmp.js').read_text(encoding='utf-8')
pure=src[src.index('function A('):src.index('var ue=class')]
header='// PRTS GachaSimulatorV2 core, retained verbatim. Source and SHA256: pool.json.\nconst O={TIER_5:4,TIER_6:5};\n'
(r/'dist/prts-core.js').write_text(header+pure+'\nexport {A,j,M,F,I,L,U};\n',encoding='utf-8')
cls=src[src.index('var ue=class'):src.index(',de=class')]
(r/'tests/prts-reference.js').write_text(header+'const k=new Proxy({}, {get:(_,p)=>p}); const E=(o,k,v)=>{o[k]=v;};\n'+pure+cls+';\nexport {ue as ReferenceSimulator};',encoding='utf-8')
p=r/'.gitignore';p.write_text(p.read_text()+'\nprts-simulator.tmp.js\n',encoding='utf-8')
