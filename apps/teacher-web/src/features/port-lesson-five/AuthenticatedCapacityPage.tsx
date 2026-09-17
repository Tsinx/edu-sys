import { useEffect, useRef, useState } from 'react';
import type { ClassroomActor } from '@edu/contracts';
import type { LessonFivePlan } from '@edu/course-content';
import { api } from '../../api';
import { CapacityExperiment } from './CapacityExperiment';
import { lessonFiveReturnPath } from './navigation';
export function AuthenticatedCapacityPage({actor}:{actor:ClassroomActor}) {
 const query=new URLSearchParams(location.search),session=query.get('session'),personal=query.get('purpose')==='personal'||!actor.roles.includes('teacher');
 const initialPlan=(['A','B','C','D','E'].includes(query.get('plan')??'')?query.get('plan'):'A') as LessonFivePlan;
 const returnTo=lessonFiveReturnPath(query.get('returnTo'));
 const [origin,setOrigin]=useState<string>(),[error,setError]=useState('');
 const queue=useRef(Promise.resolve()),runId=useRef(crypto.randomUUID()),publishedPlan=useRef<string|undefined>(undefined);
 useEffect(()=>{if(!session)return;let active=true;void api.getClassroomSnapshot(session).then(s=>{if(s.courseId!=='course-port-management-intro'||s.slide.lessonNumber!==5)throw new Error('当前课堂未定位到第5讲，请从课件入口重新进入。');if(active)setOrigin(s.simulationNavigation?.originSlideKey??s.slide.slideId);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[session]);
 const summary=(text:string)=>{
  if(!session||personal||!origin)return;
  const plan=JSON.parse(text).plan as LessonFivePlan;
  queue.current=queue.current.then(async()=>{
   if(publishedPlan.current!==plan){runId.current=crypto.randomUUID();await api.sendClassroomEvent(session,{type:'set_simulation_navigation',navigation:{unit:'cargo',experiment:'l5-capacity',plan,runId:runId.current,originSlideKey:origin}});publishedPlan.current=plan;}
   await api.sendClassroomEvent(session,{type:'set_lesson_five_summary',runId:runId.current,plan,summary:text});setError('');
  }).catch(e=>setError(`课堂摘要未同步：${e.message}`));
 };
 const back=async()=>{await queue.current;if(session&&!personal)try{await api.sendClassroomEvent(session,{type:'set_simulation_navigation',navigation:null});}catch(e){setError(`返回同步失败：${(e as Error).message}`);return;}if(returnTo)location.assign(returnTo);};
 if(session&&!origin)return <main className="l5-lab"><h1>第5讲实验</h1><p role={error?'alert':'status'}>{error||'正在核对课堂与身份…'}</p>{returnTo&&<a href={returnTo}>返回课件</a>}</main>;
 return <>{error&&<p className="l5-lab-error" role="alert">{error}</p>}<CapacityExperiment actorId={actor.actorId} actorName={actor.displayName} classroom={session??undefined} scope={query.get('scope')??'standalone'} personal={personal} initialPlan={personal?'C':initialPlan} returnTo={returnTo} onReturn={()=>void back()} onSummary={summary}/></>;
}
