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
  return [];
}
