import {newLocalPortId} from './local-port-id';
import { PORT_CLASS_LAB_VERSION,createPortClassLab,portLabFinished,restorePortClassLab,serializePortClassLab,type PortClassLab,type PortClassLesson,type PortLabScenario,portIncidentCompletion,portIncidentReportComplete,verifyPortEmergencySubmission,type PortIncidentMode } from '@edu/port-simulation-core';
import { defaultPortAnalysis, decodePortAnalysis, type PortAnalysisDashboard } from './port-analysis-config';
import type {TerminalDispatch} from '@edu/port-simulation-core';
export interface LabAttempt {minute:number;command:string;message:string}
export interface LabRunFinding {id:string;finding:string;legacy?:boolean}
export type LabGuideTopic='core'|'view'|'charts'|'window'|'legend'|'layout'|'export';
export interface LabLearning {version:1;current:LabRunFinding;baseline:LabRunFinding|null;trials:LabRunFinding[];guide:{completed:string[];hidden:boolean;revision?:2;dispatchField?:keyof TerminalDispatch;topic?:LabGuideTopic}}
export interface LabArchive {run:PortClassLab;notes:Record<string,string>;attempts:LabAttempt[];sealedAt:string|null;mode?:PortIncidentMode;finding?:string;runId?:string}
export interface Notebook {run:PortClassLab;baseline:PortClassLab|null;trials:PortClassLab[];step:number;notes:Record<string,string>;sealedAt:string|null;attempts:LabAttempt[];archive:LabArchive[];analysis:PortAnalysisDashboard;comparison?:string;learning?:LabLearning;incidentLearning?:{version:1;mode:PortIncidentMode}}
export const notebookBase=(lesson:PortClassLesson)=>`edu:port-class-lab:2:${lesson}`;
export const notebookSession=(lesson:PortClassLesson,id:string)=>`${notebookBase(lesson)}:session:${id}`;
const savedPayloads=new Map<string,string>();
const protectedBases=new Set<string>();
export const newNotebookId=newLocalPortId;
const newFinding=():LabRunFinding=>({id:newNotebookId(),finding:''});
const newGuide=()=>({completed:[] as string[],hidden:false,revision:2 as const,topic:'core' as const});
export const freshNotebook=(lesson:PortClassLesson,scenario:PortLabScenario='system',mode:PortIncidentMode='teaching'):Notebook=>{const run=createPortClassLab(lesson,undefined,lesson===12?scenario:undefined);return {run,baseline:null,trials:[],step:0,notes:{},sealedAt:null,attempts:[],archive:[],analysis:lesson===11?{version:1,charts:[]}:defaultPortAnalysis(run,lesson),...(lesson===12?{incidentLearning:{version:1 as const,mode}}:{}),...(lesson===11?{learning:{version:1,current:newFinding(),baseline:null,trials:[],guide:newGuide()}}:{})};};
export function currentTrialSaved(book:Notebook){return book.run.kind==='trial'&&(book.learning?book.learning.trials.some(t=>t.id===book.learning!.current.id):book.trials.some(t=>sameCommands(t,book.run)));}
export function trialNumber(book:Notebook){const index=book.learning?.trials.findIndex(t=>t.id===book.learning!.current.id)??-1;return index>=0?index+1:book.trials.length+1;}
export const incidentMode=(book:Notebook):PortIncidentMode=>book.incidentLearning?.mode??'teaching';
export function incidentSubmissionChecks(book:Notebook){return [{id:'mode',label:'使用实战模式',complete:incidentMode(book)==='practical'},...portIncidentCompletion(book.run),{id:'notes',label:'四项复盘各至少15字',complete:portIncidentReportComplete(book.notes)},{id:'sealed',label:'完成并封存实战复盘',complete:!!book.sealedAt&&Number.isFinite(Date.parse(book.sealedAt))}];}
export function incidentSubmissionReady(book:Notebook){return book.run.lesson===12&&incidentSubmissionChecks(book).every(x=>x.complete);}
export function incidentSubmission(book:Notebook){return verifyPortEmergencySubmission({version:'port-emergency-submission/1.0',lesson:12,mode:incidentMode(book),run:serializePortClassLab(book.run),notes:Object.fromEntries(['scope','barriers','conclusion','handover'].map(k=>[k,book.notes[k]??''])),sealedAt:book.sealedAt});}
export function reportReady(book:Notebook){
 if(book.run.lesson===11)return !!book.baseline&&portLabFinished(book.run)&&currentTrialSaved(book)&&['hypothesis','changes','conclusion','limits'].every(k=>(book.notes[k]??'').trim().length>=15);
 return portIncidentReportComplete(book.notes)&&(incidentMode(book)==='teaching'?portLabFinished(book.run):portIncidentCompletion(book.run).every(x=>x.complete));
}

const sameCommands=(a:PortClassLab,b:PortClassLab)=>JSON.stringify(a.commands)===JSON.stringify(b.commands);
function requireFinding(book:Notebook){if(!book.learning?.current.finding.trim())throw Error('进入下一次实验前，请先简要填写本次实验的发现（1—2句即可，也可记录未完成的原因）。');}
/** A trial is a distinct run, even when it repeats exactly the same commands. */
function nextTrial(book:Notebook):Notebook{return {...book,run:createPortClassLab(11,'trial'),learning:{...book.learning!,current:newFinding(),guide:newGuide()},step:2,sealedAt:null};}
export function submitLabRun(book:Notebook,next=false):Notebook{
 if(book.run.lesson!==11||!portLabFinished(book.run))throw Error('请先运行至第360分钟，再保存本次实验。');
 if(currentTrialSaved(book))return next?nextTrial(book):book;
 requireFinding(book);const learning=book.learning!,finding={...learning.current,finding:learning.current.finding.trim()};
 if(book.run.kind==='baseline')return nextTrial({...book,baseline:book.run,learning:{...learning,baseline:finding}});
 const saved={...book,trials:[...book.trials,book.run],learning:{...learning,current:finding,trials:[...learning.trials,finding]},step:3,sealedAt:null};
 return next?nextTrial(saved):saved;
}
export function restartLabRun(book:Notebook):Notebook{
 if(book.run.lesson!==11)throw Error('本操作适用于第11讲。');
 if(currentTrialSaved(book))return nextTrial({...book,attempts:[]});
 // Reset is always available. Saving a result or moving on still requires a finding.
 const archived={...book,archive:[...book.archive,{run:book.run,notes:book.notes,attempts:book.attempts,sealedAt:book.sealedAt,finding:book.learning!.current.finding.trim(),runId:book.learning!.current.id}].slice(-8),attempts:[],sealedAt:null};
 return book.baseline?nextTrial(archived):{...archived,run:createPortClassLab(11),learning:{...book.learning!,current:newFinding(),guide:newGuide()},step:0};
}
function decodeLearning(value:any,book:Notebook):LabLearning{
 // Historical files retain their charts and results. Missing findings stay explicitly unfilled.
 if(value===undefined){const legacy=():LabRunFinding=>({...newFinding(),legacy:true});const baseline=book.baseline?legacy():null,trials=book.trials.map(legacy);const saved=book.trials.map((t,i)=>sameCommands(t,book.run)?i:-1).filter(i=>i>=0).at(-1);return {version:1,current:saved===undefined?newFinding():trials[saved]!,baseline,trials,guide:{completed:[],hidden:true}};}
 const finding=(n:any):LabRunFinding=>{if(!n||typeof n.id!=='string'||!(/^[a-zA-Z0-9-]{8,80}$/).test(n.id)||typeof n.finding!=='string'||n.finding.length>1000||n.legacy!==undefined&&typeof n.legacy!=='boolean')throw Error('每次实验的发现记录格式无效。');return {id:n.id,finding:n.finding,...(n.legacy?{legacy:true}:{})};};
 if(!value||value.version!==1||!Array.isArray(value.trials)||value.trials.length!==book.trials.length||Boolean(value.baseline)!==Boolean(book.baseline)||!value.guide||!Array.isArray(value.guide.completed)||value.guide.completed.length>40||value.guide.completed.some((s:unknown)=>typeof s!=='string'||!(/^[a-z-]{1,40}$/).test(s))||typeof value.guide.hidden!=='boolean')throw Error('实验发现或操作引导记录不完整。');
 if(value.guide.revision!==undefined&&value.guide.revision!==2||value.guide.topic!==undefined&&!['core','view','charts','window','legend','layout','export'].includes(value.guide.topic)||value.guide.dispatchField!==undefined&&!['craneOperators','drivers','yardOperators','gateClerks','technicians'].includes(value.guide.dispatchField))throw Error('操作引导选项无效。');
 const result:LabLearning={version:1,current:finding(value.current),baseline:value.baseline?finding(value.baseline):null,trials:value.trials.map(finding),guide:{completed:value.guide.revision===2?[...new Set<string>(value.guide.completed)]:[],hidden:value.guide.hidden,revision:2,topic:value.guide.topic??'core',...(value.guide.dispatchField?{dispatchField:value.guide.dispatchField}:{})}};
 const records=[...(result.baseline?[result.baseline]:[]),...result.trials];
 if(new Set(records.map(n=>n.id)).size!==records.length||records.some(n=>!n.legacy&&!n.finding.trim())||result.current.id===result.baseline?.id)throw Error('已保存实验缺少独立的发现记录。');
 const saved=result.trials.findIndex(n=>n.id===result.current.id);
 if(saved>=0&&(book.run.kind!=='trial'||!sameCommands(book.run,book.trials[saved]!)||result.current.finding!==result.trials[saved]!.finding))throw Error('当前实验与已保存的发现记录不匹配。');
 return result;
}
function notes(value:unknown):Record<string,string>{if(!value||typeof value!=='object'||Array.isArray(value)||Object.values(value).some(v=>typeof v!=='string'||v.length>5000)||Object.keys(value).length>12)throw Error('复盘文字格式无效。');return value as Record<string,string>;}
function attempts(value:any):LabAttempt[]{const v=value??[];if(!Array.isArray(v)||v.length>80||v.some(a=>!a||!Number.isFinite(a.minute)||typeof a.command!=='string'||a.command.length>80||typeof a.message!=='string'||a.message.length>2000))throw Error('尝试记录格式无效。');return v;}
function run(value:unknown,lesson:PortClassLesson){const r=restorePortClassLab(value,lesson);if(r.version!==PORT_CLASS_LAB_VERSION)throw Error('这是旧版流量实验。原文件可保留；请在逐箱版本重新运行，两个版本的结果不能直接比较。');return r;}
export function decodeNotebook(value:unknown,lesson:PortClassLesson):Notebook{
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('实验笔记格式无效。');const v=value as Record<string,any>;
 if(lesson===12&&v.version==='port-emergency-submission/1.0'){const verified=verifyPortEmergencySubmission(v),book=freshNotebook(12,verified.run.scenario,'practical');return {...book,run:restorePortClassLab(verified.run,12),notes:verified.notes,sealedAt:verified.sealedAt,step:3};}
 if(v.version!==PORT_CLASS_LAB_VERSION||v.lesson!==lesson||!Number.isInteger(v.step)||v.step<0||v.step>3||!Array.isArray(v.trials)||!(v.sealedAt===null||typeof v.sealedAt==='string'))throw Error('实验版本或讲次不匹配。');
 // Replay identical command records once per load, then clone independent snapshots.
 // Findings and run identities stay separate even when the deterministic results coincide.
 const replays=new Map<string,PortClassLab>();
 const replay=(value:unknown)=>{const key=JSON.stringify(value)??'',cached=replays.get(key);if(cached)return structuredClone(cached);const restored=run(value,lesson);replays.set(key,restored);return restored;};
 const current=replay(v.run);
 if(v.comparison!==undefined&&(typeof v.comparison!=='string'||!(/^(latest|none|[0-7])$/).test(v.comparison)))throw Error('方案对照选择无效。');
 const book:Notebook={run:current,baseline:v.baseline?replay(v.baseline):null,trials:v.trials.map(replay),step:v.step,notes:notes(v.notes),attempts:attempts(v.attempts),sealedAt:v.sealedAt,archive:[],analysis:decodePortAnalysis(v.analysis,current,lesson),comparison:v.comparison??'latest'};
 if(lesson===11&&(book.baseline&&(book.baseline.kind!=='baseline'||!portLabFinished(book.baseline))||book.trials.some(t=>t.kind!=='trial'||!portLabFinished(t))||(book.run.kind==='trial'||book.trials.length>0)&&!book.baseline))throw Error('基准与试验记录不完整。');
 if(lesson===12&&(book.baseline||book.trials.length))throw Error('记录不属于本讲事件实验。');
 if(v.archive!==undefined){if(!Array.isArray(v.archive)||v.archive.length>8)throw Error('历史场次过多。');book.archive=v.archive.map((a:any)=>{if(a.finding!==undefined&&(typeof a.finding!=='string'||a.finding.length>1000)||a.runId!==undefined&&(typeof a.runId!=='string'||!(/^[a-zA-Z0-9-]{8,80}$/).test(a.runId)))throw Error('历史发现记录无效。');return {run:replay(a.run),notes:notes(a.notes),attempts:attempts(a.attempts),sealedAt:null,...(a.mode&&['teaching','practical'].includes(a.mode)?{mode:a.mode}:{}),...(a.finding!==undefined?{finding:a.finding,runId:a.runId}:{})};});}
 if(lesson===11)book.learning=decodeLearning(v.learning,book);
 if(lesson===12){const mode=v.incidentLearning?.mode??'teaching';if(v.incidentLearning&&(v.incidentLearning.version!==1||!['teaching','practical'].includes(mode)))throw Error('实验模式无效。');book.incidentLearning={version:1,mode};}
 // A file's completion claim never bypasses recomputed evidence and note requirements.
 if(!book.sealedAt||!Number.isFinite(Date.parse(book.sealedAt))||!reportReady(book))book.sealedAt=null;
 return book;
}
export function packedNotebook(book:Notebook,lesson:PortClassLesson){return {version:PORT_CLASS_LAB_VERSION,lesson,step:book.step,notes:book.notes,sealedAt:book.sealedAt,attempts:book.attempts,analysis:book.analysis,comparison:book.comparison??'latest',...(book.learning?{learning:book.learning}:{}),...(book.run.lesson===12?{incidentLearning:{version:1,mode:incidentMode(book)}}:{}),run:serializePortClassLab(book.run),baseline:book.baseline?serializePortClassLab(book.baseline):null,trials:book.trials.map(serializePortClassLab),archive:book.archive.map(a=>({...a,run:serializePortClassLab(a.run)}))};}
export function loadNotebook(lesson:PortClassLesson){
 let raw:string|null=null,legacyRaw:string|null=null,sourceKey=notebookBase(lesson);
 if(typeof window==='undefined')return {book:freshNotebook(lesson),raw,error:'',legacyRaw};
 const params=new URLSearchParams(location.search),scenario:PortLabScenario=params.get('scenario')==='equipment'?'equipment':'system',mode:PortIncidentMode=params.get('mode')==='practical'?'practical':'teaching';
 if(lesson===12&&!params.get('session'))sourceKey+=`:scenario:${scenario}:mode:${mode}`;
 if(lesson===12&&params.get('fresh')==='1')return {book:freshNotebook(lesson,scenario,mode),raw:null,error:'',legacyRaw};
 try{
  legacyRaw=localStorage.getItem(`edu:port-class-lab:1:${lesson}`);
  const id=params.get('session');
  if(id&&/^[a-zA-Z0-9-]{8,80}$/.test(id)){sourceKey=notebookSession(lesson,id);raw=localStorage.getItem(sourceKey);if(raw===null)throw Error('保存的场次不存在。');}
  else{raw=localStorage.getItem(sourceKey);if(!raw&&lesson===12&&mode==='teaching'){raw=localStorage.getItem(`${notebookBase(lesson)}:scenario:${scenario}`);}if(raw){const pointer=JSON.parse(raw);if(typeof pointer.latest==='string'&&/^[a-zA-Z0-9-]{8,80}$/.test(pointer.latest)){const key=notebookSession(lesson,pointer.latest),record=localStorage.getItem(key);if(record===null)throw Error('保存的场次不存在。');sourceKey=key;raw=record;}}}
  if(!raw){const original=lesson===12?localStorage.getItem(notebookBase(lesson)):null;if(original){try{JSON.parse(original);}catch{sourceKey=notebookBase(lesson);raw=original;throw Error('原版记录损坏');}}return {book:freshNotebook(lesson,scenario,mode),raw:null,error:'',legacyRaw};}if(raw.length>2_000_000)throw Error('记录超过2MB。');
  const book=decodeNotebook(JSON.parse(raw),lesson);return {book,raw:null,error:'',legacyRaw,hasSaved:true};
 }catch{if(raw&&!sourceKey.includes(':session:')){try{localStorage.setItem(notebookSession(lesson,`corrupt-${newNotebookId()}`),raw);}catch{protectedBases.add(sourceKey);}}return {book:freshNotebook(lesson,scenario,mode),raw,error:'原记录无法读取，已保留原文。本窗口的新记录会独立保存。',legacyRaw};}
}
/** Every window (including a duplicated URL) writes a new immutable-source branch. */
export function saveNotebook(book:Notebook,lesson:PortClassLesson,id:string){
 const key=notebookSession(lesson,id),payload=packedNotebook(book,lesson),serialized=JSON.stringify(payload);if(savedPayloads.get(key)===serialized)return;
 const value={...payload,savedAt:new Date().toISOString(),summary:{minute:book.run.terminal.minute,trials:book.trials.length}};
 localStorage.setItem(key,JSON.stringify(value));if(!protectedBases.has(notebookBase(lesson)))localStorage.setItem(notebookBase(lesson),JSON.stringify({version:PORT_CLASS_LAB_VERSION,latest:id}));if(book.run.scenario){const scenarioKey=`${notebookBase(lesson)}:scenario:${book.run.scenario}:mode:${incidentMode(book)}`;if(!protectedBases.has(scenarioKey))localStorage.setItem(scenarioKey,JSON.stringify({version:PORT_CLASS_LAB_VERSION,latest:id}));}savedPayloads.set(key,serialized);
}
export function savedNotebooks(lesson:PortClassLesson){const list:{id:string;label:string;at:number}[]=[],prefix=notebookSession(lesson,'');for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i)!;if(!key.startsWith(prefix))continue;const id=key.slice(prefix.length);try{const v=JSON.parse(localStorage.getItem(key)!);list.push({id,at:Date.parse(v.savedAt)||0,label:`${new Date(v.savedAt).toLocaleString('zh-CN')}${lesson===12?(v.incidentLearning?.mode==='practical'?' · 实战':' · 教学'):(v.run?.kind==='baseline'?' · 基准实验':` · 试验${(v.trials?.length??0)+(v.learning?.trials?.some((t:any)=>t.id===v.learning?.current?.id)?0:1)}`)} · 第${v.summary?.minute??'?'}分钟 · ${v.sealedAt?'已复盘':'草稿'}`});}catch{list.push({id,label:'损坏原文 · '+id,at:0});}}return list.sort((a,b)=>b.at-a.at).slice(0,60);}
