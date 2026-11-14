import {MAX_PLAYERS,WORLDS,SPAWN,EMOTES,cleanName,cleanChat,normalizeRoomCode,validWorld,limitPosition,protocolPlayer,wireSize} from '../dimension-protocol.mjs';

function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});}
const allowed=(request,env)=>{
 const origin=request.headers.get('Origin');
 const expected=env.ALLOWED_ORIGIN||'https://hideomi121154-spec.github.io';
 return origin===expected||(env.DEV_MODE==='true'&&/^http:\/\/(localhost|127\.0\.0\.1):\d{2,5}$/.test(origin||''));
};

export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(url.pathname==='/health')return json({ok:true,service:'komorebi-rooms',capacity:MAX_PLAYERS});
  if(url.pathname!=='/ws')return json({error:'not_found'},404);
  if(!allowed(request,env))return json({error:'origin_not_allowed'},403);
  if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return json({error:'websocket_required'},426);
  const room=normalizeRoomCode(url.searchParams.get('room'));
  if(!room)return json({error:'invalid_room_code'},400);
  if(!env.ROOMS)return json({error:'rooms_binding_missing'},503);
  const id=env.ROOMS.idFromName('room-v1-'+room);
  return env.ROOMS.get(id).fetch(request);
 }
};

function getPeer(ws){
 const v=ws.deserializeAttachment?.();
 return v?.id&&v?.world? v:null;
}

export class IslandRoom {
 constructor(ctx,env){this.ctx=ctx;this.env=env;}
 broadcast(packet,except=null){
  const msg=JSON.stringify(packet);
  for(const socket of this.ctx.getWebSockets()){
   if(socket===except)continue;
   try{socket.send(msg);}catch{/* socket already closed */}
  }
 }
 async fetch(request){
  const peers=this.ctx.getWebSockets();
  if(peers.length>=MAX_PLAYERS)return json({error:'room_full',capacity:MAX_PLAYERS},409);
  const url=new URL(request.url),name=cleanName(url.searchParams.get('name'));
  const color=Number(url.searchParams.get('color'));
  const player=protocolPlayer({
   id:crypto.randomUUID(),name,world:WORLDS.THREE_D,
   x:SPAWN.plaza3d.x,z:SPAWN.plaza3d.z,
   color:Number.isInteger(color)&&color>=0?color:0
  });
  const pair=new WebSocketPair(),[client,server]=Object.values(pair);
  this.ctx.acceptWebSocket(server);
  server.serializeAttachment({...player,lastMove:0,lastChat:0,lastWorld:0});
  const players=peers.map(getPeer).filter(Boolean).map(protocolPlayer);
  server.send(JSON.stringify({type:'welcome',you:player.id,players:[...players,player],capacity:MAX_PLAYERS}));
  this.broadcast({type:'join',player},server);
  return new Response(null,{status:101,webSocket:client});
 }
 webSocketMessage(ws,raw){
  if(typeof raw!=='string'||wireSize(raw)>512)return;
  const s=getPeer(ws);if(!s)return;
  let data;try{data=JSON.parse(raw);}catch{return;}
  if(!data||typeof data!=='object')return;
  const now=Date.now();
  switch(data.type){
   case 'move': {
    if(now-(s.lastMove||0)<180)return; // <= about 5 updates/s
    const point=limitPosition(s.world,data.x,data.z);
    if(!point)return;
    // Limit forged position jumps while allowing latency after reconnection.
    const elapsed=Math.min(1.5,Math.max(.18,(now-(s.lastMove||0))/1000));
    const maxDist=elapsed*8+1.2;
    const distance=Math.hypot(point.x-s.x,point.z-s.z);
    if(distance>maxDist){
     const k=maxDist/distance;
     point.x=Number((s.x+(point.x-s.x)*k).toFixed(2));
     point.z=Number((s.z+(point.z-s.z)*k).toFixed(2));
    }
    s.x=point.x;s.z=point.z;s.lastMove=now;
    ws.serializeAttachment(s);
    this.broadcast({type:'move',id:s.id,world:s.world,x:s.x,z:s.z},ws);
    break;
   }
   case 'world': {
    if(!validWorld(data.world)||data.world===s.world||now-(s.lastWorld||0)<800)return;
    s.world=data.world;s.x=SPAWN[s.world].x;s.z=SPAWN[s.world].z;
    s.lastWorld=now;s.lastMove=now-200;
    ws.serializeAttachment(s);
    this.broadcast({type:'world',id:s.id,world:s.world,x:s.x,z:s.z});
    break;
   }
   case 'chat': {
    if(now-(s.lastChat||0)<1800)return;
    const text=cleanChat(data.text);if(!text)return;
    s.lastChat=now;ws.serializeAttachment(s);
    this.broadcast({type:'chat',id:s.id,name:s.name,text,world:s.world});
    break;
   }
   case 'emote': {
    if(!EMOTES.includes(data.emote)||now-(s.lastChat||0)<700)return;
    s.lastChat=now;ws.serializeAttachment(s);
    this.broadcast({type:'emote',id:s.id,emote:data.emote,world:s.world});
    break;
   }
   case 'ping': ws.send(JSON.stringify({type:'pong'}));break;
  }
 }
 webSocketClose(ws,code,reason){
  const s=getPeer(ws);
  try{ws.close(code,reason);}catch{}
  if(s)this.broadcast({type:'leave',id:s.id},ws);
 }
 webSocketError(ws){
  const s=getPeer(ws);
  try{ws.close(1011,'connection error');}catch{}
  if(s)this.broadcast({type:'leave',id:s.id},ws);
 }
}
