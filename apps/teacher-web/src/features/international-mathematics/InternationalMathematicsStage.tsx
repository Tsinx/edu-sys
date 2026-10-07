import {useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import katex from 'katex';
import type {SlideFrame,SlideInteractionState,SlideInteractionValues} from '@edu/contracts';
import {getInternationalMathematicsSlide,getInternationalMathematicsInteractionDefaults,INTERNATIONAL_MATHEMATICS_FILMS,INTERNATIONAL_MATHEMATICS_LESSONS,derivativeCurve,evaluateCurve,secantSlope,type MathematicsSlide,type SlideElement,type PlotSpec,type Ink} from '@edu/course-content/international-mathematics';
import {SlideViewport} from '../classroom/SlideViewport';
import 'katex/dist/katex.min.css';
import './international-mathematics.css';

export const IM_COLORS:Record<Ink,string>={ink:'#18232c',blue:'#2357d8',coral:'#ee653f',green:'#14877b',yellow:'#f5d349',muted:'#5b6470',paper:'#fffdf7'};
const fmt=(n:number)=>Math.abs(n)<1e-9?'0':Number(n.toPrecision(4)).toString();
export function MathematicsPlot({plot:p,width:w,height:h,values={}}:{plot:PlotSpec;width:number;height:number;values?:SlideInteractionValues}){
 const left=78,top=35,right=35,bottom=65,pw=w-left-right,ph=h-top-bottom;
 const [xmin,xmax]=p.xRange,[ymin,ymax]=p.yRange;
 const X=(x:number)=>left+(x-xmin)/(xmax-xmin)*pw,Y=(y:number)=>top+(ymax-y)/(ymax-ymin)*ph;
 const path=(curve:number,a=xmin,b=xmax)=>Array.from({length:161},(_,i)=>{const x=a+(b-a)*i/160,y=evaluateCurve(p.curves[curve]!,x);return Number.isFinite(y)?`${i?'L':'M'}${X(x).toFixed(2)},${Y(y).toFixed(2)}`:'';}).join(' ');
 const tickX=Array.from({length:5},(_,i)=>xmin+(xmax-xmin)*i/4),tickY=Array.from({length:5},(_,i)=>ymin+(ymax-ymin)*i/4);
 const tx=p.tangent?Number(values.x??values.quantity??values.price??p.tangent.x):0;
 const sx=p.secant?Number(values.x??p.secant.x):0,sh=p.secant?Number(values.h??p.secant.h):0;
 const n=p.rectangles?Math.max(1,Math.min(100,Math.round(Number(values.n??p.rectangles.n)))):0;
 const areaTo=p.area?Number(values.x??p.area.to):0;
 return <svg className="im-plot" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`${p.yLabel} against ${p.xLabel}`}>
  <defs><clipPath id={`im-clip-${w}-${h}-${p.xLabel.replace(/\W/g,'')}`}><rect x={left} y={top} width={pw} height={ph}/></clipPath></defs>
  {tickX.map(x=><g key={`x${x}`}><path d={`M${X(x)} ${top}V${top+ph}`} stroke="#d8ddd9" strokeDasharray="4 6"/><text x={X(x)} y={top+ph+29} textAnchor="middle">{fmt(x)}</text></g>)}
  {tickY.map(y=><g key={`y${y}`}><path d={`M${left} ${Y(y)}H${left+pw}`} stroke="#d8ddd9" strokeDasharray="4 6"/><text x={left-13} y={Y(y)+7} textAnchor="end">{fmt(y)}</text></g>)}
  <g clipPath={`url(#im-clip-${w}-${h}-${p.xLabel.replace(/\W/g,'')})`}>
   {p.area&&<path d={`${path(p.area.curve,p.area.from,areaTo)} L${X(areaTo)} ${Y(p.area.baseline??0)} L${X(p.area.from)} ${Y(p.area.baseline??0)}Z`} fill={IM_COLORS.green} opacity=".22"/>}
   {p.rectangles&&Array.from({length:n},(_,i)=>{const r=p.rectangles!,dx=(r.to-r.from)/n,x=r.from+i*dx,y=evaluateCurve(p.curves[r.curve]!,x);return <rect key={i} x={X(x)} y={Math.min(Y(0),Y(y))} width={Math.abs(X(x+dx)-X(x))} height={Math.abs(Y(y)-Y(0))} fill={IM_COLORS.yellow} stroke={IM_COLORS.coral} strokeWidth="1.5" opacity=".65"/>;})}
   {p.curves.map((c,i)=><path key={i} d={path(i)} fill="none" stroke={IM_COLORS[c.color??'blue']} strokeWidth="5"/>)}
   {p.tangent&&(()=>{const c=p.curves[p.tangent.curve]!,y=evaluateCurve(c,tx),m=derivativeCurve(c,tx);return <g><path d={`M${X(xmin)} ${Y(y+m*(xmin-tx))}L${X(xmax)} ${Y(y+m*(xmax-tx))}`} stroke={IM_COLORS.coral} strokeWidth="4"/><circle cx={X(tx)} cy={Y(y)} r="8" fill={IM_COLORS.coral}/></g>;})()}
   {p.secant&&(()=>{const c=p.curves[p.secant.curve]!,y=evaluateCurve(c,sx),m=secantSlope(c,sx,sh);return <g><path d={`M${X(xmin)} ${Y(y+m*(xmin-sx))}L${X(xmax)} ${Y(y+m*(xmax-sx))}`} stroke={IM_COLORS.green} strokeWidth="4"/><circle cx={X(sx)} cy={Y(y)} r="8" fill={IM_COLORS.coral}/><circle cx={X(sx+sh)} cy={Y(evaluateCurve(c,sx+sh))} r="8" fill={IM_COLORS.green}/></g>;})()}
   {p.points?.map((v,i)=><g key={i}><circle cx={X(v.x)} cy={Y(v.y)} r="7" fill={IM_COLORS.ink}/>{v.label&&<text x={X(v.x)+12} y={Y(v.y)-15} className="im-point-label">{v.label}</text>}</g>)}
  </g>
  <path d={`M${left} ${top}V${top+ph}H${left+pw}`} stroke={IM_COLORS.ink} strokeWidth="2.5" fill="none"/>
  <text x={left+pw/2} y={h-8} textAnchor="middle" className="im-axis-label">{p.xLabel}</text><text x="8" y="21" className="im-axis-label">{p.yLabel}</text>
  {p.curves.map((c,i)=>c.label&&<text key={i} x={left+16} y={top+25+i*27} fill={IM_COLORS[c.color??'blue']} className="im-legend">{c.label}</text>)}
  {p.annotations?.map((a,i)=><text key={i} x={X(a.x)} y={Y(a.y)} className="im-annotation">{a.text}</text>)}
 </svg>;
}

function Diagram({e}:{e:Extract<SlideElement,{kind:'diagram'}>}){
 const colours=['blue','coral','green','yellow'] as const;
 if(e.name==='receipt')return <div className="im-receipt"><span>RECEIPT / MODEL</span>{e.labels.map((label,i)=><div key={i}><b>{label}</b><strong>{e.values?.[i]??''}</strong></div>)}</div>;
 if(e.name==='number-line')return <div className="im-number-line"><div/>{e.labels.map((label,i)=><span key={i} style={{left:`${8+i*84/Math.max(1,e.labels.length-1)}%`}}><i/>{label}</span>)}</div>;
 if(e.name==='balance')return <div className="im-balance">{e.labels.map((label,i)=><section key={i} style={{borderColor:IM_COLORS[colours[i%4]!]}}><span>{label}</span><strong>{e.values?.[i]??''}</strong></section>)}<b>=</b></div>;
 return <div className={`im-diagram im-diagram--${e.name}`}>{e.labels.map((label,i)=><div key={i} style={{background:IM_COLORS[colours[i%4]!],color:colours[i%4]==='yellow'?IM_COLORS.ink:IM_COLORS.paper}}><span>{label}</span>{e.values?.[i]&&<strong>{e.values[i]}</strong>}{i<e.labels.length-1&&<i>→</i>}</div>)}</div>;
}

function Formula({e,style}:{e:Extract<SlideElement,{kind:'math'}>;style:React.CSSProperties}){
 const ref=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{const el=ref.current;if(!el)return;const fit=()=>{el.style.transform='none';const factor=Math.min(1,e.w/el.scrollWidth,e.h/el.scrollHeight);el.style.transform=`scale(${factor})`;el.dataset.fitScale=factor.toFixed(3);};fit();void document.fonts.ready.then(fit);},[e]);
 return <div className="im-math" style={{...style,fontSize:e.size??46,color:IM_COLORS[e.color??'blue']}}><div ref={ref} className="im-formula" dangerouslySetInnerHTML={{__html:katex.renderToString(e.tex,{displayMode:true,throwOnError:true,strict:'ignore'})}}/></div>;
}
export function MathematicsCanvas({spec,values={},openingMedia}:{spec:MathematicsSlide;values?:SlideInteractionValues;openingMedia?:React.ReactNode}){
 return <article className="im-slide" lang="en" data-slide-composition={spec.compositionId} data-im-slide={spec.slideKey}>
  <div className="im-ruling"/><p className="im-kicker">{spec.optionalChallenge&&!/optional challenge/i.test(spec.kicker)?'OPTIONAL CHALLENGE · ':''}{spec.kicker}</p><h1>{spec.title}</h1>
  {spec.elements.map((e,i)=>{
   const style:React.CSSProperties={position:'absolute',left:e.x,top:e.y,width:e.w,height:e.h};
   if(e.kind==='text')return <div key={i} className="im-text" style={{...style,fontSize:e.size??34,fontWeight:e.weight??400,color:IM_COLORS[e.color??'ink'],textAlign:e.align??'left'}}>{e.text}</div>;
   if(e.kind==='math')return <Formula key={i} e={e} style={style}/>;
   if(e.kind==='shape')return <div key={i} className="im-shape" aria-hidden="true" style={{...style,background:IM_COLORS[e.color],borderRadius:e.shape==='circle'?'50%':e.radius??0,transform:`rotate(${e.rotation??0}deg)`}}/>;
   if(e.kind==='image')return <div key={i} className="im-art" style={{...style,transform:`rotate(${e.rotation??0}deg)`}}>{spec.openingFilm&&e.asset==='opening'&&openingMedia?openingMedia:<img src={e.asset==='module'?`/course-assets/international-mathematics/art/module-${Math.ceil(spec.lesson/4)}.png`:`/course-assets/international-mathematics/art/lesson-${String(spec.lesson).padStart(2,'0')}-${e.asset}.png`} alt={e.alt}/>}</div>;
   if(e.kind==='plot')return <div key={i} style={style}><MathematicsPlot plot={e.plot} width={e.w} height={e.h} values={values}/></div>;
   if(e.kind==='table')return <div key={i} className="im-table-wrap" style={style}><table style={{fontSize:Math.min(27,Math.max(18,(e.h/(e.rows.length+1)-10)*.55))}}><thead><tr>{e.columns.map((v,j)=><th key={j}>{v}</th>)}</tr></thead><tbody>{e.rows.map((r,j)=><tr key={j} className={j===e.highlightRow?'im-highlight':''}>{r.map((v,k)=><td key={k}>{v}</td>)}</tr>)}</tbody></table></div>;
   return <div key={i} style={style}><Diagram e={e}/></div>;
  })}
  {spec.question&&<aside className="im-question"><b>?</b><span>{spec.question}</span></aside>}
  {spec.answer&&values.revealed===true&&<aside className="im-answer" aria-live="polite"><b>Check your reasoning</b><p>{spec.answer}</p></aside>}
  <footer><span>{spec.publicLabel??'Mathematical model'} · Jacques, 9th ed., §{spec.source.section}, pp. {spec.source.printedPages.join('–')}{spec.source.supplement?' · Supplement':''}</span><span>LESSON {String(spec.lesson).padStart(2,'0')} / {String(spec.localIndex).padStart(2,'0')}</span></footer>
 </article>;
}

interface Props {frame:SlideFrame;interaction:SlideInteractionState|null;readOnly:boolean;onInteractionPatch?:(patch:SlideInteractionValues)=>void;onInteractionReset?:()=>void;playbackMode?:'teacher'|'student'|'reader'|'offline';serverNowMs?:number;onNavigate?:(index:number)=>void;}
export function InternationalMathematicsStage({frame,interaction,readOnly,onInteractionPatch,onInteractionReset,playbackMode,serverNowMs,onNavigate}:Props){
 const spec=getInternationalMathematicsSlide(frame.index),mode=playbackMode??(readOnly?'student':'teacher'),local=mode==='reader'||mode==='offline',control=mode!=='student';
 const defaults=useMemo(()=>getInternationalMathematicsInteractionDefaults(spec.slideKey)??{},[spec.slideKey]);
 const [localValues,setLocalValues]=useState<SlideInteractionValues>(defaults),[sound,setSound]=useState(false),[mediaError,setMediaError]=useState(''),[displayPosition,setDisplayPosition]=useState(0);
 const video=useRef<HTMLVideoElement>(null),offset=useRef(0),latest=useRef<SlideInteractionValues>({});
 const values=local?localValues:{...defaults,...(interaction?.slideId===frame.slideId?interaction.values:{})};latest.current=values;
 useEffect(()=>{setLocalValues(defaults);setMediaError('');setSound(false);setDisplayPosition(0);},[defaults]);
 useEffect(()=>{if(serverNowMs)offset.current=serverNowMs-Date.now();},[serverNowMs]);
 const patch=(p:SlideInteractionValues)=>{if(local||!onInteractionPatch)setLocalValues(v=>({...v,...p}));else onInteractionPatch(p);};
 const target=()=>Math.min(90,Math.max(0,(Number(latest.current.positionMs??0)+(latest.current.playing?Math.max(0,Date.now()+offset.current-Number(latest.current.anchorMs??0)):0))/1000));
 useEffect(()=>{
  const v=video.current;if(!v||!spec.openingFilm)return;
  const sync=()=>{const t=target();if(Number.isFinite(v.duration)&&Math.abs(v.currentTime-t)>.25)v.currentTime=t;if(latest.current.playing&&t<90){void v.play().catch(()=>setMediaError('Select Enable sound or Play to start playback.'));}else v.pause();};
  sync();const timer=setInterval(sync,500);return()=>{clearInterval(timer);v.pause();};
 },[spec.slideKey,values.playing,values.positionMs,values.anchorMs,values.runId,spec.openingFilm]);
 const film=INTERNATIONAL_MATHEMATICS_FILMS[spec.lesson-1]!;
 const media=spec.openingFilm?<video ref={video} className="im-video" poster={film.poster} src={film.src} muted={!sound} playsInline preload="metadata" onTimeUpdate={e=>setDisplayPosition(Math.round(e.currentTarget.currentTime*1000))} onLoadedMetadata={()=>{if(video.current)video.current.currentTime=target();}} onError={()=>setMediaError('Video unavailable. Use the illustrated opening question.')}><track kind="captions" src={film.captions} srcLang="en" label="English" default/></video>:undefined;
 return <div className="im-stage" lang="en"><SlideViewport label={`English mathematics, lesson ${spec.lesson}, page ${spec.localIndex} of ${spec.localTotal}`}><MathematicsCanvas spec={spec} values={values} openingMedia={media}/></SlideViewport>
  <div className="im-controls">
   {control&&onNavigate&&INTERNATIONAL_MATHEMATICS_LESSONS.find(l=>l.number===spec.lesson)?.hourRanges?.map(h=><button key={h.number} onClick={()=>onNavigate(h.slideStart)}>Hour {h.number}</button>)}
   {spec.openingFilm&&<>{control&&<><button onClick={()=>patch({playing:!values.playing,positionMs:Math.round(target()*1000),anchorMs:Date.now()+offset.current,runId:String(values.runId??'initial')})}>{values.playing?'Pause':'Play introduction'}</button><button onClick={()=>patch({playing:true,positionMs:0,anchorMs:Date.now()+offset.current,runId:`replay-${Date.now()}`})}>Replay</button><input aria-label="Video position" type="range" min="0" max="90000" step="1000" value={displayPosition} onChange={e=>{setDisplayPosition(Number(e.target.value));patch({positionMs:Number(e.target.value),anchorMs:Date.now()+offset.current,playing:Boolean(values.playing)});}}/></>}
   <button data-im-audio-control onClick={()=>{setSound(v=>!v);if(video.current){video.current.muted=sound;if(latest.current.playing)void video.current.play().catch(()=>{});}setMediaError('');}}>{sound?'Mute':'Enable sound'}</button></>}
   {spec.interaction&&control&&<label>{spec.interaction.label}<input type="range" aria-label={spec.interaction.label} min={spec.interaction.min} max={spec.interaction.max} step={spec.interaction.step} value={Number(values[spec.interaction.key]??spec.interaction.initial)} onChange={e=>patch({[spec.interaction!.key]:Number(e.target.value)})}/><output>{fmt(Number(values[spec.interaction.key]??spec.interaction.initial))}</output></label>}
   {spec.answer&&control&&<button onClick={()=>patch({revealed:!values.revealed})}>{values.revealed?'Hide reasoning':'Reveal reasoning'}</button>}
   {control&&Object.keys(defaults).length>0&&<button onClick={()=>{if(local||!onInteractionReset)setLocalValues(defaults);else onInteractionReset();}}>Reset</button>}
   {mediaError&&<span className="im-media-error">{mediaError}</span>}
  </div>
 </div>;
}
