import { MerchantFigure } from './MerchantFigure';
import { ExerciseTimer } from './ExerciseTimer';
import { merchantReadout } from '@edu/course-content/economic-mathematics';
import { EconomicPreludeSlide } from './EconomicPreludeSlide';
import katex from "katex";
import { economicModels as M, getEconomicMathematicsInteractionDefinition, getEconomicMathematicsPresentationStep, validateEconomicMathematicsInteractionState, type EconomicMathematicsSlideSpec as Slide, type EconomicMathematicsPlot } from "@edu/course-content/economic-mathematics";
import type { SlideInteractionState, SlideInteractionValues } from "@edu/contracts";
import { EconomicPlot } from "./EconomicMathematicsFigures";

export function MathText({text,display=false}:{text:string;display?:boolean}){
 if(display)return <div className="em-math" dangerouslySetInnerHTML={{__html:katex.renderToString(text,{displayMode:true,throwOnError:true,strict:"error",trust:false})}}/>;
 return <>{text.split(/(\$[^$]+\$)/g).map((part,i)=>part.startsWith("$")&&part.endsWith("$")?<span key={i} dangerouslySetInnerHTML={{__html:katex.renderToString(part.slice(1,-1),{throwOnError:true,strict:"error",trust:false})}}/>:<span key={i}>{part}</span>)}</>;
}
const fmt=(n:number)=>Number.isFinite(n)?n.toLocaleString("zh-CN",{maximumFractionDigits:3}):"—";
const labPlots:Record<string,EconomicMathematicsPlot>={
 "price-profit-lab":{model:"profit",xLabel:"价格（元/件）",yLabel:"日利润（元）"},
 "sequence-limit-lab":{model:"sequence",xLabel:"轮次 n",yLabel:"触达指数"},
 "continuity-threshold-lab":{model:"threshold",xLabel:"订单额（元）",yLabel:"总支付额（元）"},
 "secant-tangent-lab":{model:"secant",xLabel:"价格（元/件）",yLabel:"日利润（元）"},
 "linearization-error-lab":{model:"linear-error",xLabel:"价格（元/件）",yLabel:"日利润（元）"},
 "elasticity-profit-lab":{model:"profit",xLabel:"价格（元/件）",yLabel:"日利润（元）"},
 "riemann-sum-lab":{model:"riemann",xLabel:"时间（小时）",yLabel:"配送速率（件/小时）"},
 "accumulation-limit-lab":{model:"riemann",xLabel:"时间（小时）",yLabel:"销售速率（件/小时）"},
 "consumer-surplus-lab":{model:"surplus",xLabel:"销量（件）",yLabel:"愿付价格（元/件）"},
 "marketing-surface-lab":{model:"surface",xLabel:"价格（元/件）",yLabel:"广告（百元/日）"},
 "tangent-plane-lab":{model:"plane",xLabel:"价格（元/件）",yLabel:"广告（百元/日）"},
 "unconstrained-optimum-lab":{model:"profit-contours",xLabel:"投入 x",yLabel:"投入 y"},
 "budget-constraint-lab":{model:"budget",xLabel:"渠道 x（百元）",yLabel:"响应指数"}
};
export function economicLabReadout(id:string,v:SlideInteractionValues):readonly [string,string][]{
 const p=Number(v.price??50),seg=v.segment==="B"?1:0,q=M.demand(p,seg),base=Number(v.basePrice??50),dp=Number(v.h??v.deltaPrice??0);
 switch(id){
 case "price-profit-lab":return [["单价",fmt(p)+"元/件"],["日销量",fmt(q)+"件"],["日收入",fmt(p*q)+"元"],["日利润",fmt(M.profit(p,seg))+"元"]];
 case "sequence-limit-lab":{const n=Number(v.n);return [["轮次",fmt(n)],["触达指数",fmt(M.sequence(n))],["距120的误差",fmt(60/n)],["容许误差",String(v.epsilon)]];}
 case "continuity-threshold-lab":return [["订单额",fmt(Number(v.orderAmount))+"元"],["总支付额",fmt(M.threshold(Number(v.orderAmount)))+"元"]];
 case "secant-tangent-lab":return [["基准价格",fmt(base)+"元/件"],["价格间隔",fmt(dp)+"元/件"],["割线斜率",dp===0?"间隔为零":fmt((M.profit(base+dp)-M.profit(base))/dp)+"件/日"],["切线斜率",fmt(1400-20*base)+"件/日"]];
 case "linearization-error-lab":{const actual=M.profit(base+dp)-M.profit(base),estimate=(1400-20*base)*dp;return [["价格变化",fmt(dp)+"元/件"],["实际利润增量",fmt(actual)+"元/日"],["线性估算",fmt(estimate)+"元/日"],["实际−估算",fmt(actual-estimate)+"元/日"]];}
 case "elasticity-profit-lab":return [["日销量",fmt(q)+"件"],["需求弹性",fmt(M.elasticity(p,seg))],["日收入",fmt(p*q)+"元"],["日利润",fmt(M.profit(p,seg))+"元"],...(v.revealOptimum===true?[["利润最优价格",seg===0?"70元/件":"85元/件"] as [string,string]]:[])];
 case "riemann-sum-lab":{const n=Number(v.partitions),dt=8/n;let total=0;for(let i=0;i<n;i++)total+=M.rate((i+(v.sample==="right"?1:v.sample==="midpoint"?.5:0))*dt)*dt;return [["分段数",String(n)],["矩形估算",fmt(total)+"件"],["精确累计",fmt(M.accumulated(8))+"件"],["估算−精确",fmt(total-M.accumulated(8))+"件"]];}
 case "accumulation-limit-lab":{const t=Number(v.upperBound);return [["上限时间",fmt(t)+"小时"],["累计销售",fmt(M.accumulated(t))+"件"],["末端速率",fmt(M.rate(t))+"件/小时"]];}
 case "consumer-surplus-lab":return [["市场价格",fmt(p)+"元/件"],["成交量",fmt(q)+"件"],["实际支付",fmt(p*q)+"元"],["消费者剩余",fmt(M.consumerSurplus(p))+"元"]];
 case "marketing-surface-lab":return [["价格",fmt(p)+"元/件"],["广告",fmt(Number(v.advertising))+"百元/日"],["日销量",fmt(M.response(p,Number(v.advertising)))+"件"],["固定条件",v.lockedAxis==="price"?"价格固定":v.lockedAxis==="advertising"?"广告固定":"两项均可改变"]];
 case "tangent-plane-lab":{const a=Number(v.baseAdvertising),da=Number(v.deltaAdvertising),actual=M.response(base+Number(v.deltaPrice),a+da),plane=M.responsePlane(base+Number(v.deltaPrice),a+da,base,a);return [["实际销量",fmt(actual)+"件/日"],["平面估算",fmt(plane)+"件/日"],["实际−估算",fmt(actual-plane)+"件/日"]];}
 case "unconstrained-optimum-lab":{const x=Number(v.x),y=Number(v.y);return [["投入 x",fmt(x)],["投入 y",fmt(y)],["利润指数",fmt(M.twoInputProfit(x,y))],...(v.revealClassification===true?[["全局最优", "(20, 15)；525"] as [string,string]]:[])];}
 case "budget-constraint-lab":{const b=Number(v.budget),x=Number(v.channelX);return [["总预算",fmt(b)+"百元"],["渠道 x",fmt(x)+"百元"],["渠道 y",fmt(b-x)+"百元"],["响应指数",fmt(M.budgetResponse(x,b))],...(v.revealOptimum===true?[["最优配置",fmt(.64*b)+" / "+fmt(.36*b)] as [string,string]]:[])];}
 default:return [];
 }
}
interface Props {spec:Slide;interaction:SlideInteractionState|null;readOnly:boolean;onInteractionPatch?:(patch:SlideInteractionValues)=>void;onInteractionReset?:()=>void;}
const assetUrl=(file:string)=>file.startsWith("/")?file:"/course-assets/economic-mathematics/"+(file.includes("/")?file:"v2/"+file);
export function EconomicMathematicsTeachingSlides({spec,interaction}:Props){
 const def=getEconomicMathematicsInteractionDefinition(spec);
 const values=interaction?.slideId===spec.slideKey?{...def?.defaults,...interaction.values}:{...def?.defaults};
 const step=getEconomicMathematicsPresentationStep(spec,values),cover=spec.layout==="cover",hasImage=Boolean(spec.image);
 if (spec.preludeId) return <EconomicPreludeSlide page={spec.localIndex} step={step}/>;
 const visibleSteps=(spec.steps??[]).slice(0,step);
 const visiblePlot=[...visibleSteps].reverse().find(s=>s.plot)?.plot??spec.plot;
 const highlighted=[...visibleSteps].reverse().find(s=>s.highlightRows)?.highlightRows??[];
 return <article className={"em-slide em-"+(spec.layout??"essay")+" em-style-"+(spec.style??"editorial")+(hasImage?" em-with-image":"")+(spec.slideKey.startsWith("em-l02-refined")?" em-refined":"")+(spec.merchantFigure?" em-has-merchant-figure":"")} aria-label={spec.title}>
 {cover&&<img className="em-cover-art" src={assetUrl(spec.image!)} alt={spec.imageAlt??""}/>}
 {spec.style==="constructivist"&&<img className="em-conflict-art" src={"/course-assets/economic-mathematics/v2/l"+String(spec.sourceLesson ?? spec.lesson).padStart(2,"0")+"-scene.png"} alt=""/>}
 <header className="em-header"><div className="em-kicker">{spec.kicker||"经济数学 / 第"+String(spec.lesson).padStart(2,"0")+"讲"}</div><h1>{spec.title}</h1></header>
 <main className="em-content">
 {!cover&&hasImage&&<figure className="em-art"><img src={assetUrl(spec.image!)} alt={spec.imageAlt??""}/></figure>}
 <div className="em-copy">
 {spec.lead&&<p className="em-lead"><MathText text={spec.lead}/></p>}
 {spec.formula&&<MathText text={spec.formula} display/>}
 {spec.body?.map((text,i)=><p className="em-body" key={i}><MathText text={text}/></p>)}
 {spec.table&&<table className="em-table"><thead><tr>{spec.table.columns.map((c,i)=><th key={i}><MathText text={c}/></th>)}</tr></thead><tbody>{spec.table.rows.map((row,i)=><tr key={i} className={highlighted.includes(i)?"em-table-highlight":undefined}>{row.map((c,j)=><td key={j}><MathText text={c}/></td>)}</tr>)}</tbody></table>}
 {(spec.steps??[]).slice(0,step).map((s,i)=><section className="em-reveal" key={i}><span className="em-step-number">{String(i+1).padStart(2,"0")}</span><div><h2>{s.title}</h2>{s.text&&<p><MathText text={s.text}/></p>}{s.formula&&<MathText text={s.formula} display/>}</div></section>)}
 </div>
 {spec.merchantFigure&&<MerchantFigure kind={spec.merchantFigure} values={values}/>}
 {visiblePlot&&!spec.interactionId&&<EconomicPlot config={visiblePlot} values={values}/>}
 {spec.interactionId&&<div className="em-lab-projection">{spec.merchantLab?<MerchantFigure kind="profit" values={values}/>:<EconomicPlot config={{...labPlots[spec.interactionId]!,...(spec.interactionId==="sequence-limit-lab"?{domain:[1,Math.max(40,Number(values.n))] as const}:{})}} values={values} lab={spec.interactionId}/>}<dl className="em-readout">{(spec.merchantLab?merchantReadout(values):economicLabReadout(spec.interactionId,values)).map(([label,result])=><div key={label}><dt>{label}</dt><dd>{result}</dd></div>)}</dl></div>}
 </main>
 {spec.prompt&&<aside className="em-prompt"><MathText text={spec.prompt}/></aside>}
 <footer className="em-footer"><span>{spec.sourceLabel}{spec.sourceNote?" · "+spec.sourceNote:""}</span><span>{spec.localIndex+" / "+spec.localTotal+" · "+spec.unitTitle}</span></footer>
 </article>;
}
const labels:Record<string,string>={capacity:"履约能力（件/日）",commission:"抽成比例",fixedCost:"固定成本（元/日）",price:"价格（元/件）",segment:"细分市场",n:"轮次",epsilon:"容许误差",orderAmount:"订单额（元）",approach:"接近方向",basePrice:"基准价格（元/件）",h:"价格间隔（元/件）",deltaPrice:"价格变化（元/件）",partitions:"分段数",sample:"取样位置",upperBound:"时间上限（小时）",advertising:"广告（百元/日）",lockedAxis:"固定变量",baseAdvertising:"基准广告（百元/日）",deltaAdvertising:"广告变化（百元/日）",x:"投入 x",y:"投入 y",budget:"预算（百元）",channelX:"渠道 x（百元）",revealStep:"公开分析",revealOptimum:"公开最优结果",revealClassification:"公开极值判别"};
const optionLabels:Record<string,string>={left:"左侧",right:"右侧",free:"自由",midpoint:"中点",none:"均不固定",price:"价格",advertising:"广告",A:"市场A",B:"市场B"};
export function isEconomicMathematicsControlDisabled(key:string,v:SlideInteractionValues){return v.lockedAxis===key;}
export function buildEconomicMathematicsControlPatch(key:string,value:number|string|boolean,v:SlideInteractionValues):SlideInteractionValues{
 const patch:SlideInteractionValues={[key]:value};
 if(key==="budget"&&Number(v.channelX)>Number(value))patch.channelX=Number(value);
 if(key==="approach"&&value==="left"&&Number(v.orderAmount)>=99)patch.orderAmount=98.99;
 if(key==="approach"&&value==="right"&&Number(v.orderAmount)<=99)patch.orderAmount=99.01;
 if(key==="orderAmount"&&((v.approach==="left"&&Number(value)>=99)||(v.approach==="right"&&Number(value)<=99)))patch.approach="free";
 return patch;
}
export function EconomicMathematicsControls({spec,interaction,onInteractionPatch,onInteractionReset}:Omit<Props,"readOnly">){
 const def=getEconomicMathematicsInteractionDefinition(spec);if(!def)return spec.exerciseMinutes?<ExerciseTimer key={spec.slideKey} minutes={spec.exerciseMinutes}/>:null;
 const values={...def.defaults,...(interaction?.slideId===spec.slideKey?interaction.values:{})},step=getEconomicMathematicsPresentationStep(spec,values);
 const patch=(key:string,value:number|string|boolean)=>{const update=buildEconomicMathematicsControlPatch(key,value,values);if(validateEconomicMathematicsInteractionState(def,{...values,...update}))onInteractionPatch?.(update);};
 return <section className="em-teacher-controls" aria-label="经济数学教师控制"><b>{def.label}</b>
 {spec.classHour&&<p>{"第"+spec.classHour+"课时 · "+spec.section+" · 预计"+spec.teachingSeconds+"秒 · "+(spec.routeRole==="optional"?"备用":"课堂主线")}</p>}
 {!!spec.steps?.length&&<div className="em-reveal-controls"><button disabled={step===0} onClick={()=>patch("presentationStep",step-1)}>收起一步</button><span>{"已公开 "+step+" / "+spec.steps.length+" 步"}</span><button disabled={step===spec.steps.length} onClick={()=>patch("presentationStep",step+1)}>公开下一步</button></div>}
 <div className="em-variable-controls">{Object.entries(def.rules).filter(([key])=>key!=="presentationStep"&&key!=="revealStep").map(([key,rule])=><label key={key}>{labels[key]??key}{rule.type==="boolean"?<input type="checkbox" checked={Boolean(values[key])} onChange={e=>patch(key,e.target.checked)}/>:rule.type==="enum"?<select value={String(values[key])} onChange={e=>patch(key,e.target.value)}>{rule.values.map(v=><option key={v} value={v}>{optionLabels[v]??v}</option>)}</select>:<input type="range" min={rule.min} max={key==="channelX"?Number(values.budget):rule.max} step={rule.step??1} value={Number(values[key])} disabled={isEconomicMathematicsControlDisabled(key,values)} onChange={e=>patch(key,Number(e.target.value))}/>}<output>{rule.type==="boolean"?(values[key]?"已公开":"未公开"):optionLabels[String(values[key])]??String(values[key])}</output></label>)}</div>
 <button onClick={onInteractionReset}>恢复本页初始状态</button></section>;
}
