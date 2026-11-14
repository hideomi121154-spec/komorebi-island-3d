// Pure, shared validation rules for the browser and Cloudflare room server.
// No payments, no accounts, and no sharing of the original island save.
export const MAX_PLAYERS=8;
export const WORLDS=Object.freeze({THREE_D:'plaza3d',TWO_D:'garden2d'});
export const SPAWN=Object.freeze({plaza3d:{x:0,z:3},garden2d:{x:0,z:3}});
export const EMOTES=Object.freeze(['wave','heart','dance','cheer']);
const CODE_CHARS='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function validRoomCode(code){return typeof code==='string'&&/^[A-HJ-NP-Z2-9]{6}$/.test(code);}
export function normalizeRoomCode(value){
 const s=String(value||'').trim().toUpperCase();
 return validRoomCode(s)?s:null;
}
export function makeRoomCode(cryptoObject=globalThis.crypto){
 if(!cryptoObject?.getRandomValues)throw Error('安全な招待コードの作成には暗号学的乱数が必要です');
 const bytes=new Uint8Array(6);
 cryptoObject.getRandomValues(bytes);
 return Array.from(bytes,x=>CODE_CHARS[x%CODE_CHARS.length]).join('');
}
export function cleanName(value){
 const s=String(value??'').replace(/[<>\x00-\x1F\x7F]/g,'').replace(/\s+/g,' ').trim().slice(0,14);
 return s||'旅人';
}
export function cleanChat(value){
 return String(value??'').replace(/[<>\x00-\x1F\x7F]/g,'').replace(/\s+/g,' ').trim().slice(0,56);
}
export function validWorld(world){return world===WORLDS.THREE_D||world===WORLDS.TWO_D;}
export function limitPosition(world,x,z){
 if(!validWorld(world)||!Number.isFinite(x)||!Number.isFinite(z))return null;
 return {x:Math.max(-28,Math.min(28,Math.round(x*100)/100)),
  z:Math.max(-21,Math.min(21,Math.round(z*100)/100))};
}
export function wireSize(message){
 if(typeof message!=='string')return Number.POSITIVE_INFINITY;
 return new TextEncoder().encode(message).byteLength;
}
export function nearby(a,b){return a.world===b.world&&Math.hypot(a.x-b.x,a.z-b.z)<3.2;}
export function protocolPlayer(a){
 return {id:String(a.id),name:cleanName(a.name),world:validWorld(a.world)?a.world:WORLDS.THREE_D,
  x:Number(a.x)||0,z:Number(a.z)||0,color:Number.isInteger(a.color)?a.color%6:0};
}
