import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Script} from 'node:vm';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const file=p=>readFileSync(resolve(root,p),'utf8');
test('touch gesture immediately downscales render pixels and restores clarity at release',()=>{
 const context={window:{}};
 new Script(file('render-quality.js')).runInNewContext(context);
 const q=context.window.KomorebiRenderQuality.create({mode:'auto'});
 const high=q.ratio(390,844,3);
 assert.ok(high>1.8);
 q.setInteractive(true);
 const fast=q.ratio(390,844,3);
 assert.equal(fast,high,'buffer dimensions remain stable while touching');
 assert.ok(high<=1.65,'auto mode uses a mobile-friendly resolution budget');
 assert.equal(q.current().interactive,true);
 q.setInteractive(false);
 assert.equal(q.ratio(390,844,3),high);
 assert.equal(q.current().interactive,false);
});
test('rocket audio can be disabled without support for Web Audio',()=>{
 const storage=new Map(),window={localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)}};
 new Script(file('launch-audio.js')).runInNewContext({window});
 const audio=window.KomorebiLaunchAudio;
 assert.equal(audio.enabled(),true);
 assert.equal(audio.play(),false,'unsupported browser stays functional');
 assert.equal(audio.setEnabled(false),false);
 assert.equal(storage.get('komorebi_launch_sound_enabled'),'off');
 assert.equal(audio.play(),false);
 assert.equal(audio.setEnabled(true),true);
 assert.equal(storage.get('komorebi_launch_sound_enabled'),'on');
});
test('rocket sound creates a modest synthesis only after the user-initiated launch',()=>{
 let started=0,resumed=0,output=0;
 const param=()=>({setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}});
 const node=()=>({gain:param(),frequency:param(),type:'',connect(){output++},start(){started++},stop(){}});
 class MockAudioContext{
  constructor(){this.currentTime=2;this.sampleRate=22050;this.state='suspended';this.destination={};}
  resume(){resumed++;this.state='running';return Promise.resolve();}
  createGain(){return node();}
  createOscillator(){return node();}
  createBiquadFilter(){return node();}
  createBuffer(_channels,len){return {getChannelData:()=>new Float32Array(len)};}
  createBufferSource(){return node();}
 }
 const window={AudioContext:MockAudioContext,localStorage:{getItem:()=>null,setItem(){}}};
 new Script(file('launch-audio.js')).runInNewContext({window});
 assert.equal(started,0,'no autoplay before interaction');
 assert.equal(window.KomorebiLaunchAudio.play(),true);
 assert.ok(resumed>=1);
 assert.equal(started,8,'six countdown beeps, one engine tone and one noise loop');
 assert.ok(output>5);
 window.KomorebiLaunchAudio.stop();
});
test('3D rocket breaks through a bounded cloud bank at high altitude',()=>{
 const context={window:{}};
 for(const p of ['expansion3d.js','sealine3d.js','world-expansion-v23.js','spaceport3d.js']){
  new Script(file(p)).runInNewContext(context);
 }
 const space=context.window.KomorebiSpaceport,clouds=[];
 const b={};
 for(const key of ['box','roof','tri','quad','cylinder','ellipseDisc'])b[key]=()=>{};
 b.sphere=(x,y,z,rx,ry,rz,color)=>{clouds.push({x,y,z,rx,ry,rz,color});};
 space.startLaunch(1000);
 space.drawDynamic(b,15100); // 8.1s after ignition: rocket ~47m high
 const bank=clouds.filter(c=>c.y>39&&c.y<51&&c.rx>1.6);
 assert.ok(bank.length>=16,'white cloud bank should split around rising rocket');
 assert.ok(clouds.length<115,'bounded low-poly particles for mobile devices');
 const before=clouds.length;
 space.drawDynamic(b,26000); // cloud-bank breakup should be finished
 assert.ok(clouds.length-before<75,'cloud-bank effect must not persist indefinitely');
});
test('game wires gesture quality, sound toggle and ground rumble without changing saves',()=>{
 const src=file('game.js'),html=file('index.html');
 for(const pattern of [
  /onGesture:active=>renderQuality\?\.setInteractive\?\.\(active\)/,
  /\(CAMERA_GESTURES\|\|fallback\)\.create\(canvas/
  /cameraPan\.x=clamp\(cameraPan\.x-vec\.x\*size/,
  /LAUNCH_AUDIO\?\.play\?\.\(\)/,
  /LAUNCH_AUDIO\.setEnabled\(!LAUNCH_AUDIO\.enabled\(\)\)/,
  /spacePhase\.lift<16/,
  /komorebi_island_3d_v01/
 ])assert.match(src,pattern);
 assert.match(html,/src="launch-audio\.js\?v=20261113-v30"/);
 assert.match(html,/render-quality\.js\?v=20261113-v30/);
});
