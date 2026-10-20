import {useEffect,useId,useRef,useState,type RefObject} from 'react';
import {Hand,MousePointer2,X} from 'lucide-react';
import type {Notebook} from './port-class-notebook';
import {labCoachState,resolveLabCoachStep,type LabCoachContext,type LabCoachEvent,type LabCoachUI} from './port-lab-coach';
import {tutorialElements} from './port-tutorial-targets';

type Rect={x:number;y:number;width:number;height:number;key:string};
const emptyUI:LabCoachUI={editorOpen:false,editorMetric:'',editorChart:'',editorBaseline:false,pointAvailable:false,seriesHidden:false,inspectionVisible:false,settingsAvailable:false,chartAvailable:false};
const visible=(e:HTMLElement)=>{const r=e.getBoundingClientRect(),closed=e.closest('details:not([open])');return r.width>1&&r.height>1&&!e.matches(':disabled')&&(!closed||e===closed.querySelector('summary'));};
export function PortLabCoach({book,playing,root,onEvent,onHide,context={},onCommitDispatch}:{book:Notebook;playing:boolean;root:RefObject<HTMLElement|null>;onEvent:(event:LabCoachEvent)=>void;onHide:()=>void;context?:LabCoachContext;onCommitDispatch?:()=>void}){
 const state=labCoachState(book,playing,context),[ui,setUI]=useState(emptyUI),step=resolveLabCoachStep(state.current,ui);
 const card=useRef<HTMLElement>(null),mask=`lab-coach-${useId().replace(/:/g,'')}`,[rects,setRects]=useState<Rect[]>([]),[viewport,setViewport]=useState({width:1200,height:800}),[compact,setCompact]=useState(false);
 const [cursor,setCursor]=useState({x:0,y:0,visible:false,phase:'ready',label:''});
 const cursorRef=useRef(cursor);cursorRef.current=cursor;
 const live=useRef({step,phase:state.phase});live.current={step,phase:state.phase};
 const timers=useRef<number[]>([]),key=`${book.learning?.current.id}:${step?.id}:${step?.targets.join(',')}`;
 const scope=(host:HTMLElement,key:string)=>live.current.phase==='trial'&&['lab:plot-point','lab:numbers','lab:inspection','lab:legend','lab:legend-restore','lab:chart-settings','lab:chart-layout','lab:chart-export'].includes(key)?host.querySelector<HTMLElement>('[data-analysis-comparison="true"]')??host:host;
 const element=(host:HTMLElement,key:string)=>{const candidates=tutorialElements(scope(host,key),key).filter(visible);return candidates.find(e=>e.getAttribute('data-source')==='current')??candidates[0];};
 const primary=()=>{const host=root.current;return host?live.current.step?.targets.map(k=>element(host,k)).find(Boolean):undefined;};
 const reveal=(behavior:ScrollBehavior='smooth')=>{const e=primary();if(!e)return;const r=e.getBoundingClientRect(),c=card.current?.getBoundingClientRect(),bottom=window.innerWidth<1280?(c?.top??window.innerHeight)-16:window.innerHeight-16,top=16,available=bottom-top;
  const dy=r.top<top?r.top-top:r.bottom>bottom?r.top-Math.max(top,top+(available-Math.min(r.height,available))/2):0;
  if(Math.abs(dy)>2)window.scrollBy({top:dy,behavior});
  if(r.left<0||r.right>window.innerWidth)e.scrollIntoView({block:'nearest',inline:'nearest',behavior});
 };
 const cancelDemo=()=>{timers.current.forEach(clearTimeout);timers.current=[];};
 const demonstrate=()=>{
  cancelDemo();reveal();
  timers.current.push(window.setTimeout(()=>{const e=primary();if(!e){setCursor(p=>({...p,visible:false}));return;}const r=e.getBoundingClientRect(),c=card.current?.getBoundingClientRect();
   const label=e.getAttribute('aria-label')||e.textContent?.trim().slice(0,28)||e.closest('label')?.textContent?.trim().slice(0,28)||'高亮控件';
   const x=r.left+Math.min(r.width/2,Math.max(12,r.width-8)),y=r.top+Math.min(r.height/2,24),reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
   if(reduced){setCursor({x,y,visible:true,phase:'ready',label});return;}
   const previous=cursorRef.current,fromPrevious=previous.visible&&Math.hypot(previous.x-x,previous.y-y)>45;
   setCursor({x:fromPrevious?previous.x:(c?.left??x)+25,y:fromPrevious?previous.y:(c?.top??y)+30,visible:true,phase:'origin',label});
   timers.current.push(window.setTimeout(()=>setCursor(p=>({...p,x,y,phase:'moving'})),40));
   timers.current.push(window.setTimeout(()=>setCursor(p=>({...p,phase:'hover'})),740));
   if(!live.current.step?.watch)timers.current.push(window.setTimeout(()=>setCursor(p=>({...p,phase:'click'})),1050));
   timers.current.push(window.setTimeout(()=>setCursor(p=>({...p,phase:'ready'})),1700));
  },420));
 };
 useEffect(()=>{demonstrate();return cancelDemo;},[key]);
 useEffect(()=>{
  let frame=0,last=0,encoded='',uiEncoded='';const host=root.current;if(!host)return;
  const measure=()=>{
   const w=window.innerWidth,h=window.innerHeight,c=card.current?.getBoundingClientRect(),next:Rect[]=[];
   host.style.setProperty('--lab-coach-height',`${c?.height??250}px`);
   const editor=host.querySelector<HTMLElement>('.pla-editor'),dataScope=scope(host,'lab:plot-point');
   const nextUI:LabCoachUI={editorOpen:!!editor,advancedOpen:!!editor?.querySelector('.pla-editor-advanced[open]'),editorMetric:editor?.querySelector<HTMLSelectElement>('[data-tutorial-target="lab:chart-metric"]')?.value??'',editorChart:editor?.querySelector<HTMLSelectElement>('[data-tutorial-target="lab:chart-type"]')?.value??'',editorBaseline:!!editor?.querySelector<HTMLInputElement>('[data-tutorial-target="lab:chart-baseline"]')?.checked,pointAvailable:!!element(host,'lab:plot-point'),seriesHidden:!!dataScope.querySelector('[data-tutorial-target="lab:legend-restore"]'),inspectionVisible:!!element(host,'lab:inspection')||!!dataScope.querySelector('.pla-numbers[open]'),settingsAvailable:!!element(host,'lab:chart-settings'),chartAvailable:!!host.querySelector('.pla-card'),findingFocused:document.activeElement?.getAttribute('aria-label')==='本次实验的发现'};
   const u=JSON.stringify(nextUI);if(u!==uiEncoded){uiEncoded=u;setUI(nextUI);}
   for(const target of live.current.step?.targets??[]){const e=element(host,target);if(!e)continue;const r=e.getBoundingClientRect();let left=Math.max(6,r.left),top=Math.max(6,r.top),right=Math.min(w-6,r.right),bottom=Math.min(w<1280?(c?.top??h)-16:h-6,r.bottom);
    for(let p=e.parentElement;p&&p!==host;p=p.parentElement)if(/(auto|scroll|hidden|clip)/.test(getComputedStyle(p).overflowX+getComputedStyle(p).overflowY)){const b=p.getBoundingClientRect();left=Math.max(left,b.left);right=Math.min(right,b.right);top=Math.max(top,b.top);bottom=Math.min(bottom,b.bottom);}
    if(right-left>3&&bottom-top>3)next.push({key:target,x:Math.round(left),y:Math.round(top),width:Math.round(right-left),height:Math.round(bottom-top)});
   }
   const s=JSON.stringify({next,w,h});if(encoded!==s){encoded=s;setRects(next);setViewport({width:w,height:h});}
  };
  const focus=(event:FocusEvent)=>{const e=event.target as HTMLElement;if(card.current?.contains(e))return;timers.current.push(window.setTimeout(()=>{if(document.activeElement!==e)return;const r=e.getBoundingClientRect(),c=card.current?.getBoundingClientRect();if(window.innerWidth<1280&&c&&r.bottom>c.top-16)window.scrollBy({top:r.bottom-c.top+32,behavior:'smooth'});},80));};
  const animate=(now:number)=>{if(now-last>100){measure();last=now;}frame=requestAnimationFrame(animate);};frame=requestAnimationFrame(animate);
  const scroll=()=>{measure();const e=primary();if(!e){setCursor(p=>({...p,visible:false}));return;}const r=e.getBoundingClientRect();setCursor(p=>p.visible?{...p,x:r.left+r.width/2,y:r.top+Math.min(r.height/2,24)}:p);};
  const observer=new MutationObserver(measure);observer.observe(host,{childList:true,subtree:true,attributes:true,attributeFilter:['open','aria-pressed','data-chart-id']});host.addEventListener('change',measure);host.addEventListener('input',measure);measure();
  document.addEventListener('scroll',scroll,true);window.addEventListener('resize',measure);host.addEventListener('focusin',focus);
  return()=>{observer.disconnect();host.removeEventListener('change',measure);host.removeEventListener('input',measure);cancelAnimationFrame(frame);document.removeEventListener('scroll',scroll,true);window.removeEventListener('resize',measure);host.removeEventListener('focusin',focus);host.style.removeProperty('--lab-coach-height');};
 },[]);
 const act=()=>{if(step?.action==='finish-input'){(document.activeElement as HTMLElement|null)?.blur();onCommitDispatch?.();return;}if(step?.action==='help-close'){onEvent({kind:'help',topic:'core'});return;}if(step?.action)onEvent({kind:step.action});};
 const actionLabel=step?.action==='finish-input'?'完成输入，定位应用':step?.action==='evidence'?'已读证据，继续实验':step?.action==='review'?'已核对结果，填写发现':step?.action==='unchanged'?'保留本轮作重复验证':'回到实验主线';
 return <div className="plc-layer" data-lab-coach-step={step?.id??'complete'}>
  <svg className="plc-spotlight" aria-hidden="true" viewBox={`0 0 ${viewport.width} ${viewport.height}`}><defs><mask id={mask}><rect width={viewport.width} height={viewport.height} fill="white"/>{rects.map(r=><rect key={r.key} x={r.x-4} y={r.y-4} width={r.width+8} height={r.height+8} rx="7" fill="black"/>)}</mask></defs><rect width={viewport.width} height={viewport.height} fill="#092d42" opacity=".09" mask={`url(#${mask})`}/>{rects.map(r=><rect key={r.key} data-highlight-target={r.key} x={r.x-3} y={r.y-3} width={r.width+6} height={r.height+6} rx="7" fill="none" stroke="#cb8a21" strokeWidth="3"/>)}</svg>
  {cursor.visible&&<div className={`plc-demo-cursor plc-demo-${cursor.phase} ${cursor.x>viewport.width-115?'plc-demo-edge':''}`} data-demo-phase={cursor.phase} aria-hidden="true" style={{transform:`translate3d(${cursor.x}px,${cursor.y}px,0)`}}><span className="plc-demo-ring"/><svg width="28" height="35" viewBox="0 0 28 35"><path d="M2 2 V27 L9 20 L15 32 L20 29 L14 17 H25Z" fill="#fffaf0" stroke="#194b59" strokeWidth="2"/></svg><span className="plc-demo-label">示范指针</span></div>}
  <section ref={card} className="plc-card" aria-label="本次实验操作引导">
   <header><span><Hand size={17}/>{state.phase==='baseline'?'基准观察':state.phase==='trial'?'首次试验':'自主试验帮助'}</span><button onClick={()=>setCompact(!compact)} aria-expanded={!compact}>{compact?'展开':'收起'}</button><button onClick={onHide} aria-label="暂时关闭实验引导"><X size={16}/></button></header>
   <progress aria-label="操作引导进度" max={Math.max(1,state.steps.length)} value={state.completed}/><div role="status" aria-live="polite"><small>{state.steps.length>1?`学习节点 ${Math.min(state.completed+1,state.steps.length)} / ${state.steps.length}`:'按需专题帮助'}</small><h2>{step?.title??'可以继续自主试验了'}</h2></div>
   {!compact&&<><p>{step?.instruction??'保留发现，继续验证自己的改善方案。'}</p>{step&&<details className="plc-why"><summary>为什么这样做</summary><p>{step.why}</p></details>}</>}
   <footer>{step&&<button onClick={demonstrate}><MousePointer2 size={14}/>演示鼠标位置</button>}{step?.action&&<button className="pcl-primary" onClick={act}>{actionLabel}</button>}<small>示范只指路，实际点击和判断由你完成。</small></footer>
  </section>
 </div>;
}
