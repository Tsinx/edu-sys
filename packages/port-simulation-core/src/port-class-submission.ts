import { PORT_COURSE_UNITS, type PortCourseSelection } from './port-course.js';
import { PORT_CLASS_LAB_VERSION, portClassLabMetrics, portLabFinished, restorePortClassLab, serializePortClassLab, type PortClassLab } from './port-class-lab.js';
import { portIncidentCompletion } from './port-incident-review.js';
import { sha256Hex } from './sha256.js';
import { verifyPortSubmission, type PortSubmissionPackage, type PortSubmissionResult, type PortEvidenceNode } from './port-submission.js';

export const PORT_CLASS_SUBMISSION_SCHEMA='port-class-lab-submission/1';
export const PORT_CLASS_SUBMISSION_UNITS=[
  {id:'performance',title:'第11讲 · 港口绩效诊断',short:'绩效',href:'/port-class-lab.html?lesson=11'},
  {id:'emergency-system',title:'第12讲 · 系统中断恢复',short:'系统恢复',href:'/port-class-lab.html?lesson=12&scenario=system'},
  {id:'emergency-equipment',title:'第12讲 · 设备故障恢复',short:'设备恢复',href:'/port-class-lab.html?lesson=12&scenario=equipment'},
] as const;
export type PortClassSubmissionUnit=typeof PORT_CLASS_SUBMISSION_UNITS[number]['id'];
export type PortSubmissionUnit=PortCourseSelection|PortClassSubmissionUnit;
export const PORT_SUBMISSION_UNITS=[...PORT_COURSE_UNITS.map(u=>({...u,href:`/simulations?course=${u.id}`})),...PORT_CLASS_SUBMISSION_UNITS];
export const isPortClassSubmissionUnit=(unit:string):unit is PortClassSubmissionUnit=>PORT_CLASS_SUBMISSION_UNITS.some(u=>u.id===unit);
export interface PortClassSubmissionRecord {
  version:'port-class-report/1';lesson:11|12;mode:'teaching'|'practical';
  run:ReturnType<typeof serializePortClassLab>;baseline:ReturnType<typeof serializePortClassLab>|null;trials:Array<ReturnType<typeof serializePortClassLab>>;
  notes:Record<string,string>;sealedAt:string;findings:{baseline:string;trials:string[]};
}
export interface PortClassSubmissionPackage {
  schema:typeof PORT_CLASS_SUBMISSION_SCHEMA;unit:PortClassSubmissionUnit;ended:'student'|'completed';record:string;expected:{stateHash:string;score:number};
}
export type AnyPortSubmissionPackage=PortSubmissionPackage|PortClassSubmissionPackage;
export interface PortClassVerifiedReport {
  kind:'class-lab';record:PortClassSubmissionRecord;
  runs:Array<{label:string;record:ReturnType<typeof serializePortClassLab>;metrics:ReturnType<typeof portClassLabMetrics>;finding:string}>;
}
const hash=(value:unknown)=>sha256Hex(new TextEncoder().encode(JSON.stringify(value)));
function rebuild(value:unknown){
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('课堂实验提交格式无效。');
  const v=value as PortClassSubmissionRecord;
  if(v.version!=='port-class-report/1'||![11,12].includes(v.lesson)||!['teaching','practical'].includes(v.mode)||v.lesson===11&&v.mode!=='teaching')throw Error('课堂实验版本、讲次或模式无效。');
  const fields=v.lesson===11?['hypothesis','changes','conclusion','limits']:['scope','barriers','conclusion','handover'];
  if(!v.notes||typeof v.notes!=='object'||Array.isArray(v.notes)||Object.keys(v.notes).length>12||Object.values(v.notes).some(n=>typeof n!=='string'||n.length>5000)||fields.some(k=>typeof v.notes[k]!=='string'||v.notes[k]!.trim().length<15))throw Error('请为四项复盘各写至少15字，单项不超过5000字。');
  if(typeof v.sealedAt!=='string'||!Number.isFinite(Date.parse(v.sealedAt)))throw Error('请先完成并保存复盘，再提交教师。');
  if(!Array.isArray(v.trials)||v.trials.length>100||!v.findings||typeof v.findings.baseline!=='string'||v.findings.baseline.length>1000||!Array.isArray(v.findings.trials)||v.findings.trials.length!==v.trials.length||v.findings.trials.some(n=>typeof n!=='string'||n.length>1000))throw Error('基准、试验或发现记录无效。');
  const cache=new Map<string,PortClassLab>();
  const replay=(record:unknown)=>{const key=JSON.stringify(record),prior=cache.get(key);if(prior)return prior;const run=restorePortClassLab(record,v.lesson);if(run.version!==PORT_CLASS_LAB_VERSION)throw Error('请使用当前逐箱实验版本提交。');cache.set(key,run);return run;};
  const run=replay(v.run),baseline=v.baseline?replay(v.baseline):null,trials=v.trials.map(replay);
  if(!portLabFinished(run))throw Error(`请先观察至第${run.endpoint}分钟。`);
  const goals:PortSubmissionResult['goals']=[];
  let unit:PortClassSubmissionUnit;
  if(v.lesson===11){
    unit='performance';
    if(!baseline||baseline.kind!=='baseline'||!portLabFinished(baseline)||!trials.length||trials.some(t=>t.kind!=='trial'||!portLabFinished(t))||run.kind!=='trial'||!trials.some(t=>hash(serializePortClassLab(t))===hash(serializePortClassLab(run))))throw Error('请保存完整基准和至少一次试验，再完成复盘。');
    goals.push({id:'baseline',label:'完成并保存同开局基准',done:true},{id:'trial',label:'完成并保存对照试验',done:true},{id:'findings',label:'基准与每次试验均有发现记录',done:!!v.findings.baseline.trim()&&v.findings.trials.every(n=>!!n.trim())});
  }else{
    if(!run.scenario||baseline||trials.length)throw Error('第12讲提交必须对应单独的系统或设备场景。');
    unit=run.scenario==='system'?'emergency-system':'emergency-equipment';
    const checks=portIncidentCompletion(run);
    if(v.mode==='practical'&&checks.some(c=>!c.complete))throw Error('实战尚未完成：'+checks.filter(c=>!c.complete).map(c=>c.label).join('；'));
    goals.push(...checks.map(c=>({id:c.id,label:c.label,done:c.complete})));
  }
  goals.push({id:'report',label:'四项复盘已填写并保存（文字质量由教师复核）',done:true});
  const record:PortClassSubmissionRecord={version:'port-class-report/1',lesson:v.lesson,mode:v.mode,run:serializePortClassLab(run),baseline:baseline?serializePortClassLab(baseline):null,trials:trials.map(serializePortClassLab),notes:Object.fromEntries(fields.map(k=>[k,v.notes[k]!.trim()])),sealedAt:v.sealedAt,findings:{baseline:v.findings.baseline.trim(),trials:v.findings.trials.map(n=>n.trim())}};
  const runs:PortClassVerifiedReport['runs']=[...(baseline?[{label:'基准',record:serializePortClassLab(baseline),metrics:portClassLabMetrics(baseline),finding:record.findings.baseline}]:[]),...trials.map((t,i)=>({label:`试验 ${i+1}`,record:serializePortClassLab(t),metrics:portClassLabMetrics(t),finding:record.findings.trials[i]!})),...(v.lesson===12?[{label:unit==='emergency-system'?'系统中断恢复':'设备故障恢复',record:serializePortClassLab(run),metrics:portClassLabMetrics(run),finding:''}]:[])];
  const complete=goals.every(g=>g.done);
  const result:PortSubmissionResult={unit,score:Math.round(goals.filter(g=>g.done).length/goals.length*10000)/100,mode:v.mode==='practical'?'battle':'practice',second:run.terminal.minute*60,elapsed:(run.terminal.minute-run.checkpoint)*60,complete,traceCoverage:'complete',stateHash:hash({record,runs:runs.map(r=>r.metrics)}),verifier:'port-class-verifier/1',goals,breakdown:null,commands:[...(baseline?[baseline]:[]),...trials,...(v.lesson===12?[run]:[])].reduce((n,r)=>n+r.commands.length,0)};
  return {result,nodes:[] as PortEvidenceNode[],report:{kind:'class-lab' as const,record,runs}};
}
export function makePortClassSubmission(value:unknown):PortClassSubmissionPackage {
  const verified=rebuild(value);
  return {schema:PORT_CLASS_SUBMISSION_SCHEMA,unit:verified.result.unit as PortClassSubmissionUnit,ended:verified.result.complete?'completed':'student',record:JSON.stringify(verified.report.record),expected:{stateHash:verified.result.stateHash,score:verified.result.score}};
}
export function verifyPortClassSubmission(pkg:PortClassSubmissionPackage){
  if(pkg.schema!==PORT_CLASS_SUBMISSION_SCHEMA||typeof pkg.record!=='string'||pkg.record.length>2_000_000)throw Error('课堂实验提交包版本或大小无效。');
  const verified=rebuild(JSON.parse(pkg.record));
  if(pkg.unit!==verified.result.unit||pkg.ended!==(verified.result.complete?'completed':'student')||pkg.expected?.stateHash!==verified.result.stateHash||pkg.expected?.score!==verified.result.score)throw Error('课堂实验提交结果与服务端重放不一致。');
  return verified;
}
export async function verifyPortExperimentSubmission(pkg:AnyPortSubmissionPackage){return pkg.schema===PORT_CLASS_SUBMISSION_SCHEMA?verifyPortClassSubmission(pkg):verifyPortSubmission(pkg);}
