import {useEffect,useState} from 'react';
import type {ClassroomActor} from '@edu/contracts';
import {makePortClassSubmission,type PortSubmissionUnit} from '@edu/port-simulation-core';
import {api} from '../../api';
import {PortSubmissionPanel} from './PortSubmissionPanel';
import {PortTaskPanel} from './PortTaskPanel';
import {PORT_RESULT_COURSE} from './submission-api';
import {classSubmissionRecord,reportReady,type Notebook} from './port-class-notebook';

export function PortClassLabSubmission({book,playing,onPause}:{book:Notebook;playing:boolean;onPause:()=>void}){
 const [actor,setActor]=useState<ClassroomActor>(),[error,setError]=useState('');
 useEffect(()=>{let live=true;const refresh=()=>void api.getIdentitySession().then(s=>{if(live){setActor(s.actor);setError('');}}).catch(()=>{if(live){setActor(undefined);setError('登录课程平台后即可提交；当前实验记录继续保存在本机。');}});refresh();window.addEventListener('focus',refresh);return()=>{live=false;window.removeEventListener('focus',refresh);};},[]);
 const unit:PortSubmissionUnit=book.run.lesson===11?'performance':book.run.scenario==='equipment'?'emergency-equipment':'emergency-system';
 const context=actor?{actorId:actor.actorId,courseId:PORT_RESULT_COURSE}:undefined;
 let storage:Storage|null=null;try{storage=typeof localStorage==='undefined'?null:localStorage;}catch{/* A durable submission requires available local storage. */}
 const eligible=!!book.sealedAt&&reportReady(book)&&(book.run.lesson===11||!!book.run.scenario);
 return <section id="lab-submit" className="pcl-online-submission" aria-label="提交教师">
  <h2>提交教师</h2><p>先完成并保存复盘，再提交本次实验。第11讲包含基准、试验及各次发现；第12讲两个场景分别提交，教学与实战模式会随记录标明。</p>
  <p>完成分按实际流程目标与材料完整性计算，复盘分析质量由教师复核。上传并通过核验后，才表示教师已收到。</p>
  {!eligible&&<p>尚未满足提交条件：请完成本场观察、保存试验与四项复盘，并点击上方的“完成并保存复盘”或对应的教学／实战保存按钮。</p>}
  {error&&<p role="status">{error} <a href="/" target="_blank" rel="noopener">打开平台登录</a></p>}
  {context&&<><p>当前账号：{actor!.displayName} · {actor!.roles.includes('teacher')?'教师演示':'学生实验'}</p><PortTaskPanel key={`${actor!.actorId}:${unit}`} context={context} unit={unit}/>
   {actor!.roles.includes('teacher')?<a href={`/courses/${PORT_RESULT_COURSE}/experiment-results`} target="_blank" rel="noopener">查看学生提交与成绩 ↗</a>:<PortSubmissionPanel key={`${actor!.actorId}:${unit}`} context={context} storage={storage} unit={unit} runId={`${unit}:${book.sealedAt??'draft'}`} eligible={eligible&&!!storage&&!playing} busy={playing} sealed={!!book.sealedAt} seal={async()=>{onPause();if(!eligible)throw Error('请先完成并保存复盘。');if(!storage)throw Error('浏览器存储不可用，请下载备份后恢复存储再提交。');return makePortClassSubmission(classSubmissionRecord(book));}}/>}
  </>}
 </section>;
}
