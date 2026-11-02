/** Exact models for the selected-variable diagrams; no keyword-chosen curves. */
export const integralMethodModel={
 square:(x:number)=>x*x,
 squareSlope:(x:number)=>2*x,
 positiveSquareInverse:(x:number):number|null=>x>0?Math.sqrt(x):null
};
