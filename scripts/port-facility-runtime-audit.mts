import {createPortSession,applyPortCommand,servicePortReference,serializePortSession,restorePortSession,portStateHash} from '../packages/port-simulation-core/src/index.ts';
const s=createPortSession('battle');applyPortCommand(s,{kind:'start'});let steps=0;
while(s.second<172800&&steps++<4000){if(steps%360===0)console.log('hour',s.second/3600);servicePortReference(s,2);if(s.status==='paused')applyPortCommand(s,{kind:'resume'});applyPortCommand(s,{kind:'advance',seconds:Math.min(60,172800-s.second)});}
console.log({schema:s.schema,second:s.second,steps,jobs:s.jobs.length,unloaded:Object.values(s.boxes).filter(b=>b.unloadedAt!==null).length,delivered:Object.values(s.boxes).filter(b=>b.deliveredAt!==null).length,moves:s.facilities?.moves.length,stages:s.jobs.map(j=>[j.kind,j.physical?.stage,j.resource,j.physical?.carrier,j.to,j.rate]),bays:s.facilities?.bays});

await (await import('node:fs/promises')).writeFile(new URL('../output/port-facility-repair/comprehensive-48h.json',import.meta.url),serializePortSession(s));

const before=await portStateHash(s),restored=restorePortSession(serializePortSession(s)),after=await portStateHash(restored);if(before!==after)throw Error('48-hour replay hash mismatch');console.log('REPLAY MATCH',before);
await (await import('node:fs/promises')).writeFile(new URL('../output/port-facility-repair/full-replay.json',import.meta.url),JSON.stringify({schema:s.schema,seconds:s.second,unloaded:Object.values(s.boxes).filter(b=>b.unloadedAt!==null).length,delivered:Object.values(s.boxes).filter(b=>b.deliveredAt!==null).length,jobs:s.jobs.length,hash:before,replayHash:after},null,2));
