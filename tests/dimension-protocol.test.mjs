import test from 'node:test';
import assert from 'node:assert/strict';
import {MAX_PLAYERS,WORLDS,SPAWN,makeRoomCode,validRoomCode,normalizeRoomCode,cleanName,cleanChat,limitPosition,protocolPlayer,wireSize,nearby} from '../dimension-protocol.mjs';
import worker,{IslandRoom} from '../multiplayer/worker.mjs';

test('invite room codes use cryptographic randomness and exclude confusing letters',()=>{
 const crypto={getRandomValues:b=>b.fill(31)};
 const code=makeRoomCode(crypto);
 assert.equal(code.length,6);assert.equal(validRoomCode(code),true);
 assert.equal(normalizeRoomCode(code.toLowerCase()),code);
 assert.equal(validRoomCode('AAAAA1'),false);
 assert.equal(validRoomCode('OOOOOO'),false);
 assert.equal(normalizeRoomCode('BAD/AA'),null);
 assert.equal(MAX_PLAYERS,8);
});
test('chat, nicknames, worlds and player positions reject invalid data',()=>{
 assert.equal(cleanName('<script>guest</script>'),'scriptguest/script');
 assert.equal(cleanChat(' hello  <b>world</b> '),'hello bworld/b');
 assert.ok(cleanChat('a'.repeat(200)).length<=56);
 assert.deepEqual(limitPosition(WORLDS.THREE_D,1100,-900),{x:28,z:-21});
 assert.equal(limitPosition('unknown',1,2),null);
 assert.equal(limitPosition(WORLDS.TWO_D,NaN,10),null);
 assert.equal(SPAWN.garden2d.x,0);
 assert.ok(wireSize('💬')>2);
 assert.ok(nearby({world:'garden2d',x:0,z:0},{world:'garden2d',x:1,z:1}));
 assert.equal(nearby({world:'garden2d',x:0,z:0},{world:'plaza3d',x:0,z:0}),false);
 assert.equal(protocolPlayer({id:'x',name:'<hi>',world:'plaza3d',color:9,x:5,z:6}).color,3);
});
function ws(player){
 return {attachment:{...player,lastMove:0,lastChat:0,lastWorld:0},messages:[],
  serializeAttachment(v){this.attachment=v;},deserializeAttachment(){return this.attachment;},
  send(text){this.messages.push(JSON.parse(text));},close(){this.closed=true;}
 };
}
test('single room broadcasts only validated movements with a 5Hz cap',()=>{
 const a=ws({id:'a',name:'杏',world:'plaza3d',x:0,z:0,color:0});
 const b=ws({id:'b',name:'空',world:'plaza3d',x:1,z:0,color:1});
 const ctx={getWebSockets:()=>[a,b]};
 const room=new IslandRoom(ctx,{});
 room.webSocketMessage(a,JSON.stringify({type:'move',x:6,z:0}));
 assert.ok(b.messages.some(m=>m.type==='move'&&m.id==='a'&&m.x===6));
 assert.equal(a.attachment.x,6);
 const count=b.messages.length;
 room.webSocketMessage(a,JSON.stringify({type:'move',x:12,z:0}));
 assert.equal(b.messages.length,count,'must ignore excessively fast location packets');
 room.webSocketMessage(a,'{not json');
 room.webSocketMessage(a,'a'.repeat(513));
 assert.equal(b.messages.length,count);
});
test('server follows players across 3D/2D while rejecting arbitrary worlds and chat spam',()=>{
 const a=ws({id:'a',name:'Hello',world:'plaza3d',x:10,z:11,color:0});
 const b=ws({id:'b',name:'Friend',world:'plaza3d',x:1,z:2,color:1});
 const room=new IslandRoom({getWebSockets:()=>[a,b]},{});
 room.webSocketMessage(a,JSON.stringify({type:'world',world:'garden2d'}));
 assert.equal(a.attachment.world,'garden2d');assert.equal(a.attachment.x,0);
 assert.equal(b.messages.at(-1).type,'world');
 room.webSocketMessage(a,JSON.stringify({type:'world',world:'admin'}));
 assert.equal(a.attachment.world,'garden2d');
 room.webSocketMessage(a,JSON.stringify({type:'chat',text:'<b>Hi</b>'}));
 assert.equal(b.messages.at(-1).text,'bHi/b');
 const count=b.messages.length;
 room.webSocketMessage(a,JSON.stringify({type:'chat',text:'spam'}));
 assert.equal(b.messages.length,count);
 room.webSocketClose(a,1000,'bye');
 assert.equal(b.messages.at(-1).type,'leave');
});
test('worker rejects unauthorized origins and invalid room codes before websocket upgrade',async()=>{
 const env={ALLOWED_ORIGIN:'https://hideomi121154-spec.github.io'};
 const bad=await worker.fetch(new Request('https://service.example/ws?room=ABCDEF',{headers:{Origin:'https://evil.example',Upgrade:'websocket'}}),env);
 assert.equal(bad.status,403);
 const invalid=await worker.fetch(new Request('https://service.example/ws?room=BADCODE',{headers:{Origin:env.ALLOWED_ORIGIN,Upgrade:'websocket'}}),env);
 assert.equal(invalid.status,400);
 const wrongUpgrade=await worker.fetch(new Request('https://service.example/ws?room=ABCDEF',{headers:{Origin:env.ALLOWED_ORIGIN}}),env);
 assert.equal(wrongUpgrade.status,426);
 const health=await worker.fetch(new Request('https://service.example/health'),env);
 assert.equal(health.status,200);
 assert.equal((await health.json()).capacity,8);
});
