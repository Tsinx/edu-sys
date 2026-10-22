import {useMemo,type ReactNode} from 'react';
import katex from 'katex';
import {Download} from 'lucide-react';
import {PageToolsContribution,usePageToolsScope} from '../classroom/PageTools';
import {getPolicyPage,POLICY_DATA as D,policyTables,policyDescriptions,pf,POLICY_PROJECT_BASE} from '@edu/course-content/statistical-analysis';
import './policy-pages.css';
const ink='#152e3e',teal='#197f7a',amber='#b87921',muted='#71848b';
function Chart({label,children}:{label:string;children:ReactNode}){return <svg className="sap-chart" viewBox="0 0 1424 470" role="img" aria-label={label}><title>{label}</title>{children}</svg>;}
function Cohorts(){const sx=(age:number)=>115+(24-age)/22*1190,sy=(v:number)=>345-(v+1)/2*285;return <Chart label={policyDescriptions.cohorts!}>
 <path d="M115 60V345H1305" fill="none" stroke={muted}/>{[-1,-.5,0,.5,1].map(y=><g key={y}><path d={`M115 ${sy(y)}H1305`} stroke={y===0?muted:'#152e3e18'} strokeDasharray={y===0?'6 5':undefined}/><text x="95" y={sy(y)+7} textAnchor="end">{y}</text></g>)}
 <rect x={sx(6)-20} y="60" width={sx(2)-sx(6)+40} height="285" fill={amber} opacity=".07"/>
 {D.cohorts.map(r=><g key={r.age74}>{r.age74!==12&&<path d={`M${sx(r.age74)} ${sy(r.ci[0]!)}V${sy(r.ci[1]!)}m-6 0h12M${sx(r.age74)-6} ${sy(r.ci[0]!)}h12`} stroke={teal} strokeWidth="2"/>}<circle cx={sx(r.age74)} cy={sy(r.beta)} r={r.age74===12?6:4} fill={r.age74===12?amber:teal}/></g>)}
 {[24,20,16,12,8,6,2].map(age=><text key={age} x={sx(age)} y="383" textAnchor="middle">{age}</text>)}
 <text x="115" y="33">相对12岁基期的高低地区教育差额 / 年</text><text x="1305" y="425" textAnchor="end">1974年年龄（左侧年长 → 右侧年轻）</text>
 <text x={sx(12)} y="456" textAnchor="middle" fill={amber}>12岁：规范化为0</text>
 </Chart>;}
function DidLines({counterfactual=false}:{counterfactual?:boolean}){const c=D.cells,sx=[340,1080],sy=(v:number)=>345-(v-6)/4*270;const hi=[c[2]!.mean,c[3]!.mean],lo=[c[0]!.mean,c[1]!.mean],cf=hi[0]!+lo[1]!-lo[0]!;return <Chart label={policyDescriptions[counterfactual?'counterfactual':'did-lines']!}>
 <path d="M160 75V345H1240" stroke={muted} fill="none"/>{[6,7,8,9,10].map(v=><g key={v}><path d={`M160 ${sy(v)}H1240`} stroke="#152e3e18"/><text x="130" y={sy(v)+8} textAnchor="end">{v}</text></g>)}
 {[hi,lo].map((values,j)=><g key={j}><path d={`M${sx[0]} ${sy(values[0]!)}L${sx[1]} ${sy(values[1]!)}`} stroke={j?teal:amber} strokeWidth="4" fill="none"/>{values.map((v,i)=><g key={i}><circle cx={sx[i]} cy={sy(v)} r="7" fill={j?teal:amber}/><text x={sx[i]!+(i?20:-20)} y={sy(v)+(j?-20:35)} textAnchor={i?'start':'end'}>{i===1?`${j?'低':'高'}强度 `:''}{pf(v)}</text></g>)}</g>)}
 {counterfactual&&<><path d={`M${sx[0]} ${sy(hi[0]!)}L${sx[1]} ${sy(cf)}`} stroke={ink} strokeWidth="3" strokeDasharray="8 7"/><circle cx={sx[1]} cy={sy(cf)} r="10" stroke={ink} fill="none"/><text x="750" y="305">虚线：假设下的反事实</text></>}
 <text x="160" y="35">加权教育均值 / 年（纵轴6—10，聚焦差额）</text><text x="340" y="400" textAnchor="middle">年长：12—17岁</text><text x="1080" y="400" textAnchor="middle">年轻：2—6岁</text><text x="330" y="453" fill={amber}>● 高强度地区</text><text x="760" y="453" fill={teal}>● 低强度地区</text>
 </Chart>;}
function Evidence({id}:{id:string}){const table=policyTables[id];if(table)return <table className="sap-table"><thead><tr>{table.headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{table.rows.map((row,i)=><tr key={i}>{row.map((v,j)=><td key={j}>{v}</td>)}</tr>)}</tbody></table>;
 if(id==='cohorts')return <Cohorts/>;
 if(id==='did-lines'||id==='counterfactual')return <DidLines counterfactual={id==='counterfactual'}/>;
 if(id==='timeline')return <div className="sap-timeline"><section><strong>1973—1978</strong><p>小学建设</p><span>地区建校强度不同</span></section><section><strong>1974</strong><p>队列年龄基准</p><span>2—6岁 / 12—17岁</span></section><section><strong>1995</strong><p>调查记录</p><span>教育与成年工资</span></section></div>;
 if(id==='first-arrow')return <div className="sap-quantity"><div><strong>{pf(D.first.beta)}</strong><span>教育年 / 暴露差异</span></div><p>第一阶段π<br/>95%区间 [{D.first.ci.map(v=>pf(v)).join(', ')}]<br/>n = 31061；290个出生地区</p></div>;
 if(id==='wald')return <div className="sap-ratio"><div><span>简约式ρ</span><strong>{pf(D.reduced.beta,6)}</strong></div><b>÷</b><div><span>第一阶段π</span><strong>{pf(D.first.beta,6)}</strong></div><b>=</b><div><span>2SLS点估计</span><strong>{pf(D.iv.beta,6)}</strong></div></div>;
 if(id==='ar-set')return <div className="sap-ar"><strong>β ∈ ℝ</strong><p>95% AR置信集合：全体实数</p><span>当前简化规格，没有提供有限的信息性回报区间。</span></div>;
 if(id==='dag')return <div className="sap-dag"><div>Z 暴露差异 <b>→</b> S 教育年限 <b>→</b> Y log工资</div><p>家庭与能力 U → S，也 → Y</p><p>待排除的直接通路：Z → Y</p></div>;
 throw new Error(`Unknown policy evidence ${id}`);
}
function Resources({lesson,page}:{lesson:number;page:number}){const key=`stats-l${lesson}-${String(page).padStart(2,'0')}`;const host=usePageToolsScope();const links=useMemo(()=>[
 ['project-12-13.zip','下载完整项目包（Notebook、脚本、字典）'],
 [lesson===12?'01_did.ipynb':'02_iv.ipynb',`下载第${lesson}讲Notebook`],
 ['README.txt','运行说明与课前准备'],['vibe-coding-prompts.txt','跟做提示与核查清单'],
 ],[lesson]);if(!host)return null;return <PageToolsContribution pageKey={key} title="项目材料" audience="local" priority={host.role==='reader'?'primary':'secondary'}><div className="sap-resources"><p>先解压完整项目包；首次运行下载并校验公开数据，随后可断网复算。</p>{links.map(([file,label])=><a key={file} href={`${POLICY_PROJECT_BASE}/${file}`} download><Download size={17}/>{label}</a>)}<small>Python在自己的电脑或Notebook环境中运行；网页不执行统计拟合。</small></div></PageToolsContribution>;}
export function PolicyPageView({lesson,page}:{lesson:number;page:number}){const p=getPolicyPage(lesson,page)!;const tools=<Resources lesson={lesson} page={page}/>;
 if(page===1)return <>{tools}<div className="sap-cover"><span>INPRES / INDONESIA / 1995 SUPAS</span><h1>{lesson===12?<>多建一所学校，<br/>会改变什么</>:<>教育多一年，<br/>工资会怎样</>}</h1><p>{p.lead}</p><div>同一真实资料 · 逐步完成 Python 项目</div></div></>;
 return <>{tools}<div className={`sap-page ${p.formula?'sap-page--formula':''} ${p.code?'sap-page--code':''}`}>
 {p.formula&&<div className="sap-formula" dangerouslySetInnerHTML={{__html:katex.renderToString(p.formula,{displayMode:true,throwOnError:true})}}/>}
 <div className="sap-evidence">{p.visual?<Evidence id={p.visual}/>:p.code?<><pre aria-label="Python代码"><code>{p.code}</code></pre>{p.text.length>0&&<aside>{p.text.map(s=><p key={s}>{s}</p>)}</aside>}</>:<div className="sap-statements">{p.text.map((s,i)=><p key={s}><span>{String(i+1).padStart(2,'0')}</span>{s}</p>)}</div>}</div>
 <p className="sa-caption">{p.caption}</p></div></>;
}
