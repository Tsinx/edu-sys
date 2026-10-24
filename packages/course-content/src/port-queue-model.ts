/** Lecture 17: independent teaching queues. Times are minutes, rates per hour. */
export const PORT_QUEUE_SOURCES = {
  'pq-case': {label:'本课程 · 东湾港南闸口教学情境',url:'/port-queue-lab.html',date:'2026-10-23',boundary:'港名、车辆、到达记录、服务能力与成本均为独立教学设定，非实港测量、报价或生产调度指令。'},
  'pq-little': {label:'MIT OCW · Queueing notes',url:'https://ocw.mit.edu/courses/15-763j-manufacturing-system-and-supply-chain-design-spring-2005/22f4805864deb06eee85acc1601463ba_queueing_note.pdf',date:'2005课程；核对2026-10-23',boundary:'用于排队概念及Little关系。课堂空到空有限记录的面积恒等式与一般长期关系区分；跨界未完成车辆须处理边界项。'},
  'pq-mm1': {label:'MIT OCW · M/M/1 Queue',url:'https://ocw.mit.edu/courses/2-854-introduction-to-manufacturing-systems-fall-2016/927056a1af54772a587fd84ad4951e71_MIT2_854F16_Mm1Queue.pdf',date:'2016课程；核对2026-10-23',boundary:'M/M/1结果限于独立泊松到达、独立同分布指数服务、单服务台、无限等候空间及稳定条件λ<μ。W含服务，Wq仅排队，不套用于预约或多服务台。'},
  'pq-variability': {label:'MIT OCW · 运输系统排队讲义',url:'https://ocw.mit.edu/courses/1-203j-logistical-and-transportation-planning-methods-fall-2006/4d1277f5c802d299e369cd47e5833b17_lec7.pdf',date:'2006-10-18；核对2026-10-23',boundary:'支持服务时间波动影响等待的机制。本讲用有限模拟比较，不要求M/G/1公式，不声称有限样本一定接近稳态或构成现实因果证明。'},
  'pq-video': {label:'央视网 · 港口作业历史画面',url:'https://tv.cctv.com/2025/05/22/VIDEu7abgnqxjck2rKBqygmP250522.shtml',date:'2025-05-22',boundary:'开场短片中的实拍只支持画面中的作业观察，不是东湾港或拥堵事件现场。课程旁白及90/99票数据为独立教学设定，不归于受访者。'},
  'pq-animation': {label:'本课程 · 等待形成过程动画',url:'/course-assets/port-management/queue-media/queue-explainer.html',date:'2026-10-23',boundary:'课程原创示意与合成旁白，非实港录像。采用共享FCFS排程：初始空闲、单台、先到先服务、同到按编号；每车基准2分钟，T02慢服务对照为3分钟。车辆位移不另计路程，有限例子不作为一般稳态预测。'},
} as const;

export const PORT_QUEUE_FILMS = {
  'l17-queue': {id:'l17-queue',title:'容量与等待：多来九票以后',src:'/course-assets/port-management/queue-media/queue-opening.mp4',poster:'/course-assets/port-management/queue-media/queue-opening.jpg',captions:'/course-assets/port-management/queue-media/queue-opening.vtt',durationMs:46000,source:'pq-video'},
  'l17-queue-explainer': {id:'l17-queue-explainer',title:'等待怎样形成：车、服务台与两道开工条件',src:'/course-assets/port-management/queue-media/queue-explainer.mp4',poster:'/course-assets/port-management/queue-media/queue-explainer.jpg',captions:'/course-assets/port-management/queue-media/queue-explainer.vtt',durationMs:154920,source:'pq-animation',chapters:[{label:'跟踪T03',startMs:8360},{label:'车等台',startMs:55400},{label:'台等车',startMs:71760},{label:'延误传播',startMs:104040},{label:'空闲间隙',startMs:123960}]},
} as const;

export interface QueueJob {id:string;ready:number;arrival:number;service:number}
export interface QueueRecord extends QueueJob {server:number;start:number;departure:number;outside:number;wait:number;sojourn:number;total:number}
export interface QueueSummary {count:number;meanWait:number;meanOutside:number;meanSojourn:number;meanTotal:number;maxWait:number;p95Sojourn:number;overTen:number;serviceMinutes:number;end:number;area:number}
export const QUEUE_HAND_ARRIVALS = {
  regular:[0,3,6,9,12,15,18,21],
  paired:[0,0,6,6,12,12,18,18],
} as const;
export const QUEUE_SHORT_EXAMPLE = [0,1,1,4] as const;
export function queueStartConditions(option:number){
 const cases=[{arrival:1,available:4},{arrival:5,available:3}];
 const example=cases[option];if(!example)throw new RangeError('start conditions');
 const start=Math.max(example.arrival,example.available);
 return {...example,start,wait:start-example.arrival,idle:start-example.available};
}
function finite(value:number,label:string){if(!Number.isFinite(value)||value<0)throw new RangeError(label);return value;}
export function queueJobs(arrivals:readonly number[],service=2):QueueJob[]{
  if(!Number.isFinite(service)||service<=0)throw new RangeError('service');
  return arrivals.map((arrival,i)=>({id:`T${String(i+1).padStart(2,'0')}`,ready:finite(arrival,'arrival'),arrival,service}));
}
/** FCFS, arrival ties keep input order. Servers are identical and share one queue. */
export function runQueue(jobs:readonly QueueJob[],servers=1):QueueRecord[]{
  if(!Number.isInteger(servers)||servers<1||servers>8)throw new RangeError('servers');
  const available=Array<number>(servers).fill(0),ids=new Set<string>();
  const ordered=jobs.map((job,order)=>{
    finite(job.ready,'ready');finite(job.arrival,'arrival');
    if(job.arrival<job.ready||!Number.isFinite(job.service)||job.service<=0||!job.id||ids.has(job.id))throw new RangeError('job');
    ids.add(job.id);return {...job,order};
  }).sort((a,b)=>a.arrival-b.arrival||a.order-b.order);
  return ordered.map(({order:_,...job})=>{
    let server=0;for(let i=1;i<servers;i++)if(available[i]!<available[server]!)server=i;
    const start=Math.max(job.arrival,available[server]!),departure=start+job.service;
    available[server]=departure;
    return {...job,server:server+1,start,departure,outside:job.arrival-job.ready,wait:start-job.arrival,sojourn:departure-job.arrival,total:departure-job.ready};
  });
}
export function summarizeQueue(records:readonly QueueRecord[]):QueueSummary {
  const n=records.length;if(!n)return {count:0,meanWait:0,meanOutside:0,meanSojourn:0,meanTotal:0,maxWait:0,p95Sojourn:0,overTen:0,serviceMinutes:0,end:0,area:0};
  const sum=(key:'wait'|'outside'|'sojourn'|'total'|'service')=>records.reduce((s,r)=>s+r[key],0);
  const ordered=records.map(r=>r.sojourn).sort((a,b)=>a-b);
  return {count:n,meanWait:sum('wait')/n,meanOutside:sum('outside')/n,meanSojourn:sum('sojourn')/n,meanTotal:sum('total')/n,maxWait:Math.max(...records.map(r=>r.wait)),p95Sojourn:ordered[Math.ceil(.95*n)-1]!,overTen:records.filter(r=>r.sojourn>10).length/n,serviceMinutes:sum('service'),end:Math.max(...records.map(r=>r.departure)),area:sum('sojourn')};
}
/** Exact sample-path area in a window, clipping unfinished/boundary vehicles. */
export function queueArea(records:readonly QueueRecord[],from:number,to:number){
  finite(from,'from');if(!Number.isFinite(to)||to<=from)throw new RangeError('to');
  return records.reduce((s,r)=>s+Math.max(0,Math.min(to,r.departure)-Math.max(from,r.arrival)),0);
}
export function mm1(lambda:number,mu:number){
  if(!Number.isFinite(lambda)||lambda<=0||!Number.isFinite(mu)||mu<=0)throw new RangeError('rates');
  const rho=lambda/mu;
  if(rho>=1)return {stable:false as const,lambda,mu,rho};
  const W=60/(mu-lambda),service=60/mu,Wq=W-service,L=lambda*W/60,Lq=lambda*Wq/60;
  return {stable:true as const,lambda,mu,rho,W,service,Wq,L,Lq,p0:1-rho};
}
export function queueCapacityForMean(lambda:number,targetMinutes:number){
  if(!Number.isFinite(lambda)||lambda<=0||!Number.isFinite(targetMinutes)||targetMinutes<=0)throw new RangeError('target');
  return lambda+60/targetMinutes;
}
export const QUEUE_CAPACITY_PLANS=[{id:'A',mu:100,cost:0},{id:'B',mu:105,cost:250},{id:'C',mu:110,cost:650}] as const;
export function queueCostPlans(lambda=90,waitingValue=120,targetMinutes=5){
  if(!Number.isFinite(waitingValue)||waitingValue<0||!Number.isFinite(targetMinutes)||targetMinutes<=0)throw new RangeError('cost');
  return QUEUE_CAPACITY_PLANS.map(plan=>{const result=mm1(lambda,plan.mu);return {...plan,result,waitingCost:result.stable?waitingValue*result.Lq:null,totalCost:result.stable?plan.cost+waitingValue*result.Lq:null,meets:result.stable&&result.W<=targetMinutes+1e-9};});
}
function random(seed:number){let state=seed>>>0;return ()=>{state=(state+0x6D2B79F5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return (((t^(t>>>14))>>>0)+0.5)/4294967296;};}
export interface RandomQueueInput {lambda:number;mu:number;count:number;warmup:number;seed:number;constantService?:boolean}
export function randomQueue(input:RandomQueueInput){
  const {lambda,mu,count,warmup,seed,constantService=false}=input;
  mm1(lambda,mu);
  if(!Number.isInteger(count)||count<10||count>30000||!Number.isInteger(warmup)||warmup<0||warmup>10000||!Number.isInteger(seed)||seed<0||seed>2147483647)throw new RangeError('simulation');
  // Independent streams; corresponding uniforms remain fixed across rate changes.
  const arrivalRandom=random(seed),serviceRandom=random((seed^0x5bd1e995)>>>0),jobs:QueueJob[]=[];
  let arrival=0;
  for(let i=0;i<count+warmup;i++){
    arrival+=-Math.log(1-arrivalRandom())*60/lambda;
    const serviceUniform=serviceRandom(),service=constantService?60/mu:-Math.log(1-serviceUniform)*60/mu;
    jobs.push({id:`R${i+1}`,ready:arrival,arrival,service});
  }
  const all=runQueue(jobs),records=all.slice(warmup),summary=summarizeQueue(records);
  return {input:{...input,constantService},records,allRecords:all,summary,theory:constantService?null:mm1(lambda,mu),warmupEnd:warmup?all[warmup-1]!.arrival:0};
}
export function appointmentQueue(mode:'burst'|'appointment'|'two-servers'){
  const ready=[0,0,0,0,8,8,8,8,16,16,16,16];
  const jobs=queueJobs(ready).map((j,i)=>({...j,arrival:mode==='appointment'?j.ready+(i%4)*2:j.ready}));
  const records=runQueue(jobs,mode==='two-servers'?2:1);
  return {mode,records,summary:summarizeQueue(records)};
}
export const QUEUE_RANDOM_DEFAULT:RandomQueueInput={lambda:90,mu:100,count:4000,warmup:500,seed:20261023};
