/** Explicit evidence models; SVG, narration readouts and experiments share these functions. */
export {calculusCostEvidence as differentialCostEvidence} from './foundations-model.js';
export const differentiationModels={
 product:(x:number)=>x*(x+1),
 productSlope:(x:number)=>2*x+1,
 averageCost:(q:number)=>q>0&&q<=200?2000/q+20+.02*q:null,
 marginalCost:(q:number)=>q>=0&&q<=200?20+.04*q:null,
 chainInput:(x:number)=>3*x+1,
 chainOutput:(u:number)=>u*u,
 circle:(x:number,branch:1|-1)=>Math.abs(x)<=5?branch*Math.sqrt(25-x*x):null,
 circleSlope:(x:number,y:number)=>y===0?null:-x/y,
 sales:(t:number)=>t>=0&&t<=8?120*t+12*t*t-t*t*t:null,
 salesRate:(t:number)=>t>=0&&t<=8?120+24*t-3*t*t:null,
 salesSecond:(t:number)=>t>=0&&t<=8?24-6*t:null,
 sqrtResidual:(h:number)=>h>-4?-h*h/(4*(Math.sqrt(4+h)+2)**2):null
};
