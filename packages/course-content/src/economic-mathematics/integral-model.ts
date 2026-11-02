export const integralModel={
 family:(x:number,constant:number)=>x*x+constant,
 derivative:(x:number)=>2*x,
 throughPoint:(x:number,y:number)=>y-x*x,
 gapConstant:(x:number,left=-1,right=2):number|null=>x<0?left:x>0?right:null,
 absolutePrimitive:(x:number,constant=0)=>x*Math.abs(x)/2+constant,
 absoluteIntegrand:(x:number)=>Math.abs(x),
 polynomial:(x:number,constant=0)=>x*x*x-2*x*x+2*x+constant,
 polynomialDerivative:(x:number)=>3*x*x-4*x+2,
 arctan:(x:number)=>Math.atan(x),
 arctanDerivative:(x:number)=>1/(1+x*x),
 arctanPrimitive:(x:number,a:number)=>a>0?Math.atan(x/a)/a:null,
 /** Stable positive-half-axis form, avoiding subtraction of angles near pi/2. */
 normalizedArctanPrimitive:(x:number,a:number)=>a>0&&x>0?(Math.atan(a)-Math.atan(a/x))/a:null,
 arcsin:(x:number)=>Math.abs(x)<=1?Math.asin(x):null,
 arcsinDerivative:(x:number)=>Math.abs(x)<1?1/Math.sqrt(1-x*x):null,
 arcsinPrimitive:(x:number,a:number)=>a>0&&Math.abs(x)<=a?Math.asin(x/a):null,
 branchComposition:(x:number)=>Math.abs(Math.cos(2*x))>1e-12?Math.atan(Math.tan(2*x)):null
};
export function integralReadout(values:Readonly<Record<string,number|string|boolean>>,kind:'primitive-family'|'arctan'='primitive-family'):readonly [string,string][]{
 if(kind==='arctan'){
  const x=typeof values.arctanX==='number'?values.arctanX:1,fmt=(n:number)=>n.toLocaleString('zh-CN',{maximumFractionDigits:4});
  return [['输入 x₀（正切值）',fmt(x)],['主值角 y₀（弧度）','约'+fmt(integralModel.arctan(x))],['导数 1/(1+x₀²)',fmt(integralModel.arctanDerivative(x))],['主值范围','−π/2<y<π/2']];
 }
 const c=typeof values.primitiveC==='number'?values.primitiveC:0;
 const x=typeof values.primitiveX==='number'?values.primitiveX:1;
 const fmt=(n:number)=>n.toLocaleString('zh-CN',{maximumFractionDigits:4});
 return [['平移常数 C',fmt(c)],['观察位置 x₀',fmt(x)],['函数值 F(x₀)',fmt(integralModel.family(x,c))],['导数 F′(x₀)=2x₀',fmt(integralModel.derivative(x))]];
}
