import katex from 'katex';
import { REGRESSION_DATA, regressionLessons, type RegressionPage } from '@edu/course-content/statistical-analysis';
import './regression-pages.css';

type Series={label:string;kind:string;color:string;values:number[][]};
type Chart={xlabel:string;ylabel:string;series:Series[];xmin?:number;xmax?:number;ymin?:number;ymax?:number;xticks?:number[];bands?:{x:number[];lo:number[];hi:number[];label:string}[];intervals?:{x:number;lo:number;hi:number}[]};
const colors:Record<string,string>={teal:'#197f7a',amber:'#b87921',ink:'#152e3e',red:'#ad5346'};
const charts=REGRESSION_DATA.plots as Record<string,Chart>;
const tables=REGRESSION_DATA.tables as Record<string,{headers:string[];rows:(string|number)[][]}>;
const f=(n:number)=>Math.abs(n)>=1000?Math.round(n).toLocaleString('en-US'):Number(n.toPrecision(3)).toString();
function ChartView({chart}:{chart:Chart}) {
 const xs=chart.series.flatMap(s=>s.values.map(v=>v[0]!)),ys=chart.series.flatMap(s=>s.values.map(v=>v[1]!));
 for(const b of chart.bands??[])ys.push(...b.lo,...b.hi);
 for(const c of chart.intervals??[])ys.push(c.lo,c.hi);
 const extent=(v:number[],lo?:number,hi?:number)=>{const a=lo??Math.min(...v),b=hi??Math.max(...v),span=b-a||1,unit=10**Math.floor(Math.log10(span/4)),step=[1,2,2.5,5,10].map(n=>n*unit).find(n=>n>=span/4)??10*unit;return [lo??Math.floor((a-span*.025)/step)*step,hi??Math.ceil((b+span*.025)/step)*step] as const;};
 const [xmin,xmax]=extent(xs,chart.xmin,chart.xmax),[ymin,ymax]=extent(ys,chart.ymin,chart.ymax);
 const sx=(x:number)=>112+(x-xmin)/(xmax-xmin)*915,sy=(y:number)=>420-(y-ymin)/(ymax-ymin)*255;
 const path=(v:number[][])=>v.map((p,i)=>`${i?'L':'M'}${sx(p[0]!)} ${sy(p[1]!)}`).join(' ');
 const ticks=(a:number,b:number)=>Array.from({length:5},(_,i)=>a+(b-a)*i/4);
 return <svg className="sar-chart" viewBox="0 0 1100 560" role="img" aria-label={`${chart.xlabel}与${chart.ylabel}：${chart.series.map(s=>s.label).join('、')}`}>
  <text x="20" y="117" className="sar-axis-title">{chart.ylabel}</text>
  {ticks(ymin,ymax).map(v=><g key={v}><path d={`M112 ${sy(v)}H1027`} stroke="#152e3e" opacity=".1"/><text x="98" y={sy(v)+7} textAnchor="end">{f(v)}</text></g>)}
  {(chart.xticks??ticks(xmin,xmax)).map(v=><g key={v}><path d={`M${sx(v)} 420v7`} stroke="#65767c"/><text x={sx(v)} y="466" textAnchor="middle">{f(v)}</text></g>)}
  <path d="M112 165V420H1027" fill="none" stroke="#65767c"/>
  <text x="570" y="535" textAnchor="middle" className="sar-axis-title">{chart.xlabel}</text>
  {(chart.bands??[]).map((b,j)=><path key={j} d={`${path(b.x.map((x,i)=>[x,b.lo[i]!]))} ${b.x.map((x,i)=>[x,b.hi[i]!]).reverse().map(p=>`L${sx(p[0]!)} ${sy(p[1]!)}`).join(' ')}Z`} fill={colors.amber} opacity=".17"/>)}
  {chart.series.map((s,j)=><g key={j}>{s.kind==='line'?<path d={path(s.values)} stroke={colors[s.color]} strokeWidth="3.5" strokeDasharray={s.color==='ink'?'8 6':undefined} fill="none"/>:s.values.map((v,i)=><circle key={i} cx={sx(v[0]!)} cy={sy(v[1]!)} r={s.values.length>100?3.8:5} fill={colors[s.color]} opacity={s.values.length>100?.4:.78}/>)}</g>)}
  {(chart.intervals??[]).map((c,j)=><path key={j} d={`M${sx(c.x)} ${sy(c.lo)}V${sy(c.hi)}m-8 0h16M${sx(c.x)-8} ${sy(c.lo)}h16`} stroke={colors.amber} strokeWidth="3"/>)}
  {chart.series.filter(s=>s.kind==='line'||chart.series.length<5).map((s,i)=><g key={i} transform={`translate(${120+(i%2)*465} ${20+Math.floor(i/2)*45})`}><path d="M0 0h26" stroke={colors[s.color]} strokeWidth="4"/><text x="36" y="7">{s.label}</text></g>)}
 </svg>;
}
function Evidence({id,focusRows,focusColumns}:{id:string;focusRows?:number[];focusColumns?:number[]}) {
 const chart=charts[id];if(chart)return <ChartView chart={chart}/>;
 const t=tables[id==='collinear-table'?'collinear':id];
 if(!t)throw new Error(`Missing regression evidence: ${id}`);
 return <table className="sar-table"><thead><tr>{t.headers.map((h,j)=><th key={h} className={focusColumns?.includes(j)?'sar-focus-cell':undefined}>{h}</th>)}</tr></thead><tbody>{t.rows.map((r,i)=><tr key={i} className={focusRows?.includes(i)?'sar-focus-row':undefined}>{r.map((c,j)=><td key={j} className={focusColumns?.includes(j)?'sar-focus-cell':undefined}>{c}</td>)}</tr>)}</tbody></table>;
}
function Formula({value}:{value:string}) {return <div className="sar-formula" dangerouslySetInnerHTML={{__html:katex.renderToString(value,{displayMode:true,throwOnError:true})}}/>;}
export function RegressionPageView({lesson,page}:{lesson:number;page:number}) {
 const p=regressionLessons[lesson-3]![page-1]!;
 const image=p.image?`/course-assets/statistical-analysis/images/${p.image}.png`:undefined;
 if(page===1)return <><img className="sa-art sa-art--bleed" src={image} alt="原创教学情境配图"/><div className="sa-cover-shade"/><div className="sa-cover-copy"><span>STATISTICAL ANALYSIS METHODS</span><h1>{p.title}</h1><p>{p.lead}</p><div>{String(lesson).padStart(2,'0')} <i/> {p.caption}</div></div></>;
 return <div className={`sar-page ${p.visual?'sar-page--evidence':'sar-page--concept'} ${p.second?'sar-page--pair':''} ${p.formula?'sar-page--formula':''}`}>
  {image&&<img className={`sar-art ${p.visual?'sar-art--accent':''}`} src={image} alt="AI生成教学情境配图"/>}
  <div className="sar-content">
   {p.formula&&<Formula value={p.formula}/>}
   {p.second?<div className="sar-pair"><Evidence id={p.visual!}/><Evidence id={p.second}/></div>:p.visual?<div className={p.text.length?'sar-with-aside':'sar-figure'}><Evidence id={p.visual} focusRows={p.focusRows} focusColumns={p.focusColumns}/>{p.text.length>0&&<div className="sar-aside">{p.text.map(t=><p key={t}>{t}</p>)}</div>}</div>:<div className="sar-statements">{p.text.map((t,i)=><p key={t}><span>{String(i+1).padStart(2,'0')}</span>{t}</p>)}</div>}
  </div>
  <p className="sa-caption">{p.caption}</p>
 </div>;
}
export function regressionPageSpec(lesson:number,page:number):RegressionPage|undefined{return regressionLessons[lesson-3]?.[page-1];}
