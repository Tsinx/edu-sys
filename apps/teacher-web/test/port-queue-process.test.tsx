import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {QUEUE_HAND_ARRIVALS,QUEUE_RANDOM_DEFAULT,appointmentQueue,queueJobs,randomQueue,runQueue,summarizeQueue,type QueueRecord} from '@edu/course-content';
import {clampQueueTime,queueClockLabel,queueEventPosition,queuePhaseAt,queueProcessIndex,queueSnapshot} from '../src/features/port-expansion/queue-process-model';
import {PortQueueProcess,QueueProcessMap} from '../src/features/port-expansion/PortQueueProcess';

test('paired arrivals move through one atomic completion and service transition',()=>{
 const index=queueProcessIndex(runQueue(queueJobs(QUEUE_HAND_ARRIVALS.paired))),first=queueSnapshot(index,0),next=queueSnapshot(index,2);
 assert.deepEqual(first.groups.service.map(r=>r.id),['T01']);assert.deepEqual(first.groups.queue.map(r=>r.id),['T02']);assert.equal(first.groups.pending.length,6);
 assert.deepEqual(next.groups.complete.map(r=>r.id),['T01']);assert.deepEqual(next.groups.service.map(r=>r.id),['T02']);assert.equal(next.groups.queue.length,0);
 assert.equal(first.next?.time,2);assert.equal(next.event?.time,2);assert.equal(next.next?.time,4);
 assert.deepEqual(next.event?.departure.map(r=>r.id),['T01']);assert.deepEqual(next.event?.start.map(r=>r.id),['T02']);
});
test('appointment waiting remains outside and a shared two-station queue occupies both stations',()=>{
 const one=queueProcessIndex(appointmentQueue('appointment').records),atZero=queueSnapshot(one,0),atTwo=queueSnapshot(one,2);
 assert.deepEqual(Object.values(atZero.groups).map(g=>g.length),[8,3,0,1,0]);
 assert.deepEqual(Object.values(atTwo.groups).map(g=>g.length),[8,2,0,1,1]);
 const two=queueProcessIndex(appointmentQueue('two-servers').records,2);
 for(const clock of [0,2,8,10,16,18]){
  const snapshot=queueSnapshot(two,clock);assert.equal(snapshot.groups.service.length,2);assert.deepEqual(snapshot.groups.service.map(r=>r.server).sort(),[1,2]);
 }
 assert.deepEqual(queueSnapshot(two,0).groups.queue.map(r=>r.id),['T03','T04']);
 assert.equal(queueSnapshot(two,20).groups.complete.length,12);
});
test('every job has one conserved phase at events and between events, with real FCFS occupancy',()=>{
 const runs=[runQueue(queueJobs(QUEUE_HAND_ARRIVALS.regular)),runQueue(queueJobs(QUEUE_HAND_ARRIVALS.paired)),...(['burst','appointment','two-servers'] as const).map(m=>appointmentQueue(m).records),randomQueue({...QUEUE_RANDOM_DEFAULT,count:40,warmup:10}).allRecords];
 for(const records of runs){
  const servers=Math.max(...records.map(r=>r.server)),index=queueProcessIndex(records,servers);
  const clocks=[0,index.end,...index.events.flatMap((e,i)=>i?[e.time,(e.time+index.events[i-1]!.time)/2]:[e.time])];
  for(const time of clocks){
   const snapshot=queueSnapshot(index,time),all=Object.values(snapshot.groups).flat();
   assert.equal(all.length,records.length);assert.equal(new Set(all.map(r=>r.id)).size,records.length);
   assert.equal(new Set(snapshot.groups.service.map(r=>r.server)).size,snapshot.groups.service.length);
   if(snapshot.groups.queue.length)assert.equal(snapshot.groups.service.length,servers,'queued work cannot face an idle identical server');
   for(const r of records){assert.ok(snapshot.groups[queuePhaseAt(r,time)].includes(r));assert.ok(Math.abs(r.total-r.outside-r.wait-r.service)<1e-9);}
  }
 }
});
test('formal observation retains preceding warmup work but measured results exclude it',()=>{
 const rows=runQueue(queueJobs(Array.from({length:15},(_,i)=>i/10))),warmup=5,formal=rows.slice(warmup),index=queueProcessIndex(rows),snapshot=queueSnapshot(index,formal[0]!.arrival);
 assert.equal(snapshot.groups.service[0]!.id,'T01');assert.ok(snapshot.groups.queue.includes(formal[0]!));
 assert.equal(summarizeQueue(formal).count,10);
 const random=randomQueue(QUEUE_RANDOM_DEFAULT);
 assert.equal(random.allRecords.length,4500);assert.equal(random.records.length,4000);assert.equal(random.records[0]!.id,'R501');assert.deepEqual(random.records,random.allRecords.slice(500));
 assert.deepEqual(random.summary,summarizeQueue(random.records));
 const boundary=queueSnapshot(queueProcessIndex(random.allRecords),random.records[0]!.arrival);
 assert.equal(Object.values(boundary.groups).flat().length,4500);
 assert.ok(boundary.groups.service.length>0);
});
test('event stepping keeps genuine short intervals and completed/future clocks use the observed time',()=>{
 const records=runQueue(queueJobs([0,1e-12],1e-13)),index=queueProcessIndex(records),atStart=queueSnapshot(index,0);
 assert.equal(atStart.next?.time,1e-13);assert.equal(queueEventPosition(index.events,1e-13),2);
 assert.equal(queueSnapshot(index,index.end).next,null);assert.equal(clampQueueTime(-1,index.end),0);assert.equal(clampQueueTime(1,index.end),index.end);
 assert.equal(queueClockLabel(2,1),'尚未发生');assert.equal(queueClockLabel(2,2),'2 分');
});
test('public process view renders real stations, bounded trucks and disclosed full counts',()=>{
 const render=(records:readonly QueueRecord[],servers=1,warmup=0,fallbackTime=0)=>renderToStaticMarkup(<PortQueueProcess records={records} servers={servers} warmup={warmup} storageKey="test-no-storage" identity="test" fallbackTime={fallbackTime}/>);
 const two=render(appointmentQueue('two-servers').records,2);
 assert.equal((two.match(/data-station=/g)??[]).length,2);assert.equal((two.match(/data-busy="true"/g)??[]).length,2);assert.match(two,/两台共用同一队列/);
 const many=runQueue(queueJobs(Array(30).fill(0))),html=render(many);
 assert.equal((html.match(/data-vehicle-id=/g)??[]).length,5);assert.match(html,/后方另25辆/);assert.match(html,/五类车辆合计始终为30辆/);
 assert.match(html,/data-clock="departure" data-occurred="false"/);assert.match(html,/尚未发生/);
 const random=randomQueue({...QUEUE_RANDOM_DEFAULT,count:10,warmup:5}),warm=render(random.allRecords,1,5,random.records[0]!.arrival);
 assert.match(warm,/过程保留全部15辆/);assert.match(warm,/前5辆为热身/);assert.match(warm,/跳至正式观察/);
 const standard=randomQueue(QUEUE_RANDOM_DEFAULT),snapshot=queueSnapshot(queueProcessIndex(standard.allRecords),standard.records[0]!.arrival);
 const longQueue=renderToStaticMarkup(<QueueProcessMap snapshot={snapshot} servers={1} selected="R501" focusPhase="queue" warmupIds={new Set(standard.allRecords.slice(0,500).map(r=>r.id))} onSelect={()=>{}}/>);
 assert.match(longQueue,/跟踪 R501 · 队列第16位/);assert.match(longQueue,/位于省略的后方/);assert.match(longQueue,/仍计入16辆排队车/);
 for(const value of [two,html,warm,longQueue])assert.doesNotMatch(value,/teachingCue|assistantCue|storyBeat|voyageStage|让学生|告诉学生/);
});
