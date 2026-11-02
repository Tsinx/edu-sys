export const integralModel={
 family:(x:number,constant:number)=>x*x+constant,
 derivative:(x:number)=>2*x,
 throughPoint:(x:number,y:number)=>y-x*x,
 gapConstant:(x:number,left=-1,right=2):number|null=>x<0?left:x>0?right:null,
 absolutePrimitive:(x:number,constant=0)=>x*Math.abs(x)/2+constant,
 absoluteIntegrand:(x:number)=>Math.abs(x),
 polynomial:(x:number,constant=0)=>x*x*x-2*x*x+2*x+constant,
 polynomialDerivative:(x:number)=>3*x*x-4*x+2
};
export function integralReadout(values:Readonly<Record<string,number|string|boolean>>):readonly [string,string][]{
 const c=typeof values.primitiveC==='number'?values.primitiveC:0;
 const x=typeof values.primitiveX==='number'?values.primitiveX:1;
 const fmt=(n:number)=>n.toLocaleString('zh-CN',{maximumFractionDigits:4});
 return [['平移常数 C',fmt(c)],['观察位置 x₀',fmt(x)],['函数值 F(x₀)',fmt(integralModel.family(x,c))],['导数 F′(x₀)=2x₀',fmt(integralModel.derivative(x))]];
}
