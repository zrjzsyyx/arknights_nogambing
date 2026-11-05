import test from 'node:test';
import assert from 'node:assert/strict';
import {canGrabZipper,dragProgress} from '../dist/zipper-gesture.js';
const path={start:{x:1000,y:230},end:{x:200,y:450}};
test('zipper opens from right to left along the projected diagonal',()=>{
 assert.equal(dragProgress(path,path.start,{x:1200,y:230}),0);
 assert.equal(dragProgress(path,path.start,path.end),1);
 assert.ok(dragProgress(path,path.start,{x:300,y:230})>.8);
 assert.ok(dragProgress(path,path.start,{x:1000,y:450})<.1);
});
test('grab region follows partial progress and accepts a wider touch target',()=>{
 assert.ok(canGrabZipper(path,{x:990,y:250}));
 assert.ok(!canGrabZipper(path,path.end));
 assert.ok(!canGrabZipper(path,{x:1000,y:400},0,true));
 const halfway={x:600,y:340};assert.ok(canGrabZipper(path,halfway,.5));
 assert.ok(!canGrabZipper(path,path.start,.5));
 assert.equal(dragProgress(path,halfway,path.end,.5),1);
 assert.ok(canGrabZipper(path,{x:1010,y:280},0,true));
 assert.ok(!canGrabZipper(path,{x:1010,y:280},0,false));
});
test('projection is independent of viewport and device pixel ratio',()=>{
 const small={start:{x:350,y:200},end:{x:40,y:280}};
 assert.ok(dragProgress(small,small.start,{x:50,y:200})>.8);
 assert.equal(dragProgress({start:{x:0,y:0},end:{x:0,y:0}},{x:0,y:0},{x:100,y:0},.4),.4);
});
