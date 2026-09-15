import type { CSSProperties, ReactNode } from 'react';
import type { SlideFrame } from '@edu/contracts';
import { getStatisticalAnalysisSlide, STATISTICAL_ANALYSIS_DATA as D, type StatisticalAnalysisSlide as SlideSpec } from '@edu/course-content/statistical-analysis';
import { SlideViewport } from '../classroom/SlideViewport';
import { Anscombe, BadChart, Difference, Groups, Histogram, RawStrip, Sampling, Scatter, Composition, TimeSeries, ErrorBars, Heatmap, Plot, Axis, fmt, amber, teal, ink } from './charts';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import './statistical-analysis.css';

const ROOT='/course-assets/statistical-analysis/images/';
function Art({id,style,mode='window'}:{id:string;style?:CSSProperties;mode?:string}) {return <img className={`sa-art sa-art--${mode}`} src={`${ROOT}${id}.png`} alt="教学情境原创配图" draggable={false} style={style}/>;}
function MathText({s}:{s:string}) {return <div className="sa-math" dangerouslySetInnerHTML={{__html:katex.renderToString(s,{throwOnError:true,displayMode:true})}}/>;}
function Note({children}:{children:ReactNode}) {return <p className="sa-caption">{children}</p>;}
function Big({children,style}:{children:ReactNode;style?:CSSProperties}) {return <div className="sa-big" style={style}>{children}</div>;}
function Words({children,style}:{children:ReactNode;style?:CSSProperties}) {return <div className="sa-words" style={style}>{children}</div>;}
function Table({headers,rows}:{headers:string[];rows:(string|number)[][]}) {return <table className="sa-table"><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i}>{r.map((v,j)=><td key={j}>{v}</td>)}</tr>)}</tbody></table>;}
function Means() {return <div className="sa-means"><div><span>会员</span><strong>650</strong><small>元/人/月 · n=240</small></div><i>vs.</i><div><span>非会员</span><strong>500</strong><small>元/人/月 · n=240</small></div></div>;}
function Receipt() {return <><Art id="l1-05-receipts" mode="cutout" style={{left:-120,top:90,width:770,height:500,opacity:.7}}/><div className="sa-receipt-records"><span>聚合演示 · C示例01 · 同一观察月</span><p>订单 A <b>120</b></p><p>订单 B <b>180</b></p><p>订单 C <b>200</b></p></div><div className="sa-sum"><span>顾客月消费</span><strong>500<small>元</small></strong><p>一位顾客，仅贡献一行</p></div><svg className="sa-arrow" viewBox="0 0 420 150" aria-hidden="true"><path d="M10 75H370m-30-25 30 25-30 25" fill="none" stroke={amber} strokeWidth="3"/></svg></>;}
function MainContent({s}:{s:SlideSpec}):ReactNode {
 const p=s.localIndex;
 if(s.lesson===1) switch(p) {
  case 1:return <><Art id="l1-01-retail-night" mode="bleed"/><div className="sa-cover-shade"/><div className="sa-cover-copy"><span>STATISTICAL ANALYSIS METHODS</span><h1>从研究问题<br/>到统计证据</h1><p>统计分析方法 · 商科研究生</p><div>01 <i/> 一项会员决策，需要怎样的证据？</div></div></>;
  case 3:return <><Art id="l1-02-customer-choice" mode="strip"/><Means/><Note>同一观察月 · 两城顾客样本 · 金额口径一致</Note></>;
  case 19:return <><Receipt/><Note>订单表 → 按顾客与月份汇总 → 顾客月表 → 组间比较</Note></>;
  case 37:return <><div className="sa-figure-left"><Sampling coverage/></div><Words style={{left:1030,top:70,width:350}}><strong className="sa-number">{D.sampling.covered}/100</strong><p>本次模拟实际覆盖</p><hr/><p>95%是方法的名义覆盖率。</p><p>100次的实现比例<br/>可以高于或低于95%。</p></Words><Note>琥珀虚线：固定 μ=500；蓝绿：覆盖；砖红：未覆盖。正态总体，已知σ，n=25。</Note></>;
  default:return <LessonOnePage page={p}/>;
 }
 switch(p) {
  case 3:return <><Anscombe/><Note>四图统一尺度：x∈[0,20]，y∈[0,15]；灰线均为近似参考线 y=3+0.5x。</Note></>;
  case 45:return <><div className="sa-bad-label">错误示例</div><BadChart/><Note>待核查：因果标题、纵轴基线、数据分布、城市构成与估计精度。</Note></>;
  default:return <LessonTwoPage page={p}/>;
 }
}
function LessonOnePage({page}:{page:number}):ReactNode {
 const m=D.groups[0]!,n=D.groups[1]!;
 switch(page){
  case 2:return <><Art id="l1-03-checkout" mode="window" style={{width:860,opacity:.8}}/><Big style={{maxWidth:900}}>“会员月均消费650元，<br/>非会员500元，<br/>所以会员制<em>让</em>消费<br/>提高了30%。”</Big><Note>待核查的商业表述 · 算术、统计与解释分别成立吗？</Note></>;
  case 4:return <><Art id="l1-04-member-card" mode="cutout" style={{width:610,top:35,opacity:.75}}/><div style={{width:850,paddingTop:60}}><MathText s={'\\frac{650-500}{500}=0.30=30\\%'} /><Words style={{top:275,width:800}}><p>差额：<strong>150元</strong></p><p>基准：<strong>非会员均值500元</strong></p></Words></div><Note>30%是相对均值差。计算成立，还需要检查比较的口径与解释。</Note></>;
  case 5:return <><Art id="l1-08-research-desk" mode="strip"/><div className="sa-flow"><span>问题</span><i>→</i><span>测量</span><i>→</i><span>数据</span><i>→</i><span>估计</span><i>→</i><span>解释</span></div><Words style={{top:355,width:1200}}><p>每一环，都决定最后一句话能说到哪里。</p></Words><Note>从“会员制有效”回到可以观察、比较和复核的研究对象。</Note></>;
  case 6:return <><Art id="l1-07-city-overhead" mode="circle"/><Words style={{top:25,width:770}}><p><strong>对象</strong>　两城目标顾客</p><p><strong>时间</strong>　同一观察月</p><p><strong>比较</strong>　会员与非会员</p><p><strong>指标</strong>　顾客月消费额</p><p><strong>范围</strong>　样本描述，或有条件的总体推断</p></Words><Note>把研究对象、观察窗口和比较量写进问题。</Note></>;
  case 7:return <><Art id="l1-06-customer-portrait" mode="cutout" style={{right:-40,width:490,height:630,top:-50}}/><Big style={{fontSize:94}}>观察月中，<br/>两组各消费多少？</Big><Words style={{top:365,width:900}}><p>描述性问题 → 均值、中位数、分布、样本量</p></Words><Note>样本均值是对已观察记录的概括。</Note></>;
  case 8:return <><div className="sa-flow"><span>会员身份</span><i>↔</i><span>月消费</span></div><MathText s={'E(Y\\mid M=1)-E(Y\\mid M=0)'}/><Note>这是条件均值的比较；观察到身份与消费一起变化，尚不能确定改变身份的作用。</Note></>;
  case 9:return <><Art id="l1-09-observation-window" mode="window"/><Words style={{top:35,width:830}}><p className="sa-kicker">信息边界：预测发生的那一刻</p><p>过去的消费、到店记录<br/>↓<br/><strong>预测下月消费</strong><br/>↓<br/>用尚未参与拟合的数据评价误差</p></Words><Note>不能把未来才知道的信息放进今天的预测变量。</Note></>;
  case 10:return <><Art id="l1-06-customer-portrait" mode="cutout" style={{left:430,top:-65,width:600,height:570}}/><Words style={{left:50,top:115,width:420}}><p>成为会员</p><MathText s={'Y_i(1)'}/><p>一种可能结果</p></Words><Words style={{left:1010,top:115,width:390}}><p>不成为会员</p><MathText s={'Y_i(0)'}/><p>另一种可能结果</p></Words><Note>同一位顾客、同一时点：通常只能观察一种状态下的结果；另一种是反事实。</Note></>;
  case 11:return <><Art id="l1-04-member-card" mode="cutout" style={{width:500,top:75,opacity:.7}}/><Words style={{width:830,top:40}}><p className="sa-kicker">概念 → 操作化</p><p>“消费行为”<br/>↓<br/><strong>观察月内，净交易金额的顾客级合计</strong></p><p>明确退款、时间、币种与覆盖范围。</p></Words><Note>月消费额不是消费能力的全部，也不是满意度本身。</Note></>;
  case 12:return <><Table headers={['变量','类型','可用的描述']} rows={[["会员身份","名义类别","人数、比例"],["满意度1—5级（示例）","有序类别","各等级比例、中位等级"],["月消费额","数值变量","均值、中位数、分布"],["到店次数","离散数值","计数分布、均值"]]}/><Note>数码标签不自动具有等距性质；图形和统计量需尊重测量尺度。</Note></>;
  case 13:return <><Art id="l1-05-receipts" mode="cutout" style={{right:-60,opacity:.3}}/><div style={{width:1120}}><Table headers={['订单编号','顾客编号','月份','金额/元']} rows={[["A","C示例01","观察月",120],["B","C示例01","观察月",180],["C","C示例01","观察月",200]]}/></div><Note>示意账本 · 三行订单，却只有一位顾客。订单数不等于顾客数。</Note></>;
  case 14:return <><Art id="l1-06-customer-portrait" mode="cutout" style={{width:450,right:-40}}/><div style={{width:1000,paddingTop:80}}><Table headers={['顾客编号','观察月消费/元','订单笔数']} rows={[["C示例01",500,3]]}/><MathText s={'Y_{i,t}=\\sum_{j\\in\\text{该顾客当月订单}} A_j'}/></div><Note>一行对应顾客×月，再以顾客为单位进行组间比较。</Note></>;
  case 15:return <><Table headers={['顾客','1月/元','2月/元','3月/元']} rows={[["C示例01",500,420,610],["C示例02",380,450,400],["C示例03",720,690,740]]}/><Words style={{top:430,width:1300}}><p>同一编号在不同月份反复出现 → 观测可能相关。</p></Words><Note>面板结构示意，非主样本后续追踪。标准误与模型需考虑数据结构。</Note></>;
  case 16:return <><TimeSeries metric="total"/><Note>独立口径示例：品牌全量月报24个月。一行变成一个月，个人差异被汇总。</Note></>;
  case 17:return <><Art id="l1-10-crowd" mode="window" style={{width:720}}/><Plot label="总体、抽样框、样本的概念范围"><rect x="70" y="40" width="720" height="410" rx="210" fill={teal} opacity=".09"/><rect x="150" y="130" width="570" height="260" rx="130" fill={teal} opacity=".13"/><rect x="280" y="225" width="270" height="120" rx="60" fill={amber} opacity=".3"/><text x="335" y="95">目标总体</text><text x="310" y="180">抽样框：可联系名单</text><text x="330" y="295">实际样本</text></Plot><Note>范围示意 · 覆盖不足、拒访与失访都可能改变实际进入数据的人。</Note></>;
  case 18:return <><Art id="l1-09-observation-window" mode="window"/><Art id="l1-11-glass-frame" mode="cutout" style={{right:-10,top:0,width:530,opacity:.6}}/><Words style={{top:65,width:820}}><p>只在周末到店时访问<br/>→ 工作日顾客可能被遗漏</p><p>只从高活跃名单联系<br/>→ 低活跃顾客可能被遗漏</p><p><strong>先说明抽样机制，再讨论推广范围。</strong></p></Words><Note>窗口中的人，不自动代表窗口之外的人。</Note></>;
  case 20:return <><Art id="l1-03-checkout" mode="window" style={{opacity:.55}}/><Big style={{fontSize:180,color:teal}}>0</Big><Words style={{left:360,top:145,width:720}}><p>已经完整观察一个月。</p><p>确认没有消费。</p><p><strong>零，是一个已知的数值。</strong></p></Words><Note>示意记录 · 仅有“没有交易行”不足以证明整个观察窗口消费为零。</Note></>;
  case 21:return <><Big style={{fontSize:165,color:amber}}>NA</Big><Words style={{left:430,top:125,width:870}}><p>信息缺失，金额未知。</p><p>把NA改成0，会改变均值。</p><p>排除缺失后，分母与样本构成也会改变。</p></Words><Note>记录缺失原因、处理方式与有效样本量；按研究设计评估缺失机制。</Note></>;
  case 22:return <><Table headers={['记录迹象（示意）','先核查什么','可能的处理']} rows={[["订单A被导入两次","唯一键、时间、来源","确认重复后去重"],["金额远高于多数记录","原始凭证、业务背景","保留真实大额交易"],["同一人多笔交易","是否不同订单","按观察单位正确汇总"]]}/><Note>极端值可以是真实信息。清理规则要有依据、保留记录并可复核。</Note></>;
  case 23:return <><div className="sa-two"><div><h2>会员 · 右偏分布</h2><Groups/></div><div style={{paddingTop:35}}><Table headers={['统计量','会员','非会员']} rows={[["均值",fmt(m.mean),fmt(n.mean)],["中位数",fmt(m.median),fmt(n.median)]]}/><p className="sa-report" style={{fontSize:26,marginTop:35}}>高额消费使均值向长尾方向移动。中位数定位排序后的中间位置。</p></div></div><Note>单位：元/人/月。图中仍展示两组全部原始点。</Note></>;
  case 24:return <><Groups/><Words style={{top:455,width:1400,fontSize:28}}><p>会员SD {fmt(m.sd)}元　／　非会员SD {fmt(n.sd)}元</p></Words><Note>标准差与原变量同单位；它描述个体差异，不是均值的精度。</Note></>;
  case 25:return <><div className="sa-means"><div><span>绝对均值差</span><strong>150<small> 元</small></strong><small>650 − 500</small></div><i>／</i><div><span>相对非会员均值</span><strong>30<small> %</small></strong><small>150 ÷ 500</small></div></div><Note>同时报告比较方向、单位和基准；这里是观察到的均值差。</Note></>;
  case 26:return <><Art id="l1-10-crowd" mode="window"/><Words style={{top:45,width:820}}><p className="sa-kicker">独立的抽样概念模型</p><MathText s={'X\\sim N(500,180^2)'}/><p>每次独立抽取25个观测。<br/>总体均值500元保持不变。</p><p>每次得到一个新的样本均值。</p></Words><Note>此处用已知总体演示抽样；不是对主案例480位顾客重新抽样。</Note></>;
  case 27:return <><RawStrip values={D.sampling.firstSample} reference max={1200}/><Note>第一次抽样 · n=25 · 每个点是一项观测；实线为样本均值，虚线为总体均值。</Note></>;
  case 28:return <><RawStrip values={D.sampling.secondSample} reference max={1200}/><Note>第二次独立抽样 · 总体与样本量相同，具体观测和均值发生变化。</Note></>;
  case 29:return <><Sampling/><Note>100个点 = 100次样本的均值。纵向排布仅用于避让，不代表第二个变量。</Note></>;
  case 30:return <><div className="sa-two"><div><h2>样本分布：一个点是一项观测</h2><RawStrip values={D.sampling.firstSample} reference max={1200}/></div><div><h2>抽样分布：一个点是一个均值</h2><Sampling/></div></div><Note>横轴范围不同，须按刻度比较。两者都以元计量，却对应不同的变异来源。</Note></>;
  case 31:return <><div className="sa-two"><div><h2>标准差 SD</h2><Big style={{fontSize:115,paddingTop:70}}>180<span style={{fontSize:28}}> 元</span></Big><Words style={{top:300,width:560}}><p>单项观测的离散程度</p></Words></div><div><h2>标准误 SE</h2><MathText s={'SE(\\bar X)=\\frac{\\sigma}{\\sqrt{n}}=\\frac{180}{5}=36'}/><p style={{fontSize:29,marginTop:60}}>重复抽样时，均值的标准差</p></div></div><Note>独立同分布且方差有限的均值模型；σ未知时通常以样本SD估计。</Note></>;
  case 32:return <><div className="sa-two"><div><h2>n=25 · SE=36元</h2><Sampling/></div><div><h2>n=100 · SE=18元</h2><Sampling large/></div></div><Note>两图横轴同为350—650元。样本量增加四倍，标准误约减半。</Note></>;
  case 33:return <><Plot label="概念示意：偏差与精度不同"><path d="M540 30V470" stroke={amber} strokeWidth="3" strokeDasharray="10 7"/><text x="550" y="45">目标参数</text>{Array.from({length:70},(_,i)=><circle key={i} cx={790+Math.sin(i*3)*25} cy={110+i%25*12} r="5" fill={teal} opacity=".6"/>)}<path d="M550 440H790" stroke={ink} strokeWidth="2"/><text x="650" y="485" textAnchor="middle">偏差</text><text x="825" y="130">结果集中，但中心偏移</text><text x="180" y="210" fontSize="40">样本变大</text><text x="180" y="275" fontSize="40">不修复选择机制</text></Plot><Note>概念示意，无数值刻度；抽样偏差与随机误差需要不同的解决办法。</Note></>;
  case 34:return <><Difference/><Note>回到主案例：均值差150.0元；Welch 95%置信区间 [86.3, 213.7] 元。</Note></>;
  case 35:return <><MathText s={'\\widehat\\theta\\ \\pm\\ c_{.975}\\,SE(\\widehat\\theta)'}/><div className="sa-two" style={{marginTop:80}}><div><h2>已知σ的正态均值</h2><MathText s={'\\bar X\\pm1.96\\,\\sigma/\\sqrt n'}/></div><div><h2>两个独立均值之差</h2><MathText s={'(\\bar Y_1-\\bar Y_0)\\pm t_{.975,\\nu}\\,SE_{\\Delta}'}/></div></div><Note>主案例用Welch自由度ν≈465.7与差值SE≈32.39；不同模型不能照搬同一误差线。</Note></>;
  case 36:return <><Art id="l1-11-glass-frame" mode="cutout" style={{width:800,opacity:.2}}/><Big style={{fontSize:70,paddingTop:75}}>固定的是<em>总体参数</em>。<br/>变化的是抽到的样本，<br/>以及由样本构造的<em>区间</em>。</Big><Note>重复同一抽样与计算程序，长期约95%的区间覆盖固定参数。</Note></>;
  case 38:return <><div className="sa-figure-left"><Sampling coverage one/></div><Words style={{left:1010,top:120,width:380}}><p>区间已经实现。</p><p>参数也固定。</p><p><strong>覆盖或未覆盖，<br/>是一个事实。</strong></p></Words><Note>95%不表示这个区间包含95%的个体，也不表示固定参数在该区间内的概率。</Note></>;
  case 39:return <><Art id="l1-12-evidence-papers" mode="window" style={{opacity:.4}}/><MathText s={String.raw`H_0:\ \mu_1-\mu_0=0`}/><MathText s={String.raw`H_1:\ \mu_1-\mu_0\ne0`}/><Words style={{top:305,width:880}}><p>比较目标：<strong>两个组的总体均值</strong></p><p>采用双侧检验；先明确抽样与误差模型。</p></Words><Note>零均值差假设，不要求每个人消费相等。</Note></>;
  case 40:return <><NullCurve/><Note>双侧Welch检验：p=P(|T|≥|4.631| | H₀及模型假设)≈0.00000473。</Note></>;
  case 41:return <><Big style={{fontSize:77,paddingTop:25}}>p值很小，<br/>不能推出效应很大，<br/>也不能推出<em>因果成立</em>。</Big><Words style={{top:405,width:1300,fontSize:29}}><p>报告效应大小、区间、设计与分析过程；结论不只取决于0.05。</p></Words><Note>解释原则：ASA关于统计显著性与p值的声明（2016）。</Note></>;
  case 42:return <><Table headers={['组别','n','均值/元','SD/元']} rows={[["会员",240,650,fmt(m.sd)],["非会员",240,500,fmt(n.sd)]]}/><div style={{fontSize:28,marginTop:45,lineHeight:1.9}}>差值=150.0元　SE=32.39　t=4.631　df≈465.71<br/><strong>95% CI [86.3, 213.7] 元；双侧 p≈4.73×10⁻⁶。</strong></div><Note>独立组、适当抽样与均值推断模型下成立；未随机分配会员身份。</Note></>;
  case 43:return <><AnovaPlot/><Note>独立三店教学样本，各30人。F={fmt(D.anova.f,3)}，p={fmt(D.anova.p,4)}；经典单因素ANOVA。</Note></>;
  case 44:return <><MathText s={'F=\\frac{MS_{\\mathrm{between}}}{MS_{\\mathrm{within}}}'}/><Words style={{top:220,width:1320}}><p>总体检验显著 → 有证据反对“所有总体均值相等”。</p><p><strong>哪些组不同？</strong> → 预设比较或控制多重性的事后比较。</p><p>检查独立性、误差分布与方差条件；异方差可考虑Welch ANOVA。</p></Words><Note>总体ANOVA不能替代每一对的比较结果。</Note></>;
  case 45:return <><Art id="l1-04-member-card" mode="cutout" style={{width:650,top:10}}/><Big style={{fontSize:110}}>150元</Big><Words style={{top:290,width:850}}><p>消费差额 ≠ 净利润</p><p>成本、毛利、持续性与可行动性，仍待评估。</p></Words><Note>统计显著性与商业重要性分别判断。</Note></>;
  case 46:return <><Art id="l1-02-customer-choice" mode="window"/><Words style={{top:35,width:860,fontSize:36}}><p>原句：会员制<strong>让</strong>消费提高30%。</p><hr/><p>修订：样本中，会员月均消费<strong>比非会员高30%</strong>。</p><p style={{fontSize:28}}>自选择、城市、收入及既有消费习惯等，可能影响比较。</p></Words><Note>观察性组间差异不能直接识别会员制度的因果效应。</Note></>;
  case 47:return <><div style={{width:690,position:'absolute',left:0,top:30}}><Difference/></div><div className="sa-report" style={{position:'absolute',left:740,top:20,width:680,fontSize:27}}>在观察月的两城教学样本中，会员与非会员各240人，月均消费分别为650元与500元。<strong>均值差150元，相对差30%</strong>。在独立抽样及Welch均值推断模型下，差值95% CI为[86.3, 213.7]元，双侧p≈4.73×10⁻⁶。<br/><br/>会员身份未随机分配；该结果反映样本中的组间差异，<strong>不能据此断言会员制造成消费提高</strong>。</div><Note>报告顺序：对象与指标 → 量级与精度 → 方法与条件 → 解释边界。</Note></>;
  case 48:return <><Art id="l1-08-research-desk" mode="window"/><Big style={{fontSize:88}}>如果只看两个均值，<br/>我们会错过什么？</Big><Words style={{top:355,width:970}}><p>数据点的形状，可能改变我们的判断。</p></Words><Note>下一讲：先让数据结构显现，再决定如何分析。</Note></>;
  default:throw new Error(`Missing authored lecture 1 page ${page}`);
 }
}
function NullCurve(){const sx=(v:number)=>100+(v+6)/12*1000,sy=(v:number)=>420-v*800;return <Plot label="零假设下Welch近似t分布及双侧尾部"><path d="M100 420H1100" stroke="#7c8589"/>{[-6,-4,-2,0,2,4,6].map(v=><text key={v} x={sx(v)} y="465" textAnchor="middle">{v}</text>)}<path d={D.nullCurve.map((r,i)=>`${i?'L':'M'}${sx(r.x)} ${sy(r.density)}`).join(' ')} fill="none" stroke={teal} strokeWidth="4"/>{[-D.welch.t,D.welch.t].map(v=><g key={v}><path d={`M${sx(v)} 175V420`} stroke={amber} strokeDasharray="7 6"/><text x={sx(v)} y="155" textAnchor="middle">{fmt(v,3)}</text></g>)}<text x="600" y="65" textAnchor="middle">假定H₀及模型成立 · t分布，自由度≈465.7</text><text x="600" y="345" textAnchor="middle">两侧至少同样极端的尾部面积之和 = p</text><text x="1090" y="510" textAnchor="end">检验统计量 t</text></Plot>;}
function AnovaPlot(){return <Plot label="独立三店的消费点图与组均值"><Axis max={1000} step={200} label="消费金额（元）"/>{D.anova.values.map((a,g)=><g key={g}><text x="90" y={60+g*125}>门店{g+1} · n=30</text>{a.map((v,i)=><circle key={i} cx={90+v/1000*990} cy={95+g*125+(i%5-2)*10} r="5" fill={teal} opacity=".6"/>)}<path d={`M${90+D.anova.groups[g]!.mean/1000*990} ${65+g*125}v60`} stroke={amber} strokeWidth="4"/></g>)}</Plot>;}
function LessonTwoPage({page}:{page:number}):ReactNode {
 switch(page){
  case 1:return <><Art id="l2-01-prism-city" mode="bleed"/><div className="sa-cover-shade"/><div className="sa-cover-copy"><span>EXPLORATORY DATA ANALYSIS</span><h1>让重要结构<br/>显现出来</h1><p>探索性数据分析与科研可视化</p><div>02 <i/> 同一批数据，还有哪些尚未看见的结构？</div></div></>;
  case 2:return <><Art id="l2-02-lens" mode="cutout" style={{right:-85,top:180,width:500,opacity:.16}}/><Table headers={['数据组','n','x均值','y均值','Pearson r']} rows={D.anscombe.map((s,i)=>[['Ⅰ','Ⅱ','Ⅲ','Ⅳ'][i]!,11,fmt(s.meanX,2),fmt(s.meanY,2),fmt(s.r,3)])}/><Note>摘要按显示精度舍入；原始记录与形态尚未展示。</Note></>;
  case 4:return <><Anscombe labels/><Note>第一组近似线性；第二组弯曲；第三组有异常y值；第四组斜率受高杠杆点强烈影响。</Note></>;
  case 5:return <><div style={{width:900}}><Anscombe which={2}/></div><Words style={{left:965,top:100,width:420}}><p>均值、方差与相关系数<br/>都不能完整描述形态。</p><hr/><p><strong>原始点先于模型诊断。</strong></p></Words><Note>Anscombe第二组：直线摘要掩盖弯曲关系。</Note></>;
  case 6:return <><Art id="l2-03-objects" mode="window" style={{width:500,opacity:.35}}/><div className="sa-tasks"><div><b>01</b><strong>分布</strong><span>数值集中在哪里？</span></div><div><b>02</b><strong>比较</strong><span>哪些组更高？</span></div><div><b>03</b><strong>构成</strong><span>整体由什么组成？</span></div><div><b>04</b><strong>关系</strong><span>变量如何一起变化？</span></div><div><b>05</b><strong>时间</strong><span>变化按何种顺序发生？</span></div><div><b>06</b><strong>不确定性</strong><span>估计有多精确？</span></div></div><Note>根据Wilke的图形分类组织；先确定研究任务，再选图形。</Note></>;
  case 7:return <><RawStrip mean={false}/><Note>480位顾客全部保留。纵向抖动仅为避免重叠，不代表第二个变量。</Note></>;
  case 8:return <><Histogram/><Note>箱宽200元，区间左闭右开；人数之和为480。连续数值区间的柱彼此相邻。</Note></>;
  case 9:return <><div className="sa-two"><div><h2>箱宽100元</h2><Histogram bin={100}/></div><div><h2>箱宽300元</h2><Histogram bin={300}/></div></div><Note>同一批数据，共用横纵轴范围。细分突出局部波动，粗分隐藏细节。</Note></>;
  case 10:return <><Histogram/><Words style={{left:900,top:40,width:430,fontSize:29}}><p><strong>均值：575.0元</strong></p><p>中位数：{fmt([...D.people.map(p=>p.spend)].sort((a,b)=>a-b).slice(239,241).reduce((a,b)=>a+b)/2)}元</p><p>向右延伸的长尾，<br/>需要回到原始记录核查。</p></Words><Note>本例为右偏分布。偏态本身不证明数据错误，也不说明形成机制。</Note></>;
  case 11:return <><BoxExplanation/><Note>须端：落在[Q1−1.5IQR, Q3+1.5IQR]内的最远观测。须外点不自动等于错误。</Note></>;
  case 12:return <><Groups mode="box"/><Note>箱线叠加原始点；两组各240人。箱体内部仍可能存在聚集和稀疏位置。</Note></>;
  case 13:return <><Groups mode="violin"/><Note>高斯核密度，带宽100元；各组峰值归一化显示形状，宽度不代表样本量。</Note></>;
  case 14:return <><Art id="l2-02-lens" mode="cutout" style={{width:500,opacity:.3}}/><Words style={{top:25,width:1030}}><p><strong>小样本</strong>　保留原始点，避免光滑形状制造确定感。</p><p><strong>分布形态</strong>　直方图，检查不同箱宽。</p><p><strong>多组比较</strong>　箱线图叠点，或明确带宽的密度图。</p><p><strong>离散等级</strong>　展示等级人数或比例。</p></Words><Note>选图依据：样本量、变量尺度与研究问题。</Note></>;
  case 15:return <><SortedMeans/><Note>各组样本量：甲城会员180、非会员60；乙城会员60、非会员180。</Note></>;
  case 16:return <><BadChart fixed/><Note>条形长度从0开始。位置编码的点图可采用非零范围，但必须清楚标轴。</Note></>;
  case 17:return <><Art id="l2-05-baskets" mode="cutout" style={{width:500,top:0,opacity:.5}}/><Words style={{top:20,width:1000}}><p>会员中甲城顾客占比：</p><MathText s={'180/240=75\\%'}/><p>甲城顾客中会员占比：</p><MathText s={'180/(180+60)=75\\%'}/></Words><Note>本例数值巧合相同；前一个240是全部会员，后一个240是甲城全部顾客。</Note></>;
  case 18:return <><Composition/><Note>甲城与乙城互斥且覆盖本例全部样本；每组内部比例加总为100%。</Note></>;
  case 19:return <><Groups/><Note>会员均值650元、非会员500元，不表示每一位会员都比每一位非会员消费更多。</Note></>;
  case 20:return <><Groups mode="means" interval/><Note>会员95% t CI [601.4, 698.6]元；非会员 [458.7, 541.3]元。各组n=240。</Note></>;
  case 21:return <><Art id="l2-04-scales" mode="window" style={{width:620,opacity:.5}}/><div className="sa-report" style={{width:950,marginTop:55}}>图1　观察月中会员与非会员的月消费比较。<br/><br/>样本来自两城，共480位顾客，两组各240人。每点表示组均值；线段为该均值的<strong>95% t置信区间</strong>。金额单位为元/人/月。<br/><br/>教学模拟，会员身份非随机分配。</div><Note>图题说明比较问题；图注交代对象、统计量、单位、精度和来源。</Note></>;
  case 22:return <><Scatter first/><Note>同一行记录的月收入与月消费配成一个点。两轴金额均为教学模拟。</Note></>;
  case 23:return <><Scatter/><Note>先观察方向、形状、离散和异常位置；尚未加入分组信息。</Note></>;
  case 24:return <><div style={{width:960}}><Anscombe which={2}/></div><Words style={{left:1000,top:125,width:370}}><p><strong>弯曲关系</strong></p><p>一个线性相关系数，<br/>不能描述整条轨迹。</p></Words><Note>返回Anscombe第二组；不要把主案例中未出现的曲线形态强加给数据。</Note></>;
  case 25:return <><div className="sa-two"><div><h2>Ⅲ · y方向的异常位置</h2><Anscombe which={3}/></div><div><h2>Ⅳ · x方向的高杠杆位置</h2><Anscombe which={4}/></div></div><Note>影响大不构成自动删除理由。先核查，再报告包含与排除该点时的敏感性。</Note></>;
  case 26:return <><div className="sa-two"><div><h2>大而不透明：密集区被遮挡</h2><Scatter big/></div><div><h2>小点与透明度：密度重新显现</h2><Scatter/></div></div><Note>同一批480条记录，同一坐标。连续变量坐标保持不变；更大数据可使用二维分箱。</Note></>;
  case 27:return <><Scatter color/><Note>会员始终为琥珀圆点，非会员为蓝绿三角。颜色与形状共同区分类别。</Note></>;
  case 28:return <><div className="sa-two"><div><h2>全样本均值（元/人/月）</h2><Groups mode="means"/></div><div><h2>两组内部的城市构成</h2><Composition/></div></div><Note>总体：会员650，非会员500。两组城市权重分别为75%/25%与25%/75%。</Note></>;
  case 29:return <><CityMeans/><Note>甲城：750−800=−50元；乙城：350−400=−50元。两城内部的方向都与总体相反。</Note></>;
  case 30:return <><div className="sa-two"><div style={{paddingTop:15}}><div className="sa-image-diptych" style={{height:240}}><img src={`${ROOT}l2-06-neighborhood-a.png`} alt="甲城教学情境"/><img src={`${ROOT}l2-07-neighborhood-b.png`} alt="乙城教学情境"/></div><p style={{fontSize:28,marginTop:40}}>甲城组均值更高；<br/>会员样本更集中于甲城。</p></div><div style={{paddingTop:35}}><MathText s={'650=.75\\times750+.25\\times350'}/><MathText s={'500=.25\\times800+.75\\times400'}/><p style={{fontSize:29,marginTop:50}}>权重不同，能够改变总体比较的方向。</p></div></div><Note>辛普森式反转：分层有助于看清构成，但城市分层本身不提供因果识别。</Note></>;
  case 31:return <><Heatmap/><Note>Pearson相关 · n=480 · 每个变量都来自同一位顾客；近零不排除非线性关系。</Note></>;
  case 32:return <><Art id="l2-08-intersection" mode="strip" style={{opacity:.15}}/><div className="sa-two"><div><h2>甲城 · n=240</h2><Scatter city="甲" color/></div><div><h2>乙城 · n=240</h2><Scatter city="乙" color/></div></div><Note>分面保留相同横纵轴尺度；从相关矩阵返回原始散点，核查组内形态与异常位置。</Note></>;
  case 33:return <><Art id="l2-09-seasons" mode="strip" style={{opacity:.3}}/><TimeSeries/><Note>独立模拟月报：品牌全量、连续24个月。这里的一个点不再代表一个顾客。</Note></>;
  case 34:return <><div className="sa-two"><div><h2>全品牌月销售额</h2><TimeSeries metric="total"/></div><div><h2>当月每位顾客平均消费</h2><TimeSeries/></div></div><Note>两图使用独立且明确的纵轴。总额=当月顾客数×人均消费；不用双轴制造视觉相关。</Note></>;
  case 35:return <><TimeSeries/><Note>模拟中包含上升项与年度周期项；观察到两轮起伏，尚不足以验证稳定季节规律。</Note></>;
  case 36:return <><div className="sa-two"><div><h2>月总额 · 24点</h2><TimeSeries metric="total"/></div><div><h2>季度总额 · 8点</h2><TimeSeries quarter/></div></div><Note>季度销售额是三个月总额之和；季度人均需用匹配口径的分子与分母重新计算。</Note></>;
  case 37:return <><TimeSeries missing/><Note>缺失演示：隐藏第8、9月，原始模拟数据保留。断口表达未知；不补零、不默认插值。</Note></>;
  case 38:return <><Art id="l2-10-clock" mode="window"/><Words style={{top:60,width:840}}><p>按时间先后划分训练与评价窗口。</p><p>与简单基准比较预测误差。</p><p>给出预测范围，检查结构是否改变。</p><hr/><p><strong>已有走势，是预测的起点。</strong></p></Words><Note>动态建模与预测评价将在第15、16讲展开。</Note></>;
  case 39:return <><Difference/><Note>点为均值差估计；线为该差值的95%置信区间；零线表示无均值差。</Note></>;
  case 40:return <><ErrorBars/><Note>相同会员均值650元，三种线段含义不同。图注不可只写“误差线”。</Note></>;
  case 41:return <><div className="sa-two"><div><h2>分别估计两个组的均值</h2><Groups mode="means" interval/></div><div style={{paddingTop:40}}><p className="sa-report" style={{fontSize:29}}>是否重叠，不能替代对<strong>差值</strong>的推断。<br/><br/>差值方差还取决于两个估计之间的协方差。</p><div style={{fontSize:26,marginTop:45}}>本例两组独立：SE差=√(SE₁²+SE₀²)</div></div></div><Note>不能一般性地用两条95% CI是否重叠判断差异是否显著。</Note></>;
  case 42:return <><Difference/><Note>同一主样本，比较方向固定为会员−非会员；95% CI不跨0，但仍需检查设计与实际量级。</Note></>;
  case 43:return <><Difference illustration/><Note>区间示意（非主样本结果）：宽区间仍容许较大差异；等效判断需要预设界值和相应检验。</Note></>;
  case 44:return <><Art id="l2-11-pencil" mode="cutout" style={{width:650,top:180,opacity:.23}}/><div className="sa-report" style={{marginTop:30}}>图2　会员与非会员月均消费差异。<br/><br/>点估计为<strong>150元/人/月</strong>，误差线为独立两样本<strong>Welch 95%置信区间</strong>[86.3, 213.7]元。两组各240人。区间基于独立抽样与相应均值推断模型。<br/><br/>资料：自编两城教学模拟；会员身份非随机分配。该比较不识别会员制度的因果效应。</div><Note>使用精确区间与完整方法标签；星号不能替代量级、精度及解释边界。</Note></>;
  case 46:return <><div className="sa-bad-label">尺度仍待修订</div><BadChart/><Note>已改：标题改为观察性比较问题。未改：纵轴仍从480元开始，长度比例失真。</Note></>;
  case 47:return <><BadChart fixed/><Note>已改：从0开始，650与500的柱长比为1.3。接下来检查两个均值背后的分布。</Note></>;
  case 48:return <><Groups mode="box"/><Note>已改：加入全部个体点与箱线。可同时观察组间位置、组内离散和长尾。</Note></>;
  case 49:return <><CityMeans/><Note>已改：按城市分层并显示n。甲城与乙城内均值差均为−50元。</Note></>;
  case 50:return <><Difference city/><Note>各城市内独立两样本Welch 95% CI；甲城n=180/60，乙城n=60/180（会员/非会员）。</Note></>;
  case 51:return <><div className="sa-two"><div><h2>城市内的均值比较</h2><CityMeans compact/></div><div className="sa-report" style={{fontSize:27}}>总体会员均值比非会员高150元，但在两座城市内分别低50元。城市构成不同，解释了本例总体与组内方向的反转。<br/><br/>城市内差值区间均跨0，仍存在估计不确定性。分层比较仍受观察性设计限制，<strong>不能据此认定会员制度提高或降低了消费</strong>。</div></div><Note>最终图形保留：比较对象、统一尺度、样本量、区间、来源与证据边界。</Note></>;
  case 52:return <><Art id="l2-12-window-observer" mode="window" style={{width:860}}/><Big style={{fontSize:77,paddingTop:50,width:900}}>城市、收入、会员身份，<br/>如果<em>同时</em>变化呢？</Big><Words style={{top:330,width:970}}><p>线性回归：在模型中同时描述多因素关系。</p><p style={{fontSize:27}}>模型设定与研究设计，仍决定解释的边界。</p></Words><Note>下一讲：线性回归与多因素关系分析。</Note></>;
  default:throw new Error(`Missing authored lecture 2 page ${page}`);
 }
}
function BoxExplanation(){const g=D.groups[0]!,sx=(v:number)=>90+v/2600*990;return <Plot label="会员箱线图结构：Q1、中位数、Q3、须及须外点"><Axis/><text x="95" y="50">会员 · n=240 · 金额单位：元/人/月</text><path d={`M${sx(g.low)} 250H${sx(g.high)}M${sx(g.low)} 225v50M${sx(g.high)} 225v50`} stroke={teal} strokeWidth="4"/><rect x={sx(g.q1)} y="200" width={sx(g.q3)-sx(g.q1)} height="100" fill={teal} opacity=".18"/><path d={`M${sx(g.median)} 200V300`} stroke={ink} strokeWidth="4"/>{[g.q1,g.median,g.q3].map((v,i)=><g key={i}><path d={`M${sx(v)} ${i===1?300:200}v${i===1?52:-52}`} stroke={mutedColor}/><text x={sx(v)} y={i===1?382:127} textAnchor="middle">{['Q1','中位数','Q3'][i]} {fmt(v)}</text></g>)}{D.people.filter(p=>p.member&&(p.spend>g.high||p.spend<g.low)).map(p=><circle key={p.id} cx={sx(p.spend)} cy="250" r="5" fill={amber}/>)}<text x="850" y="180">须外观测</text></Plot>;}
const mutedColor='#89969a';
function SortedMeans(){return <Plot label="按均值排序的四组点图"><Axis max={1000} step={200}/>{[...D.cells].sort((a,b)=>b.mean-a.mean).map((g,i)=><g key={`${g.city}-${g.member}`}><text x="90" y={58+i*90}>{g.city}城 · {g.member?'会员':'非会员'} · n={g.n}</text><circle cx={90+g.mean/1000*990} cy={82+i*90} r="9" fill={g.member?amber:teal}/><text x={110+g.mean/1000*990} y={90+i*90}>{fmt(g.mean,0)}元</text></g>)}</Plot>;}
function CityMeans({compact=false}:{compact?:boolean}) {return <Plot label="相同横轴下两座城市的会员与非会员均值"><Axis max={1000} step={200}/>{['甲','乙'].map((city,i)=>{const a=D.cells[i*2]!,b=D.cells[i*2+1]!,cy=140+i*190;return <g key={city}><text x="90" y={cy-68} fontSize="29">{city}城　会员 n={a.n} ／ 非会员 n={b.n}</text><path d={`M${90+a.mean/1000*990} ${cy}H${90+b.mean/1000*990}`} stroke={mutedColor} strokeWidth="3"/><circle cx={90+a.mean/1000*990} cy={cy} r="10" fill={amber}/><path d={`M${90+b.mean/1000*990} ${cy-10}l10 20h-20Z`} fill={teal}/><text x={75+a.mean/1000*990} y={cy+43} textAnchor="end" fill={amber}>{fmt(a.mean,0)}</text><text x={105+b.mean/1000*990} y={cy+43} fill={teal}>{fmt(b.mean,0)}</text>{!compact?<text x="1020" y={cy+8} fill={ink}>Δ = −50</text>:null}</g>;})}<text x="1050" y="38" textAnchor="end" fontSize="21">琥珀圆点：会员　蓝绿三角：非会员</text></Plot>;}
export function StatisticalAnalysisSlide({index}:{index:number}) {
 const s=getStatisticalAnalysisSlide(index),cover=s.localIndex===1;
 const hasArt=(s.lesson===1?[1,2,3,4,5,6,7,9,10,11,13,14,17,18,19,20,26,36,39,45,46,48]:[1,2,6,14,17,21,30,32,33,38,44,52]).includes(s.localIndex);
 return <article className={`sa-slide ${cover?'sa-slide--cover':''} sa-slide--${s.slideKey}`} data-slide-key={s.slideKey}>
  {!cover&&<header className="sa-header"><span>{String(s.lesson).padStart(2,'0')} / {s.section}</span><h1>{s.title}</h1><p>{s.lead}</p></header>}
  <div className={cover?'sa-cover':'sa-body'}><MainContent s={s}/></div>
  <footer className="sa-footer"><span>{s.source}{[40,41,46,47].includes(s.localIndex)&&s.lesson===1?' · ASA (2016)':''}{hasArt?' · 配图：AI情境':''}</span><span>统计分析方法 <b>{String(s.localIndex).padStart(2,'0')}</b> / {s.localTotal}</span></footer>
 </article>;
}
export function StatisticalAnalysisSlideStage({frame}:{frame:SlideFrame}) {return <SlideViewport label={`统计分析方法，${frame.title}`}><StatisticalAnalysisSlide index={frame.index}/></SlideViewport>;}
