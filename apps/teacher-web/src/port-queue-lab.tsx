import {StrictMode,useCallback,useEffect,useMemo,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {QUEUE_HAND_ARRIVALS,QUEUE_RANDOM_DEFAULT,queueJobs,runQueue,summarizeQueue,randomQueue,appointmentQueue,queueCostPlans,type QueueRecord,type QueueSummary,type RandomQueueInput} from '@edu/course-content';
import {QueueTimeline} from './features/port-expansion/PortQueueComposition';
import {PortQueueProcess,type QueueReplayCommand} from './features/port-expansion/PortQueueProcess';
import {queueWaitSamples} from './features/port-expansion/queue-process-model';
import 'katex/dist/katex.min.css';
import './features/port-expansion/port-queue.css';
import './features/port-expansion/port-queue-lab.css';
import './features/port-expansion/port-queue-process.css';

type Scene='hand'|'random'|'appointment';
type AppointmentMode='burst'|'appointment'|'two-servers';
type HandConfig={arrivals:string;service:number};
type Draft={prediction:string;finding:string};
type History={scene:Scene;time:string;parameters:unknown;summary:QueueSummary;prediction:string;finding:string};
type Saved={scene:Scene;guide:boolean;arrivals:string;service:number;handConfig:HandConfig|null;visible:number;randomInput:RandomQueueInput;lastRandom:RandomQueueInput|null;appointment:AppointmentMode;lastAppointment:AppointmentMode|null;prediction:string;finding:string;drafts:Record<Scene,Draft>;history:History[];processRuns:Record<Scene,string>};
const storage='port-queue-lab-v1',format=(n:number,d=2)=>n.toLocaleString('zh-CN',{maximumFractionDigits:d});
function load():Partial<Saved>{try{const parsed:unknown=JSON.parse(localStorage.getItem(storage)??'{}');if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))return {};const value=parsed as Partial<Saved>;return {...value,history:Array.isArray(value.history)?value.history.filter(h=>h&&['hand','random','appointment'].includes(h.scene)&&h.summary&&Number.isFinite(h.summary.meanWait)&&Number.isFinite(h.summary.meanTotal)&&Number.isFinite(h.summary.count)&&typeof h.finding==='string'):[]};}catch{return {};}}
const cached=load(),query=new URLSearchParams(location.search).get('scene');
const initialDrafts:Record<Scene,Draft>={hand:{prediction:'',finding:''},random:{prediction:'',finding:''},appointment:{prediction:'',finding:''}};
for(const key of ['hand','random','appointment'] as const){const d=cached.drafts?.[key];if(d&&typeof d.prediction==='string'&&typeof d.finding==='string')initialDrafts[key]=d;}
if(cached.scene&&['hand','random','appointment'].includes(cached.scene))initialDrafts[cached.scene]={prediction:cached.prediction??'',finding:cached.finding??''};
const initialScene:Scene=query==='hand'||query==='random'||query==='appointment'?query:cached.scene==='random'||cached.scene==='appointment'?cached.scene:'hand';
const scenes:Record<Scene,{name:string;question:string;steps:string[]}>={
 hand:{name:'模拟一 · 逐车手算',question:'相同服务工作量，成对到达会增加多少等待？',steps:['先写出预测，并在纸上计算前两辆车。','开始后播放过程，或逐事件观察车辆从等待到核验。用开始=max(到达,前车完成)核对。','“下一辆”推进到下一辆完成时刻。回退回放可重看过程，已核对记录保留。','比较均匀到达与成对到达，保存平均等待及解释。']},
 random:{name:'模拟二 · 随机车流',question:'理论的长期平均，与这一次有限样本差多少？',steps:['保持μ100，分别将λ设为80、90、95，运行前先算理论W。','固定种子用于条件对照，更换种子检查同参数的随机波动。','记录4000票，前500票仅作热身；所有选中票都服务到完成。','切换固定服务时长时，使用模拟结果，并重新检查理论适用性。']},
 appointment:{name:'模拟三 · 预约与边界',question:'闸口等待归零以后，全程是否真的更短？',steps:['第0、8、16分钟各4辆就绪，每车服务2分钟，路程暂为0。','分别运行原流程、分时预约和双台共队列。','同时核对港外等待、闸口排队与就绪至完成，说明变化发生在哪里。']},
};
function arrivalsFrom(text:string){const values=text.split(/[,，、\s]+/).filter(Boolean).map(Number);if(values.length<1||values.length>40||values.some(n=>!Number.isFinite(n)||n<0||n>10000))throw new Error('请输入1—40个非负到达分钟，用逗号分隔。');return values;}
function errorMessage(e:unknown){return e instanceof Error?e.message:'请检查输入后重试。';}
function download(name:string,text:string,type:string){const url=URL.createObjectURL(new Blob(['\ufeff'+text],{type})),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function csv(records:readonly QueueRecord[]){return [['车辆','就绪分钟','入队分钟','服务台','开始分钟','完成分钟','港外等待分钟','排队分钟','服务分钟','系统停留分钟','全程分钟'].join(','),...records.map(r=>[r.id,r.ready,r.arrival,r.server,r.start,r.departure,r.outside,r.wait,r.service,r.sojourn,r.total].join(','))].join('\r\n');}
function Metrics({summary,random=false}:{summary:QueueSummary;random?:boolean}){return <dl className="pql-metrics"><div><dt>平均排队 Wq</dt><dd>{format(summary.meanWait)}<small>分钟</small></dd></div><div><dt>{random?'样本平均停留 W':'平均就绪至完成'}</dt><dd>{format(random?summary.meanSojourn:summary.meanTotal)}<small>分钟</small></dd></div><div><dt>平均港外等待</dt><dd>{format(summary.meanOutside)}<small>分钟</small></dd></div><div><dt>记录车辆</dt><dd>{summary.count}<small>辆</small></dd></div></dl>;}
function DataTable({records,selected,onTrack}:{records:readonly QueueRecord[];selected:string;onTrack:(id:string)=>void}){return <div className="pql-table-wrap"><table><thead><tr>{['车辆（定位过程）','就绪','入队','开始','完成','港外等','排队','服务','全程'].map(t=><th key={t}>{t}</th>)}</tr></thead><tbody>{records.map(r=><tr key={r.id} data-tracked={selected===r.id}><td><button className="pql-track-button" onClick={()=>onTrack(r.id)} aria-label={`在过程图中跟踪${r.id}`}>{r.id} ↗</button></td>{[r.ready,r.arrival,r.start,r.departure,r.outside,r.wait,r.service,r.total].map((v,i)=><td key={i}>{format(v)}</td>)}</tr>)}</tbody></table></div>;}
function SamplePlot({records}:{records:readonly QueueRecord[]}){
 const {stride,sample}=queueWaitSamples(records),max=Math.max(1,...sample.map(({record})=>record.wait));
 const points=sample.map(({record,index},i)=>(i? 'L':'M')+(60+index/Math.max(1,records.length-1)*1020)+' '+(235-record.wait/max*190)).join(' ');
 return <figure className="pql-sample"><svg viewBox="0 0 1150 290" role="img" aria-label="按实际记录次序抽样的单车排队时间，非连续队长曲线"><path d="M60 30V235H1080" fill="none" stroke="#8a9e9d"/><path d={points} fill="none" stroke="#247780" strokeWidth="3"/><text x="60" y="20">排队分钟，抽样最大值{format(max)}</text><text x="60" y="270">记录第1票</text><text x="1080" y="270" textAnchor="end">第{records.length}票</text></svg><figcaption>为便于观察，每{stride}票取一条记录，并保留末票，按实际次序绘图。下面的平均数与分位数仍使用全部{records.length}票。</figcaption></figure>;
}
function App(){
 const [scene,setScene]=useState<Scene>(initialScene),[guide,setGuide]=useState(cached.guide??true);
 const [arrivals,setArrivals]=useState(cached.arrivals??QUEUE_HAND_ARRIVALS.regular.join(', ')),[service,setService]=useState(cached.service??2),[handConfig,setHandConfig]=useState<HandConfig|null>(cached.handConfig??null),[visible,setVisible]=useState(cached.visible??0);
 const [randomInput,setRandomInput]=useState<RandomQueueInput>(cached.randomInput??{...QUEUE_RANDOM_DEFAULT}),[lastRandom,setLastRandom]=useState<RandomQueueInput|null>(cached.lastRandom??null);
 const [appointment,setAppointment]=useState<AppointmentMode>(cached.appointment??'burst'),[lastAppointment,setLastAppointment]=useState<AppointmentMode|null>(cached.lastAppointment??null);
 const [drafts,setDrafts]=useState(initialDrafts),[prediction,setPrediction]=useState(initialDrafts[initialScene].prediction),[finding,setFinding]=useState(initialDrafts[initialScene].finding),[history,setHistory]=useState<History[]>(Array.isArray(cached.history)?cached.history:[]);
 const [recordFeedback,setRecordFeedback]=useState<{text:string;error:boolean}|null>(null);
 const [processRuns,setProcessRuns]=useState<Record<Scene,string>>({hand:cached.processRuns?.hand??'legacy',random:cached.processRuns?.random??'legacy',appointment:cached.processRuns?.appointment??'legacy'});
 const [processCommand,setProcessCommand]=useState<QueueReplayCommand|null>(null),[tracked,setTracked]=useState('');
 const [message,setMessage]=useState(''),[error,setError]=useState(''),[persisted,setPersisted]=useState(true),[target,setTarget]=useState(5);
 const hand=useMemo(()=>{try{return handConfig?runQueue(queueJobs(arrivalsFrom(handConfig.arrivals),handConfig.service)):[];}catch{return [];}},[handConfig]);
 const randomRun=useMemo(()=>{try{return lastRandom?randomQueue(lastRandom):null;}catch{return null;}},[lastRandom]);
 const appointmentRun=useMemo(()=>lastAppointment?appointmentQueue(lastAppointment):null,[lastAppointment]);
 const processRecords=scene==='hand'?hand:scene==='random'?randomRun?.allRecords:appointmentRun?.records;
 const processIdentity=processRuns[scene]+':'+JSON.stringify(scene==='hand'?handConfig:scene==='random'?lastRandom:lastAppointment);
 const revealCompleted=useCallback((count:number)=>setVisible(previous=>Math.max(previous,count)),[]);
 const track=(id:string)=>{setProcessCommand({sequence:Date.now(),kind:'track',id});document.getElementById('queue-process')?.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});};
 const advanceHand=(all=false)=>{const next=all?hand.length:Math.min(visible+1,hand.length);setVisible(next);if(next>0)setProcessCommand({sequence:Date.now(),kind:'seek',time:hand[next-1]!.departure,id:hand[next-1]!.id});};
 const records=scene==='hand'?hand.slice(0,visible):scene==='random'?randomRun?.records??[]:appointmentRun?.records??[];
 const summary=useMemo(()=>summarizeQueue(records),[records]),hasResults=records.length>0;
 useEffect(()=>{try{localStorage.setItem(storage,JSON.stringify({scene,guide,arrivals,service,handConfig,visible,randomInput,lastRandom,appointment,lastAppointment,prediction,finding,drafts,history,processRuns} satisfies Saved));setPersisted(true);}catch{setPersisted(false);}},[scene,guide,arrivals,service,handConfig,visible,randomInput,lastRandom,appointment,lastAppointment,prediction,finding,drafts,history,processRuns]);
 useEffect(()=>{const url=new URL(location.href);url.searchParams.set('scene',scene);window.history.replaceState(null,'',url);},[scene]);
 const change=(s:Scene)=>{setRecordFeedback(null);if(s!==scene){setProcessCommand(null);setTracked('');setDrafts(d=>({...d,[scene]:{prediction,finding}}));setPrediction(drafts[s].prediction);setFinding(drafts[s].finding);setScene(s);}setError('');setMessage('');};
 const run=()=>{setRecordFeedback(null);setError('');setMessage('');try{
  if(scene==='hand'){const jobs=queueJobs(arrivalsFrom(arrivals),service);runQueue(jobs);setHandConfig({arrivals,service});setVisible(0);setFinding('');setMessage('模拟已就绪。先观察就绪车辆，再播放或逐事件推进过程；“下一辆”可核对下一辆的完整记录。');}
  if(scene==='random'){randomQueue(randomInput);setLastRandom({...randomInput});setFinding('');setMessage('有限样本已计算完成。过程回放从起点观察，下方统计使用全部正式记录；可跳至正式观察。');}
  if(scene==='appointment'){setLastAppointment(appointment);setFinding('');setMessage('排程已计算完成。播放过程，对照港外等待、闸口排队和实际核验台。');}
  setProcessCommand(null);setTracked('');setProcessRuns(previous=>({...previous,[scene]:crypto.randomUUID()}));
 }catch(e){setError(errorMessage(e)==='service'?'每车服务时长必须为正数。':errorMessage(e)==='rates'?'到达率和服务率必须为正数。':errorMessage(e)==='simulation'?'记录票数应为10—30000，热身0—10000，种子为0—2147483647的整数。':errorMessage(e));}};
 const reset=()=>{setRecordFeedback(null);setProcessCommand(null);setTracked('');setError('');setPrediction('');setFinding('');setMessage('当前场景已重置，对照记录保留。');if(scene==='hand'){setArrivals(QUEUE_HAND_ARRIVALS.regular.join(', '));setService(2);setHandConfig(null);setVisible(0);}if(scene==='random'){setRandomInput({...QUEUE_RANDOM_DEFAULT});setLastRandom(null);}if(scene==='appointment'){setAppointment('burst');setLastAppointment(null);}};
 const keep=()=>{setError('');if(!hasResults){setRecordFeedback({text:'先运行并推进至少一辆车，再保留记录。',error:true});return;}if(scene==='hand'&&visible<hand.length){setRecordFeedback({text:'请把本轮车辆全部推进完成，再保留整轮对照记录。',error:true});return;}if(!finding.trim()){setRecordFeedback({text:'请简要填写本次发现，说明一个结果或修订理由。',error:true});return;}
  const parameters=scene==='hand'?handConfig:scene==='random'?lastRandom:{mode:lastAppointment,serviceMinutes:2,ready:[0,0,0,0,8,8,8,8,16,16,16,16]};
  setHistory(h=>[...h,{scene,time:new Date().toISOString(),parameters,summary,prediction,finding}]);setError('');setRecordFeedback({text:'已保留本次输入、结果和发现。可继续改变条件；没有运行次数限制。',error:false});
 };
 const save=()=>{download('第17讲-排队模拟学习记录.json',JSON.stringify({version:'port-queue-v1',createdAt:new Date().toISOString(),evidenceClass:'独立教学情境，非实港生产数据',delivery:'本机导出，未自动提交教学平台',drafts:{...drafts,[scene]:{prediction,finding}},currentScene:scene,currentParameters:scene==='hand'?handConfig:scene==='random'?lastRandom:lastAppointment,prediction,finding,history,currentRecords:records},null,2),'application/json;charset=utf-8');setRecordFeedback({text:'学习记录已下载，请在教师指定渠道提交。',error:false});};
 const inputChanged=scene==='hand'?!!handConfig&&(handConfig.arrivals!==arrivals||handConfig.service!==service):scene==='random'?!!lastRandom&&JSON.stringify(lastRandom)!==JSON.stringify(randomInput):!!lastAppointment&&lastAppointment!==appointment;
 return <main className="pql">
  <header><div><a href="/port-expansion-preview.html?lesson=17&page=1&student=1">返回第17讲课件 ↗</a><span><a href="/handouts/port-queue-lesson17.html" target="_blank" rel="noreferrer">学生手册（阅读／打印）</a> · 独立教学情境</span></div><h1>南闸口简化排队实验</h1><p>先预测，再运行，用逐车记录检验解释。当前操作只影响本机。</p></header>
  <nav aria-label="模拟场景">{(Object.keys(scenes) as Scene[]).map(s=><button key={s} aria-current={scene===s?'page':undefined} onClick={()=>change(s)}>{scenes[s].name}</button>)}</nav>
  <section className="pql-question"><h2>{scenes[scene].question}</h2><label><input type="checkbox" checked={guide} onChange={e=>setGuide(e.target.checked)}/>显示操作提示</label>{guide&&<ol>{scenes[scene].steps.map(s=><li key={s}>{s}</li>)}</ol>}</section>
  <section className="pql-inputs" aria-label="模拟参数"><h2>本次输入</h2>
   {scene==='hand'&&<><div className="pql-presets"><button onClick={()=>setArrivals(QUEUE_HAND_ARRIVALS.regular.join(', '))}>均匀到达</button><button onClick={()=>setArrivals(QUEUE_HAND_ARRIVALS.paired.join(', '))}>成对到达</button></div><label>逐车到达时刻 / 分钟<input value={arrivals} onChange={e=>setArrivals(e.target.value)}/></label><label>每车服务时长 / 分钟<input type="number" min=".1" step=".1" value={service} onChange={e=>setService(Number(e.target.value))}/></label><p>初始服务台空闲，单台先到先服务，同到按输入顺序。预设比较统一观察0—24分钟；自定义记录按实际时刻核算。</p></>}
   {scene==='random'&&<><div className="pql-presets">{[80,90,95,99,100].map(v=><button key={v} onClick={()=>setRandomInput(x=>({...x,lambda:v}))}>λ={v}</button>)}</div><div className="pql-fields">
    {([['lambda','平均到达 λ / 票每小时',1,500],['mu','平均服务 μ / 票每小时',1,500],['count','正式记录票数',10,30000],['warmup','热身票数',0,10000],['seed','随机种子',0,2147483647]] as const).map(([key,label,min,max])=><label key={key}>{label}<input type="number" min={min} max={max} step="1" value={randomInput[key]} onChange={e=>setRandomInput(x=>({...x,[key]:Number(e.target.value)}))}/></label>)}
    <label>服务时长分布<select value={randomInput.constantService?'constant':'exponential'} onChange={e=>setRandomInput(x=>({...x,constantService:e.target.value==='constant'}))}><option value="exponential">指数随机服务</option><option value="constant">固定服务时长</option></select></label></div><p>单台、无限等候空间、先到先服务。固定种子可复现底稿；服务与到达使用独立随机流。有限运行不能保证稳态精度。</p></>}
   {scene==='appointment'&&<><label>组织方式<select value={appointment} onChange={e=>setAppointment(e.target.value as AppointmentMode)}><option value="burst">原流程：就绪即成批入队</option><option value="appointment">分时预约：每批依次推迟0/2/4/6分钟入队</option><option value="two-servers">两个相同服务台，共用一条队列</option></select></label><p>共12辆，第0、8、16分钟各4辆就绪。服务均2分钟，路程为0。灰段记录港外等待，琥珀段记录闸口排队。</p></>}
   <label className="pql-writing">运行前的预测<textarea value={prediction} maxLength={2000} onChange={e=>setPrediction(e.target.value)} placeholder="你预期哪个量会变化，为什么？"/></label>
   <div className="pql-actions"><button className="pql-primary" onClick={run}>{scene==='hand'?'开始这次模拟':'运行本次情境'}</button>{scene==='hand'&&handConfig&&<><button disabled={visible>=hand.length} onClick={()=>advanceHand()}>下一辆</button><button disabled={visible>=hand.length} onClick={()=>advanceHand(true)}>推进全部车辆</button></>}<button onClick={reset}>随时重置当前场景</button></div>
   {inputChanged&&<p className="pql-warning">输入已修改，下面保留上一次运行结果。点击运行后才会更新。</p>}
  </section>
  {error&&<p className="pql-error" role="alert">{error}</p>}{message&&<p className="pql-message" role="status">{message}</p>}{!persisted&&<p className="pql-warning">本机暂未能保存草稿，请下载学习记录后再关闭页面。</p>}
  {processRecords&&processRecords.length>0&&<PortQueueProcess key={scene+processRuns[scene]} records={processRecords} servers={scene==='appointment'&&lastAppointment==='two-servers'?2:1} warmup={scene==='random'?lastRandom!.warmup:0} storageKey={'port-queue-process-v1:'+scene} identity={processIdentity} fallbackTime={scene==='hand'&&visible>0?hand[Math.min(visible,hand.length)-1]?.departure??0:0} command={processCommand} onCompleted={scene==='hand'?revealCompleted:undefined} onSelected={setTracked}/>}
  {hasResults&&<section className="pql-results" aria-label="本次结果"><h2>本次结果</h2><p>{scene==='hand'?'已核对'+visible+'/'+hand.length+'辆；下列均值包含已核对车辆，回退回放不会删除记录。':scene==='random'?'本次λ='+lastRandom!.lambda+'、μ='+lastRandom!.mu+'，种子'+lastRandom!.seed+'；前'+lastRandom!.warmup+'票热身不计入结果。统计覆盖整轮，与上方回放时刻无关。':'本次方式：'+(lastAppointment==='burst'?'原流程':lastAppointment==='appointment'?'预约':'双台共队列')+'；均值包含全部12辆，与上方回放时刻无关。'}</p>
   <Metrics summary={summary} random={scene==='random'}/>
   {scene==='random'&&randomRun&&<><div className="pql-theory"><h3>与长期模型比较</h3>{randomRun.theory?.stable?<p>M/M/1理论平均停留 {format(randomRun.theory.W)} 分钟，平均排队 {format(randomRun.theory.Wq)} 分钟。当前有限样本平均服务 {format(summary.serviceMinutes/summary.count)} 分钟，设定均值 {format(60/lastRandom!.mu)} 分钟。</p>:<p>{lastRandom!.constantService?'固定服务不满足M/M/1服务分布假设，本页不显示该公式预测。':'λ≥μ，M/M/1没有有限稳定均值。下面仍是可以计算的有限模拟记录。'}</p>}<p>本样本超过10分钟占 {format(summary.overTen*100)}%，样本95分位 {format(summary.p95Sojourn)} 分钟。分位数按排序后第ceil(0.95n)个值计算，不能当未来承诺。</p></div><SamplePlot records={records}/></>}
   {scene!=='random'&&<div className="pql-timeplot"><QueueTimeline records={records} range={scene==='appointment'?26:Math.max(24,Math.ceil(summary.end))} compact={records.length>8}/></div>}
   <p>逐车时刻与时长单位均为分钟；点击车辆编号可定位过程。表中最多保留两位小数，CSV保留原始精度。窄屏可左右滑动时间图和表格。{scene==='random'?'表中仅显示前40条，CSV包含全部正式记录。':''}</p><DataTable records={scene==='random'?records.slice(0,40):records} selected={tracked} onTrack={track}/>
   <button onClick={()=>download('第17讲-'+scene+'-逐车记录.csv',csv(records),'text/csv;charset=utf-8')}>下载本次逐车CSV</button>
  </section>}
  {scene==='random'&&<details className="pql-calculator"><summary>能力方案计算器：与有限模拟分开核算</summary><label>平均停留目标 / 分钟<input type="number" min=".1" max="60" step=".5" value={target} onChange={e=>setTarget(Number(e.target.value))}/></label><p>使用当前输入λ={randomInput.lambda}，单台指数服务。A/B/C新增支出为0/250/650元每小时，排队价值120元/车小时。</p>{Number.isFinite(randomInput.lambda)&&randomInput.lambda>0&&Number.isFinite(target)&&target>0?<div className="pql-table-wrap"><table><thead><tr><th>方案</th><th>服务率</th><th>平均停留分钟</th><th>总成本元/小时</th><th>目标</th></tr></thead><tbody>{queueCostPlans(randomInput.lambda,120,target).map(p=><tr key={p.id}><td>{p.id}</td><td>{p.mu}</td><td>{p.result.stable?format(p.result.W):'无有限稳态'}</td><td>{p.totalCost===null?'不计算':format(p.totalCost)}</td><td>{p.meets?'满足':'未满足'}</td></tr>)}</tbody></table></div>:<p>请输入正的到达率和目标时间。</p>}</details>}
  <section className="pql-notes"><h2>本次发现与对照记录</h2><label>本次实验发现<textarea value={finding} maxLength={4000} onChange={e=>{setFinding(e.target.value);setRecordFeedback(null);}} placeholder="写下结果、原因或原预测需要怎样修订；说明仍缺什么证据。"/></label><div className="pql-actions"><button onClick={keep}>保留本次对照记录</button><button onClick={save}>下载学习记录</button></div>{recordFeedback&&<p className={recordFeedback.error?"pql-error":"pql-message"} role={recordFeedback.error?"alert":"status"}>{recordFeedback.text}</p>}<p>可重复运行和随时重置。所有记录保存在本机；下载后请按教师要求提交，页面不会自动发送。</p>
   <ol className="pql-history">{history.map((h,i)=><li key={h.time+i}><strong>{scenes[h.scene].name} · 记录{i+1}</strong><p>平均排队{format(h.summary.meanWait)}分钟，全程{format(h.summary.meanTotal)}分钟，共{h.summary.count}辆。</p><p>{h.finding}</p></li>)}</ol>{history.length>0&&<button onClick={()=>{setHistory([]);setMessage('对照记录已清空，当前输入和结果保留。');}}>清空本机对照记录</button>}
  </section>
  <footer>《港口管理概论》第17讲。模型、车流和价格均为教学设定。<a href="/port-expansion-preview.html?lesson=17&page=12&student=1">查看模型条件</a></footer>
 </main>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>);
