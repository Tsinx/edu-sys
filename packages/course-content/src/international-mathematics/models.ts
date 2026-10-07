import type {Curve} from './types.js';
export function evaluateCurve(c:Curve,x:number):number {
 const a=c.scale??1,k=c.rate??1,b=c.shift??0;
 if(c.kind==='polynomial')return (c.coefficients??[]).reduceRight((v,n)=>v*x+n,0);
 if(c.kind==='exponential')return a*Math.exp(k*x)+b;
 if(c.kind==='logarithm')return x>0?a*Math.log(x)+b:NaN;
 return a*Math.pow(x,c.power??1)+b;
}
export function derivativeCurve(c:Curve,x:number):number {
 const a=c.scale??1,k=c.rate??1;
 if(c.kind==='polynomial')return (c.coefficients??[]).slice(1).map((v,i)=>v*(i+1)).reduceRight((v,n)=>v*x+n,0);
 if(c.kind==='exponential')return a*k*Math.exp(k*x);
 if(c.kind==='logarithm')return x>0?a/x:NaN;
 const p=c.power??1;return p===0?0:a*p*Math.pow(x,p-1);
}
export function primitiveCurve(c:Curve,x:number):number {
 const a=c.scale??1,k=c.rate??1,b=c.shift??0;
 if(c.kind==='polynomial')return (c.coefficients??[]).reduce((v,n,i)=>v+n*Math.pow(x,i+1)/(i+1),0);
 if(c.kind==='exponential')return k===0?(a+b)*x:a*Math.exp(k*x)/k+b*x;
 if(c.kind==='logarithm')return x>0?a*(x*Math.log(x)-x)+b*x:NaN;
 const p=c.power??1;return p===-1?a*Math.log(Math.abs(x))+b*x:a*Math.pow(x,p+1)/(p+1)+b*x;
}
export const definiteIntegral=(c:Curve,from:number,to:number)=>primitiveCurve(c,to)-primitiveCurve(c,from);
export function secantSlope(c:Curve,x:number,h:number){return h===0?derivativeCurve(c,x):(evaluateCurve(c,x+h)-evaluateCurve(c,x))/h;}
export function leftRiemannSum(c:Curve,from:number,to:number,n:number){if(!Number.isInteger(n)||n<1)throw Error('Positive integer rectangle count required');const dx=(to-from)/n;return Array.from({length:n},(_,i)=>evaluateCurve(c,from+i*dx)*dx).reduce((a,b)=>a+b,0);}
export const demandQuantity=(price:number)=>Math.max(0,100-2*price);
export function priceElasticity(price:number){const q=demandQuantity(price);return q>0?-2*price/q:NaN;}
export const business={revenue:(q:number)=>100*q-q*q,cost:(q:number)=>100+20*q+.5*q*q,profit:(q:number)=>80*q-1.5*q*q-100,marginalRevenue:(q:number)=>100-2*q,marginalCost:(q:number)=>20+q};
