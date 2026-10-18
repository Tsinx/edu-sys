import type {ReactNode} from 'react';
import {FACTOR_DATA as D,MEASUREMENT_DATA as M,factorEvidenceText,semPaths} from '@edu/course-content/statistical-analysis';
import './factor-pages.css';

const ink='#152e3e',teal='#197f7a',amber='#b87921',red='#a84e41';
const fmt=(v:number,d=3)=>v.toFixed(d);
const E=D.efa,C=D.confirmation.two;
const labels=['R1','R2','R3','T1','T2','T3*'];
function Svg({label,children}:{label:string;children:ReactNode}){return <svg className="sam-chart saf-chart" viewBox="0 0 1424 535" role="img" aria-label={label}>{children}</svg>;}
function Marker({id}:{id:string}){return <defs><marker id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill={ink}/></marker></defs>;}
function Correlation({matrix,residual=false}:{matrix:number[][];residual?:boolean}){
 const max=residual?Math.max(...matrix.flat().map(Math.abs)):1;
 return <Svg label={residual?'六题观测多分相关减去CFA隐含相关的残差矩阵':'六题相关矩阵，行列与颜色都保留实际系数'}>
  {labels.map((l,j)=><text key={l} x={292+j*135} y="35" textAnchor="middle">{l}</text>)}
  {matrix.map((row,i)=><g key={i}><text x="190" y={100+i*66} textAnchor="end">{labels[i]}</text>{row.map((v,j)=><g key={j}><rect x={226+j*135} y={57+i*66} width="131" height="63" fill={v<0?amber:teal} opacity={residual&&i===j?.03:.04+Math.abs(v)/max*.42}/><text x={292+j*135} y={100+i*66} textAnchor="middle">{residual&&i===j?'—':fmt(v,2)}</text></g>)}</g>)}
  <text x="1105" y="130" fill={teal}>正值</text><text x="1105" y="195" fill={amber}>负值</text>
  <text x="226" y="515">{residual?'色深按本矩阵最大绝对残差缩放；对角不作解释。':'−1 ≤ r ≤ 1；T3*已经统一计分方向。'}</text>
 </Svg>;
}
function Variance({actual=false,invalid=false}:{actual?:boolean;invalid?:boolean}){
 const common=invalid?1.08:actual?C.loadings[0]![0]!**2:.64,unique=1-common;
 return <Svg label={`${actual?'R1标准化潜在响应':invalid?'独立异常解示意':'独立概念例'}：共同方差${fmt(common)}、独特方差${fmt(unique)}`}>
  <text x="80" y="70">{actual?'独立确认样本 · R1':invalid?'不可接受解的独立示意':'概念例 · 载荷0.8，因素方差1'}</text>
  <text x="80" y="200" className="saf-huge" fill={teal}>{fmt(common,actual?3:2)}</text><text x="770" y="200" className="saf-huge" fill={invalid?red:amber}>{fmt(unique,actual?3:2)}</text>
  <text x="80" y="265">共同部分</text><text x="770" y="265">{invalid?'负的独特方差':'独特部分'}</text>
  <rect x="80" y="320" width={1100*Math.min(common,1)} height="75" fill={teal}/>
  {!invalid&&<rect x={80+1100*common} y="320" width={1100*unique} height="75" fill={amber}/>}
  {invalid&&<rect x="1180" y="320" width="88" height="75" fill={red}/>}
  <path d="M80 410H1180" stroke={ink}/><text x="80" y="460">0</text><text x="1180" y="460" textAnchor="middle">1</text>
  <text x="80" y="520">{invalid?'超过标准化总方差1，需要诊断；不能当成特别优秀的载荷。':actual?`载荷${fmt(C.loadings[0]![0]!)}的平方，配合模型残差方差。`:'0.8² ＋ 0.36 = 1；独特部分不全是粗心误差。'}</text>
 </Svg>;
}
function MeasurementModel({exploratory=false}:{exploratory?:boolean}){
 const xs=[160,370,580,844,1054,1264];
 return <Svg label={exploratory?'两个相关共同因素概念图。按内容示意主联系，EFA交叉载荷全部待估':'预先指定的六题两因素CFA模型，各题含残差，两个因素允许相关'}>
  <Marker id={exploratory?'saf-efa-arrow':'saf-cfa-arrow'}/>
  {[[370,'R · 响应'],[1054,'T · 透明']].map(([x,label])=><g key={label}><ellipse cx={Number(x)} cy="95" rx="137" ry="58" fill="none" stroke={teal} strokeWidth="3"/><text x={x} y="105" textAnchor="middle">{label}</text></g>)}
  <path d="M515 90C650 12 775 12 910 90" fill="none" stroke={amber} strokeWidth="2.5" markerStart={`url(#${exploratory?'saf-efa-arrow':'saf-cfa-arrow'})`} markerEnd={`url(#${exploratory?'saf-efa-arrow':'saf-cfa-arrow'})`}/><text x="712" y="75" textAnchor="middle">因素相关 Φ</text>
  {xs.map((x,i)=><g key={i}>
   <path d={`M${i<3?370:1054} 156L${x} 303`} fill="none" stroke={ink} strokeWidth="2" markerEnd={`url(#${exploratory?'saf-efa-arrow':'saf-cfa-arrow'})`}/>
   <rect x={x-74} y="310" width="148" height="62" fill="#f4f0e7" stroke={ink} strokeWidth="2"/><text x={x} y="352" textAnchor="middle">{labels[i]}</text>
   <circle cx={x} cy="445" r="25" fill="none" stroke={amber} strokeWidth="2"/><text x={x} y="454" textAnchor="middle" className="saf-small">ε{i+1}</text><path d={`M${x} 418V379`} stroke={ink} strokeWidth="1.6" markerEnd={`url(#${exploratory?'saf-efa-arrow':'saf-cfa-arrow'})`}/>
  </g>)}
  <text x="712" y="525" textAnchor="middle">{exploratory?'图中只示意内容主联系；EFA每题对两个因素的载荷都参与估计。':'未画出的交叉载荷与题项残差协方差，均固定为0。'}</text>
 </Svg>;
}
function Thresholds(){return <Svg label="五级顺序响应概念图：四个阈值把潜在连续响应分为五个不等宽区段">
 <text x="80" y="65">潜在连续响应 x*</text><path d="M80 285H1350" stroke={ink} strokeWidth="3"/>
 {[80,300,480,850,1100,1350].slice(0,-1).map((x,i)=>{const next=[300,480,850,1100,1350][i]!;return <g key={i}><rect x={x} y="160" width={next-x-3} height="95" fill={i%2?amber:teal} opacity=".13"/><text x={(x+next)/2} y="220" textAnchor="middle" className="saf-number">{i+1}</text></g>;})}
 {[300,480,850,1100].map((x,i)=><g key={i}><path d={`M${x} 135V310`} stroke={ink} strokeWidth="2"/><text x={x} y="365" textAnchor="middle">τ{i+1}</text></g>)}
 <text x="80" y="455">答案只记录所在类别，不直接记录连续位置。</text><text x="80" y="515">示意区段宽度不等；类别编号的差1，不规定相同心理距离。</text>
 </Svg>;}
function Scree({parallel=false}:{parallel?:boolean}){
 const obs=parallel?E.parallel.observed:E.eigen,reference=parallel?E.parallel.null95:undefined;
 const max=Math.ceil(Math.max(...obs)),min=parallel?-.3:0,sx=(i:number)=>200+i*210,sy=(v:number)=>415-(v-min)/(max-min)*300;
 return <Svg label={parallel?'共同因子置换平行分析，SMC约化特征值与199次95%参考比较':'完整多分相关矩阵碎石图，六个特征值'}>
  <path d="M120 38h35" stroke={teal} strokeWidth="4"/><text x="170" y="47">{parallel?'观测约化特征值':'完整相关矩阵特征值'}</text>
  {reference&&<><path d="M740 38h35" stroke={amber} strokeWidth="4" strokeDasharray="8 6"/><text x="790" y="47">置换95%参考</text></>}
  {Array.from({length:max+1},(_,i)=>i).map(v=><g key={v}><path d={`M150 ${sy(v)}H1300`} stroke={ink} opacity=".12"/><text x="125" y={sy(v)+10} textAnchor="end">{v}</text></g>)}
  <path d="M150 100V415H1300" stroke={ink} fill="none"/>
  <path d={obs.map((v,i)=>`${i?'L':'M'}${sx(i)} ${sy(v)}`).join(' ')} stroke={teal} strokeWidth="4" fill="none"/>
  {obs.map((v,i)=><circle key={i} cx={sx(i)} cy={sy(v)} r="7" fill={teal}/>)}
  {reference&&<path d={reference.map((v,i)=>`${i?'L':'M'}${sx(i)} ${sy(v)}`).join(' ')} stroke={amber} strokeWidth="3" strokeDasharray="8 6" fill="none"/>}
  {obs.map((_,i)=><text key={i} x={sx(i)} y="466" textAnchor="middle">{i+1}</text>)}
  <text x="712" y="525" textAnchor="middle">{parallel?'按首维开始连续比较，首次未超过参考时停止；不挑后部的偶然交叉。':'维度次序；本图不能当作共同因子平行分析。'}</text>
 </Svg>;
}
function SinglePrediction(){const pairs=[[0,1],[0,3],[3,4]],sx=(v:number)=>530+v*740;return <Svg label="单因素模型对三个题项对的隐含相关，与实际多分相关比较">
 <circle cx="600" cy="35" r="7" fill={teal}/><text x="625" y="44">观测多分相关</text><path d="M1030 27l8 16h-16Z" fill={amber}/><text x="1055" y="44">单因素隐含</text>
 {pairs.map(([i,j],k)=>{const obs=E.polychoric[i!]![j!]!,fit=E.one.common[i!]![j!]!,y=150+k*120;return <g key={k}><text x="80" y={y+10}>{labels[i!]!} / {labels[j!]!}</text><path d={`M${sx(Math.min(obs,fit))} ${y}H${sx(Math.max(obs,fit))}`} stroke={ink} strokeWidth="2"/><circle cx={sx(obs)} cy={y} r="9" fill={teal}/><path d={`M${sx(fit)} ${y-9}l9 18h-18Z`} fill={amber}/><text x="280" y={y+10}>{fmt(obs)} / {fmt(fit)}</text></g>;})}
 <path d="M530 435H1270" stroke={ink}/>{[0,.25,.5,.75,1].map(v=><text key={v} x={sx(v)} y="477" textAnchor="middle">{v}</text>)}<text x="80" y="530">非对角相关残差RMS = {fmt(E.one.rms)}；点和三角分别给出观测与隐含值。</text>
 </Svg>;}
function Rotation(){return <div className="saf-rotation">
 {[{title:'未旋转',value:E.unrotated},{title:'oblimin斜交',value:E.two}].map(m=><section key={m.title}><h2>{m.title}</h2><table className="sam-table"><thead><tr><th>题项</th><th>F1</th><th>F2</th></tr></thead><tbody>{m.value.pattern.map((r,i)=><tr key={i}><td>{labels[i]}</td><td>{fmt(r[0]!)}</td><td>{fmt(r[1]!)}</td></tr>)}</tbody></table><p>相关残差RMS {fmt(m.value.rms)}</p></section>)}
 </div>;}
function Symbols(){return <Svg label="测量图符号：椭圆潜变量R、矩形R1—R3、单向载荷和圆形独特残差">
 <Marker id="saf-symbol-arrow"/><ellipse cx="260" cy="250" rx="130" ry="70" stroke={teal} strokeWidth="3" fill="none"/><text x="260" y="261" textAnchor="middle">潜变量 R</text>
 {[100,250,400].map((y,i)=><g key={i}><path d={`M390 250L685 ${y}`} stroke={ink} strokeWidth="2" markerEnd="url(#saf-symbol-arrow)"/><rect x="700" y={y-35} width="180" height="70" fill="#f4f0e7" stroke={ink} strokeWidth="2"/><text x="790" y={y+11} textAnchor="middle">R{i+1}</text><circle cx="1050" cy={y} r="32" fill="none" stroke={amber} strokeWidth="2"/><text x="1050" y={y+10} textAnchor="middle">ε{i+1}</text><path d={`M1010 ${y}H895`} stroke={ink} markerEnd="url(#saf-symbol-arrow)"/><text x="1130" y={y+10}>独特残差</text></g>)}
 <text x="80" y="520">椭圆：不能直接观测的因素；矩形：实际题项；单向线：指定的载荷。</text>
 </Svg>;}
function Scaling(){return <div className="saf-equations"><p className="saf-label">同一个隐含响应的两种表达</p><div><strong>0.8 × F</strong><span>=</span><strong>0.4 × (2F)</strong></div><p>潜变量放大2倍，载荷减半，预测的响应保持不变。</p><p>固定一个载荷为1，或固定因子方差为1，可以明确尺度。</p></div>;}
function PairPrediction({between=false}:{between?:boolean}){
 const xs=between?[120,510,900,1290]:[220,712,1204];const names=between?['R1','R','T','T1']:['R1','R','R2'];
 const values=between?[C.loadings[0]![0]!,C.phi[0]![1]!,C.loadings[3]![1]!]:[C.loadings[0]![0]!,C.loadings[1]![0]!];
 return <Svg label={`${names.join('、')}的隐含相关计算，实际系数${values.map(v=>fmt(v)).join('乘')}`}>
  <Marker id={between?'saf-between-arrow':'saf-within-arrow'}/>
  {xs.slice(0,-1).map((x,i)=><g key={i}><path d={`M${x+85} 170H${xs[i+1]!-85}`} stroke={ink} strokeWidth="2"/><text x={(x+xs[i+1]!)/2} y="115" textAnchor="middle">{fmt(values[i]!)}</text></g>)}
  {xs.map((x,i)=><g key={i}>{i===0||i===xs.length-1?<rect x={x-76} y="132" width="152" height="76" stroke={ink} fill="#f4f0e7" strokeWidth="2"/>:<ellipse cx={x} cy="170" rx="76" ry="43" stroke={teal} fill="#f4f0e7" strokeWidth="3"/>}<text x={x} y="182" textAnchor="middle">{names[i]}</text></g>)}
  <text x="712" y="342" textAnchor="middle" className="saf-number">{values.map(v=>fmt(v)).join(' × ')} = {fmt(between?C.implied[0]![3]!:C.implied[0]![1]!)}</text>
  <text x="712" y="440" textAnchor="middle">隐含的是潜在响应相关；计算使用全精度，显示值已舍入。</text>
 </Svg>;
}
function FitHero({mode}:{mode:string}){
 const measures=C.measures;
 if(mode==='rmsea'){
  const point=measures['rmsea.scaled'],lo=measures['rmsea.ci.lower.scaled'],hi=measures['rmsea.ci.upper.scaled'],sx=(v:number)=>200+v/.20*1040;
  return <Svg label={`校正RMSEA ${fmt(point)}，90%区间${fmt(lo)}到${fmt(hi)}`}><text x="80" y="65">校正RMSEA与90%置信区间</text><path d="M200 310H1240" stroke={ink}/>{[0,.05,.1,.15,.2].map(v=><g key={v}><path d={`M${sx(v)} 300v20`} stroke={ink}/><text x={sx(v)} y="370" textAnchor="middle">{fmt(v,2)}</text></g>)}<path d={`M${sx(lo)} 210H${sx(hi)}M${sx(lo)} 190v40M${sx(hi)} 190v40`} stroke={teal} strokeWidth="5"/><circle cx={sx(point)} cy="210" r="11" fill={amber}/><text x="80" y="470">点值 {fmt(point)}；区间 [{fmt(lo)}, {fmt(hi)}]</text><text x="80" y="530">自由度较少，区间与局部残差尤其值得一起看。</text></Svg>;
 }
 const chi=mode==='chi',relative=mode==='relative';
 return <div className="saf-fit-reading"><section><span>{chi?'WLSMV校正χ²':relative?'校正CFI':'SRMR'}</span><strong>{fmt(chi?measures['chisq.scaled']:relative?measures['cfi.scaled']:measures.srmr)}</strong><p>{chi?`df=${measures['df.scaled']}；p ${measures['pvalue.scaled']<.001?'< .001':fmt(measures['pvalue.scaled'])}`:relative?'相对独立基准模型':'相关残差的整体摘要'}</p></section><section><span>{chi?'检验对象':relative?'校正TLI':'最大非对角绝对残差'}</span>{!chi&&<strong>{fmt(relative?measures['tli.scaled']:C.maxResidual)}</strong>}<p>{chi?'指定模型能否精确复现当前资料中的关系？':relative?'相对改善不等于理论成立的概率。':'平均残差之外，还要检查失配集中在哪些题项对。'}</p></section></div>;
}
function SemModel(){const groupXs=[230,712,1194],items=['R1','R2','R3','T1','T2','T3*','S1','S2','S3'];return <Svg label="九题结构方程模型，R预测T，T和R同时预测S；三个潜变量分别由三题测量">
 <Marker id="saf-sem-arrow"/>{['M365 145H570','M847 145H1053'].map(path=><path key={path} d={path} stroke={ink} strokeWidth="2.5" fill="none" markerEnd="url(#saf-sem-arrow)"/>)}<text x="470" y="122" textAnchor="middle">a</text><text x="950" y="122" textAnchor="middle">b</text>
 <path d="M230 89C400 -12 1020 -12 1194 89" stroke={ink} strokeWidth="2.5" fill="none" markerEnd="url(#saf-sem-arrow)"/><text x="712" y="33" textAnchor="middle">c</text>
 <circle cx="945" cy="72" r="20" stroke={amber} fill="none"/><text x="945" y="80" textAnchor="middle" className="saf-small">ζT</text><path d="M923 80L835 117" stroke={ink} strokeWidth="1.5" markerEnd="url(#saf-sem-arrow)"/>
 <circle cx="1370" cy="145" r="20" stroke={amber} fill="none"/><text x="1370" y="153" textAnchor="middle" className="saf-small">ζS</text><path d="M1347 145H1330" stroke={ink} strokeWidth="1.5" markerEnd="url(#saf-sem-arrow)"/>
 {groupXs.map((x,g)=><g key={g}><ellipse cx={x} cy="145" rx="130" ry="55" fill="none" stroke={teal} strokeWidth="3"/><text x={x} y="156" textAnchor="middle">{['响应 R','透明 T','满意 S'][g]}</text>{[-1,0,1].map((j,i)=>{const ix=x+j*145;return <g key={i}><path d={`M${x} 207L${ix} 335`} stroke={ink} strokeWidth="1.8" markerEnd="url(#saf-sem-arrow)"/><rect x={ix-60} y="345" width="120" height="60" fill="#f4f0e7" stroke={ink} strokeWidth="2"/><text x={ix} y="385" textAnchor="middle">{items[g*3+i]}</text><circle cx={ix} cy="473" r="23" fill="none" stroke={amber}/><text x={ix} y="482" textAnchor="middle" className="saf-small">ε</text><path d={`M${ix} 445V413`} stroke={ink} markerEnd="url(#saf-sem-arrow)"/></g>;})}</g>)}
 <text x="712" y="532" textAnchor="middle">各因素首题载荷固定1；T、S另有结构残差ζ，方差待估。</text>
 </Svg>;}
function Reverse(){return <Svg label="测量部分保持一致的两个潜变量递归模型，R到T与T到R互换，S始终同时依赖R和T">
 <Marker id="saf-reverse-arrow"/>{[false,true].map((reversed,k)=>{const left=80+k*730;return <g key={k}><text x={left} y="42">{reversed?'反向递归关系':'原指定关系'}</text>{[[left+90,160,'R'],[left+490,160,'T'],[left+290,400,'S']].map(([x,y,l])=><g key={l}><ellipse cx={Number(x)} cy={Number(y)} rx="70" ry="45" fill="none" stroke={teal} strokeWidth="3"/><text x={x} y={Number(y)+10} textAnchor="middle">{l}</text></g>)}<path d={reversed?`M${left+410} 160H${left+170}`:`M${left+170} 160H${left+410}`} stroke={ink} strokeWidth="2.5" markerEnd="url(#saf-reverse-arrow)"/>{[`M${left+110} 212L${left+250} 350`,`M${left+470} 212L${left+330} 350`].map(path=><path key={path} d={path} stroke={ink} strokeWidth="2.5" fill="none" markerEnd="url(#saf-reverse-arrow)"/>)}</g>;})}<text x="712" y="520" textAnchor="middle">测量部分不变；三潜变量的协方差可由两种递归方向表达。</text>
 </Svg>;}

export function FactorEvidence({id}:{id:string}):ReactNode{
 switch(id){
  case 'efa-scene':return <div className="saf-scene"><section><span>顾客甲</span><blockquote>“很快就有人帮忙，<br/>但哪些费用包含在内，<br/>我还是没有弄清楚。”</blockquote></section><section><span>顾客乙</span><blockquote>“费用说明很清楚，<br/>只是需要帮助时，<br/>很难找到工作人员。”</blockquote></section></div>;
  case 'efa-pearson':return <Correlation matrix={E.pearson}/>;
  case 'efa-polychoric':return <Correlation matrix={E.polychoric}/>;
  case 'efa-common-model':return <MeasurementModel exploratory/>;
  case 'efa-variance':return <Variance/>;
  case 'efa-single-prediction':return <SinglePrediction/>;
  case 'efa-thresholds':return <Thresholds/>;
  case 'efa-scree':return <Scree/>;
  case 'efa-parallel':return <Scree parallel/>;
  case 'efa-rotation-geometry':return <Rotation/>;
  case 'efa-heywood':return <Variance invalid/>;
  case 'efa-reflective':return <div className="saf-contrasts"><section><span>反映式测量</span><h2>响应体验</h2><p>共同体验反映在回应、解决、人员可获得的回答中。</p></section><section><span>组成式指数</span><h2>成本、等待、覆盖</h2><p>不同内容共同定义一个指数；组成部分不必高度相关。</p></section></div>;
  case 'efa-scores':return <div className="saf-contrasts"><section><span>题项的测量关系</span><h2>一题，一行载荷</h2><p>用于描述题项与因素的关系，属于模型的参数。</p></section><section><span>个体的位置估计</span><h2>一人，一组得分</h2><p>依据回答与模型估计；得分方法和误差仍需说明。</p></section></div>;
  case 'efa-reverse':return <div className="saf-equations"><p className="saf-label">原题T3</p><blockquote>{M.survey.items[5]![2]}</blockquote><div><strong>T3* = 6 − T3</strong></div><p>例如原答5分，计分后为1分。</p><p>计分改变方向，无法补回受访者误读的题意。</p></div>;
  case 'cfa-model':return <MeasurementModel/>;
  case 'cfa-symbols':return <Symbols/>;
  case 'cfa-scaling':return <Scaling/>;
  case 'cfa-variance':return <Variance actual/>;
  case 'cfa-within':return <PairPrediction/>;
  case 'cfa-between':return <PairPrediction between/>;
  case 'cfa-residual':return <Correlation matrix={C.residual} residual/>;
  case 'cfa-chi':return <FitHero mode="chi"/>;
  case 'cfa-relative':return <FitHero mode="relative"/>;
  case 'cfa-rmsea':return <FitHero mode="rmsea"/>;
  case 'cfa-srmr':return <FitHero mode="srmr"/>;
  case 'sem-model':return <SemModel/>;
  case 'sem-reverse':return <Reverse/>;
  case 'sem-product':return <div className="saf-equations"><p className="saf-label">同一模型、同一定标的非标准化系数</p><div><strong>{fmt(semPaths.a.est)} × {fmt(semPaths.b.est)}</strong><span>=</span><strong>{fmt(semPaths.indirect.est)}</strong></div><p>a：R联系T；b：控制R后，T联系S。</p><p>路径乘积不自动识别现实中的中介机制。</p></div>;
  case 'sem-total':return <div className="saf-equations"><p className="saf-label">线性模型中的分解</p><div><strong>{fmt(semPaths.c.est)} ＋ {fmt(semPaths.indirect.est)}</strong><span>=</span><strong>{fmt(semPaths.total.est)}</strong></div><p>直接项 c，加上间接乘积 ab。</p><p>结果依赖指定模型，不是本例已识别的政策总效应。</p></div>;
  default:throw new Error(`Missing factor evidence: ${id}`);
 }
}
export function hasFactorEvidence(id:string){return id in factorEvidenceText;}
