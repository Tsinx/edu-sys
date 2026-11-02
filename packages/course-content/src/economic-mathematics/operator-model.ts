/** Explicit models shared by native evidence and mathematical verification. */
export const operatorEvidence={
 absolute:(x:number)=>Math.abs(x),
 source:(x:number)=>x-1,
 transformed:(x:number)=>Math.abs(x-1),
 square:(x:number)=>x*x,
 tangentAtOne:(x:number)=>1+2*(x-1),
 differentialAtOne:(h:number)=>2*h,
 incrementAtOne:(h:number)=>2*h+h*h,
 secondChain:(outerFirst:number,outerSecond:number,innerFirst:number,innerSecond:number)=>outerSecond*innerFirst**2+outerFirst*innerSecond
} as const;
