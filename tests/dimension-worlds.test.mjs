import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=file('dimension-hub.html'),js=file('dimension-hub.js'),art=file('dimension-art2d.mjs'),scene=file('dimension-scene3d.mjs'),config=file('dimension-config.js'),island=file('index.html'),css=file('dimension-hub.css');
test('existing island exposes a rainbow portal without changing its local save',()=>{
 assert.match(island,/id="dimensionGateBtn"/);
 assert.match(island,/href="\.\/dimension-hub\.html"/);
 assert.match(file('styles.css'),/edge-buttons \.dimension-link/);
 assert.match(file('game.js'),/komorebi_island_3d_v01/);
 assert.doesNotMatch(js,/komorebi_island_3d_v01/);
});
test('3D and pixel-art 2D worlds have independent renderers and a real world switch',()=>{
 assert.match(html,/id="dimension3d"/);
 assert.match(html,/id="dimension2d"/);
 assert.match(html,/id="toggleWorld"/);
 assert.match(html,/id="sceneFade"/);
 assert.match(js,/import\('\.\/dimension-scene3d\.mjs/);
 assert.match(js,/createDimension2D/);
 assert.match(js,/function switchWorld\(/);
 assert.match(js,/player\.world=world/);
 assert.match(js,/document\.documentElement\.dataset\.dimension=world/);
 assert.match(scene,/new THREE\.WebGLRenderer/);
 assert.match(scene,/new THREE\.PerspectiveCamera/);
 assert.match(scene,/new THREE\.HemisphereLight/);
 assert.match(scene,/const gate=new THREE\.Group/);
 assert.match(art,/function createDimension2D/);
 assert.match(art,/drawHouse/);
 assert.match(art,/drawFlower/);
 assert.match(art,/const users=peers\.filter/);
});
test('2D mode offers collectibles while portal shares local identity across dimensions',()=>{
 assert.match(html,/id="minigameHud"/);
 assert.match(html,/id="petals"/);
 assert.match(art,/export const FLOWERS/);
 assert.match(js,/function collectFlowers\(/);
 assert.match(js,/collected\.add\(i\)/);
 assert.match(js,/doSend\(\{type:'world',world\}\)/);
 assert.match(js,/player\.name=cleanName/);
});
test('multiplayer requires real configured endpoint and never fakes remote users offline',()=>{
 assert.match(config,/KOMOREBI_ROOM_WS_URL=''/);
 assert.match(js,/const ENDPOINT_VALID=/);
 assert.match(js,/\$\('copyRoom'\)\.disabled=!ENDPOINT_VALID/);
 assert.match(js,/\$\('connectRoom'\)\.disabled=!ENDPOINT_VALID/);
 assert.match(js,/new WebSocket\(/);
 assert.match(js,/connected=false/);
 assert.match(js,/players=new Map\(/);
 assert.match(js,/type:'move'/);
 assert.match(js,/type:'chat'/);
 assert.match(js,/type:'world'/);
 assert.match(html,/オンラインサーバー未設定でも/);
});
test('mobile touch controls and an accessible room invitation UI are available',()=>{
 for(const id of ['enterWorld','openFriends','closeFriends','playerName','roomCode','newRoom','connectRoom','copyRoom','playerList','chatForm','chatInput','chatToggle','portalAction']){
  assert.match(html,new RegExp('id="'+id+'"'));
 }
 assert.match(js,/setPointerCapture/);
 assert.match(js,/lostpointercapture/);
 assert.match(css,/touch-action:none/);
 assert.match(css,/friends-panel/);
 assert.match(html,/maximum-scale|user-scalable=no/);
});
test('Cloudflare backend is a SQLite Durable Object with hibernating WebSockets',()=>{
 const worker=file('multiplayer/worker.mjs'),wrangler=file('multiplayer/wrangler.jsonc');
 assert.match(wrangler,/new_sqlite_classes/);
 assert.match(wrangler,/IslandRoom/);
 assert.match(worker,/ctx\.acceptWebSocket\(server\)/);
 assert.match(worker,/serializeAttachment/);
 assert.match(worker,/getWebSockets/);
 assert.match(worker,/origin_not_allowed/);
 assert.match(worker,/room_full/);
 assert.match(worker,/lastMove/);
});
