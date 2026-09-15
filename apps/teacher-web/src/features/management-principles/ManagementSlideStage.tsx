import type {SlideFrame,SlideInteractionState,SlideInteractionValues} from '@edu/contracts';
import {getManagementSlide, getManagementVisibleDemo, type ManagementDiagram, type ManagementTable, type ManagementSlide} from '@edu/course-content/management-principles';
import {SlideViewport} from '../classroom/SlideViewport';
import './management.css';

function NativeTable({value}:{value:ManagementTable}){
  return <table className="mg-table"><thead><tr>{value.headers.map((h,i)=><th key={i}>{h}</th>)}</tr></thead><tbody>{value.rows.map((r,i)=><tr key={i}>{r.map((v,j)=><td key={j}>{v}</td>)}</tr>)}</tbody></table>;
}
function Diagram({value}:{value:ManagementDiagram}){
  const {kind,items,center}=value;
  if(kind==='scale-curve'||kind==='s-curve')return <svg className="mg-curve" viewBox="0 0 1100 320" role="img" aria-label={kind==='scale-curve'?'规模经济概念曲线':'替代扩散概念曲线'}><path d="M110 30V270H1010" fill="none" stroke="currentColor" strokeWidth="2"/><path d={kind==='scale-curve'?'M140 60C240 235 440 235 610 225S860 225 970 230':'M140 255C360 255 430 230 530 145S670 45 960 45'} fill="none" stroke="#3b786b" strokeWidth="6"/><text x="130" y="30">{kind==='scale-curve'?'平均单位成本':'采用比例'}</text><text x="960" y="310">{kind==='scale-curve'?'产量':'时间'}</text><text x="600" y="300">{kind==='scale-curve'?'有效规模区间':'扩散 → 成熟'}</text></svg>;
  if(kind==='decision-tree')return <div className="mg-tree">{[0,3].map(i=><div className="mg-tree-branch" key={i}><strong>{items[i]}</strong><div><span>{items[i+1]}</span><span>{items[i+2]}</span></div></div>)}</div>;
  if(['radial','network','rings'].includes(kind))return <div className="mg-orbit"><strong>{center??'组织'}</strong><div>{items.map((item,i)=><span key={i}><i>{String(i+1).padStart(2,'0')}</i>{item}</span>)}</div></div>;
  if(['swot','quadrants'].includes(kind))return <div className="mg-quadrants">{items.map((item,i)=><div key={i}><em>{['Ⅰ','Ⅱ','Ⅲ','Ⅳ'][i]}</em><span>{item}</span></div>)}</div>;
  return <ol className={`mg-flow ${kind==='timeline'?'mg-flow--timeline':''}`}>{items.map((item,i)=><li key={i}><span>{String(i+1).padStart(2,'0')}</span><strong>{item}</strong></li>)}</ol>;
}
function Paragraphs({lines}:{lines:string[]}){return <div className="mg-paragraphs">{lines.map((line,i)=><p key={i}>{line}</p>)}</div>;}
function Art({slide,compact=false}:{slide:ManagementSlide;compact?:boolean}){
  if(!slide.image)return null;
  return <figure className={`mg-art${compact?' mg-art--compact':''}`}><img src={slide.image.src} alt={slide.image.alt} decoding="async" draggable={false}/><figcaption>{slide.image.label}</figcaption>{slide.referenceImage&&<figure className="mg-reference"><img src={slide.referenceImage.src} alt={slide.referenceImage.alt}/><figcaption>{slide.referenceImage.label}</figcaption></figure>}</figure>;
}
export function ManagementSlideStage({frame,interaction=null,readOnly=true,onInteractionPatch,onInteractionReset}:{frame:SlideFrame;interaction?:SlideInteractionState|null;readOnly?:boolean;onInteractionPatch?:(patch:SlideInteractionValues)=>void;onInteractionReset?:()=>void}){
  const s=getManagementSlide(frame.index);
  const values=interaction?.slideId===s.slideKey?interaction.values:{};
  const d=s.demo?getManagementVisibleDemo(s.demo,values):undefined;
  const cover=s.layout==='cover'||s.layout==='opener';
  const structured=Boolean(s.table||s.diagram||d);
  const spread=!cover&&!structured&&Boolean(s.image);
  return <SlideViewport label={`管理学，第${s.lessonNumber}讲第${s.localIndex}页：${s.title}`}><article className={`mg-slide mg-slide--${s.layout}${cover?' mg-slide--cover':''}${spread?' mg-slide--spread':''}${structured?' mg-slide--structured':''}${structured&&s.image?' mg-slide--head-art':''}`} data-management-page={s.slideKey}>
    {cover&&<Art slide={s}/>}
    <header className="mg-header"><div className="mg-kicker"><span>PRINCIPLES OF MANAGEMENT</span><span>0{s.lessonNumber} / {s.section}</span></div><h1>{s.title}</h1>{s.partTotal>1&&<span className="mg-continuation">{s.part} / {s.partTotal}</span>}</header>
    {structured&&<Art slide={s} compact/>}
    <section className="mg-content">
      {d?<div className="mg-demo">
        <div className="mg-demo-heading"><h2>{d.heading}</h2><span>{d.step+1} / {d.maxStep+1}</span></div>
        <div className={`mg-demo-material${d.table||d.diagram?' mg-demo-material--visual':''}`}>
          {(d.table||d.diagram)&&<div className="mg-demo-figure">{d.table&&<NativeTable value={d.table}/>} {d.diagram&&<Diagram value={d.diagram}/>}</div>}
          <div className="mg-demo-explanation"><Paragraphs lines={d.body}/>{d.metrics&&<div className="mg-metrics">{d.metrics.map(m=><div key={m.label}><span>{m.label}</span><strong>{m.value}</strong>{m.detail&&<small>{m.detail}</small>}</div>)}</div>}</div>
        </div>
        <div className="mg-demo-controls">{d.controls.map(c=><label key={c.key}><span>{c.label}</span>{c.options?<select disabled={readOnly} value={String(d.values[c.key])} onChange={e=>onInteractionPatch?.({[c.key]:e.target.value})}>{c.options.map(o=><option value={o.value} key={o.value}>{o.label}</option>)}</select>:<><input type="range" aria-label={c.label} min={c.min} max={c.max} step={c.step} value={Number(d.values[c.key])} disabled={readOnly} onChange={e=>onInteractionPatch?.({[c.key]:Number(e.target.value)})}/><output>{String(d.values[c.key])}</output></>}</label>)}
          {!readOnly&&<div className="mg-step-buttons"><button disabled={d.step===0} onClick={()=>onInteractionPatch?.({step:d.step-1})}>上一步</button><button disabled={d.step===d.maxStep} onClick={()=>onInteractionPatch?.({step:d.step+1})}>下一步</button><button onClick={onInteractionReset}>重置</button></div>}
          {readOnly&&<span className="mg-sync-label">课堂同步 · 当前步骤</span>}
        </div>
      </div>:<>
        <div className="mg-prose"><Paragraphs lines={s.body}/>{s.diagram&&<Diagram value={s.diagram}/>} {s.table&&<NativeTable value={s.table}/>}</div>
        {spread&&<Art slide={s}/>}
      </>}
    </section>
    <footer className="mg-footer"><div><span className="mg-public-label">{s.label||'管理学课程组 · 韦笑'}</span>{s.note&&<span>{s.note}</span>}{s.sources.length>0&&<span className="mg-sources">{s.sources.map(ref=><a href={ref.url} key={ref.id} target="_blank" rel="noreferrer">{ref.title} · {ref.period}</a>)}</span>}</div><b>{String(s.localIndex).padStart(2,'0')}<i> / {s.localTotal}</i></b></footer>
  </article></SlideViewport>;
}
