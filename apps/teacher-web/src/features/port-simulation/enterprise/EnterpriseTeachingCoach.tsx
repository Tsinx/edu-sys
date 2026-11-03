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
export function EnterpriseTeachingCoach({runtime,tab,navigate,pause,playing=false,inspectedAsset,compact=false,rootRef}:{runtime:Runtime;tab:string;navigate:(tab:string)=>void;pause:()=>void;playing?:boolean;inspectedAsset?:string;compact?:boolean;rootRef:RefObject<HTMLElement|null>}){
  const v=runtime.view!,profile=runtime.currentSave?.teaching;
  const eligible=v.config.mode==='practice'&&!runtime.currentSave?.attemptId&&!v.sealed;
  const compatible=profile?.schema===ENTERPRISE_TEACHING_VERSION;
  const active=!!(eligible&&compatible&&profile.active&&!v.finance.tutorialPaused&&!runtime.replaying&&!runtime.conflict&&!runtime.workerFailed);
  const steps=compatible?enterpriseTeachingSteps(v,runtime.currentSave?.record,profile):[];
  const step=steps.find(s=>s.id===profile?.selected)??steps.find(s=>!s.complete)??steps.at(-1);
  const index=step?steps.indexOf(step):0,incident=active?enterpriseIncidentLesson(v):undefined;
  const drafts=useContext(DraftsContext),prepared=useRef(''),card=useRef<HTMLElement>(null);
  const [host,setHost]=useState<HTMLElement|null>(null),[hint,setHint]=useState(''),[replay,setReplay]=useState(0),[exitPending,setExitPending]=useState(false);
  const [choicePoint,setChoicePoint]=useState<{left:number;top:number;dx:number;dy:number}|null>(null);
  const [action,setAction]=useState<EnterpriseGuideAction>(),[cardSize,setCardSize]=useState({width:320,height:216});
  // On a direct reload the parent's host ref is attached after child layout
  // effects. Resolve the portal after the whole tree has committed.
  useEffect(()=>{setHost(rootRef.current);},[rootRef,active]);
  useEffect(()=>{if(!hint)return;const id=setTimeout(()=>setHint(''),1800);return()=>clearTimeout(id);},[hint]);
  const blockedClick=useCallback(()=>setHint('先完成闪烁按钮这一步；其他经营操作暂时锁定。'),[]);
  const evidenceKey=step?.evidence.join('|')??'';
  const observe=useCallback(()=>{
    if(!active||!step||step.kind!=='observe'||incident||tab!==step.tab)return;
    const id=step.id;
    runtime.updateTeaching(p=>!p.active||p.selected!==id||p.actions[id]?p:{...p,actions:{...p.actions,[id]:1}});
  },[active,step?.id,step?.kind,evidenceKey,incident?.incident.id,tab,v.hour,v.journal.length,runtime.updateTeaching]);
  useLayoutEffect(()=>{
    if(!active||!step)return;
    const key=(runtime.currentSave?.id??'')+':'+step.id;
    if(prepared.current!==key){prepared.current=key;for(const [name,value]of Object.entries(step.drafts??{}))drafts.set(name,value);}
    const read=(selector:string)=>{const el=rootRef.current?.querySelector<HTMLInputElement>(selector);return el?el.type==='checkbox'?String(el.checked):el.value:undefined;};
    const next=resolveEnterpriseGuideAction(step,tab,v,read);
    setAction(old=>old?.id===next.id&&old.selector===next.selector&&old.value===next.value?old:next);
  },[active,step?.id,step?.target,step?.planHour,step?.complete,tab,v,drafts.values,rootRef,runtime.currentSave?.id,replay]);
  const transitioning=!!step?.complete;
  const running=step?.kind==='advance'&&playing&&!step.complete;
  const reading=step?.kind==='observe'&&tab===step.tab&&!incident;
  const readOnlyScene=tab==='overview'&&(running||reading);
  const {rect,bounds}=useEnterpriseTourLock({rootRef,selector:action?.selector,enabled:active,blocked:runtime.busy||transitioning,replay,onObserve:action?.kind==='observe'?observe:undefined,onBlocked:blockedClick,readOnlyScene,quiet:running||transitioning});
  useLayoutEffect(()=>{
    const root=rootRef.current,target=action?.kind==='choice'&&action.selector?root?.querySelector<HTMLElement>(action.selector):null;
    const field=target?.querySelector<HTMLElement>('select,input'),submit=target?.querySelector<HTMLElement>('button[type="submit"]');
    if(!root||!field||!submit){setChoicePoint(old=>old===null?old:null);return;}
    const measure=()=>{
      const r=root.getBoundingClientRect(),clip=target?.closest('.enterprise-game-window__body')?.getBoundingClientRect()??r,a=field.getBoundingClientRect(),b=submit.getBoundingClientRect();
      if(a.top<clip.top||a.bottom>clip.bottom||b.top<clip.top||b.bottom>clip.bottom){setChoicePoint(old=>old===null?old:null);return;}
      const next={left:a.left-r.left+a.width/2,top:a.top-r.top+a.height/2,dx:b.left+b.width/2-a.left-a.width/2,dy:b.top+b.height/2-a.top-a.height/2};
      setChoicePoint(old=>old&&Object.keys(next).every(k=>Math.abs(old[k as keyof typeof next]-next[k as keyof typeof next])<.5)?old:next);
    };
    measure();document.addEventListener('scroll',measure,true);window.addEventListener('resize',measure);
    return()=>{document.removeEventListener('scroll',measure,true);window.removeEventListener('resize',measure);};
  },[action?.kind,action?.selector,rect?.left,rect?.top,rect?.width,rect?.height,bounds.width,bounds.height,rootRef]);
  useEffect(()=>{
    if(!active||!step||!profile||runtime.busy||incident||exitPending)return;
    if(!profile.starts[step.id])runtime.updateTeaching(p=>p.starts[step.id]?p:{...p,starts:{...p.starts,[step.id]:{hour:v.hour,position:v.journal.length}}});
    if(!step.complete)return;
    if(!profile.receipts[step.id]){
      runtime.updateTeaching(p=>({...p,receipts:{...p.receipts,[step.id]:{hour:v.hour,position:v.journal.length,evidence:[...step.evidence]}}}));return;
    }
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
  const continueStep=()=>{
    if(!step||runtime.busy||incident)return;pause();
    const next=steps[index+1];if(!next)return;
    runtime.updateTeaching(p=>({...p,receipts:{...p.receipts,[step.id]:p.receipts[step.id]??{hour:v.hour,position:v.journal.length,evidence:[...step.evidence,...(step.id==='scene-load'&&inspectedAsset?['已核对设备 '+inspectedAsset]:[])]}},selected:next.id,starts:{...p.starts,[next.id]:p.starts[next.id]??{hour:v.hour,position:v.journal.length}}}));setHint('');
  };
  const exportFootprint=()=>downloadEnterprise('东湾港-前半年带教足迹.json',{schema:'port-enterprise-learning-report/8',hour:v.hour,rules:v.rules,steps:steps.map(s=>({id:s.id,title:s.title,complete:s.complete,evidence:profile?.receipts[s.id]}))});
  const history=<details className="enterprise-tour-history" onToggle={e=>{if(e.currentTarget.open)pause();}}><summary>回看已完成的决定与观察</summary>{steps.filter(s=>!!profile?.receipts[s.id]).map(s=><article key={s.id}><strong>{s.title}</strong><p>{profile?.receipts[s.id]?.evidence.join('；')}</p><small>{s.why}</small></article>)}</details>;
  if(runtime.conflict||runtime.workerFailed)return null;
  if(!active||!step){
    if(!compact&&tab!=='learning')return null;
    const resumable=eligible&&compatible&&profile&&!profile.active&&!profile.receipts.graduate&&profile.pausedAt===v.hour&&v.hour<=ENTERPRISE_TEACHING_END_HOUR&&!v.finance.tutorialPaused&&!runtime.replaying;
    const finished=compatible&&!!profile?.receipts.graduate;
    if(compact&&(!eligible||finished||v.hour>0&&!resumable&&!v.finance.tutorialPaused))return null;
    return <section className={'enterprise-coach enterprise-tour-welcome'+(compact?' is-compact':'')} aria-label="游戏带教入口"><span className="enterprise-eyebrow">单人经营 · 本机运行</span><h2>{v.finance.tutorialPaused?'固定带教资金方案已暂停':finished?'余下经营由你接管':'跟着鼠标，管理第一个半年'}</h2><p>{v.finance.tutorialPaused?'本场记录保留。资金保护不会无限透支，可另开一场固定方案带教重试。':finished?'前半年的设备、合同和经营记录继续保留。':resumable?'带教已暂停，当前港口与操作进度都已保留。':'跟随鼠标完成接管，再亲自选择运输、班表、补能、报价与改造。每次发布后用真实经营结果检验。'}</p>
      {resumable&&<button className="enterprise-button--primary" disabled={runtime.busy} onClick={()=>{pause();runtime.updateTeaching(p=>({...p,active:true}));navigate('overview');}}>继续前半年带教</button>}
      <button className="enterprise-button--primary" disabled={runtime.busy} onClick={start}><MousePointer2 size={17}/>开始前半年带教</button><small>带教另开一座港口，已有经营记录保留。</small>
      {!eligible&&<small>考核与封存记录保持原状，带教在独立练习中进行。</small>}
      {compatible&&profile&&Object.keys(profile.receipts).length>0&&<><button onClick={exportFootprint}>导出带教足迹</button>{history}</>}
    </section>;
  }
  if(!host)return null;
  const graduating=step.kind==='finish'&&tab==='overview';
  const position=placeTourCard(graduating?null:rect,bounds.width,bounds.height,Math.min(graduating?400:320,bounds.width-24),cardSize.height);
  const hole=rect&&!runtime.busy&&!transitioning&&!running?rect:null;
  const right=hole?Math.min(bounds.width,hole.left+hole.width):0,bottom=hole?Math.min(bounds.height,hole.top+hole.height):0;
  const masks:TourRect[]=hole?[
    {left:0,top:0,width:bounds.width,height:hole.top},
    {left:0,top:hole.top,width:hole.left,height:hole.height},
    {left:right,top:hole.top,width:Math.max(0,bounds.width-right),height:hole.height},
    {left:0,top:bottom,width:bounds.width,height:Math.max(0,bounds.height-bottom)},
  ]:[{left:0,top:0,width:bounds.width,height:bounds.height}];
  const month=Math.min(6,Math.max(1,step.month));
  const observed=reading&&!!profile?.actions[step.id]&&(step.id!=='scene-load'||!!inspectedAsset&&!!v.telemetry.assets[inspectedAsset]?.hours);
  const instruction=exitPending?'本轮结算结束后退出，进度会保留。':step.complete?'结果已保留。核对后点击“确认结果，继续”。':running?'正在按规则经营至'+hourLabel(step.planHour??v.hour)+'。可旋转场景、查看设备，或暂停观察。':runtime.busy?'港口正在结算本轮作业…':reading&&profile?.actions[step.id]?(step.id==='scene-load'&&!observed?'请点击一台设备，核对实际作业、岗位与等待数据。':'现在可以滚动查看结果。核对后点击“已核对，继续”。'):action?.kind==='choice'&&!choicePoint?'上下滚动核对依据，找到选择框与发布按钮；选择方案后发布。':action?.title??'正在定位下一步…';
  const error=runtime.error||runtime.storageError||runtime.listError||drafts.error;
  const cursorStyle=rect?{left:choicePoint?.left??rect.left+rect.width/2,top:choicePoint?.top??rect.top+rect.height/2,'--choice-dx':(choicePoint?.dx??0)+'px','--choice-dy':(choicePoint?.dy??0)+'px','--tour-dx':Math.max(-180,bounds.width/2-rect.left-rect.width/2)+'px','--tour-dy':Math.max(-100,bounds.height/2-rect.top-rect.height/2)+'px'} as CSSProperties:undefined;
  return createPortal(<div className="enterprise-tour-layer" data-tour-step={step.id} data-tour-action={action?.kind} data-tour-selector={action?.selector} data-tour-phase={running?'running':reading?'reading':step.complete?'result':'action'}>
    {!running&&!reading&&!step.complete&&action?.kind!=='choice'&&masks.map((r,i)=><div key={i} className="enterprise-tour-mask" style={r} aria-hidden="true"/>)}
    {hole&&<><div className="enterprise-tour-spotlight" style={hole} aria-hidden="true"/>{(action?.kind!=='choice'||choicePoint)&&<div key={action?.id+':'+replay} className={'enterprise-tour-cursor'+(action?.kind==='choice'?' is-choice':'')} style={cursorStyle} aria-hidden="true"><MousePointer2 size={32}/><i/><b>{action?.kind==='choice'?'选择并发布':'点击这里'}</b></div>}</>}
    <section ref={card} className={'enterprise-tour-card'+(graduating?' is-graduation':'')} style={position} data-enterprise-tour-ui aria-label="前半年管理引导">
      <header><span><ShipWheel size={17}/>{incident?'紧急插单':step.chapter}</span><button type="button" data-tour-exit disabled={exitPending} onClick={exit} aria-label="退出带教，保留当前进度"><DoorOpen size={16}/>{exitPending?'正在退出':'退出带教'}</button></header>
      <ol className="enterprise-tour-months" aria-label="六个月管理进度">{Array.from({length:6},(_,i)=><li key={i} data-current={i+1===month} data-done={i+1<month||graduating}><span>{i+1<month||graduating?'✓':i+1}</span>{i+1}月</li>)}</ol>
      <h2>{graduating?'前半年带教完成':incident?.title??step.title}</h2>
      <p id="enterprise-tour-instruction" className="enterprise-tour-instruction" aria-live="polite">{graduating?'你的港口已经经营181日，接下来由你决定方向。':instruction}</p>
      {runtime.busy&&<p className="enterprise-tour-computing" role="status">{runtime.progress||'正在计算实际作业、费用和事件…'}</p>}
      {!graduating&&<div className="enterprise-tour-knowledge" role="status"><Anchor size={16}/>{incident?.why??step.why}</div>}
      {!graduating&&(step.complete||observed)&&!incident&&<button type="button" data-tour-continue className="enterprise-button--primary" disabled={runtime.busy} onClick={continueStep}>{step.complete?'确认结果，继续':'已核对，继续'}</button>}
      {graduating&&<><div className="enterprise-tour-results"><div><span>经营月报</span><strong>{v.months.length}期</strong></div><div><span>集装箱已交付</span><strong>{fmt(v.goods.find(g=>g.kind==='container')?.delivered??0)} TEU</strong></div><div><span>恢复的事件</span><strong>{v.stats.recovered}项</strong></div><div><span>可用现金</span><strong>{wan(v.cash)}</strong></div></div><button type="button" data-enterprise-control="tour-graduate" className="enterprise-button--primary" onClick={finish}>接管余下经营</button><button type="button" onClick={exportFootprint}>导出带教足迹</button></>}
      {!graduating&&history}
      {!graduating&&<footer><span>{Math.min(index+1,steps.length)}/{steps.length}项管理任务 · 仅当前操作开放</span><button type="button" onClick={()=>{setReplay(n=>n+1);setHint('');}} aria-label="重播鼠标示范"><RotateCcw size={14}/>再示范</button></footer>}
      {hint&&<p className="enterprise-tour-hint" role="status">{hint}</p>}{error&&<p className="enterprise-tour-error" role="alert">{error}</p>}
      {runtime.listError&&<button disabled={runtime.busy} onClick={()=>void runtime.retryStorage().catch(e=>runtime.setError(e.message))}>重试读取本机存档</button>}
      {runtime.storageError&&<div className="enterprise-inline-actions"><button disabled={runtime.busy} onClick={()=>void runtime.saveNow().catch(e=>runtime.setError(e.message))}>重试保存进度</button><button disabled={runtime.busy} onClick={()=>void runtime.exportBackup().then(b=>downloadEnterprise('东湾港-当前经营备份.json',b)).catch(e=>runtime.setError(e.message))}>导出完整备份</button></div>}
    </section>
  </div>,host);
}
