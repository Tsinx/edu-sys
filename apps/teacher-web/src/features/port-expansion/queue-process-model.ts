import type {QueueRecord} from '@edu/course-content';

export type QueuePhase='pending'|'outside'|'queue'|'service'|'complete';
export const QUEUE_PHASE_LABELS:Record<QueuePhase,string>={pending:'尚未就绪',outside:'港外等待',queue:'闸口排队',service:'正在核验',complete:'已完成'};
export type QueueEventKind='ready'|'arrival'|'start'|'departure';
export type QueueEvent={time:number;ready:QueueRecord[];arrival:QueueRecord[];start:QueueRecord[];departure:QueueRecord[]};
export type QueueProcessIndex={records:readonly QueueRecord[];byId:Map<string,QueueRecord>;events:QueueEvent[];end:number;servers:number};
export type QueueSnapshot={time:number;groups:Record<QueuePhase,QueueRecord[]>;event:QueueEvent|null;next:QueueEvent|null};

/** Events at the same instant form one atomic transition; no invented travel time. */
export function queueProcessIndex(records:readonly QueueRecord[],servers=1):QueueProcessIndex{
 const grouped=new Map<number,QueueEvent>();
 let end=0;
 for(const record of records){
  end=Math.max(end,record.departure);
  for(const kind of ['ready','arrival','start','departure'] as const){
   const time=record[kind];let event=grouped.get(time);
   if(!event){event={time,ready:[],arrival:[],start:[],departure:[]};grouped.set(time,event);}
   event[kind].push(record);
  }
 }
 return {records,byId:new Map(records.map(r=>[r.id,r])),events:[...grouped.values()].sort((a,b)=>a.time-b.time),end,servers};
}
export function queuePhaseAt(record:QueueRecord,time:number):QueuePhase{
 if(time<record.ready)return 'pending';
 if(time<record.arrival)return 'outside';
 if(time<record.start)return 'queue';
 if(time<record.departure)return 'service';
 return 'complete';
}
export function clampQueueTime(time:number,end:number){return Number.isFinite(time)?Math.min(end,Math.max(0,time)):0;}
/** Upper bound deliberately uses exact clocks: a short genuine event must not be skipped. */
export function queueEventPosition(events:readonly QueueEvent[],time:number){
 let low=0,high=events.length;
 while(low<high){const mid=(low+high)>>>1;if(events[mid]!.time<=time)low=mid+1;else high=mid;}
 return low;
}
export function queueSnapshot(index:QueueProcessIndex,time:number):QueueSnapshot{
 const clock=clampQueueTime(time,index.end),groups:QueueSnapshot['groups']={pending:[],outside:[],queue:[],service:[],complete:[]};
 for(const r of index.records)groups[queuePhaseAt(r,clock)].push(r);
 const next=queueEventPosition(index.events,clock);
 return {time:clock,groups,event:index.events[next-1]??null,next:index.events[next]??null};
}
export function queueClockLabel(value:number,time:number){return value<=time?value.toLocaleString('zh-CN',{maximumFractionDigits:3})+' 分':'尚未发生';}
export function queueEventText(event:QueueEvent|null){
 if(!event)return '尚无车辆就绪。向前播放，观察第一辆车何时出现。';
 const labels:Record<QueueEventKind,string>={ready:'就绪',arrival:'入队',start:'开始核验',departure:'完成离开'};
 return (['departure','ready','arrival','start'] as const).filter(k=>event[k].length).map(kind=>{
  const rows=event[kind],ids=rows.slice(0,3).map(r=>r.id).join('、');
  return `${ids}${rows.length>3?`等${rows.length}辆`:''}${labels[kind]}`;
 }).join('；')+'。同一时刻的完成、入队和开工已合并处理。';
}
