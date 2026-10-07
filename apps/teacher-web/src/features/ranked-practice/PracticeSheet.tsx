import {useId} from 'react';
import katex from 'katex';
import type {PracticeGraph,PracticeOptionId,PracticePack,PracticeResult} from '@edu/contracts';
import 'katex/dist/katex.min.css';
import './practice.css';
export const rankLabels=['','Foundation','Core','Application','Challenge'];
export function PracticeText({text}:{text:string}){
 return <>{text.split(/(\$[^$]+\$)/g).map((part,i)=>part.startsWith('$')&&part.endsWith('$')?<span key={i} className="practice-math" dangerouslySetInnerHTML={{__html:katex.renderToString(part.slice(1,-1).replace(/\u2032/g,"'"),{throwOnError:true,strict:'error',trust:false,output:'htmlAndMathml'})}}/>:<span key={i}>{part}</span>)}</>;
}
export function PracticePlot({graph:g}:{graph:PracticeGraph}){
 const id=useId(),X=(x:number)=>54+(x-g.xMin)/(g.xMax-g.xMin)*484,Y=(y:number)=>230-(y-g.yMin)/(g.yMax-g.yMin)*204;
 const value=(x:number)=>g.coefficients.reduce((sum,c,i)=>sum+c*x**i,0);
 const path=Array.from({length:161},(_,i)=>{const x=g.xMin+(g.xMax-g.xMin)*i/160;return `${i?'L':'M'}${X(x)},${Y(value(x))}`;}).join(' ');
 return <figure className="practice-graph"><svg viewBox="0 0 570 280" role="img" aria-label={g.caption}>
 <defs><clipPath id={id}><rect x="54" y="26" width="484" height="204"/></clipPath></defs>
 {[0,1,2,3,4].map(i=>{const x=g.xMin+(g.xMax-g.xMin)*i/4,y=g.yMin+(g.yMax-g.yMin)*i/4;return <g key={i}><path d={`M${X(x)} 26V230M54 ${Y(y)}H538`} stroke="#d7dfdf"/><text x={X(x)} y="250" textAnchor="middle">{Number(x.toFixed(2))}</text><text x="44" y={Y(y)+5} textAnchor="end">{Number(y.toFixed(2))}</text></g>;})}
 <path clipPath={`url(#${id})`} d={path} fill="none" stroke="#2357d8" strokeWidth="3"/>
 {g.yMin<=0&&g.yMax>=0&&<path d={`M54 ${Y(0)}H538`} stroke="#18232c"/>}
 {g.xMin<=0&&g.xMax>=0&&<path d={`M${X(0)} 26V230`} stroke="#18232c"/>}
 <text x="550" y="270" textAnchor="end">{g.xLabel}</text><text x="15" y="18">{g.yLabel}</text></svg><figcaption>{g.caption}</figcaption></figure>;
}
export function PracticeSheet({pack,choices={},onChoose,locked=true,results=null,pending=[]}:{pack:PracticePack;choices?:Record<string,PracticeOptionId>;onChoose?:(question:string,option:PracticeOptionId)=>void;locked?:boolean;results?:PracticeResult[]|null;pending?:string[]}){
 const name=useId();
 return <div className="practice-sheet" lang="en" data-practice-pack={pack.id}>
 <nav className="practice-ranks" aria-label="Question ranks">{[1,2,3,4].map(r=><a key={r} href={`#${name}-rank-${r}`}>{r} · {rankLabels[r]}{r===4?' (optional)':''}</a>)}</nav>
 {pack.questions.map((q,i)=>{const result=results?.find(r=>r.questionId===q.id),first=i===0||pack.questions[i-1]?.rank!==q.rank;return <article key={q.id} className={`practice-question practice-rank-${q.rank}`} data-question-id={q.id}>
 {first&&<h3 id={`${name}-rank-${q.rank}`} className="practice-rank-heading">Rank {q.rank} · {rankLabels[q.rank]}{q.optional&&<small>Optional</small>}</h3>}
 <header><span className="practice-number">{String(i+1).padStart(2,'0')}</span><p className="practice-stem"><PracticeText text={q.stem}/></p></header>
 {q.graph&&<PracticePlot graph={q.graph}/>}
 <fieldset disabled={locked}><legend className="sr-only">Question {i+1}: choose one answer</legend>{q.options.map(o=><label key={o.id} className={`practice-option ${choices[q.id]===o.id?'is-selected':''}`}>
 <input type="radio" name={`${name}-${q.id}`} value={o.id} checked={choices[q.id]===o.id} onChange={()=>onChoose?.(q.id,o.id)}/><b>{o.id}</b><span><PracticeText text={o.text}/></span></label>)}</fieldset>
 <div className="practice-question-status" role="status">{pending.includes(q.id)?'Saving…':choices[q.id]?'Answer selected':'Not attempted'}{result&&result.status!=='not-attempted'&&` · ${result.status==='correct'?'Correct':'Incorrect'}`}</div>
 <footer>Jacques 9th ed. · §{q.source.section} · {q.source.selection} {q.source.subpart} · p. {q.source.printedPage} / PDF {q.source.pdfPage}<details><summary>Source adaptation</summary><p>{q.source.wordingAdaptation} {q.source.optionAdaptation}</p></details></footer>
 {result&&<section className="practice-solution" aria-label={`Question ${i+1} explanation`}><h4>Answer {result.correctOptionId}</h4><p><PracticeText text={result.solution}/></p>{q.options.map(o=><p key={o.id}><b>{o.id}: </b><PracticeText text={result.optionExplanations[o.id]}/></p>)}</section>}
 </article>;})}</div>;
}
