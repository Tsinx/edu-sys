import test from 'node:test';import assert from 'node:assert/strict';
import {decodeNotebook,freshNotebook,loadNotebook,notebookBase,notebookSession,packedNotebook,saveNotebook} from '../src/features/port-simulation/port-class-notebook';
class Store{values=new Map<string,string>();get length(){return this.values.size;}getItem(k:string){return this.values.get(k)??null;}setItem(k:string,v:string){this.values.set(k,v);}key(n:number){return [...this.values.keys()][n]??null;}}
function environment(){const storage=new Store();Object.assign(globalThis,{window:{},localStorage:storage,location:{search:''}});return storage;}
test('separate window branches preserve source evidence and idle saves do not steal the latest pointer',()=>{
 const storage=environment(),source=freshNotebook(11),fork=structuredClone(source);saveNotebook(source,11,'source-session');fork.notes.hypothesis='另一窗口的独立诊断与证据。';saveNotebook(fork,11,'fork-session');saveNotebook(source,11,'source-session');assert.equal(JSON.parse(storage.getItem(notebookBase(11))!).latest,'fork-session');assert.equal(JSON.parse(storage.getItem(notebookSession(11,'source-session'))!).notes.hypothesis,undefined);assert.equal(JSON.parse(storage.getItem(notebookSession(11,'fork-session'))!).notes.hypothesis,fork.notes.hypothesis);
});
test('completion claims are recomputed and a corrupt base record is backed up before new autosaves',()=>{
 const storage=environment(),book=freshNotebook(12),forged={...packedNotebook(book,12),sealedAt:new Date().toISOString()};assert.equal(decodeNotebook(forged,12).sealedAt,null);storage.setItem(notebookBase(12),'malformed-original');const recovered=loadNotebook(12);assert.ok(recovered.error);saveNotebook(recovered.book,12,'fresh-session');assert.ok([...storage.values.entries()].some(([k,v])=>k.includes(':session:corrupt-')&&v==='malformed-original'));assert.ok(storage.getItem(notebookSession(12,'fresh-session')));
});
