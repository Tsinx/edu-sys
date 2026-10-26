import type {EconomicMathematicsAnalysisFigure as Figure,EconomicMathematicsAuthoredSlide as Slide,EconomicMathematicsMvtModel as Model} from './types.js';
type Values=Readonly<Record<string,number|string|boolean>>;
const finite=(v:unknown,d:number)=>typeof v==='number'&&Number.isFinite(v)?v:d;
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const fnum=(v:number)=>Math.abs(v)<1e-10?'0':Number(v.toPrecision(6)).toString();
export interface MeanValueModel {label:string;interval:readonly[number,number];range:readonly[number,number];f:(x:number)=>number;df:(x:number)=>number|null;continuous:boolean;differentiable:boolean;roots:readonly number[]|'all'}
export const meanValueModels:Readonly<Record<Model,MeanValueModel>>={
 square:{label:'f(x)=x²，[1,3]',interval:[1,3],range:[0,10],f:x=>x*x,df:x=>2*x,continuous:true,differentiable:true,roots:[2]},
 cubic:{label:'f(x)=x³，[0,1]',interval:[0,1],range:[-.1,1.1],f:x=>x*x*x,df:x=>3*x*x,continuous:true,differentiable:true,roots:[1/Math.sqrt(3)]},
 'cubic-symmetric':{label:'f(x)=x³，[−1,1]',interval:[-1,1],range:[-1.2,1.2],f:x=>x*x*x,df:x=>3*x*x,continuous:true,differentiable:true,roots:[-1/Math.sqrt(3),1/Math.sqrt(3)]},
 absolute:{label:'f(x)=|x|，[−1,1]',interval:[-1,1],range:[-.2,1.3],f:Math.abs,df:x=>x===0?null:Math.sign(x),continuous:true,differentiable:false,roots:[]},
 'endpoint-jump':{label:'f(x)=x（x<1），f(1)=0；[0,1]',interval:[0,1],range:[-.2,1.3],f:x=>x===1?0:x,df:x=>x===1?null:1,continuous:false,differentiable:true,roots:[]},
 root:{label:'f(x)=√x，[0,1]',interval:[0,1],range:[-.1,1.2],f:Math.sqrt,df:x=>x<=0?null:1/(2*Math.sqrt(x)),continuous:true,differentiable:true,roots:[.25]},
 sine:{label:'f(x)=sin x，[0,2π]',interval:[0,2*Math.PI],range:[-1.4,1.4],f:x=>x===0||x===2*Math.PI?0:Math.sin(x),df:Math.cos,continuous:true,differentiable:true,roots:[Math.PI/2,3*Math.PI/2]},
 'rolle-parabola':{label:'f(x)=(x−1)²，[0,2]',interval:[0,2],range:[-.2,1.4],f:x=>(x-1)**2,df:x=>2*(x-1),continuous:true,differentiable:true,roots:[1]},
 constant:{label:'f(x)≡2，[0,2]',interval:[0,2],range:[0,3],f:()=>2,df:()=>0,continuous:true,differentiable:true,roots:'all'}
};
export function meanValueEvidence(config:Figure,values:Values={}){
 const key=typeof values.mvtModel==='string'&&values.mvtModel in meanValueModels?values.mvtModel as Model:config.model??'square';
 const m=meanValueModels[key],a=m.interval[0],b=m.interval[1];
 const point=typeof values.cutFraction==='number'?a+(b-a)*clamp(finite(values.cutFraction,.25),.01,.99):clamp(config.params?.point??(a+b)/2,a,b);
 return {...m,key,a,b,point,average:(m.f(b)-m.f(a))/(b-a),slope:m.df(point)};
}
/** Exact polynomial formulas, valid for a nonnegative increment from q=100 within the original domain. */
export function costBoundEvidence(h:number){
 if(!Number.isFinite(h)||h<0||h>20)return null;
 return {h,q0:100,q1:100+h,derivativeLow:24,derivativeHigh:24+.04*h,lower:24*h,upper:24*h+.04*h*h,actual:24*h+.02*h*h,degenerate:h===0};
}
export const cauchyEvidence={a:1,b:2,deltaF:7,deltaG:3,individualF:Math.sqrt(7/3),individualG:1.5,common:14/9,
 derivativeRatio:(x:number)=>x>=1&&x<=2?1.5*x:null};
export const analysisModels={auxiliary:(x:number)=>(x-1)*(x-3),domainGap:(x:number)=>x===0?null:x<0?0:1,
 quotient:(x:number)=>x===0?null:1+x*Math.sin(1/x),logRatio:(x:number)=>x>0?Math.log(x)/x:null};
/** Values 0 and 2 are analytic evaluations at the two sequences, avoiding trigonometric roundoff. */
export function quotientWitness(n:number){
 if(!Number.isSafeInteger(n)||n<1||n>1000000)return null;
 return {n,x:1/(2*Math.PI*n),y:1/((2*n+1)*Math.PI),originalX:1,originalY:1,derivativeX:0,derivativeY:2};
}
export function visibleAnalysisFigure(slide:Pick<Slide,'analysisFigure'|'steps'>,values:Values={}){
 const step=clamp(Math.floor(finite(values.presentationStep,0)),0,slide.steps?.length??0);
 return [...(slide.steps??[])].slice(0,step).reverse().find(s=>s.analysisFigure)?.analysisFigure??slide.analysisFigure;
}
/** Only current, projected evidence; no future roots, exercise feedback or teacher cues. */
export function analysisReadout(slide:Pick<Slide,'analysisFigure'|'steps'>,values:Values={}):readonly [string,string][]{
 const config=visibleAnalysisFigure(slide,values);if(!config)return [];
 if(config.kind==='mvt'){
  const m=meanValueEvidence(config,values);
  return [['函数与区间',m.label],['平均变化率',fnum(m.average)],['当前点与局部斜率',`${fnum(m.point)}；${m.slope===null?'此处无有限导数':fnum(m.slope)}`],['条件核对',`${m.continuous?'闭区间连续':'端点不连续'}；${m.differentiable?'内部可导':'内部有不可导点'}`]];
 }
 if(config.kind==='cost-bound'){
  const h=finite(values.boundIncrement,config.params?.h??10),e=costBoundEvidence(h);if(!e)return [['状态','超出允许的增产范围']];
  if(e.degenerate)return [['增产量','0件'],['实际增量','0元'],['状态','两端重合：零增量，未调用a<b的中值定理']];
  return [['整段边际成本',`${fnum(e.derivativeLow)}—${fnum(e.derivativeHigh)}元/件`],['增量下界',`${fnum(e.lower)}元`],['实际增量',`${fnum(e.actual)}元`],['增量上界',`${fnum(e.upper)}元`]];
 }
 if(config.kind==='cauchy'&&config.params?.common){
  const x=clamp(finite(values.commonPoint,cauchyEvidence.common),1.45,1.6);
  return [['总变化之比','7/3'],['当前点的导数比',`${fnum(cauchyEvidence.derivativeRatio(x)!)}（x=${fnum(x)}）`],['共同位置','14/9'],['分别得到的位置','√(7/3)与3/2']];
 }
 if(config.kind==='quotient-oscillation'){
  const scale=clamp(Number(values.oscillationScale)||1,1,1000),n=Math.round(clamp(finite(values.witnessN,4),1,100)),w=quotientWitness(n)!;
  return config.params?.witness?[['序号n',String(n)],['两列输入',`${fnum(w.x)}；${fnum(w.y)}`],['原商的精确值','两列均为1'],['导数商的精确值','分别为0与2']]:[['观察范围',`0<x≤${fnum(.4/scale)}`],['原商的误差保证',`|原商−1|≤|x|≤${fnum(.4/scale)}`]];
 }
 return [];
}
