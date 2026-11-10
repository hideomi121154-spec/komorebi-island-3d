import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';
const d=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const html=readFileSync(resolve(d,'index.html'),'utf8');
const css=readFileSync(resolve(d,'styles.css'),'utf8');
const js=readFileSync(resolve(d,'game.js'),'utf8');
test('HTML links to split game files',()=>{assert.match(html,/href="styles\.css"/);assert.match(html,/src="game\.js"/);assert.match(html,/id="gameCanvas"/);assert.match(html,/id="startBtn"/);});
test('JavaScript syntax parses',()=>assert.doesNotThrow(()=>new Script(js)));
test('Core systems are present',()=>{for(const k of ['readSave','save','initializeGL','drawSoftware','buildStatic','interact','syncRealClock'])assert.ok(js.includes(k),k);assert.match(css,/#gameCanvas/);});

test('In-world 3D fishing replaces the full-screen dialog',()=>{
 for(const id of ['fishHud','fishBack','fishMessage','fishTimer']){
  assert.match(html,new RegExp('id="'+id+'"'));
 }
 assert.doesNotMatch(html,/fish-overlay|fish-scene|fish-dialog|fishMain/);
 for(const fn of ['startFishing','castFishing','fishAction','missFishing','stopFishing','buildFishingGeometry','fishingSegment','fishingRing']){
  assert.ok(js.includes('function '+fn+'('),fn);
 }
 assert.match(js,/else if\(id==='pond'\)\{startFishing\(\)\}/);
 assert.match(js,/BITE_WINDOW_MS=1600/);
 assert.match(js,/buildFishingGeometry\(b,now\)/);
 assert.match(js,/fishingActive\?\(aspect<\.70\?14\.4:12\.1\)/);
 assert.match(css,/bottom-ui\.fishing-mode/);
 assert.match(css,/fish-hud\[data-stage="bite"\]/);
});

test('Walkable interior resources are linked and wired',()=>{
 assert.match(html,/src="rooms3d\.js"/);
 assert.match(html,/id="roomDialogue"/);
 assert.match(html,/id="roomHud"/);
 assert.match(html,/id="sceneVeil"/);
 assert.match(js,/function enterRoom\(/);
 assert.match(js,/function leaveRoom\(/);
 assert.match(js,/function interactInside\(/);
 assert.match(js,/const roomTargets=/);
 assert.match(css,/room-dialogue\[hidden\]/);
});

test('Farm watering is wired into the same 3D island',()=>{
 assert.match(html,/src="watering3d\.js"/);
 for(const fn of ['beginWatering','finishWatering','plotActionLabel','cropGrowth'])
  assert.ok(js.includes('function '+fn+'('),fn);
 assert.match(js,/window\.KomorebiWatering\?\.draw/);
 assert.match(js,/wateredDay===state\.day/);
});

test('Game clock and sky renderer are linked to the island',()=>{
 assert.match(html,/src="daynight\.js"/);
 assert.match(html,/id="timePill"/);
 assert.match(html,/id="nightSky"/);
 assert.match(js,/function advanceGameClock\(/);
 assert.match(js,/function skipToNextTimePeriod\(/);
 assert.match(js,/DAYLIGHT\.paletteAt\(state\.timeMinutes\)/);
 assert.match(css,/night-sky/);
});

test('Real-time clock does not fast-forward and uses a read-only JST HUD',()=>{
 assert.match(html,/id="timePill"/);
 assert.match(html,/日本標準時と同期中/);
 assert.match(html,/💾 セーブ/);
 assert.doesNotMatch(html,/🌙 翌日へ|clock-fast.*>›/);
 assert.match(js,/DAYLIGHT\.realTimeAt\(/);
 assert.match(js,/DAYLIGHT\.calendarDayDiff\(/);
 assert.doesNotMatch(js,/skipToNextTimePeriod|advanceGameClock|beginNextDay/);
});
