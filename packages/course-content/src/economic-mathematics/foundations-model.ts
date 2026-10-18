/** Shared, explicit models for printed evidence, live experiments and public readouts. */
export const foundationModels = {
  sinc: (x:number): number|null => x===0?null:Math.sin(x)/x,
  angle: (x:number) => ({arc:x,sine:Math.sin(x),tangent:Math.tan(x),innerArea:Math.sin(x)/2,sectorArea:x/2,outerArea:Math.tan(x)/2}),
  compound: (rate:number,n:number) => Math.exp(n*Math.log1p(rate/n)),
  compoundLimit: (rate:number) => Math.exp(rate),
  repaired: (x:number,b:number) => x===1?b:x+1,
  contractA: (q:number):number|null => q<0?null:q<100?12*q:10*q,
  contractB: (q:number):number|null => q<0?null:q<=100?12*q:1200+10*(q-100),
  queue: (q:number):number|null => q>=0&&q<120?60/(120-q):null,
  rootFunction: (x:number) => x*x*x+x-1,
  oscillation: (x:number,damped:boolean):number|null => x===0?(damped?0:null):(damped?x:1)*Math.sin(1/x)
};
export function foundationBisection(steps:number) {
  if(!Number.isInteger(steps)||steps<0||steps>16) throw new Error('BISECTION_STEPS');
  let a=0,b=1;
  for(let i=0;i<steps;i++) {const m=(a+b)/2;if(foundationModels.rootFunction(m)<0)a=m;else b=m;}
  return {a,b,mid:(a+b)/2,error:(b-a)/2,left:foundationModels.rootFunction(a),right:foundationModels.rootFunction(b)};
}
export function foundationReadout(lab:string,values:Readonly<Record<string,number|string|boolean>>):readonly [string,string][] {
  const f=(x:number,digits=6)=>x.toLocaleString('zh-CN',{maximumFractionDigits:digits});
  if(lab==='angle') {const x=Number(values.angle??.6),m=foundationModels.angle(x);return [['角度',f(x)+'弧度'],['弧长 / 正弦长度',f(m.arc)+' / '+f(m.sine)],['正弦 / 弧长',f(m.sine/m.arc)]];}
  if(lab==='compounding'){const r=Number(values.nominalRate??.12),n=Number(values.compoundCount??12),a=foundationModels.compound(r,n);return [['名义年利率',f(100*r,1)+'%'],['年计息次数',String(n)],['年增长因子',f(a)],['实际年增长',f((a-1)*100,4)+'%'],['连续计息因子',f(foundationModels.compoundLimit(r))]];}
  if(lab==='continuity-repair'){const b=Number(values.pointValue??3);return [['附近极限','2'],['点处函数值',f(b)],['实心点与空心点',b===2?'重合':'不重合']];}
  if(lab==='bisection'){const n=Number(values.bisectionSteps??0),b=foundationBisection(n);return [['二分次数',String(n)],['保留区间','['+f(b.a)+', '+f(b.b)+']'],['两端函数值',f(b.left)+' / '+f(b.right)],['中点误差上界',f(b.error,8)]];}
  if(lab==='derivative-secant'){const h=Number(values.increment??.5),m=calculusEvidence('square',1,h);return [['输入增量h',f(h)],['函数增量',f(m.change)],['差商',m.quotient===null?'未定义：h须非零':f(m.quotient)],['参考直线斜率','2']];}
  return [];
}

export type CalculusCurve='square'|'absolute'|'cube'|'cube-root';
export function calculusValue(model:CalculusCurve,x:number):number{
  return model==='square'?x*x:model==='absolute'?Math.abs(x):model==='cube'?x*x*x:Math.cbrt(x);
}
/** Exact algebraic differences avoid loss of precision; h=0 never creates a quotient. */
export function calculusEvidence(model:CalculusCurve,a:number,h:number){
  const y=calculusValue(model,a),next=calculusValue(model,a+h);
  const change=model==='square'?h*(2*a+h):model==='cube'?h*(3*a*a+3*a*h+h*h):next-y;
  const quotient=h===0?null:model==='square'?2*a+h:model==='cube'?3*a*a+3*a*h+h*h:change/h;
  const derivative=model==='square'?2*a:model==='cube'?3*a*a:model==='absolute'?(a===0?null:Math.sign(a)):(a===0?null:1/(3*Math.cbrt(a*a)));
  return {y,next,change,quotient,derivative};
}
export function calculusCost(q:number):number|null{return q>=0&&q<=200?2000+20*q+.02*q*q:null;}
export function calculusCostIncrement(q:number,h:number):number|null{return calculusCost(q)!==null&&calculusCost(q+h)!==null?(20+.04*q)*h+.02*h*h:null;}
