import {useEffect,useState} from 'react';
import {MANAGEMENT_SCOPE_LABEL,MANAGEMENT_BUILD,MANAGEMENT_LESSONS,MANAGEMENT_SLIDES} from '@edu/course-content/management-principles';
import './teacher-tools.css';
type Mapping={slideKey:string;index:number;documentId:string;originalFile:string;originalPage:number;splitIndex:number;splitTotal:number;modifications:string[];teachingCue:string;sha256:string};
type Disposition={documentId:string;originalFile:string;originalPage:number;disposition:'independent'|'shared'|'omitted';reason:string;targets:{slideKey:string;index:number}[]};
const statusLabel={independent:'独立转换',shared:'重复共用',omitted:'行政安排省略'};
export function ManagementCourseOverview({onStart,busy}:{onStart:(lesson:number)=>void;busy:boolean}){
  return <section className="mg-course-overview" aria-label={`管理学${MANAGEMENT_SCOPE_LABEL}目录`}><h3>管理学课程组 · 韦笑</h3><p>{MANAGEMENT_BUILD.sourcePageCount}个原页归档，{MANAGEMENT_SLIDES.length}个连续网页页面。课程代码、总学时待完善。</p><div>{MANAGEMENT_LESSONS.map(l=><button key={l.number} disabled={busy} onClick={()=>onStart(l.number)}><span>{l.number===0?'绪':String(l.number).padStart(2,'0')}</span><strong>{l.title}</strong><small>{l.slideTotal}页 · 开始授课</small></button>)}</div><p>课堂内可按原文件和原页码定位；不同版本分别保留来源记录。</p></section>;
}
export function ManagementSourceLocator({index,onJump}:{index:number;onJump:(index:number)=>void}){
  const [open,setOpen]=useState(false),[rows,setRows]=useState<Mapping[]>([]),[dispositions,setDispositions]=useState<Disposition[]>([]),[error,setError]=useState(''),[doc,setDoc]=useState('l1'),[page,setPage]=useState(1);
  useEffect(()=>{
    if(!open||rows.length)return;
    let active=true;
    void fetch('/api/courses/management-principles/source-map',{credentials:'include',cache:'no-store'}).then(async r=>{
      if(!r.ok)throw Error(r.status===403?'当前身份无权查看教师来源对照':r.status===401?'请以教师身份进入课堂后查看来源对照':'来源对照读取失败');
      return r.json();
    }).then((data:{mappings:Mapping[];dispositions:Disposition[]})=>{
      if(!active)return;setRows(data.mappings);setDispositions(data.dispositions);
      const current=data.mappings.find(p=>p.index===index);if(current){setDoc(current.documentId);setPage(current.originalPage);}
    }).catch((e:Error)=>{if(active)setError(e.message);});
    return()=>{active=false;};
  },[open,rows.length,index]);
  const docs=[...new Map(dispositions.map(p=>[p.documentId,p.originalFile])).entries()];
  const selected=dispositions.find(p=>p.documentId===doc&&p.originalPage===page),current=rows.find(p=>p.index===index);
  return <aside className="mg-source-locator"><button onClick={()=>setOpen(!open)}>{open?'收起原页对照':'原PPT页码定位'}</button>{open&&<div className="mg-source-panel">
    {error&&<p role="alert">{error}</p>}{!rows.length&&!error&&<p>正在读取教师来源对照…</p>}
    {rows.length>0&&<><label>原文件<select value={doc} onChange={e=>{setDoc(e.target.value);setPage(1);}}>{docs.map(([id,file])=><option key={id} value={id}>{file}</option>)}</select></label>
      <label>原页码<input type="number" min={1} max={Math.max(...dispositions.filter(r=>r.documentId===doc).map(r=>r.originalPage))} value={page} onChange={e=>setPage(Number(e.target.value))}/></label>
      {selected?<><p><strong>{statusLabel[selected.disposition]}</strong> · {selected.reason}</p><div>{selected.targets.map((r,i)=><button key={r.slideKey} onClick={()=>onJump(r.index)}>定位{selected.targets.length>1?` · 对应页 ${i+1}/${selected.targets.length}`:''}</button>)}</div></>:<p>该文件中没有此页</p>}
      {current&&<details><summary>当前页：{current.originalFile} · 原第{current.originalPage}页 · {current.splitIndex}/{current.splitTotal}</summary><p>{current.teachingCue}</p><ul>{current.modifications.map((m,i)=><li key={i}>{m}</li>)}</ul><small>源文件SHA-256：{current.sha256}</small></details>}
    </>}
  </div>}</aside>;
}
