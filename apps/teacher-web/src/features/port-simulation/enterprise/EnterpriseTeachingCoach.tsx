import {useCallback,useContext,useEffect,useLayoutEffect,useRef,useState,type CSSProperties,type RefObject} from 'react';
import {createPortal} from 'react-dom';
import {Anchor,CheckCircle2,DoorOpen,MousePointer2,RotateCcw,ShipWheel} from 'lucide-react';
import {hourLabel} from '@edu/port-simulation-core';
import {DraftsContext,fmt,wan} from './EnterpriseForms';
import {downloadEnterprise} from './enterprise-storage';
import {ENTERPRISE_TEACHING_END_HOUR,ENTERPRISE_TEACHING_VERSION,enterpriseIncidentLesson,enterpriseTeachingSteps} from './enterprise-teaching';
import {resolveEnterpriseGuideAction,type EnterpriseGuideAction} from './enterprise-guidance';
import {placeTourCard,useEnterpriseTourLock,type TourRect} from './enterprise-tour-lock';
import type {useEnterprise} from './useEnterprise';

type Runtime=ReturnType<typeof useEnterprise>;
export function EnterpriseTeachingCoach({runtime,tab,navigate,pause,compact=false,rootRef}:{runtime:Runtime;tab:string;navigate:(tab:string)=>void;pause:()=>void;compact?:boolean;rootRef:RefObject<HTMLElement|null>}){
  const v=runtime.view!,profile=runtime.currentSave?.teaching;
  const eligible=v.config.mode==='practice'&&!runtime.currentSave?.attemptId&&!v.sealed;
  const compatible=profile?.schema===ENTERPRISE_TEACHING_VERSION;
  const active=!!(eligible&&compatible&&profile.active&&!runtime.replaying&&!runtime.conflict&&!runtime.workerFailed);
  const steps=compatible?enterpriseTeachingSteps(v,runtime.currentSave?.record,profile):[];
  const step=steps.find(s=>s.id===profile?.selected)??steps.find(s=>!s.complete)??steps.at(-1);
  const index=step?steps.indexOf(step):0,incident=active?enterpriseIncidentLesson(v):undefined;
  const drafts=useContext(DraftsContext),prepared=useRef(''),card=useRef<HTMLElement>(null);
  const [host,setHost]=useState<HTMLElement|null>(null),[hint,setHint]=useState(''),[replay,setReplay]=useState(0),[success,setSuccess]=useState(''),[exitPending,setExitPending]=useState(false);
  const [action,setAction]=useState<EnterpriseGuideAction>(),[cardSize,setCardSize]=useState({width:320,height:216});
  // On a direct reload the parent's host ref is attached after child layout
  // effects. Resolve the portal after the whole tree has committed.
  useEffect(()=>{setHost(rootRef.current);},[rootRef,active]);
  useEffect(()=>{if(!hint)return;const id=setTimeout(()=>setHint(''),1800);return()=>clearTimeout(id);},[hint]);
  const blockedClick=useCallback(()=>setHint('先完成闪烁按钮这一步；其他经营操作暂时锁定。'),[]);
  const evidenceKey=step?.evidence.join('|')??'';
  const observe=useCallback(()=>{
    if(!active||!step||step.kind!=='observe'||incident||tab!==step.tab)return;
    const id=step.id,evidence=[...step.evidence],hour=v.hour,position=v.journal.length;
    runtime.updateTeaching(p=>!p.active||p.selected!==id?p:{...p,receipts:{...p.receipts,[id]:{hour,position,evidence}}});
  },[active,step?.id,step?.kind,evidenceKey,incident?.incident.id,tab,v.hour,v.journal.length,runtime.updateTeaching]);
  useLayoutEffect(()=>{
    if(!active||!step)return;
    const key=(runtime.currentSave?.id??'')+':'+step.id;
    if(prepared.current!==key){prepared.current=key;for(const [name,value]of Object.entries(step.drafts??{}))drafts.set(name,value);}
    const read=(selector:string)=>{const el=rootRef.current?.querySelector<HTMLInputElement>(selector);return el?el.type==='checkbox'?String(el.checked):el.value:undefined;};
    const next=resolveEnterpriseGuideAction(step,tab,v,read);
    setAction(old=>old?.id===next.id&&old.selector===next.selector&&old.value===next.value?old:next);
  },[active,step?.id,step?.target,step?.planHour,step?.complete,tab,v,drafts.values,rootRef,runtime.currentSave?.id,replay]);
  const transitioning=!!success||!!step?.complete;
  const {rect,bounds}=useEnterpriseTourLock({rootRef,selector:action?.selector,enabled:active,blocked:runtime.busy||transitioning,replay,onObserve:action?.kind==='observe'?observe:undefined,onBlocked:blockedClick});
  useEffect(()=>{
    if(!active||!step||!profile||runtime.busy||incident||exitPending)return;
    if(!profile.starts[step.id])runtime.updateTeaching(p=>p.starts[step.id]?p:{...p,starts:{...p.starts,[step.id]:{hour:v.hour,position:v.journal.length}}});
    if(!step.complete){setSuccess('');return;}
    if(!profile.receipts[step.id]){
      runtime.updateTeaching(p=>({...p,receipts:{...p.receipts,[step.id]:{hour:v.hour,position:v.journal.length,evidence:[...step.evidence]}}}));return;
    }
    const next=steps[index+1];if(!next)return;
    setSuccess((step.kind==='observe'?step.evidence[0]+'。':'')+step.why);
    const id=setTimeout(()=>{
      runtime.updateTeaching(p=>p.selected!==step.id?p:{...p,selected:next.id,starts:{...p.starts,[next.id]:p.starts[next.id]??{hour:v.hour,position:v.journal.length}}});
      setSuccess('');setHint('');
    },1100);
    return()=>clearTimeout(id);
  },[active,step?.id,step?.complete,evidenceKey,profile?.starts[step?.id??'']?.position,profile?.receipts[step?.id??'']?.position,runtime.busy,incident?.incident.id,index,v.hour,v.journal.length,runtime.updateTeaching,exitPending]);
  useEffect(()=>{
    if(!exitPending||runtime.busy)return;
    // Finish the already authorized operation, then pause at its actual clock.
    // Otherwise a mid-calculation exit would store the old hour and lose resume.
    runtime.updateTeaching(p=>({...p,active:false,pausedAt:v.hour}));setExitPending(false);
  },[exitPending,runtime.busy,v.hour,runtime.updateTeaching]);
  useLayoutEffect(()=>{
    if(!active||!card.current)return;
    const el=card.current,resize=new ResizeObserver(()=>{const r=el.getBoundingClientRect();setCardSize(old=>Math.abs(old.width-r.width)<.5&&Math.abs(old.height-r.height)<.5?old:{width:r.width,height:r.height});});
    resize.observe(el);return()=>resize.disconnect();
  },[active,host,step?.id]);
  const start=()=>{pause();void runtime.createTeaching().then(()=>navigate('overview')).catch(e=>runtime.setError(e.message));};
  const exit=()=>{pause();if(runtime.busy){setExitPending(true);return;}runtime.updateTeaching(p=>({...p,active:false,pausedAt:v.hour}));};
  const finish=()=>{
    pause();runtime.updateTeaching(p=>({...p,active:false,pausedAt:undefined,receipts:{...p.receipts,graduate:{hour:v.hour,position:v.journal.length,evidence:['完成前半年管理，港口继续经营。']}}}));navigate('overview');
  };
  if(runtime.conflict||runtime.workerFailed)return null;
  if(!active||!step){
    if(!compact&&tab!=='learning')return null;
    const resumable=eligible&&compatible&&profile&&!profile.active&&profile.pausedAt===v.hour&&v.hour<ENTERPRISE_TEACHING_END_HOUR&&!runtime.replaying;
    const finished=compatible&&!!profile?.receipts.graduate;
    if(compact&&(!eligible||finished))return null;
    return <section className={'enterprise-coach enterprise-tour-welcome'+(compact?' is-compact':'')} aria-label="游戏带教入口"><span className="enterprise-eyebrow">单人经营 · 本机运行</span><h2>{finished?'余下经营由你接管':'跟着鼠标，管理第一个半年'}</h2><p>{finished?'前半年的设备、合同和经营记录继续保留。':resumable?'带教已暂停，当前港口与操作进度都已保留。':'亮起哪个按钮，就操作哪里。半年里亲手安排规则、堆场、班表、补能和投资。'}</p>
      {resumable&&<button className="enterprise-button--primary" disabled={runtime.busy} onClick={()=>{pause();runtime.updateTeaching(p=>({...p,active:true}));navigate('overview');}}>继续前半年带教</button>}
      <button className="enterprise-button--primary" disabled={runtime.busy} onClick={start}><MousePointer2 size={17}/>开始前半年带教</button><small>带教另开一座港口，已有经营记录保留。</small>
      {!eligible&&<small>考核与封存记录保持原状，带教在独立练习中进行。</small>}
    </section>;
  }
  if(!host)return null;
  const graduating=step.kind==='finish'&&tab==='overview',previous=steps[index-1];
  const position=placeTourCard(graduating?null:rect,bounds.width,bounds.height,Math.min(graduating?400:320,bounds.width-24),cardSize.height);
  const hole=rect&&!runtime.busy&&!transitioning?rect:null;
  const right=hole?Math.min(bounds.width,hole.left+hole.width):0,bottom=hole?Math.min(bounds.height,hole.top+hole.height):0;
  const masks:TourRect[]=hole?[
    {left:0,top:0,width:bounds.width,height:hole.top},
    {left:0,top:hole.top,width:hole.left,height:hole.height},
    {left:right,top:hole.top,width:Math.max(0,bounds.width-right),height:hole.height},
    {left:0,top:bottom,width:bounds.width,height:Math.max(0,bounds.height-bottom)},
  ]:[{left:0,top:0,width:bounds.width,height:bounds.height}];
  const month=Math.min(6,Math.max(1,step.month));
  const instruction=exitPending?'本轮结算结束后退出，进度会保留。':success?'这一步已完成':runtime.busy?'港口正在按规则经营…':action?.title??'正在定位下一步…';
  const error=runtime.error||runtime.storageError||runtime.listError||drafts.error;
  const cursorStyle=rect?{left:rect.left+rect.width/2,top:rect.top+rect.height/2,'--tour-dx':Math.max(-180,bounds.width/2-rect.left-rect.width/2)+'px','--tour-dy':Math.max(-100,bounds.height/2-rect.top-rect.height/2)+'px'} as CSSProperties:undefined;
  return createPortal(<div className="enterprise-tour-layer" data-tour-step={step.id} data-tour-action={action?.kind} data-tour-selector={action?.selector}>
    {masks.map((r,i)=><div key={i} className="enterprise-tour-mask" style={r} aria-hidden="true"/>)}
    {hole&&<><div className="enterprise-tour-spotlight" style={hole} aria-hidden="true"/><div key={action?.id+':'+replay} className="enterprise-tour-cursor" style={cursorStyle} aria-hidden="true"><MousePointer2 size={32}/><i/><b>点击这里</b></div></>}
    <section ref={card} className={'enterprise-tour-card'+(graduating?' is-graduation':'')} style={position} data-enterprise-tour-ui aria-label="前半年管理引导">
      <header><span><ShipWheel size={17}/>{incident?'紧急插单':step.chapter}</span><button type="button" data-tour-exit disabled={exitPending} onClick={exit} aria-label="退出带教，保留当前进度"><DoorOpen size={16}/>{exitPending?'正在退出':'退出带教'}</button></header>
      <ol className="enterprise-tour-months" aria-label="六个月管理进度">{Array.from({length:6},(_,i)=><li key={i} data-current={i+1===month} data-done={i+1<month||graduating}><span>{i+1<month||graduating?'✓':i+1}</span>{i+1}月</li>)}</ol>
      <h2>{graduating?'前半年带教完成':incident?.title??step.title}</h2>
      <p id="enterprise-tour-instruction" className="enterprise-tour-instruction" aria-live="polite">{graduating?'你的港口已经经营181日，接下来由你决定方向。':instruction}</p>
      {runtime.busy&&<p className="enterprise-tour-computing" role="status">{runtime.progress||'正在计算实际作业、费用和事件…'}</p>}
      {!graduating&&<div className="enterprise-tour-knowledge" role="status">{success?<><CheckCircle2 size={16}/>{success}</>:incident?<><Anchor size={16}/>{incident.why}</>:previous?.complete?<><CheckCircle2 size={16}/>{previous.why}</>:<><Anchor size={16}/>经营决定由你完成，常规事务按规则执行。</>}</div>}
      {graduating&&<><div className="enterprise-tour-results"><div><span>经营月报</span><strong>{v.months.length}期</strong></div><div><span>集装箱已交付</span><strong>{fmt(v.goods.find(g=>g.kind==='container')?.delivered??0)} TEU</strong></div><div><span>恢复的事件</span><strong>{v.stats.recovered}项</strong></div><div><span>可用现金</span><strong>{wan(v.cash)}</strong></div></div><button type="button" data-enterprise-control="tour-graduate" className="enterprise-button--primary" onClick={finish}>接管余下经营</button><button type="button" onClick={()=>downloadEnterprise('东湾港-前半年带教足迹.json',{schema:'port-enterprise-learning-report/4',hour:v.hour,rules:v.rules,steps:steps.filter(s=>s.kind!=='finish').map(s=>({id:s.id,title:s.title,complete:s.complete,evidence:profile?.receipts[s.id]}))})}>导出带教足迹</button></>}
      {!graduating&&<footer><span>{Math.min(index+1,steps.length)}/{steps.length}项管理任务 · 仅当前操作开放</span><button type="button" onClick={()=>{setReplay(n=>n+1);setHint('');}} aria-label="重播鼠标示范"><RotateCcw size={14}/>再示范</button></footer>}
      {hint&&<p className="enterprise-tour-hint" role="status">{hint}</p>}{error&&<p className="enterprise-tour-error" role="alert">{error}</p>}
      {runtime.listError&&<button disabled={runtime.busy} onClick={()=>void runtime.retryStorage().catch(e=>runtime.setError(e.message))}>重试读取本机存档</button>}
      {runtime.storageError&&<div className="enterprise-inline-actions"><button disabled={runtime.busy} onClick={()=>void runtime.saveNow().catch(e=>runtime.setError(e.message))}>重试保存进度</button><button disabled={runtime.busy} onClick={()=>{if(runtime.currentSave)downloadEnterprise('东湾港-当前经营备份.json',runtime.currentSave.record);}}>导出当前经营记录</button></div>}
    </section>
  </div>,host);
}
