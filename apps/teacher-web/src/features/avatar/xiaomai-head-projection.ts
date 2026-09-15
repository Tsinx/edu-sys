import bake from './xiaomai-head-bake.json';

const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
/** Offline Blender keyforms, sampled in the original painting's coordinates. */
export function bakedHeadYaw(x:number,y:number,degrees:number):number {
  if(degrees===0 || y>=560 || x<bake.x || x>bake.x+(bake.cols-1)*bake.step)return x;
  const angle=clamp(degrees,-18,18);
  const k=clamp(Math.floor((angle+18)/9),0,3),t=(angle-bake.angles[k]!)/9;
  const gx=clamp((x-bake.x)/bake.step,0,bake.cols-1),gy=clamp((y-bake.y)/bake.step,0,bake.rows-1);
  const ix=Math.min(bake.cols-2,Math.floor(gx)),iy=Math.min(bake.rows-2,Math.floor(gy)),fx=gx-ix,fy=gy-iy;
  const sample=(key:number)=>{
    const a=bake.dx[key]!,i=iy*bake.cols+ix;
    return ((a[i]!*(1-fx)+a[i+1]!*fx)*(1-fy)+(a[i+bake.cols]!*(1-fx)+a[i+bake.cols+1]!*fx)*fy)/bake.quantization;
  };
  return x+sample(k)*(1-t)+sample(k+1)*t;
}
