import { useEffect, useId, useRef, useState, type RefObject } from 'react';
import { Hand, MousePointer2, X } from 'lucide-react';
import type { Notebook } from './port-class-notebook';
import { labCoachState, type LabCoachEvent } from './port-lab-coach';
import { tutorialElement } from './port-tutorial-targets';

type Rect={x:number;y:number;width:number;height:number;key:string};
export function PortLabCoach({book,playing,root,onEvent,onHide}:{book:Notebook;playing:boolean;root:RefObject<HTMLElement|null>;onEvent:(event:LabCoachEvent)=>void;onHide:()=>void}){
  const state=labCoachState(book,playing),step=state.current,card=useRef<HTMLElement>(null),mask=`lab-coach-${useId().replace(/:/g,'')}`;
  const [rects,setRects]=useState<Rect[]>([]),[viewport,setViewport]=useState({width:1200,height:800,cardHeight:300}),[compact,setCompact]=useState(false);
  const key=`${book.learning?.current.id}:${step?.id??'done'}`;
  const targets=(host:HTMLElement)=>step?.targets.includes('lab:chart-editor')&&!tutorialElement(host,'lab:chart-editor')&&step.id!=='window'?['lab:add-chart','lab:chart-settings']:step?.targets??[];
  const reveal=()=>{const host=root.current;if(!host||!step)return;const element=targets(host).map(t=>tutorialElement(host,t)).find(Boolean);if(!element)return;element.scrollIntoView({block:'start',inline:'nearest',behavior:'instant'});const r=element.getBoundingClientRect(),available=window.innerHeight-(window.innerWidth<1280?(card.current?.offsetHeight??300)+24:0);window.scrollBy({top:r.top-Math.max(20,(available-Math.min(r.height,available))/2),behavior:'instant'});};
  useEffect(()=>{
    setCompact(false);
    const timer=window.setTimeout(()=>{const active=document.activeElement;if(active&&root.current?.contains(active)&&/^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName))return;reveal();},100);
    return()=>clearTimeout(timer);
  },[key]);
  useEffect(()=>{
    let frame=0,last=0,previous='';const host=root.current;
    const keepInputVisible=(event:FocusEvent)=>{const input=event.target as HTMLElement;if(window.innerWidth>=1280||card.current?.contains(input)||!input.matches('input,select,textarea,button,summary,a'))return;window.setTimeout(()=>{if(document.activeElement!==input)return;const r=input.getBoundingClientRect(),bottom=window.innerHeight-(card.current?.offsetHeight??300)-24;if(r.bottom>bottom)window.scrollBy({top:r.bottom-bottom+12,behavior:'instant'});},80);};
    host?.addEventListener('focusin',keepInputVisible);
    const measure=()=>{
      const width=window.innerWidth,height=window.innerHeight,host=root.current,next:Rect[]=[],cardHeight=card.current?.offsetHeight??300;
      if(!host)return;
      host.style.setProperty('--lab-coach-height',`${cardHeight}px`);
      for(const target of targets(host)){const element=tutorialElement(host,target);if(!element)continue;const r=element.getBoundingClientRect();let left=Math.max(6,r.left),top=Math.max(6,r.top),right=Math.min(width-6,r.right),bottom=Math.min(width<1280?height-cardHeight-24:height-6,r.bottom);
        for(let p=element.parentElement;p&&p!==host;p=p.parentElement){if(/(auto|scroll|hidden|clip)/.test(getComputedStyle(p).overflowX+getComputedStyle(p).overflowY)){const b=p.getBoundingClientRect();left=Math.max(left,b.left);right=Math.min(right,b.right);top=Math.max(top,b.top);bottom=Math.min(bottom,b.bottom);}}
        if(right-left>8&&bottom-top>8)next.push({key:target,x:Math.round(left),y:Math.round(top),width:Math.round(right-left),height:Math.round(bottom-top)});
      }
      const encoded=JSON.stringify({next,width,height,cardHeight});
      if(previous!==encoded){previous=encoded;setRects(next);setViewport({width,height,cardHeight});}
    };
    const animate=(now:number)=>{if(now-last>100){measure();last=now;}frame=requestAnimationFrame(animate);};frame=requestAnimationFrame(animate);
    document.addEventListener('scroll',measure,true);window.addEventListener('resize',measure);
    return()=>{cancelAnimationFrame(frame);document.removeEventListener('scroll',measure,true);window.removeEventListener('resize',measure);host?.removeEventListener('focusin',keepInputVisible);host?.style.removeProperty('--lab-coach-height');};
  },[key,compact]);
  const width=Math.min(350,viewport.width-24);
  const pointer=rects[0];
  return <div className="plc-layer" data-lab-coach-step={step?.id??'complete'}>
    <svg className="plc-spotlight" aria-hidden="true" viewBox={`0 0 ${viewport.width} ${viewport.height}`}>
      <defs><mask id={mask}><rect width={viewport.width} height={viewport.height} fill="white"/>{rects.map(r=><rect key={r.key} x={r.x-4} y={r.y-4} width={r.width+8} height={r.height+8} rx="8" fill="black"/>)}</mask></defs>
      <rect width={viewport.width} height={viewport.height} fill="#092d42" opacity=".13" mask={`url(#${mask})`}/>
      {rects.map(r=><rect key={r.key} data-highlight-target={r.key} x={r.x-3} y={r.y-3} width={r.width+6} height={r.height+6} rx="8" fill="none" stroke="#e4a328" strokeWidth="3"/>)}
      {pointer&&<g className="plc-pointer" transform={`translate(${pointer.x+Math.min(pointer.width/2,45)} ${pointer.y+Math.min(pointer.height/2,24)})`}><circle r="17" fill="#ffd16a55" stroke="#d9971e" strokeWidth="2"/><path d="M0 0 V25 L7 18 L13 30 L18 27 L12 15 H23Z" fill="#fffaf0" stroke="#194b59" strokeWidth="2"/></g>}
    </svg>
    <section ref={card} className="plc-card" aria-label="本次实验操作引导" style={{width}}>
      <header><span><Hand size={17}/>{state.phase==='baseline'?'基准实验':'第一次试验'} · 操作引导</span><button onClick={()=>setCompact(!compact)} aria-expanded={!compact}>{compact?'展开':'收起'}</button><button onClick={onHide} aria-label="暂时关闭实验引导"><X size={16}/></button></header>
      <progress aria-label="操作引导进度" max={state.steps.length} value={state.completed}/>
      <div role="status" aria-live="polite"><small>{step?`已完成 ${state.completed} / ${state.steps.length} 项`:'操作引导已完成'}</small><h2>{step?.title??'可以继续自主试验了'}</h2></div>
      {!compact&&<><p>{step?.instruction??'保留本次发现，继续验证自己的改善方案。第二次试验起不再自动显示操作引导。'}</p>{step&&<p className="plc-why">{step.why}</p>}</>}
      <footer>{step?<><button onClick={reveal}><MousePointer2 size={14}/>定位高亮</button>{step.read&&<button className="pcl-primary" onClick={()=>onEvent({kind:'intro'})}>已了解，开始操作</button>}</>:<button onClick={onHide}>收起引导</button>}<small>亲自操作后自动进入下一项；可随时收起。</small></footer>
    </section>
  </div>;
}
