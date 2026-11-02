export const shapeModels={
 family:(x:number,a:number)=>x**4-2*a*x*x,
 familyDerivative:(x:number,a:number)=>4*x*(x*x-a),
 familySecond:(x:number,a:number)=>12*x*x-4*a,
 convex:(x:number)=>x*x,
 concave:(x:number)=>-x*x,
 quartic:(x:number)=>x**4,
 cubic:(x:number)=>x**3,
 absoluteProduct:(x:number)=>x*Math.abs(x)
};
export function chordEvidence(sign:1|-1,x1:number,x2:number,lambda:number){
 const x=(1-lambda)*x1+lambda*x2,curve=sign*x*x,chord=(1-lambda)*sign*x1*x1+lambda*sign*x2*x2;
 return{x,curve,chord,gap:chord-curve};
}
export function familyExtrema(a:number){
 const stationary=[0,...(a>0&&a<4?[-Math.sqrt(a),Math.sqrt(a)]:[])].sort((x,y)=>x-y);
 const minima=a<=0?[0]:a<4?[-Math.sqrt(a),Math.sqrt(a)]:[-2,2];
 const maxima=a<2?[-2,2]:a===2?[-2,0,2]:[0];
 return{stationary,minima,maxima,min:shapeModels.family(minima[0]!,a),max:shapeModels.family(maxima[0]!,a),inflections:a>0&&a<12?[-Math.sqrt(a/3),Math.sqrt(a/3)]:[]};
}
