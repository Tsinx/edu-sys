import {newLocalPortId} from './local-port-id';
import { PORT_CLASS_LAB_VERSION,createPortClassLab,portLabFinished,restorePortClassLab,serializePortClassLab,type PortClassLab,type PortClassLesson,type PortLabScenario } from '@edu/port-simulation-core';
import { defaultPortAnalysis, decodePortAnalysis, type PortAnalysisDashboard } from './port-analysis-config';
export interface LabAttempt {minute:number;command:string;message:string}
export interface LabArchive {run:PortClassLab;notes:Record<string,string>;attempts:LabAttempt[];sealedAt:string|null}
export interface Notebook {run:PortClassLab;baseline:PortClassLab|null;trials:PortClassLab[];step:number;notes:Record<string,string>;sealedAt:string|null;attempts:LabAttempt[];archive:LabArchive[];analysis:PortAnalysisDashboard;comparison?:string}
export const notebookBase=(lesson:PortClassLesson)=>`edu:port-class-lab:2:${lesson}`;
export const notebookSession=(lesson:PortClassLesson,id:string)=>`${notebookBase(lesson)}:session:${id}`;
const savedPayloads=new Map<string,string>();
const protectedBases=new Set<string>();
export const newNotebookId=newLocalPortId;
export const freshNotebook=(lesson:PortClassLesson,scenario:PortLabScenario='system'):Notebook=>{const run=createPortClassLab(lesson,undefined,lesson===12?scenario:undefined);return {run,baseline:null,trials:[],step:0,notes:{},sealedAt:null,attempts:[],archive:[],analysis:defaultPortAnalysis(run,lesson)};};
export function reportReady(book:Notebook){const lesson=book.run.lesson,fields=lesson===11?['hypothesis','changes','conclusion','limits']:['scope','barriers','conclusion','handover'];return (lesson===11?!!book.baseline&&portLabFinished(book.run)&&book.trials.some(t=>JSON.stringify(t.commands)===JSON.stringify(book.run.commands)):portLabFinished(book.run))&&fields.every(k=>(book.notes[k]??'').trim().length>=15);}
function notes(value:unknown):Record<string,string>{if(!value||typeof value!=='object'||Array.isArray(value)||Object.values(value).some(v=>typeof v!=='string'||v.length>5000)||Object.keys(value).length>12)throw Error('复盘文字格式无效。');return value as Record<string,string>;}
function attempts(value:any):LabAttempt[]{const v=value??[];if(!Array.isArray(v)||v.length>80||v.some(a=>!a||!Number.isFinite(a.minute)||typeof a.command!=='string'||a.command.length>80||typeof a.message!=='string'||a.message.length>2000))throw Error('尝试记录格式无效。');return v;}
function run(value:unknown,lesson:PortClassLesson){const r=restorePortClassLab(value,lesson);if(r.version!==PORT_CLASS_LAB_VERSION)throw Error('这是旧版流量实验。原文件可保留；请在逐箱版本重新运行，两个版本的结果不能直接比较。');return r;}
export function decodeNotebook(value:unknown,lesson:PortClassLesson):Notebook{
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('实验笔记格式无效。');const v=value as Record<string,any>;
 if(v.version!==PORT_CLASS_LAB_VERSION||v.lesson!==lesson||!Number.isInteger(v.step)||v.step<0||v.step>3||!Array.isArray(v.trials)||v.trials.length>3||!(v.sealedAt===null||typeof v.sealedAt==='string'))throw Error('实验版本或讲次不匹配。');
 const current=run(v.run,lesson);
 if(v.comparison!==undefined&&(typeof v.comparison!=='string'||!(/^(latest|none|[0-7])$/).test(v.comparison)))throw Error('方案对照选择无效。');
 const book:Notebook={run:current,baseline:v.baseline?run(v.baseline,lesson):null,trials:v.trials.map((r:unknown)=>run(r,lesson)),step:v.step,notes:notes(v.notes),attempts:attempts(v.attempts),sealedAt:v.sealedAt,archive:[],analysis:decodePortAnalysis(v.analysis,current,lesson),comparison:v.comparison??'latest'};
 if(lesson===11&&(book.baseline&&(book.baseline.kind!=='baseline'||!portLabFinished(book.baseline))||book.trials.some(t=>t.kind!=='trial'||!portLabFinished(t))||book.run.kind==='trial'&&!book.baseline))throw Error('基准与试验记录不完整。');
 if(lesson===12&&(book.baseline||book.trials.length))throw Error('记录不属于本讲事件实验。');
 if(v.archive!==undefined){if(!Array.isArray(v.archive)||v.archive.length>8)throw Error('历史场次过多。');book.archive=v.archive.map((a:any)=>({run:run(a.run,lesson),notes:notes(a.notes),attempts:attempts(a.attempts),sealedAt:null}));}
 // A file's completion claim never bypasses recomputed evidence and note requirements.
 if(!book.sealedAt||!Number.isFinite(Date.parse(book.sealedAt))||!reportReady(book))book.sealedAt=null;
 return book;
}
export function packedNotebook(book:Notebook,lesson:PortClassLesson){return {version:PORT_CLASS_LAB_VERSION,lesson,step:book.step,notes:book.notes,sealedAt:book.sealedAt,attempts:book.attempts,analysis:book.analysis,comparison:book.comparison??'latest',run:serializePortClassLab(book.run),baseline:book.baseline?serializePortClassLab(book.baseline):null,trials:book.trials.map(serializePortClassLab),archive:book.archive.map(a=>({...a,run:serializePortClassLab(a.run)}))};}
export function loadNotebook(lesson:PortClassLesson){
 let raw:string|null=null,legacyRaw:string|null=null,sourceKey=notebookBase(lesson);
 if(typeof window==='undefined')return {book:freshNotebook(lesson),raw,error:'',legacyRaw};
 const params=new URLSearchParams(location.search),scenario:PortLabScenario=params.get('scenario')==='equipment'?'equipment':'system';
 if(lesson===12&&!params.get('session'))sourceKey+=`:scenario:${scenario}`;
 try{
  legacyRaw=localStorage.getItem(`edu:port-class-lab:1:${lesson}`);
  const id=params.get('session');
  if(id&&/^[a-zA-Z0-9-]{8,80}$/.test(id)){sourceKey=notebookSession(lesson,id);raw=localStorage.getItem(sourceKey);if(raw===null)throw Error('保存的场次不存在。');}
  else{raw=localStorage.getItem(sourceKey);if(raw){const pointer=JSON.parse(raw);if(typeof pointer.latest==='string'&&/^[a-zA-Z0-9-]{8,80}$/.test(pointer.latest)){const key=notebookSession(lesson,pointer.latest),record=localStorage.getItem(key);if(record===null)throw Error('保存的场次不存在。');sourceKey=key;raw=record;}}}
  if(!raw){const original=lesson===12?localStorage.getItem(notebookBase(lesson)):null;if(original){try{JSON.parse(original);}catch{sourceKey=notebookBase(lesson);raw=original;throw Error('原版记录损坏');}}return {book:freshNotebook(lesson,scenario),raw:null,error:'',legacyRaw};}if(raw.length>2_000_000)throw Error('记录超过2MB。');
  return {book:decodeNotebook(JSON.parse(raw),lesson),raw:null,error:'',legacyRaw};
 }catch{if(raw&&!sourceKey.includes(':session:')){try{localStorage.setItem(notebookSession(lesson,`corrupt-${newNotebookId()}`),raw);}catch{protectedBases.add(sourceKey);}}return {book:freshNotebook(lesson,scenario),raw,error:'原记录无法读取，已保留原文。本窗口的新记录会独立保存。',legacyRaw};}
}
/** Every window (including a duplicated URL) writes a new immutable-source branch. */
export function saveNotebook(book:Notebook,lesson:PortClassLesson,id:string){
 const key=notebookSession(lesson,id),payload=packedNotebook(book,lesson),serialized=JSON.stringify(payload);if(savedPayloads.get(key)===serialized)return;
 const value={...payload,savedAt:new Date().toISOString(),summary:{minute:book.run.terminal.minute,trials:book.trials.length}};
 localStorage.setItem(key,JSON.stringify(value));if(!protectedBases.has(notebookBase(lesson)))localStorage.setItem(notebookBase(lesson),JSON.stringify({version:PORT_CLASS_LAB_VERSION,latest:id}));if(book.run.scenario)localStorage.setItem(`${notebookBase(lesson)}:scenario:${book.run.scenario}`,JSON.stringify({version:PORT_CLASS_LAB_VERSION,latest:id}));savedPayloads.set(key,serialized);
}
export function savedNotebooks(lesson:PortClassLesson){const list:{id:string;label:string;at:number}[]=[],prefix=notebookSession(lesson,'');for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i)!;if(!key.startsWith(prefix))continue;const id=key.slice(prefix.length);try{const v=JSON.parse(localStorage.getItem(key)!);list.push({id,at:Date.parse(v.savedAt)||0,label:`${new Date(v.savedAt).toLocaleString('zh-CN')} · 第${v.summary?.minute??'?'}分钟 · ${v.sealedAt?'已复盘':'草稿'}`});}catch{list.push({id,label:'损坏原文 · '+id,at:0});}}return list.sort((a,b)=>b.at-a.at).slice(0,60);}
